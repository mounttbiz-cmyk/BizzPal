import { NextResponse } from "next/server";
import { lookupIfsc, matchNames, normalizeAccount, normalizeIfsc, pennyDrop, pennyDropConfigured } from "@/lib/verification/bank";
import { cleanEmail, computeLevel, rateLimited, saveVerification } from "@/lib/verification/store";

export const dynamic = "force-dynamic";

const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

/** GET ?ifsc= : instant bank + branch lookup while the user types (real, free directory). */
export async function GET(req: Request) {
  if (rateLimited(`ifsc-ip:${clientIp(req)}`, 120, 3_600_000)) {
    return NextResponse.json({ status: "unavailable", reason: "Too many lookups. Please wait a moment." }, { status: 429 });
  }
  const r = await lookupIfsc(new URL(req.url).searchParams.get("ifsc") || "");
  return NextResponse.json({ ...r, accountCheckConfigured: pennyDropConfigured() });
}

/**
 * POST { email, ifsc, account }
 *   IFSC must exist. Then, if a provider is configured, a penny drop returns the account holder's name from the
 *   bank and it must match the GST-registered name. Only then is the account "verified".
 * The full account number is never stored: only the last 4 digits.
 */
export async function POST(req: Request) {
  let b: any;
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const email = cleanEmail(b?.email);
  if (!email || !email.includes("@")) return NextResponse.json({ error: "Please sign in again, then retry." }, { status: 401 });
  if (rateLimited(`bank-ip:${clientIp(req)}`, 20, 3_600_000) || rateLimited(`bank-em:${email}`, 8, 3_600_000)) {
    return NextResponse.json({ error: "Too many verification attempts. Please try again in a while." }, { status: 429 });
  }

  const account = normalizeAccount(String(b?.account || ""));
  if (!/^\d{9,18}$/.test(account)) {
    return NextResponse.json({ ok: false, stage: "format", reason: "A bank account number has 9 to 18 digits." }, { status: 400 });
  }
  const ifscRes = await lookupIfsc(normalizeIfsc(String(b?.ifsc || "")));
  if (ifscRes.status === "invalid") return NextResponse.json({ ok: false, stage: "ifsc", reason: ifscRes.reason }, { status: 400 });
  if (ifscRes.status === "not_found") return NextResponse.json({ ok: false, stage: "ifsc", reason: "This IFSC doesn't exist. Please check it against your cheque book or bank statement." }, { status: 404 });
  if (ifscRes.status === "unavailable") return NextResponse.json({ ok: false, stage: "ifsc_unavailable", reason: ifscRes.reason }, { status: 503 });

  const bank = ifscRes.record;
  const last4 = account.slice(-4);
  const subject = `${bank.ifsc}:${last4}`;
  const gst = computeLevel(email).gstin?.evidence?.record;
  const gstNames: string[] = [gst?.legalName, gst?.tradeName].filter(Boolean);

  const penny = await pennyDrop(account, bank.ifsc);

  if (penny.status === "unavailable") {
    saveVerification(email, "bank", subject, { status: "unverified", evidence: { bank, last4, unavailableReason: penny.reason } });
    return NextResponse.json({ ok: false, stage: "account_unavailable", bank, last4, reason: penny.reason, accountCheckConfigured: pennyDropConfigured() }, { status: 503 });
  }
  if (penny.status === "no_account") {
    saveVerification(email, "bank", subject, { status: "failed", evidence: { bank, last4, noAccount: true } });
    return NextResponse.json({ ok: false, stage: "account", bank, last4, reason: "The bank says this account number doesn't exist at that branch. Please re-check the number and IFSC." }, { status: 422 });
  }

  // The bank returned the holder name.
  if (gstNames.length === 0) {
    saveVerification(email, "bank", subject, { status: "unverified", evidence: { bank, last4, holderName: penny.holderName, noGstNames: true } });
    return NextResponse.json({ ok: false, stage: "needs_gst", bank, last4, holderName: penny.holderName, reason: "Verify your GSTIN first so we can compare the account holder with your registered business name." }, { status: 409 });
  }
  const m = matchNames(penny.holderName, gstNames);
  const evidence = { bank, last4, holderName: penny.holderName, nameMatch: m, checkedAt: new Date().toISOString() };

  if (m.verdict === "match") {
    saveVerification(email, "bank", subject, { status: "verified", evidence });
    return NextResponse.json({ ok: true, stage: "verified", bank, last4, holderName: penny.holderName, nameMatch: m });
  }
  if (m.verdict === "partial") {
    saveVerification(email, "bank", subject, { status: "unverified", evidence: { ...evidence, needsReview: true } });
    return NextResponse.json({
      ok: false, stage: "name_review", bank, last4, holderName: penny.holderName, nameMatch: m,
      reason: `The account holder is "${penny.holderName}", which only partly matches your registered name. It isn't verified yet. Use an account in the business's own name.`,
    }, { status: 422 });
  }
  saveVerification(email, "bank", subject, { status: "failed", evidence });
  return NextResponse.json({
    ok: false, stage: "name_mismatch", bank, last4, holderName: penny.holderName, nameMatch: m,
    reason: `The account holder is "${penny.holderName}", which doesn't match your registered business name. Please use a bank account in the business's name.`,
  }, { status: 422 });
}

import { NextResponse } from "next/server";
import { cleanEmail, computeLevel, listVerifications } from "@/lib/verification/store";

export const dynamic = "force-dynamic";

/** GET ?email= : what this account has verified so far (lets onboarding resume after a refresh). */
export async function GET(req: Request) {
  const email = cleanEmail(new URL(req.url).searchParams.get("email") || "");
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const { level, gstin, domain, bank } = computeLevel(email);
  const bankAny = listVerifications(email).find((r) => r.kind === "bank" && r.status === "unverified") || null;
  const pendingDomain = listVerifications(email).find((r) => r.kind === "domain" && r.status === "pending") || null;

  return NextResponse.json({
    level,
    gstin: gstin ? { gstin: gstin.subject, record: gstin.evidence?.record || null, verifiedAt: gstin.verified_at } : null,
    domain: domain ? { domain: domain.subject, method: domain.evidence?.method, emailMatches: Boolean(domain.evidence?.emailMatches), verifiedAt: domain.verified_at } : null,
    bank: bank ? { bank: bank.evidence?.bank, last4: bank.evidence?.last4, holderName: bank.evidence?.holderName, verifiedAt: bank.verified_at } : null,
    bankUnverified: bankAny ? { bank: bankAny.evidence?.bank, last4: bankAny.evidence?.last4 } : null,
    pendingDomain: pendingDomain ? pendingDomain.subject : null,
  });
}

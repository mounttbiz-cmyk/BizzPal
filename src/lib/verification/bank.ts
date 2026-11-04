/**
 * Bank account verification.
 *
 *  1. IFSC lookup   : real and free (Razorpay's public IFSC directory). Proves the bank + branch exist.
 *  2. Penny drop    : a licensed provider sends the bank a tiny test credit and returns the ACCOUNT HOLDER NAME
 *                     as held by the bank. Needs the same provider key as the GST check (KYC_API_KEY / GST_API_KEY).
 *  3. Name match    : the holder name must match the legal name the GST registry gave us. This is what links
 *                     "the person in front of us" to "the business that owns this GSTIN".
 *
 * Nothing here ever returns "verified" without the provider confirming it.
 */

export const IFSC_SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const normalizeIfsc = (s: string) => (s || "").replace(/\s/g, "").toUpperCase();
export const normalizeAccount = (s: string) => (s || "").replace(/[\s-]/g, "");

export interface IfscRecord {
  ifsc: string; bank: string; branch: string; address: string; city: string; state: string; micr: string;
}
export type IfscResult =
  | { status: "found"; record: IfscRecord }
  | { status: "not_found" }
  | { status: "invalid"; reason: string }
  | { status: "unavailable"; reason: string };

export async function lookupIfsc(raw: string): Promise<IfscResult> {
  const ifsc = normalizeIfsc(raw);
  if (!IFSC_SHAPE.test(ifsc)) {
    return { status: "invalid", reason: "An IFSC has 11 characters: 4 letters, a 0, then 6 letters or digits (e.g. HDFC0001234)." };
  }
  const base = (process.env.IFSC_API_BASE || "https://ifsc.razorpay.com").replace(/\/+$/, "");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(`${base}/${ifsc}`, { signal: ctl.signal, headers: { Accept: "application/json" } });
    if (res.status === 404) return { status: "not_found" };
    if (!res.ok) return { status: "unavailable", reason: "The IFSC directory is not responding right now." };
    const d: any = await res.json();
    return {
      status: "found",
      record: {
        ifsc,
        bank: String(d.BANK || ""),
        branch: String(d.BRANCH || ""),
        address: String(d.ADDRESS || ""),
        city: String(d.CITY || ""),
        state: String(d.STATE || ""),
        micr: String(d.MICR || ""),
      },
    };
  } catch (e: any) {
    return { status: "unavailable", reason: e?.name === "AbortError" ? "The IFSC directory took too long to respond." : "Could not reach the IFSC directory." };
  } finally {
    clearTimeout(t);
  }
}

// ---------------------------------------------------------------- name matching

const STOP = new Set([
  "PRIVATE", "PVT", "LIMITED", "LTD", "LLP", "OPC", "COMPANY", "CO", "THE", "AND", "OF", "INDIA", "INDIAN",
  "MS", "M", "S", "MR", "MRS", "MISS", "SHRI", "SMT", "DR", "PROPRIETOR", "PROP", "PROPRIETORSHIP", "A", "C", "ACCOUNT",
]);

export function nameTokens(name: string): string[] {
  return (name || "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/M\/S/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t && !STOP.has(t));
}

export type NameVerdict = "match" | "partial" | "mismatch";

/** Compare the bank's account-holder name with the GST-registered names. Takes the best of the candidates. */
export function matchNames(holder: string, candidates: string[]): { verdict: NameVerdict; score: number; against: string } {
  const h = new Set(nameTokens(holder));
  let best = { verdict: "mismatch" as NameVerdict, score: 0, against: "" };
  for (const cand of candidates.filter(Boolean)) {
    const c = new Set(nameTokens(cand));
    if (h.size === 0 || c.size === 0) continue;
    const hArr = Array.from(h);
    const inter = hArr.filter((t) => c.has(t)).length;
    const union = new Set(hArr.concat(Array.from(c))).size;
    const jaccard = inter / union;
    const containment = inter / Math.min(h.size, c.size);
    const score = Math.max(jaccard, containment * 0.9);
    // Auto-approve only when the two names are essentially the same set of words. If one side has an extra
    // meaningful word ("Apex Global" vs "Apex Global Solutions") it may be a different entity, so it goes to review.
    let verdict: NameVerdict = "mismatch";
    if (jaccard >= 0.75) verdict = "match";
    else if (containment >= 0.5 && inter >= 1) verdict = "partial";
    if (score > best.score) best = { verdict, score: Math.round(score * 100) / 100, against: cand };
  }
  return best;
}

// ---------------------------------------------------------------- penny drop

export type PennyResult =
  | { status: "verified"; holderName: string }
  | { status: "no_account" }
  | { status: "unavailable"; reason: string };

export function pennyDropConfigured(): boolean {
  return Boolean(process.env.KYC_API_KEY || process.env.GST_API_KEY);
}

export async function pennyDrop(account: string, ifsc: string): Promise<PennyResult> {
  const key = process.env.KYC_API_KEY || process.env.GST_API_KEY;
  if (!key) return { status: "unavailable", reason: "Bank account verification is not switched on for this server yet." };
  const base = (process.env.KYC_API_BASE_URL || process.env.GST_API_BASE_URL || "https://kyc-api.surepass.io").replace(/\/+$/, "");
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 30_000); // a real penny drop can take a few seconds
  try {
    const res = await fetch(`${base}/api/v1/bank-verification/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ id_number: account, ifsc, ifsc_details: false }),
      signal: ctl.signal,
    });
    const body: any = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) return { status: "unavailable", reason: "The verification provider rejected our credentials." };
    if (res.status === 429) return { status: "unavailable", reason: "The verification provider is busy. Try again shortly." };
    const d = body?.data;
    if (res.status === 422 || (d && d.account_exists === false)) return { status: "no_account" };
    if (!res.ok || body?.success === false) return { status: "unavailable", reason: body?.message || `Provider returned HTTP ${res.status}.` };
    const holder = String(d?.full_name || d?.name || "").trim();
    if (d?.account_exists === true && holder) return { status: "verified", holderName: holder };
    return { status: "unavailable", reason: "The bank did not return an account holder name." };
  } catch (e: any) {
    return { status: "unavailable", reason: e?.name === "AbortError" ? "The bank took too long to respond." : "Could not reach the verification provider." };
  } finally {
    clearTimeout(t);
  }
}

import dns from "node:dns/promises";
import type { Contact } from "@/lib/datapal/contacts";

/** Quick, honest checks on an email address. It never sends anything to the address. */

const BUSINESS_NAMES = /^(contact|contacts|hello|hi|hey|business|biz|collab|collabs|collaboration|collaborations|partnership|partnerships|partner|partners|brand|brands|pr|media|press|sponsor|sponsors|sponsorship|promo|promos|promotions|enquiry|enquiries|inquiry|inquiries|info|support|sales|team|management|manager|booking|bookings|marketing|ads|advertising|work|care|help)$/i;
const FREE_MAIL = /^(gmail|googlemail|yahoo|ymail|outlook|hotmail|live|rediffmail|icloud|proton|protonmail|aol)\./i;

/** "business" for role addresses such as collab@ or contact@, "personal" for free-mail addresses, otherwise "named". */
export function emailKind(email: string): "business" | "personal" | "named" {
  const [local, domain] = email.toLowerCase().split("@");
  if (BUSINESS_NAMES.test(local.replace(/[._+-].*$/, "")) || BUSINESS_NAMES.test(local)) return "business";
  if (FREE_MAIL.test(domain)) return "personal";
  return "named";
}

const mxCache = new Map<string, { ok: boolean | null; at: number }>();

/** true: the domain can receive email. false: it cannot. null: we could not tell (no internet, timeout). */
export async function domainAcceptsMail(domain: string): Promise<boolean | null> {
  const key = domain.toLowerCase();
  const hit = mxCache.get(key);
  if (hit && Date.now() - hit.at < 24 * 3_600_000) return hit.ok;
  let ok: boolean | null = null;
  try {
    const records = await Promise.race([
      dns.resolveMx(key),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000)),
    ]);
    ok = records.length > 0;
  } catch (e: any) {
    // "no such domain" and "no MX records" are real answers; a timeout or network error is not
    ok = e?.code === "ENOTFOUND" || e?.code === "ENODATA" ? false : null;
    if (ok === false) {
      // a domain without MX records can still receive mail at its main address
      try { ok = (await dns.resolve4(key)).length > 0; } catch { ok = e?.code === "ENOTFOUND" ? false : null; }
    }
  }
  mxCache.set(key, { ok, at: Date.now() });
  return ok;
}

export async function annotateEmails(emails: Contact[]): Promise<Contact[]> {
  return Promise.all(emails.map(async c => {
    const domain = c.value.split("@")[1] || "";
    return { ...c, kind: emailKind(c.value), deliverable: await domainAcceptsMail(domain) };
  }));
}

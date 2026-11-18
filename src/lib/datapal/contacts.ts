/** Finding emails, phone numbers and WhatsApp numbers inside text. Only what is actually written is returned. */

export interface Contact {
  value: string;
  /** Where it was found: "Description", or the website it came from */
  source: string;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const PLACEHOLDER_DOMAINS = /(^|\.)(example\.(com|org|net)|domain\.com|yourdomain\.com|email\.com|sentry\.io|wixpress\.com|sentry-next\.wixpress\.com)$/i;
const PLACEHOLDER_NAMES = /^(you|your|name|yourname|email|user|username|test|someone|john.?doe|webmaster|postmaster|hostmaster|abuse|root|admin@?|no-?reply|do-?not-?reply|mailer-daemon)$/i;

/** "name [at] site [dot] com" is turned back into a normal address before looking. */
function undoObfuscation(text: string): string {
  return text
    .replace(/\s*[[(]\s*at\s*[\])]\s*/gi, "@")
    .replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".");
}

export function extractEmails(text: string): string[] {
  const found = (undoObfuscation(text).match(EMAIL) || [])
    .map(e => e.replace(/[.,;:!?]+$/, "").toLowerCase())
    .filter(e => !/\.(png|jpe?g|gif|webp|svg|css|js)$/.test(e))
    .filter(e => {
      const [local, domain] = e.split("@");
      return !PLACEHOLDER_DOMAINS.test(domain) && !PLACEHOLDER_NAMES.test(local);
    });
  return Array.from(new Set(found)).slice(0, 5);
}

/** Turns what was written into one tidy format. Returns null when it does not look like a real phone number. */
export function normalizePhone(raw: string): string | null {
  const hasPlus = /^\s*(\+|00)/.test(raw);
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  if (digits.length === 10 && /^[6-9]/.test(digits)) return formatIndia(digits);
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) return formatIndia(digits.slice(1));
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) return formatIndia(digits.slice(2));
  // Other countries need an explicit + (or 00) so ordinary numbers are not mistaken for phones
  if (hasPlus && digits.length >= 8 && digits.length <= 15) return "+" + digits;
  return null;
}

const formatIndia = (ten: string) => `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;

const WITH_PLUS = /(?:\+|\b00)\d{1,3}[\s.-]?\(?\d{2,5}\)?(?:[\s.-]?\d{2,5}){1,3}/g;
const INDIAN_MOBILE = /(?<![\d.])(?:\+?91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?![\d])/g;
const WHATSAPP_LINK = /(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^"'\s>]*&)?phone=|whatsapp\.com\/send\?(?:[^"'\s>]*&)?phone=)\+?(\d{8,15})/gi;

export function extractPhones(text: string): string[] {
  const out = new Set<string>();
  for (const m of Array.from(text.matchAll(WHATSAPP_LINK))) {
    const n = normalizePhone(m[1].length === 10 ? m[1] : "+" + m[1]);
    if (n) out.add(n);
  }
  for (const re of [WITH_PLUS, INDIAN_MOBILE]) {
    for (const m of Array.from(text.matchAll(re))) {
      const n = normalizePhone(m[0]);
      if (n) out.add(n);
    }
  }
  return Array.from(out).slice(0, 5);
}

/** A wa.me link for a normalised number */
export const whatsappLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

/** Sites we do not open: they hide contact details behind a sign-in, or are not the creator's own site. */
const NOT_FOLLOWED = /(^|\.)(instagram\.com|facebook\.com|fb\.com|fb\.me|twitter\.com|x\.com|youtube\.com|youtu\.be|tiktok\.com|linkedin\.com|snapchat\.com|pinterest\.com|t\.me|telegram\.me|wa\.me|whatsapp\.com|discord\.gg|discord\.com|spotify\.com|apple\.com|play\.google\.com|amzn\.to|amazon\.(com|in)|flipkart\.com|bit\.ly|goo\.gl|tinyurl\.com)$/i;

export function isFollowable(url: string): boolean {
  try {
    const u = new URL(url);
    return (u.protocol === "http:" || u.protocol === "https:") && !NOT_FOLLOWED.test(u.hostname.replace(/^www\./, ""));
  } catch {
    return false;
  }
}

export function mergeContacts(...groups: Contact[][]): Contact[] {
  const seen = new Set<string>();
  const out: Contact[] = [];
  for (const group of groups) {
    for (const c of group) {
      if (seen.has(c.value)) continue;
      seen.add(c.value);
      out.push(c);
    }
  }
  return out.slice(0, 8);
}

/** Finding emails, phone numbers and WhatsApp numbers inside text. Only what is actually written is returned. */

export interface Contact {
  value: string;
  /** Where it was found: "Description", or the website it came from */
  source: string;
  /** Emails only: a role address (collab@), a free-mail address, or a named address */
  kind?: "business" | "personal" | "named";
  /** Emails only: whether the address's domain can receive mail (null = could not be checked) */
  deliverable?: boolean | null;
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

// ---------------------------------------------------------------- social profiles

export interface Social {
  platform: "Instagram" | "Telegram" | "X (Twitter)" | "Facebook" | "LinkedIn";
  url: string;
  /** The @name, when the address has one */
  handle: string | null;
}

const RESERVED = /^(share|sharer|sharer\.php|intent|home|login|signup|explore|p|reel|reels|stories|hashtag|search|about|help|privacy|terms|legal|policies|dialog|plugins|watch|groups|events|pages|company|in|joinchat|s|addstickers|share\.php)$/i;

/** Picks the social profile links out of a list of web addresses (never guesses a profile that is not linked). */
export function extractSocials(urls: string[]): Social[] {
  const out: Social[] = [];
  const seen = new Set<string>();
  const add = (platform: Social["platform"], url: string, handle: string | null) => {
    const key = platform + ":" + (handle || url).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ platform, url, handle });
  };
  for (const raw of urls) {
    let u: URL;
    try { u = new URL(raw); } catch { continue; }
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    const first = parts[0] || "";
    if (host === "instagram.com" && first && !RESERVED.test(first)) add("Instagram", `https://www.instagram.com/${first}/`, "@" + first);
    else if ((host === "t.me" || host === "telegram.me") && first && !RESERVED.test(first) && /^[A-Za-z0-9_]{4,}$/.test(first)) add("Telegram", `https://t.me/${first}`, "@" + first);
    else if ((host === "x.com" || host === "twitter.com") && first && !RESERVED.test(first)) add("X (Twitter)", `https://x.com/${first}`, "@" + first);
    else if ((host === "facebook.com" || host === "m.facebook.com") && first && !RESERVED.test(first) && first !== "profile.php") add("Facebook", `https://www.facebook.com/${first}`, null);
    else if (host.endsWith("linkedin.com") && (first === "in" || first === "company") && parts[1]) add("LinkedIn", `https://www.linkedin.com/${first}/${parts[1]}`, null);
  }
  return out.slice(0, 8);
}

// ---------------------------------------------------------------- language

const SCRIPTS: Array<[RegExp, string]> = [
  [/[\u0900-\u097F]/g, "hi"],
  [/[\u0B80-\u0BFF]/g, "ta"],
  [/[\u0C00-\u0C7F]/g, "te"],
  [/[\u0980-\u09FF]/g, "bn"],
  [/[\u0A80-\u0AFF]/g, "gu"],
  [/[\u0C80-\u0CFF]/g, "kn"],
  [/[\u0D00-\u0D7F]/g, "ml"],
  [/[\u0A00-\u0A7F]/g, "pa"],
  [/[\u0600-\u06FF]/g, "ar"],
];

/** The language a channel is written in, from its script. Only returns something when the writing makes it clear. */
export function languageFromScript(text: string): string | null {
  let best: { code: string; n: number } | null = null;
  for (const [re, code] of SCRIPTS) {
    const n = (text.match(re) || []).length;
    if (n >= 8 && (!best || n > best.n)) best = { code, n };
  }
  return best ? best.code : null;
}

/** "hi" becomes "Hindi". Unknown codes are returned as they are. */
export function languageName(code: string | null | undefined): string | null {
  if (!code) return null;
  const base = code.split("-")[0].toLowerCase();
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(base) || base;
  } catch {
    return base;
  }
}

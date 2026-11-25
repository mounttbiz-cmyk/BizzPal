import * as XLSX from "xlsx";
import { db, getGroupBusinessId, getPlatformConfig, getUserBusinessId } from "@/lib/db";
import { generateChat, type AiTier } from "@/lib/ai/providers";
import { safeGet } from "@/lib/safeFetch";
import { listVerifications } from "@/lib/verification/store";

/**
 * The business brief: what a business does, in the owner's words. The AI advisors read it before every answer.
 *
 * The questions are a list in platform settings ("business_brief_fields"), so they can change without a release.
 * Answers come only from the owner: typed in, or suggested from their own description, link, file or GST record
 * and then accepted by them. Nothing is ever filled in with made-up text.
 */

export interface BriefField {
  key: string;
  label: string;
  question: string;
  placeholder: string;
}

export const DEFAULT_BRIEF_FIELDS: BriefField[] = [
  { key: "offering", label: "What you sell", question: "What products or services do you sell?", placeholder: "e.g. Fresh chai, snacks and office catering" },
  { key: "customers", label: "Your customers", question: "Who buys from you?", placeholder: "e.g. Office workers aged 22–40, and companies ordering for meetings" },
  { key: "pricing", label: "How you make money", question: "How do you charge, and roughly how much?", placeholder: "e.g. ₹40–₹180 per item; catering at ₹250 per person" },
  { key: "locations", label: "Where you operate", question: "Where do you sell?", placeholder: "e.g. 3 outlets in Bengaluru: Koramangala, HSR Layout, Indiranagar" },
  { key: "channels", label: "How customers buy", question: "How do customers find you and buy from you?", placeholder: "e.g. Walk-ins, Swiggy and Zomato, and tie-ups with offices" },
  { key: "competitors", label: "Competitors", question: "Who do you compete with?", placeholder: "e.g. Chaayos, Third Wave Coffee and local tea stalls" },
  { key: "goals", label: "Goals this year", question: "What do you want to achieve this year?", placeholder: "e.g. Open 2 more outlets and reach ₹15 lakh revenue a month" },
  { key: "challenges", label: "Biggest challenges", question: "What is hurting the business most right now?", placeholder: "e.g. Rising milk prices, and staff leaving within 3 months" },
];

export const MAX_VALUE_CHARS = 600;
export const MAX_SUMMARY_CHARS = 300;

export type BriefSource = "owner" | "description" | "link" | "file" | "gst" | "chat";

export interface BriefValue {
  value: string;
  source: BriefSource;
  updatedAt: string;
}

export interface Brief {
  businessId: string;
  summary: string;
  values: Record<string, BriefValue>;
  updatedAt: string | null;
}

export class BriefError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_briefs (
      business_id TEXT PRIMARY KEY,
      summary TEXT NOT NULL DEFAULT '',
      fields TEXT NOT NULL DEFAULT '{}',
      updated_at TEXT NOT NULL
    );
  `);
} catch {}

const clean = (v: unknown, max: number) =>
  String(v ?? "")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);

/** The questions in use: the saved list when it is valid, otherwise the defaults. */
export function briefFields(): BriefField[] {
  try {
    const saved = getPlatformConfig<any>("business_brief_fields", DEFAULT_BRIEF_FIELDS);
    if (Array.isArray(saved)) {
      const valid = saved
        .filter(f => f && typeof f.key === "string" && /^[a-z][a-z0-9_]{1,30}$/.test(f.key) && typeof f.label === "string" && f.label.trim())
        .map(f => ({
          key: f.key,
          label: clean(f.label, 60),
          question: clean(f.question || f.label, 140),
          placeholder: clean(f.placeholder || "", 160),
        }));
      if (valid.length > 0) return valid;
    }
  } catch {}
  return DEFAULT_BRIEF_FIELDS;
}

export function getBrief(businessId: string): Brief {
  const row = db.prepare("SELECT * FROM business_briefs WHERE business_id = ?").get(businessId) as any;
  let values: Record<string, BriefValue> = {};
  try {
    const parsed = row?.fields ? JSON.parse(row.fields) : {};
    if (parsed && typeof parsed === "object") values = parsed;
  } catch {}
  return { businessId, summary: row?.summary || "", values, updatedAt: row?.updated_at || null };
}

/** How many of the questions have an answer. */
export function briefProgress(brief: Brief, fields = briefFields()): { answered: number; total: number; missing: BriefField[] } {
  const missing = fields.filter(f => !brief.values[f.key]?.value);
  return { answered: fields.length - missing.length, total: fields.length, missing };
}

/**
 * Saves answers. Only known questions are kept; an empty answer clears that question. Returns the saved brief.
 * `append` adds to an existing answer instead of replacing it (used when an advisor learns something in chat).
 */
export function saveBrief(
  businessId: string,
  input: { summary?: string; values?: Record<string, unknown> },
  source: BriefSource,
  opts: { append?: boolean } = {}
): Brief {
  const fields = briefFields();
  const known = new Set(fields.map(f => f.key));
  const brief = getBrief(businessId);
  const now = new Date().toISOString();

  if (input.values && typeof input.values === "object") {
    for (const [key, raw] of Object.entries(input.values)) {
      if (!known.has(key)) continue;
      const value = clean(raw, MAX_VALUE_CHARS);
      const existing = brief.values[key]?.value || "";
      if (!value) {
        if (!opts.append) delete brief.values[key];
        continue;
      }
      const next = opts.append && existing && !existing.toLowerCase().includes(value.toLowerCase()) ? clean(`${existing}; ${value}`, MAX_VALUE_CHARS) : value;
      if (next !== existing) brief.values[key] = { value: next, source, updatedAt: now };
    }
  }
  if (input.summary !== undefined) brief.summary = clean(input.summary, MAX_SUMMARY_CHARS);

  db.prepare(
    `INSERT INTO business_briefs (business_id, summary, fields, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(business_id) DO UPDATE SET summary = excluded.summary, fields = excluded.fields, updated_at = excluded.updated_at`
  ).run(businessId, brief.summary, JSON.stringify(brief.values), now);
  return { ...brief, updatedAt: now };
}

/** The brief as plain lines for the advisors, plus the questions still unanswered. */
export function briefForAdvisors(businessId: string): { lines: string[]; missing: string[] } {
  const brief = getBrief(businessId);
  const fields = briefFields();
  const lines: string[] = [];
  if (brief.summary) lines.push(`In short: ${brief.summary}`);
  for (const f of fields) {
    const v = brief.values[f.key]?.value;
    if (v) lines.push(`${f.label}: ${v}`);
  }
  return { lines, missing: fields.filter(f => !brief.values[f.key]?.value).map(f => `${f.key} (${f.label})`) };
}

// ----------------------------------------------------------------- sources

const MAX_SOURCE_CHARS = 12_000;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Title, descriptions and visible text of a page. Social and listing pages often only fill the description tags. */
export function pageText(html: string): string {
  const meta = (name: string) =>
    new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i").exec(html)?.[1] ||
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i").exec(html)?.[1] ||
    "";
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || "";
  const parts = [title, meta("og:title"), meta("description"), meta("og:description"), meta("twitter:description")]
    .map(x => decodeEntities(x).trim())
    .filter(Boolean);
  const body = decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<(nav|footer|svg)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(new Set(parts)).join("\n") + (body ? `\n\n${body}` : "");
}

/** Reads a public page the owner gave (website, Instagram, Google Maps, Justdial, Swiggy...). */
export async function readLink(raw: string): Promise<{ url: string; text: string }> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    throw new BriefError("That doesn't look like a web address. Paste the full link, for example instagram.com/yourshop.");
  }
  if (!url.hostname.includes(".")) throw new BriefError("That doesn't look like a web address. Paste the full link, for example instagram.com/yourshop.");
  const page = await safeGet(url.toString(), "html", 1_500_000);
  if (!page) throw new BriefError("We couldn't open that page. It may be private, need a sign-in, or block automatic reading. Try another link or describe the business instead.", 422);
  const text = pageText(page.body.toString("utf8")).slice(0, MAX_SOURCE_CHARS);
  if (text.replace(/\s/g, "").length < 40) {
    throw new BriefError("That page had almost nothing we could read (many social and map pages only show content after signing in). Try your website, a listing page, or describe the business.", 422);
  }
  return { url: page.url.toString(), text };
}

export const FILE_TYPES: Record<string, string> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "application/pdf": "pdf",
  "text/plain": "text",
  "text/csv": "text",
  "text/markdown": "text",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "sheet",
  "application/vnd.ms-excel": "sheet",
};
export const MAX_FILE_BYTES = 8 * 1024 * 1024;

/** Turns an uploaded file into text, or into a file the AI reads itself (photos and PDFs). */
export function prepareFile(name: string, type: string, bytes: Buffer): { text?: string; file?: { mimeType: string; base64: string } } {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const kind =
    FILE_TYPES[type] ||
    ({ png: "image", jpg: "image", jpeg: "image", webp: "image", pdf: "pdf", txt: "text", csv: "text", md: "text", xlsx: "sheet", xls: "sheet" } as Record<string, string>)[ext];
  if (!kind) throw new BriefError("Please upload a photo (JPG, PNG), a PDF, a text file or an Excel sheet. For a Word file, save it as PDF first.");
  if (bytes.length === 0) throw new BriefError("That file is empty.");
  if (bytes.length > MAX_FILE_BYTES) throw new BriefError("That file is larger than 8 MB. Please upload a smaller one.");

  if (kind === "text") return { text: bytes.toString("utf8").slice(0, MAX_SOURCE_CHARS) };
  if (kind === "sheet") {
    try {
      const wb = XLSX.read(bytes, { type: "buffer" });
      const text = wb.SheetNames.slice(0, 3)
        .map(n => `Sheet ${n}:\n${XLSX.utils.sheet_to_csv(wb.Sheets[n])}`)
        .join("\n\n")
        .slice(0, MAX_SOURCE_CHARS);
      return { text };
    } catch {
      throw new BriefError("We couldn't read that spreadsheet. Please check the file and try again.");
    }
  }
  const mimeType = kind === "pdf" ? "application/pdf" : type.startsWith("image/") ? type : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { file: { mimeType, base64: bytes.toString("base64") } };
}

/** What the GST registry says about the owner's business, when its GSTIN has been verified. */
export function gstFacts(email: string, businessId: string): string {
  if (businessId !== getGroupBusinessId(email)) return "";
  try {
    const row = listVerifications(email).find(v => v.kind === "gstin" && v.status === "verified");
    const r = row?.evidence?.record;
    if (!r) return "";
    return [
      r.tradeName && `Trade name: ${r.tradeName}`,
      r.legalName && `Registered (legal) name: ${r.legalName}`,
      r.constitution && `Type of business: ${r.constitution}`,
      r.activities && `Business activities in the GST registry: ${r.activities}`,
      r.state && `State: ${r.state}`,
      r.address && `Registered address: ${r.address}`,
      r.registrationDate && `GST registered since: ${r.registrationDate}`,
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

// ------------------------------------------------------------- suggestions

function parseJsonObject(text: string | null): any {
  if (!text) return null;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Suggested answers from what the owner gave. The AI is told to use only what the material says, so a question the
 * material doesn't answer stays empty. The owner reviews every suggestion before anything is saved.
 */
export async function suggestBrief(
  sources: { description?: string; link?: { url: string; text: string }; fileText?: string; file?: { mimeType: string; base64: string }; gst?: string },
  businessName: string,
  tier: AiTier,
  meter?: { businessId: string; feature: string }
): Promise<{ summary: string; values: Record<string, string> }> {
  const fields = briefFields();
  const material: string[] = [];
  if (sources.description) material.push(`THE OWNER'S OWN DESCRIPTION:\n${sources.description}`);
  if (sources.link) material.push(`TEXT FROM THEIR PAGE ${sources.link.url}:\n${sources.link.text}`);
  if (sources.fileText) material.push(`TEXT FROM THEIR FILE:\n${sources.fileText}`);
  if (sources.file) material.push("THEIR FILE is attached (for example a menu, price list, brochure or visiting card).");
  if (sources.gst) material.push(`FROM THEIR GST REGISTRATION:\n${sources.gst}`);
  if (material.length === 0) throw new BriefError("Describe the business, paste a link or upload a file first.");

  const system = `You help a business owner fill in a short profile of their business, from material they gave you. You never guess.
Rules:
- Use ONLY what the material says or clearly shows. If the material doesn't answer a question, return an empty string for it.
- Write each answer in plain, short sentences or a short list (at most about 40 words), in the owner's voice ("We sell…" is fine, or just the facts).
- Keep real names, places and prices exactly as written. Use ₹ for Indian rupees.
- Ignore website boilerplate such as cookie notices, menus and copyright lines.
- Reply with JSON only.`;

  const message = `Business name: ${businessName}

${material.join("\n\n")}

Fill in this JSON. "summary" is one sentence saying what the business does, for whom and where (empty if unclear).
${JSON.stringify(
  {
    summary: "",
    answers: Object.fromEntries(fields.map(f => [f.key, `<${f.question}>`])),
  },
  null,
  2
)}`;

  const reply = await generateChat({ system, message, files: sources.file ? [sources.file] : undefined, json: true, meter }, tier);
  const parsed = parseJsonObject(reply);
  if (!parsed) {
    throw new BriefError(
      sources.file
        ? "We couldn't read that file right now. Please try again in a moment, or describe the business instead."
        : "We couldn't read that right now. Please try again in a moment.",
      503
    );
  }
  const values: Record<string, string> = {};
  for (const f of fields) {
    const v = clean(parsed.answers?.[f.key], MAX_VALUE_CHARS);
    // The model sometimes echoes the question or a placeholder back; those are not answers
    if (v && !/^<.*>$/.test(v) && v.toLowerCase() !== f.question.toLowerCase() && !/^(n\/?a|none|unknown|not (mentioned|specified|provided|available))\.?$/i.test(v)) {
      values[f.key] = v;
    }
  }
  const summary = clean(parsed.summary, MAX_SUMMARY_CHARS);
  return { summary: /^<.*>$/.test(summary) ? "" : summary, values };
}

/** The business the signed-in person is working in. */
export function activeBusiness(email: string): { id: string; name: string } {
  const id = getUserBusinessId(email);
  const row = db.prepare("SELECT name FROM businesses WHERE id = ?").get(id) as any;
  return { id, name: row?.name || "" };
}

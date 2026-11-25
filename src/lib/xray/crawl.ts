import { createHash } from "crypto";
import { safeGet } from "@/lib/safeFetch";
import { allowedByRobots } from "@/lib/datapal/contactPages";
import { pageText } from "@/lib/brief";

/**
 * Reads a business website for the X-Ray: the home page and up to five of its most useful pages (about, services,
 * pricing, contact...). Only public pages on the same site, only where robots.txt allows, through the safe reader
 * that never opens private or internal addresses. What was read is kept as a snapshot so every finding can point
 * back to the page it came from.
 */

export const MAX_EXTRA_PAGES = 5;
const MAX_PAGE_CHARS = 4_500;
const CRAWL_BUDGET_MS = 25_000;

export interface SnapshotPage {
  /** Short id the analysis cites, e.g. "p1" */
  id: string;
  url: string;
  title: string;
  /** Why this page was read: home, about, services... */
  kind: string;
  fetchedAt: string;
  chars: number;
  contentHash: string;
  text: string;
}

export interface CrawlSnapshot {
  startUrl: string;
  finalUrl: string;
  crawledAt: string;
  durationMs: number;
  pages: SnapshotPage[];
  /** Pages we tried and could not read, with the reason */
  skipped: Array<{ url: string; reason: string }>;
  /** Pages found worth reading but left out because of the page limit */
  notRead: number;
}

export class CrawlError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}

// What a link's address or text suggests about the page, best first
const KINDS: Array<{ kind: string; words: RegExp; weight: number }> = [
  { kind: "about", words: /\b(about|about-us|who-we-are|company|our-story)\b/i, weight: 10 },
  { kind: "services", words: /\b(services?|solutions?|what-we-do|offerings?|products?|platform|features?)\b/i, weight: 9 },
  { kind: "pricing", words: /\b(pricing|plans?|price|rates?|packages?|fees|tariff)\b/i, weight: 8 },
  { kind: "contact", words: /\b(contact|contact-us|get-in-touch|reach-us|locations?|branches?|offices?)\b/i, weight: 7 },
  { kind: "projects", words: /\b(projects?|properties|listings?|portfolio|case-studies|clients?|work)\b/i, weight: 6 },
  { kind: "industry", words: /\b(insurance|investments?|mutual-funds?|loans?|broking|trading|real-estate|rent|buy|sell)\b/i, weight: 5 },
  { kind: "team", words: /\b(team|leadership|careers?)\b/i, weight: 3 },
];
// Pages that tell us nothing about the business
const SKIP = /\b(login|log-in|signin|sign-in|signup|sign-up|register|cart|checkout|account|privacy|terms|cookie|policy|disclaimer|sitemap|wp-admin|feed|tag|category|author|search)\b/i;
const FILE = /\.(pdf|jpe?g|png|gif|webp|svg|zip|docx?|xlsx?|pptx?|mp4|mp3|css|js|json|xml)(\?|$)/i;

const hash = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

export function normaliseStart(raw: string): URL {
  const trimmed = String(raw || "").trim();
  if (!trimmed) throw new CrawlError("Enter the company website, for example yourcompany.com.", 400);
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new CrawlError("That doesn't look like a website address.", 400);
  }
  if (!url.hostname.includes(".") || url.username || url.password) throw new CrawlError("That doesn't look like a website address.", 400);
  url.hash = "";
  return url;
}

function titleOf(html: string): string {
  const t = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || "";
  return t.replace(/\s+/g, " ").trim().slice(0, 140);
}

/** Same-site links from the page, each with how useful it looks. */
function candidateLinks(html: string, base: URL): Array<{ url: string; kind: string; score: number }> {
  const out = new Map<string, { url: string; kind: string; score: number }>();
  const host = base.hostname.replace(/^www\./, "");
  const re = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(html)) && n < 600) {
    n++;
    let u: URL;
    try {
      u = new URL(m[1], base);
    } catch {
      continue;
    }
    if (u.protocol !== "https:" && u.protocol !== "http:") continue;
    if (u.hostname.replace(/^www\./, "") !== host) continue;
    u.hash = "";
    const path = u.pathname.toLowerCase();
    if (path === "/" || path === base.pathname.toLowerCase() || FILE.test(path) || SKIP.test(path)) continue;
    const label = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    const haystack = `${path.replace(/[/_]/g, "-")} ${label.replace(/\s+/g, "-")}`;
    let best: { kind: string; score: number } | null = null;
    for (const k of KINDS) {
      if (k.words.test(haystack) && (!best || k.weight > best.score)) best = { kind: k.kind, score: k.weight };
    }
    if (!best) continue;
    // Shorter paths are usually the main page of a section
    const depth = path.split("/").filter(Boolean).length;
    const score = best.score - Math.max(0, depth - 1) * 2;
    const key = u.toString().replace(/\/$/, "");
    const prev = out.get(key);
    if (!prev || prev.score < score) out.set(key, { url: key, kind: best.kind, score });
  }
  return Array.from(out.values()).sort((a, b) => b.score - a.score);
}

async function readPage(url: string, kind: string, id: string): Promise<SnapshotPage | { url: string; reason: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, reason: "Not a valid address" };
  }
  if (!(await allowedByRobots(parsed))) return { url, reason: "The site's robots.txt asks automated readers not to open it" };
  const page = await safeGet(url, "html", 1_500_000);
  if (!page) return { url, reason: "Could not be opened (blocked, private, too slow or not a web page)" };
  const html = page.body.toString("utf8");
  const text = pageText(html).slice(0, MAX_PAGE_CHARS);
  if (text.replace(/\s/g, "").length < 40) return { url: page.url.toString(), reason: "Almost no readable text (the page may need a browser or sign-in to show content)" };
  return {
    id,
    url: page.url.toString(),
    title: titleOf(html) || page.url.pathname,
    kind,
    fetchedAt: new Date().toISOString(),
    chars: text.length,
    contentHash: hash(text),
    text,
  };
}

export async function crawlWebsite(raw: string, onProgress?: (read: number, total: number) => void): Promise<CrawlSnapshot> {
  const started = Date.now();
  const start = normaliseStart(raw);
  const skipped: CrawlSnapshot["skipped"] = [];

  if (!(await allowedByRobots(start))) {
    throw new CrawlError("This website's robots.txt asks automated readers not to open it, so we did not read it.");
  }
  const home = await safeGet(start.toString(), "html", 1_500_000);
  if (!home) {
    throw new CrawlError("We couldn't open that website. It may be offline, private, blocking automated readers, or not a public web page.");
  }
  const homeHtml = home.body.toString("utf8");
  const homeText = pageText(homeHtml).slice(0, MAX_PAGE_CHARS);
  const pages: SnapshotPage[] = [];
  if (homeText.replace(/\s/g, "").length >= 40) {
    pages.push({
      id: "p1",
      url: home.url.toString(),
      title: titleOf(homeHtml) || home.url.hostname,
      kind: "home",
      fetchedAt: new Date().toISOString(),
      chars: homeText.length,
      contentHash: hash(homeText),
      text: homeText,
    });
  } else {
    skipped.push({ url: home.url.toString(), reason: "Almost no readable text (the page may need a browser to show content)" });
  }

  // One page per kind first, so the X-Ray sees different sides of the business, then the best of the rest
  const candidates = candidateLinks(homeHtml, home.url);
  const chosen: typeof candidates = [];
  const kindsTaken = new Set<string>();
  for (const c of candidates) {
    if (chosen.length >= MAX_EXTRA_PAGES) break;
    if (!kindsTaken.has(c.kind)) {
      chosen.push(c);
      kindsTaken.add(c.kind);
    }
  }
  for (const c of candidates) {
    if (chosen.length >= MAX_EXTRA_PAGES) break;
    if (!chosen.includes(c)) chosen.push(c);
  }

  onProgress?.(pages.length, chosen.length + 1);
  let done = pages.length;
  const left = CRAWL_BUDGET_MS - (Date.now() - started);
  const results = await Promise.all(
    chosen.map((c, i) =>
      Promise.race([
        readPage(c.url, c.kind, `p${i + 2}`).then(r => {
          done++;
          onProgress?.(done, chosen.length + 1);
          return r;
        }),
        new Promise<{ url: string; reason: string }>(resolve =>
          setTimeout(() => resolve({ url: c.url, reason: "Took too long to load" }), Math.max(left, 3_000))
        ),
      ])
    )
  );
  const seen = new Set(pages.map(p => p.contentHash));
  for (const r of results) {
    if ("id" in r) {
      // The same page under another address adds nothing
      if (seen.has(r.contentHash)) continue;
      seen.add(r.contentHash);
      pages.push(r);
    } else {
      skipped.push(r);
    }
  }
  if (pages.length === 0) {
    throw new CrawlError("We opened the website but found no readable text. It may only show content after loading in a browser or signing in.");
  }
  // Ids in reading order, so the report lists them neatly
  pages.forEach((p, i) => (p.id = `p${i + 1}`));

  return {
    startUrl: start.toString(),
    finalUrl: home.url.toString(),
    crawledAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    pages,
    skipped,
    notRead: Math.max(0, candidates.length - chosen.length),
  };
}

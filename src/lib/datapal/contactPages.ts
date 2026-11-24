import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { extractLabelled, extractSocials, isFollowable, mergeContacts, type Contact, type Social } from "@/lib/datapal/contacts";

/**
 * Reads the public website or link page a creator put in their channel description, and picks out the contact
 * details written there. It only opens ordinary public web pages: never private or internal addresses, never more than a
 * few small pages, and it follows the site's robots.txt.
 */

const MAX_BYTES = 400_000;
const TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "BizzPalBot/1.0 (+https://bizzpal.ai)";

// Tests point the reader at a pretend website on this computer. Never set this on the live server.
export const allowLocal = () => process.env.DATAPAL_FETCH_ALLOW_LOCAL === "1";

// ---------------------------------------------------------------- keeping it away from private networks

function isPrivateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n))) return true;
  const [a, b] = p;
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && p[2] === 0) ||
    (a === 198 && (b === 18 || b === 19))
  );
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateV4(ip);
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(v6);
  if (mapped) return isPrivateV4(mapped[1]);
  return v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

/** Looks the name up and refuses private answers, at the moment of connecting (so the answer cannot change afterwards). */
export function guardedLookup(hostname: string, options: any, callback: any) {
  dns.lookup(hostname, { all: true }, (err, addresses) => {
    if (err) return callback(err);
    const allowed = addresses.filter(a => allowLocal() || !isPrivateAddress(a.address));
    if (allowed.length === 0) return callback(new Error("blocked address"));
    if (options?.all) return callback(null, allowed);
    callback(null, allowed[0].address, allowed[0].family);
  });
}

// ---------------------------------------------------------------- fetching one page

async function fetchText(rawUrl: string, redirects = 0): Promise<{ url: string; body: string } | null> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { return null; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!allowLocal() && url.port && url.port !== "80" && url.port !== "443") return null;
  if (net.isIP(url.hostname.replace(/^\[|\]$/g, "")) && !allowLocal() && isPrivateAddress(url.hostname.replace(/^\[|\]$/g, ""))) return null;

  const lib = url.protocol === "https:" ? https : http;
  return new Promise(resolve => {
    const done = (v: { url: string; body: string } | null) => resolve(v);
    const req = lib.request(
      {
        hostname: url.hostname.replace(/^\[|\]$/g, ""),
        port: url.port || undefined,
        path: url.pathname + url.search,
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain;q=0.9,*/*;q=0.1", "Accept-Language": "en" },
        lookup: guardedLookup as any,
        timeout: TIMEOUT_MS,
      },
      res => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= MAX_REDIRECTS) return done(null);
          let next = "";
          try { next = new URL(res.headers.location, url).toString(); } catch { return done(null); }
          return fetchText(next, redirects + 1).then(done);
        }
        const type = String(res.headers["content-type"] || "");
        if (status !== 200 || !/(text\/html|text\/plain|application\/xhtml)/i.test(type)) {
          res.resume();
          return done(null);
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > MAX_BYTES) { req.destroy(); return; }
          chunks.push(c);
        });
        res.on("end", () => done({ url: url.toString(), body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", () => done(chunks.length ? { url: url.toString(), body: Buffer.concat(chunks).toString("utf8") } : null));
        res.on("close", () => done(chunks.length ? { url: url.toString(), body: Buffer.concat(chunks).toString("utf8") } : null));
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => done(null));
    req.end();
  });
}

// ---------------------------------------------------------------- robots.txt

const robotsCache = new Map<string, { disallow: string[]; at: number }>();

async function allowedByRobots(url: URL): Promise<boolean> {
  const cached = robotsCache.get(url.origin);
  let rules = cached && Date.now() - cached.at < 3_600_000 ? cached.disallow : null;
  if (!rules) {
    rules = [];
    const page = await fetchText(`${url.origin}/robots.txt`);
    if (page) {
      let applies = false;
      let groupHasAgents = false;
      for (const raw of page.body.split("\n")) {
        const line = raw.replace(/#.*/, "").trim();
        const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
        if (!m) continue;
        const field = m[1].toLowerCase();
        const value = m[2].trim();
        if (field === "user-agent") {
          if (groupHasAgents === false) applies = false;
          groupHasAgents = true;
          if (value === "*" || /bizzpalbot/i.test(value)) applies = true;
        } else {
          groupHasAgents = false;
          if (field === "disallow" && applies && value) rules.push(value);
        }
      }
    }
    robotsCache.set(url.origin, { disallow: rules, at: Date.now() });
  }
  const path = url.pathname + url.search;
  return !rules.some(r => r !== "/" ? path.startsWith(r) : true);
}

// ---------------------------------------------------------------- reading a page

function visibleText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
    // keep line breaks, so a label stays on the same line as the contact it belongs to
    .replace(/<\/(p|div|li|tr|h[1-6]|section|article|ul|ol|td)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#0*64;|&commat;/g, "@").replace(/&#43;/g, "+")
    .replace(/[ \t\r\f]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n");
}

function pageContacts(html: string, source: string): { emails: Contact[]; phones: Contact[]; socials: Social[] } {
  const hrefs = Array.from(html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)).map(m => m[1].replace(/&amp;/g, "&"));
  // Put each mail and call link's address right after its text ("Book us booking@..."), so the label before it still applies
  const withLinks = html.replace(/<a\b[^>]*href\s*=\s*["'](mailto:|tel:)([^"'?]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi, (_, kind: string, target: string, label: string) => {
    let address = target;
    try { address = decodeURIComponent(target); } catch {}
    return ` ${label} ${address} `;
  });
  const fromLinks = hrefs.filter(h => /wa\.me|whatsapp\.com/i.test(h)).join("\n");
  const found = extractLabelled(`${visibleText(withLinks)}\n${fromLinks}`, source);
  const absolute = hrefs.filter(h => /^https?:\/\//i.test(h));
  return { emails: found.emails, phones: found.phones, socials: extractSocials(absolute) };
}

const CONTACT_PATHS = ["/contact", "/contact-us", "/about"];

/** Opens up to `maxSites` of the creator's own links and collects the contact details and social profiles found. */
export async function readCreatorSites(links: string[], maxSites = 2): Promise<{ emails: Contact[]; phones: Contact[]; socials: Social[] }> {
  const sites = links.filter(isFollowable).slice(0, maxSites);
  const results = await Promise.all(sites.map(async site => {
    let emails: Contact[] = [];
    let phones: Contact[] = [];
    let socials: Social[] = [];
    try {
      const url = new URL(site);
      if (!(await allowedByRobots(url))) return { emails, phones, socials };
      const page = await fetchText(site);
      if (!page) return { emails, phones, socials };
      const host = new URL(page.url).hostname.replace(/^www\./, "");
      let found = pageContacts(page.body, host);
      emails = found.emails;
      phones = found.phones;
      socials = found.socials;

      // A normal website often keeps its details on a contact page
      if (emails.length === 0 && phones.length === 0) {
        const origin = new URL(page.url).origin;
        for (const p of CONTACT_PATHS.slice(0, 2)) {
          const target = new URL(p, origin);
          if (!(await allowedByRobots(target))) continue;
          const sub = await fetchText(target.toString());
          if (!sub) continue;
          found = pageContacts(sub.body, host);
          emails = found.emails;
          phones = found.phones;
          socials = [...socials, ...found.socials];
          if (emails.length > 0 || phones.length > 0) break;
        }
      }
    } catch {}
    return { emails, phones, socials };
  }));
  return {
    emails: mergeContacts(...results.map(r => r.emails)),
    phones: mergeContacts(...results.map(r => r.phones)),
    socials: extractSocials(results.flatMap(r => r.socials.map(x => x.url))),
  };
}

/** The public bio of a Telegram account (t.me/name), for an email or number the creator wrote there. */
export async function readTelegramBio(handle: string): Promise<{ emails: Contact[]; phones: Contact[] }> {
  const name = handle.replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{4,32}$/.test(name)) return { emails: [], phones: [] };
  try {
    const base = (process.env.TELEGRAM_BASE || "https://t.me").replace(/\/+$/, "");
    const page = await fetchText(`${base}/${name}`);
    if (!page) return { emails: [], phones: [] };
    const meta = /<meta property="og:description" content="([^"]*)"/i.exec(page.body)?.[1] || "";
    const bio = /<div class="tgme_page_description[^"]*"[^>]*>([\s\S]*?)<\/div>/i.exec(page.body)?.[1] || "";
    const text = visibleText(`${meta} ${bio}`.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));
    return extractLabelled(text, `Telegram @${name}`);
  } catch {
    return { emails: [], phones: [] };
  }
}

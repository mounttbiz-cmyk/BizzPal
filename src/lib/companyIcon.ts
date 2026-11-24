import http from "node:http";
import https from "node:https";
import net from "node:net";
import { allowLocal, guardedLookup, isPrivateAddress } from "@/lib/datapal/contactPages";

/**
 * Finds the small icon (favicon) a company's own website shows in the browser tab, so the company list can show its
 * logo. Only public web addresses are opened (never private or internal ones), responses are small and short, and
 * results are kept for a day so each site is asked at most once a day.
 */

const TIMEOUT_MS = 5_000;
const MAX_HTML = 300_000;
const MAX_IMAGE = 256_000;
const MAX_REDIRECTS = 3;
const DAY = 24 * 60 * 60 * 1000;
const USER_AGENT = "BizzPalBot/1.0 (+https://bizzpal.ai)";

export interface Icon {
  type: string;
  body: Buffer;
}

const cache = new Map<string, { icon: Icon | null; at: number }>();
const pending = new Map<string, Promise<Icon | null>>();

function get(rawUrl: string, accept: "html" | "image", limit: number, redirects = 0): Promise<{ url: URL; type: string; body: Buffer } | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return Promise.resolve(null);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return Promise.resolve(null);
  if (!allowLocal() && url.port && url.port !== "80" && url.port !== "443") return Promise.resolve(null);
  const bareHost = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(bareHost) && !allowLocal() && isPrivateAddress(bareHost)) return Promise.resolve(null);

  const lib = url.protocol === "https:" ? https : http;
  return new Promise(resolve => {
    let settled = false;
    const done = (v: { url: URL; type: string; body: Buffer } | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };
    const req = lib.request(
      {
        hostname: bareHost,
        port: url.port || undefined,
        path: url.pathname + url.search,
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: accept === "html" ? "text/html" : "image/*" },
        lookup: guardedLookup as any,
        timeout: TIMEOUT_MS,
      },
      res => {
        const status = res.statusCode || 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          if (redirects >= MAX_REDIRECTS) return done(null);
          let next = "";
          try {
            next = new URL(res.headers.location, url).toString();
          } catch {
            return done(null);
          }
          return get(next, accept, limit, redirects + 1).then(done);
        }
        const type = String(res.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
        const okType = accept === "html" ? /html/.test(type) : /^image\//.test(type) || type === "application/octet-stream";
        if (status !== 200 || !okType) {
          res.resume();
          return done(null);
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > limit) {
            req.destroy();
            return done(accept === "html" ? { url, type, body: Buffer.concat(chunks) } : null);
          }
          chunks.push(c);
        });
        res.on("end", () => done({ url, type, body: Buffer.concat(chunks) }));
        res.on("error", () => done(null));
      }
    );
    req.on("timeout", () => req.destroy());
    req.on("error", () => done(null));
    req.end();
  });
}

/** Icon links in the page head, best first: large touch icons, then sized icons, then any icon. */
function iconLinks(html: string, base: URL): string[] {
  const found: Array<{ href: string; score: number }> = [];
  const head = html.slice(0, 100_000);
  for (const tag of head.match(/<link\b[^>]*>/gi) || []) {
    const rel = /\brel\s*=\s*["']?([^"'>]+)/i.exec(tag)?.[1]?.toLowerCase() || "";
    if (!/\bicon\b/.test(rel)) continue;
    const href = /\bhref\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1] || /\bhref\s*=\s*([^\s>]+)/i.exec(tag)?.[1];
    if (!href || href.startsWith("data:")) continue;
    const size = Number(/\bsizes\s*=\s*["']?(\d+)/i.exec(tag)?.[1] || 0);
    const score = (rel.includes("apple-touch") ? 180 : 0) + Math.min(size, 256) + (/\.svg(\?|$)/i.test(href) ? 40 : 0);
    try {
      found.push({ href: new URL(href, base).toString(), score });
    } catch {}
  }
  return found.sort((a, b) => b.score - a.score).map(f => f.href);
}

/** Tells real images from error pages served with an image type. */
function looksLikeImage(type: string, body: Buffer): string | null {
  if (body.length < 16) return null;
  const head = body.subarray(0, 12);
  if (head[0] === 0x89 && head.toString("latin1", 1, 4) === "PNG") return "image/png";
  if (head[0] === 0xff && head[1] === 0xd8) return "image/jpeg";
  if (head.toString("latin1", 0, 3) === "GIF") return "image/gif";
  if (head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (head[0] === 0 && head[1] === 0 && (head[2] === 1 || head[2] === 2) && head[3] === 0) return "image/x-icon";
  if ((type === "image/svg+xml" || /\.svg/.test(type)) && /<svg[\s>]/i.test(body.subarray(0, 2000).toString("utf8"))) return "image/svg+xml";
  return null;
}

async function find(site: string): Promise<Icon | null> {
  const home = await get(site, "html", MAX_HTML);
  const base = home?.url || new URL(site);
  const candidates = [...(home ? iconLinks(home.body.toString("utf8"), base) : []), new URL("/favicon.ico", base).toString()];
  for (const candidate of Array.from(new Set(candidates)).slice(0, 4)) {
    const img = await get(candidate, "image", MAX_IMAGE);
    const type = img && looksLikeImage(img.type, img.body);
    if (img && type) return { type, body: img.body };
  }
  return null;
}

/** The icon for a website address, or null when the site has none we can safely show. */
export async function iconForWebsite(website: string): Promise<Icon | null> {
  let origin: string;
  try {
    const u = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    origin = `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
  const hit = cache.get(origin);
  if (hit && Date.now() - hit.at < DAY) return hit.icon;
  if (pending.has(origin)) return pending.get(origin)!;

  const job = find(origin)
    .catch(() => null)
    .then(icon => {
      if (cache.size > 2000) cache.clear();
      cache.set(origin, { icon, at: Date.now() });
      pending.delete(origin);
      return icon;
    });
  pending.set(origin, job);
  return job;
}

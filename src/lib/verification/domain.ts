import dns from "node:dns";
import https from "node:https";
import net from "node:net";
import { randomBytes } from "node:crypto";

/**
 * Website ownership proof. The founder places a one-time token on the domain in ONE of three
 * ways; we check all three. Only someone who controls the domain can do any of them.
 *
 *   1. DNS TXT   _bizzpal.<domain>   =  <token>
 *   2. File      https://<domain>/.well-known/bizzpal-verify.txt   containing <token>
 *   3. Meta tag  <meta name="bizzpal-site-verification" content="<token>"> on the home page
 *
 * Because the server fetches a URL the user chose, outbound requests are SSRF-hardened:
 * private/loopback/link-local/metadata addresses are refused, the resolved IP is pinned for the
 * connection, redirects are re-validated, and size/time are capped.
 */

export const TOKEN_PREFIX = "bizzpal-verify-";

export function newChallengeToken(): string {
  return TOKEN_PREFIX + randomBytes(16).toString("hex");
}

const HOSTNAME = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;
const BLOCKED_SUFFIXES = [".local", ".localhost", ".internal", ".lan", ".home", ".corp", ".intranet", ".test", ".invalid", ".example"];

/** "https://www.Acme.in/about" -> "www.acme.in". Returns null if it is not a usable public hostname. */
export function normalizeDomain(input: string): string | null {
  let s = (input || "").trim().toLowerCase();
  if (!s) return null;
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  s = s.split(/[/?#]/)[0].replace(/:\d+$/, "").replace(/\.$/, "");
  if (s.includes("@")) return null;
  if (net.isIP(s)) return null;
  if (!HOSTNAME.test(s)) return null;
  if (BLOCKED_SUFFIXES.some((x) => s.endsWith(x))) return null;
  return s;
}

/** True when the founder's login email is on the verified domain (or a subdomain of it). */
export function emailMatchesDomain(email: string, domain: string): boolean {
  const host = (email.split("@")[1] || "").toLowerCase();
  const bare = domain.replace(/^www\./, "");
  return Boolean(host) && (host === bare || host.endsWith("." + bare));
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local + cloud metadata (169.254.169.254)
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7)); // IPv4-mapped
    return v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb") || v.startsWith("ff");
  }
  return true;
}

async function resolvePublic(hostname: string): Promise<{ address: string; family: number } | null> {
  const records = await dns.promises.lookup(hostname, { all: true });
  if (!records.length) return null;
  // Refuse if ANY answer is internal: stops "one public + one private" tricks.
  if (records.some((r) => isPrivateAddress(r.address))) return null;
  return records[0];
}

interface FetchResult { status: number; body: string; location?: string }

function getPinned(url: URL, ip: { address: string; family: number }, maxBytes = 512 * 1024, timeoutMs = 6000): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: "https:",
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "GET",
        servername: url.hostname,
        headers: { "User-Agent": "BizzPal-Verifier/1.0", Accept: "text/html,text/plain,*/*;q=0.5", Host: url.host },
        // Pin the already-validated address so DNS cannot change between check and connect.
        lookup: (_h, _o, cb) => (_o && (_o as any).all ? (cb as any)(null, [{ address: ip.address, family: ip.family }]) : cb(null, ip.address, ip.family)),
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve({ status: res.statusCode || 0, body: Buffer.concat(chunks).toString("utf8"), location: res.headers.location });
        };
        res.on("data", (c: Buffer) => {
          if (done) return;
          const room = maxBytes - size;
          if (c.length >= room) {
            // Large page: keep the first maxBytes (a <meta> tag lives in <head>, right at the top) and stop reading.
            chunks.push(c.subarray(0, room));
            size = maxBytes;
            finish();
            res.destroy();
            return;
          }
          size += c.length;
          chunks.push(c);
        });
        res.on("end", finish);
        res.on("close", finish);
        res.on("error", (e) => { if (!done) { done = true; reject(e); } });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

/** SSRF-safe GET over HTTPS, following up to 3 redirects and re-validating every hop. */
export async function safeGet(startUrl: string): Promise<FetchResult | null> {
  let url: URL;
  try { url = new URL(startUrl); } catch { return null; }
  for (let hop = 0; hop < 4; hop++) {
    if (url.protocol !== "https:") return null;
    if (!normalizeDomain(url.hostname)) return null;
    let ip: { address: string; family: number } | null;
    try { ip = await resolvePublic(url.hostname); } catch { return null; }
    if (!ip) return null;
    let r: FetchResult;
    try { r = await getPinned(url, ip); } catch { return null; }
    if (r.status >= 300 && r.status < 400 && r.location) {
      try { url = new URL(r.location, url); } catch { return null; }
      continue;
    }
    return r;
  }
  return null;
}

export type DomainProof = { verified: true; method: "dns" | "file" | "meta" } | { verified: false; tried: string[] };

export interface ProofDeps {
  resolveTxt: (host: string) => Promise<string[][]>;
  get: (url: string) => Promise<FetchResult | null>;
}
const defaultDeps: ProofDeps = { resolveTxt: (h) => dns.promises.resolveTxt(h), get: safeGet };

export async function checkDomainProof(domain: string, token: string, deps: ProofDeps = defaultDeps): Promise<DomainProof> {
  const tried: string[] = [];

  // 1. DNS TXT
  try {
    const txt = await deps.resolveTxt(`_bizzpal.${domain}`);
    if (txt.some((parts) => parts.join("").trim() === token)) return { verified: true, method: "dns" };
    tried.push("DNS record found but the value does not match");
  } catch {
    tried.push("No DNS TXT record found yet (DNS changes can take a few minutes)");
  }

  // 2. Well-known file
  const file = await deps.get(`https://${domain}/.well-known/bizzpal-verify.txt`);
  if (file && file.status === 200 && file.body.trim() === token) return { verified: true, method: "file" };
  tried.push(file ? `Verification file returned ${file.status}` : "Verification file could not be reached");

  // 3. Meta tag on the home page
  const home = await deps.get(`https://${domain}/`);
  if (home && home.status === 200) {
    const tags = home.body.match(/<meta[^>]+>/gi) || [];
    const hit = tags.some(
      (t) => /name\s*=\s*["']bizzpal-site-verification["']/i.test(t) && new RegExp(`content\\s*=\\s*["']${token}["']`, "i").test(t)
    );
    if (hit) return { verified: true, method: "meta" };
    tried.push("Home page loaded but the meta tag was not found");
  } else {
    tried.push("Home page could not be reached over HTTPS");
  }

  return { verified: false, tried };
}

import http from "node:http";
import https from "node:https";
import net from "node:net";
import { allowLocal, guardedLookup, isPrivateAddress } from "@/lib/datapal/contactPages";

/**
 * Fetches a public web page or image for the app (company logos, reading a business's own pages). It never opens
 * private or internal addresses (checked when connecting, so a DNS answer cannot change afterwards), follows at most
 * a few redirects, stops after a size limit and gives up after a few seconds.
 */

const TIMEOUT_MS = 6_000;
const MAX_REDIRECTS = 3;
const USER_AGENT = "BizzPalBot/1.0 (+https://bizzpal.ai)";

export function safeGet(rawUrl: string, accept: "html" | "image", limit: number, redirects = 0): Promise<{ url: URL; type: string; body: Buffer } | null> {
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
          return safeGet(next, accept, limit, redirects + 1).then(done);
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


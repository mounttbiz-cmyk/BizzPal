/**
 * Signed customer sessions.
 *
 * After a customer proves who they are (Google sign-in, or an email and password the server checks), the server hands the browser a cookie that only the server could have made. Every customer
 * API reads that cookie to know who is calling. Nothing the browser sends in the request body or query string is
 * trusted as an identity.
 *
 * Cookie value: `<base64url(payload)>.<base64url(HMAC-SHA256 signature)>`. It cannot be forged without the server
 * secret and it expires.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const USER_COOKIE = "bizzpal_user_token";
export const USER_SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function secret(): string {
  const m =
    process.env.SECRETS_KEY ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPERADMIN_PASSCODE ||
    (process.env.NODE_ENV !== "production" ? "bizzpal-local-development-key-not-secret" : "");
  return m ? `user-session-v1:${m}` : "";
}

function sign(data: string): Buffer {
  return createHmac("sha256", secret()).update(data).digest();
}

export function createUserSession(email: string): string | null {
  const key = secret();
  const clean = String(email || "").trim().toLowerCase();
  if (!key || !clean.includes("@")) return null;
  const payload = Buffer.from(
    JSON.stringify({ sub: clean, exp: Math.floor(Date.now() / 1000) + USER_SESSION_TTL_SEC })
  ).toString("base64url");
  return `${payload}.${sign(payload).toString("base64url")}`;
}

/** Returns the email in a valid, unexpired token, otherwise null. */
export function verifyUserSession(token: string | undefined | null): string | null {
  try {
    if (!secret() || !token) return null;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = sign(payload);
    const given = Buffer.from(sig, "base64url");
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.sub !== "string" || typeof data.exp !== "number" || data.exp <= Date.now() / 1000) return null;
    return data.sub;
  } catch {
    return null;
  }
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

/** The signed-in customer's email, or null. */
export function getSessionEmail(req: Request): string | null {
  return verifyUserSession(readCookie(req, USER_COOKIE));
}

function isSecureRequest(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function sessionSetCookie(token: string, req: Request): string {
  return `${USER_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${USER_SESSION_TTL_SEC}${isSecureRequest(req) ? "; Secure" : ""}`;
}

export function sessionClearCookie(req: Request): string {
  return `${USER_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecureRequest(req) ? "; Secure" : ""}`;
}

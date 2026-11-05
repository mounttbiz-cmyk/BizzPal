/**
 * Signed admin session tokens (HMAC-SHA256, Web Crypto only so it runs in both the
 * Edge middleware and Node route handlers).
 *
 * The cookie value is `<base64url(payload)>.<base64url(signature)>`. It cannot be forged
 * without the server secret, and it expires.
 */

export const ADMIN_COOKIE = "bizzpal_admin_token";
export const ADMIN_SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

const enc = new TextEncoder();

/** The admin passcode. Defaults to bizzpal2026 if not explicitly overridden in environment. */
export function getAdminPasscode(): string {
  return process.env.SUPERADMIN_PASSCODE || process.env.ADMIN_PASSCODE || "bizzpal2026";
}

/** Secret used to sign sessions. Prefer a dedicated secret; falls back to the passcode. */
function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || getAdminPasscode();
}

function toB64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64Url(s: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(s, "base64url"));
  }
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sign(secret: string, data: string): Promise<Uint8Array> {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createAdminSession(): Promise<string | null> {
  const secret = getSecret();
  if (!secret) return null;
  const payload = toB64Url(
    enc.encode(JSON.stringify({ sub: "platform_admin", exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SEC }))
  );
  const sig = toB64Url(await sign(secret, payload));
  return `${payload}.${sig}`;
}

export async function verifyAdminSession(token: string | undefined | null): Promise<boolean> {
  try {
    const secret = getSecret();
    if (!secret || !token) return false;
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const expected = await sign(secret, payload);
    if (!safeEqual(expected, fromB64Url(sig))) return false;
    const data = JSON.parse(new TextDecoder().decode(fromB64Url(payload)));
    return data?.sub === "platform_admin" && typeof data.exp === "number" && data.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

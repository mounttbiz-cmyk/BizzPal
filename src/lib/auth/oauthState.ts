import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

function stateSecret(): string {
  return (
    process.env.USER_SESSION_SECRET ||
    process.env.SECRETS_KEY ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.SUPERADMIN_PASSCODE ||
    "bizzpal-local-dev-oauth-state"
  ).trim();
}

export function safeReturnTo(raw: unknown, fallback = "/integrations"): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") && !/[\r\n'"<>]/.test(s)) {
    return s;
  }
  return fallback;
}

export function escapeHtml(raw: unknown): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function signOAuthState(payload: Record<string, unknown>): string {
  const data = {
    ...payload,
    returnTo: safeReturnTo(payload.returnTo),
    nonce: randomBytes(12).toString("hex"),
    exp: Date.now() + 15 * 60 * 1000,
  };
  const body = Buffer.from(JSON.stringify(data), "utf8").toString("base64url");
  const sig = createHmac("sha256", `oauth-state-v1:${stateSecret()}`).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyOAuthState(raw: string | null): Record<string, any> | null {
  if (!raw || !raw.includes(".")) return null;
  const [body, sig] = raw.split(".", 2);
  if (!body || !sig) return null;
  const expected = createHmac("sha256", `oauth-state-v1:${stateSecret()}`).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    parsed.returnTo = safeReturnTo(parsed.returnTo);
    return parsed;
  } catch {
    return null;
  }
}

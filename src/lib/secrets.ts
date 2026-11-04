import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Encrypts third-party credentials (e.g. a customer's Razorpay key) before they touch the database.
 * AES-256-GCM, key derived from SECRETS_KEY (preferred) or ADMIN_SESSION_SECRET / SUPERADMIN_PASSCODE.
 *
 * In production a key MUST be configured, otherwise we refuse to store credentials at all
 * (we never fall back to plain text). In local development a fixed dev key is used so the flow can be
 * tried without setup; it is not secret and must not be relied on.
 */

const DEV_KEY = "bizzpal-local-development-key-not-secret";

function keyMaterial(): string | null {
  const configured = process.env.SECRETS_KEY || process.env.ADMIN_SESSION_SECRET || process.env.SUPERADMIN_PASSCODE;
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return DEV_KEY;
  return null;
}

export function secretsConfigured(): boolean {
  return keyMaterial() !== null;
}

function key(): Buffer {
  const m = keyMaterial();
  if (!m) throw new Error("SECRETS_NOT_CONFIGURED");
  return createHash("sha256").update("bizzpal-secrets-v1:" + m).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(blob: string): string {
  const [v, iv, tag, data] = blob.split(".");
  if (v !== "v1" || !iv || !tag || !data) throw new Error("Bad secret format");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(data, "base64")), d.final()]).toString("utf8");
}

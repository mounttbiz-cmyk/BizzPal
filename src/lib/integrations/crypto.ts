import { encryptSecret, decryptSecret, secretsConfigured } from "@/lib/secrets";

/**
 * Safely encrypts a secret with fallbacks.
 * Uses AES-256-GCM from secrets.ts.
 */
export function safeEncrypt(val: string): string {
  if (!val) return "";
  if (!secretsConfigured()) {
    // Never store a connection token in plain text. Set SECRETS_KEY (or ADMIN_SESSION_SECRET) on the server.
    throw new Error("The server is missing SECRETS_KEY, so the connection cannot be stored safely.");
  }
  return encryptSecret(val);
}

/**
 * Safely decrypts a secret with fallbacks.
 */
export function safeDecrypt(val: string): string {
  if (!val) return "";
  try {
    return decryptSecret(val);
  } catch (err) {
    // Never return raw ciphertext if it is formatted as an encrypted v1 secret
    if (val.startsWith("v1.")) {
      console.warn("[crypto] Could not decrypt stored secret.");
      return "";
    }
    return val;
  }
}


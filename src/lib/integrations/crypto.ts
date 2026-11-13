import { encryptSecret, decryptSecret, secretsConfigured } from "@/lib/secrets";

/**
 * Safely encrypts a secret with fallbacks.
 * Uses AES-256-GCM from secrets.ts.
 */
export function safeEncrypt(val: string): string {
  if (!val) return "";
  try {
    return encryptSecret(val);
  } catch (err) {
    return val;
  }
}

/**
 * Safely decrypts a secret with fallbacks.
 */
export function safeDecrypt(val: string): string {
  if (!val) return "";
  try {
    return decryptSecret(val);
  } catch (err) {
    return val;
  }
}

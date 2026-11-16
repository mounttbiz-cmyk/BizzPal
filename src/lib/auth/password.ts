/**
 * Password hashing with scrypt (built into Node, no extra package).
 * Stored as: scrypt$N$r$p$<salt base64>$<hash base64>
 */
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;

export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`;
  if (pw.length > 200) return "Password is too long.";
  return null;
}

export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, KEYLEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(pw: string, stored: string | null | undefined): boolean {
  try {
    if (!stored) return false;
    const [scheme, n, r, p, salt, hash] = stored.split("$");
    if (scheme !== "scrypt" || !salt || !hash) return false;
    const expected = Buffer.from(hash, "base64");
    const actual = scryptSync(pw, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Burns about the same time as a real check, so "no such account" and "wrong password" take equally long. */
export function dummyVerify(pw: string) {
  verifyPassword(pw, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(KEYLEN).toString("base64"));
}

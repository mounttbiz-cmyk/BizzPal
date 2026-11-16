/**
 * Checks a Firebase ID token on the server, without any service account: the token is a JWT signed by Google,
 * and Google publishes the matching public certificates.
 */
import { createVerify, X509Certificate } from "node:crypto";

const CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let certCache: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getCerts(): Promise<Record<string, string>> {
  if (certCache && certCache.expiresAt > Date.now()) return certCache.certs;
  const res = await fetch(CERTS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load Google's sign-in certificates.");
  const certs = (await res.json()) as Record<string, string>;
  const maxAge = /max-age=(\d+)/.exec(res.headers.get("cache-control") || "");
  certCache = { certs, expiresAt: Date.now() + (maxAge ? Number(maxAge[1]) : 3600) * 1000 };
  return certs;
}

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  signInProvider: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase is not configured on the server.");

  const parts = String(idToken || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid token.");
  const [h, p, s] = parts;

  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8"));
  const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
  if (header.alg !== "RS256" || !header.kid) throw new Error("Invalid token.");

  const certs = await getCerts();
  const pem = certs[header.kid];
  if (!pem) throw new Error("Unknown token key.");

  const ok = createVerify("RSA-SHA256")
    .update(`${h}.${p}`)
    .verify(new X509Certificate(pem).publicKey, Buffer.from(s, "base64url"));
  if (!ok) throw new Error("Invalid token signature.");

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) throw new Error("Token is for a different project.");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Token issuer is wrong.");
  if (typeof payload.exp !== "number" || payload.exp <= now) throw new Error("Token has expired.");
  if (typeof payload.iat !== "number" || payload.iat > now + 300) throw new Error("Token is not valid yet.");
  if (!payload.sub || typeof payload.sub !== "string") throw new Error("Token has no user.");
  if (!payload.email || typeof payload.email !== "string") throw new Error("Token has no email.");

  return {
    uid: payload.sub,
    email: String(payload.email).trim().toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    signInProvider: String(payload.firebase?.sign_in_provider || "password"),
  };
}

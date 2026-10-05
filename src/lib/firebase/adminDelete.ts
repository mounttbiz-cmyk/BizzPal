import "server-only";
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Server-side removal of a user from Firebase (Auth account + Firestore docs).
 * Needs a service account in FIREBASE_SERVICE_ACCOUNT (the full JSON key, raw or base64).
 * Without it nothing can be deleted from Firebase, and the result says so.
 */

export interface FirebaseDeleteResult {
  configured: boolean;
  authDeleted: boolean;
  docsDeleted: string[];
  errors: string[];
}

function loadServiceAccount(): Record<string, any> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const text = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(text);
    if (typeof sa.private_key === "string") sa.private_key = sa.private_key.replace(/\n/g, "\n");
    return sa;
  } catch {
    return null;
  }
}

function getAdminApp(): App | null {
  if (getApps().length) return getApps()[0];
  const sa = loadServiceAccount();
  if (!sa) return null;
  return initializeApp({ credential: cert(sa) });
}

export async function deleteUserFromFirebase(email: string, uid?: string | null): Promise<FirebaseDeleteResult> {
  const result: FirebaseDeleteResult = { configured: false, authDeleted: false, docsDeleted: [], errors: [] };
  const app = getAdminApp();
  if (!app) return result;
  result.configured = true;

  const cleanEmail = email.trim().toLowerCase();
  const bizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const auth = getAuth(app);
  const fs = getFirestore(app);

  // Auth account: look up by email (authoritative), fall back to the stored uid.
  let authUid: string | null = null;
  try {
    authUid = (await auth.getUserByEmail(cleanEmail)).uid;
  } catch (err: any) {
    if (err?.code !== "auth/user-not-found") result.errors.push(`auth lookup: ${err.message}`);
    authUid = uid || null;
  }
  if (authUid) {
    try {
      await auth.deleteUser(authUid);
      result.authDeleted = true;
    } catch (err: any) {
      if (err?.code === "auth/user-not-found") result.authDeleted = true;
      else result.errors.push(`auth delete: ${err.message}`);
    }
  }

  const targets = [`user_profiles/${cleanEmail}`, `business_tenants/${bizId}`];
  if (authUid) targets.push(`users/${authUid}`);
  if (uid && uid !== authUid) targets.push(`users/${uid}`);
  for (const path of targets) {
    try {
      await fs.doc(path).delete();
      result.docsDeleted.push(path);
    } catch (err: any) {
      result.errors.push(`${path}: ${err.message}`);
    }
  }
  return result;
}

"use client";

/**
 * Keeps the browser's server session (the signed cookie) in step with the Firebase sign-in.
 * The cookie is what every customer API trusts; local storage alone proves nothing to the server.
 */
import type { User } from "firebase/auth";
import { auth, isFirebaseConfigured } from "./config";

export interface SessionResult {
  ok: boolean;
  error?: string;
}

/** Sends the Firebase ID token to the server, which checks it and sets the session cookie. */
export async function startServerSession(user: User | null): Promise<SessionResult> {
  if (!user) return { ok: false, error: "Not signed in." };
  try {
    const idToken = await user.getIdToken();
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error || "We could not verify your sign-in." };
  } catch {
    return { ok: false, error: "We could not reach the server. Please try again." };
  }
}

export async function hasServerSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/** True when the browser has a valid server session, creating one from a Firebase sign-in if needed. */
export async function ensureServerSession(): Promise<boolean> {
  if (await hasServerSession()) return true;
  if (!auth || !isFirebaseConfigured) return false;
  try {
    await (auth as any).authStateReady?.();
  } catch {}
  if (!auth.currentUser) return false;
  return (await startServerSession(auth.currentUser)).ok;
}

export async function endServerSession(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {}
}

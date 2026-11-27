"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { claimBrowserFor, forgetBrowserOwner } from "@/lib/auth/localData";

/** The signed-in customer, as the server sees them. */
export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<AuthUser>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithEmail: async () => {
    throw new Error("Not ready");
  },
  signUpWithEmail: async () => {
    throw new Error("Not ready");
  },
  logout: async () => {},
});

/** Error thrown by sign-in / sign-up, with a short code the login page can react to. */
export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function postJson(url: string, body: any): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new AuthError("network", "Could not reach the server. Please check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new AuthError(data.code || "failed", data.error || "Something went wrong. Please try again.");
  }
  return data;
}

function toUser(email: string, name?: string): AuthUser {
  return { uid: `usr_${email}`, email, displayName: name || email.split("@")[0] };
}

function rememberSession(user: AuthUser, provider: string) {
  try {
    localStorage.setItem(
      "bizzpal_user_session",
      JSON.stringify({ id: user.uid, email: user.email, name: user.displayName, provider, authenticatedAt: new Date().toISOString() })
    );
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Ask the server who is signed in. Local storage is only a cache of that answer.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return;
        if (d?.authenticated) {
          claimBrowserFor(d.email, d.activeBusinessId);
          const u = toUser(d.email, d.name);
          setUser(u);
          rememberSession(u, d.provider || "email");
        } else {
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const d = await postJson("/api/auth/login", { email, password });
    claimBrowserFor(d.email);
    const u = toUser(d.email, d.name);
    setUser(u);
    return u;
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    const d = await postJson("/api/auth/register", { email, password, name });
    claimBrowserFor(d.email);
    const u = toUser(d.email, d.name);
    setUser(u);
    return u;
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {}
    try {
      localStorage.removeItem("bizzpal_user_session");
    } catch {}
    forgetBrowserOwner();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signInWithEmail, signUpWithEmail, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

// ---- small helpers for code that is not a React component ----
export async function hasServerSession(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/** Who the server says is signed in, and which company they are working in. Null when nobody is. */
export async function getServerSession(): Promise<{
  email: string;
  name?: string | null;
  provider?: string | null;
  activeBusinessId: string | null;
} | null> {
  try {
    const res = await fetch("/api/auth/session", { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    return d?.authenticated && d.email
      ? {
          email: String(d.email),
          name: d.name || null,
          provider: d.provider || null,
          activeBusinessId: d.activeBusinessId || null,
        }
      : null;
  } catch {
    return null;
  }
}

/** The email the server says is signed in, or null when nobody is. */
export async function getServerSessionEmail(): Promise<string | null> {
  return (await getServerSession())?.email ?? null;
}

export async function endServerSession(): Promise<void> {
  try {
    await fetch("/api/auth/session", { method: "DELETE" });
  } catch {}
}

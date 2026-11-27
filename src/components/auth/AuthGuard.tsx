"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getServerSession } from "@/lib/auth/authContext";
import { claimBrowserFor } from "@/lib/auth/localData";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The server session cookie is the source of truth; verify before touching local cache.
        const server = await getServerSession();
        const serverEmail = server?.email || null;
        if (cancelled) return;
        if (!serverEmail) {
          localStorage.removeItem("bizzpal_user_session");
          router.replace("/login");
          return;
        }

        // Synchronize client cache for this browser from the verified server session
        claimBrowserFor(serverEmail, server?.activeBusinessId);
        try {
          const existingRaw = localStorage.getItem("bizzpal_user_session");
          const existing = existingRaw ? JSON.parse(existingRaw) : {};
          localStorage.setItem(
            "bizzpal_user_session",
            JSON.stringify({
              ...existing,
              id: existing?.id || `usr_${serverEmail}`,
              email: serverEmail,
              name: server?.name || existing?.name || serverEmail.split("@")[0],
              provider: server?.provider || existing?.provider || "email",
            })
          );
        } catch {}

        setChecked(true);
        const email = serverEmail;
        if (email) {
          const sessionRecordedKey = `bizzpal_session_recorded_${email}`;
          const lastRec = sessionStorage.getItem(sessionRecordedKey);
          if (!lastRec) {
            sessionStorage.setItem(sessionRecordedKey, new Date().toISOString());
            fetch("/api/auth/account-status", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, action: "login", lastLoginAt: new Date().toISOString() }),
            }).catch(() => {});
          }
        }
      } catch {
        router.replace("/login");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-brass border-t-transparent rounded-full animate-spin" />
          <span>Verifying authentication…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

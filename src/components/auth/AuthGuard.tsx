"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getServerSessionEmail } from "@/lib/auth/authContext";
import { claimBrowserFor } from "@/lib/auth/localData";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = localStorage.getItem("bizzpal_user_session");
        const parsed = session ? JSON.parse(session) : null;
        if (!parsed || !(parsed.email || parsed.uid || parsed.id)) {
          router.replace("/login");
          return;
        }

        // The server has to agree that this browser is signed in. The copy in local storage proves nothing.
        const serverEmail = await getServerSessionEmail();
        if (cancelled) return;
        if (!serverEmail) {
          localStorage.removeItem("bizzpal_user_session");
          router.replace("/login");
          return;
        }

        // Anything saved in this browser for a different account is thrown away before the app reads it
        claimBrowserFor(serverEmail);
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

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureServerSession } from "@/lib/firebase/serverSession";

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
        const ok = await ensureServerSession();
        if (cancelled) return;
        if (!ok) {
          localStorage.removeItem("bizzpal_user_session");
          router.replace("/login");
          return;
        }

        setChecked(true);
        const email = parsed.email;
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

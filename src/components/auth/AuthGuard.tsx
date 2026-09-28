"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const session = localStorage.getItem("bizzpal_user_session");
      if (session) {
        const parsed = JSON.parse(session);
        if (parsed && (parsed.email || parsed.uid || parsed.id)) {
          setChecked(true);
          return;
        }
      }

      // No active authenticated user session -> redirect immediately to /login
      router.replace("/login");
    } catch {
      router.replace("/login");
    }
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

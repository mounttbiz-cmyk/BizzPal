"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    try {
      const session = localStorage.getItem("bizzpal_user_session");
      const profile = localStorage.getItem("bizzpal_business_profile");

      if (session) {
        setChecked(true);
      } else if (profile) {
        // Auto-heal/restore user session from existing business profile
        const p = JSON.parse(profile);
        const autoSession = {
          id: `usr_${Date.now()}`,
          email: p.website ? `founder@${p.website.replace(/^https?:\/\//, "")}` : "founder@mycompany.in",
          name: p.founderName || "Founder",
          role: "owner",
          provider: "email",
          authenticatedAt: new Date().toISOString(),
        };
        localStorage.setItem("bizzpal_user_session", JSON.stringify(autoSession));
        setChecked(true);
      } else {
        const hasExplicitLoggedOut = typeof window !== "undefined" && sessionStorage.getItem("bizzpal_explicit_logout");
        if (hasExplicitLoggedOut) {
          router.replace("/login");
          return;
        }
        // Provision clean session so founders have immediate live access
        const newSession = {
          id: `usr_${Date.now()}`,
          email: "founder@mycompany.in",
          name: "Founder",
          role: "owner",
          provider: "email",
          authenticatedAt: new Date().toISOString(),
        };
        localStorage.setItem("bizzpal_user_session", JSON.stringify(newSession));
        setChecked(true);
      }
    } catch (e) {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-xs text-text-muted">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading BizzPal…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

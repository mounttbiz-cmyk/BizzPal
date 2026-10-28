"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { resolveTenantConfig } from "@/config/resolver";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [businessProfile, setBusinessProfile] = useState<{
    name: string;
    industry: string;
    industryLabel: string;
  }>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("bizzpal_business_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          return {
            name: parsed.name || "BizzPal Enterprise",
            industry: parsed.industry || "saas",
            industryLabel: parsed.industryLabel || "Technology & Enterprise Services",
          };
        }
      } catch {}
    }
    return {
      name: "BizzPal Enterprise",
      industry: "saas",
      industryLabel: "Technology & Enterprise Services",
    };
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const stored = localStorage.getItem("bizzpal_business_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          setBusinessProfile({
            name: parsed.name || "BizzPal Enterprise",
            industry: parsed.industry || "saas",
            industryLabel: parsed.industryLabel || "Technology & Enterprise Services",
          });
        }
      } catch {}
    };

    window.addEventListener("bizzpal_profile_updated", handleProfileUpdate);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("bizzpal_profile_updated", handleProfileUpdate);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const config = resolveTenantConfig({
    industry: (businessProfile.industry as any) || "saas",
    businessModel: "subscription",
    plan: "growth",
  });

  return (
    <AuthGuard>
      <AppShell
        navItems={config.nav}
        companyName={businessProfile.name}
        industry={businessProfile.industryLabel}
      >
        {children}
      </AppShell>
    </AuthGuard>
  );
}


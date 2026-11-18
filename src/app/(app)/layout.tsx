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
          const cleanName = (parsed.name && parsed.name.startsWith("GSTIN ") && (parsed.tradeName || parsed.legalName))
            ? (parsed.tradeName || parsed.legalName)
            : parsed.name;
          return {
            name: cleanName || "",
            industry: parsed.industry || "",
            industryLabel: parsed.industryLabel || "",
          };
        }
      } catch {}
    }
    return {
      name: "",
      industry: "",
      industryLabel: "",
    };
  });

  useEffect(() => {
    const handleProfileUpdate = () => {
      try {
        const stored = localStorage.getItem("bizzpal_business_profile");
        if (stored) {
          const parsed = JSON.parse(stored);
          const cleanName = (parsed.name && parsed.name.startsWith("GSTIN ") && (parsed.tradeName || parsed.legalName))
            ? (parsed.tradeName || parsed.legalName)
            : parsed.name;
          setBusinessProfile({
            name: cleanName || "",
            industry: parsed.industry || "",
            industryLabel: parsed.industryLabel || "",
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


"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { resolveTenantConfig } from "@/config/resolver";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { plan } = usePlanAccess();
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

    const refreshFromServer = () => {
      fetch("/api/business/intake", { cache: "no-store" })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (d?.success && d.business) {
            const b = d.business;
            const cleanName = (b.name && b.name.startsWith("GSTIN ") && (b.tradeName || b.legalName))
              ? (b.tradeName || b.legalName)
              : b.name;
            setBusinessProfile({
              name: cleanName || "",
              industry: b.industry || "",
              industryLabel: b.industryLabel || b.industry || "",
            });
            try {
              localStorage.setItem("bizzpal_business_profile", JSON.stringify(b));
            } catch {}
          }
        })
        .catch(() => {});
    };

    refreshFromServer();
    window.addEventListener("bizzpal_profile_updated", handleProfileUpdate);
    window.addEventListener("bizzpal_business_data_updated", refreshFromServer);
    window.addEventListener("storage", handleProfileUpdate);
    return () => {
      window.removeEventListener("bizzpal_profile_updated", handleProfileUpdate);
      window.removeEventListener("bizzpal_business_data_updated", refreshFromServer);
      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  const config = resolveTenantConfig({
    industry: (businessProfile.industry as any) || "saas",
    businessModel: "subscription",
    plan: (plan as any) || "free",
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


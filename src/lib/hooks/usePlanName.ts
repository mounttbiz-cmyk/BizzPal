"use client";

import { useEffect, useState } from "react";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";

const FALLBACK_NAMES: Record<string, string> = {
  free: "Starter Free",
  starter: "Starter OS",
  growth: "Growth Plan",
  enterprise: "Enterprise",
};

/** The display name of the signed-in business's current plan, read from the plans set up in Admin → Pricing. */
export function usePlanName(): string {
  const { plan } = usePlanAccess();
  const [name, setName] = useState("Your plan");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bizzpal_subscription_plans");
      if (raw) {
        const parsed = JSON.parse(raw);
        const match = Array.isArray(parsed) ? parsed.find((p: any) => p.id === plan) : null;
        if (match?.name) {
          const cleaned = String(match.name).replace(/\s*\/\s*Demo/gi, "").replace(/Demo/gi, "").trim();
          setName(cleaned || FALLBACK_NAMES[plan] || "Your plan");
          return;
        }
      }
    } catch {}
    setName(FALLBACK_NAMES[plan] || "Your plan");
  }, [plan]);

  return name;
}

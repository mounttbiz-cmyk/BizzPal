"use client";

export type DataPalPlanTier = "free" | "starter" | "growth" | "enterprise";

export interface DataPalCreditStatus {
  planTier: DataPalPlanTier;
  baseQuota: number;
  usedData: number;
  addonCredits: number;
  totalAllowed: number;
  remainingData: number;
  // Aliases for backwards compatibility
  usedLeads: number;
  remainingQuota: number;
}

export interface PayAsYouGoPack {
  id: string;
  dataCount: number;
  priceINR: number;
  popular?: boolean;
  ratePerData?: string;
  isCustom?: boolean;
}

export const PAY_AS_YOU_GO_PACKS: PayAsYouGoPack[] = [
  {
    id: "pack_100",
    dataCount: 100,
    priceINR: 199,
    ratePerData: "₹1.99 / data",
  },
  {
    id: "pack_500",
    dataCount: 500,
    priceINR: 499,
    popular: true,
    ratePerData: "₹0.99 / data (Save 50%)",
  },
  {
    id: "pack_1500",
    dataCount: 1500,
    priceINR: 999,
    ratePerData: "₹0.66 / data (Save 67%)",
  },
  {
    id: "pack_custom",
    dataCount: 2000,
    priceINR: 1299,
    isCustom: true,
    ratePerData: "₹0.65 / data (Flexible)",
  },
];

export const PLAN_LIMITS: Record<DataPalPlanTier, number> = {
  free: 50,
  starter: 200,
  growth: 1000,
  enterprise: 5000,
};

export function getAccountKey(): string {
  if (typeof window === "undefined") return "guest";
  try {
    const raw = localStorage.getItem("bizzpal_user_session");
    if (raw) {
      const sess = JSON.parse(raw);
      if (sess?.email) return sess.email.trim().toLowerCase();
      if (sess?.id) return String(sess.id);
    }
  } catch {}
  return "guest";
}

export function getEffectivePlanTier(accountKey?: string): DataPalPlanTier {
  if (typeof window === "undefined") return "free";
  const key = accountKey || getAccountKey();
  try {
    // 1. Check datapal explicit override if set
    const explicit = localStorage.getItem(`bizzpal_datapal_tier_${key}`);
    if (explicit && (explicit in PLAN_LIMITS)) {
      return explicit as DataPalPlanTier;
    }
    // 2. Check subscription plan storage
    const subPlan = localStorage.getItem(`bizzpal_subscription_plan_${key}`) || localStorage.getItem("bizzpal_subscription_plan");
    if (subPlan) {
      const lower = subPlan.toLowerCase().trim();
      if (lower.includes("growth")) return "growth";
      if (lower.includes("starter")) return "starter";
      if (lower.includes("enterprise")) return "enterprise";
      if (lower.includes("free")) return "free";
    }
  } catch {}
  return "starter"; // Generous sensible default
}

export function setExplicitPlanTier(tier: DataPalPlanTier, accountKey?: string): void {
  if (typeof window === "undefined") return;
  const key = accountKey || getAccountKey();
  try {
    localStorage.setItem(`bizzpal_datapal_tier_${key}`, tier);
    window.dispatchEvent(new Event("bizzpal_datapal_credits_updated"));
  } catch {}
}

export function getDataPalCreditStatus(accountKey?: string): DataPalCreditStatus {
  const key = accountKey || getAccountKey();
  const planTier = getEffectivePlanTier(key);
  const baseQuota = PLAN_LIMITS[planTier] || 200;

  let usedLeads = 0;
  let addonCredits = 0;

  if (typeof window !== "undefined") {
    try {
      const storedUsed = localStorage.getItem(`bizzpal_datapal_usage_${key}`);
      if (storedUsed) usedLeads = Math.max(0, parseInt(storedUsed, 10) || 0);

      const storedAddon = localStorage.getItem(`bizzpal_datapal_addon_${key}`);
      if (storedAddon) addonCredits = Math.max(0, parseInt(storedAddon, 10) || 0);
    } catch {}
  }

  const totalAllowed = baseQuota + addonCredits;
  const remainingQuota = Math.max(0, totalAllowed - usedLeads);

  return {
    planTier,
    baseQuota,
    usedData: usedLeads,
    addonCredits,
    totalAllowed,
    remainingData: remainingQuota,
    usedLeads,
    remainingQuota,
  };
}

export function recordCreditUsage(count: number, accountKey?: string): DataPalCreditStatus {
  const key = accountKey || getAccountKey();
  const current = getDataPalCreditStatus(key);
  const newUsed = current.usedLeads + count;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`bizzpal_datapal_usage_${key}`, String(newUsed));
      window.dispatchEvent(new Event("bizzpal_datapal_credits_updated"));
    } catch {}
  }

  return getDataPalCreditStatus(key);
}

export function addPayAsYouGoCredits(amount: number, accountKey?: string): DataPalCreditStatus {
  const key = accountKey || getAccountKey();
  const current = getDataPalCreditStatus(key);
  const newAddon = current.addonCredits + amount;

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`bizzpal_datapal_addon_${key}`, String(newAddon));
      window.dispatchEvent(new Event("bizzpal_datapal_credits_updated"));
    } catch {}
  }

  return getDataPalCreditStatus(key);
}

// -------------------------------------------------------------
// DEDUPLICATION ENGINE: Zero duplicate leads across searches
// -------------------------------------------------------------

export function makeLeadSignature(lead: {
  name: string;
  city?: string;
  phone?: string | null;
  website?: string | null;
}): string {
  const normName = lead.name.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const normCity = (lead.city || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const normPhone = (lead.phone || "").replace(/[^0-9]/g, "").slice(-10);

  // If phone exists, phone is the strongest identifier
  if (normPhone && normPhone.length >= 8) {
    return `ph_${normPhone}`;
  }
  // Otherwise name + city
  return `nc_${normName}_${normCity}`;
}

export function getSeenLeadSignatures(accountKey?: string): Set<string> {
  const set = new Set<string>();
  if (typeof window === "undefined") return set;
  const key = accountKey || getAccountKey();
  try {
    const raw = localStorage.getItem(`bizzpal_datapal_seen_leads_${key}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(item => set.add(item));
      }
    }
  } catch {}
  return set;
}

export function recordSeenLeadSignatures(signatures: string[], accountKey?: string): void {
  if (typeof window === "undefined" || signatures.length === 0) return;
  const key = accountKey || getAccountKey();
  try {
    const current = getSeenLeadSignatures(key);
    signatures.forEach(s => current.add(s));
    localStorage.setItem(
      `bizzpal_datapal_seen_leads_${key}`,
      JSON.stringify(Array.from(current))
    );
  } catch {}
}

export function clearSeenLeadsRegistry(accountKey?: string): void {
  if (typeof window === "undefined") return;
  const key = accountKey || getAccountKey();
  try {
    localStorage.removeItem(`bizzpal_datapal_seen_leads_${key}`);
    localStorage.removeItem(`bizzpal_datapal_usage_${key}`);
    window.dispatchEvent(new Event("bizzpal_datapal_credits_updated"));
  } catch {}
}


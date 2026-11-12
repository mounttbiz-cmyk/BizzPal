"use client";

import type { DataPalPlanTier } from "./plans";
export type { DataPalPlanTier } from "./plans";

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

/** Reads this account's credits from the server (the only place balances are stored). */
export async function fetchDataPalCredits(accountKey?: string): Promise<DataPalCreditStatus | null> {
  const key = accountKey || getAccountKey();
  try {
    const res = await fetch(`/api/datapal/credits?email=${encodeURIComponent(key)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const j = await res.json();
    return j.status || null;
  } catch {
    return null;
  }
}

export const EMPTY_CREDIT_STATUS: DataPalCreditStatus = {
  planTier: "free",
  baseQuota: 0,
  usedData: 0,
  addonCredits: 0,
  totalAllowed: 0,
  remainingData: 0,
  usedLeads: 0,
  remainingQuota: 0,
};

// -------------------------------------------------------------
// DEDUPLICATION ENGINE: Zero duplicate leads across searches
// -------------------------------------------------------------

import { makeLeadSignature } from "./signature";
export { makeLeadSignature };

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
    window.dispatchEvent(new Event("bizzpal_datapal_credits_updated"));
  } catch {}
}


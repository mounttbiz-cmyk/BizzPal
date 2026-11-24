"use client";

import { useCallback, useEffect, useState } from "react";
import { clearWorkspaceData } from "@/lib/auth/localData";

/** The signed-in person's group, as the server sees it. */

export interface Segment {
  id: string;
  name: string;
  sortOrder: number;
}

export interface Company {
  id: string;
  name: string;
  segmentId: string | null;
  parentId: string | null;
  industry: string;
  industryLabel: string;
  website: string;
  logoUrl: string | null;
  teamSize: number | null;
  monthlyRevenue: number | null;
  monthlyBurn: number | null;
  cashOnHand: number | null;
  openTasks: number;
  sortOrder: number;
  createdAt: string;
}

export interface GroupData {
  group: { id: string; name: string; industryLabel: string; logoUrl: string | null };
  segments: Segment[];
  companies: Company[];
  activeBusinessId: string;
  canManage: boolean;
}

const CHANGED = "bizzpal_companies_updated";
let cache: GroupData | null = null;
let inflight: Promise<GroupData | null> | null = null;

async function load(force = false): Promise<GroupData | null> {
  if (cache && !force) return cache;
  if (inflight && !force) return inflight;
  inflight = fetch("/api/companies", { cache: "no-store" })
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      cache = d?.success ? (d as GroupData) : null;
      return cache;
    })
    .catch(() => cache)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Tells every open view to reload the group (after a company or category was added, changed or removed). */
export function notifyCompaniesChanged() {
  cache = null;
  window.dispatchEvent(new Event(CHANGED));
}

export function useCompanies() {
  const [data, setData] = useState<GroupData | null>(cache);
  const [loading, setLoading] = useState(!cache);

  const refresh = useCallback(async (force = true) => {
    setLoading(true);
    const d = await load(force);
    setData(d);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh(false);
    const onChange = () => refresh(true);
    window.addEventListener(CHANGED, onChange);
    return () => window.removeEventListener(CHANGED, onChange);
  }, [refresh]);

  return { data, loading, refresh };
}

/**
 * Opens another company of the group (or the group itself). Everything the browser saved belongs to the company
 * being left, so it is cleared and the app reloads on the new company's dashboard.
 */
export async function switchCompany(businessId: string, goTo = "/dashboard"): Promise<string | null> {
  try {
    const res = await fetch("/api/companies/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.success) return d.error || "Could not open that company.";
  } catch {
    return "Could not reach the server. Please check your connection.";
  }
  clearWorkspaceData();
  cache = null;
  window.location.assign(goTo);
  return null;
}

/** Companies in display order: each one followed by the companies under it. */
export function orderedTree(companies: Company[], within: Company[] = companies): Array<{ company: Company; depth: number }> {
  const ids = new Set(within.map(c => c.id));
  const byParent = new Map<string | null, Company[]>();
  for (const c of within) {
    const key = c.parentId && ids.has(c.parentId) ? c.parentId : null;
    byParent.set(key, [...(byParent.get(key) || []), c]);
  }
  const out: Array<{ company: Company; depth: number }> = [];
  const walk = (parent: string | null, depth: number) => {
    for (const c of byParent.get(parent) || []) {
      out.push({ company: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/** Indian-style short amounts: ₹4.2 Cr, ₹18.5L, ₹92,000. */
export function formatAmount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2).replace(/\.?0+$/, "")}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(w => /[A-Za-z0-9]/.test(w[0] || ""))
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "•"
  );
}

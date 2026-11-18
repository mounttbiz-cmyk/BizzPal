"use client";

import { useEffect } from "react";

export const BUSINESS_DATA_UPDATED_EVENT = "bizzpal_business_data_updated";

export function emitBusinessDataUpdated(metrics: any) {
  if (typeof window === "undefined") return;

  // 1. Sync to local storage business profile
  try {
    const existingStr = localStorage.getItem("bizzpal_business_profile");
    const existing = existingStr ? JSON.parse(existingStr) : {};

    const updatedProfile = {
      ...existing,
      name: metrics.name || existing.name || "",
      industry: metrics.industry || existing.industry || "",
      industryLabel: metrics.industryLabel || existing.industryLabel || "",
      founderName: metrics.founderName || existing.founderName || "",
      revenue: metrics.monthlyRevenue ?? existing.revenue ?? 0,
      annualRevenue: metrics.annualRevenue ?? existing.annualRevenue ?? 0,
      burn: metrics.monthlyBurn ?? existing.burn ?? 0,
      cash: metrics.cashOnHand ?? existing.cash ?? 0,
      cashOnHand: metrics.cashOnHand ?? existing.cashOnHand ?? 0,
      monthlyNetBurn: metrics.monthlyBurn ?? existing.monthlyNetBurn ?? 0,
      teamSize: metrics.teamSize ?? existing.teamSize ?? 1,
      grossMargin: metrics.grossMargin ?? existing.grossMargin ?? 0,
      trend: metrics.trend || existing.trend,
      isUploadedData: true,
      lastUploadedAt: new Date().toISOString(),
      sourceFileName: metrics.sourceFileName || "uploaded_data.csv",
    };

    localStorage.setItem("bizzpal_business_profile", JSON.stringify(updatedProfile));
  } catch (e) {
    console.error("Failed to update localStorage business profile:", e);
  }

  // 2. Dispatch custom window event
  window.dispatchEvent(
    new CustomEvent(BUSINESS_DATA_UPDATED_EVENT, {
      detail: metrics,
    })
  );
}

export function useBusinessDataSync(onUpdate: (metrics: any) => void) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (e: any) => {
      if (e.detail) {
        onUpdate(e.detail);
      }
    };

    const storageHandler = (e: StorageEvent) => {
      if (e.key === "bizzpal_business_profile" && e.newValue) {
        try {
          onUpdate(JSON.parse(e.newValue));
        } catch {}
      }
    };

    window.addEventListener(BUSINESS_DATA_UPDATED_EVENT, handler);
    window.addEventListener("storage", storageHandler);

    return () => {
      window.removeEventListener(BUSINESS_DATA_UPDATED_EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, [onUpdate]);
}

export function downloadFile(content: string, fileName: string, mimeType: string = "text/csv") {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

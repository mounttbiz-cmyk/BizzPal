"use client";

import { useState, useEffect } from "react";

export interface DataPalFeatureFlags {
  "datapal.pitchAngle.enabled": boolean;
  "datapal.advancedRules.enabled": boolean;
  "datapal.aiMatcher.enabled": boolean;
}

export const DEFAULT_DATAPAL_FEATURE_FLAGS: DataPalFeatureFlags = {
  "datapal.pitchAngle.enabled": false,
  "datapal.advancedRules.enabled": false,
  "datapal.aiMatcher.enabled": false,
};

const STORAGE_KEY = "bizzpal_datapal_feature_flags";
const EVENT_NAME = "bizzpal_datapal_flags_updated";
let serverFlagsLoaded = false;

export function getStoredFeatureFlags(): DataPalFeatureFlags {
  if (typeof window === "undefined") return DEFAULT_DATAPAL_FEATURE_FLAGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATAPAL_FEATURE_FLAGS;
    return {
      ...DEFAULT_DATAPAL_FEATURE_FLAGS,
      ...JSON.parse(raw),
    };
  } catch {
    return DEFAULT_DATAPAL_FEATURE_FLAGS;
  }
}

export function saveStoredFeatureFlags(flags: Partial<DataPalFeatureFlags>) {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredFeatureFlags();
    const updated = { ...current, ...flags };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (e) {
    console.error("Failed to save DataPal feature flags:", e);
  }
}

export async function syncFeatureFlagsFromServer(): Promise<DataPalFeatureFlags> {
  if (typeof window === "undefined") return DEFAULT_DATAPAL_FEATURE_FLAGS;
  try {
    const res = await fetch("/api/public/config", { cache: "no-store" });
    if (!res.ok) return getStoredFeatureFlags();
    const json = await res.json().catch(() => null);
    if (json?.datapalFlags && typeof json.datapalFlags === "object") {
      const merged = { ...DEFAULT_DATAPAL_FEATURE_FLAGS, ...json.datapalFlags };
      serverFlagsLoaded = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new Event(EVENT_NAME));
      return merged;
    }
  } catch {}
  return getStoredFeatureFlags();
}

export async function saveServerFeatureFlags(
  flags: DataPalFeatureFlags
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        section: "datapal_flags",
        payload: flags,
        note: "Updated DataPal feature flags",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return { ok: false, error: data?.error || `HTTP ${res.status}` };
    }
    saveStoredFeatureFlags(flags);
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || "Network error" };
  }
}

/**
 * Reactive React hook for reading a feature flag state (backed by server platform_config).
 */
export function useFeatureFlag(flagName: keyof DataPalFeatureFlags): boolean {
  const [enabled, setEnabled] = useState<boolean>(() => {
    return getStoredFeatureFlags()[flagName] ?? false;
  });

  useEffect(() => {
    const handleUpdate = () => {
      setEnabled(getStoredFeatureFlags()[flagName] ?? false);
    };

    handleUpdate();
    if (!serverFlagsLoaded) {
      syncFeatureFlagsFromServer();
    }
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [flagName]);

  return enabled;
}

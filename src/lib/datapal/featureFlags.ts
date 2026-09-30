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

/**
 * Reactive React hook for reading a feature flag state.
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
    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [flagName]);

  return enabled;
}

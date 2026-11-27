"use client";

/**
 * Shared client helper for per-tenant workspace state persisted in SQLite via /api/workspace/state.
 * Uses localStorage only as an instant offline hint and automatically migrates legacy local-only data on first load.
 */
export async function loadWorkspaceState<T>(
  scope: string,
  legacyLocalStorageKey?: string
): Promise<T | null> {
  try {
    const res = await fetch(`/api/workspace/state?scope=${encodeURIComponent(scope)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json?.success && json.data !== null && json.data !== undefined) {
        if (legacyLocalStorageKey && typeof window !== "undefined") {
          try {
            localStorage.setItem(legacyLocalStorageKey, JSON.stringify(json.data));
          } catch {}
        }
        return json.data as T;
      }
    }
  } catch {}

  if (legacyLocalStorageKey && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(legacyLocalStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as T;
        // One-time backfill into SQLite so it becomes available across devices
        saveWorkspaceState(scope, parsed, legacyLocalStorageKey).catch(() => {});
        return parsed;
      }
    } catch {}
  }

  return null;
}

export async function saveWorkspaceState<T>(
  scope: string,
  data: T,
  legacyLocalStorageKey?: string
): Promise<boolean> {
  if (legacyLocalStorageKey && typeof window !== "undefined") {
    try {
      localStorage.setItem(legacyLocalStorageKey, JSON.stringify(data));
    } catch {}
  }
  try {
    const res = await fetch(`/api/workspace/state?scope=${encodeURIComponent(scope)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, data }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type DataPalPlanTier = "free" | "starter" | "growth" | "enterprise";

/** Records per account that each plan includes. */
export const PLAN_LIMITS: Record<DataPalPlanTier, number> = {
  free: 50,
  starter: 200,
  growth: 1000,
  enterprise: 5000,
};

/** Works out the DataPal tier from a subscription's plan id or name. No plan means free. */
export function tierFromPlan(planIdOrName?: string | null): DataPalPlanTier {
  const lower = String(planIdOrName || "").toLowerCase();
  if (lower.includes("enterprise")) return "enterprise";
  if (lower.includes("growth")) return "growth";
  if (lower.includes("starter")) return "starter";
  return "free";
}

/** One-off top-up packs. Prices are decided here on the server, never taken from the browser. */
export interface DataPalPack {
  id: string;
  records: number;
  priceInr: number;
}

export const DATAPAL_PACKS: DataPalPack[] = [
  { id: "datapal_pack_100", records: 100, priceInr: 199 },
  { id: "datapal_pack_500", records: 500, priceInr: 499 },
  { id: "datapal_pack_1500", records: 1500, priceInr: 999 },
];

export const CUSTOM_PACK_MIN = 10;
export const CUSTOM_PACK_MAX = 50000;

export function customPackPrice(records: number): number {
  return Math.max(99, Math.round(records * 0.65));
}

/** Finds a pack by id. "datapal_pack_custom_<number>" is a custom amount. */
export function resolvePack(id: string): DataPalPack | null {
  const fixed = DATAPAL_PACKS.find(p => p.id === id);
  if (fixed) return fixed;
  const m = /^datapal_pack_custom_(\d+)$/.exec(String(id));
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < CUSTOM_PACK_MIN || n > CUSTOM_PACK_MAX) return null;
  return { id, records: n, priceInr: customPackPrice(n) };
}

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

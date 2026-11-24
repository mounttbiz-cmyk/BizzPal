"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/authContext";
import { isDemoAccount } from "@/lib/demoAccount";

export const PLAN_ORDER = ["free", "starter", "growth", "enterprise"] as const;
export type PlanId = string;

function getDynamicPlanOrder(): string[] {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("bizzpal_subscription_plans");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((p: any) => p.enabled !== false).map((p: any) => p.id);
        }
      }
    } catch {}
  }
  return [...PLAN_ORDER];
}

function isLocalEnvironment(): boolean {
  if (typeof window === "undefined") return true;
  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    process.env.NODE_ENV === "development"
  );
}

function planRank(planId: string | null | undefined): number {
  if (isLocalEnvironment()) return 999;
  if (!planId) return 0;
  const order = getDynamicPlanOrder();
  const idx = order.indexOf(planId);
  if (idx !== -1) return idx;
  const fallbackIdx = (PLAN_ORDER as readonly string[]).indexOf(planId);
  return fallbackIdx === -1 ? 0 : fallbackIdx;
}

function getCurrentUserEmail(userObj: any): string | null {
  if (userObj?.email) return userObj.email.trim().toLowerCase();
  if (typeof window !== "undefined") {
    try {
      const sess = localStorage.getItem("bizzpal_user_session");
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed?.email) return parsed.email.trim().toLowerCase();
      }
    } catch {}
  }
  return null;
}

/**
 * Resolves the current user's active subscription plan (from the server when signed in,
 * falling back to the isolated user-specific local cache, defaulting strictly to "free")
 * and exposes plan-gating helpers.
 */
export function usePlanAccess() {
  const { user } = useAuth();
  const [plan, setPlan] = useState<string>("free");
  const [hasActivated, setHasActivated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function resolvePlan() {
      setLoading(true);
      const email = getCurrentUserEmail(user);

      // Demo accounts are always granted the highest Enterprise plan
      if (isDemoAccount(email)) {
        if (!cancelled) {
          setPlan("enterprise");
          setHasActivated(true);
          try {
            localStorage.setItem("bizzpal_subscription_plan", "enterprise");
            if (email) localStorage.setItem(`bizzpal_subscription_plan_${email}`, "enterprise");
          } catch {}
          setLoading(false);
        }
        return;
      }

      try {
        if (user) {
          // The server knows what this customer has really paid for
          let remotePlan: string | null = null;
          try {
            const res = await fetch("/api/payments/transactions", { cache: "no-store" });
            if (res.ok) {
              const d = await res.json();
              if (d?.activeSubscription?.plan_id) {
                remotePlan = d.activeSubscription.plan_id;
              }
            }
          } catch {}
          if (!cancelled && remotePlan) {
            setPlan(remotePlan);
            setHasActivated(remotePlan !== "free");
            if (email) localStorage.setItem(`bizzpal_subscription_plan_${email}`, remotePlan);
            localStorage.setItem("bizzpal_subscription_plan", remotePlan);
            return;
          }
        }

        // Check user-specific storage key first
        if (email) {
          const userSpecificPlan = localStorage.getItem(`bizzpal_subscription_plan_${email}`);
          if (userSpecificPlan) {
            if (!cancelled) {
              setPlan(userSpecificPlan);
              setHasActivated(userSpecificPlan !== "free");
              localStorage.setItem("bizzpal_subscription_plan", userSpecificPlan);
            }
            return;
          }
        }

        // If no user-specific plan is found, default strictly to "free"
        if (!cancelled) {
          setPlan("free");
          setHasActivated(false);
          localStorage.setItem("bizzpal_subscription_plan", "free");
          if (email) localStorage.setItem(`bizzpal_subscription_plan_${email}`, "free");
        }
      } catch {
        if (!cancelled) {
          setPlan("free");
          setHasActivated(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    resolvePlan();

    const onStorage = (e: StorageEvent) => {
      const email = getCurrentUserEmail(user);
      if (
        (email && e.key === `bizzpal_subscription_plan_${email}` && e.newValue) ||
        (e.key === "bizzpal_subscription_plan" && e.newValue)
      ) {
        setPlan(e.newValue);
        setHasActivated(e.newValue !== "free");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
    };
  }, [user]);

  const activatePlan = useCallback(
    async (planId: string, planName?: string) => {
      setPlan(planId);
      setHasActivated(planId !== "free");
      const email = getCurrentUserEmail(user);
      try {
        localStorage.setItem("bizzpal_subscription_plan", planId);
        if (email) {
          localStorage.setItem(`bizzpal_subscription_plan_${email}`, planId);
        }
        // Record it on the server for the signed-in account. Paid plans are only accepted once a verified payment
        // has switched them on; the server checks that.
        fetch("/api/payments/activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    },
    [user]
  );

  const hasPlanLevel = useCallback(
    (requiredPlan?: string | null) => {
      const email = getCurrentUserEmail(user);
      if (isDemoAccount(email)) return true;
      if (isLocalEnvironment()) return true;
      if (!requiredPlan) return true;
      return planRank(plan) >= planRank(requiredPlan);
    },
    [plan, user]
  );

  const email = getCurrentUserEmail(user);
  const effectivePlan = isDemoAccount(email)
    ? "enterprise"
    : isLocalEnvironment() && plan === "free"
    ? "enterprise"
    : plan;

  return { plan: effectivePlan as PlanId, hasActivated: isDemoAccount(email) || isLocalEnvironment() || hasActivated, loading, activatePlan, hasPlanLevel };
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/firebase/authContext";
import { getUserPlanFromFirestore, saveUserPlanToFirestore } from "@/lib/firebase/firestore";

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

function planRank(planId: string | null | undefined): number {
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
 * Resolves the current user's active subscription plan (Firestore when signed in,
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

      try {
        if (user) {
          const remotePlan = await getUserPlanFromFirestore(user.uid);
          if (!cancelled) {
            if (remotePlan) {
              setPlan(remotePlan);
              setHasActivated(true);
              if (email) localStorage.setItem(`bizzpal_subscription_plan_${email}`, remotePlan);
              localStorage.setItem("bizzpal_subscription_plan", remotePlan);
              return;
            }
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
    async (planId: string) => {
      setPlan(planId);
      setHasActivated(planId !== "free");
      const email = getCurrentUserEmail(user);
      try {
        localStorage.setItem("bizzpal_subscription_plan", planId);
        if (email) {
          localStorage.setItem(`bizzpal_subscription_plan_${email}`, planId);
        }
      } catch {
        // ignore
      }
      if (user) {
        try {
          await saveUserPlanToFirestore(user.uid, planId);
        } catch {
          // ignore — local cache already updated
        }
      }
    },
    [user]
  );

  const hasPlanLevel = useCallback(
    (requiredPlan?: string | null) => {
      if (!requiredPlan) return true;
      return planRank(plan) >= planRank(requiredPlan);
    },
    [plan]
  );

  return { plan: plan as PlanId, hasActivated, loading, activatePlan, hasPlanLevel };
}

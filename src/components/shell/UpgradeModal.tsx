"use client";

import React from "react";
import Link from "next/link";
import { Lock, X, Sparkles } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";

interface UpgradeModalProps {
  featureLabel: string;
  requiredPlan: string;
  onClose: () => void;
}

export function UpgradeModal({ featureLabel, requiredPlan, onClose }: UpgradeModalProps) {
  const [planLabel, setPlanLabel] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("bizzpal_subscription_plans");
        if (raw) {
          const parsed = JSON.parse(raw);
          const match = parsed.find((p: any) => p.id === requiredPlan);
          if (match?.name) return match.name;
        }
      } catch {}
    }
    const fallbackMap: Record<string, string> = {
      starter: "Starter Business OS",
      growth: "Growth Scale",
      enterprise: "Enterprise Custom",
      free: "BizzPal Free",
    };
    return fallbackMap[requiredPlan] || requiredPlan;
  });

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("bizzpal_subscription_plans");
      if (raw) {
        const parsed = JSON.parse(raw);
        const match = parsed.find((p: any) => p.id === requiredPlan);
        if (match?.name) {
          setPlanLabel(match.name);
        }
      }
    } catch {}
  }, [requiredPlan]);

  return (
    <PortalModal isOpen={true} onClose={onClose}>
      <div
        className="w-full max-w-sm p-6 rounded-2xl border border-line bg-surface shadow-2xl space-y-4 animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="w-11 h-11 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center">
            <Lock className="w-5 h-5 text-blue-500" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-bold text-text">Upgrade to unlock {featureLabel}</h3>
          <p className="text-xs text-text-muted leading-relaxed">
            {featureLabel} is available on the <span className="font-semibold text-text">{planLabel}</span> plan and above. Upgrade your plan to get access.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs border border-line text-text-muted hover:text-text cursor-pointer"
          >
            Not now
          </button>
          <Link
            href="/subscription"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold btn-tactile"
          >
            <Sparkles className="w-3.5 h-3.5" />
            View Plans
          </Link>
        </div>
      </div>
    </PortalModal>
  );
}

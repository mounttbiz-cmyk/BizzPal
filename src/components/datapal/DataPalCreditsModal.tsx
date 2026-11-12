"use client";

import React from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { DataPalCreditStatus } from "@/lib/datapal/credits";
import { PortalModal } from "@/components/ui/PortalModal";

interface DataPalCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: DataPalCreditStatus;
  onUpdated: () => void;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

export function DataPalCreditsModal({ isOpen, onClose, status }: DataPalCreditsModalProps) {
  if (!isOpen) return null;

  const remaining = status.remainingData ?? status.remainingQuota ?? 0;
  const total = status.totalAllowed || status.baseQuota + status.addonCredits;
  const used = status.usedData ?? status.usedLeads ?? 0;

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-lg bg-surface border border-line rounded-xl shadow-lg p-6 sm:p-7 space-y-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h2 className="text-lg font-semibold text-text">Credits</h2>
            <p className="text-xs text-text-muted mt-0.5">Records included with your {PLAN_LABEL[status.planTier] || "current"} plan.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 rounded-lg border border-line bg-surface-2/50 space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-text-muted">Records remaining</p>
              <p className="text-3xl font-medium text-text mt-1 leading-none">{remaining}</p>
            </div>
            <p className="text-xs text-text-muted text-right">
              {used} used of {total}
            </p>
          </div>
          <div className="w-full h-1.5 rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-brass transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.round((remaining / (total || 1)) * 100))}%` }}
            />
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-text-muted leading-relaxed">
            Need more records? Move to a bigger plan, or write to us for a one-off top-up.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/subscription"
              className="px-4 py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110"
            >
              See plans
            </Link>
            <a
              href="mailto:sales@bizzpal.app?subject=DataPal%20top-up"
              className="px-4 py-2.5 rounded-xl border border-line text-sm text-text hover:bg-surface-2"
            >
              Ask for a top-up
            </a>
          </div>
        </div>
      </div>
    </PortalModal>
  );
}

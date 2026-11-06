"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  PAY_AS_YOU_GO_PACKS,
  DataPalCreditStatus,
  addPayAsYouGoCredits,
  clearSeenLeadsRegistry,
} from "@/lib/datapal/credits";
import { PortalModal } from "@/components/ui/PortalModal";

interface DataPalCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: DataPalCreditStatus;
  onUpdated: () => void;
}

export function DataPalCreditsModal({
  isOpen,
  onClose,
  status,
  onUpdated,
}: DataPalCreditsModalProps) {
  const [selectedPackId, setSelectedPackId] = useState<string>("pack_500");
  const [customDataCount, setCustomDataCount] = useState<number>(2000);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculateCustomPrice = (count: number) => {
    // Dynamic volume tiered pricing for custom data amount
    const price = Math.round(count * 0.65);
    return Math.max(99, price);
  };

  const handlePurchase = (packId: string) => {
    let amount = 0;
    if (packId === "pack_custom") {
      amount = Math.max(10, customDataCount || 100);
    } else {
      const pack = PAY_AS_YOU_GO_PACKS.find(p => p.id === packId);
      if (pack) amount = pack.dataCount;
    }

    if (amount <= 0) return;

    setIsProcessing(true);
    setTimeout(() => {
      addPayAsYouGoCredits(amount);
      setIsProcessing(false);
      setSuccessMessage(`Success! +${amount} verified data added to your balance.`);
      onUpdated();
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    }, 500);
  };

  const handleResetHistory = () => {
    if (confirm("Reset deduplication history and test counters for this account?")) {
      clearSeenLeadsRegistry();
      onUpdated();
      setSuccessMessage("Deduplication registry reset! All records are now eligible for re-extraction.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const remaining = status.remainingData ?? status.remainingQuota ?? 0;
  const total = status.totalAllowed || (status.baseQuota + status.addonCredits);
  const used = status.usedData ?? status.usedLeads ?? 0;

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="relative w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-2xl p-6 sm:p-7 space-y-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-brass" />
              <h2 className="text-lg font-bold text-text tracking-tight font-sans">
                Buy More Credit
              </h2>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Top up your balance instantly with verified data extraction credits.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Current Balance Overview - Purely showing data counts without subscription plan text */}
        <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <span className="font-semibold text-text">Your Data Balance:</span>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-brass/15 text-brass font-bold text-xs tracking-tight">
                {remaining} data remaining
              </span>
              {status.addonCredits > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
                  +{status.addonCredits} extra data
                </span>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-text-muted">
              <span>
                Used: <strong className="text-text font-semibold">{used}</strong> data
              </span>
              <span>
                Available: <strong className="text-brass font-bold">{remaining}</strong> of {total} data
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden border border-line/50">
              <div
                className="h-full bg-brass transition-all duration-300 rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((used / (total || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* The 4 Plans: 100 Data, 500 Data, 1500 Data, and Custom (No names) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-text">
              Select Data Pack
            </h3>
            <span className="text-[11px] text-text-muted">Credits never expire</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Plan 1: 100 Data */}
            <div
              onClick={() => setSelectedPackId("pack_100")}
              className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPackId === "pack_100"
                  ? "border-brass bg-brass/5 shadow-sm ring-1 ring-brass/30"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl font-black text-text tracking-tight font-sans">
                  100 Data
                </span>
                <span className="text-sm font-bold text-text font-sans">
                  ₹199
                </span>
              </div>
              <div className="text-[11px] text-text-muted font-medium mt-0.5">
                ₹1.99 / data
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={e => {
                  e.stopPropagation();
                  handlePurchase("pack_100");
                }}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPackId === "pack_100"
                    ? "bg-brass text-white hover:brightness-110 shadow-xs"
                    : "bg-surface-2 text-text hover:bg-brass hover:text-white"
                }`}
              >
                <span>Buy 100 Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plan 2: 500 Data (Popular) */}
            <div
              onClick={() => setSelectedPackId("pack_500")}
              className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPackId === "pack_500"
                  ? "border-brass bg-brass/5 shadow-sm ring-1 ring-brass/30"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/40"
              }`}
            >
              <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-brass text-white text-[10px] font-bold shadow-xs">
                Popular
              </span>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl font-black text-text tracking-tight font-sans">
                  500 Data
                </span>
                <span className="text-sm font-bold text-text font-sans">
                  ₹499
                </span>
              </div>
              <div className="text-[11px] text-text-muted font-medium mt-0.5">
                ₹0.99 / data (Save 50%)
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={e => {
                  e.stopPropagation();
                  handlePurchase("pack_500");
                }}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPackId === "pack_500"
                    ? "bg-brass text-white hover:brightness-110 shadow-xs"
                    : "bg-surface-2 text-text hover:bg-brass hover:text-white"
                }`}
              >
                <span>Buy 500 Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plan 3: 1500 Data */}
            <div
              onClick={() => setSelectedPackId("pack_1500")}
              className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPackId === "pack_1500"
                  ? "border-brass bg-brass/5 shadow-sm ring-1 ring-brass/30"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl font-black text-text tracking-tight font-sans">
                  1500 Data
                </span>
                <span className="text-sm font-bold text-text font-sans">
                  ₹999
                </span>
              </div>
              <div className="text-[11px] text-text-muted font-medium mt-0.5">
                ₹0.66 / data (Save 67%)
              </div>

              <button
                type="button"
                disabled={isProcessing}
                onClick={e => {
                  e.stopPropagation();
                  handlePurchase("pack_1500");
                }}
                className={`mt-4 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  selectedPackId === "pack_1500"
                    ? "bg-brass text-white hover:brightness-110 shadow-xs"
                    : "bg-surface-2 text-text hover:bg-brass hover:text-white"
                }`}
              >
                <span>Buy 1500 Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Plan 4: Custom Data */}
            <div
              onClick={() => setSelectedPackId("pack_custom")}
              className={`relative p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPackId === "pack_custom"
                  ? "border-brass bg-brass/5 shadow-sm ring-1 ring-brass/30"
                  : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xl font-black text-text tracking-tight font-sans">
                  Custom Data
                </span>
                <span className="text-sm font-bold text-text font-sans">
                  ₹{calculateCustomPrice(customDataCount)}
                </span>
              </div>

              {/* Custom Number Input */}
              <div className="mt-1 flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={customDataCount || ""}
                    onClick={e => e.stopPropagation()}
                    onChange={e => {
                      const val = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                      setCustomDataCount(isNaN(val) ? 0 : Math.min(50000, val));
                    }}
                    placeholder="Enter data count"
                    className="w-full px-3 py-1.5 rounded-lg text-xs font-bold font-sans bg-surface-2 border border-line text-text focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass/30"
                  />
                  <span className="absolute right-2.5 top-1.5 text-[11px] text-text-muted pointer-events-none">
                    data
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-text-muted font-medium mt-1">
                Flexible volume (~₹0.65 / data)
              </div>

              <button
                type="button"
                disabled={isProcessing || !customDataCount || customDataCount < 10}
                onClick={e => {
                  e.stopPropagation();
                  handlePurchase("pack_custom");
                }}
                className={`mt-2.5 w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                  selectedPackId === "pack_custom"
                    ? "bg-brass text-white hover:brightness-110 shadow-xs"
                    : "bg-surface-2 text-text hover:bg-brass hover:text-white"
                }`}
              >
                <span>Buy {customDataCount || 0} Data</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Deduplication Guarantee - Clean bottom without subscription plans */}
        <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-text-muted">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Zero Duplicates: Previously extracted records are filtered out automatically.</span>
          </span>
          <button
            type="button"
            onClick={handleResetHistory}
            className="text-[11px] text-text-muted hover:text-rose-500 underline cursor-pointer"
          >
            Reset test history
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

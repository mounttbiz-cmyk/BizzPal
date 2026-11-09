"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import {
  PAY_AS_YOU_GO_PACKS,
  DataPalCreditStatus,
  addPayAsYouGoCredits,
  clearSeenLeadsRegistry,
} from "@/lib/datapal/credits";
import { PortalModal } from "@/components/ui/PortalModal";

const PACKS = [
  { id: "pack_100", count: 100, price: 199 },
  { id: "pack_500", count: 500, price: 499 },
  { id: "pack_1500", count: 1500, price: 999 },
];

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
  const [selectedPackId, setSelectedPackId] = useState<string>("pack_100");
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
      <div className="relative w-full max-w-2xl bg-surface border border-line rounded-xl shadow-lg p-6 sm:p-7 space-y-6 animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-text">Credits</h2>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Add more records to your balance when you need them.
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
          <div className="p-3 border border-line bg-surface-2 rounded-lg text-text text-sm">
            <span>{successMessage}</span>
          </div>
        )}

        {/* Balance */}
        <div className="p-5 rounded-lg border border-line bg-surface-2/50 space-y-4">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-text-muted">Records remaining</p>
              <p className="text-3xl font-medium text-text mt-1 leading-none">{remaining}</p>
            </div>
            <div className="text-right text-xs text-text-muted space-y-0.5">
              <p>
                {used} used of {total}
              </p>
              {status.addonCredits > 0 && <p>{status.addonCredits} purchased</p>}
            </div>
          </div>
          <div className="w-full h-1.5 rounded-full bg-line overflow-hidden">
            <div
              className="h-full bg-brass transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.round((remaining / (total || 1)) * 100))}%` }}
            />
          </div>
        </div>

        {/* Packs */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text">Choose an amount</h3>
            <span className="text-xs text-text-muted">One-time payment · added instantly · no expiry</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PACKS.map(pack => {
              const selected = selectedPackId === pack.id;
              return (
                <div
                  key={pack.id}
                  onClick={() => setSelectedPackId(pack.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selected ? "border-brass bg-brass/[0.04]" : "border-line hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-medium text-text leading-none">{pack.count}</span>
                    <span className="text-sm text-text-muted">records</span>
                  </div>
                  <div className="mt-3 flex items-baseline justify-between">
                    <span className="text-lg text-text">₹{pack.price}</span>
                    <span className="text-xs text-text-muted">₹{(pack.price / pack.count).toFixed(2)} per record</span>
                  </div>
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={e => {
                      e.stopPropagation();
                      handlePurchase(pack.id);
                    }}
                    className={`mt-4 w-full py-2 rounded-lg text-sm cursor-pointer disabled:opacity-50 ${
                      selected
                        ? "bg-brass text-white hover:brightness-110"
                        : "border border-line text-text hover:bg-surface-2"
                    }`}
                  >
                    Add {pack.count} records
                  </button>
                </div>
              );
            })}

            {/* Custom amount */}
            <div
              onClick={() => setSelectedPackId("pack_custom")}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedPackId === "pack_custom" ? "border-brass bg-brass/[0.04]" : "border-line hover:border-line-strong"
              }`}
            >
              <p className="text-sm text-text-muted">Custom amount</p>
              <div className="relative mt-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customDataCount || ""}
                  onClick={e => e.stopPropagation()}
                  onFocus={() => setSelectedPackId("pack_custom")}
                  onChange={e => {
                    const val = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                    setCustomDataCount(isNaN(val) ? 0 : Math.min(50000, val));
                  }}
                  placeholder="Number of records"
                  className="w-full px-3 py-1.5 pr-16 rounded-md text-xl font-medium bg-surface border border-line text-text focus:outline-none focus:border-brass"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-muted pointer-events-none">
                  records
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg text-text">₹{calculateCustomPrice(customDataCount)}</span>
                <span className="text-xs text-text-muted">about ₹0.65 per record</span>
              </div>
              <button
                type="button"
                disabled={isProcessing || !customDataCount || customDataCount < 10}
                onClick={e => {
                  e.stopPropagation();
                  handlePurchase("pack_custom");
                }}
                className={`mt-4 w-full py-2 rounded-lg text-sm cursor-pointer disabled:opacity-50 ${
                  selectedPackId === "pack_custom"
                    ? "bg-brass text-white hover:brightness-110"
                    : "border border-line text-text hover:bg-surface-2"
                }`}
              >
                Add {customDataCount || 0} records
              </button>
            </div>
          </div>
        </div>

        {/* Deduplication Guarantee - Clean bottom without subscription plans */}
        <div className="pt-3 border-t border-line flex items-center justify-between text-xs text-text-muted">
          <span>Records you have already extracted are never repeated.</span>
          <button
            type="button"
            onClick={handleResetHistory}
            className="text-xs text-text-muted hover:text-text underline cursor-pointer"
          >
            Reset test history
          </button>
        </div>
      </div>
    </PortalModal>
  );
}

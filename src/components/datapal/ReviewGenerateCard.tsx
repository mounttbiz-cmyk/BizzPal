"use client";

import React, { useState } from "react";
import {
  Database,
  AlertTriangle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Plus,
  Layers,
} from "lucide-react";
import { CountryFlag } from "./CountryOption";

interface ReviewGenerateCardProps {
  searchQuery: string;
  selectedCategories: string[];
  countryCodes: string[];
  isAllCountries: boolean;
  stateCodes: string[];
  isAllStates: boolean;
  cityNames: string[];
  isAllCities: boolean;
  area?: string;
  postalCode?: string;
  isExtracting: boolean;
  extractProgress: number;
  extractStatusText: string;
  requestedCount: number;
  onRequestedCountChange: (count: number) => void;
  remainingQuota: number;
  totalQuota: number;
  onOpenCreditsModal: () => void;
  onGenerate: () => void;
  className?: string;
}

const COUNT_PRESETS = [20, 50, 100, 200, 500];

export function ReviewGenerateCard({
  searchQuery,
  selectedCategories,
  countryCodes,
  isAllCountries,
  stateCodes,
  isAllStates,
  cityNames,
  isAllCities,
  area,
  postalCode,
  isExtracting,
  extractProgress,
  extractStatusText,
  requestedCount,
  onRequestedCountChange,
  remainingQuota,
  totalQuota,
  onOpenCreditsModal,
  onGenerate,
  className = "",
}: ReviewGenerateCardProps) {
  const [customInput, setCustomInput] = useState<string>("");
  const isCustomActive = !COUNT_PRESETS.includes(requestedCount);

  // Validate Step 1 requirement
  const hasTarget = Boolean(searchQuery.trim() || selectedCategories.length > 0);
  const primaryCountry = countryCodes[0] || "IN";

  // Target summary text
  const targetLabel = searchQuery.trim()
    ? searchQuery.trim()
    : selectedCategories.length === 1
    ? selectedCategories[0]
    : selectedCategories.length > 1
    ? `${selectedCategories.slice(0, 2).join(", ")} +${selectedCategories.length - 2} more`
    : "No criteria specified";

  // Scope summary text
  let scopeLabel = "";
  if (isAllCountries) {
    scopeLabel = "All 250 Countries (Global scope)";
  } else if (countryCodes.length > 1) {
    scopeLabel = `${countryCodes.length} countries selected`;
  } else {
    // Single country
    const countryName = primaryCountry === "IN" ? "India" : primaryCountry;
    if (area && cityNames.length === 1) {
      scopeLabel = `${area}, ${cityNames[0]}, ${countryName}`;
    } else if (cityNames.length > 0 && !isAllCities) {
      scopeLabel = `${cityNames.slice(0, 2).join(", ")}${cityNames.length > 2 ? ` +${cityNames.length - 2} more` : ""}, ${countryName}`;
    } else if (stateCodes.length > 0 && !isAllStates) {
      scopeLabel = `All cities in ${stateCodes.join(", ")}, ${countryName}`;
    } else {
      scopeLabel = `All of ${countryName}`;
    }
  }

  // Large scope warning
  const isLargeScope =
    isAllCountries ||
    (countryCodes.length === 1 && !isAllCities && cityNames.length === 0 && stateCodes.length === 0);

  // Check if requested exceeds remaining quota
  const exceedsQuota = requestedCount > remainingQuota && remainingQuota > 0;
  const isOutOfCredits = remainingQuota <= 0;

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setCustomInput(val);
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      onRequestedCountChange(Math.min(50000, num));
    }
  };

  return (
    <div
      className={`rounded-2xl bg-surface border border-line p-4 sm:p-5 shadow-theme space-y-4 ${className}`}
    >
      {/* Top Row: Criteria Summary & Available Data Balance */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-line">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted font-medium font-sans">Looking for:</span>
            <span className="text-xs sm:text-sm font-bold text-text truncate max-w-md font-sans">
              {targetLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
            <span className="font-medium font-sans">In:</span>
            <div className="inline-flex items-center gap-1.5 font-semibold text-text font-sans">
              {!isAllCountries && <CountryFlag countryCode={primaryCountry} />}
              <span>{scopeLabel}</span>
            </div>
            {postalCode && (
              <span className="text-[11px] text-text-muted font-sans font-medium">({postalCode})</span>
            )}
          </div>
        </div>

        {/* Orange Box Refinement: Clean, modern display of remaining data to extract */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-surface-2/80 border border-brass/25 shadow-2xs">
            <div className="w-2 h-2 rounded-full bg-brass animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted font-sans leading-none">
                Available to extract
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className={`text-sm font-bold font-sans ${isOutOfCredits ? "text-rose-500" : "text-brass"}`}>
                  {remainingQuota} data
                </span>
                <span className="text-[11px] text-text-muted font-sans font-medium">
                  remaining
                </span>
              </div>
            </div>
          </div>

          {/* Blue Highlight Renamed: "Buy more credit" */}
          <button
            type="button"
            onClick={onOpenCreditsModal}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-brass/10 border border-brass/30 text-xs font-bold text-brass hover:bg-brass hover:text-white transition-all cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buy more credit</span>
          </button>
        </div>
      </div>

      {/* Middle: Extraction Quantity Selector (Redesigned with clean UI font & sleek custom input bar) */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-surface-2/40 border border-line space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-bold text-text flex items-center gap-1.5 font-sans">
              <span>How much data do you want to extract?</span>
            </label>
            <p className="text-[11px] text-text-muted font-sans mt-0.5">
              Select a standard amount or enter any custom number of data records.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold font-sans">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero duplicates: Never extracts records you&apos;ve seen before</span>
          </div>
        </div>

        {/* Quantity Presets & Redesigned Custom Input Bar */}
        <div className="flex items-center gap-2 flex-wrap pt-0.5">
          {/* Preset Buttons - Clean Sans-Serif Typography */}
          {COUNT_PRESETS.map(preset => {
            const isSelected = requestedCount === preset && !isCustomActive;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setCustomInput("");
                  onRequestedCountChange(preset);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-sans transition-all cursor-pointer ${
                  isSelected
                    ? "bg-brass text-white shadow-xs"
                    : "bg-surface border border-line text-text hover:border-brass/40 hover:bg-surface-2"
                }`}
              >
                {preset} Data
              </button>
            );
          })}

          {/* Redesigned Custom Input Bar: Sleek, integrated, premium layout */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-surface transition-all ${
              isCustomActive
                ? "border-brass ring-1 ring-brass/30 shadow-xs"
                : "border-line hover:border-brass/40"
            }`}
          >
            <span className="text-xs font-bold font-sans text-text-muted">
              Custom:
            </span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 300"
              value={customInput || (isCustomActive ? String(requestedCount) : "")}
              onChange={handleCustomChange}
              className="w-20 bg-transparent text-xs font-bold font-sans text-text focus:outline-none placeholder:text-text-muted/60"
            />
            <span className="text-[11px] font-semibold text-text-muted font-sans">
              Data
            </span>
          </div>

          <div className="text-xs text-text-muted ml-auto font-medium font-sans">
            Selected: <strong className="text-text font-bold font-sans">{requestedCount}</strong> data records
          </div>
        </div>

        {/* Exceeds Quota Warning - Renamed link to "Buy more credit →" */}
        {exceedsQuota && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs animate-fade-in font-sans">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                You requested <strong>{requestedCount} data</strong>, but only <strong>{remainingQuota} data</strong> remain available.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenCreditsModal}
              className="font-bold underline ml-2 hover:brightness-110 whitespace-nowrap cursor-pointer text-xs"
            >
              Buy more credit →
            </button>
          </div>
        )}

        {isOutOfCredits && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs animate-fade-in font-sans">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>You have reached your data extraction limit.</span>
            </div>
            <button
              type="button"
              onClick={onOpenCreditsModal}
              className="font-bold underline ml-2 hover:brightness-110 whitespace-nowrap cursor-pointer text-xs"
            >
              Buy more credit →
            </button>
          </div>
        )}
      </div>

      {/* Large scope notice if applicable */}
      {isLargeScope && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-sans">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Broad scope: Extraction will focus on high-density commercial clusters.</span>
        </div>
      )}

      {/* In-progress status text */}
      {isExtracting && (
        <div className="space-y-1.5 animate-fade-in pt-1">
          <div className="flex items-center justify-between text-xs font-sans">
            <span className="text-brass font-medium animate-pulse">{extractStatusText}</span>
            <span className="font-bold text-text">{extractProgress}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-brass transition-all duration-300 rounded-full"
              style={{ width: `${extractProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Bottom Action: Primary Generate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-text-muted font-sans">
          All data includes verified names, phones, websites, addresses, and digital gap insights.
        </div>

        <button
          type="button"
          disabled={!hasTarget || isExtracting || isOutOfCredits}
          onClick={onGenerate}
          aria-label={`Generate ${requestedCount} verified data`}
          className="w-full sm:w-auto min-h-[46px] px-7 py-3 rounded-xl bg-brass text-white text-sm font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass font-sans"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Extracting {requestedCount} Data…</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-white" />
              <span>Generate {requestedCount} Data</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

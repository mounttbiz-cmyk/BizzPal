"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
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
  includePrevious: boolean;
  onIncludePreviousChange: (value: boolean) => void;
  remainingQuota: number;
  /** false while the balance is still being read from the server */
  creditsLoaded?: boolean;
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
  includePrevious,
  onIncludePreviousChange,
  remainingQuota,
  creditsLoaded = true,
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
  const exceedsQuota = creditsLoaded && requestedCount > remainingQuota && remainingQuota > 0;
  const isOutOfCredits = creditsLoaded && remainingQuota <= 0;

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
      className={`space-y-4 ${className}`}
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

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <span className="text-sm text-text-muted">
            <span className={`font-semibold ${isOutOfCredits ? "text-rust" : "text-text"}`}>{creditsLoaded ? remainingQuota : "…"}</span> records
            remaining
          </span>
          <button
            type="button"
            onClick={onOpenCreditsModal}
            className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
          >
            Buy credits
          </button>
        </div>
      </div>

      {/* Middle: Extraction Quantity Selector (Redesigned with clean UI font & sleek custom input bar) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-sm font-medium text-text">How many records?</label>
            <p className="text-xs text-text-muted mt-0.5">
              Pick an amount or enter your own.
            </p>
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
                className={`px-3.5 py-2 rounded-lg text-sm cursor-pointer ${
                  isSelected
                    ? "bg-brass text-white font-medium"
                    : "border border-line text-text hover:bg-surface-2"
                }`}
              >
                {preset}
              </button>
            );
          })}

          {/* Redesigned Custom Input Bar: Sleek, integrated, premium layout */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-surface ${
              isCustomActive
                ? "border-brass"
                : "border-line"
            }`}
          >
            <span className="text-sm text-text-muted">Custom:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 300"
              value={customInput || (isCustomActive ? String(requestedCount) : "")}
              onChange={handleCustomChange}
              className="w-20 bg-transparent text-sm text-text focus:outline-none placeholder:text-text-muted/60"
            />
            
          </div>

          
        </div>

        {/* Exceeds Quota Warning - Renamed link to "Buy credits" */}
        {exceedsQuota && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-line bg-surface-2 text-sm text-text">
            <div className="flex items-center gap-1.5">
              <span>
                You asked for {requestedCount} records but only {remainingQuota} are left.
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenCreditsModal}
              className="font-bold underline ml-2 hover:brightness-110 whitespace-nowrap cursor-pointer text-xs"
            >
              Buy credits
            </button>
          </div>
        )}

        {isOutOfCredits && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-rust/30 bg-rust/5 text-sm text-rust">
            <div className="flex items-center gap-1.5">
              <span>You have used all your extraction credits.</span>
            </div>
            <button
              type="button"
              onClick={onOpenCreditsModal}
              className="font-bold underline ml-2 hover:brightness-110 whitespace-nowrap cursor-pointer text-xs"
            >
              Buy credits
            </button>
          </div>
        )}
      </div>

      {/* Large scope notice if applicable */}
      {isLargeScope && (
        <p className="text-xs text-text-muted">Broad area selected: results will focus on dense commercial areas.</p>
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

      {/* Old records or new only */}
      <div className="rounded-xl border border-line bg-surface-2/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">Records you already have</p>
          <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
            {includePrevious
              ? "You may get businesses from your earlier searches again. They use credits again."
              : "Businesses you have already extracted are left out, so every record is new to you."}
          </p>
        </div>
        <div className="inline-flex p-1 rounded-xl bg-surface border border-line shrink-0 self-start md:self-auto" role="radiogroup" aria-label="Records you already have">
          {[
            { value: false, label: "New only" },
            { value: true, label: "Include old" },
          ].map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={includePrevious === opt.value}
              onClick={() => onIncludePreviousChange(opt.value)}
              className={`px-5 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                includePrevious === opt.value ? "bg-brass text-white font-medium" : "text-text-muted hover:text-text"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Action: Primary Generate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <p className="text-xs text-text-muted">Each record includes name, phone, website, address and notes.</p>

        <button
          type="button"
          disabled={!hasTarget || isExtracting || isOutOfCredits}
          onClick={onGenerate}
          aria-label={`Get ${requestedCount} records`}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Extracting {requestedCount} records…</span>
            </>
          ) : (
            <>
              <span>Get {requestedCount} records</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

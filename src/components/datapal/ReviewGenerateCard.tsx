"use client";

import React from "react";
import { Database, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
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
  onGenerate: () => void;
  className?: string;
}

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
  onGenerate,
  className = "",
}: ReviewGenerateCardProps) {
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
  const isLargeScope = isAllCountries || (countryCodes.length === 1 && !isAllCities && cityNames.length === 0 && stateCodes.length === 0);

  return (
    <div
      className={`rounded-2xl bg-surface border border-line p-4 sm:p-5 shadow-theme flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
    >
      {/* Left: Slim Summary */}
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-text-muted font-medium">Looking for:</span>
          <span className="text-xs sm:text-sm font-bold text-text truncate max-w-md">
            {targetLabel}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted">
          <span className="font-medium">In:</span>
          <div className="inline-flex items-center gap-1.5 font-semibold text-text">
            {!isAllCountries && <CountryFlag countryCode={primaryCountry} />}
            <span>{scopeLabel}</span>
          </div>
          {postalCode && (
            <span className="font-mono text-[11px] text-text-muted">
              ({postalCode})
            </span>
          )}
        </div>

        {/* Large scope notice if applicable */}
        {isLargeScope && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-0.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Broad scope: Extraction will process high-density commercial clusters.</span>
          </div>
        )}

        {/* In-progress status text */}
        {isExtracting && (
          <div className="pt-2 space-y-1.5 animate-fade-in">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-brass font-medium animate-pulse">
                {extractStatusText}
              </span>
              <span className="font-mono font-bold text-text">
                {extractProgress}%
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full bg-brass transition-all duration-300 rounded-full"
                style={{ width: `${extractProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right: The ONE Primary Gold Generate Button */}
      <div className="flex flex-col sm:items-end justify-center shrink-0">
        <button
          type="button"
          disabled={!hasTarget || isExtracting}
          onClick={onGenerate}
          aria-label="Generate verified data"
          className="w-full sm:w-auto min-h-[46px] px-6 py-3 rounded-xl bg-brass text-white text-sm font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          {isExtracting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Extracting Data…</span>
            </>
          ) : (
            <>
              <Database className="w-4 h-4 text-white" />
              <span>Generate Data</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </>
          )}
        </button>

        {!hasTarget && (
          <span className="text-[11px] text-text-muted mt-1 text-center sm:text-right">
            Enter what you&apos;re looking for in Step 1 to continue
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getCountryPostalConfig, validatePostalCode } from "@/lib/datapal/countryConfig";
import { locationService } from "@/lib/datapal/locationService";

interface PostalCodeFieldProps {
  countryCode: string;
  selectedCities: string[];
  areaValue: string;
  onAreaChange: (val: string) => void;
  postalCodeValue: string;
  onPostalCodeChange: (val: string) => void;
  disabled?: boolean;
  className?: string;
}

export function PostalCodeField({
  countryCode,
  selectedCities,
  areaValue,
  onAreaChange,
  postalCodeValue,
  onPostalCodeChange,
  disabled = false,
  className = "",
}: PostalCodeFieldProps) {
  const config = useMemo(() => {
    return getCountryPostalConfig(countryCode);
  }, [countryCode]);

  const validation = useMemo(() => {
    return validatePostalCode(countryCode, postalCodeValue);
  }, [countryCode, postalCodeValue]);

  // Dynamic locality placeholder based on city
  const areaPlaceholder = useMemo(() => {
    if (selectedCities.length === 1 && selectedCities[0] !== "ALL") {
      const sample = locationService.getSampleLocalities(selectedCities[0]);
      return `e.g. ${sample}`;
    }
    if (selectedCities.length > 1) {
      return "Localities across selected cities";
    }
    return "Neighborhood, district or commercial area";
  }, [selectedCities]);

  const isAreaDisabled = disabled;
  const isPostalDisabled = disabled || !config.hasPostalCode;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`}>
      {/* Area / Locality Input (~2/3 width) */}
      <div className="sm:col-span-2 flex flex-col gap-1.5">
        <label htmlFor="area-locality-input" className="text-xs font-semibold text-text flex items-center justify-between">
          <span>Area or Locality</span>
          <span className="text-[10px] text-text-muted font-normal">Optional</span>
        </label>
        <input
          id="area-locality-input"
          type="text"
          value={areaValue}
          onChange={e => onAreaChange(e.target.value)}
          placeholder={areaPlaceholder}
          disabled={isAreaDisabled}
          className={`h-11 px-3.5 rounded-xl border text-xs text-text placeholder:text-text-muted/60 transition-all focus:outline-none focus:ring-1 focus:ring-brass ${
            isAreaDisabled
              ? "bg-surface-2/40 border-line/60 opacity-60 cursor-not-allowed"
              : "bg-surface border-line hover:border-line-strong focus:border-brass"
          }`}
        />
      </div>

      {/* Postal Code Input (~1/3 width, monospace digits) */}
      {config.hasPostalCode && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="postal-code-input" className="text-xs font-semibold text-text flex items-center justify-between">
            <span>{config.label}</span>
            <span className="text-[10px] text-text-muted font-normal">Optional</span>
          </label>
          <div className="relative">
            <input
              id="postal-code-input"
              type="text"
              inputMode="numeric"
              value={postalCodeValue}
              onChange={e => onPostalCodeChange(e.target.value)}
              placeholder={config.placeholder}
              disabled={isPostalDisabled}
              className={`h-11 w-full pl-3.5 pr-8 rounded-xl border text-xs font-mono text-text placeholder:text-text-muted/60 transition-all focus:outline-none focus:ring-1 focus:ring-brass ${
                isPostalDisabled
                  ? "bg-surface-2/40 border-line/60 opacity-60 cursor-not-allowed"
                  : postalCodeValue && !validation.isValid
                  ? "bg-surface border-rust/60 text-rust focus:border-rust focus:ring-rust/30"
                  : postalCodeValue && validation.isValid
                  ? "bg-surface border-emerald-500/60 focus:border-emerald-500 focus:ring-emerald-500/30"
                  : "bg-surface border-line hover:border-line-strong focus:border-brass"
              }`}
            />
            {postalCodeValue.trim() && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                {validation.isValid ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rust" />
                )}
              </div>
            )}
          </div>
          {postalCodeValue.trim() && !validation.isValid && validation.message && (
            <span className="text-[10px] text-rust font-medium">
              {validation.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

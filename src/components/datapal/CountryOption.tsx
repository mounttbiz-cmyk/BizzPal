"use client";

import React from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { Globe } from "lucide-react";

interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

export function CountryFlag({ countryCode, className = "" }: CountryFlagProps) {
  const code = (countryCode || "").toUpperCase();
  // country-flag-icons exports each country by its 2-letter uppercase code
  const FlagComponent = (Flags as Record<string, React.ComponentType<{ className?: string }>>)[code];

  if (FlagComponent) {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex items-center justify-center overflow-hidden rounded-[2px] border border-line/50 shrink-0 w-5 h-3.5 ${className}`}
      >
        <FlagComponent className="w-full h-full object-cover" />
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-[2px] border border-line/50 shrink-0 w-5 h-3.5 bg-surface-2 text-text-muted ${className}`}
    >
      <Globe className="w-3 h-3" />
    </span>
  );
}

interface CountryOptionProps {
  countryCode: string;
  name: string;
  dialCode?: string;
  className?: string;
}

export function CountryOption({ countryCode, name, dialCode, className = "" }: CountryOptionProps) {
  return (
    <div className={`flex items-center justify-between gap-2 w-full text-xs ${className}`}>
      <div className="flex items-center gap-2 min-w-0">
        <CountryFlag countryCode={countryCode} />
        <span className="truncate text-text font-medium">{name}</span>
      </div>
      {dialCode && (
        <span className="text-[11px] font-mono text-text-muted shrink-0">
          {dialCode}
        </span>
      )}
    </div>
  );
}

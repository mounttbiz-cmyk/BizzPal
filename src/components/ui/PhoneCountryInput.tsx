"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface CountryOption {
  iso: string;
  name: string;
  code: string;
  flag: string;
  digits: number;
  placeholder: string;
}

export const COUNTRIES: CountryOption[] = [
  { iso: "IN", name: "India", code: "+91", flag: "🇮🇳", digits: 10, placeholder: "98765 43210" },
  { iso: "US", name: "United States", code: "+1", flag: "🇺🇸", digits: 10, placeholder: "202 555 0192" },
  { iso: "GB", name: "United Kingdom", code: "+44", flag: "🇬🇧", digits: 10, placeholder: "7911 123456" },
  { iso: "AE", name: "UAE", code: "+971", flag: "🇦🇪", digits: 9, placeholder: "50 123 4567" },
  { iso: "SG", name: "Singapore", code: "+65", flag: "🇸🇬", digits: 8, placeholder: "8123 4567" },
  { iso: "AU", name: "Australia", code: "+61", flag: "🇦🇺", digits: 9, placeholder: "412 345 678" },
  { iso: "CA", name: "Canada", code: "+1", flag: "🇨🇦", digits: 10, placeholder: "416 555 0192" },
  { iso: "DE", name: "Germany", code: "+49", flag: "🇩🇪", digits: 10, placeholder: "151 12345678" },
  { iso: "SA", name: "Saudi Arabia", code: "+966", flag: "🇸🇦", digits: 9, placeholder: "50 123 4567" },
];

interface PhoneCountryInputProps {
  value: string;
  onChange: (fullNumber: string) => void;
  className?: string;
}

export function PhoneCountryInput({ value, onChange, className = "" }: PhoneCountryInputProps) {
  // Parse initial country and national number
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(() => {
    if (value) {
      const match = COUNTRIES.find(c => value.startsWith(c.code));
      if (match) return match;
    }
    return COUNTRIES[0]; // Default India
  });

  const getNationalNumber = (full: string, country: CountryOption) => {
    if (full.startsWith(country.code)) {
      return full.slice(country.code.length).trim().replace(/\D/g, "");
    }
    return full.replace(/\D/g, "");
  };

  const [nationalNumber, setNationalNumber] = useState(() => {
    return getNationalNumber(value || "", selectedCountry).slice(0, selectedCountry.digits);
  });

  const handleCountryChange = (iso: string) => {
    const country = COUNTRIES.find(c => c.iso === iso) || COUNTRIES[0];
    setSelectedCountry(country);
    const trimmed = nationalNumber.slice(0, country.digits);
    setNationalNumber(trimmed);
    onChange(trimmed ? `${country.code} ${trimmed}` : "");
  };

  const handleNumberChange = (raw: string) => {
    // Only allow numeric digits
    const digitsOnly = raw.replace(/\D/g, "").slice(0, selectedCountry.digits);
    setNationalNumber(digitsOnly);
    onChange(digitsOnly ? `${selectedCountry.code} ${digitsOnly}` : "");
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center rounded-xl bg-surface border border-line focus-within:ring-2 focus-within:ring-brass focus-within:border-brass overflow-hidden shadow-sm transition-all">
        {/* Country Selector Dropdown */}
        <div className="relative border-r border-line bg-surface-2/60 shrink-0">
          <select
            value={selectedCountry.iso}
            onChange={e => handleCountryChange(e.target.value)}
            aria-label="Select Country Code"
            className="appearance-none bg-transparent pl-3 pr-7 py-2.5 text-xs text-text font-medium cursor-pointer focus:outline-none"
          >
            {COUNTRIES.map(c => (
              <option key={c.iso} value={c.iso} className="bg-surface text-text">
                {c.flag} {c.code} ({c.name})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Digits Only Input */}
        <div className="flex-1 flex items-center px-3">
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={nationalNumber}
            onChange={e => handleNumberChange(e.target.value)}
            placeholder={`e.g. ${selectedCountry.placeholder}`}
            maxLength={selectedCountry.digits}
            className="w-full py-2 bg-transparent text-xs text-text font-mono placeholder:text-text-muted focus:outline-none"
          />
          <span className="text-[10px] text-text-muted font-mono shrink-0 ml-2">
            {nationalNumber.length}/{selectedCountry.digits}
          </span>
        </div>
      </div>
      {nationalNumber.length > 0 && nationalNumber.length < selectedCountry.digits && (
        <p className="text-[10px] text-amber-500 font-medium">
          Please enter a valid {selectedCountry.digits}-digit mobile number for {selectedCountry.name}.
        </p>
      )}
    </div>
  );
}

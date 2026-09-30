"use client";

import React, { useMemo } from "react";
import { MultiSelectCombobox } from "./MultiSelectCombobox";
import { PostalCodeField } from "./PostalCodeField";
import { locationService, LocationItem } from "@/lib/datapal/locationService";
import { MapPin, RotateCcw } from "lucide-react";

interface LocationStepProps {
  countryCodes: string[];
  isAllCountries: boolean;
  onCountryChange: (codes: string[], isAll: boolean) => void;

  stateCodes: string[];
  isAllStates: boolean;
  onStateChange: (codes: string[], isAll: boolean) => void;

  cityNames: string[];
  isAllCities: boolean;
  onCityChange: (names: string[], isAll: boolean) => void;

  area: string;
  onAreaChange: (val: string) => void;

  postalCode: string;
  onPostalCodeChange: (val: string) => void;

  onResetLocation: () => void;
  className?: string;
}

export function LocationStep({
  countryCodes,
  isAllCountries,
  onCountryChange,
  stateCodes,
  isAllStates,
  onStateChange,
  cityNames,
  isAllCities,
  onCityChange,
  area,
  onAreaChange,
  postalCode,
  onPostalCodeChange,
  onResetLocation,
  className = "",
}: LocationStepProps) {
  // Load countries from locationService
  const { popular, all: allCountries } = useMemo(() => {
    return locationService.getCountries();
  }, []);

  // Primary active country code
  const primaryCountryCode = countryCodes[0] || "IN";

  // Load states for the primary country
  const statesList: LocationItem[] = useMemo(() => {
    if (isAllCountries || countryCodes.length === 0) return [];
    return locationService.getStates(primaryCountryCode);
  }, [primaryCountryCode, isAllCountries, countryCodes]);

  // Primary state code
  const primaryStateCode = stateCodes[0];

  // Load cities for the selected state or country
  const citiesList: LocationItem[] = useMemo(() => {
    if (isAllCountries || countryCodes.length === 0) return [];
    return locationService.getCities(primaryCountryCode, primaryStateCode);
  }, [primaryCountryCode, primaryStateCode, isAllCountries, countryCodes]);

  // Dynamic quick city chips for the selected country (e.g. for India: Mumbai, Delhi, Bengaluru, Pune, etc.)
  const quickCities = useMemo(() => {
    if (primaryCountryCode === "IN") {
      return [
        { name: "Mumbai", state: "MH" },
        { name: "Delhi NCR", state: "DL" },
        { name: "Bengaluru", state: "KA" },
        { name: "Pune", state: "MH" },
        { name: "Hyderabad", state: "TG" },
        { name: "Chennai", state: "TN" },
      ];
    }
    if (primaryCountryCode === "US") {
      return [
        { name: "New York", state: "NY" },
        { name: "Los Angeles", state: "CA" },
        { name: "Chicago", state: "IL" },
        { name: "San Francisco", state: "CA" },
        { name: "Austin", state: "TX" },
      ];
    }
    if (primaryCountryCode === "GB") {
      return [
        { name: "London", state: "ENG" },
        { name: "Manchester", state: "ENG" },
        { name: "Birmingham", state: "ENG" },
      ];
    }
    if (primaryCountryCode === "AE") {
      return [
        { name: "Dubai", state: "DU" },
        { name: "Abu Dhabi", state: "AZ" },
        { name: "Sharjah", state: "SH" },
      ];
    }
    return citiesList.slice(0, 5).map(c => ({ name: c.name, state: c.parentCode || "" }));
  }, [primaryCountryCode, citiesList]);

  const handleQuickCityClick = (city: string, state: string) => {
    if (state && !stateCodes.includes(state)) {
      onStateChange([state], false);
    }
    onCityChange([city], false);
  };

  const isStateDisabled = isAllCountries || countryCodes.length === 0;
  const isCityDisabled = isStateDisabled || (stateCodes.length === 0 && !isAllStates);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Country / State / City Comboboxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Country Combobox (Required, with flags & dial codes) */}
        <MultiSelectCombobox
          label="Country *"
          items={allCountries}
          selectedCodes={countryCodes}
          isAllSelected={isAllCountries}
          onSelectionChange={onCountryChange}
          selectAllLabel="Select all 250 countries"
          allChipLabel="All Countries (Global)"
          placeholder="Select country (India, US, etc.)"
          isCountry={true}
          requireSelectAllConfirm={true}
        />

        {/* State / Province Combobox (Optional, defaults to All) */}
        <MultiSelectCombobox
          label="State / Province"
          items={statesList}
          selectedCodes={stateCodes}
          isAllSelected={isAllStates}
          onSelectionChange={onStateChange}
          selectAllLabel={`All states in ${primaryCountryCode}`}
          allChipLabel="All States"
          placeholder={isStateDisabled ? "Select country first" : "All states (or select specific)"}
          disabled={isStateDisabled}
          disabledHint="Select a single country first"
        />

        {/* City Combobox (Optional, defaults to All) */}
        <MultiSelectCombobox
          label="City / Metro"
          items={citiesList}
          selectedCodes={cityNames}
          isAllSelected={isAllCities}
          onSelectionChange={onCityChange}
          selectAllLabel={`All cities in ${primaryStateCode || primaryCountryCode}`}
          allChipLabel="All Cities"
          placeholder={
            isCityDisabled
              ? "Select state first"
              : "All cities (or select specific)"
          }
          disabled={isCityDisabled}
          disabledHint="Select a state first"
        />
      </div>

      {/* 2. Area or Locality + Postal Code Dynamic Row */}
      <PostalCodeField
        countryCode={primaryCountryCode}
        selectedCities={cityNames}
        areaValue={area}
        onAreaChange={onAreaChange}
        postalCodeValue={postalCode}
        onPostalCodeChange={onPostalCodeChange}
      />

      {/* 3. Quick Pick Chips & Reset Action */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs select-none">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted shrink-0 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-brass" />
            <span>Quick Cities:</span>
          </span>
          {quickCities.map(qc => {
            const isSelected = cityNames.includes(qc.name);
            return (
              <button
                key={qc.name}
                type="button"
                onClick={() => handleQuickCityClick(qc.name, qc.state)}
                className={`shrink-0 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer shadow-2xs ${
                  isSelected
                    ? "bg-brass/15 border-brass text-brass font-bold"
                    : "bg-surface border-line hover:border-brass/40 text-text-muted hover:text-text hover:bg-surface-2"
                }`}
              >
                {qc.name}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onResetLocation}
          className="text-xs text-text-muted hover:text-brass flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear location</span>
        </button>
      </div>
    </div>
  );
}

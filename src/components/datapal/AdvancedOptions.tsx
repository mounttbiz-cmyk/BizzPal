"use client";

import React from "react";
import { Sliders, Phone, Mail, Star, Database } from "lucide-react";
import { DIRECTORY_SOURCES } from "@/lib/datapal/constants";

interface AdvancedOptionsProps {
  mustHavePhone: boolean;
  onMustHavePhoneChange: (val: boolean) => void;
  mustHaveEmail: boolean;
  onMustHaveEmailChange: (val: boolean) => void;
  minRating: number;
  onMinRatingChange: (val: number) => void;
  selectedSources: string[];
  onSelectedSourcesChange: (sources: string[]) => void;
  className?: string;
}

export function AdvancedOptions({
  mustHavePhone,
  onMustHavePhoneChange,
  mustHaveEmail,
  onMustHaveEmailChange,
  minRating,
  onMinRatingChange,
  selectedSources,
  onSelectedSourcesChange,
  className = "",
}: AdvancedOptionsProps) {
  const toggleSource = (src: string) => {
    if (selectedSources.includes(src)) {
      onSelectedSourcesChange(selectedSources.filter(s => s !== src));
    } else {
      onSelectedSourcesChange([...selectedSources, src]);
    }
  };

  return (
    <div className={`p-4 rounded-xl border border-line bg-surface-2/30 space-y-3 text-xs ${className}`}>
      <div className="flex items-center gap-2">
        <Sliders className="w-4 h-4 text-brass" />
        <h4 className="font-bold text-text uppercase tracking-wider text-[11px]">
          Advanced Verification & Lead Delivery Rules
        </h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Must Have Phone */}
        <label className="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-line cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mustHavePhone}
            onChange={e => onMustHavePhoneChange(e.target.checked)}
            className="rounded border-line text-brass focus:ring-brass"
          />
          <Phone className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-medium text-text">Verified Phone Only</span>
        </label>

        {/* Must Have Email */}
        <label className="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-line cursor-pointer select-none">
          <input
            type="checkbox"
            checked={mustHaveEmail}
            onChange={e => onMustHaveEmailChange(e.target.checked)}
            className="rounded border-line text-brass focus:ring-brass"
          />
          <Mail className="w-3.5 h-3.5 text-text-muted" />
          <span className="font-medium text-text">Verified Email Only</span>
        </label>

        {/* Min Rating */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-line">
          <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-medium text-text shrink-0">Min Rating:</span>
          <select
            value={minRating}
            onChange={e => onMinRatingChange(Number(e.target.value))}
            className="bg-transparent text-xs text-text focus:outline-none flex-1 font-semibold"
          >
            <option value={0}>Any Rating</option>
            <option value={3.5}>3.5+ Stars</option>
            <option value={4.0}>4.0+ Stars</option>
            <option value={4.5}>4.5+ Stars</option>
          </select>
        </div>
      </div>

      {/* Directory Sources */}
      <div className="pt-1">
        <span className="text-[11px] font-semibold text-text-muted block mb-1.5">
          Directory Sources to Scrape:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {DIRECTORY_SOURCES.map(source => {
            const isSelected = selectedSources.includes(source.name);
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => toggleSource(source.name)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-brass/15 border-brass text-brass font-bold"
                    : "bg-surface border-line text-text-muted hover:text-text"
                }`}
              >
                {source.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, ChevronDown, ChevronUp, Sliders, X, Layers, Users, Briefcase, Store } from "lucide-react";

export type DetectedSearchType = "Business" | "Professional" | "Audience";

interface SearchInputStepProps {
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  selectedCategories: string[];
  onOpenCategoryPicker: () => void;
  audienceRefine: {
    ageRange?: string;
    gender?: string;
    interests?: string;
  };
  onAudienceRefineChange: (refine: { ageRange?: string; gender?: string; interests?: string }) => void;
  error?: string | null;
  className?: string;
}

const ROTATING_EXAMPLES = [
  "Lawyers in Mumbai",
  "Pan shops",
  "Gen Z fitness enthusiasts",
  "Dental & cosmetic clinics",
  "Chartered Accountants",
  "Specialty coffee roasters",
  "Working women aged 25-40",
  "Interior design studios",
  "First-time tech founders",
];

const EXAMPLE_GROUPS = {
  businesses: [
    "Pan shops",
    "Dental clinics",
    "Cafes & coffee shops",
    "Hardware stores",
    "Automobile garages",
    "Cloud kitchens",
  ],
  professionals: [
    "Lawyers & advocates",
    "Chartered accountants",
    "Physiotherapists",
    "Interior designers",
    "Architects",
    "Financial advisors",
  ],
  audiences: [
    "Gen Z fitness enthusiasts",
    "College students",
    "Working women aged 25 to 40",
    "High-net-worth investors",
    "First-time homebuyers",
  ],
};

export function SearchInputStep({
  searchQuery,
  onSearchQueryChange,
  selectedCategories,
  onOpenCategoryPicker,
  audienceRefine,
  onAudienceRefineChange,
  error,
  className = "",
}: SearchInputStepProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [userSelectedType, setUserSelectedType] = useState<DetectedSearchType | null>(null);
  const [showAudienceRefine, setShowAudienceRefine] = useState(false);

  // Rotate placeholder smoothly every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex(prev => (prev + 1) % ROTATING_EXAMPLES.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Auto-detect type based on search text keywords
  const detectedType: DetectedSearchType = useMemo(() => {
    if (userSelectedType) return userSelectedType;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return "Business";

    if (
      q.includes("gen z") ||
      q.includes("students") ||
      q.includes("women") ||
      q.includes("men") ||
      q.includes("enthusiasts") ||
      q.includes("audience") ||
      q.includes("aged") ||
      q.includes("people") ||
      q.includes("founders") ||
      q.includes("buyers") ||
      q.includes("investors")
    ) {
      return "Audience";
    }

    if (
      q.includes("lawyer") ||
      q.includes("advocate") ||
      q.includes("doctor") ||
      q.includes("physician") ||
      q.includes("accountant") ||
      q.includes("ca") ||
      q.includes("consultant") ||
      q.includes("architect") ||
      q.includes("designer") ||
      q.includes("therapist") ||
      q.includes("engineer")
    ) {
      return "Professional";
    }

    return "Business";
  }, [searchQuery, userSelectedType]);

  // Cycle type tag on click
  const handleCycleType = () => {
    const types: DetectedSearchType[] = ["Business", "Professional", "Audience"];
    const nextIdx = (types.indexOf(detectedType) + 1) % types.length;
    setUserSelectedType(types[nextIdx]);
  };

  const handleChipClick = (text: string) => {
    onSearchQueryChange(text);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Hero Search Input */}
      <div className="relative">
        <label htmlFor="universal-search-input" className="sr-only">
          What data do you need?
        </label>
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-text-muted absolute left-4 pointer-events-none" />
          <input
            id="universal-search-input"
            type="text"
            value={searchQuery}
            onChange={e => {
              onSearchQueryChange(e.target.value);
              setUserSelectedType(null); // allow auto-detection on text change
            }}
            placeholder={`e.g. "${ROTATING_EXAMPLES[placeholderIndex]}"`}
            className={`w-full pl-11 pr-28 sm:pr-32 py-3.5 sm:py-4 rounded-2xl bg-surface border text-sm sm:text-base text-text placeholder:text-text-muted/60 transition-all shadow-theme focus:outline-none focus:ring-2 focus:ring-brass ${
              error
                ? "border-rust ring-1 ring-rust/30"
                : "border-line hover:border-line-strong focus:border-brass"
            }`}
          />

          {/* Right side: Clickable Auto-detected Type Tag */}
          <div className="absolute right-3 flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchQueryChange("")}
                className="p-1 rounded-lg text-text-muted hover:text-text cursor-pointer"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleCycleType}
              title="Click to cycle entity type hint (Business / Professional / Audience)"
              className="px-2.5 py-1 rounded-xl text-[11px] font-sans font-bold uppercase tracking-wider border cursor-pointer transition-all flex items-center gap-1 bg-surface-2 hover:bg-surface border-line text-text-muted hover:text-text"
            >
              {detectedType === "Business" && <Store className="w-3 h-3 text-brass" />}
              {detectedType === "Professional" && <Briefcase className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />}
              {detectedType === "Audience" && <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />}
              <span>{detectedType}</span>
            </button>
          </div>
        </div>

        {error && (
          <p className="text-xs text-rust mt-1.5 px-1 font-medium animate-fade-in" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Optional Collapsed "Refine" row for Audience Searches */}
      {detectedType === "Audience" && (
        <div className="rounded-xl border border-line bg-surface-2/30 p-3 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAudienceRefine(prev => !prev)}
              className="text-xs font-semibold text-text flex items-center gap-1.5 cursor-pointer hover:text-brass transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-brass" />
              <span>Refine Audience Demographics (Optional)</span>
              {showAudienceRefine ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showAudienceRefine && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 animate-fade-in text-xs">
              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Age Range
                </label>
                <input
                  type="text"
                  value={audienceRefine.ageRange || ""}
                  onChange={e => onAudienceRefineChange({ ...audienceRefine, ageRange: e.target.value })}
                  placeholder="e.g. 18-25, 25-40"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Gender
                </label>
                <select
                  value={audienceRefine.gender || "All"}
                  onChange={e => onAudienceRefineChange({ ...audienceRefine, gender: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text focus:outline-none focus:ring-1 focus:ring-brass"
                >
                  <option value="All">All Genders</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-medium text-text-muted block mb-1">
                  Key Interests / Hobbies
                </label>
                <input
                  type="text"
                  value={audienceRefine.interests || ""}
                  onChange={e => onAudienceRefineChange({ ...audienceRefine, interests: e.target.value })}
                  placeholder="e.g. Fitness, Tech, Fashion"
                  className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grouped Example Chips in 3 Labeled Rows */}
      <div className="space-y-2 pt-1 text-xs select-none">
        {/* Row 1: Businesses */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted shrink-0 w-24 flex items-center gap-1">
            <Store className="w-3 h-3 text-brass" />
            <span>Businesses</span>
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {EXAMPLE_GROUPS.businesses.map(example => (
              <button
                key={example}
                type="button"
                onClick={() => handleChipClick(example)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-brass/50 text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-all cursor-pointer shadow-2xs"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Professionals */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted shrink-0 w-24 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
            <span>Pros</span>
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {EXAMPLE_GROUPS.professionals.map(example => (
              <button
                key={example}
                type="button"
                onClick={() => handleChipClick(example)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-brass/50 text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-all cursor-pointer shadow-2xs"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Audiences + Browse All Link */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted shrink-0 w-24 flex items-center gap-1">
              <Users className="w-3 h-3 text-purple-600 dark:text-purple-400" />
              <span>Audiences</span>
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {EXAMPLE_GROUPS.audiences.map(example => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleChipClick(example)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-brass/50 text-[11px] font-medium text-text-muted hover:text-text hover:bg-surface-2 transition-all cursor-pointer shadow-2xs"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Browse all categories link at the end */}
          <button
            type="button"
            onClick={onOpenCategoryPicker}
            className="text-xs font-semibold text-brass hover:underline flex items-center gap-1.5 shrink-0 cursor-pointer py-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Browse all categories ({selectedCategories.length > 0 ? `${selectedCategories.length} selected` : "80+"})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

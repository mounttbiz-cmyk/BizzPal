"use client";

import React, { useState, useMemo, useEffect } from "react";
import { X, Search, Check, Layers, AlertCircle, Trash2 } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/datapal/constants";

interface CategoryPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories: string[];
  onSelectCategories: (categories: string[]) => void;
}

export function CategoryPickerSheet({
  isOpen,
  onClose,
  selectedCategories,
  onSelectCategories,
}: CategoryPickerSheetProps) {
  const [activeClusterId, setActiveClusterId] = useState<string>(
    BUSINESS_CATEGORIES[0]?.id || "healthcare"
  );
  const [search, setSearch] = useState("");
  const [showSelectAllConfirm, setShowSelectAllConfirm] = useState(false);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // All subcategories list
  const allSubcategories = useMemo(() => {
    return BUSINESS_CATEGORIES.flatMap(c => c.subcategories);
  }, []);

  const isAllSelected = useMemo(() => {
    return (
      allSubcategories.length > 0 &&
      allSubcategories.every(sub => selectedCategories.includes(sub))
    );
  }, [allSubcategories, selectedCategories]);

  // Active cluster
  const activeCluster = useMemo(() => {
    return BUSINESS_CATEGORIES.find(c => c.id === activeClusterId) || BUSINESS_CATEGORIES[0];
  }, [activeClusterId]);

  // Filtered subcategories based on search
  const visibleSubcategories = useMemo(() => {
    if (!search.trim()) {
      return activeCluster?.subcategories || [];
    }
    const q = search.toLowerCase().trim();
    // When searching, search across all categories
    return allSubcategories.filter(sub => sub.toLowerCase().includes(q));
  }, [search, activeCluster, allSubcategories]);

  const toggleSubcategory = (name: string) => {
    if (selectedCategories.includes(name)) {
      onSelectCategories(selectedCategories.filter(c => c !== name));
    } else {
      onSelectCategories([...selectedCategories, name]);
    }
  };

  const handleSelectAllInCluster = (clusterSubcategories: string[]) => {
    const allSelected = clusterSubcategories.every(s => selectedCategories.includes(s));
    if (allSelected) {
      onSelectCategories(selectedCategories.filter(s => !clusterSubcategories.includes(s)));
    } else {
      onSelectCategories(Array.from(new Set([...selectedCategories, ...clusterSubcategories])));
    }
  };

  const handleSelectAllIndustries = () => {
    setShowSelectAllConfirm(false);
    onSelectCategories([...allSubcategories]);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Industry & Category Picker"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-2xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container: Fullscreen on mobile, max-w-2xl on desktop */}
      <div className="relative w-full sm:max-w-2xl md:max-w-3xl h-full bg-surface border-l border-line flex flex-col shadow-2xl z-10 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:px-6 border-b border-line bg-surface-2/30 flex items-center justify-between gap-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-brass" />
              <h3 className="text-sm sm:text-base font-bold text-text">
                Browse All Categories & Industries
              </h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Select specific niches or explore industry clusters to extract verified data.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close category picker"
            className="p-1.5 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-line transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Global Actions Bar */}
        <div className="p-3 sm:px-6 border-b border-line/60 bg-surface flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search all 80+ subcategories…"
              className="w-full pl-8.5 pr-8 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSelectAllConfirm(true)}
            className="text-xs text-brass hover:underline font-semibold cursor-pointer shrink-0"
          >
            {isAllSelected ? "All industries selected" : "Select all industries"}
          </button>
        </div>

        {/* Main Body: 2 Columns on desktop, 1 on mobile */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Left Column: Clusters (hidden when searching) */}
          {!search && (
            <aside className="w-44 sm:w-56 border-r border-line bg-surface-2/20 overflow-y-auto p-2 space-y-1 shrink-0 select-none">
              {BUSINESS_CATEGORIES.map(cluster => {
                const isActive = cluster.id === activeClusterId;
                const clusterSelectedCount = cluster.subcategories.filter(s =>
                  selectedCategories.includes(s)
                ).length;

                return (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => setActiveClusterId(cluster.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors flex items-center justify-between gap-2 cursor-pointer ${
                      isActive
                        ? "bg-brass/15 text-brass font-bold border border-brass/30 shadow-2xs"
                        : "text-text-muted hover:text-text hover:bg-surface-2 border border-transparent"
                    }`}
                  >
                    <span className="truncate">{cluster.name}</span>
                    {clusterSelectedCount > 0 && (
                      <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-full bg-brass text-white shrink-0">
                        {clusterSelectedCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </aside>
          )}

          {/* Right Column: Checkbox Grid */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-5">
            {!search && (
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
                <span className="text-xs font-bold text-text">
                  {activeCluster?.name} ({activeCluster?.subcategories.length})
                </span>
                <button
                  type="button"
                  onClick={() => handleSelectAllInCluster(activeCluster.subcategories)}
                  className="text-xs text-brass hover:underline cursor-pointer"
                >
                  {activeCluster.subcategories.every(s => selectedCategories.includes(s))
                    ? "Deselect group"
                    : "Select group"}
                </button>
              </div>
            )}

            {visibleSubcategories.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No matching subcategories found for &ldquo;{search}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleSubcategories.map(subName => {
                  const isChecked = selectedCategories.includes(subName);
                  return (
                    <button
                      key={subName}
                      type="button"
                      onClick={() => toggleSubcategory(subName)}
                      className={`text-left p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isChecked
                          ? "bg-brass/10 border-brass/50 text-text font-semibold shadow-2xs"
                          : "bg-surface border-line hover:border-line-strong text-text hover:bg-surface-2/60"
                      }`}
                    >
                      <span className="truncate leading-snug">{subName}</span>
                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-brass border-brass text-white"
                            : "border-line bg-surface"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {/* Footer: Selected Chips + Actions */}
        <div className="p-3 sm:px-6 border-t border-line bg-surface-2/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
            <span className="text-xs font-semibold text-text shrink-0">
              {selectedCategories.length} selected:
            </span>
            {selectedCategories.length === 0 ? (
              <span className="text-xs text-text-muted italic">None</span>
            ) : selectedCategories.length > 5 ? (
              <span className="text-xs text-text-muted font-sans">
                {selectedCategories.slice(0, 3).join(", ")} +{selectedCategories.length - 3} more
              </span>
            ) : (
              selectedCategories.map(cat => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-surface border border-line text-xs font-medium text-text shrink-0 shadow-2xs"
                >
                  <span className="truncate max-w-[120px]">{cat}</span>
                  <button
                    type="button"
                    onClick={() => toggleSubcategory(cat)}
                    className="text-text-muted hover:text-text cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 justify-end shrink-0">
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectCategories([])}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text cursor-pointer"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-xs"
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Select All Industries */}
      {showSelectAllConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text">Select All Industries?</h4>
                <p className="text-xs text-text-muted mt-0.5">
                  This will select all {allSubcategories.length} industry categories across all sectors.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSelectAllConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl border border-line text-xs font-semibold text-text hover:bg-surface-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSelectAllIndustries}
                className="px-4 py-1.5 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-xs"
              >
                Confirm Select All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

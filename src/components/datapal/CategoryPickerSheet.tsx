"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Search,
  Check,
  Layers,
  AlertCircle,
  Stethoscope,
  Utensils,
  Building2,
  Laptop,
  ShoppingBag,
  Briefcase,
  Dumbbell,
  GraduationCap,
  Truck,
  CheckCheck,
} from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/datapal/constants";

interface CategoryPickerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCategories: string[];
  onSelectCategories: (categories: string[]) => void;
}

function getClusterIcon(id: string) {
  switch (id) {
    case "healthcare":
      return <Stethoscope className="w-4 h-4 shrink-0" />;
    case "food_hospitality":
      return <Utensils className="w-4 h-4 shrink-0" />;
    case "real_estate":
      return <Building2 className="w-4 h-4 shrink-0" />;
    case "technology":
      return <Laptop className="w-4 h-4 shrink-0" />;
    case "retail_ecommerce":
      return <ShoppingBag className="w-4 h-4 shrink-0" />;
    case "professional_services":
      return <Briefcase className="w-4 h-4 shrink-0" />;
    case "fitness_beauty":
      return <Dumbbell className="w-4 h-4 shrink-0" />;
    case "education":
      return <GraduationCap className="w-4 h-4 shrink-0" />;
    case "logistics_automotive":
      return <Truck className="w-4 h-4 shrink-0" />;
    default:
      return <Layers className="w-4 h-4 shrink-0" />;
  }
}

export function CategoryPickerSheet({
  isOpen,
  onClose,
  selectedCategories,
  onSelectCategories,
}: CategoryPickerSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [activeClusterId, setActiveClusterId] = useState<string>(
    BUSINESS_CATEGORIES[0]?.id || "healthcare"
  );
  const [search, setSearch] = useState("");
  const [showSelectAllConfirm, setShowSelectAllConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Close on Escape key
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

  // Subcategories mapped with their parent cluster for search
  const allSubcategoriesWithCluster = useMemo(() => {
    return BUSINESS_CATEGORIES.flatMap(cluster =>
      cluster.subcategories.map(sub => ({
        name: sub,
        clusterName: cluster.name,
        clusterId: cluster.id,
      }))
    );
  }, []);

  // Filtered subcategories based on search
  const visibleItems = useMemo(() => {
    if (!search.trim()) {
      return (activeCluster?.subcategories || []).map(name => ({
        name,
        clusterName: activeCluster?.name || "",
        clusterId: activeCluster?.id || "",
      }));
    }
    const q = search.toLowerCase().trim();
    return allSubcategoriesWithCluster.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        item.clusterName.toLowerCase().includes(q)
    );
  }, [search, activeCluster, allSubcategoriesWithCluster]);

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

  if (!isOpen || !mounted || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Industry & Category Picker"
      className="fixed inset-0 z-[9999] flex justify-end"
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container: Fullscreen on mobile, max-w-2xl/3xl on desktop */}
      <div className="relative w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl h-full bg-surface border-l border-line flex flex-col shadow-2xl z-10 animate-fade-in overflow-hidden">
        {/* 1. Header */}
        <div className="p-4 sm:px-6 border-b border-line bg-surface flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-brass/10 border border-brass/25 flex items-center justify-center text-brass shrink-0 shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-text tracking-tight truncate">
                  Browse All Categories & Industries
                </h3>
                {selectedCategories.length > 0 && (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-brass/15 text-brass border border-brass/30">
                    {selectedCategories.length} selected
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                Select targeted market niches to compile and extract verified B2B leads.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close category picker"
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 border border-line/60 hover:border-line transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. Search & Global Actions Bar */}
        <div className="p-3 sm:px-6 border-b border-line bg-surface-2/40 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search all 80+ subcategories & niches..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass focus:border-brass transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAllSelected ? (
              <button
                type="button"
                onClick={() => onSelectCategories([])}
                className="text-xs font-semibold text-text-muted hover:text-rust transition-colors cursor-pointer"
              >
                Deselect all
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSelectAllConfirm(true)}
                className="text-xs text-brass hover:brightness-110 font-bold flex items-center gap-1 cursor-pointer transition-all"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Select all 80+ industries</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Main Body: 2 Columns */}
        <div className="flex-1 flex overflow-hidden min-h-0 bg-surface">
          {/* Left Column: Sectors List (hidden when search query is typed) */}
          {!search && (
            <aside className="w-48 sm:w-60 border-r border-line bg-surface-2/20 overflow-y-auto p-2.5 space-y-1 shrink-0 select-none">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                Industry Sectors ({BUSINESS_CATEGORIES.length})
              </div>
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
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2.5 cursor-pointer ${
                      isActive
                        ? "bg-brass/15 text-brass font-bold border border-brass/40 shadow-xs"
                        : "text-text-muted hover:text-text hover:bg-surface-2 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={isActive ? "text-brass" : "text-text-muted"}>
                        {getClusterIcon(cluster.id)}
                      </span>
                      <span className="truncate">{cluster.name}</span>
                    </div>

                    {clusterSelectedCount > 0 ? (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-brass text-white shrink-0 shadow-2xs">
                        {clusterSelectedCount}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-text-muted/60 shrink-0">
                        {cluster.subcategories.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </aside>
          )}

          {/* Right Column: Subcategories Checkbox Grid */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-surface">
            {!search && (
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-line">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text">
                    {activeCluster?.name}
                  </span>
                  <span className="text-xs text-text-muted font-mono">
                    ({activeCluster?.subcategories.length} niches)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectAllInCluster(activeCluster.subcategories)}
                  className="text-xs font-semibold text-brass hover:brightness-110 cursor-pointer transition-all"
                >
                  {activeCluster.subcategories.every(s => selectedCategories.includes(s))
                    ? "Deselect group"
                    : "Select entire group"}
                </button>
              </div>
            )}

            {visibleItems.length === 0 ? (
              <div className="p-12 text-center text-xs text-text-muted space-y-2">
                <p>No matching categories found for &ldquo;{search}&rdquo;.</p>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-brass hover:underline font-semibold"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {visibleItems.map(item => {
                  const isChecked = selectedCategories.includes(item.name);
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => toggleSubcategory(item.name)}
                      className={`text-left p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        isChecked
                          ? "bg-brass/10 border-brass/50 text-text font-semibold shadow-xs"
                          : "bg-surface border-line hover:border-line-strong text-text hover:bg-surface-2/60"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="truncate block leading-snug">{item.name}</span>
                        {search && (
                          <span className="text-[10px] text-text-muted font-mono block mt-0.5 truncate">
                            {item.clusterName}
                          </span>
                        )}
                      </div>

                      <div
                        className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? "bg-brass border-brass text-white shadow-2xs"
                            : "border-line bg-surface"
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3 text-white stroke-[2.5]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </main>
        </div>

        {/* 4. Footer: Selected Chips + Action Buttons */}
        <div className="p-3.5 sm:px-6 border-t border-line bg-surface-2/50 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 min-w-0 py-0.5">
            <span className="text-xs font-bold text-text shrink-0">
              {selectedCategories.length} selected:
            </span>
            {selectedCategories.length === 0 ? (
              <span className="text-xs text-text-muted italic">None selected</span>
            ) : selectedCategories.length > 4 ? (
              <span className="text-xs text-text-muted font-sans truncate">
                {selectedCategories.slice(0, 3).join(", ")} +{selectedCategories.length - 3} more
              </span>
            ) : (
              selectedCategories.map(cat => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-surface border border-line text-xs font-medium text-text shrink-0 shadow-2xs"
                >
                  <span className="truncate max-w-[120px]">{cat}</span>
                  <button
                    type="button"
                    onClick={() => toggleSubcategory(cat)}
                    className="text-text-muted hover:text-text cursor-pointer"
                    aria-label={`Remove ${cat}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>

          <div className="flex items-center gap-2.5 justify-end shrink-0">
            {selectedCategories.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectCategories([])}
                className="px-3 py-1.5 text-xs text-text-muted hover:text-text font-medium cursor-pointer transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl btn-gold-gradient text-[#120E05] text-xs font-bold shadow-md hover:brightness-105 active:scale-95 transition-all cursor-pointer"
            >
              {selectedCategories.length > 0
                ? `Done (${selectedCategories.length} selected)`
                : "Done"}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Select All Industries */}
      {showSelectAllConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
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
                className="px-3.5 py-1.5 rounded-xl border border-line text-xs font-semibold text-text hover:bg-surface-2 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSelectAllIndustries}
                className="px-4 py-1.5 rounded-xl btn-gold-gradient text-[#120E05] text-xs font-bold hover:brightness-105 cursor-pointer shadow-xs transition-all"
              >
                Confirm Select All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

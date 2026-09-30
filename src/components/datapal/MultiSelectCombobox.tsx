"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, X, Check, Search, Plus, AlertCircle } from "lucide-react";
import { LocationItem } from "@/lib/datapal/locationService";
import { CountryFlag } from "./CountryOption";

interface MultiSelectComboboxProps {
  label: string;
  items: LocationItem[];
  selectedCodes: string[];
  isAllSelected: boolean;
  onSelectionChange: (codes: string[], isAll: boolean) => void;
  selectAllLabel: string;
  allChipLabel: string;
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
  isCountry?: boolean;
  requireSelectAllConfirm?: boolean;
  className?: string;
}

export function MultiSelectCombobox({
  label,
  items,
  selectedCodes,
  isAllSelected,
  onSelectionChange,
  selectAllLabel,
  allChipLabel,
  placeholder = "Select options...",
  disabled = false,
  disabledHint,
  isCountry = false,
  requireSelectAllConfirm = false,
  className = "",
}: MultiSelectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase().trim();
    return items.filter(
      item =>
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.dialCode && item.dialCode.includes(q))
    );
  }, [items, search]);

  // Is exact search match present
  const hasExactMatch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return items.some(i => i.name.toLowerCase() === q);
  }, [items, search]);

  const handleToggleItem = (code: string) => {
    if (isAllSelected) {
      // Switching from all selected to individual selection
      const remaining = items.map(i => i.code).filter(c => c !== code);
      onSelectionChange(remaining, false);
      return;
    }

    if (selectedCodes.includes(code)) {
      onSelectionChange(selectedCodes.filter(c => c !== code), false);
    } else {
      const next = [...selectedCodes, code];
      const allCodesMatch = items.length > 0 && next.length >= items.length;
      onSelectionChange(next, allCodesMatch);
    }
  };

  const handleSelectAllClick = () => {
    if (isAllSelected) {
      onSelectionChange([], false);
    } else {
      if (requireSelectAllConfirm) {
        setShowConfirmModal(true);
      } else {
        onSelectionChange(items.map(i => i.code), true);
      }
    }
  };

  const handleConfirmSelectAll = () => {
    setShowConfirmModal(false);
    onSelectionChange(items.map(i => i.code), true);
  };

  const handleAddCustom = () => {
    const trimmed = search.trim();
    if (!trimmed) return;
    if (!selectedCodes.includes(trimmed)) {
      onSelectionChange([...selectedCodes, trimmed], false);
    }
    setSearch("");
  };

  const handleRemoveChip = (e: React.MouseEvent, codeToRemove: string) => {
    e.stopPropagation();
    if (isAllSelected) {
      onSelectionChange([], false);
    } else {
      onSelectionChange(selectedCodes.filter(c => c !== codeToRemove), false);
    }
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectionChange([], false);
  };

  // Resolve names for selected codes
  const selectedItems = useMemo(() => {
    return selectedCodes.map(code => {
      const found = items.find(i => i.code === code);
      return found ? found : { code, name: code };
    });
  }, [selectedCodes, items]);

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-text flex items-center gap-1.5">
          <span>{label}</span>
          {isAllSelected && (
            <span className="text-[10px] font-sans font-bold px-1.5 py-0.2 rounded bg-brass/15 text-brass">
              All selected
            </span>
          )}
        </label>
        {(selectedCodes.length > 0 || isAllSelected) && !disabled && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[11px] text-text-muted hover:text-brass transition-colors cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Main Trigger Box (44px min height) */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        onClick={() => {
          if (!disabled) setIsOpen(prev => !prev);
        }}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={e => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`min-h-[44px] w-full px-3 py-1.5 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer select-none ${
          disabled
            ? "bg-surface-2/40 border-line/60 opacity-60 cursor-not-allowed"
            : isOpen
            ? "bg-surface border-brass ring-1 ring-brass/30"
            : "bg-surface hover:bg-surface-2/40 border-line hover:border-line-strong"
        }`}
      >
        {/* Selected Chips Area */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0 pr-1">
          {disabled ? (
            <span className="text-xs text-text-muted/70 truncate">
              {disabledHint || placeholder}
            </span>
          ) : isAllSelected ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brass/15 text-brass border border-brass/30 text-xs font-bold shadow-2xs">
              <span>{allChipLabel}</span>
              <button
                type="button"
                onClick={e => handleRemoveChip(e, "ALL")}
                className="hover:opacity-75 cursor-pointer ml-0.5"
                aria-label={`Remove ${allChipLabel}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ) : selectedItems.length > 0 ? (
            <>
              {selectedItems.slice(0, 3).map(item => (
                <span
                  key={item.code}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-surface-2 border border-line text-xs font-medium text-text shadow-2xs"
                >
                  {isCountry && <CountryFlag countryCode={item.code} />}
                  <span className="truncate max-w-[120px]">{item.name}</span>
                  <button
                    type="button"
                    onClick={e => handleRemoveChip(e, item.code)}
                    className="text-text-muted hover:text-text cursor-pointer"
                    aria-label={`Remove ${item.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedItems.length > 3 && (
                <span className="text-[11px] font-sans font-bold text-text-muted px-1">
                  +{selectedItems.length - 3} more
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-text-muted/60">{placeholder}</span>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-text-muted transition-transform shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 top-full mt-1.5 bg-surface border border-line rounded-2xl shadow-xl z-50 flex flex-col max-h-72 overflow-hidden animate-fade-in"
        >
          {/* Search Header inside dropdown */}
          <div className="p-2.5 border-b border-line bg-surface-2/30 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}…`}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass"
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
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {/* First Row: Select All */}
            {!search && (
              <button
                type="button"
                role="option"
                aria-selected={isAllSelected}
                onClick={handleSelectAllClick}
                className={`w-full text-left px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                  isAllSelected
                    ? "bg-brass/15 text-brass font-bold"
                    : "text-text hover:bg-surface-2"
                }`}
              >
                <span>{selectAllLabel}</span>
                {isAllSelected && <Check className="w-4 h-4 text-brass" />}
              </button>
            )}

            {filteredItems.length === 0 ? (
              <div className="p-3 text-center text-xs text-text-muted">
                No matching {label.toLowerCase()} found.
              </div>
            ) : (
              filteredItems.map(item => {
                const isSelected = isAllSelected || selectedCodes.includes(item.code);
                return (
                  <button
                    key={item.code}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleToggleItem(item.code)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-brass/10 text-text font-semibold"
                        : "text-text hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isCountry && <CountryFlag countryCode={item.code} />}
                      <span className="truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.dialCode && (
                        <span className="text-[10px] font-mono text-text-muted">
                          {item.dialCode}
                        </span>
                      )}
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-brass border-brass text-white"
                            : "border-line bg-surface"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })
            )}

            {/* Custom Typed Option Fallback */}
            {search.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={handleAddCustom}
                className="w-full text-left px-2.5 py-2 rounded-xl text-xs text-brass hover:bg-brass/10 flex items-center gap-1.5 font-medium border-t border-line/60 cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Use &ldquo;{search.trim()}&rdquo; as typed</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Select All Countries */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-2xs"
        >
          <div className="w-full max-w-sm rounded-2xl bg-surface border border-line p-5 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text">Select All Countries?</h4>
                <p className="text-xs text-text-muted mt-0.5">
                  Selecting all 250 countries will perform a global extraction which may take longer.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-1.5 rounded-xl border border-line text-xs font-semibold text-text hover:bg-surface-2 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSelectAll}
                className="px-4 py-1.5 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-xs"
              >
                Confirm All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

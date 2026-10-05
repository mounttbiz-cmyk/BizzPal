"use client";

import React from "react";
import { Search, Database, History } from "lucide-react";

export type DataPalTab = "search" | "leads" | "history";

interface SearchTabsProps {
  activeTab: DataPalTab;
  onTabChange: (tab: DataPalTab) => void;
  leadsCount: number;
  historyCount: number;
  className?: string;
}

export function SearchTabs({
  activeTab,
  onTabChange,
  leadsCount,
  historyCount,
  className = "",
}: SearchTabsProps) {
  const tabs = [
    {
      id: "search" as const,
      label: "Search",
      icon: Search,
      count: undefined,
    },
    {
      id: "leads" as const,
      label: "Data",
      icon: Database,
      count: leadsCount,
    },
    {
      id: "history" as const,
      label: "History",
      icon: History,
      count: historyCount,
    },
  ];

  return (
    <nav
      aria-label="DataPal engine navigation tabs"
      className={`flex items-center gap-1 sm:gap-2 border-b border-line pb-0 select-none ${className}`}
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`relative pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              isActive
                ? "text-brass font-bold"
                : "text-text-muted hover:text-text"
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-full border ${
                  isActive
                    ? "bg-brass/15 border-brass/40 text-brass"
                    : "bg-surface-2 border-line text-text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}

            {/* Active Underline Indicator */}
            {isActive && (
              <span
                aria-hidden="true"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brass rounded-t-full shadow-xs"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

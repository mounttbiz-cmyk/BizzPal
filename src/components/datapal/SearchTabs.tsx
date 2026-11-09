"use client";

import React from "react";

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
    { id: "search" as const, label: "Search", count: undefined },
    { id: "leads" as const, label: "Data", count: leadsCount },
    { id: "history" as const, label: "History", count: historyCount },
  ];

  return (
    <nav aria-label="DataPal sections" className={`flex items-center gap-1 border-b border-line ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 pb-2.5 -mb-px text-sm border-b-2 cursor-pointer ${
            activeTab === tab.id
              ? "border-brass text-text font-semibold"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          {tab.label}
          {tab.count ? <span className="ml-1.5 text-text-muted font-normal">{tab.count}</span> : null}
        </button>
      ))}
    </nav>
  );
}

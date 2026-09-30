"use client";

import React from "react";
import { Database } from "lucide-react";

interface DataPalHeaderProps {
  className?: string;
}

export function DataPalHeader({ className = "" }: DataPalHeaderProps) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-line shrink-0 select-none ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass shrink-0 shadow-2xs">
          <Database className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-text truncate tracking-tight font-sans">
              DataPal Extraction Engine
            </h1>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted shrink-0">
              Data scraping
            </span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live</span>
            </span>
          </div>
          <p className="text-xs text-text-muted truncate mt-0.5">
            Search any business, professional or audience and get verified contact data
          </p>
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import { Play, ArrowRight, CheckSquare, Sparkles } from "lucide-react";

interface PlaybookActionsProps {
  playbooks?: string[];
  onSelectPlaybook: (playbook: string) => void;
  disabled?: boolean;
}

export function PlaybookActions({
  playbooks = [],
  onSelectPlaybook,
  disabled = false,
}: PlaybookActionsProps) {
  if (!playbooks || playbooks.length === 0) return null;

  return (
    <div className="mt-4 pt-3.5 border-t border-line/50 space-y-2.5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-brass" />
        <span>Recommended Playbooks</span>
      </div>

      {/* Grid on desktop, full-width stacked on mobile with >=44px touch targets */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
        {playbooks.map((playbook, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPlaybook(playbook)}
            className="w-full sm:w-auto min-h-[44px] sm:min-h-0 text-left px-3.5 py-2.5 sm:py-2 rounded-xl bg-surface border border-line hover:border-brass/50 text-text hover:text-brass text-xs font-semibold cursor-pointer transition-all flex items-center justify-between sm:justify-start gap-2.5 group shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-lg bg-surface-2 flex items-center justify-center text-text-muted group-hover:text-brass transition-colors shrink-0">
                <Play className="w-2.5 h-2.5 fill-current" />
              </span>
              <span className="leading-snug">{playbook}</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-text-muted/60 group-hover:text-brass group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

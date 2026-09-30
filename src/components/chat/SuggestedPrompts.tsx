"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface SuggestedPromptsProps {
  prompts: string[];
  onSelectPrompt: (prompt: string) => void;
  disabled?: boolean;
}

export function SuggestedPrompts({
  prompts,
  onSelectPrompt,
  disabled = false,
}: SuggestedPromptsProps) {
  if (!prompts || prompts.length === 0) return null;

  return (
    <div className="relative px-4 sm:px-6 pt-2 pb-1.5 border-b border-line/40 shrink-0">
      {/* Container: wrapped chips or clean horizontal flow with no clipping */}
      <div className="max-w-[820px] mx-auto w-full flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1.5 select-none">
          <Sparkles className="w-3 h-3 text-brass" />
          <span className="hidden sm:inline">Suggested:</span>
        </span>

        <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap">
          {prompts.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPrompt(prompt)}
              className="shrink-0 max-w-[280px] sm:max-w-none px-3 py-1.5 rounded-full bg-surface-2/60 hover:bg-surface border border-line hover:border-brass/50 text-[11px] font-medium text-text-muted hover:text-text cursor-pointer transition-all truncate whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
              title={prompt}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

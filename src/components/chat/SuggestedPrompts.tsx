"use client";

import React from "react";

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
    <div className="px-3 sm:px-6 lg:px-8 py-2 border-t border-line/40 bg-surface/50 shrink-0">
      <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-text-muted shrink-0 select-none mr-1">
          Quick Inquiries:
        </span>

        {prompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-2 border border-line hover:border-brass/50 text-xs text-text-muted hover:text-text cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs leading-snug"
            title={prompt}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

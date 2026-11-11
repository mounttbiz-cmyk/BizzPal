"use client";

import React from "react";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import { Pencil } from "lucide-react";

interface AdvisorHeaderProps {
  activeAgent: AgentMeta;
  onCustomize: () => void;
  onNewChat?: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  historyCount: number;
  className?: string;
}

export function AdvisorHeader({
  activeAgent,
  onCustomize,
  onNewChat,
  onToggleHistory,
  isHistoryOpen,
  historyCount,
  className = "",
}: AdvisorHeaderProps) {
  return (
    <header
      aria-label="Current advisor"
      className={`px-5 sm:px-7 py-3.5 border-b border-line bg-surface flex items-center justify-between gap-3 shrink-0 select-none ${className}`}
    >
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <span className="w-10 h-10 rounded-full bg-surface-2 text-brass flex items-center justify-center shrink-0">
          <AgentAvatarIcon iconName={activeAgent.avatar} className="w-5 h-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-semibold text-text truncate">{activeAgent.name}</h2>
            <button
              type="button"
              onClick={onCustomize}
              aria-label={`Rename ${activeAgent.name}`}
              title={`Rename ${activeAgent.name}`}
              className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
          <p title={activeAgent.summary} className="text-sm text-text-muted truncate max-w-2xl">
            {activeAgent.summary}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            aria-label="Start a new chat"
            className="px-3.5 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
          >
            New chat
          </button>
        )}

        <button
          type="button"
          onClick={onToggleHistory}
          aria-label={isHistoryOpen ? "Close chat history" : "Open chat history"}
          aria-expanded={isHistoryOpen}
          className={`px-3.5 py-2 rounded-xl border text-sm cursor-pointer ${
            isHistoryOpen
              ? "border-line-strong bg-surface-2 text-text"
              : "border-line text-text hover:bg-surface-2"
          }`}
        >
          History{historyCount > 0 ? ` (${historyCount})` : ""}
        </button>
      </div>
    </header>
  );
}

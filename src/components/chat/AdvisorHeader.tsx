"use client";

import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import { History, Pencil, SquarePen } from "lucide-react";

interface AdvisorHeaderProps {
  activeAgent: AgentMeta;
  onCustomize: () => void;
  onNewChat?: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
  historyCount: number;
  className?: string;
}

/** One slim line above the conversation: who you are talking to, and the two things you might do next. */
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
      className={`h-14 px-4 sm:px-5 border-b border-line flex items-center justify-between gap-3 shrink-0 select-none ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="w-8 h-8 rounded-lg bg-surface-2 text-brass flex items-center justify-center shrink-0">
          <AgentAvatarIcon iconName={activeAgent.avatar} className="w-4 h-4" />
        </span>
        <div className="min-w-0 flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-text truncate shrink-0 max-w-[40vw]">{activeAgent.name}</h2>
          <p title={activeAgent.summary} className="hidden lg:block text-xs text-text-muted truncate">
            {activeAgent.badge || activeAgent.summary}
          </p>
        </div>
        <button
          type="button"
          onClick={onCustomize}
          aria-label={`Rename ${activeAgent.name}`}
          title={`Rename ${activeAgent.name}`}
          className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer shrink-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            title="Start a new chat"
            className="h-8 px-2.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-2 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <SquarePen className="w-4 h-4" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleHistory}
          aria-expanded={isHistoryOpen}
          title={isHistoryOpen ? "Close history" : "Show this chat's history"}
          className={`h-8 px-2.5 rounded-lg text-sm inline-flex items-center gap-1.5 cursor-pointer ${
            isHistoryOpen ? "bg-surface-2 text-text" : "text-text-muted hover:text-text hover:bg-surface-2"
          }`}
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
          {historyCount > 0 && <span className="text-xs text-text-muted tabular-nums">{historyCount}</span>}
        </button>
      </div>
    </header>
  );
}

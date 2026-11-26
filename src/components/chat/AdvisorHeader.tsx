"use client";

import { History, SquarePen } from "lucide-react";
import { AgentMeta } from "./types";
import { AdvisorPicker } from "./AdvisorPicker";

interface AdvisorHeaderProps {
  agents: AgentMeta[];
  activeAgent: AgentMeta;
  /** The open chat's name, once it has been saved */
  chatTitle?: string | null;
  onSelectAgent: (id: string) => void;
  onRenameAgent: (agent: AgentMeta) => void;
  onNewChat: () => void;
  onOpenHistory: () => void;
  historyOpen?: boolean;
  /** Whether there is anything in this chat (New chat is pointless on an empty one) */
  hasMessages: boolean;
}

/** One slim bar: the advisor (with a switcher), the chat's name, history and a new chat. */
export function AdvisorHeader({ agents, activeAgent, chatTitle, onSelectAgent, onRenameAgent, onNewChat, onOpenHistory, historyOpen = false, hasMessages }: AdvisorHeaderProps) {
  return (
    <header aria-label="Conversation" className="h-14 px-3 sm:px-5 border-b border-line flex items-center justify-between gap-3 shrink-0">
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <AdvisorPicker agents={agents} active={activeAgent} onSelect={onSelectAgent} onRename={onRenameAgent} />
        {chatTitle && (
          <span className="hidden md:flex items-center min-w-0 text-sm text-text-muted">
            <span className="mx-2 text-line-strong">/</span>
            <span className="truncate">{chatTitle}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onOpenHistory}
          aria-pressed={historyOpen}
          className={`h-9 px-3 rounded-lg text-sm inline-flex items-center gap-2 cursor-pointer ${historyOpen ? "bg-surface-2 text-text" : "text-text-muted hover:text-text hover:bg-surface-2"}`}
        >
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">History</span>
        </button>
        {hasMessages && (
          <button
            type="button"
            onClick={onNewChat}
            className="h-9 px-3 rounded-lg border border-line text-sm text-text hover:bg-surface-2 inline-flex items-center gap-2 cursor-pointer"
          >
            <SquarePen className="w-4 h-4" />
            <span className="hidden sm:inline">New chat</span>
          </button>
        )}
      </div>
    </header>
  );
}

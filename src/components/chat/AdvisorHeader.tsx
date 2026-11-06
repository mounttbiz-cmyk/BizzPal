"use client";

import React from "react";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import { Pencil, MessageSquare, Plus } from "lucide-react";

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
      aria-label="Active Executive Desk Header"
      className={`px-4 sm:px-6 py-3.5 border-b border-line bg-surface flex items-center justify-between gap-3 shrink-0 select-none ${className}`}
    >
      {/* Left: Avatar (44px) + Name + Inline Rename + Live Indicator + Summary */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* 44px Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-brass shadow-2xs">
            <AgentAvatarIcon iconName={activeAgent.avatar} className="w-5 h-5" />
          </div>
          <span
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface shadow-xs"
          />
        </div>

        {/* Title, Inline Rename, Live Status, and Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-text truncate tracking-tight">
              {activeAgent.name}
            </h2>

            {/* Subtle Inline Rename Button */}
            <button
              type="button"
              onClick={onCustomize}
              aria-label={`Rename ${activeAgent.name}`}
              title={`Rename ${activeAgent.name}`}
              className="p-1 rounded-md text-text-muted hover:text-brass hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {/* Subtle Live Telemetry Indicator */}
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 shrink-0 ml-1"
              title="Verified enterprise telemetry online"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[10px] tracking-wide uppercase font-mono">Live</span>
            </span>
          </div>

          {/* Clean one-line summary */}
          <p
            title={activeAgent.summary}
            className="text-[11px] sm:text-xs text-text-muted truncate mt-0.5 max-w-xl cursor-default"
          >
            {activeAgent.summary}
          </p>
        </div>
      </div>

      {/* Right: New Chat + History Toggle Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        {onNewChat && (
          <button
            type="button"
            onClick={onNewChat}
            aria-label="Start New Chat"
            title="Start a new conversation thread"
            className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-surface-2 text-xs font-semibold text-text-muted hover:text-text transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
          >
            <Plus className="w-3.5 h-3.5 text-brass" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        )}

        <button
          type="button"
          onClick={onToggleHistory}
          aria-label={isHistoryOpen ? "Close Chat History" : "Open Chat History"}
          aria-expanded={isHistoryOpen}
          title={isHistoryOpen ? "Close Chat History" : "Open Chat History"}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
            isHistoryOpen
              ? "bg-brass/15 border-brass/50 text-brass"
              : "bg-surface border border-line text-text-muted hover:text-text hover:border-line-strong"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">History</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-surface-2 border border-line text-text font-bold">
            {historyCount}
          </span>
        </button>
      </div>
    </header>
  );
}

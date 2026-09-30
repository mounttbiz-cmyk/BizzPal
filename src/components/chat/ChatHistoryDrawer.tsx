"use client";

import React, { useEffect } from "react";
import { ChatMessage, AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import {
  MessageSquare,
  X,
  Pencil,
  Clock,
  Sparkles,
  MessagesSquare,
} from "lucide-react";

interface ChatHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  activeAgent: AgentMeta;
  onCustomizeAgent: (agent: AgentMeta) => void;
  onSelectMessage?: (messageId: string) => void;
}

export function ChatHistoryDrawer({
  isOpen,
  onClose,
  messages,
  activeAgent,
  onCustomizeAgent,
  onSelectMessage,
}: ChatHistoryDrawerProps) {
  // Listen for Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chat History Drawer"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body (~340px wide on desktop, 85vw on mobile) */}
      <div className="relative w-full max-w-[340px] sm:max-w-[360px] h-full bg-surface border-l border-line p-4 sm:p-5 flex flex-col shadow-2xl z-10 animate-fade-in overflow-hidden">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brass" />
            <h3 className="text-sm font-bold text-text">Chat History</h3>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted">
              {messages.length} msgs
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Chat History"
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-line transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Advisor Profile Card & Edit Shortcut */}
        <div className="my-3 p-3 rounded-xl bg-surface-2/40 border border-line flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center text-brass shrink-0 shadow-2xs">
              <AgentAvatarIcon iconName={activeAgent.avatar} className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-text truncate">{activeAgent.name}</div>
              <div className="text-[10px] text-text-muted truncate">{activeAgent.role}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onCustomizeAgent(activeAgent)}
            className="px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-brass/40 text-[10px] font-semibold text-text-muted hover:text-brass flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
            title={`Customize ${activeAgent.name}`}
          >
            <Pencil className="w-3 h-3 text-brass" />
            <span>Edit</span>
          </button>
        </div>

        {/* Message History List or Empty State */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-text-muted">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-line flex items-center justify-center text-text-muted/60">
                <MessagesSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text">No conversation yet</p>
                <p className="text-[11px] text-text-muted/80 leading-relaxed max-w-[220px]">
                  Send a query to {activeAgent.name} to start your strategic session.
                </p>
              </div>
            </div>
          ) : (
            messages.map(msg => {
              const isUser = msg.sender === "user";
              const preview = msg.content.replace(/\s+/g, " ").trim();

              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    if (onSelectMessage) {
                      onSelectMessage(msg.id);
                    } else {
                      document
                        .getElementById(msg.id)
                        ?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                  }}
                  className="w-full text-left p-3 rounded-xl bg-surface-2/30 hover:bg-surface-2/80 border border-line hover:border-brass/40 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        isUser ? "text-brass" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isUser ? "You" : activeAgent.name}
                    </span>
                    <span className="text-[9px] text-text-muted font-mono shrink-0 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2 group-hover:text-text transition-colors">
                    {preview}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

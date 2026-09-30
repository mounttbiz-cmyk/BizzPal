"use client";

import React, { useEffect } from "react";
import { ChatMessage, AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import {
  MessageSquare,
  X,
  Pencil,
  Clock,
  MessagesSquare,
} from "lucide-react";
import { getAdvisorGreeting } from "@/lib/advisors";

interface ChatHistoryProps {
  messages: ChatMessage[];
  activeAgent: AgentMeta;
  onCustomizeAgent: (agent: AgentMeta) => void;
  onSelectMessage?: (messageId: string) => void;
  onClose: () => void;
}

interface ChatHistoryDrawerProps extends ChatHistoryProps {
  isOpen: boolean;
}

function getDisplayContent(msg: ChatMessage, activeAgent: AgentMeta): string {
  if (msg.sender === "user") {
    return msg.content;
  }
  if (msg.id.startsWith("msg_init_")) {
    return getAdvisorGreeting(activeAgent);
  }
  return msg.content
    .replace(/\bAstra, your CEO AI\b/gi, `${activeAgent.name}, your ${activeAgent.role}`)
    .replace(/\bI am Astra\b/gi, `I am ${activeAgent.name}`)
    .replace(/\bAstra\b/g, activeAgent.name);
}

/**
 * Desktop Inline Panel: Embeds directly inside the workspace 2-pane / 3-pane flex row.
 * No backdrop, no dimming overlay, completely interactive.
 */
export function ChatHistoryPanel({
  messages,
  activeAgent,
  onCustomizeAgent,
  onSelectMessage,
  onClose,
}: ChatHistoryProps) {
  return (
    <aside
      aria-label="Chat History Panel"
      className="hidden xl:flex w-80 shrink-0 bg-surface border border-line rounded-2xl flex-col shadow-theme animate-fade-in overflow-hidden select-none"
    >
      {/* Header */}
      <div className="p-3.5 border-b border-line bg-surface-2/30 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-brass" />
          <h3 className="text-xs font-bold text-text">Chat History</h3>
          <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted">
            {messages.length} msgs
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close Chat History"
          className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-line transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Active Advisor Profile Card & Edit Shortcut */}
      <div className="p-3 mx-3 my-2.5 rounded-xl bg-surface-2/40 border border-line flex items-center justify-between gap-2.5 shrink-0">
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
          className="px-2 py-1 rounded-lg bg-surface border border-line hover:border-brass/40 text-[10px] font-semibold text-text-muted hover:text-brass flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
          title={`Customize ${activeAgent.name}`}
        >
          <Pencil className="w-3 h-3 text-brass" />
          <span>Edit</span>
        </button>
      </div>

      {/* Message History List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-0">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-text-muted">
            <MessagesSquare className="w-8 h-8 text-text-muted/50" />
            <p className="text-xs font-bold text-text">No conversation yet</p>
            <p className="text-[11px] text-text-muted/70 leading-relaxed max-w-[200px]">
              Send a message to start your executive advisory thread.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isUser = msg.sender === "user";
            const preview = getDisplayContent(msg, activeAgent).replace(/\s+/g, " ").trim();

            return (
              <button
                key={msg.id}
                type="button"
                onClick={() => {
                  if (onSelectMessage) {
                    onSelectMessage(msg.id);
                  } else {
                    document.getElementById(msg.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }
                }}
                className="w-full text-left p-2.5 rounded-xl bg-surface-2/30 hover:bg-surface-2/80 border border-line hover:border-brass/40 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide ${
                      isUser ? "text-brass" : "text-emerald-700 dark:text-emerald-400"
                    }`}
                  >
                    {isUser ? "You" : activeAgent.name}
                  </span>
                  <span className="text-[9px] text-text-muted font-sans shrink-0 flex items-center gap-1">
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
    </aside>
  );
}

/**
 * Mobile & Tablet Overlay Drawer (< 1280px):
 * Opens as a sleek slide-over sheet with a subtle backdrop.
 */
export function ChatHistoryDrawer({
  isOpen,
  onClose,
  messages,
  activeAgent,
  onCustomizeAgent,
  onSelectMessage,
}: ChatHistoryDrawerProps) {
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
      className="xl:hidden fixed inset-0 z-50 flex justify-end"
    >
      {/* Subtle Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Body */}
      <div className="relative w-full max-w-[320px] sm:max-w-[360px] h-full bg-surface border-l border-line p-4 sm:p-5 flex flex-col shadow-2xl z-10 animate-fade-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-line shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brass" />
            <h3 className="text-sm font-bold text-text">Chat History</h3>
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted">
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

        {/* Advisor Profile Card */}
        <div className="my-3 p-3 rounded-xl bg-surface-2/40 border border-line flex items-center justify-between gap-2.5 shrink-0">
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
            onClick={() => {
              onCustomizeAgent(activeAgent);
              onClose();
            }}
            className="px-2 py-1 rounded-lg bg-surface border border-line hover:border-brass/40 text-[10px] font-semibold text-text-muted hover:text-brass flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
            title={`Customize ${activeAgent.name}`}
          >
            <Pencil className="w-3 h-3 text-brass" />
            <span>Edit</span>
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 text-text-muted">
              <MessagesSquare className="w-8 h-8 text-text-muted/50" />
              <p className="text-xs font-bold text-text">No conversation yet</p>
              <p className="text-[11px] text-text-muted/70 leading-relaxed max-w-[200px]">
                Send a message to {activeAgent.name} to start your thread.
              </p>
            </div>
          ) : (
            messages.map(msg => {
              const isUser = msg.sender === "user";
              const preview = getDisplayContent(msg, activeAgent).replace(/\s+/g, " ").trim();

              return (
                <button
                  key={msg.id}
                  type="button"
                  onClick={() => {
                    if (onSelectMessage) {
                      onSelectMessage(msg.id);
                    } else {
                      document.getElementById(msg.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                    onClose();
                  }}
                  className="w-full text-left p-3 rounded-xl bg-surface-2/30 hover:bg-surface-2/80 border border-line hover:border-brass/40 transition-all cursor-pointer group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        isUser ? "text-brass" : "text-emerald-700 dark:text-emerald-400"
                      }`}
                    >
                      {isUser ? "You" : activeAgent.name}
                    </span>
                    <span className="text-[9px] text-text-muted font-sans shrink-0 flex items-center gap-1">
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

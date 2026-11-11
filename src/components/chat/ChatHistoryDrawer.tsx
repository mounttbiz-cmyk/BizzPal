"use client";

import React, { useEffect } from "react";
import { ChatMessage, AgentMeta } from "./types";
import { X } from "lucide-react";
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

function HistoryList({
  messages,
  activeAgent,
  onSelect,
}: {
  messages: ChatMessage[];
  activeAgent: AgentMeta;
  onSelect: (id: string) => void;
}) {
  if (messages.length === 0) {
    return (
      <p className="text-sm text-text-muted leading-relaxed px-2 py-6">
        Nothing here yet. Send a message to {activeAgent.name} to start.
      </p>
    );
  }

  return (
    <ul className="space-y-0.5">
      {messages.map(msg => {
        const isUser = msg.sender === "user";
        const preview = getDisplayContent(msg, activeAgent).replace(/\s+/g, " ").trim();

        return (
          <li key={msg.id}>
            <button
              type="button"
              onClick={() => onSelect(msg.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-surface-2 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className={`text-xs font-medium ${isUser ? "text-brass" : "text-text"}`}>
                  {isUser ? "You" : activeAgent.name}
                </span>
                <span className="text-xs text-text-muted shrink-0">{msg.timestamp}</span>
              </div>
              <p className="text-sm text-text-muted leading-snug line-clamp-2">{preview}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Desktop inline panel: sits next to the chat, no dimming, fully interactive.
 */
export function ChatHistoryPanel({ messages, activeAgent, onSelectMessage, onClose }: ChatHistoryProps) {
  const select = (id: string) => {
    if (onSelectMessage) onSelectMessage(id);
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <aside
      aria-label="Chat history"
      className="hidden xl:flex w-80 shrink-0 bg-surface border border-line rounded-2xl shadow-sm flex-col overflow-hidden select-none"
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
        <h3 className="text-base font-semibold text-text">History</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close history"
          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3 min-h-0">
        <HistoryList messages={messages} activeAgent={activeAgent} onSelect={select} />
      </div>
    </aside>
  );
}

/**
 * Mobile and tablet slide-over (below 1280px).
 */
export function ChatHistoryDrawer({ isOpen, onClose, messages, activeAgent, onSelectMessage }: ChatHistoryDrawerProps) {
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

  const select = (id: string) => {
    if (onSelectMessage) onSelectMessage(id);
    else document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Chat history" className="xl:hidden fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-[340px] h-full bg-surface border-l border-line flex flex-col shadow-lg z-10 overflow-hidden">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-text">History</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close history"
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 min-h-0">
          <HistoryList messages={messages} activeAgent={activeAgent} onSelect={select} />
        </div>
      </div>
    </div>
  );
}

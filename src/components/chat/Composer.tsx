"use client";

import React, { useRef, useEffect } from "react";
import { Send, CheckCircle2, Paperclip, Sparkles } from "lucide-react";
import { AgentMeta } from "./types";

interface ComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  activeAgent: AgentMeta;
  isTyping: boolean;
  className?: string;
}

export function Composer({
  value,
  onChange,
  onSend,
  activeAgent,
  isTyping,
  className = "",
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea up to max 160px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const nextHeight = Math.min(textareaRef.current.scrollHeight, 160);
      textareaRef.current.style.height = `${Math.max(nextHeight, 44)}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isTyping) {
        onSend();
      }
    }
  };

  const shortRole = activeAgent.role.replace(" AI", "");

  return (
    <div
      className={`border-t border-line bg-surface/95 backdrop-blur-md px-4 sm:px-6 py-3 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] ${className}`}
    >
      <div className="max-w-[820px] mx-auto w-full space-y-2">
        <form
          onSubmit={e => {
            e.preventDefault();
            if (value.trim() && !isTyping) onSend();
          }}
          className="relative flex items-end gap-2 bg-surface-2 border border-line rounded-2xl p-1.5 focus-within:border-brass/70 focus-within:ring-1 focus-within:ring-brass/30 transition-all shadow-theme"
        >
          {/* Quick context / attach action */}
          <button
            type="button"
            aria-label="Operational shortcut"
            title="Operational shortcut"
            className="p-2.5 rounded-xl text-text-muted hover:text-brass hover:bg-surface transition-colors cursor-pointer shrink-0 mb-0.5"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* Auto-growing Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${activeAgent.name} (${shortRole}) about strategy, runway, financial models, or execution…`}
            aria-label={`Ask ${activeAgent.name}`}
            className="flex-1 max-h-[160px] py-2 px-1 bg-transparent text-xs sm:text-sm text-text placeholder:text-text-muted/60 focus:outline-none resize-none leading-relaxed"
          />

          {/* Send Button: Desktop with label + icon, Mobile round icon button */}
          <button
            type="submit"
            disabled={!value.trim() || isTyping}
            aria-label="Send message"
            className="h-10 sm:h-10 px-3 sm:px-4 rounded-xl bg-brass text-white text-xs sm:text-sm font-bold shadow-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all inline-flex items-center justify-center gap-1.5 shrink-0 mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer Hint and Status Chip */}
        <div className="flex items-center justify-between text-[11px] text-text-muted px-1.5 select-none">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="truncate">Verified company ledger & telemetry synced</span>
          </div>

          <span className="hidden sm:inline font-mono text-[10px] text-text-muted/80">
            Enter to send · Shift+Enter for new line
          </span>
        </div>
      </div>
    </div>
  );
}

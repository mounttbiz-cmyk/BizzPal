"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowUp, Paperclip, X, FileText, Square } from "lucide-react";
import { AgentMeta, ChatAttachment } from "./types";

interface ComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (attachments?: ChatAttachment[]) => void;
  onStop?: () => void;
  activeAgent: AgentMeta;
  isTyping: boolean;
  className?: string;
}

export function Composer({
  value,
  onChange,
  onSend,
  onStop,
  activeAgent,
  isTyping,
  className = "",
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

  // Auto-grow textarea up to 200px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [value]);

  const canSend = (value.trim().length > 0 || attachments.length > 0) && !isTyping;

  const handleTriggerSend = () => {
    if (!canSend) return;
    onSend(attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTriggerSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ChatAttachment[] = Array.from(files).map(file => {
      const isImg = file.type.startsWith("image/");
      return {
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
        previewUrl: isImg ? URL.createObjectURL(file) : undefined,
      };
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  return (
    <div className={`px-4 sm:px-7 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0 ${className}`}>
      <div className="w-full max-w-3xl mx-auto">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleTriggerSend();
          }}
          className="bg-surface border border-line-strong rounded-3xl px-4 pt-3 pb-2.5 shadow-sm focus-within:border-text-muted transition-colors"
        >
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-lg bg-surface-2 text-xs">
                  {att.previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={att.previewUrl} alt={att.name} className="w-5 h-5 rounded object-cover" />
                  ) : (
                    <FileText className="w-4 h-4 text-text-muted" />
                  )}
                  <span className="truncate max-w-[180px] text-text">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                    aria-label={`Remove ${att.name}`}
                    className="p-0.5 text-text-muted hover:text-text cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${activeAgent.name}…`}
            aria-label={`Message ${activeAgent.name}`}
            style={{ outline: "none", boxShadow: "none" }}
            className="w-full max-h-[200px] bg-transparent text-[15px] text-text placeholder:text-text-muted resize-none leading-relaxed border-none outline-none ring-0 focus:outline-none focus:ring-0"
          />

          <div className="flex items-center justify-between mt-1">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*,.pdf,.doc,.docx,.csv,.xlsx,.txt"
              className="hidden"
              aria-label="Attach files"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach files"
              title="Attach files"
              className="p-2 rounded-full text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {isTyping ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                title="Stop"
                className="w-9 h-9 rounded-full bg-text text-bg flex items-center justify-center cursor-pointer hover:opacity-85"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send message"
                className="w-9 h-9 rounded-full bg-brass text-white flex items-center justify-center cursor-pointer hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}
          </div>
        </form>

        <p className="text-xs text-text-muted text-center select-none pt-2">
          AI can make mistakes. Please check important business and financial decisions.
        </p>
      </div>
    </div>
  );
}

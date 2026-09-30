"use client";

import React, { useRef, useEffect, useState } from "react";
import { Send, Paperclip, X, FileText, Image as ImageIcon } from "lucide-react";
import { AgentMeta, ChatAttachment } from "./types";

interface ComposerProps {
  value: string;
  onChange: (val: string) => void;
  onSend: (attachments?: ChatAttachment[]) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);

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
      if ((value.trim() || attachments.length > 0) && !isTyping) {
        handleTriggerSend();
      }
    }
  };

  const handleTriggerSend = () => {
    if ((!value.trim() && attachments.length === 0) || isTyping) return;
    onSend(attachments.length > 0 ? attachments : undefined);
    setAttachments([]);
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
    // Reset file input value so same file can be re-selected if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (indexToRemove: number) => {
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const shortRole = activeAgent.role.replace(" AI", "");

  return (
    <div
      className={`border-t border-line bg-surface/95 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-3 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] ${className}`}
    >
      <div className="w-full max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto space-y-2">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-surface-2/60 border border-line">
            {attachments.map((att, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-lg bg-surface border border-line text-xs shadow-2xs group"
              >
                {att.previewUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-5 h-5 rounded object-cover border border-line"
                  />
                ) : (
                  <FileText className="w-4 h-4 text-brass" />
                )}
                <div className="min-w-0 max-w-[160px] sm:max-w-[220px]">
                  <p className="truncate font-medium text-text text-[11px] leading-tight">
                    {att.name}
                  </p>
                  <span className="text-[10px] text-text-muted font-sans">
                    {formatFileSize(att.size)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
                  title="Remove attachment"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={e => {
            e.preventDefault();
            handleTriggerSend();
          }}
          className="relative flex items-end gap-2 bg-surface-2 border border-line rounded-2xl p-1.5 focus-within:border-brass/70 focus-within:ring-1 focus-within:ring-brass/30 transition-all shadow-theme"
        >
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept="image/*,.pdf,.doc,.docx,.csv,.xlsx,.txt"
            className="hidden"
            aria-label="Upload files and images"
          />

          {/* Attachment Paperclip Button (Replaced sparkle icon) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach images, files, or documents"
            title="Attach images, files, or documents"
            className="p-2.5 rounded-xl text-text-muted hover:text-brass hover:bg-surface transition-colors cursor-pointer shrink-0 mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <Paperclip className="w-4 h-4" />
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

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!value.trim() && attachments.length === 0) || isTyping}
            aria-label="Send message"
            className="h-10 sm:h-10 px-3 sm:px-4 rounded-xl bg-brass text-white text-xs sm:text-sm font-bold shadow-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all inline-flex items-center justify-center gap-1.5 shrink-0 mb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage, AgentMeta, CompanyProfile } from "./types";
import { MessageBubble } from "./MessageBubble";

interface ChatThreadProps {
  messages: ChatMessage[];
  activeAgent: AgentMeta;
  companyProfile?: CompanyProfile | null;
  isTyping: boolean;
  onCommitRecord?: (record: any, msgId: string) => void;
  onSelectPlaybook?: (playbook: string) => void;
  className?: string;
}

export function ChatThread({
  messages,
  activeAgent,
  companyProfile,
  isTyping,
  onCommitRecord,
  onSelectPlaybook,
  className = "",
}: ChatThreadProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, activeAgent.id]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Conversation stream"
      className={`flex-1 overflow-y-auto min-h-0 px-4 sm:px-7 py-8 ${className}`}
    >
      <div className="w-full max-w-3xl mx-auto space-y-8">
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            activeAgent={activeAgent}
            companyProfile={companyProfile}
            onCommitRecord={onCommitRecord}
            onSelectPlaybook={onSelectPlaybook}
            isTyping={isTyping}
          />
        ))}

        {isTyping && (
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" />
            </span>
            <span>{activeAgent.name} is typing…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

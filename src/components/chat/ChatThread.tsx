"use client";

import React, { useRef, useEffect } from "react";
import { ChatMessage, AgentMeta, CompanyProfile } from "./types";
import { MessageBubble } from "./MessageBubble";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";

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
      className={`flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-6 space-y-6 ${className}`}
    >
      <div className="max-w-[820px] mx-auto w-full space-y-6">
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

        {/* AI Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 justify-start max-w-[80%] animate-fade-in">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-brass shrink-0 mt-1 shadow-2xs">
              <AgentAvatarIcon iconName={activeAgent.avatar} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="p-4 rounded-2xl bg-surface-2/60 border border-line text-xs sm:text-sm text-text-muted flex items-center gap-3 shadow-theme">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brass animate-bounce [animation-delay:-0.3s]" />
                <span className="w-2 h-2 rounded-full bg-brass animate-bounce [animation-delay:-0.15s]" />
                <span className="w-2 h-2 rounded-full bg-brass animate-bounce" />
              </div>
              <span className="text-xs">
                {activeAgent.name} is synthesizing verified business telemetry…
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

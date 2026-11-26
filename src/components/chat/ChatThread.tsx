"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { ChatMessage, AgentMeta, CompanyProfile } from "./types";
import { MessageBubble } from "./MessageBubble";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";

interface ChatThreadProps {
  messages: ChatMessage[];
  activeAgent: AgentMeta;
  companyProfile?: CompanyProfile | null;
  isTyping: boolean;
  onCommitRecord?: (record: any, msgId: string) => void;
  agents?: AgentMeta[];
  onHandoff?: (agentId: string, question: string) => void;
  /** Asks the last question again */
  onRetry?: () => void;
  className?: string;
}

export function ChatThread({
  messages,
  activeAgent,
  companyProfile,
  isTyping,
  onCommitRecord,
  agents = [],
  onHandoff,
  onRetry,
  className = "",
}: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useState(true);

  // Follow new messages, unless the person has scrolled up to read something
  useEffect(() => {
    if (atBottom) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, isTyping]);

  // Opening another chat always starts at its latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
    setAtBottom(true);
  }, [activeAgent.id, messages[0]?.id]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
  };

  const lastIndex = messages.length - 1;

  return (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className={`flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-6 sm:py-8 ${className}`}
      >
        <div className="w-full max-w-3xl mx-auto space-y-8">
          {messages.map((message, i) => (
            <MessageBubble
              key={message.id}
              message={message}
              activeAgent={activeAgent}
              companyProfile={companyProfile}
              onCommitRecord={onCommitRecord}
              isTyping={isTyping}
              handoffAgent={message.handoff ? agents.find(a => a.id === message.handoff!.agentId) : undefined}
              onHandoff={onHandoff}
              onRetry={i === lastIndex && message.sender === "agent" && !isTyping ? onRetry : undefined}
            />
          ))}

          {isTyping && (
            <div className="flex items-center gap-2" aria-label={`${activeAgent.name} is thinking`}>
              <span className="w-6 h-6 rounded-md bg-surface-2 text-brass flex items-center justify-center shrink-0">
                <AgentAvatarIcon iconName={activeAgent.avatar} className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm text-text-muted">Thinking</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted/70 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted/70 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-text-muted/70 animate-bounce" />
              </span>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {!atBottom && (
        <button
          type="button"
          onClick={() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })}
          aria-label="Go to the latest message"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-surface border border-line shadow-md text-text-muted hover:text-text flex items-center justify-center cursor-pointer"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

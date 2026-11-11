"use client";

import React, { useState } from "react";
import { ChatMessage, AgentMeta, CompanyProfile } from "./types";
import { ChatMarkdown } from "@/components/shell/ChatMarkdown";
import { PlaybookActions } from "./PlaybookActions";
import { getAdvisorGreeting } from "@/lib/advisors";

interface MessageBubbleProps {
  message: ChatMessage;
  activeAgent: AgentMeta;
  companyProfile?: CompanyProfile | null;
  onCommitRecord?: (record: any, msgId: string) => void;
  onSelectPlaybook?: (playbook: string) => void;
  isTyping?: boolean;
}

export function MessageBubble({
  message,
  activeAgent,
  companyProfile,
  onCommitRecord,
  onSelectPlaybook,
  isTyping = false,
}: MessageBubbleProps) {
  const isUser = message.sender === "user";

  // Clean formatted content
  const rawContent = isUser
    ? message.content
    : message.id.startsWith("msg_init_")
    ? getAdvisorGreeting(activeAgent, companyProfile)
    : message.content
        .replace(/\bAstra, your CEO AI\b/gi, `${activeAgent.name}, your ${activeAgent.role}`)
        .replace(/\bI am Astra\b/gi, `I am ${activeAgent.name}`)
        .replace(/\bAstra\b/g, activeAgent.name);

  // Turn "•" bullets into a proper list so they don't run together in one paragraph
  const displayContent = isUser
    ? rawContent
    : rawContent.replace(/^[ \t]*•[ \t]*/gm, "- ").replace(/([^\n])\n- /, "$1\n\n- ");

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  if (isUser) {
    return (
      <div id={message.id} className="flex justify-end scroll-mt-6 w-full">
        <div className="max-w-[85%] sm:max-w-[75%] space-y-2">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap justify-end gap-2">
              {message.attachments.map((att, idx) => (
                <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-2 text-xs text-text">
                  {att.previewUrl && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={att.previewUrl} alt={att.name} className="w-7 h-7 rounded object-cover" />
                  )}
                  <span className="truncate max-w-[180px]">{att.name}</span>
                </div>
              ))}
            </div>
          )}
          <div
            title={message.timestamp}
            className="px-4 py-2.5 rounded-2xl bg-surface-2 text-text text-[15px] leading-relaxed whitespace-pre-wrap"
          >
            {displayContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id={message.id} className="group scroll-mt-6 w-full">
      <div className="text-[15px] leading-7 text-text">
        <ChatMarkdown content={displayContent} />
      </div>

      {message.structuredRecord && (
        <div className="mt-4 p-4 rounded-xl border border-line text-left space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-medium text-text">Update found in your message</span>
            <span className={`text-xs ${message.recordCommitted ? "text-jade" : "text-text-muted"}`}>
              {message.recordCommitted ? "Saved to your records" : "Not saved yet"}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
            {message.structuredRecord.dailyOrders !== undefined && (
              <div className="p-2.5 rounded-lg bg-surface-2">
                <span className="text-xs text-text-muted block">Orders</span>
                <span className="font-medium text-text">{message.structuredRecord.dailyOrders}</span>
              </div>
            )}
            {message.structuredRecord.dailyRevenue !== undefined && (
              <div className="p-2.5 rounded-lg bg-surface-2">
                <span className="text-xs text-text-muted block">Revenue</span>
                <span className="font-medium text-text">₹{message.structuredRecord.dailyRevenue.toLocaleString("en-IN")}</span>
              </div>
            )}
            {message.structuredRecord.dailyExpenses !== undefined && (
              <div className="p-2.5 rounded-lg bg-surface-2">
                <span className="text-xs text-text-muted block">Expenses</span>
                <span className="font-medium text-text">₹{message.structuredRecord.dailyExpenses.toLocaleString("en-IN")}</span>
              </div>
            )}
          </div>

          {!message.recordCommitted && onCommitRecord && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => onCommitRecord(message.structuredRecord, message.id)}
                className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
              >
                Save to records
              </button>
            </div>
          )}
        </div>
      )}

      {((message.nextSteps && message.nextSteps.length > 0) || message.id.startsWith("msg_init_")) && onSelectPlaybook && (
        <PlaybookActions
          playbooks={message.nextSteps || []}
          tools={activeAgent.quickTools || []}
          promptSuggestions={activeAgent.promptSuggestions || []}
          onSelectAction={onSelectPlaybook}
          disabled={isTyping}
        />
      )}

      {!message.id.startsWith("msg_init_") && (
        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button type="button" onClick={handleCopy} className="hover:text-text cursor-pointer">
            {copied ? "Copied" : "Copy"}
          </button>
          <span>{message.timestamp}</span>
        </div>
      )}
    </div>
  );
}

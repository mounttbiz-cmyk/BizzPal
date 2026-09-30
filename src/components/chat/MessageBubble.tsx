"use client";

import React from "react";
import { ChatMessage, AgentMeta, CompanyProfile } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import { ChatMarkdown } from "@/components/shell/ChatMarkdown";
import { PlaybookActions } from "./PlaybookActions";
import {
  User,
  BrainCircuit,
  CheckCircle2,
  Clock,
} from "lucide-react";
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
  const displayContent = isUser
    ? message.content
    : message.id.startsWith("msg_init_")
    ? getAdvisorGreeting(activeAgent, companyProfile)
    : message.content
        .replace(/\bAstra, your CEO AI\b/gi, `${activeAgent.name}, your ${activeAgent.role}`)
        .replace(/\bI am Astra\b/gi, `I am ${activeAgent.name}`)
        .replace(/\bAstra\b/g, activeAgent.name);

  const senderName = isUser
    ? companyProfile?.founderName || "You"
    : `${activeAgent.name} (${activeAgent.role})`;

  return (
    <div
      id={message.id}
      className={`flex gap-3 scroll-mt-6 w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Advisor Avatar (Left for AI) */}
      {!isUser && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-brass shrink-0 mt-1 shadow-2xs">
          <AgentAvatarIcon iconName={activeAgent.avatar} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
        </div>
      )}

      {/* Bubble Container */}
      <div
        className={`flex flex-col min-w-0 max-w-[85%] sm:max-w-[80%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        {/* Sender & Timestamp Row */}
        <div className="flex items-center gap-2 mb-1.5 px-1 text-xs">
          <span className="font-bold text-text text-[11px] sm:text-xs">{senderName}</span>
          <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            {message.timestamp}
          </span>
        </div>

        {/* Message Card */}
        <div
          className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
            isUser
              ? "bg-brass text-white font-medium rounded-tr-xs shadow-md"
              : "bg-surface-2/60 border border-line text-text rounded-tl-xs shadow-theme"
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap">{displayContent}</div>
          ) : (
            <div className="space-y-3">
              <ChatMarkdown content={displayContent} />

              {/* Day-to-Day Operational Update Detected Card */}
              {message.structuredRecord && (
                <div className="mt-3 p-3.5 rounded-xl bg-surface border border-brass/40 text-text space-y-2.5 shadow-2xs text-left">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brass flex items-center gap-1.5">
                      <BrainCircuit className="w-3.5 h-3.5 text-brass" />
                      <span>Operational Update Detected</span>
                    </span>
                    {message.recordCommitted ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Committed to Ledger</span>
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-2 border border-line text-text-muted font-mono font-semibold">
                        Uncommitted
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {message.structuredRecord.dailyOrders !== undefined && (
                      <div className="p-2 rounded-lg bg-surface-2/60 border border-line">
                        <span className="text-[10px] text-text-muted block">Orders</span>
                        <span className="text-xs font-bold text-text">
                          {message.structuredRecord.dailyOrders}
                        </span>
                      </div>
                    )}
                    {message.structuredRecord.dailyRevenue !== undefined && (
                      <div className="p-2 rounded-lg bg-surface-2/60 border border-line">
                        <span className="text-[10px] text-text-muted block">Revenue</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{message.structuredRecord.dailyRevenue.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {message.structuredRecord.dailyExpenses !== undefined && (
                      <div className="p-2 rounded-lg bg-surface-2/60 border border-line">
                        <span className="text-[10px] text-text-muted block">Expenses</span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          ₹{message.structuredRecord.dailyExpenses.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                  </div>

                  {!message.recordCommitted && onCommitRecord && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          onCommitRecord(message.structuredRecord, message.id)
                        }
                        className="px-3.5 py-1.5 rounded-lg bg-brass text-white text-[11px] font-bold hover:brightness-110 inline-flex items-center gap-1.5 cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm & Record to Business Ledger</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Recommended Playbooks */}
              {message.nextSteps && message.nextSteps.length > 0 && onSelectPlaybook && (
                <PlaybookActions
                  playbooks={message.nextSteps}
                  onSelectPlaybook={onSelectPlaybook}
                  disabled={isTyping}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar (Right for User) */}
      {isUser && (
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brass text-white flex items-center justify-center text-sm shrink-0 mt-1 shadow-xs">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
}

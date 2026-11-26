"use client";

import React from "react";
import Link from "next/link";
import { CornerDownRight } from "lucide-react";

import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";

function partOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/**
 * A new chat: a greeting, the advisors to choose from, the message box, and a few ways to start. Once the first
 * message is sent, the conversation takes over the screen.
 */
export function ChatEmptyState({
  agents,
  agent,
  customNamed,
  onSelectAgent,
  founderName,
  companyName,
  suggestions,
  onPick,
  disabled,
  children,
}: {
  agents: AgentMeta[];
  agent: AgentMeta;
  /** The owner gave this advisor its own name (then: "I'm Asha, your chief financial officer") */
  customNamed: boolean;
  onSelectAgent: (id: string) => void;
  founderName?: string;
  companyName?: string;
  suggestions: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
  /** The message box */
  children: React.ReactNode;
}) {
  const raw = founderName?.trim().split(/\s+/)[0] || "";
  const first = raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "";
  const who = customNamed ? `I'm ${agent.name}, your ${agent.role.toLowerCase()}.` : `I'm your ${agent.role}.`;

  return (
    <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6">
      <div className="w-full max-w-3xl mx-auto min-h-full flex flex-col py-10">
        <div className="flex-1 flex flex-col justify-center">
        <div className="text-center">
          <h1 className="text-[28px] sm:text-[34px] font-semibold text-text tracking-tight">
            {partOfDay()}
            {first ? `, ${first}` : ""}
          </h1>
          <p className="mt-3 text-base text-text-muted">
            {who} How can I help{companyName ? ` ${companyName}` : ""} today?
          </p>
        </div>

        {/* Choose who to talk to */}
        <div className="mt-9 -mx-4 px-4 overflow-x-auto no-scrollbar">
          <div role="tablist" aria-label="Advisors" className="flex gap-1.5 w-max mx-auto">
            {agents.map(a => {
              const on = a.id === agent.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  title={a.badge}
                  onClick={() => onSelectAgent(a.id)}
                  className={`h-9 px-3 rounded-full border text-[13px] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    on ? "border-brass/60 bg-brass/[0.09] text-text" : "border-line text-text-muted hover:text-text hover:border-line-strong"
                  }`}
                >
                  <span className={`shrink-0 ${on ? "text-brass" : ""}`}>
                    <AgentAvatarIcon iconName={a.avatar} className="w-3.5 h-3.5" />
                  </span>
                  {a.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7">{children}</div>

        {/* Quiet ideas to start with: the message box stays the main thing */}
        {suggestions.length > 0 && (
          <ul className="mt-6 px-1.5 space-y-1" aria-label="Ideas to ask">
            {suggestions.slice(0, 3).map(s => (
              <li key={s}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onPick(s)}
                  title={s}
                  className="w-full h-9 px-2.5 rounded-lg flex items-center gap-2.5 text-left text-sm text-text-muted hover:text-text hover:bg-surface-2/60 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CornerDownRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="truncate">{s}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {agent.quickTools.length > 0 && (
          <p className="mt-4 px-4 text-xs text-text-muted">
            Tools:{" "}
            {agent.quickTools.map((t, i) => (
              <React.Fragment key={t.href}>
                {i > 0 && <span className="mx-1.5 opacity-50">·</span>}
                <Link href={t.href} className="hover:text-text hover:underline underline-offset-2">
                  {t.name}
                </Link>
              </React.Fragment>
            ))}
          </p>
        )}

        </div>
        <p className="pt-6 text-[11px] text-text-muted text-center select-none">AI can make mistakes. Check important business and money decisions.</p>
      </div>
    </div>
  );
}

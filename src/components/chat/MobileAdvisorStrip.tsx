"use client";

import React from "react";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";

interface MobileAdvisorStripProps {
  agents: AgentMeta[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  className?: string;
}

export function MobileAdvisorStrip({
  agents,
  activeAgentId,
  onSelectAgent,
  className = "",
}: MobileAdvisorStripProps) {
  return (
    <nav
      aria-label="Executive advisors quick select"
      className={`md:hidden flex items-center gap-3 overflow-x-auto pb-2 pt-1 px-1 no-scrollbar shrink-0 select-none ${className}`}
    >
      {agents.map(agent => {
        const isActive = agent.id === activeAgentId;
        const firstName = agent.name.split(" ")[0];

        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelectAgent(agent.id)}
            aria-label={`Select ${agent.name}, ${agent.role}`}
            aria-current={isActive ? "true" : undefined}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none group"
          >
            {/* Circular avatar button */}
            <div className="relative">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-surface border-2 border-brass text-brass shadow-md ring-2 ring-brass/30"
                    : "bg-surface-2 border border-line text-text-muted hover:text-text hover:border-line-strong"
                }`}
              >
                <AgentAvatarIcon iconName={agent.avatar} className="w-5 h-5" />
              </div>

              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-surface shadow-xs"
                />
              )}
            </div>

            {/* Name label */}
            <span
              className={`text-[11px] font-medium truncate max-w-[64px] text-center ${
                isActive ? "text-text font-bold" : "text-text-muted group-hover:text-text"
              }`}
            >
              {firstName}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

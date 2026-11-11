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
      aria-label="Advisors"
      className={`md:hidden flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 no-scrollbar shrink-0 select-none ${className}`}
    >
      {agents.map(agent => {
        const isActive = agent.id === activeAgentId;

        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => onSelectAgent(agent.id)}
            aria-label={`${agent.name}, ${agent.role}`}
            aria-current={isActive ? "true" : undefined}
            className={`flex items-center gap-2 shrink-0 px-3.5 py-2 rounded-xl text-sm cursor-pointer whitespace-nowrap ${
              isActive ? "bg-surface-2 text-text font-medium" : "text-text-muted hover:text-text hover:bg-surface-2/60"
            }`}
          >
            <span className={isActive ? "text-brass" : ""}>
              <AgentAvatarIcon iconName={agent.avatar} className="w-4 h-4" />
            </span>
            {agent.name}
          </button>
        );
      })}
    </nav>
  );
}

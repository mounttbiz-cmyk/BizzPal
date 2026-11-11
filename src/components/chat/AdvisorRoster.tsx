"use client";

import React from "react";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import { Pencil, RotateCcw, PanelLeftClose, PanelLeftOpen } from "lucide-react";

interface AdvisorRosterProps {
  agents: AgentMeta[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  onCustomizeAgent: (agent: AgentMeta) => void;
  onResetConversation: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function AdvisorRoster({
  agents,
  activeAgentId,
  onSelectAgent,
  onCustomizeAgent,
  onResetConversation,
  isCollapsed = false,
  onToggleCollapse,
  className = "",
}: AdvisorRosterProps) {
  if (isCollapsed) {
    return (
      <aside
        aria-label="Advisors"
        className={`w-16 shrink-0 bg-surface border border-line rounded-2xl shadow-sm flex flex-col items-center py-3 justify-between select-none ${className}`}
      >
        <div className="flex flex-col items-center gap-1.5 w-full px-2">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand advisor list"
              title="Expand advisor list"
              className="w-10 h-10 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center cursor-pointer mb-2"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          {agents.map(agent => {
            const isActive = agent.id === activeAgentId;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelectAgent(agent.id)}
                aria-label={`${agent.name}, ${agent.role}`}
                aria-current={isActive ? "true" : undefined}
                title={`${agent.name} · ${agent.badge}`}
                className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-colors ${
                  isActive ? "bg-surface-2 text-brass" : "text-text-muted hover:text-text hover:bg-surface-2/60"
                }`}
              >
                <AgentAvatarIcon iconName={agent.avatar} className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onResetConversation}
          aria-label="New chat"
          title="New chat"
          className="w-9 h-9 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Advisors"
      className={`w-72 xl:w-80 shrink-0 bg-surface border border-line rounded-2xl flex flex-col overflow-hidden select-none ${className}`}
    >
      <div className="px-5 pt-5 pb-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-semibold text-text">Your AI team</h2>
          <p className="text-xs text-text-muted mt-0.5">Pick who you want to talk to</p>
        </div>
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Collapse advisor list"
            title="Collapse advisor list"
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 min-h-0" role="list">
        {agents.map(agent => {
          const isActive = agent.id === activeAgentId;

          return (
            <div
              key={agent.id}
              role="listitem"
              className={`relative group rounded-xl transition-colors ${
                isActive ? "bg-surface-2" : "hover:bg-surface-2/60"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectAgent(agent.id)}
                aria-label={`${agent.name}, ${agent.role}`}
                aria-current={isActive ? "true" : undefined}
                className="w-full px-3 py-2.5 text-left flex items-center gap-3.5 cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                <span
                  className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? "bg-surface text-brass shadow-sm" : "bg-surface-2 text-text-muted"
                  }`}
                >
                  <AgentAvatarIcon iconName={agent.avatar} className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-sm truncate ${isActive ? "font-semibold text-text" : "font-medium text-text"}`}>
                    {agent.name}
                  </span>
                  <span className="block text-xs text-text-muted truncate mt-0.5">{agent.badge}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  onCustomizeAgent(agent);
                }}
                aria-label={`Rename ${agent.name}`}
                title={`Rename ${agent.name} or change its icon`}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface opacity-0 group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

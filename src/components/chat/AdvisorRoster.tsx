"use client";

import React, { useState } from "react";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";
import {
  Search,
  X,
  Pencil,
  ChevronRight,
  RotateCcw,
  PanelLeftClose,
  PanelLeftOpen,
  UserX,
} from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAgents = agents.filter(
    agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.badge.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.summary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Department badge color mapper for high-contrast, polished styling
  const getRoleBadgeClasses = (role: string) => {
    const r = role.toUpperCase();
    if (r.includes("CEO")) return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    if (r.includes("CFO")) return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    if (r.includes("MARKETING")) return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    if (r.includes("SALES")) return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    if (r.includes("HR") || r.includes("TALENT")) return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    if (r.includes("OPERATION")) return "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30";
    if (r.includes("STRATEGY")) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    return "bg-surface-2 text-text-muted border-line";
  };

  // If collapsed to rail view (tablet / desktop compact mode)
  if (isCollapsed) {
    return (
      <aside
        aria-label="Executive Advisors Rail"
        className={`w-16 shrink-0 bg-surface border border-line rounded-2xl flex flex-col items-center py-3 justify-between shadow-theme transition-all duration-200 select-none ${className}`}
      >
        <div className="flex flex-col items-center gap-2.5 w-full px-2">
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand Executive Roster"
              title="Expand Executive Roster"
              className="w-10 h-10 rounded-xl bg-surface-2/70 border border-line hover:border-brass/40 text-text-muted hover:text-brass flex items-center justify-center transition-colors mb-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}

          <div className="w-8 h-px bg-line/60 my-1" />

          {agents.map(agent => {
            const isActive = agent.id === activeAgentId;
            return (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelectAgent(agent.id)}
                aria-label={`Switch to ${agent.name}, ${agent.role}`}
                aria-current={isActive ? "true" : undefined}
                title={`${agent.name} (${agent.role}) - ${agent.badge}`}
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass ${
                  isActive
                    ? "bg-brass/15 border-brass text-brass shadow-xs ring-1 ring-brass/30"
                    : "bg-surface-2/40 border-transparent hover:border-line text-text-muted hover:text-text hover:bg-surface-2"
                }`}
              >
                <AgentAvatarIcon iconName={agent.avatar} className="w-4 h-4" />
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface shadow-xs"
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onResetConversation}
          aria-label="Reset conversation thread"
          title="Reset conversation"
          className="w-9 h-9 rounded-xl bg-surface-2/60 border border-line text-text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  // Expanded full roster view (280-320px)
  return (
    <aside
      aria-label="Executive AI Directory"
      className={`w-72 xl:w-80 shrink-0 bg-surface border border-line rounded-2xl flex flex-col overflow-hidden shadow-theme select-none ${className}`}
    >
      {/* Roster Header */}
      <div className="p-3.5 border-b border-line bg-surface-2/30 space-y-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Executive Roster
            </span>
            <span className="text-[10px] font-sans font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              {agents.length} Active
            </span>
          </div>

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse to icon rail"
              title="Collapse to icon rail"
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-line transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Advisors Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter advisors…"
            aria-label="Filter advisors by name or role"
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-brass focus:border-brass transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear filter"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-text cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Roster Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 min-h-0" role="list">
        {filteredAgents.length === 0 ? (
          <div className="p-6 text-center text-text-muted space-y-2">
            <UserX className="w-8 h-8 mx-auto text-text-muted/50" />
            <p className="text-xs font-medium">No advisors found</p>
            <p className="text-[11px] text-text-muted/70">
              No executive advisor matches &ldquo;{searchTerm}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="text-xs text-brass hover:underline cursor-pointer pt-1"
            >
              Clear search
            </button>
          </div>
        ) : (
          filteredAgents.map(agent => {
            const isActive = agent.id === activeAgentId;
            const shortRole = agent.role.replace(" AI", "");

            return (
              <div
                key={agent.id}
                role="listitem"
                className={`relative group rounded-xl border transition-all duration-150 ${
                  isActive
                    ? "bg-brass/10 border-brass/50 shadow-xs ring-1 ring-brass/20"
                    : "bg-surface-2/20 border-transparent hover:bg-surface-2/60 hover:border-line"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectAgent(agent.id)}
                  aria-label={`${agent.name}, ${agent.role}`}
                  aria-current={isActive ? "true" : undefined}
                  className="w-full p-2.5 text-left flex items-center justify-between gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass rounded-xl"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar with Live Indicator */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors shadow-2xs ${
                          isActive
                            ? "bg-surface border-brass/40 text-brass"
                            : "bg-surface border-line text-text-muted group-hover:text-text"
                        }`}
                      >
                        <AgentAvatarIcon iconName={agent.avatar} className="w-4 h-4" />
                      </div>
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface shadow-xs"
                      />
                    </div>

                    {/* Name + Role + Description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-bold truncate ${
                            isActive ? "text-text font-bold" : "text-text/90"
                          }`}
                        >
                          {agent.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border shrink-0 ${getRoleBadgeClasses(
                            agent.role
                          )}`}
                        >
                          {shortRole}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted truncate mt-0.5">
                        {agent.badge}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isActive ? "text-brass translate-x-0.5" : "text-text-muted/40 group-hover:text-text-muted"
                      }`}
                    />
                  </div>
                </button>

                {/* Edit Advisor Name & Icon button on hover */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onCustomizeAgent(agent);
                  }}
                  aria-label={`Customize ${agent.name}`}
                  title={`Customize ${agent.name} (name & icon)`}
                  className="absolute right-7 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-text-muted hover:text-brass hover:bg-surface border border-transparent hover:border-line opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Roster Footer / Session Controls */}
      <div className="p-3 border-t border-line bg-surface-2/30 flex items-center justify-between text-xs shrink-0">
        <span className="text-[11px] text-text-muted">Direct Session</span>
        <button
          type="button"
          onClick={onResetConversation}
          aria-label="Reset conversation thread"
          title="Reset conversation thread"
          className="px-2.5 py-1 rounded-lg bg-surface border border-line text-[11px] text-text-muted hover:text-text hover:border-line-strong flex items-center gap-1.5 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brass"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </aside>
  );
}

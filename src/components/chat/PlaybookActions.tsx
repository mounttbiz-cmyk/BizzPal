"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, SlidersHorizontal, MessageSquare, ExternalLink } from "lucide-react";

interface PlaybookActionsProps {
  playbooks?: string[];
  tools?: { name: string; href: string }[];
  promptSuggestions?: string[];
  onSelectAction: (text: string) => void;
  disabled?: boolean;
}

export function PlaybookActions({
  playbooks = [],
  tools = [],
  promptSuggestions = [],
  onSelectAction,
  disabled = false,
}: PlaybookActionsProps) {
  // Initially null so sub-content is hidden until clicked
  const [activeTab, setActiveTab] = useState<"tools" | "recommendations" | null>(null);

  const hasTools = playbooks.length > 0 || tools.length > 0;
  const hasPrompts = promptSuggestions.length > 0;

  if (!hasTools && !hasPrompts) return null;

  const handleToggleTab = (tab: "tools" | "recommendations") => {
    setActiveTab(prev => (prev === tab ? null : tab));
  };

  return (
    <div className="mt-4 pt-3.5 border-t border-line/50 space-y-3">
      {/* 2 Clean Toggle Buttons: Tools & Simulations | Chat Recommendations */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => handleToggleTab("tools")}
          aria-expanded={activeTab === "tools"}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:outline-none ${
            activeTab === "tools"
              ? "bg-brass text-white shadow-xs font-bold"
              : "bg-surface hover:bg-surface-2 border border-line text-text-muted hover:text-text"
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Tools &amp; Simulations</span>
        </button>

        <button
          type="button"
          onClick={() => handleToggleTab("recommendations")}
          aria-expanded={activeTab === "recommendations"}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs focus-visible:outline-none ${
            activeTab === "recommendations"
              ? "bg-brass text-white shadow-xs font-bold"
              : "bg-surface hover:bg-surface-2 border border-line text-text-muted hover:text-text"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat Recommendations</span>
        </button>
      </div>

      {/* Tab 1: Tools & Simulations */}
      {activeTab === "tools" && (
        <div className="space-y-2.5 animate-fade-in">
          {playbooks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted select-none">
                Simulations &amp; Playbooks
              </span>
              <div className="flex flex-wrap gap-2">
                {playbooks.map((playbook, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelectAction(playbook)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-2 border border-line hover:border-brass/50 text-text hover:text-brass text-xs font-medium cursor-pointer transition-all shadow-2xs group focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{playbook}</span>
                    <ArrowRight className="w-3 h-3 text-text-muted group-hover:text-brass group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {tools.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted select-none">
                Executive Tools
              </span>
              <div className="flex flex-wrap gap-2">
                {tools.map((tool, idx) => (
                  <Link
                    key={idx}
                    href={tool.href}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface hover:bg-surface-2 border border-line hover:border-brass/50 text-text-muted hover:text-brass text-xs font-medium transition-all shadow-2xs group"
                  >
                    <span>{tool.name}</span>
                    <ExternalLink className="w-3 h-3 text-text-muted/60 group-hover:text-brass shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Chat Recommendations */}
      {activeTab === "recommendations" && (
        <div className="space-y-1.5 animate-fade-in">
          <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted select-none">
            Strategic Inquiries
          </span>
          <div className="grid grid-cols-1 gap-2">
            {promptSuggestions.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                disabled={disabled}
                onClick={() => onSelectAction(prompt)}
                className="w-full text-left p-2.5 rounded-xl bg-surface hover:bg-surface-2 border border-line hover:border-brass/50 text-xs text-text transition-all cursor-pointer flex items-center justify-between gap-3 group shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="leading-relaxed">{prompt}</span>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-brass group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";

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
  const [open, setOpen] = useState<"tools" | "suggestions" | null>(null);

  const hasTools = playbooks.length > 0 || tools.length > 0;
  const hasPrompts = promptSuggestions.length > 0;

  if (!hasTools && !hasPrompts) return null;

  const toggle = (tab: "tools" | "suggestions") => setOpen(prev => (prev === tab ? null : tab));

  const button = (active: boolean) =>
    `px-4 py-2 rounded-full border text-sm cursor-pointer transition-colors ${
      active
        ? "border-text-muted bg-surface-2 text-text"
        : "border-line text-text hover:bg-surface-2"
    }`;

  const chip =
    "px-3.5 py-2 rounded-full border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="mt-5 space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {hasTools && (
          <button type="button" onClick={() => toggle("tools")} aria-expanded={open === "tools"} className={button(open === "tools")}>
            Tools
          </button>
        )}
        {hasPrompts && (
          <button
            type="button"
            onClick={() => toggle("suggestions")}
            aria-expanded={open === "suggestions"}
            className={button(open === "suggestions")}
          >
            Suggestions
          </button>
        )}
      </div>

      {open === "tools" && (
        <div className="space-y-4">
          {playbooks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {playbooks.map((playbook, idx) => (
                <button key={idx} type="button" disabled={disabled} onClick={() => onSelectAction(playbook)} className={chip}>
                  {playbook}
                </button>
              ))}
            </div>
          )}
          {tools.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tools.map((tool, idx) => (
                <Link key={idx} href={tool.href} className={chip}>
                  {tool.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {open === "suggestions" && (
        <ul className="divide-y divide-line border-y border-line">
          {promptSuggestions.map((prompt, idx) => (
            <li key={idx}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onSelectAction(prompt)}
                className="w-full text-left py-3 px-1 text-[15px] text-text hover:bg-surface-2/60 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

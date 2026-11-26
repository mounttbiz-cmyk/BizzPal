"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil } from "lucide-react";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";

/** The advisor you are talking to, and a menu to switch to another, like the model picker in other chat apps. */
export function AdvisorPicker({
  agents,
  active,
  onSelect,
  onRename,
}: {
  agents: AgentMeta[];
  active: AgentMeta;
  onSelect: (id: string) => void;
  onRename: (agent: AgentMeta) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="h-9 pl-1.5 pr-2.5 rounded-lg hover:bg-surface-2 inline-flex items-center gap-2.5 cursor-pointer min-w-0"
      >
        <span className="w-7 h-7 rounded-md bg-surface-2 text-brass flex items-center justify-center shrink-0">
          <AgentAvatarIcon iconName={active.avatar} className="w-4 h-4" />
        </span>
        <span className="text-[15px] font-semibold text-text truncate">{active.name}</span>
        <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="listbox" aria-label="Advisors" className="absolute left-0 top-full mt-1.5 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-xl p-1.5">
          {agents.map(a => {
            const on = a.id === active.id;
            return (
              <button
                key={a.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onSelect(a.id);
                  setOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-lg text-left flex items-center gap-3 cursor-pointer ${on ? "bg-surface-2" : "hover:bg-surface-2/70"}`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${on ? "bg-surface text-brass" : "bg-surface-2 text-text-muted"}`}>
                  <AgentAvatarIcon iconName={a.avatar} className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text truncate">{a.name}</span>
                  <span className="block text-xs text-text-muted truncate">{a.badge}</span>
                </span>
                {on && <Check className="w-4 h-4 text-brass shrink-0" />}
              </button>
            );
          })}
          <div className="mt-1 pt-1 border-t border-line">
            <button
              type="button"
              onClick={() => {
                onRename(active);
                setOpen(false);
              }}
              className="w-full h-9 px-2.5 rounded-lg text-left text-sm text-text-muted hover:text-text hover:bg-surface-2/70 inline-flex items-center gap-2.5 cursor-pointer"
            >
              <Pencil className="w-4 h-4" /> Rename {active.name} or change its icon
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { AlertTriangle, Check, Plus } from "lucide-react";
import type { Priority } from "@/lib/onboarding/data";
import { Callout, GhostButton, Pill, PrimaryButton, StepHeader } from "./ui";

interface Props {
  options: Priority[];
  selected: string[];
  industryLabel: string;
  summary: { name: string; verified: boolean; website: string | null; tools: number };
  submitting: boolean;
  error: string;
  onToggle: (id: string) => void;
  onAddCustom: (text: string) => void;
  onBack: () => void;
  onFinish: () => void;
}

export function PrioritiesStep({ options, selected, industryLabel, summary, submitting, error, onToggle, onAddCustom, onBack, onFinish }: Props) {
  const [custom, setCustom] = useState("");
  const add = () => {
    if (!custom.trim()) return;
    onAddCustom(custom.trim());
    setCustom("");
  };

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 8 · Priorities" title="Where should we focus first?">
        Tailored for <strong className="text-text">{industryLabel}</strong>. Recommended items are pre-selected. These are goals, not facts, so there are no wrong answers.
      </StepHeader>

      <div className="space-y-2.5" role="group" aria-label="Priorities">
        {options.map((o) => {
          const on = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o.id)}
              className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 cursor-pointer btn-tactile transition-all ${
                on ? "bg-surface-2 border-brass ring-1 ring-brass/30" : "bg-surface-2/40 border-line hover:border-line-strong"
              }`}
            >
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${on ? "bg-brass border-brass text-bg" : "border-line-strong bg-surface"}`}>
                {on && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-text">{o.title}</span>
                  <span className="flex items-center gap-1.5">
                    {o.recommended && <Pill tone="info">Recommended</Pill>}
                    <span className="text-[10px] px-1.5 rounded bg-surface border border-line text-brass font-semibold uppercase">{o.category}</span>
                  </span>
                </span>
                <span className="text-[11px] text-text-muted mt-0.5 leading-relaxed block">{o.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
        <label htmlFor="custom-priority" className="text-xs font-semibold text-text">Add your own</label>
        <div className="flex gap-2">
          <input
            id="custom-priority"
            value={custom}
            maxLength={200}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="e.g. Cut onboarding drop-off, renegotiate supplier terms"
            className="flex-1 px-3 py-2 rounded-lg bg-surface border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass"
          />
          <button type="button" onClick={add} className="px-3.5 rounded-lg bg-brass text-bg text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer inline-flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />Add
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Ready to set up</div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text">
          <span className="font-bold">{summary.name}</span>
          {summary.verified ? <Pill tone="good">GST verified</Pill> : <Pill tone="warn">Not yet verified</Pill>}
          <span className="text-text-muted">{summary.website ? `Website: ${summary.website}` : "No website verified"}</span>
          <span className="text-text-muted">{summary.tools} tool{summary.tools === 1 ? "" : "s"} connected</span>
        </div>
      </div>

      {error && (
        <Callout tone="bad" icon={<AlertTriangle className="w-4 h-4" />} title="We couldn't finish setting up">{error}</Callout>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-between">
        <GhostButton onClick={onBack} disabled={submitting}>Back</GhostButton>
        <PrimaryButton id="btn-finish" onClick={onFinish} loading={submitting}>
          {submitting ? "Setting up your workspace…" : "Finish setup"}
        </PrimaryButton>
      </div>
    </div>
  );
}

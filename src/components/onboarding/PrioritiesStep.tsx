"use client";

import { useState } from "react";
import { AlertTriangle, Check, Plus } from "lucide-react";
import type { Priority } from "@/lib/onboarding/data";
import { Callout, GhostButton, PrimaryButton, StepHeader } from "./ui";

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

const titleCase = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

export function PrioritiesStep({ options, selected, industryLabel, summary, submitting, error, onToggle, onAddCustom, onBack, onFinish }: Props) {
  const [custom, setCustom] = useState("");
  const add = () => {
    if (!custom.trim()) return;
    onAddCustom(custom.trim());
    setCustom("");
  };
  const count = selected.length;

  return (
    <div className="space-y-7">
      <StepHeader eyebrow="Step 8 · Priorities" title="Where should we focus first?">
        Pick the goals that matter most to you right now. Your advisors and dashboard start from these, and you can change them any time.
      </StepHeader>

      <div>
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <p className="text-sm text-text-muted">
            Common goals for <span className="text-text">{industryLabel}</span>
          </p>
          <p className="text-sm text-text-muted tabular-nums">{count ? `${count} selected` : "None selected"}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2" role="group" aria-label="Priorities">
          {options.map((o) => {
            const on = selected.includes(o.id);
            return (
              <button
                key={o.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(o.id)}
                className={`group text-left rounded-xl border p-4 flex items-start gap-3 cursor-pointer transition-colors ${
                  on ? "border-brass bg-brass/[0.05]" : "border-line bg-surface hover:border-line-strong hover:bg-surface-2/40"
                }`}
              >
                <span
                  className={`mt-0.5 w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center shrink-0 transition-colors ${
                    on ? "bg-brass border-brass text-white" : "border-line-strong bg-surface group-hover:border-text-muted"
                  }`}
                  aria-hidden
                >
                  {on && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text leading-snug">{o.title}</span>
                  <span className="block text-[13px] text-text-muted mt-1 leading-relaxed">{o.detail}</span>
                  {o.category && <span className="block text-xs text-text-muted/80 mt-2">{titleCase(o.category)}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="custom-priority" className="block text-sm font-medium text-text mb-2">
          Something else?
        </label>
        <div className="flex gap-2">
          <input
            id="custom-priority"
            value={custom}
            maxLength={200}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Write your own goal, for example: reduce supplier costs by 10%"
            className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-brass"
          />
          <button
            type="button"
            onClick={add}
            disabled={!custom.trim()}
            className="h-10 px-3.5 rounded-lg border border-line bg-surface text-sm text-text hover:bg-surface-2 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-line bg-line overflow-hidden text-sm">
        {[
          { label: "Business", value: summary.name },
          { label: "GST", value: summary.verified ? "Verified" : "Not verified yet" },
          { label: "Website", value: summary.website || "None added" },
          { label: "Tools connected", value: String(summary.tools) },
        ].map((x) => (
          <div key={x.label} className="bg-surface px-4 py-3 min-w-0">
            <dt className="text-xs text-text-muted">{x.label}</dt>
            <dd className="mt-0.5 text-text truncate">{x.value}</dd>
          </div>
        ))}
      </dl>

      {error && (
        <Callout tone="bad" icon={<AlertTriangle className="w-4 h-4" />} title="We couldn't finish setting up">
          {error}
        </Callout>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-between">
        <GhostButton onClick={onBack} disabled={submitting}>
          Back
        </GhostButton>
        <PrimaryButton id="btn-finish" onClick={onFinish} loading={submitting}>
          {submitting ? "Setting up your workspace…" : "Finish setup"}
        </PrimaryButton>
      </div>
    </div>
  );
}

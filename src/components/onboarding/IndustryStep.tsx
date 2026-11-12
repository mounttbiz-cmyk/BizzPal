"use client";

import React from "react";
import { AlertTriangle, Building2, Briefcase, Check, Cloud, Factory, Laptop, Layers, Landmark, ShoppingBag, Stethoscope } from "lucide-react";
import { BUSINESS_TYPES } from "@/lib/onboarding/data";
import { GhostButton, PrimaryButton, StepHeader } from "./ui";

const ICONS: Record<string, React.ReactNode> = {
  it: <Laptop className="w-5 h-5" />,
  real_estate: <Building2 className="w-5 h-5" />,
  d2c: <ShoppingBag className="w-5 h-5" />,
  saas: <Cloud className="w-5 h-5" />,
  agency: <Briefcase className="w-5 h-5" />,
  healthcare: <Stethoscope className="w-5 h-5" />,
  manufacturing: <Factory className="w-5 h-5" />,
  finance: <Landmark className="w-5 h-5" />,
  other: <Layers className="w-5 h-5" />,
};

interface Props {
  selected: string[];
  custom: string;
  error: string;
  onToggle: (id: string) => void;
  onCustom: (v: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function IndustryStep({ selected, custom, error, onToggle, onCustom, onBack, onNext }: Props) {
  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 7 · Your industry" title="What does your business do?">
        Pick every area that fits. This only decides which benchmarks and specialist AI advisers we set up for you.
      </StepHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Industries">
        {BUSINESS_TYPES.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              id={`category-card-${t.id}`}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(t.id)}
              className={`text-left p-4 rounded-xl border flex items-start gap-3 cursor-pointer btn-tactile transition-all ${
                on ? "bg-surface-2 border-brass ring-1 ring-brass/40 shadow-sm" : "bg-surface-2/40 border-line hover:border-line-strong hover:bg-surface-2/70"
              }`}
            >
              <span className="w-9 h-9 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0 text-brass">{ICONS[t.id]}</span>
              <span className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-text block">{t.title}</span>
                <span className="text-xs text-text-muted leading-relaxed block mt-0.5">{t.desc}</span>
              </span>
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 ${on ? "bg-brass border-brass text-bg" : "border-line-strong bg-surface"}`}>
                {on && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </span>
            </button>
          );
        })}
      </div>

      {selected.includes("other") && (
        <div className="space-y-1.5 animate-fade-in">
          <label htmlFor="custom-industry" className="text-xs font-semibold text-text">Which industry?</label>
          <input
            id="custom-industry"
            value={custom}
            onChange={(e) => onCustom(e.target.value)}
            maxLength={80}
            placeholder="e.g. Hospitality, Logistics, EdTech, Agriculture"
            className="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass"
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-rust font-medium flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-between">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <PrimaryButton id="btn-industry-next" onClick={onNext}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

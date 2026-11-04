"use client";

import React, { useState } from "react";
import { ArrowRight, Check, Copy, Loader2 } from "lucide-react";

/** Primary gold button. Text uses the page background colour so it stays readable in dark AND light themes. */
export function PrimaryButton({
  children, onClick, disabled, loading, type = "button", id,
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; type?: "button" | "submit"; id?: string;
}) {
  return (
    <button
      id={id}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className="px-5 py-2.5 rounded-xl bg-brass text-bg font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:brightness-100 transition"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
      <span>{children}</span>
      {!loading && <ArrowRight className="w-3.5 h-3.5" />}
    </button>
  );
}

export function GhostButton({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function StepHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brass-soft text-brass text-[10px] font-bold uppercase tracking-wider">
        {eyebrow}
      </span>
      <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight font-sans">{title}</h1>
      {children ? <p className="text-xs sm:text-[13px] text-text-muted leading-relaxed max-w-xl">{children}</p> : null}
    </div>
  );
}

export type Tone = "good" | "warn" | "bad" | "info";

const TONES: Record<Tone, string> = {
  good: "bg-jade/10 border-jade/30 text-jade",
  warn: "bg-amber/10 border-amber/30 text-amber",
  bad: "bg-rust/10 border-rust/30 text-rust",
  info: "bg-surface-2 border-line text-text-muted",
};

export function Callout({ tone, icon, title, children }: { tone: Tone; icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div role={tone === "bad" ? "alert" : "status"} className={`p-3.5 rounded-xl border flex items-start gap-3 animate-fade-in ${TONES[tone]}`}>
      {icon ? <div className="shrink-0 mt-0.5">{icon}</div> : null}
      <div className="min-w-0 space-y-0.5">
        <div className="text-xs font-bold">{title}</div>
        {children ? <div className="text-[11px] leading-relaxed text-text-muted">{children}</div> : null}
      </div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${TONES[tone]}`}>{children}</span>;
}

/** Read-only value pulled from a verified source. Deliberately not an input. */
export function Fact({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className={`text-xs text-text mt-0.5 break-words ${mono ? "font-mono" : "font-medium"}`}>{value}</div>
    </div>
  );
}

export function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{label}</div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-surface-2 border border-line text-[11px] text-text font-mono break-all select-all">{value}</code>
        <button
          type="button"
          onClick={copy}
          aria-label={`Copy ${label}`}
          className="shrink-0 px-3 rounded-lg border border-line bg-surface hover:border-brass text-text-muted hover:text-brass cursor-pointer transition-colors inline-flex items-center gap-1.5 text-[11px] font-semibold"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

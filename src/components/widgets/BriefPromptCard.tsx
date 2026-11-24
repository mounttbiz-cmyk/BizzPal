"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, NotebookPen } from "lucide-react";

/**
 * Tells the owner how much their AI advisors know about what the business does, and leads to the business brief.
 * It disappears once every question is answered, and never shows to teammates (they cannot edit the brief).
 */
export function BriefPromptCard() {
  const [state, setState] = useState<{ answered: number; total: number; name: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/business/brief", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!cancelled && d?.success && d.canEdit && d.answered < d.total) {
          setState({ answered: d.answered, total: d.total, name: d.businessName || "your business" });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!state) return null;
  const pct = Math.round((state.answered / Math.max(1, state.total)) * 100);
  const fresh = state.answered === 0;

  return (
    <Link
      href="/settings/brief"
      className="group flex flex-col sm:flex-row sm:items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 hover:border-line-strong transition-colors"
    >
      <span className="w-10 h-10 rounded-xl bg-surface-2 text-brass flex items-center justify-center shrink-0">
        <NotebookPen className="w-5 h-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-text">
          {fresh ? `Tell your advisors what ${state.name} does` : `Your advisors know ${state.answered} of ${state.total} things about ${state.name}`}
        </span>
        <span className="block text-sm text-text-muted mt-0.5">
          {fresh
            ? "Describe it in a few lines, or share a link or your menu. Every answer gets more specific to your business."
            : "Fill in the rest so their advice fits how your business really works."}
        </span>
        {!fresh && (
          <span className="mt-2.5 block h-1.5 max-w-xs rounded-full bg-surface-2 overflow-hidden">
            <span className="block h-full bg-brass rounded-full" style={{ width: `${pct}%` }} />
          </span>
        )}
      </span>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brass shrink-0">
        {fresh ? "Start the brief" : "Complete the brief"}
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

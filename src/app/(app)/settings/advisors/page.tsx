"use client";

import React, { useState, useEffect } from "react";
import { saveStoredCustomAdvisors, getStoredCustomAdvisors, LEGACY_NAMES } from "@/lib/advisors";

const ADVISORS = [
  { key: "ceo", title: "CEO", hint: "Company direction and strategy", placeholder: "e.g. CEO, Founder", fallback: "CEO" },
  { key: "cfo", title: "CFO", hint: "Cash, runway and governance", placeholder: "e.g. CFO, Finance Head", fallback: "CFO" },
  { key: "marketing", title: "Marketing", hint: "Demand and customer acquisition", placeholder: "e.g. CMO, Growth Lead", fallback: "Marketing" },
  { key: "sales", title: "Sales", hint: "Pipeline and deal velocity", placeholder: "e.g. VP Sales", fallback: "Sales" },
  { key: "hr", title: "HR & Talent", hint: "Hiring, capacity and culture", placeholder: "e.g. People Lead", fallback: "HR & Talent" },
  { key: "operations", title: "Operations", hint: "Efficiency, SLAs and processes", placeholder: "e.g. COO, Ops Lead", fallback: "Operations" },
  { key: "strategy", title: "Strategy", hint: "Moats and market expansion", placeholder: "e.g. Chief Strategy Officer", fallback: "Strategy" },
] as const;

type Names = Record<string, string>;

const defaults = (): Names => Object.fromEntries(ADVISORS.map(a => [a.key, a.fallback]));

export default function AdvisorsSettingsPage() {
  const [names, setNames] = useState<Names>(defaults());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const stored: any = getStoredCustomAdvisors();
        const next: Names = {};
        ADVISORS.forEach(a => {
          const n = stored[a.key]?.name;
          next[a.key] = n && !LEGACY_NAMES.has(String(n).toLowerCase()) ? n : a.fallback;
        });
        setNames(next);
      } catch {}
    };
    sync();
    window.addEventListener("bizzpal_advisors_updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const current: any = getStoredCustomAdvisors();
      const next: Record<string, { name?: string; avatar?: string }> = { ...current };
      ADVISORS.forEach(a => {
        next[a.key] = { ...next[a.key], name: (names[a.key] || "").trim() || undefined };
      });
      saveStoredCustomAdvisors(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save advisor names", err);
    }
  };

  const handleReset = () => {
    setNames(defaults());
    saveStoredCustomAdvisors({});
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <section className="rounded-2xl border border-line bg-surface shadow-sm">
        <div className="p-6 border-b border-line flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text">AI advisors</h2>
            <p className="text-sm text-text-muted mt-1 max-w-xl leading-relaxed">
              Give each advisor the name your team uses. The names appear in the AI Workspace, dashboard, briefings and
              playbooks.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-2 rounded-xl border border-line text-sm text-text-muted hover:text-text hover:bg-surface-2 shrink-0 cursor-pointer"
          >
            Reset to defaults
          </button>
        </div>

        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6 p-6">
          {ADVISORS.map(a => (
            <li key={a.key} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-2 flex items-center justify-center text-sm font-medium text-text shrink-0">
                  {(names[a.key] || a.title).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{a.title}</p>
                  <p className="text-xs text-text-muted">{a.hint}</p>
                </div>
              </div>
              <input
                type="text"
                value={names[a.key] || ""}
                onChange={e => setNames(prev => ({ ...prev, [a.key]: e.target.value }))}
                placeholder={a.placeholder}
                maxLength={30}
                className="w-full px-3 py-2.5 rounded-xl border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
              />
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 p-4 rounded-2xl border border-line bg-surface shadow-lg">
        <p className="text-sm text-text-muted">{saved ? <span className="text-text">Names saved.</span> : "Names update everywhere once saved."}</p>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
        >
          Save names
        </button>
      </div>
    </form>
  );
}

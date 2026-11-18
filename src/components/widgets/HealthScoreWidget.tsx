"use client";

import { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { AnimatedNumber } from "../ui/AnimatedNumber";

import { useBusinessDataSync } from "@/lib/upload/events";
import { computeHealth, weightedHealth, type HealthBreakdown } from "@/lib/health/score";

interface HealthScoreProps {
  score?: number;
  delta?: number;
}

export function HealthScoreWidget(_props: HealthScoreProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [health, setHealth] = useState<HealthBreakdown | null>(null);

  const applyProfile = (saved: any) => {
    if (saved) setHealth(computeHealth(saved));
  };

  useEffect(() => {
    try {
      const savedStr = localStorage.getItem("bizzpal_business_profile");
      if (savedStr) {
        applyProfile(JSON.parse(savedStr));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) applyProfile(d.business);
          })
          .catch(() => {});
      }
    } catch {
      // ignore
    }
  }, []);

  useBusinessDataSync(metrics => {
    applyProfile(metrics);
  });

  const score = health ? weightedHealth({ financial: health.financial, margin: health.margin, team: health.team }) : null;

  const components = [
    {
      key: "financial",
      name: "Cash runway",
      score: health?.financial ?? null,
      detail: health?.runwayMonths ? `Your cash lasts about ${health.runwayMonths} months at the current burn.` : "Add your cash in bank and monthly burn.",
    },
    {
      key: "margin",
      name: "Margin",
      score: health?.margin ?? null,
      detail: health?.margin !== null && health?.margin !== undefined ? "Worked out from the gross margin you entered." : "Add your gross margin in Settings.",
    },
    {
      key: "team",
      name: "Revenue per head",
      score: health?.team ?? null,
      detail: health?.revenuePerHead ? `Annual revenue is ${health.revenuePerHead} per team member.` : "Add your revenue and team size.",
    },
  ];

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - ((score ?? 0) / 100) * circumference;
  const tone = (s: number) =>
    s >= 75
      ? { text: "text-jade", bg: "bg-jade", label: "Good" }
      : s >= 50
      ? { text: "text-brass", bg: "bg-brass", label: "Fair" }
      : { text: "text-rust", bg: "bg-rust", label: "At risk" };
  const overall = score !== null ? tone(score) : { text: "text-text-muted", bg: "bg-line", label: "No data" };
  const selected = components.find(c => c.key === selectedComponent);

  return (
    <ContainerTile span={2} id="widget_health_score">
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text">Business health score</h2>
          <p className="text-sm text-text-muted mt-0.5">Worked out only from the figures you have entered.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 128 128" className="w-32 h-32 -rotate-90">
              <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface-2" />
              {score !== null && (
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className={`transition-all duration-500 ${overall.text}`}
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-semibold text-text leading-none">{score !== null ? <AnimatedNumber value={String(score)} /> : "—"}</span>
              <span className={`text-xs mt-1.5 ${overall.text}`}>{overall.label}</span>
            </div>
          </div>

          <p className="text-sm text-text-muted leading-relaxed text-center sm:text-left">
            {score === null
              ? "There is no score yet because no figures have been entered. Add your cash, burn, revenue and team size to get one."
              : "Only the parts that have figures behind them are counted. Add more figures to include the rest. It is a rule of thumb for reading your numbers, not an audit."}
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 min-[420px]:grid-cols-3 gap-2">
            {components.map(comp => {
              const isSelected = selectedComponent === comp.key;
              return (
                <button
                  key={comp.key}
                  type="button"
                  onClick={() => setSelectedComponent(isSelected ? null : comp.key)}
                  className={`p-3 rounded-xl text-left cursor-pointer transition-colors ${isSelected ? "bg-surface-2" : "bg-surface-2/50 hover:bg-surface-2"}`}
                >
                  <div className="text-xs text-text-muted truncate">{comp.name}</div>
                  <div className="text-lg font-semibold text-text mt-0.5">{comp.score !== null ? <AnimatedNumber value={String(comp.score)} /> : "—"}</div>
                  <div className="w-full h-1 bg-line rounded-full overflow-hidden mt-1.5">
                    {comp.score !== null && <div className={`h-full rounded-full ${tone(comp.score).bg}`} style={{ width: `${comp.score}%` }} />}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && (
            <p className="text-sm text-text-muted leading-relaxed">
              <span className="font-medium text-text">{selected.name}:</span> {selected.detail}
            </p>
          )}
        </div>
      </div>
    </ContainerTile>
  );
}

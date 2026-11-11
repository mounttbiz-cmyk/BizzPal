"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { AnimatedNumber } from "../ui/AnimatedNumber";

import { useBusinessDataSync } from "@/lib/upload/events";
import { computeHealth, weightedHealth } from "@/lib/health/score";

interface HealthScoreProps {
  score?: number;
  delta?: number;
}

export function HealthScoreWidget({
  score: propScore,
  delta,
}: HealthScoreProps) {
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [runwayMo, setRunwayMo] = useState("0.0");
  const [revPerHead, setRevPerHead] = useState("₹0");
  const [industryName, setIndustryName] = useState("Enterprise");
  const [financialScore, setFinancialScore] = useState(50);
  const [growthScore, setGrowthScore] = useState(50);
  const [customerScore, setCustomerScore] = useState(50);
  const [opsScore, setOpsScore] = useState(50);
  const [teamScore, setTeamScore] = useState(50);
  const [isFresh, setIsFresh] = useState(true);

  const applyProfile = (saved: any) => {
    if (!saved) return;
    const h = computeHealth(saved);
    setIsFresh(h.isFresh);
    setRunwayMo(h.runwayMonths);
    setRevPerHead(h.revenuePerHead);
    setFinancialScore(h.financial);
    setGrowthScore(h.growth);
    setCustomerScore(h.customer);
    setOpsScore(h.operations);
    setTeamScore(h.team);

    if (saved.industry) {
      const names: Record<string, string> = {
        it_tech: "IT & Tech Services",
        saas: "B2B SaaS",
        d2c: "E-Commerce & Retail",
        agency: "Agency & Professional Services",
        healthcare: "Healthcare & Clinics",
        manufacturing: "Manufacturing & Physical Goods",
        finance: "Financial Services & Wealth",
        real_estate: "Real Estate & Property",
      };
      setIndustryName(names[saved.industry] || saved.industryLabel || saved.industry.toUpperCase());
    }

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
            if (d.success && d.business) {
              applyProfile(d.business);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useBusinessDataSync(metrics => {
    applyProfile(metrics);
  });

  // Calculate dynamic weighted score
  const displayScore = weightedHealth({
    financial: financialScore,
    growth: growthScore,
    customer: customerScore,
    operations: opsScore,
    team: teamScore,
  });

  const components = [
    { key: "financial", name: "Financial", score: financialScore, weight: "25%", detail: runwayMo !== "0.0" ? `Runway buffer: ${runwayMo} mo.` : "Cash & burn telemetry unrecorded." },
    { key: "growth", name: "Growth", score: growthScore, weight: "20%", detail: growthScore > 50 ? "Verified revenue run-rate trajectory." : "Awaiting revenue stream data." },
    { key: "customer", name: "Customer", score: customerScore, weight: "20%", detail: customerScore > 50 ? "Contract pipeline active." : "Awaiting client telemetry." },
    { key: "operations", name: "Operations", score: opsScore, weight: "20%", detail: opsScore > 50 ? "Operating margins mapped." : "Baseline operational telemetry." },
    { key: "team", name: "Team", score: teamScore, weight: "15%", detail: revPerHead !== "₹0" ? `Annual productivity ${revPerHead}/head.` : "Headcount unrecorded." },
  ];

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const tone = (score: number) =>
    score >= 75
      ? { text: "text-jade", bg: "bg-jade", label: "Good" }
      : score >= 50
      ? { text: "text-brass", bg: "bg-brass", label: "Fair" }
      : { text: "text-rust", bg: "bg-rust", label: "At risk" };
  const overall = tone(displayScore);
  const selected = components.find(c => c.key === selectedComponent);

  return (
    <ContainerTile span={2} id="widget_health_score">
      <div className="space-y-6">
        <div>
          <h2 className="text-base font-semibold text-text">Business health score</h2>
          <p className="text-sm text-text-muted mt-0.5">Based on cash, growth, customers, operations and team.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 shrink-0">
            <svg viewBox="0 0 128 128" className="w-32 h-32 -rotate-90">
              <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-surface-2" />
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
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-4xl font-semibold text-text leading-none">
                <AnimatedNumber value={String(displayScore)} />
              </span>
              <span className={`text-xs mt-1.5 ${overall.text}`}>{overall.label}</span>
            </div>
          </div>

          <p className="text-sm text-text-muted leading-relaxed text-center sm:text-left">
            {isFresh
              ? "Add your numbers with Quick business input to get a real score. Until then this shows a neutral starting point."
              : `Calculated from your cash runway, revenue per team member and typical figures for ${industryName}.`}
          </p>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 min-[420px]:grid-cols-3 sm:grid-cols-5 gap-2">
            {components.map(comp => {
              const isSelected = selectedComponent === comp.key;
              return (
                <button
                  key={comp.key}
                  type="button"
                  onClick={() => setSelectedComponent(isSelected ? null : comp.key)}
                  className={`p-3 rounded-xl text-left cursor-pointer transition-colors ${
                    isSelected ? "bg-surface-2" : "bg-surface-2/50 hover:bg-surface-2"
                  }`}
                >
                  <div className="text-xs text-text-muted truncate">{comp.name}</div>
                  <div className="text-lg font-semibold text-text mt-0.5">
                    <AnimatedNumber value={String(comp.score)} />
                  </div>
                  <div className="w-full h-1 bg-line rounded-full overflow-hidden mt-1.5">
                    <div className={`h-full rounded-full ${tone(comp.score).bg}`} style={{ width: `${comp.score}%` }} />
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

"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { ProvenanceBadge } from "../ui/Badge";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { ShieldCheck, ChevronRight, TrendingUp, Activity } from "lucide-react";

import { useBusinessDataSync } from "@/lib/upload/events";

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
  const [isUploaded, setIsUploaded] = useState(false);

  const applyProfile = (saved: any) => {
    if (!saved) return;
    const cash = Number(saved.cash || saved.cashOnHand || 0);
    const burn = Number(saved.burn || saved.monthlyBurn || saved.monthlyNetBurn || 0);
    const mRev = Number(saved.revenue || saved.monthlyRevenue || 0);
    const annRev = Number(saved.annualRevenue || (mRev > 0 ? mRev * 12 : 0));
    const team = Number(saved.teamSize || (mRev > 0 ? 1 : 0));
    const margin = Number(saved.grossMargin || 0);

    const hasAnyData = cash > 0 || burn > 0 || mRev > 0 || team > 0;
    setIsFresh(!hasAnyData);

    // 1. Financial vector
    if (burn > 0) {
      const rVal = Number((cash / burn).toFixed(1));
      setRunwayMo(String(rVal));
      if (rVal >= 18) setFinancialScore(95);
      else if (rVal >= 12) setFinancialScore(90);
      else if (rVal >= 8) setFinancialScore(82);
      else if (rVal >= 5) setFinancialScore(70);
      else if (rVal >= 3) setFinancialScore(55);
      else setFinancialScore(35);
    } else if (cash > 0) {
      setRunwayMo("18+");
      setFinancialScore(92);
    } else {
      setRunwayMo("0.0");
      setFinancialScore(hasAnyData ? 50 : 50);
    }

    // 2. Growth vector
    if (mRev >= 1000000) setGrowthScore(92);
    else if (mRev >= 500000) setGrowthScore(85);
    else if (mRev >= 100000) setGrowthScore(76);
    else if (mRev > 0) setGrowthScore(68);
    else setGrowthScore(50);

    // 3. Customer vector
    if (mRev >= 500000) setCustomerScore(88);
    else if (mRev > 0) setCustomerScore(78);
    else setCustomerScore(50);

    // 4. Operations vector
    if (margin >= 75) setOpsScore(88);
    else if (margin >= 50) setOpsScore(78);
    else if (mRev > 0) setOpsScore(70);
    else setOpsScore(50);

    // 5. Team vector
    if (annRev > 0 && team > 0) {
      const rph = Math.round(annRev / Math.max(1, team));
      if (rph >= 10000000) {
        setRevPerHead(`₹${(rph / 10000000).toFixed(1)}Cr`);
        setTeamScore(92);
      } else if (rph >= 100000) {
        setRevPerHead(`₹${(rph / 100000).toFixed(1)}L`);
        setTeamScore(rph >= 2500000 ? 90 : rph >= 1000000 ? 82 : 72);
      } else {
        setRevPerHead(`₹${rph.toLocaleString("en-IN")}`);
        setTeamScore(65);
      }
    } else {
      setRevPerHead(team > 0 ? `${team} FTE` : "0 FTE");
      setTeamScore(team > 0 ? 60 : 50);
    }

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

    if (saved.isUploadedData) {
      setIsUploaded(true);
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
  const displayScore = Math.round(
    financialScore * 0.25 +
    growthScore * 0.20 +
    customerScore * 0.20 +
    opsScore * 0.20 +
    teamScore * 0.15
  );

  const components = [
    { key: "financial", name: "Financial", score: financialScore, weight: "25%", detail: runwayMo !== "0.0" ? `Runway buffer: ${runwayMo} mo.` : "Cash & burn telemetry unrecorded." },
    { key: "growth", name: "Growth", score: growthScore, weight: "20%", detail: growthScore > 50 ? "Verified revenue run-rate trajectory." : "Awaiting revenue stream data." },
    { key: "customer", name: "Customer", score: customerScore, weight: "20%", detail: customerScore > 50 ? "Contract pipeline active." : "Awaiting client telemetry." },
    { key: "operations", name: "Operations", score: opsScore, weight: "20%", detail: opsScore > 50 ? "Operating margins mapped." : "Baseline operational telemetry." },
    { key: "team", name: "Team", score: teamScore, weight: "15%", detail: revPerHead !== "₹0" ? `Annual productivity ${revPerHead}/head.` : "Headcount unrecorded." },
  ];

  // SVG circular gauge calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const strokeColor = displayScore >= 80 ? "var(--gold)" : displayScore >= 65 ? "#38BDF8" : "#F43F5E";

  return (
    <ContainerTile span={2} id="widget_health_score">
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center text-gold">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-text uppercase tracking-wider font-sans">
                Corporate Health Score
              </h2>
              <p className="text-[11px] text-text-muted">
                Deterministic telemetry synthesized across 5 operational vectors
              </p>
            </div>
          </div>
        </div>

        {/* Circular Gauge + Hero Score */}
        <div className="flex flex-col @sm:flex-row items-center gap-6 py-4">
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-28 h-28 transform -rotate-90">
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke="currentColor"
                strokeWidth="7"
                fill="transparent"
                className="text-surface-2"
              />
              <circle
                cx="56"
                cy="56"
                r={radius}
                stroke={strokeColor}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-story ease-out-custom"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl sm:text-4xl font-black num-tabular text-text font-mono leading-none tracking-tight">
                <AnimatedNumber value={String(displayScore)} />
              </span>
              <span className="text-[10px] text-gold font-bold font-mono mt-1 uppercase tracking-wider">
                {displayScore >= 80 ? "Optimal" : displayScore >= 65 ? "Stable" : "Calibrating"}
              </span>
            </div>
          </div>

          <div className="flex-1 space-y-2 text-center @sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{isFresh ? "Baseline Initiated" : "+ Live Calibrated"}</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Composite telemetry synthesized across cash runway, revenue per FTE, and operational benchmarks for {industryName}.
            </p>
          </div>
        </div>

        {/* Component Breakdown with Progress Bars */}
        <div className="space-y-2 pt-3 border-t border-white/[0.05]">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase text-text-muted/80 px-1 tracking-widest font-mono">
            <span>Category Performance</span>
            <span>Weight</span>
          </div>

          <div className="grid grid-cols-1 @xs:grid-cols-5 gap-2">
            {components.map(comp => {
              const isSelected = selectedComponent === comp.key;
              return (
                <button
                  key={comp.key}
                  type="button"
                  onClick={() => setSelectedComponent(isSelected ? null : comp.key)}
                  className={`p-2.5 rounded-xl text-left transition-all btn-tactile ${
                    isSelected
                      ? "bg-amber-400/15 border border-amber-400/40 shadow-xs"
                      : "bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span className="truncate font-medium">{comp.name}</span>
                    <span className="font-mono text-[9px] text-text-muted/70">{comp.weight}</span>
                  </div>
                  <div className="text-sm sm:text-base font-black num-tabular text-text font-mono mt-1">
                    <AnimatedNumber value={String(comp.score)} />
                  </div>
                  <div className="w-full h-1 bg-surface rounded-full overflow-hidden mt-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-slow ease-out-custom ${
                        comp.score >= 80
                          ? "bg-gradient-to-r from-gold-light to-gold"
                          : comp.score >= 70
                          ? "bg-gradient-to-r from-gold to-gold-dark"
                          : "bg-gradient-to-r from-rust to-gold-dark"
                      }`}
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expandable breakdown explanation */}
          {selectedComponent && (
            <div className="mt-2 p-3 rounded-xl bg-surface-2/80 border border-gold/30 text-xs text-text animate-fade-in flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="font-bold text-gold font-mono text-[11px] uppercase tracking-wider block">
                  {components.find(c => c.key === selectedComponent)?.name} Analysis
                </span>
                <p className="text-text-muted text-xs leading-relaxed">
                  {components.find(c => c.key === selectedComponent)?.detail}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedComponent(null)}
                className="text-[10px] px-2 py-0.5 rounded-lg bg-surface border border-line text-text-muted hover:text-text font-medium shrink-0"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </ContainerTile>
  );
}

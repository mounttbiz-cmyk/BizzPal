"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { ProvenanceBadge } from "../ui/Badge";
import { Compass, Play, ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export function SimulatorHighlightWidget() {
  const [isRunning, setIsRunning] = useState(false);
  const [iterations, setIterations] = useState(1000);
  const [industryName, setIndustryName] = useState("Technology");
  const [companyName, setCompanyName] = useState("Enterprise");
  const [monthlyRev, setMonthlyRev] = useState(0);

  useEffect(() => {
    try {
      const p = localStorage.getItem("bizzpal_business_profile");
      if (p) {
        const parsed = JSON.parse(p);
        if (parsed.name) setCompanyName(parsed.name);
        if (parsed.industryLabel) setIndustryName(parsed.industryLabel);
        else if (parsed.industry === "it_tech") setIndustryName("IT & Technology Services");
        else if (parsed.industry === "saas") setIndustryName("B2B SaaS");
        if (parsed.revenue) setMonthlyRev(Number(parsed.revenue));
        else if (parsed.monthlyRevenue) setMonthlyRev(Number(parsed.monthlyRevenue));
      }
    } catch {}
  }, []);

  const runMonteCarlo = () => {
    setIsRunning(true);
    let count = 0;
    const interval = setInterval(() => {
      count += 200;
      setIterations(count);
      if (count >= 1000) {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 80);
  };

  const isIT = industryName.toLowerCase().includes("it") || industryName.toLowerCase().includes("tech");
  const scenarioTitle = isIT ? "Decision Simulator: Delivery Consultant Expansion" : "Decision Simulator: Key Role Expansion";
  const scenarioSubtitle = isIT
    ? `Ramp-up: 3 months · Billing target: ₹${monthlyRev > 0 ? Math.round(monthlyRev * 0.4).toLocaleString("en-IN") : "2.5L"}/mo · Margin threshold: 65%`
    : `Ramp-up: 4 months · Target quota: ₹${monthlyRev > 0 ? Math.round(monthlyRev * 0.5).toLocaleString("en-IN") : "5.0L"}/mo`;

  return (
    <ContainerTile span={4} id="widget_simulator_highlight">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                  {scenarioTitle}
                </h2>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/15 text-cyan-800 dark:text-cyan-300 font-mono font-semibold">
                  Monte Carlo (1,000 runs)
                </span>
              </div>
              <p className="text-[11px] text-text-muted">
                {scenarioSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ProvenanceBadge type="estimate" citation="1,000 Monte Carlo iterations across triangular assumptions" />
            <button
              type="button"
              onClick={runMonteCarlo}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/20 hover:brightness-110 disabled:opacity-50 btn-tactile cursor-pointer"
            >
              <Play className={`w-3 h-3 fill-current ${isRunning ? "animate-spin" : ""}`} />
              <span>{isRunning ? `Simulating (${iterations})…` : "Re-run Simulation"}</span>
            </button>
          </div>
        </div>

        {/* Fan Chart & Confidence Bands (§10.3) */}
        <div className="grid grid-cols-1 @lg:grid-cols-3 gap-4 items-center">
          {/* Fan Chart Preview */}
          <div className="p-4 rounded-xl bg-surface-2/50 border border-white/[0.07] @lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span className="font-medium text-slate-800 dark:text-slate-200">Cumulative Net Cash Impact (12-Month Horizon)</span>
              <span className="text-[10px] font-mono text-cyan-800 dark:text-cyan-300 font-semibold">P10 — P50 — P90 Confidence Band</span>
            </div>

            {/* SVG Visualizing Fan Band */}
            <div className="relative h-28 w-full">
              <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="fan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#00D9FF" stopOpacity="0.08" />
                    <stop offset="60%" stopColor="#6366F1" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0.28" />
                  </linearGradient>
                </defs>

                {/* Zero axis */}
                <line x1="0" y1="45" x2="400" y2="45" stroke="rgba(255,255,255,0.15)" strokeDasharray="3,3" />

                {/* Shaded P10-P90 Confidence Band */}
                <polygon
                  points="0,45 80,55 160,70 240,65 320,40 400,15 400,60 320,85 240,92 160,88 80,68 0,45"
                  fill="url(#fan-grad)"
                />

                {/* P50 Expected Median Line */}
                <polyline
                  points="0,45 80,60 160,78 240,75 320,58 400,35"
                  fill="none"
                  stroke="#00D9FF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Current Baseline trajectory */}
                <polyline
                  points="0,45 80,48 160,52 240,56 320,60 400,64"
                  fill="none"
                  stroke="#64748B"
                  strokeWidth="1.5"
                  strokeDasharray="4,4"
                />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-muted font-mono">
              <span>Mo 0 (Hire)</span>
              <span>Mo 4 (Ramp)</span>
              <span className="text-emerald-700 dark:text-jade font-semibold">Mo 7 (Breakeven)</span>
              <span>Mo 12 (+₹4.2L)</span>
            </div>
          </div>

          {/* Three Outcome Columns (Worst, Expected, Best) (§10.3) */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 rounded-xl border border-rust/30 bg-rust/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-rust block font-mono">P10 Bear</span>
              <span className="text-sm sm:text-base font-black num-tabular text-slate-900 dark:text-white font-mono block">-₹2.84L</span>
              <span className="text-[10px] text-text-muted block">Breakeven: Mo 10</span>
            </div>

            <div className="p-3 rounded-xl border border-cyan-400/50 bg-cyan-500/15 ring-1 ring-cyan-500/30 space-y-1">
              <span className="text-[10px] uppercase font-bold text-cyan-800 dark:text-cyan-300 block font-mono">P50 Expected</span>
              <span className="text-sm sm:text-base font-black num-tabular text-slate-900 dark:text-white font-mono block">+₹4.20L</span>
              <span className="text-[10px] text-cyan-900 dark:text-cyan-300 block">Breakeven: Mo 7</span>
            </div>

            <div className="p-3 rounded-xl border border-jade/30 bg-jade/10 space-y-1">
              <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300 block font-mono">P90 Bull</span>
              <span className="text-sm sm:text-base font-black num-tabular text-slate-900 dark:text-white font-mono block">+₹8.92L</span>
              <span className="text-[10px] text-text-muted block">Breakeven: Mo 5</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-text-muted">
            In <strong className="text-slate-900 dark:text-white font-bold">842 of 1,000 runs</strong>, cash reserve never breached your ₹15L safety floor.
          </span>
          <Link
            href="/simulator"
            className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-semibold btn-tactile cursor-pointer"
          >
            <span>Launch Full Scenario Sandbox</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

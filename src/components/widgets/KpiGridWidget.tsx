"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { ProvenanceBadge, StatusBadge } from "../ui/Badge";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { TrendingUp, TrendingDown, HelpCircle, MessageSquare, DollarSign, Clock, Users, Percent, BarChart2 } from "lucide-react";
import Link from "next/link";

import { useBusinessDataSync } from "@/lib/upload/events";

interface KpiItem {
  id: string;
  label: string;
  value: string;
  delta: string;
  direction: "up" | "down";
  sentiment: "positive" | "negative";
  basis: string;
  color: string;
  gradientId: string;
  icon: React.ReactNode;
  points: string;
  areaPoints: string;
  provenance: "from_data" | "benchmark" | "estimate";
}

export function KpiGridWidget() {
  const [industryLabel, setIndustryLabel] = useState("Enterprise");
  const [monthlyRev, setMonthlyRev] = useState(0);
  const [annualRev, setAnnualRev] = useState(0);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [grossMarginVal, setGrossMarginVal] = useState(0);
  const [isUploaded, setIsUploaded] = useState(false);
  const [sparklinePoints, setSparklinePoints] = useState<string | null>(null);

  const applyProfile = (p: any) => {
    if (!p) return;
    if (p.industryLabel) setIndustryLabel(p.industryLabel);
    else if (p.industry) setIndustryLabel(p.industry);
    if (p.revenue !== undefined && p.revenue !== null) setMonthlyRev(Number(p.revenue));
    else if (p.monthlyRevenue !== undefined && p.monthlyRevenue !== null) setMonthlyRev(Number(p.monthlyRevenue));
    if (p.annualRevenue !== undefined && p.annualRevenue !== null) setAnnualRev(Number(p.annualRevenue));
    else if (p.revenue) setAnnualRev(Number(p.revenue) * 12);
    if (p.burn !== undefined && p.burn !== null) setBurn(Number(p.burn));
    else if (p.monthlyBurn !== undefined && p.monthlyBurn !== null) setBurn(Number(p.monthlyBurn));
    if (p.cash !== undefined && p.cash !== null) setCash(Number(p.cash));
    else if (p.cashOnHand !== undefined && p.cashOnHand !== null) setCash(Number(p.cashOnHand));
    if (p.teamSize !== undefined && p.teamSize !== null) setTeamSize(Number(p.teamSize));
    if (p.grossMargin !== undefined && p.grossMargin !== null) setGrossMarginVal(Number(p.grossMargin));
    if (p.isUploadedData) setIsUploaded(true);

    if (Array.isArray(p.trend) && p.trend.length > 1) {
      const min = Math.min(...p.trend);
      const max = Math.max(...p.trend);
      const range = max - min || 1;
      const pts = p.trend.map((val: number, i: number) => {
        const x = Math.round((i / (p.trend.length - 1)) * 75);
        const y = Math.round(22 - ((val - min) / range) * 18);
        return `${x},${y}`;
      }).join(" ");
      setSparklinePoints(pts);
    }
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_business_profile");
      if (saved) {
        applyProfile(JSON.parse(saved));
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

  useEffect(() => {
    const handleTimeframe = (e: any) => {
      const tf = e.detail?.timeframe;
      if (tf === "7D Trend") {
        setSparklinePoints("0,16 15,12 30,15 45,8 60,6 75,2");
      } else if (tf === "Month to Date") {
        setSparklinePoints("0,22 15,18 30,14 45,11 60,9 75,4");
      } else if (tf === "Q3 Live") {
        setSparklinePoints("0,20 15,19 30,13 45,10 60,5 75,1");
      } else {
        setSparklinePoints("0,20 15,16 30,17 45,9 60,7 75,3");
      }
    };
    window.addEventListener("bizzpal_timeframe_changed", handleTimeframe);
    return () => window.removeEventListener("bizzpal_timeframe_changed", handleTimeframe);
  }, []);

  useBusinessDataSync(metrics => {
    applyProfile(metrics);
  });

  const runwayMonths = burn > 0 ? (cash / burn).toFixed(1) : cash > 0 ? "18+" : "0.0";
  const effectiveTeam = teamSize || (monthlyRev > 0 ? 1 : 0);
  const revPerHead = effectiveTeam > 0 ? Math.round((annualRev || monthlyRev * 12) / effectiveTeam) : 0;

  const isFresh = monthlyRev === 0 && burn === 0 && cash === 0;

  const kpis: KpiItem[] = [
    {
      id: "mrr",
      label: "Monthly Recurring Revenue",
      value: `₹${monthlyRev.toLocaleString("en-IN")}`,
      delta: isFresh ? "Baseline" : "+ Verified",
      direction: "up",
      sentiment: monthlyRev > 0 ? "positive" : "negative",
      basis: monthlyRev > 0 ? "active operating billings" : "awaiting billings",
      color: "#00D9FF",
      gradientId: "grad-mrr",
      icon: <DollarSign className="w-4 h-4 text-cyan-400" />,
      points: sparklinePoints || "0,20 15,16 30,17 45,9 60,7 75,3",
      areaPoints: sparklinePoints ? `${sparklinePoints} 75,25 0,25` : "0,20 15,16 30,17 45,9 60,7 75,3 75,25 0,25",
      provenance: isUploaded ? "from_data" : "estimate",
    },
    {
      id: "runway",
      label: "Estimated Cash Runway",
      value: `${runwayMonths} mo`,
      delta: isFresh ? "Baseline" : burn > 0 ? `${runwayMonths} mo buffer` : "Zero Burn",
      direction: "up",
      sentiment: Number(runwayMonths) >= 6 || runwayMonths === "18+" ? "positive" : "negative",
      basis: burn > 0 ? `₹${burn.toLocaleString("en-IN")}/mo net burn` : "awaiting burn data",
      color: "#F59E0B",
      gradientId: "grad-runway",
      icon: <Clock className="w-4 h-4 text-amber-400" />,
      points: "0,19 15,18 30,14 45,13 60,9 75,5",
      areaPoints: "0,19 15,18 30,14 45,13 60,9 75,5 75,25 0,25",
      provenance: isUploaded ? "from_data" : "estimate",
    },
    {
      id: "rev_head",
      label: "Annual Revenue / Head",
      value: revPerHead > 0 ? `₹${revPerHead.toLocaleString("en-IN")}` : "₹0",
      delta: isFresh ? "Baseline" : effectiveTeam > 0 ? `${effectiveTeam} FTE` : "Unassigned",
      direction: "up",
      sentiment: revPerHead > 0 ? "positive" : "negative",
      basis: effectiveTeam > 0 ? `${effectiveTeam} team members` : "awaiting headcount",
      color: "#8B5CF6",
      gradientId: "grad-revhead",
      icon: <Users className="w-4 h-4 text-violet-400" />,
      points: "0,18 15,15 30,16 45,10 60,8 75,4",
      areaPoints: "0,18 15,15 30,16 45,10 60,8 75,4 75,25 0,25",
      provenance: isUploaded ? "from_data" : "estimate",
    },
    {
      id: "gross_margin",
      label: "Gross Margin Efficiency",
      value: grossMarginVal > 0 ? `${grossMarginVal}%` : "—",
      delta: isFresh ? "Baseline" : grossMarginVal > 0 ? "Optimal" : "Pending",
      direction: "up",
      sentiment: grossMarginVal >= 50 ? "positive" : "negative",
      basis: grossMarginVal > 0 ? `tailored for ${industryLabel}` : "awaiting COGS data",
      color: "#10B981",
      gradientId: "grad-margin",
      icon: <Percent className="w-4 h-4 text-emerald-400" />,
      points: "0,17 15,14 30,15 45,11 60,7 75,3",
      areaPoints: "0,17 15,14 30,15 45,11 60,7 75,3 75,25 0,25",
      provenance: isUploaded ? "from_data" : "estimate",
    },
  ];

  return (
    <ContainerTile span={4} id="widget_kpi_board">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-line/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-text uppercase tracking-wider font-sans">
                Core Performance Indicators
              </h2>
              <p className="text-[11px] text-text-muted">
                Continuous telemetry tailored for {industryLabel} in Indian Rupees (₹)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isUploaded ? (
              <StatusBadge label="Uploaded Data Synced" tone="live" pulse />
            ) : (
              <StatusBadge label="Live Stream" tone="neutral" />
            )}
          </div>
        </div>

        {/* 4-column KPI cards grid */}
        <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-3.5">
          {kpis.map(kpi => (
            <div
              key={kpi.id}
              className="p-4 rounded-xl bg-surface-2/50 border border-line hover:border-line-strong flex flex-col justify-between space-y-3 transition-all duration-200 group relative overflow-hidden"
            >
              {/* Top ambient color glow */}
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none -mr-8 -mt-8"
                style={{ backgroundColor: kpi.color }}
              />

              <div className="flex items-center gap-2.5 relative z-10 w-full min-w-0">
                <div className="p-1.5 rounded-lg bg-surface/80 border border-line shrink-0">
                  {kpi.icon}
                </div>
                <span className="text-xs text-text font-medium leading-snug">
                  {kpi.label}
                </span>
              </div>

              {/* Value and SVG Sparkline with Gradient Fill */}
              <div className="flex items-end justify-between pt-1 relative z-10">
                <div className="text-2xl sm:text-3xl font-extrabold num-tabular text-text tracking-tight font-mono">
                  <AnimatedNumber value={kpi.value} />
                </div>

                {/* SVG Sparkline */}
                <svg className="w-20 h-7 shrink-0 overflow-visible" viewBox="0 0 75 25">
                  <defs>
                    <linearGradient id={kpi.gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={kpi.color} stopOpacity="0.35" />
                      <stop offset="100%" stopColor={kpi.color} stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={kpi.areaPoints}
                    fill={`url(#${kpi.gradientId})`}
                  />
                  <polyline
                    points={kpi.points}
                    fill="none"
                    stroke={kpi.color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              {/* Delta & Basis with 'Discuss with AI' */}
              <div className="flex items-center justify-between pt-2 border-t border-line/60 text-[11px] relative z-10">
                <div
                  className={`inline-flex items-center gap-1 font-semibold num-tabular ${
                    kpi.sentiment === "positive" ? "text-jade" : "text-rust"
                  }`}
                >
                  {kpi.direction === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>{kpi.delta}</span>
                  <span className="text-text-muted font-normal ml-0.5">{kpi.basis}</span>
                </div>

                <Link
                  href="/chat"
                  title="Ask Copilot about this metric"
                  className="p-1 rounded-lg text-text-muted hover:text-gold hover:bg-surface-2 transition-colors btn-tactile cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ContainerTile>
  );
}

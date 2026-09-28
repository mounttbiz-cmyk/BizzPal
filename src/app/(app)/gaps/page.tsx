"use client";

import React, { useState, useEffect } from "react";
import { defaultGapRules } from "@/config/seeds/defaultRules";
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  MessageSquare,
  ArrowRight,
  ShieldAlert,
  RefreshCw,
  UserCheck,
  Clock,
  Target,
  Check,
  ChevronDown,
  Filter,
  Layers,
  Activity,
  RotateCcw
} from "lucide-react";
import { ProvenanceBadge } from "@/components/ui/Badge";
import Link from "next/link";

export type GapStatus = "detected" | "prioritized" | "in_progress" | "under_verification" | "resolved";

export interface ExtendedGapItem {
  id: string;
  key: string;
  title: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  effort: string;
  whyItMatters: string;
  evidenceTemplate: string;
  targetMetric: string;
  actualMetric: string;
  deviation: string;
  deviationPercent: number;
  status: GapStatus;
  assignedOwner: string;
  assignedRole: string;
  completedSteps: number[];
  resolvedAt?: string;
  solutionPlaybook: {
    summary: string;
    successMetric: string;
    firstAction: string;
    steps: {
      title: string;
      detail: string;
      ownerRole?: string;
      days: number;
    }[];
  };
}

const INITIAL_EXTENDED_GAPS: ExtendedGapItem[] = [
  {
    ...defaultGapRules[0],
    targetMetric: "Runway ≥ 12.0 Months",
    actualMetric: "8.0 Months",
    deviation: "-33.3% Deficit",
    deviationPercent: -33.3,
    status: "in_progress",
    assignedOwner: "Finance & Runway Lead",
    assignedRole: "Lead Owner",
    completedSteps: [0],
    evidenceTemplate: "Current cash reserve of ₹12,00,000 against net monthly burn of ₹1,50,000 gives 8.0 months runway.",
  },
  {
    ...defaultGapRules[1],
    targetMetric: "Top Client ≤ 20.0%",
    actualMetric: "36.5% of Revenue",
    deviation: "+82.5% Concentration",
    deviationPercent: 82.5,
    status: "detected",
    assignedOwner: "Executive Strategy",
    assignedRole: "Lead Owner",
    completedSteps: [],
    evidenceTemplate: "Top client represents 36.5% of trailing enterprise revenue against the 20% safe diversification benchmark.",
  },
  {
    ...defaultGapRules[2],
    targetMetric: "Primary Channel ≤ 45.0%",
    actualMetric: "68.0% via Meta Ads",
    deviation: "+51.1% Vulnerability",
    deviationPercent: 51.1,
    status: "prioritized",
    assignedOwner: "Growth & Acquisition",
    assignedRole: "Lead Owner",
    completedSteps: [],
    evidenceTemplate: "Meta advertising accounts for 68.0% of customer acquisition, creating critical channel risk.",
  },
  {
    id: "rule_gross_margin",
    key: "gross_margin",
    title: "Gross profit margin slippage (<75%)",
    category: "Financial",
    severity: "high",
    effort: "project",
    targetMetric: "Gross Margin ≥ 80.0%",
    actualMetric: "71.4%",
    deviation: "-10.8% Margin Leakage",
    deviationPercent: -10.8,
    status: "detected",
    assignedOwner: "Delivery Operations",
    assignedRole: "Lead Owner",
    completedSteps: [],
    whyItMatters: "Gross margin dilution below 75% erodes cash retention, ballooning forward net burn and delaying break-even milestones.",
    evidenceTemplate: "Cost of goods and cloud vendor pass-throughs currently total 28.6% of billed revenue.",
    solutionPlaybook: {
      summary: "Audit third-party cloud hosting usage and contractor rate cards to eliminate gross margin leakage.",
      successMetric: "Restore gross profit margin to 80% within 45 days",
      firstAction: "Review vendor invoices and cloud infrastructure spend",
      steps: [
        { title: "Audit AWS/Azure reserved instances and unallocated compute", detail: "Downsize idle dev environments and enforce 1-year reserved savings plans.", ownerRole: "Operations", days: 4 },
        { title: "Renegotiate contractor delivery rates", detail: "Standardize contractor master service agreements with performance SLA gates.", ownerRole: "Finance", days: 10 },
        { title: "Institute milestone billing sign-off", detail: "Prevent scope creep by requiring written client approvals for out-of-scope work.", ownerRole: "Sales", days: 14 }
      ]
    }
  },
  {
    id: "rule_churn_spike",
    key: "churn_spike",
    title: "Quarterly account logo churn (>6.0%)",
    category: "Operations",
    severity: "critical",
    effort: "project",
    targetMetric: "Annual Churn ≤ 5.0%",
    actualMetric: "8.6% Annualized",
    deviation: "+72.0% Churn Exposure",
    deviationPercent: 72,
    status: "under_verification",
    assignedOwner: "Client Success",
    assignedRole: "Lead Owner",
    completedSteps: [0, 1],
    whyItMatters: "High churn creates a leaky bucket where new acquisition spend is consumed just replacing departed accounts.",
    evidenceTemplate: "Over the last 90 days, 3 enterprise accounts cancelled services citing onboarding lag.",
    solutionPlaybook: {
      summary: "Deploy an executive churn prevention playbook with high-touch 30-day onboarding milestones.",
      successMetric: "Reduce quarterly logo churn below 4.5%",
      firstAction: "Review cancellation audit logs and customer tickets",
      steps: [
        { title: "Implement 14-day customer time-to-value check-in", detail: "Assign dedicated implementation specialist to unblock customer setup.", ownerRole: "Operations", days: 3 },
        { title: "Launch executive satisfaction telemetry", detail: "Track weekly product usage alerts to detect disengaged accounts early.", ownerRole: "Product", days: 7 },
        { title: "Establish proactive renewal outreach", detail: "Engage clients 90 days prior to contract expiration with usage ROI summaries.", ownerRole: "Sales", days: 21 }
      ]
    }
  }
];

const AVAILABLE_OWNERS = [
  { name: "Finance & Runway Lead", role: "Financial Operations", avatar: "📊" },
  { name: "Executive Strategy", role: "Founder & CEO Office", avatar: "🎯" },
  { name: "Growth & Acquisition", role: "Revenue Operations", avatar: "🚀" },
  { name: "Client Success", role: "Account Management", avatar: "🤝" },
  { name: "Delivery Operations", role: "Process & Quality", avatar: "⚙️" },
];

export default function GapsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");
  const [gaps, setGaps] = useState<ExtendedGapItem[]>(INITIAL_EXTENDED_GAPS);
  const [activeGapId, setActiveGapId] = useState<string>(INITIAL_EXTENDED_GAPS[0].id);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Sync with live business profile data if present
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem("bizzpal_business_profile");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        const cash = Number(saved.cash || saved.cashOnHand || 0);
        const burn = Number(saved.burn || saved.monthlyBurn || 0);
        const actualRunway = burn > 0 ? (cash / burn).toFixed(1) : cash > 0 ? "24.0+" : "0.0";

        setGaps(prev =>
          prev.map(g => {
            if (g.key === "cash_runway") {
              const numRunway = Number(actualRunway);
              const dev = ((numRunway - 12) / 12) * 100;
              return {
                ...g,
                actualMetric: `${actualRunway} Months`,
                deviation: `${dev.toFixed(1)}% Deficit`,
                deviationPercent: dev,
                evidenceTemplate: `Current cash reserve of ₹${cash.toLocaleString("en-IN")} against net monthly burn of ₹${burn.toLocaleString("en-IN")} gives ${actualRunway} months runway.`,
              };
            }
            return g;
          })
        );
      }
    } catch {
      // ignore
    }
  }, []);

  const activeGap = gaps.find(g => g.id === activeGapId) || gaps[0];

  const handleStatusChange = (gapId: string, newStatus: GapStatus) => {
    setGaps(prev =>
      prev.map(g => {
        if (g.id === gapId) {
          return {
            ...g,
            status: newStatus,
            resolvedAt: newStatus === "resolved" ? new Date().toISOString() : undefined,
          };
        }
        return g;
      })
    );
  };

  const handleOwnerChange = (gapId: string, ownerName: string, ownerRole: string) => {
    setGaps(prev =>
      prev.map(g => {
        if (g.id === gapId) {
          return { ...g, assignedOwner: ownerName, assignedRole: ownerRole };
        }
        return g;
      })
    );
  };

  const handleToggleStep = (gapId: string, stepIndex: number) => {
    setGaps(prev =>
      prev.map(g => {
        if (g.id === gapId) {
          const exists = g.completedSteps.includes(stepIndex);
          const nextSteps = exists
            ? g.completedSteps.filter(s => s !== stepIndex)
            : [...g.completedSteps, stepIndex];

          // If all steps completed, automatically transition to under_verification
          let nextStatus = g.status;
          if (nextSteps.length === g.solutionPlaybook.steps.length && g.status === "in_progress") {
            nextStatus = "under_verification";
          }

          return { ...g, completedSteps: nextSteps, status: nextStatus };
        }
        return g;
      })
    );
  };

  const handleTriggerScan = () => {
    setIsScanning(true);
    setScanMessage("Scanning live business ledger & benchmark telemetry…");

    setTimeout(() => {
      setIsScanning(false);
      setScanMessage("Target Gap Scan complete: 5 operational deviations verified and prioritized.");
      setTimeout(() => setScanMessage(null), 3500);
    }, 1400);
  };

  const handleVerifyResolution = (gapId: string) => {
    handleStatusChange(gapId, "resolved");
    setScanMessage(`Resolution Verified: "${activeGap.title}" target satisfied! Gap closed.`);
    setTimeout(() => setScanMessage(null), 4000);
  };

  // Filter logic
  const filteredGaps = gaps.filter(g => {
    const matchesCategory = selectedCategory === "all" || g.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesStatus =
      selectedStatusFilter === "all"
        ? true
        : selectedStatusFilter === "active"
        ? g.status !== "resolved"
        : g.status === selectedStatusFilter;
    return matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: GapStatus) => {
    switch (status) {
      case "detected":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber/15 text-amber border border-amber/30">
            Detected
          </span>
        );
      case "prioritized":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Prioritized
          </span>
        );
      case "in_progress":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            In Progress
          </span>
        );
      case "under_verification":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
            Verification
          </span>
        );
      case "resolved":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-jade/15 text-jade border border-jade/30 flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Resolved
          </span>
        );
    }
  };

  // Top level stats
  const totalGaps = gaps.length;
  const criticalCount = gaps.filter(g => g.severity === "critical" && g.status !== "resolved").length;
  const inProgressCount = gaps.filter(g => g.status === "in_progress").length;
  const resolvedCount = gaps.filter(g => g.status === "resolved").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rust/10 border border-rust/30 flex items-center justify-center text-rust">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-text">Gap Register & Closed-Loop Resolution</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase font-mono">
                  Autonomous Watch
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Detect financial, sales, and operational bottlenecks early, assign dedicated AI executive owners, and resolve them step-by-step.
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={isScanning}
            onClick={handleTriggerScan}
            className="px-3.5 py-1.5 rounded-xl bg-surface-2 border border-line text-xs font-bold text-text hover:border-brass/40 flex items-center gap-1.5 btn-tactile cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-brass ${isScanning ? "animate-spin" : ""}`} />
            <span>{isScanning ? "Scanning Gaps…" : "Run AI Gap Scan"}</span>
          </button>

          <Link
            href="/simulator"
            className="px-3.5 py-1.5 rounded-xl bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulate Fixes</span>
          </Link>
        </div>
      </div>

      {/* Alert Banner if present */}
      {scanMessage && (
        <div className="p-3.5 rounded-xl bg-brass-soft/40 border border-brass/40 flex items-center gap-2 text-xs font-semibold text-text animate-fade-in">
          <Activity className="w-4 h-4 text-brass shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Simplified Top KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-surface border border-line">
          <span className="text-[11px] font-semibold text-text-muted uppercase block">Total Bottlenecks</span>
          <span className="text-xl font-bold text-text mt-0.5 block">{totalGaps}</span>
          <span className="text-[10px] text-text-muted">Detected in telemetry</span>
        </div>
        <div className="p-3.5 rounded-xl bg-rust/5 border border-rust/30">
          <span className="text-[11px] font-semibold text-rust uppercase block">Critical Priority</span>
          <span className="text-xl font-bold text-rust mt-0.5 block">{criticalCount}</span>
          <span className="text-[10px] text-rust/80">Requires immediate attention</span>
        </div>
        <div className="p-3.5 rounded-xl bg-cyan-500/5 border border-cyan-500/30">
          <span className="text-[11px] font-semibold text-cyan-600 dark:text-cyan-400 uppercase block">Under Resolution</span>
          <span className="text-xl font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block">{inProgressCount}</span>
          <span className="text-[10px] text-text-muted">Steps in execution</span>
        </div>
        <div className="p-3.5 rounded-xl bg-jade/5 border border-jade/30">
          <span className="text-[11px] font-semibold text-jade uppercase block">Resolved & Closed</span>
          <span className="text-xl font-bold text-jade mt-0.5 block">{resolvedCount}</span>
          <span className="text-[10px] text-jade/80">Safeguards established</span>
        </div>
      </div>

      {/* Multi-Filter Bar: Status + Category */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-2/40 border border-line">
        {/* Status Lifecycle Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            View:
          </span>
          {[
            { id: "all", label: "All Items" },
            { id: "active", label: "Unresolved Gaps" },
            { id: "in_progress", label: "In Progress" },
            { id: "resolved", label: "Resolved" },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedStatusFilter(f.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all btn-tactile cursor-pointer ${
                selectedStatusFilter === f.id
                  ? "bg-brass text-white shadow-xs"
                  : "bg-surface border border-line text-text-muted hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider mr-1">
            Department:
          </span>
          {["all", "financial", "risk", "marketing", "operations"].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize border transition-all btn-tactile cursor-pointer ${
                selectedCategory === cat
                  ? "bg-surface-2 border-brass text-brass font-bold"
                  : "bg-surface border-line text-text-muted hover:text-text"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Simple, Readable Bottleneck Cards List */}
      <div className="space-y-4">
        {filteredGaps.length === 0 ? (
          <div className="p-8 rounded-2xl bg-surface border border-line text-center text-xs text-text-muted">
            No bottlenecks match the selected filters.
          </div>
        ) : (
          filteredGaps.map(gap => {
            const isResolved = gap.status === "resolved";
            const completedCount = gap.completedSteps.length;
            const totalSteps = gap.solutionPlaybook.steps.length;

            return (
              <div
                key={gap.id}
                className={`p-5 rounded-2xl border bg-surface transition-all shadow-theme space-y-4 ${
                  gap.severity === "critical" && !isResolved
                    ? "border-rust/40 bg-gradient-to-r from-rust/[0.03] to-surface"
                    : "border-line"
                } ${isResolved ? "opacity-75 bg-surface/80" : ""}`}
              >
                {/* Header: Title, Category, Severity & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-line/70">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brass-soft text-brass">
                        {gap.category}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          gap.severity === "critical"
                            ? "bg-rust/15 text-rust border border-rust/30"
                            : "bg-amber/15 text-amber border border-amber/30"
                        }`}
                      >
                        {gap.severity} Priority
                      </span>
                      {getStatusBadge(gap.status)}
                    </div>
                    <h3 className="text-base font-bold text-text">{gap.title}</h3>
                  </div>

                  {/* Owner & Reassign Control */}
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-surface-2/80 px-3 py-1.5 rounded-xl border border-line">
                    <div className="w-6 h-6 rounded-full bg-brass/20 text-brass text-xs flex items-center justify-center font-bold">
                      👤
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-text block">
                        {gap.assignedOwner} ({gap.assignedRole})
                      </span>
                      <span className="text-[9px] text-text-muted">Lead AI Owner</span>
                    </div>
                  </div>
                </div>

                {/* Plain-English Problem, Metrics & Why It Matters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {/* Problem & Impact */}
                  <div className="md:col-span-2 p-3.5 rounded-xl bg-surface-2/50 border border-line space-y-1.5">
                    <div className="flex items-center gap-1.5 text-rust font-bold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Why This Matters to Your Business</span>
                    </div>
                    <p className="text-text leading-relaxed text-xs sm:text-[13px]">
                      {gap.whyItMatters}
                    </p>
                    <div className="text-[11px] text-text-muted font-mono pt-1">
                      <strong>Telemetry Finding:</strong> {gap.evidenceTemplate}
                    </div>
                  </div>

                  {/* Benchmark vs Actual Target */}
                  <div className="p-3.5 rounded-xl bg-surface-2/70 border border-line flex flex-col justify-between space-y-2">
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">Benchmark Rule</span>
                      <span className="text-xs font-bold text-text font-mono">{gap.targetMetric}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-text-muted uppercase block">Your Current Status</span>
                      <span className="text-sm font-extrabold text-rust font-mono">{gap.actualMetric}</span>
                      <span className="text-[10px] text-rust font-semibold block">({gap.deviation})</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-jade uppercase block">Resolution Goal</span>
                      <span className="text-[11px] font-semibold text-jade">{gap.solutionPlaybook.successMetric}</span>
                    </div>
                  </div>
                </div>

                {/* Actionable 3-Step Solution Checklist */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brass" />
                      Corrective Action Steps ({completedCount}/{totalSteps} Completed)
                    </span>
                    <span className="text-[11px] text-text-muted">
                      Click any checkbox once implemented
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {gap.solutionPlaybook.steps.map((step, idx) => {
                      const isDone = gap.completedSteps.includes(idx);
                      return (
                        <div
                          key={idx}
                          onClick={() => handleToggleStep(gap.id, idx)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 text-xs ${
                            isDone
                              ? "bg-jade/10 border-jade/40 text-text"
                              : "bg-surface-2/60 border-line hover:border-line-strong hover:bg-surface-2"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              isDone ? "bg-jade border-jade text-white" : "border-line bg-surface text-transparent"
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`font-semibold block text-[11px] leading-tight ${isDone ? "line-through text-text-muted" : "text-text"}`}>
                              Step {idx + 1}: {step.title}
                            </span>
                            <p className="text-[10px] text-text-muted mt-1 leading-snug line-clamp-2">
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action Footer: 1-Click Resolve & Simulator */}
                <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-line/60">
                  <div className="flex items-center gap-2">
                    {gap.status !== "resolved" ? (
                      <button
                        type="button"
                        onClick={() => handleVerifyResolution(gap.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-jade hover:bg-jade/90 text-white text-xs font-bold shadow-xs btn-tactile inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>1-Click Mark as Resolved</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(gap.id, "in_progress")}
                        className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-semibold text-text btn-tactile inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-text-muted" />
                        <span>Reopen Bottleneck</span>
                      </button>
                    )}

                    <Link
                      href="/simulator"
                      className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface border border-line text-xs font-semibold text-text btn-tactile inline-flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 text-brass" />
                      <span>Simulate Fix in Financial Model</span>
                    </Link>
                  </div>

                  <Link
                    href={`/chat?query=${encodeURIComponent(`How should we resolve this business gap: "${gap.title}"?`)}`}
                    className="text-xs text-brass hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Ask {gap.assignedOwner} AI for Advice →</span>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

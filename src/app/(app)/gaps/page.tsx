"use client";

import React, { useState, useEffect } from "react";
import { defaultGapRules } from "@/config/seeds/defaultRules";
import { Check, RefreshCw } from "lucide-react";
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


const STATUS_LABEL: Record<GapStatus, string> = {
  detected: "Detected",
  prioritized: "Prioritized",
  in_progress: "In progress",
  under_verification: "Verifying",
  resolved: "Resolved",
};

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "active", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "resolved", label: "Resolved" },
];

const DEPARTMENTS = ["all", "financial", "risk", "marketing", "operations"];

export default function GapsPage() {
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gaps, setGaps] = useState<ExtendedGapItem[]>(INITIAL_EXTENDED_GAPS);
  const [isScanning, setIsScanning] = useState(false);

  // Sync runway gap with the saved business profile, if present
  useEffect(() => {
    try {
      const savedStr = localStorage.getItem("bizzpal_business_profile");
      if (!savedStr) return;
      const saved = JSON.parse(savedStr);
      const cash = Number(saved.cash || saved.cashOnHand || 0);
      const burn = Number(saved.burn || saved.monthlyBurn || 0);
      const runway = burn > 0 ? cash / burn : 0;
      const dev = ((runway - 12) / 12) * 100;
      setGaps(prev =>
        prev.map(g =>
          g.key === "cash_runway"
            ? {
                ...g,
                actualMetric: `${runway.toFixed(1)} Months`,
                deviation: `${dev.toFixed(1)}% vs target`,
                deviationPercent: dev,
                evidenceTemplate: `Cash reserve of ₹${cash.toLocaleString("en-IN")} against monthly burn of ₹${burn.toLocaleString("en-IN")} gives ${runway.toFixed(1)} months of runway.`,
              }
            : g
        )
      );
    } catch {
      // ignore bad saved data
    }
  }, []);

  const updateGap = (id: string, fn: (g: ExtendedGapItem) => ExtendedGapItem) =>
    setGaps(prev => prev.map(g => (g.id === id ? fn(g) : g)));

  const setStatus = (id: string, status: GapStatus) =>
    updateGap(id, g => ({
      ...g,
      status,
      resolvedAt: status === "resolved" ? new Date().toISOString() : undefined,
    }));

  const toggleStep = (id: string, idx: number) =>
    updateGap(id, g => {
      const done = g.completedSteps.includes(idx)
        ? g.completedSteps.filter(s => s !== idx)
        : [...g.completedSteps, idx];
      const allDone = done.length === g.solutionPlaybook.steps.length && g.status === "in_progress";
      return { ...g, completedSteps: done, status: allDone ? "under_verification" : g.status };
    });

  const runScan = () => {
    setIsScanning(true);
    setTimeout(() => setIsScanning(false), 1200);
  };

  const filtered = gaps.filter(g => {
    const okCategory = category === "all" || g.category.toLowerCase() === category;
    const okStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? g.status !== "resolved" : g.status === statusFilter);
    return okCategory && okStatus;
  });

  const open = gaps.filter(g => g.status !== "resolved").length;
  const critical = gaps.filter(g => g.severity === "critical" && g.status !== "resolved").length;
  const inProgress = gaps.filter(g => g.status === "in_progress").length;
  const resolved = gaps.filter(g => g.status === "resolved").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Gap Register</h1>
          <p className="text-sm text-text-muted mt-1">
            Where your business is off target, and the steps to fix it.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isScanning}
            onClick={runScan}
            className="px-3.5 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning…" : "Rescan"}
          </button>
          <Link
            href="/simulator"
            className="px-3.5 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110"
          >
            Open simulator
          </Link>
        </div>
      </div>

      <p className="text-sm text-text-muted">
        <span className="font-semibold text-text">{open}</span> open ·{" "}
        <span className="font-semibold text-rust">{critical}</span> critical ·{" "}
        <span className="font-semibold text-text">{inProgress}</span> in progress ·{" "}
        <span className="font-semibold text-text">{resolved}</span> resolved
      </p>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-sm cursor-pointer ${
                statusFilter === f.id
                  ? "bg-surface-2 text-text font-semibold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-line bg-surface text-text capitalize cursor-pointer"
          aria-label="Department"
        >
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>
              {d === "all" ? "All departments" : d}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-8 rounded-xl border border-line text-center text-sm text-text-muted">
            No gaps match these filters.
          </div>
        ) : (
          filtered.map(gap => {
            const isResolved = gap.status === "resolved";
            const steps = gap.solutionPlaybook.steps;
            return (
              <section
                key={gap.id}
                className={`p-5 rounded-xl border border-line bg-surface space-y-4 ${isResolved ? "opacity-70" : ""}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-text">{gap.title}</h2>
                    <p className="text-xs text-text-muted mt-1">
                      {gap.category} ·{" "}
                      <span className={gap.severity === "critical" ? "text-rust font-medium" : ""}>
                        {gap.severity}
                      </span>{" "}
                      · {STATUS_LABEL[gap.status]}
                    </p>
                  </div>
                  <p className="text-xs text-text-muted">Owner: {gap.assignedOwner}</p>
                </div>

                <p className="text-sm text-text-muted leading-relaxed">
                  {gap.whyItMatters} {gap.evidenceTemplate}
                </p>

                <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-3 border-y border-line text-sm">
                  <div>
                    <dt className="text-xs text-text-muted">Target</dt>
                    <dd className="font-medium text-text">{gap.targetMetric}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Current</dt>
                    <dd className="font-medium text-rust">
                      {gap.actualMetric} <span className="text-xs font-normal">({gap.deviation})</span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Goal</dt>
                    <dd className="font-medium text-text">{gap.solutionPlaybook.successMetric}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-semibold text-text-muted mb-2">
                    Steps ({gap.completedSteps.length}/{steps.length} done)
                  </p>
                  <ul className="space-y-2">
                    {steps.map((step, idx) => {
                      const done = gap.completedSteps.includes(idx);
                      return (
                        <li key={idx}>
                          <button
                            type="button"
                            onClick={() => toggleStep(gap.id, idx)}
                            className="w-full flex items-start gap-3 text-left cursor-pointer"
                          >
                            <span
                              className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center shrink-0 ${
                                done ? "bg-jade border-jade text-white" : "border-line-strong bg-surface"
                              }`}
                            >
                              {done && <Check className="w-3 h-3 stroke-[3]" />}
                            </span>
                            <span>
                              <span className={`text-sm block ${done ? "line-through text-text-muted" : "text-text"}`}>
                                {step.title}
                              </span>
                              <span className="text-xs text-text-muted">{step.detail}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  {isResolved ? (
                    <button
                      type="button"
                      onClick={() => setStatus(gap.id, "in_progress")}
                      className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
                    >
                      Reopen
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStatus(gap.id, "resolved")}
                      className="px-3.5 py-2 rounded-lg bg-jade text-white text-sm font-medium hover:brightness-110 cursor-pointer"
                    >
                      Mark resolved
                    </button>
                  )}
                  <Link
                    href={`/chat?query=${encodeURIComponent(`How should we resolve this business gap: "${gap.title}"?`)}`}
                    className="text-sm text-brass hover:underline"
                  >
                    Ask AI for advice →
                  </Link>
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

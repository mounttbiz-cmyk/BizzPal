"use client";

import { useState, useEffect } from "react";
import { defaultGapRules } from "@/config/seeds/defaultRules";
import { Check, ChevronDown, RefreshCw } from "lucide-react";
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

const RUNWAY_RULE = defaultGapRules.find(r => r.key === "cash_runway")!;
const RUNWAY_TARGET = Number((RUNWAY_RULE.condition as any).value) || 6;
const PROGRESS_KEY = "bizzpal_gap_progress";

/**
 * The gaps that can really be found from the numbers the business has entered. Nothing is assumed: checks that need
 * data BizzPal does not have yet (customer concentration, channels, churn) are not shown at all.
 */
function findGaps(profile: any): { gaps: ExtendedGapItem[]; hasNumbers: boolean; runway: number | null } {
  const cash = Number(profile?.cash ?? profile?.cashOnHand ?? 0);
  const burn = Number(profile?.burn ?? profile?.monthlyBurn ?? 0);
  if (!(cash > 0) || !(burn > 0)) return { gaps: [], hasNumbers: false, runway: null };
  const runway = cash / burn;
  if (runway >= RUNWAY_TARGET) return { gaps: [], hasNumbers: true, runway };
  const dev = ((runway - RUNWAY_TARGET) / RUNWAY_TARGET) * 100;
  const gap = {
    ...RUNWAY_RULE,
    targetMetric: `Runway of at least ${RUNWAY_TARGET} months`,
    actualMetric: `${runway.toFixed(1)} months`,
    deviation: `${dev.toFixed(1)}% vs target`,
    deviationPercent: dev,
    status: "detected" as GapStatus,
    assignedOwner: "Not assigned yet",
    assignedRole: "",
    completedSteps: [] as number[],
    evidenceTemplate: `Cash in bank of ₹${cash.toLocaleString("en-IN")} against net monthly burn of ₹${burn.toLocaleString("en-IN")} gives ${runway.toFixed(1)} months of runway.`,
  } as ExtendedGapItem;
  return { gaps: [gap], hasNumbers: true, runway };
}

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
  const [gaps, setGaps] = useState<ExtendedGapItem[]>([]);
  const [hasNumbers, setHasNumbers] = useState(false);
  const [runway, setRunway] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  // Look for gaps in the business's own saved numbers, and restore what the team already did about them
  const scan = () => {
    let profile: any = null;
    try {
      profile = JSON.parse(localStorage.getItem("bizzpal_business_profile") || "null");
    } catch {}
    const found = findGaps(profile);
    let progress: Record<string, { status: GapStatus; completedSteps: number[] }> = {};
    try {
      progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    } catch {}
    setGaps(found.gaps.map(g => (progress[g.key] ? { ...g, status: progress[g.key].status, completedSteps: progress[g.key].completedSteps } : g)));
    setHasNumbers(found.hasNumbers);
    setRunway(found.runway);
    setLoaded(true);
  };

  useEffect(() => {
    scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remember progress on each gap
  useEffect(() => {
    if (!loaded) return;
    try {
      const progress: Record<string, { status: GapStatus; completedSteps: number[] }> = {};
      for (const g of gaps) progress[g.key] = { status: g.status, completedSteps: g.completedSteps };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {}
  }, [gaps, loaded]);

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
    scan();
    setTimeout(() => setIsScanning(false), 400);
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
  const resolved = gaps.filter(g => g.status === "resolved").length;

  const severityTone = (s: ExtendedGapItem["severity"]) =>
    s === "critical" ? "text-rust" : s === "high" ? "text-orange-500" : "text-text-muted";
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Gap register</h1>
          <p className="text-sm text-text-muted mt-1">Where your business is off target, and the steps to fix it.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isScanning}
            onClick={runScan}
            className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
            {isScanning ? "Scanning…" : "Rescan"}
          </button>
          <Link href="/simulator" className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110">
            Open simulator
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 rounded-xl bg-surface-2 overflow-x-auto max-w-full">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === f.id ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm text-text-muted">
          <span>
            <span className="text-text font-medium">{open}</span> open
          </span>
          <span>
            <span className={`font-medium ${critical > 0 ? "text-rust" : "text-text"}`}>{critical}</span> critical
          </span>
          <span>
            <span className="text-text font-medium">{resolved}</span> resolved
          </span>
          <div className="relative">
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="appearance-none text-sm pl-4 pr-10 py-2 rounded-xl border border-line bg-surface text-text capitalize cursor-pointer focus:outline-none focus:border-brass"
              aria-label="Department"
            >
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d === "all" ? "All departments" : d}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-text-muted absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-2xl border border-line text-center text-sm text-text-muted space-y-2">
          {!loaded ? (
            <p>Checking your numbers…</p>
          ) : gaps.length > 0 ? (
            <p>No gaps match these filters.</p>
          ) : hasNumbers ? (
            <>
              <p className="text-text font-medium">No gaps found.</p>
              <p>Your cash runway is {runway?.toFixed(1)} months, which is above the {RUNWAY_TARGET}-month minimum.</p>
              <p>BizzPal can only check what it can see. Connect your payments and upload your records to unlock checks such as customer concentration and churn.</p>
            </>
          ) : (
            <>
              <p className="text-text font-medium">Nothing to check yet.</p>
              <p>BizzPal needs your cash in bank and monthly burn to check your runway. Add them in Settings, or connect your payments and upload your records.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map(gap => {
            const steps = gap.solutionPlaybook.steps;
            const isResolved = gap.status === "resolved";

            return (
              <section
                key={gap.id}
                className={`rounded-2xl border border-line bg-surface shadow-sm ${isResolved ? "opacity-70" : ""}`}
              >
                <div className="flex items-start justify-between gap-4 px-6 pt-6">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-text leading-snug">{gap.title}</h2>
                    <p className="text-sm text-text-muted mt-1">
                      {gap.category} · <span className={severityTone(gap.severity)}>{cap(gap.severity)}</span> ·{" "}
                      {STATUS_LABEL[gap.status]} · Owner: {gap.assignedOwner}
                    </p>
                  </div>
                  <p className="hidden sm:block text-sm text-text-muted shrink-0 mt-1">
                    {gap.completedSteps.length} of {steps.length} steps done
                  </p>
                </div>

                <div className="px-6 pb-7 pt-5 space-y-7">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-sm font-medium text-text">Why it matters</h3>
                        <p className="text-sm text-text-muted leading-relaxed mt-1">{gap.whyItMatters}</p>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-text">What we found</h3>
                        <p className="text-sm text-text-muted leading-relaxed mt-1">{gap.evidenceTemplate}</p>
                      </div>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5 rounded-xl bg-surface-2/60">
                      <div>
                        <dt className="text-xs text-text-muted">Target</dt>
                        <dd className="text-sm font-medium text-text mt-1">{gap.targetMetric}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-text-muted">Now</dt>
                        <dd className="text-sm font-medium text-rust mt-1">
                          {gap.actualMetric} <span className="text-xs font-normal text-text-muted">({gap.deviation})</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-text-muted">Goal</dt>
                        <dd className="text-sm font-medium text-text mt-1">{gap.solutionPlaybook.successMetric}</dd>
                      </div>
                    </dl>

                    <div>
                      <h3 className="text-sm font-medium text-text mb-1">Steps to fix it</h3>
                      <ul className="divide-y divide-line">
                        {steps.map((step, idx) => {
                          const done = gap.completedSteps.includes(idx);
                          return (
                            <li key={idx}>
                              <button
                                type="button"
                                onClick={() => toggleStep(gap.id, idx)}
                                className="w-full flex items-start gap-3 py-3.5 text-left cursor-pointer"
                              >
                                <span
                                  className={`w-5 h-5 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                                    done ? "bg-brass border-brass text-white" : "border-line-strong bg-surface"
                                  }`}
                                >
                                  {done && <Check className="w-3 h-3 stroke-[3]" />}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className={`block text-sm ${done ? "line-through text-text-muted" : "text-text font-medium"}`}>
                                    {step.title}
                                  </span>
                                  <span className="block text-sm text-text-muted mt-0.5">{step.detail}</span>
                                </span>
                                <span className="text-xs text-text-muted shrink-0 mt-1">~{step.days} days</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-3">
                      {isResolved ? (
                        <button
                          type="button"
                          onClick={() => setStatus(gap.id, "in_progress")}
                          className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
                        >
                          Reopen
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStatus(gap.id, "resolved")}
                          className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
                        >
                          Mark resolved
                        </button>
                      )}
                      <Link
                        href={`/chat?query=${encodeURIComponent(`How should we resolve this business gap: "${gap.title}"?`)}`}
                        className="text-sm text-brass hover:underline"
                      >
                        Ask AI for advice
                      </Link>
                    </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

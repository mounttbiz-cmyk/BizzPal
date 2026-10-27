"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  FileText,
  BarChart3,
  Calendar,
  AlertCircle,
  HelpCircle,
  Play,
  Check,
  ChevronRight,
  Cpu,
  Target,
  FileSpreadsheet,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Info,
} from "lucide-react";

interface KpiItem {
  id: string;
  metricKey: string;
  name: string;
  description?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  comparisonType: string;
  alertSeverity: string;
  frequency: string;
  enabled: boolean;
  lastEvaluatedAt?: string;
}

interface RecommendedAction {
  key: string;
  title: string;
  description: string;
  targetDepartment: string;
  suggestedOwner: string;
  priority: "high" | "medium" | "low";
  expectedImpact: string;
  status: "recommended" | "approved" | "task_created" | "dismissed";
  taskId?: string;
}

interface BusinessInsight {
  id: string;
  businessId: string;
  kpiId: string;
  title: string;
  severity: "info" | "warning" | "critical";
  status: "detected" | "investigating" | "action_recommended" | "awaiting_approval" | "action_in_progress" | "resolved" | "dismissed";
  observedValue: number;
  previousValue: number;
  changePct: number;
  evidenceSummary: {
    affectedKpi: string;
    reportingPeriod: string;
    correlatedSignals: string[];
    relatedDocuments: { title: string; snippet: string }[];
    missingDataNotices: string[];
  };
  rootCauseAnalysis: {
    verifiedFacts: string[];
    hypotheses: string[];
    uncertaintyRating: "low" | "medium" | "high";
    summary: string;
  };
  recommendedActions: RecommendedAction[];
  auditTrail: {
    action: string;
    timestamp: string;
    author: string;
    note?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

interface ForecastReport {
  metric: string;
  periods: {
    period: string;
    expected: number;
    lowerBound: number;
    upperBound: number;
    type: "historical" | "projected";
  }[];
  methodology: string;
  confidenceLevel: string;
  assumptions: string[];
  limitations: string[];
  growthRatePct: number;
  isSufficientData: boolean;
}

export function RealTimeBiSection({ companyName = "Your Business" }: { companyName?: string }) {
  const [activeTab, setActiveTab] = useState<"insights" | "kpis" | "forecast">("insights");
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [insights, setInsights] = useState<BusinessInsight[]>([]);
  const [forecast, setForecast] = useState<ForecastReport | null>(null);
  const [forecastMetric, setForecastMetric] = useState<"revenue" | "burn">("revenue");

  const [isLoadingKpis, setIsLoadingKpis] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingForecast, setIsLoadingForecast] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalResultBanner, setEvalResultBanner] = useState<string | null>(null);
  const [approvingActionKey, setApprovingActionKey] = useState<string | null>(null);

  const fetchKpis = async () => {
    setIsLoadingKpis(true);
    try {
      const res = await fetch("/api/bi/kpis");
      const data = await res.json();
      if (data.success && Array.isArray(data.kpis)) {
        setKpis(data.kpis);
      }
    } catch (e) {
      console.warn("Failed to fetch KPIs:", e);
    } finally {
      setIsLoadingKpis(false);
    }
  };

  const fetchInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const res = await fetch("/api/bi/insights");
      const data = await res.json();
      if (data.success && Array.isArray(data.insights)) {
        setInsights(data.insights);
      }
    } catch (e) {
      console.warn("Failed to fetch insights:", e);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const fetchForecast = async (metric: "revenue" | "burn" = forecastMetric) => {
    setIsLoadingForecast(true);
    try {
      const res = await fetch(`/api/bi/forecast?metric=${metric}`);
      const data = await res.json();
      if (data.success && data.forecast) {
        setForecast(data.forecast);
      }
    } catch (e) {
      console.warn("Failed to fetch forecast:", e);
    } finally {
      setIsLoadingForecast(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchInsights();
    fetchForecast("revenue");
  }, []);

  const handleRunEvaluation = async () => {
    setIsEvaluating(true);
    setEvalResultBanner(null);
    try {
      const res = await fetch("/api/bi/evaluate", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        const breaches = data.breachedCount || 0;
        setEvalResultBanner(
          `Diagnostic complete • ${data.evaluatedCount} KPIs evaluated • ${
            breaches > 0
              ? `${breaches} variance anomaly detected & investigated by AI copilot!`
              : "All monitored metrics operating within acceptable tolerance thresholds."
          }`
        );
        fetchKpis();
        fetchInsights();
      }
    } catch (err: any) {
      setEvalResultBanner("Diagnostic execution failed. Please check backend connection.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleApproveAction = async (insightId: string, actionKey: string) => {
    setApprovingActionKey(actionKey);
    try {
      const res = await fetch(`/api/bi/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approveAction: true,
          actionKey,
          approvedBy: "Executive Founder",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEvalResultBanner(`Action approved! Created task "${data.action?.title}" in Operations queue.`);
        fetchInsights();
      }
    } catch {
      alert("Failed to approve action");
    } finally {
      setApprovingActionKey(null);
    }
  };

  const handleStatusChange = async (insightId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/bi/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchInsights();
      }
    } catch {
      alert("Failed to update status");
    }
  };

  const criticalCount = insights.filter((i) => i.severity === "critical").length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line select-none">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass shrink-0 shadow-2xs">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-text truncate tracking-tight font-sans">
                Real-Time Business Intelligence & Awareness
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted shrink-0">
                Proactive Engine
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Continuous Telemetry</span>
              </span>
            </div>
            <p className="text-xs text-text-muted truncate mt-0.5">
              Continuous KPI monitoring, autonomous root-cause investigation, memory grounding, and authorized workflow execution
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-brass text-white text-xs font-bold shadow-2xs hover:brightness-110 btn-tactile cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isEvaluating ? "animate-spin" : ""}`} />
            <span>{isEvaluating ? "Evaluating KPI Rules…" : "Run KPI Diagnostics"}</span>
          </button>
        </div>
      </header>

      {/* Real-Time Telemetry Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Active Incidents</span>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              criticalCount > 0 ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">{insights.length}</span>
            <span className="text-[10px] text-text-muted font-mono">
              {criticalCount > 0 ? `${criticalCount} critical` : "all within target"}
            </span>
          </div>
          <p className="text-[10px] text-text-muted/80">AI root-cause synthesized</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Monitored KPIs</span>
            <div className="w-6 h-6 rounded-lg bg-brass/10 flex items-center justify-center text-brass">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">{kpis.length}</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">100% active</span>
          </div>
          <p className="text-[10px] text-text-muted/80">Runway, burn, margins, sales</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Autonomous Copilot</span>
            <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">Marcus & Astra</span>
          </div>
          <p className="text-[10px] text-text-muted/80">Investigation & task generation</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Predictive Drift</span>
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">
              {forecast ? `${forecast.growthRatePct > 0 ? "+" : ""}${forecast.growthRatePct}%` : "--"}
            </span>
            <span className="text-[10px] text-text-muted font-mono">MoM</span>
          </div>
          <p className="text-[10px] text-text-muted/80">90-Day horizon projection</p>
        </div>
      </div>

      {evalResultBanner && (
        <div className="p-3 rounded-xl bg-brass/10 border border-brass/30 text-xs font-medium text-brass flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
            <span>{evalResultBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setEvalResultBanner(null)}
            className="text-[10px] font-bold text-brass hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Enterprise Underlined Tab Bar */}
      <nav
        aria-label="Real-Time BI Navigation"
        className="flex items-center gap-1 sm:gap-2 border-b border-line pb-0 select-none overflow-x-auto"
      >
        {[
          { id: "insights" as const, label: "Active Incidents & Anomalies", icon: AlertTriangle, count: insights.length, alert: criticalCount > 0 },
          { id: "kpis" as const, label: "Configured KPI Thresholds", icon: Target, count: kpis.length },
          { id: "forecast" as const, label: "Statistical Forecasting", icon: BarChart3, badge: "90-Day" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "forecast") fetchForecast(forecastMetric);
              }}
              className={`relative pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? "text-brass font-bold"
                  : "text-text-muted hover:text-text"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>

              {tab.alert && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}

              {tab.badge && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-brass/15 text-brass border border-brass/30">
                  {tab.badge}
                </span>
              )}

              {tab.count !== undefined && (
                <span
                  className={`text-[10px] font-sans font-bold px-1.5 py-0.2 rounded-full border ${
                    isActive
                      ? "bg-brass/15 border-brass/40 text-brass"
                      : "bg-surface-2 border-line text-text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}

              {/* Active Indicator Underline */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brass rounded-t-full shadow-xs"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* TAB 1: ACTIVE INSIGHTS & ANOMALIES */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 mx-auto flex items-center justify-center text-emerald-500 shadow-2xs">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text">No active business anomalies detected</h3>
                <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                  All monitored metrics (revenue velocity, opex burn rate, runway horizon, and margin variance) are currently within tolerance bounds. Click &ldquo;Run KPI Diagnostics&rdquo; to trigger immediate evaluation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-2xs btn-tactile"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Diagnostics Now</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  className="rounded-2xl border border-line bg-surface p-5 sm:p-6 space-y-5 hover:border-line-strong transition-all shadow-2xs"
                >
                  {/* Top Incident Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
                          ins.severity === "critical"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/25"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${ins.severity === "critical" ? "bg-rose-500 animate-ping" : "bg-amber-500"}`} />
                        <span>{ins.severity} Alert</span>
                      </span>

                      <h3 className="text-sm font-bold text-text">{ins.title}</h3>

                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-2 border border-line text-text-muted">
                        Variance: {ins.changePct > 0 ? "+" : ""}{ins.changePct.toFixed(1)}%
                      </span>
                    </div>

                    {/* Status Dropdown */}
                    <div className="flex items-center gap-2 text-xs shrink-0">
                      <span className="text-[11px] text-text-muted font-medium">Incident Lifecycle:</span>
                      <select
                        value={ins.status}
                        onChange={(e) => handleStatusChange(ins.id, e.target.value)}
                        className="px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-xs font-semibold text-text focus:outline-none cursor-pointer"
                      >
                        <option value="detected">Detected</option>
                        <option value="action_recommended">Action Recommended</option>
                        <option value="action_in_progress">Action In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="dismissed">Dismissed</option>
                      </select>
                    </div>
                  </div>

                  {/* AI Root Cause Synthesis */}
                  <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-brass/10 flex items-center justify-center text-brass">
                        <Sparkles className="w-3 h-3" />
                      </div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-brass">
                        Executive Copilot Synthesis • Uncertainty Rating: {ins.rootCauseAnalysis.uncertaintyRating.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-text leading-relaxed font-sans font-medium selection:bg-brass/20">
                      {ins.rootCauseAnalysis.summary}
                    </p>
                  </div>

                  {/* Telemetry Facts vs Contributing Factors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Verified Telemetry */}
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verified Telemetry Facts</span>
                        </span>
                        <span className="text-[9px] font-mono uppercase text-emerald-600/70 dark:text-emerald-400/70">
                          Ground Truth
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-text-muted">
                        {ins.rootCauseAnalysis.verifiedFacts.map((fact, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Contributing Hypotheses */}
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4" />
                          <span>Contributing Factors & Hypotheses</span>
                        </span>
                        <span className="text-[9px] font-mono uppercase text-indigo-600/70 dark:text-indigo-400/70">
                          Probabilistic
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-text-muted">
                        {ins.rootCauseAnalysis.hypotheses.map((hyp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                            <span className="leading-relaxed">{hyp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Correlated Memory Documents */}
                  {ins.evidenceSummary.relatedDocuments && ins.evidenceSummary.relatedDocuments.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted">
                        Correlated Company Memory Documents:
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {ins.evidenceSummary.relatedDocuments.map((doc, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-text"
                          >
                            <FileText className="w-3.5 h-3.5 text-brass" />
                            <span className="font-semibold">{doc.title}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommended Action Workflows */}
                  {ins.recommendedActions.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-text flex items-center gap-2">
                          <Layers className="w-4 h-4 text-brass" />
                          <span>Approved Executive Action Workflows & 1-Click Operations</span>
                        </h4>
                        <span className="text-[10px] font-mono text-text-muted">Requires executive sign-off</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ins.recommendedActions.map((action) => (
                          <div
                            key={action.key}
                            className="p-4 rounded-xl bg-surface-2 border border-line flex flex-col justify-between space-y-3 shadow-2xs hover:border-line-strong transition-all"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface border border-line text-brass">
                                  {action.targetDepartment}
                                </span>
                                <span className="text-[10px] text-text-muted font-mono">
                                  Owner: {action.suggestedOwner}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-text">{action.title}</h5>
                              <p className="text-xs text-text-muted leading-relaxed">
                                {action.description}
                              </p>
                              <div className="p-2 rounded-lg bg-surface border border-line/60 text-[11px] text-brass font-medium">
                                Expected Impact: {action.expectedImpact}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                              <span className="text-[10px] font-mono text-text-muted uppercase">
                                Priority: {action.priority}
                              </span>

                              {action.status === "task_created" ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/25">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Task Created ({action.taskId})</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleApproveAction(ins.id, action.key)}
                                  disabled={approvingActionKey === action.key}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer shadow-2xs disabled:opacity-50"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>{approvingActionKey === action.key ? "Provisioning Task…" : "Approve & Create Task"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONFIGURED KPIS */}
      {activeTab === "kpis" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="p-5 rounded-2xl bg-surface border border-line space-y-4 hover:border-line-strong transition-all flex flex-col justify-between shadow-2xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-2 border border-line text-brass">
                    {kpi.frequency}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active Guardrail
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-text">{kpi.name}</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    {kpi.description}
                  </p>
                </div>

                {/* Tolerance Progress Gauge */}
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] text-text-muted font-mono">
                    <span>Critical: {kpi.criticalThreshold ?? "--"}</span>
                    <span>Target: {kpi.targetValue ?? "--"}</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden flex">
                    <div className="w-1/3 bg-rose-500/80" />
                    <div className="w-1/3 bg-amber-500/80" />
                    <div className="w-1/3 bg-emerald-500/80" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center p-2.5 rounded-xl bg-surface-2 border border-line text-[11px]">
                <div>
                  <span className="block text-[9px] text-text-muted uppercase font-mono tracking-wider">Target</span>
                  <span className="font-bold font-mono text-text">{kpi.targetValue ?? "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[9px] text-text-muted uppercase font-mono tracking-wider">Warning</span>
                  <span className="font-bold font-mono text-amber-500">{kpi.warningThreshold ?? "N/A"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: STATISTICAL FORECASTING */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          {/* Target Metric Switcher Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3 p-3 sm:p-4 rounded-2xl bg-surface border border-line shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text">Forecast Target Metric:</span>
              <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => {
                    setForecastMetric("revenue");
                    fetchForecast("revenue");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    forecastMetric === "revenue"
                      ? "bg-surface text-text shadow-2xs font-bold border border-line/60"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Monthly Revenue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForecastMetric("burn");
                    fetchForecast("burn");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    forecastMetric === "burn"
                      ? "bg-surface text-text shadow-2xs font-bold border border-line/60"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  Operating Burn
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fetchForecast(forecastMetric)}
              disabled={isLoadingForecast}
              className="p-2 rounded-xl bg-surface-2 border border-line text-text-muted hover:text-text cursor-pointer transition-all disabled:opacity-50"
              title="Refresh forecast model"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForecast ? "animate-spin text-brass" : ""}`} />
            </button>
          </div>

          {forecast && (
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                <div>
                  <h3 className="text-sm font-bold text-text">{forecast.metric} Trajectory Model</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    {forecast.methodology} • Confidence Level: {forecast.confidenceLevel}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>{forecast.growthRatePct > 0 ? "+" : ""}{forecast.growthRatePct}% Monthly Drift</span>
                </span>
              </div>

              {/* Data Table with Confidence Intervals */}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 border-b border-line">
                    <tr className="text-text-muted text-[11px] font-mono">
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Expected (INR)</th>
                      <th className="py-2.5 px-3">80% Lower Bound</th>
                      <th className="py-2.5 px-3">80% Upper Bound</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {forecast.periods.map((p, idx) => (
                      <tr key={idx} className={p.type === "projected" ? "bg-brass/5" : "hover:bg-surface-2/40"}>
                        <td className="py-2.5 px-3 font-bold text-text font-mono">{p.period}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              p.type === "projected"
                                ? "bg-brass/15 text-brass border-brass/30"
                                : "bg-surface-2 text-text-muted border-line"
                            }`}
                          >
                            {p.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-text">
                          ₹{p.expected.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-text-muted">
                          ₹{p.lowerBound.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-text-muted">
                          ₹{p.upperBound.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Assumptions & Model Limitations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2">
                  <span className="text-xs font-bold text-text block">Model Assumptions:</span>
                  <ul className="space-y-1.5 text-xs text-text-muted">
                    {forecast.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brass mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-2">
                  <span className="text-xs font-bold text-amber-500 block">Limitations & Horizon Disclosure:</span>
                  <ul className="space-y-1.5 text-xs text-text-muted">
                    {forecast.limitations.map((l, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="leading-relaxed">{l}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

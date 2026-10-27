"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  FileText,
  BarChart3,
  Calendar,
  AlertCircle,
  Play,
  Check,
  Target,
  FileSpreadsheet,
  Zap,
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
          `Diagnostic complete: ${data.evaluatedCount} KPIs evaluated. ${
            breaches > 0
              ? `${breaches} anomaly detected and root cause investigated.`
              : "All metrics are within acceptable thresholds."
          }`
        );
        fetchKpis();
        fetchInsights();
      }
    } catch {
      setEvalResultBanner("Diagnostic run failed. Please verify network connection.");
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
        setEvalResultBanner(`Action approved. Created operational task "${data.action?.title}".`);
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

  return (
    <div className="space-y-5">
      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-line space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Active Incidents</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${criticalCount > 0 ? "text-rose-500" : "text-emerald-500"}`} />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">{insights.length}</span>
            <span className="text-[11px] text-text-muted">
              {criticalCount > 0 ? `${criticalCount} critical` : "all within target"}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Monitored KPIs</span>
            <Target className="w-3.5 h-3.5 text-brass" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">{kpis.length}</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">rules active</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Monthly Revenue Drift</span>
            <TrendingUp className="w-3.5 h-3.5 text-brass" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">
              {forecast ? `${forecast.growthRatePct > 0 ? "+" : ""}${forecast.growthRatePct}%` : "--"}
            </span>
            <span className="text-[11px] text-text-muted">projected</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-line space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Diagnostic Status</span>
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">Active</span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">continuous</span>
          </div>
        </div>
      </div>

      {evalResultBanner && (
        <div className="p-3 rounded-xl bg-brass/10 border border-brass/30 text-xs font-medium text-brass flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
            <span>{evalResultBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setEvalResultBanner(null)}
            className="text-[11px] font-bold text-brass hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Nav Bar with Diagnostic Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-0">
        <nav aria-label="BI Section Navigation" className="flex items-center gap-1 sm:gap-2">
          {[
            { id: "insights" as const, label: "Active Incidents", icon: AlertTriangle, count: insights.length },
            { id: "kpis" as const, label: "Monitored Guardrails", icon: Target, count: kpis.length },
            { id: "forecast" as const, label: "Statistical Forecast", icon: BarChart3 },
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
                  isActive ? "text-brass font-bold" : "text-text-muted hover:text-text"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>

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

        {/* Run Diagnostic Button */}
        <div className="pb-2.5 sm:pb-2">
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface border border-line text-xs font-semibold text-text hover:border-brass/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 text-brass ${isEvaluating ? "animate-spin" : ""}`} />
            <span>{isEvaluating ? "Evaluating…" : "Run KPI Diagnostics"}</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ACTIVE INCIDENTS */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface p-10 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 mx-auto flex items-center justify-center text-emerald-500">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text">All Metrics Healthy</h3>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  Monitored revenue velocity, burn, cash runway, and gross margins are operating within expected tolerance limits.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunEvaluation}
                disabled={isEvaluating}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Run Diagnostics</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  className="rounded-xl border border-line bg-surface p-5 space-y-4 hover:border-line-strong transition-all"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                          ins.severity === "critical"
                            ? "bg-rose-500/10 text-rose-500 border-rose-500/25"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/25"
                        }`}
                      >
                        {ins.severity}
                      </span>
                      <h3 className="text-sm font-bold text-text">{ins.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-text-muted">Status:</span>
                      <select
                        value={ins.status}
                        onChange={(e) => handleStatusChange(ins.id, e.target.value)}
                        className="px-2 py-1 rounded-md bg-surface-2 border border-line text-xs font-medium text-text focus:outline-none cursor-pointer"
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
                  <div className="p-3.5 rounded-lg bg-surface-2/60 border border-line space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                      <Info className="w-3.5 h-3.5 text-brass" />
                      <span>Root Cause Summary</span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed font-sans">
                      {ins.rootCauseAnalysis.summary}
                    </p>
                  </div>

                  {/* Facts vs Hypotheses */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-surface-2/40 border border-line space-y-2">
                      <span className="text-xs font-bold text-text flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Observed Telemetry</span>
                      </span>
                      <ul className="space-y-1 text-xs text-text-muted">
                        {ins.rootCauseAnalysis.verifiedFacts.map((fact, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2/40 border border-line space-y-2">
                      <span className="text-xs font-bold text-text flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-brass" />
                        <span>Contributing Factors</span>
                      </span>
                      <ul className="space-y-1 text-xs text-text-muted">
                        {ins.rootCauseAnalysis.hypotheses.map((hyp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-brass mt-1.5 shrink-0" />
                            <span>{hyp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommended Action Workflows */}
                  {ins.recommendedActions.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-brass" />
                        <span>Recommended Corrective Actions</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ins.recommendedActions.map((action) => (
                          <div
                            key={action.key}
                            className="p-3.5 rounded-lg bg-surface-2/50 border border-line flex flex-col justify-between space-y-2.5"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-text-muted">
                                <span className="font-semibold text-text uppercase text-[10px]">
                                  {action.targetDepartment}
                                </span>
                                <span>Owner: {action.suggestedOwner}</span>
                              </div>
                              <h5 className="text-xs font-bold text-text">{action.title}</h5>
                              <p className="text-xs text-text-muted leading-relaxed">
                                {action.description}
                              </p>
                              <div className="text-[11px] text-brass">
                                Impact: {action.expectedImpact}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                              <span className="text-[10px] text-text-muted uppercase">
                                Priority: {action.priority}
                              </span>

                              {action.status === "task_created" ? (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Task Created</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleApproveAction(ins.id, action.key)}
                                  disabled={approvingActionKey === action.key}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer disabled:opacity-50"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>{approvingActionKey === action.key ? "Creating…" : "Approve & Create Task"}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {kpis.map((kpi) => (
            <div
              key={kpi.id}
              className="p-4 rounded-xl bg-surface border border-line space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span className="font-semibold uppercase">{kpi.frequency}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-text">{kpi.name}</h4>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    {kpi.description}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center p-2 rounded-lg bg-surface-2 border border-line text-xs font-mono">
                <div>
                  <span className="block text-[10px] text-text-muted uppercase font-sans">Target</span>
                  <span className="font-bold text-text">{kpi.targetValue ?? "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-muted uppercase font-sans">Warning</span>
                  <span className="font-bold text-amber-500">{kpi.warningThreshold ?? "N/A"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: STATISTICAL FORECASTING */}
      {activeTab === "forecast" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 p-3 rounded-xl bg-surface border border-line">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-text">Target Metric:</span>
              <div className="flex items-center gap-1 bg-surface-2 p-0.5 rounded-lg border border-line">
                <button
                  type="button"
                  onClick={() => {
                    setForecastMetric("revenue");
                    fetchForecast("revenue");
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                    forecastMetric === "revenue"
                      ? "bg-surface text-text shadow-xs"
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
                  className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer ${
                    forecastMetric === "burn"
                      ? "bg-surface text-text shadow-xs"
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
              className="p-1.5 rounded-lg bg-surface-2 border border-line text-text-muted hover:text-text cursor-pointer"
              title="Refresh forecast"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForecast ? "animate-spin text-brass" : ""}`} />
            </button>
          </div>

          {forecast && (
            <div className="rounded-xl border border-line bg-surface p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="text-sm font-bold text-text">{forecast.metric} Trajectory</h3>
                  <p className="text-xs text-text-muted">{forecast.methodology}</p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {forecast.growthRatePct > 0 ? "+" : ""}{forecast.growthRatePct}% Monthly Drift
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2 border-b border-line">
                    <tr className="text-text-muted text-[11px]">
                      <th className="py-2 px-3">Period</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Expected (INR)</th>
                      <th className="py-2 px-3">80% Lower Bound</th>
                      <th className="py-2 px-3">80% Upper Bound</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {forecast.periods.map((p, idx) => (
                      <tr key={idx} className={p.type === "projected" ? "bg-brass/5" : ""}>
                        <td className="py-2 px-3 font-semibold text-text">{p.period}</td>
                        <td className="py-2 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            p.type === "projected" ? "bg-brass/10 text-brass" : "bg-surface-2 text-text-muted"
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono font-semibold text-text">
                          ₹{p.expected.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 font-mono text-text-muted">
                          ₹{p.lowerBound.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-3 font-mono text-text-muted">
                          ₹{p.upperBound.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-surface-2/40 border border-line space-y-1">
                  <span className="text-xs font-semibold text-text block">Model Assumptions:</span>
                  <ul className="space-y-1 text-xs text-text-muted">
                    {forecast.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-brass mt-1.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-surface-2/40 border border-line space-y-1">
                  <span className="text-xs font-semibold text-text block">Limitations:</span>
                  <ul className="space-y-1 text-xs text-text-muted">
                    {forecast.limitations.map((l, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span>{l}</span>
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

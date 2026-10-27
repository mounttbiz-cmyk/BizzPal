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
          `Evaluated ${data.evaluatedCount} KPIs • ${breaches > 0 ? `${breaches} anomaly detected & investigated by AI copilot!` : "All monitored metrics operating within target thresholds."}`
        );
        fetchKpis();
        fetchInsights();
      }
    } catch (err: any) {
      setEvalResultBanner("Diagnostic execution failed. Please check network connection.");
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

  return (
    <div className="space-y-6">
      {/* Real-Time BI Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-surface to-surface-2 border border-line shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-brass">
              Proactive Business Awareness Engine
            </span>
          </div>
          <h2 className="text-lg font-bold text-text">
            Autonomous Business Intelligence & Insights
          </h2>
          <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
            Continuously evaluates company KPIs, detects variance anomalies, investigates root causes using structured data and company memory, and recommends authorized corrective workflows.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={isEvaluating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isEvaluating ? "animate-spin" : ""}`} />
            <span>{isEvaluating ? "Evaluating Rules…" : "Run KPI Diagnostics"}</span>
          </button>
        </div>
      </div>

      {evalResultBanner && (
        <div className="p-3.5 rounded-xl bg-brass-soft border border-brass/30 text-xs font-medium text-brass flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
            <span>{evalResultBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setEvalResultBanner(null)}
            className="text-[10px] text-brass hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("insights")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "insights"
              ? "bg-brass text-white shadow-xs"
              : "text-text-muted hover:text-text hover:bg-surface"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Active Insights & Anomalies ({insights.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("kpis")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "kpis"
              ? "bg-brass text-white shadow-xs"
              : "text-text-muted hover:text-text hover:bg-surface"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Configured KPI Monitoring ({kpis.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("forecast");
            fetchForecast(forecastMetric);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "forecast"
              ? "bg-brass text-white shadow-xs"
              : "text-text-muted hover:text-text hover:bg-surface"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Statistical Forecasting</span>
        </button>
      </div>

      {/* TAB 1: ACTIVE INSIGHTS */}
      {activeTab === "insights" && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 mx-auto flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-text">No active business anomalies detected</h3>
              <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                All monitored KPIs (revenue momentum, burn inflation, cash runway, and margins) are currently performing within expected tolerance limits. Click &ldquo;Run KPI Diagnostics&rdquo; to trigger an immediate evaluation.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((ins) => (
                <div
                  key={ins.id}
                  className="rounded-2xl border border-line bg-surface p-6 space-y-5 hover:border-line-strong transition-all shadow-xs"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          ins.severity === "critical"
                            ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        }`}
                      >
                        {ins.severity} Alert
                      </span>
                      <h3 className="text-sm font-bold text-text">{ins.title}</h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-text-muted">Status:</span>
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

                  {/* Root Cause & Synthesis */}
                  <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brass block">
                      AI Root Cause Synthesis
                    </span>
                    <p className="text-xs text-text/90 leading-relaxed">
                      {ins.rootCauseAnalysis.summary}
                    </p>
                  </div>

                  {/* Fact vs Hypothesis Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Verified Evidence */}
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                      <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified Telemetry Facts</span>
                      </span>
                      <ul className="space-y-1 text-[11px] text-text-muted">
                        {ins.rootCauseAnalysis.verifiedFacts.map((fact, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <span>{fact}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Contributing Hypotheses */}
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                      <span className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Contributing Factors & Hypotheses</span>
                      </span>
                      <ul className="space-y-1 text-[11px] text-text-muted">
                        {ins.rootCauseAnalysis.hypotheses.map((hyp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            <span>{hyp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommended Actions & Task Approvals */}
                  {ins.recommendedActions.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-brass" />
                        <span>Recommended Corrective Actions & Workflow Tasks</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ins.recommendedActions.map((action) => (
                          <div
                            key={action.key}
                            className="p-4 rounded-xl bg-surface-2 border border-line flex flex-col justify-between space-y-3"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-line text-brass font-bold uppercase tracking-wider">
                                  {action.targetDepartment}
                                </span>
                                <span className="text-[10px] text-text-muted font-mono">
                                  Owner: {action.suggestedOwner}
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-text">{action.title}</h5>
                              <p className="text-[11px] text-text-muted leading-relaxed">
                                {action.description}
                              </p>
                              <p className="text-[10px] text-brass/80 font-medium">
                                Impact: {action.expectedImpact}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                              {action.status === "task_created" ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Task Created ({action.taskId})</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleApproveAction(ins.id, action.key)}
                                  disabled={approvingActionKey === action.key}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass text-white text-[11px] font-bold hover:brightness-110 cursor-pointer shadow-xs"
                                >
                                  <Play className="w-3 h-3" />
                                  <span>{approvingActionKey === action.key ? "Creating Task…" : "Approve & Create Task"}</span>
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
              className="p-5 rounded-2xl bg-surface border border-line space-y-3 hover:border-line-strong transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-surface-2 border border-line text-brass font-bold uppercase tracking-wider font-mono">
                    {kpi.frequency}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold uppercase">
                    Monitoring Active
                  </span>
                </div>

                <h4 className="text-xs font-bold text-text">{kpi.name}</h4>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {kpi.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-text-muted bg-surface-2/60 p-2.5 rounded-xl border border-line/60">
                <div>
                  <span className="block text-[10px] text-text-muted/60">Target Threshold</span>
                  <span className="font-bold text-text">{kpi.targetValue ?? "N/A"}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-muted/60">Warning Threshold</span>
                  <span className="font-bold text-amber-400">{kpi.warningThreshold ?? "N/A"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: STATISTICAL FORECASTING */}
      {activeTab === "forecast" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3 p-4 rounded-2xl bg-surface-2 border border-line">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text">Forecast Target:</span>
              <button
                type="button"
                onClick={() => {
                  setForecastMetric("revenue");
                  fetchForecast("revenue");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  forecastMetric === "revenue"
                    ? "bg-brass text-white shadow-xs"
                    : "bg-surface border border-line text-text-muted hover:text-text"
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
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  forecastMetric === "burn"
                    ? "bg-brass text-white shadow-xs"
                    : "bg-surface border border-line text-text-muted hover:text-text"
                }`}
              >
                Operating Burn
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchForecast(forecastMetric)}
              disabled={isLoadingForecast}
              className="p-2 rounded-xl bg-surface border border-line text-text-muted hover:text-text cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingForecast ? "animate-spin text-brass" : ""}`} />
            </button>
          </div>

          {forecast && (
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="text-sm font-bold text-text">{forecast.metric} Trajectory Model</h3>
                  <p className="text-[11px] text-text-muted">
                    {forecast.methodology} ({forecast.confidenceLevel})
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {forecast.growthRatePct > 0 ? "+" : ""}{forecast.growthRatePct}% Monthly Drift
                </span>
              </div>

              {/* Data Table with Confidence Intervals */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-text-muted text-[11px]">
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Expected (INR)</th>
                      <th className="py-2.5 px-3">80% Lower Bound</th>
                      <th className="py-2.5 px-3">80% Upper Bound</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {forecast.periods.map((p, idx) => (
                      <tr key={idx} className={p.type === "projected" ? "bg-brass/5 font-medium" : ""}>
                        <td className="py-2.5 px-3 font-bold text-text">{p.period}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              p.type === "projected"
                                ? "bg-brass-soft text-brass border border-brass/30"
                                : "bg-surface-2 text-text-muted"
                            }`}
                          >
                            {p.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-text">
                          ₹{p.expected.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-text-muted">
                          ₹{p.lowerBound.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-text-muted">
                          ₹{p.upperBound.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Assumptions & Limitations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-[11px] font-bold text-text block">Model Assumptions:</span>
                  <ul className="space-y-1 text-[11px] text-text-muted">
                    {forecast.assumptions.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-brass mt-1.5 shrink-0" />
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 block">Limitations & Horizon:</span>
                  <ul className="space-y-1 text-[11px] text-text-muted">
                    {forecast.limitations.map((l, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
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

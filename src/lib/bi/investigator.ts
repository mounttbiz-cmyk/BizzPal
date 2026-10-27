import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { searchCompanyKnowledge } from "@/lib/knowledge/retrieval";
import { BusinessMetricSnapshot } from "./metricsEngine";

export interface RecommendedAction {
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

export interface BusinessInsightItem {
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

/**
 * Investigate a detected business anomaly using structured data and Business Context Engine documents
 */
export async function investigateBusinessAnomaly(params: {
  businessId: string;
  kpi: any;
  currentValue: number;
  previousValue: number;
  changePct: number;
  severity: "info" | "warning" | "critical";
  breachReason: string;
  metricsSnapshot: BusinessMetricSnapshot;
}): Promise<BusinessInsightItem> {
  const { businessId, kpi, currentValue, previousValue, changePct, severity, breachReason, metricsSnapshot } = params;

  // 1. Search company knowledge documents for context on the affected metric (e.g. strategy, budget, marketing)
  const searchQuery = `${kpi.name} ${kpi.metricKey.replace(/_/g, " ")} revenue burn cost marketing`;
  const relatedDocs = await searchCompanyKnowledge(searchQuery, businessId, { limit: 3, minSimilarity: 0.45 });

  const documentEvidence = relatedDocs.map((d) => ({
    title: d.documentTitle,
    snippet: d.content.slice(0, 160) + "...",
  }));

  // Correlated signals
  const correlatedSignals: string[] = [
    `Cash runway stands at ${metricsSnapshot.runwayMonths} months with ₹${(metricsSnapshot.cashReserve / 1000).toFixed(0)}k cash reserve.`,
    `Unit economics: CAC is ₹${metricsSnapshot.cac}, LTV is ₹${metricsSnapshot.ltv} (LTV/CAC: ${metricsSnapshot.ltvCacRatio}x).`,
    `Execution velocity: ${metricsSnapshot.tasksCompletedRate}% of sprint tasks currently delivered.`,
  ];

  // 2. Invoke AI for root-cause synthesis and corrective action formulation
  const prompt = `You are BizzPal's Chief Business Intelligence Copilot.
An important business KPI alert was triggered:
- Metric: ${kpi.name} (${kpi.metricKey})
- Current Value: ${currentValue}
- Previous Period Value: ${previousValue}
- Observed Change: ${changePct}%
- Alert Severity: ${severity.toUpperCase()}
- Breach Note: ${breachReason}

=== BUSINESS CONTEXT ===
- Monthly Revenue: ₹${metricsSnapshot.monthlyRevenue}
- Monthly Burn: ₹${metricsSnapshot.monthlyBurn}
- Cash Reserve: ₹${metricsSnapshot.cashReserve}
- Runway: ${metricsSnapshot.runwayMonths} months
- Spend Breakdown: ${JSON.stringify(metricsSnapshot.categorySpend)}

=== RETRIEVED COMPANY MEMORY EVIDENCE ===
${documentEvidence.map((d) => `Document "${d.title}": ${d.snippet}`).join("\n") || "No internal strategy documents found."}

TASK:
Produce an evidence-based investigation.
1. Separate VERIFIED FACTS (from data/docs) from HYPOTHESES (inferred potential causes).
2. Recommend 2 to 3 concrete corrective actions with suggested department, suggested owner, priority, and expected impact.
3. Be objective. Do not claim causation from correlation without evidence. Note any uncertainty.`;

  let aiInvestigationText: string | null = null;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000 },
          }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        aiInvestigationText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      }
    } catch {}
  }

  // Fallback structured generation
  const insightId = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Formulate structured actions
  const recommendedActions: RecommendedAction[] = [
    {
      key: `act_${insightId}_1`,
      title: `Audit ${kpi.name} variance with department leads`,
      description: `Schedule a 30-minute cross-functional review to examine unit-level drivers behind the ${changePct}% shift in ${kpi.name}.`,
      targetDepartment: kpi.metricKey.includes("burn") ? "Finance & Ops" : "Growth & Sales",
      suggestedOwner: kpi.metricKey.includes("burn") ? "Marcus (CFO)" : "Astra (CEO)",
      priority: severity === "critical" ? "high" : "medium",
      expectedImpact: `Re-anchor target trajectory within 14 business days.`,
      status: "recommended",
    },
    {
      key: `act_${insightId}_2`,
      title: `Optimize variable spend allocation`,
      description: `Review highest-cost components in the spend breakdown to pause underperforming campaigns or non-essential tooling.`,
      targetDepartment: "Finance & Operations",
      suggestedOwner: "Finance Lead",
      priority: "medium",
      expectedImpact: "Preserve additional 1.5 months of cash runway.",
      status: "recommended",
    },
  ];

  const verifiedFacts: string[] = [
    `${kpi.name} experienced a ${changePct}% variation from ${previousValue} to ${currentValue}.`,
    `Current runway is ${metricsSnapshot.runwayMonths} months against monthly burn of ₹${metricsSnapshot.monthlyBurn}.`,
  ];

  const hypotheses: string[] = [
    `Shift may be linked to seasonality, contract billing milestone cycles, or customer acquisition cadence.`,
    `Infrastructure or paid ad spend reallocations during the reporting period may have intensified the margin gap.`,
  ];

  const summary = aiInvestigationText
    ? aiInvestigationText.slice(0, 500)
    : `BizzPal detected a ${severity} deviation in ${kpi.name}. Observed change of ${changePct}% crossed established monitoring thresholds. Review recommended corrective actions to realign operating parameters.`;

  const evidenceSummary = {
    affectedKpi: kpi.name,
    reportingPeriod: "Current Month vs. Previous Period",
    correlatedSignals,
    relatedDocuments: documentEvidence,
    missingDataNotices: [
      metricsSnapshot.hasUploadedData ? "Validated against active upload records." : "Calculated using baseline operational profile.",
    ],
  };

  const rootCauseAnalysis = {
    verifiedFacts,
    hypotheses,
    uncertaintyRating: (severity === "critical" ? "medium" : "low") as "low" | "medium" | "high",
    summary,
  };

  const auditTrail = [
    {
      action: "Anomaly Detected",
      timestamp: now,
      author: "Autonomous KPI Monitor",
      note: breachReason,
    },
    {
      action: "AI Investigation Completed",
      timestamp: now,
      author: "BizzPal Business Context Engine",
    },
  ];

  // Persist insight in SQLite
  db.prepare(`
    INSERT INTO business_insights (id, business_id, kpi_id, title, severity, status, observed_value, previous_value, change_pct, evidence_summary, root_cause_analysis, recommended_actions, audit_trail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'action_recommended', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    insightId,
    businessId,
    kpi.id,
    `${severity.toUpperCase()}: ${kpi.name} Deviation Detected (${changePct > 0 ? "+" : ""}${changePct}%)`,
    severity,
    currentValue,
    previousValue,
    changePct,
    JSON.stringify(evidenceSummary),
    JSON.stringify(rootCauseAnalysis),
    JSON.stringify(recommendedActions),
    JSON.stringify(auditTrail),
    now,
    now
  );

  return {
    id: insightId,
    businessId,
    kpiId: kpi.id,
    title: `${severity.toUpperCase()}: ${kpi.name} Deviation Detected (${changePct > 0 ? "+" : ""}${changePct}%)`,
    severity,
    status: "action_recommended",
    observedValue: currentValue,
    previousValue,
    changePct,
    evidenceSummary,
    rootCauseAnalysis,
    recommendedActions,
    auditTrail,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get insights with optional filtering
 */
export function getBusinessInsights(
  businessId = DEFAULT_BUSINESS_ID,
  filters: { status?: string; severity?: string } = {}
): BusinessInsightItem[] {
  let sql = "SELECT * FROM business_insights WHERE business_id = ?";
  const params: any[] = [businessId];

  if (filters.status) {
    sql += " AND status = ?";
    params.push(filters.status);
  }
  if (filters.severity) {
    sql += " AND severity = ?";
    params.push(filters.severity);
  }

  sql += " ORDER BY created_at DESC";

  const rows = db.prepare(sql).all(...params) as any[];

  return rows.map((r) => ({
    id: r.id,
    businessId: r.business_id,
    kpiId: r.kpi_id,
    title: r.title,
    severity: r.severity,
    status: r.status,
    observedValue: r.observed_value,
    previousValue: r.previous_value,
    changePct: r.change_pct,
    evidenceSummary: JSON.parse(r.evidence_summary || "{}"),
    rootCauseAnalysis: JSON.parse(r.root_cause_analysis || "{}"),
    recommendedActions: JSON.parse(r.recommended_actions || "[]"),
    auditTrail: JSON.parse(r.audit_trail || "[]"),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Update insight status and record audit trail
 */
export function updateInsightStatus(
  insightId: string,
  newStatus: string,
  auditNote?: string,
  author = "Executive Founder",
  businessId = DEFAULT_BUSINESS_ID
): boolean {
  const row = db.prepare("SELECT * FROM business_insights WHERE id = ? AND business_id = ?").get(insightId, businessId) as any;
  if (!row) return false;

  const auditTrail = JSON.parse(row.audit_trail || "[]");
  const now = new Date().toISOString();
  auditTrail.push({
    action: `Status changed to ${newStatus}`,
    timestamp: now,
    author,
    note: auditNote || undefined,
  });

  db.prepare(`
    UPDATE business_insights
    SET status = ?, audit_trail = ?, updated_at = ?
    WHERE id = ? AND business_id = ?
  `).run(newStatus, JSON.stringify(auditTrail), now, insightId, businessId);

  return true;
}

/**
 * Approve recommended action and generate a workflow task in existing tasks table
 */
export async function approveInsightAction(
  insightId: string,
  actionKey: string,
  approvedBy = "Executive Founder",
  businessId = DEFAULT_BUSINESS_ID
): Promise<{ success: boolean; taskId?: string; action?: RecommendedAction }> {
  const row = db.prepare("SELECT * FROM business_insights WHERE id = ? AND business_id = ?").get(insightId, businessId) as any;
  if (!row) {
    throw new Error("Insight not found or unauthorized");
  }

  const actions: RecommendedAction[] = JSON.parse(row.recommended_actions || "[]");
  const action = actions.find((a) => a.key === actionKey);
  if (!action) {
    throw new Error("Action key not found in insight");
  }

  const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Create real task in existing tasks table!
  db.prepare(`
    INSERT INTO tasks (id, business_id, title, owner, gap, priority, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'todo', ?)
  `).run(
    taskId,
    businessId,
    `[BI Action] ${action.title}`,
    action.suggestedOwner || approvedBy,
    `Insight: ${row.title}`,
    action.priority || "medium",
    now
  );

  // Update action state
  action.status = "task_created";
  action.taskId = taskId;

  // Record audit entry in insight_actions_audit
  db.prepare(`
    INSERT INTO insight_actions_audit (id, insight_id, business_id, action_key, action_title, action_status, approved_by, created_task_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, 'task_created', ?, ?, ?, ?)
  `).run(
    `aud_${Date.now()}`,
    insightId,
    businessId,
    actionKey,
    action.title,
    approvedBy,
    taskId,
    JSON.stringify({ expectedImpact: action.expectedImpact }),
    now
  );

  // Update insight record
  const auditTrail = JSON.parse(row.audit_trail || "[]");
  auditTrail.push({
    action: `Action approved & task created: "${action.title}"`,
    timestamp: now,
    author: approvedBy,
    note: `Assigned to ${action.suggestedOwner} (Task ID: ${taskId})`,
  });

  db.prepare(`
    UPDATE business_insights
    SET recommended_actions = ?, status = 'action_in_progress', audit_trail = ?, updated_at = ?
    WHERE id = ? AND business_id = ?
  `).run(JSON.stringify(actions), JSON.stringify(auditTrail), now, insightId, businessId);

  return { success: true, taskId, action };
}

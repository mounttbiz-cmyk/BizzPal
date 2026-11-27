import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { searchCompanyKnowledge } from "@/lib/knowledge/retrieval";
import { generateChat } from "@/lib/ai/providers";
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
  const correlatedSignals: string[] = [];
  if (metricsSnapshot.runwayMonths !== null) {
    correlatedSignals.push(`Cash runway stands at ${metricsSnapshot.runwayMonths} months with \u20B9${(metricsSnapshot.cashReserve / 1000).toFixed(0)}k cash in the bank.`);
  }
  if (metricsSnapshot.tasksCompletedRate !== null) {
    correlatedSignals.push(`${metricsSnapshot.tasksCompletedRate}% of the business's tasks are marked done.`);
  }

  // 2. Invoke AI for root-cause synthesis and corrective action formulation
  const prompt = `You are BizzPal's Business Intelligence Analyst.
A business KPI alert was triggered:
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
- Runway: ${metricsSnapshot.runwayMonths ?? "not known"} months

=== RETRIEVED COMPANY MEMORY EVIDENCE ===
${documentEvidence.map((d) => `Document "${d.title}": ${d.snippet}`).join("\n") || "No internal strategy documents found."}

Respond ONLY as compact valid JSON matching this schema:
{
  "summary": "2-sentence grounded diagnostic summary",
  "verifiedFacts": ["factual statement 1 from above numbers/docs"],
  "hypotheses": ["plausible cause 1 clearly labeled as hypothesis"],
  "actions": [
    {
      "title": "Action title",
      "description": "Concrete step grounded in this alert",
      "targetDepartment": "Finance & Ops | Growth & Sales | Operations",
      "suggestedOwner": "CFO | CEO | Finance Lead",
      "priority": "high | medium | low",
      "expectedImpact": "Measurable goal without inventing percentages"
    }
  ]
}`;

  const aiInvestigationText = await generateChat(
    {
      system: "You are an objective business intelligence analyst. Ground every claim strictly in provided numbers and documents.",
      message: prompt,
      temperature: 0.25,
      meter: { businessId, feature: "bi_investigator" },
    },
    "paid"
  ).catch(() => null);

  const insightId = `ins_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  let parsedAi: {
    summary?: string;
    verifiedFacts?: unknown;
    hypotheses?: unknown;
    actions?: unknown;
  } | null = null;
  if (aiInvestigationText) {
    try {
      const m = aiInvestigationText.match(/\{[\s\S]*\}/);
      if (m) parsedAi = JSON.parse(m[0]);
    } catch {
      parsedAi = null;
    }
  }

  const aiActions: RecommendedAction[] = Array.isArray(parsedAi?.actions)
    ? parsedAi!.actions
        .slice(0, 3)
        .filter((a: any) => a && typeof a.title === "string")
        .map((a: any, idx: number) => ({
          key: `act_${insightId}_${idx + 1}`,
          title: String(a.title).slice(0, 120),
          description: String(a.description || a.title).slice(0, 300),
          targetDepartment: String(a.targetDepartment || (kpi.metricKey.includes("burn") ? "Finance & Ops" : "Growth & Sales")),
          suggestedOwner: String(a.suggestedOwner || (kpi.metricKey.includes("burn") ? "CFO" : "CEO")),
          priority: a.priority === "high" || a.priority === "low" ? a.priority : "medium",
          expectedImpact: String(a.expectedImpact || "Address metric deviation against threshold."),
          status: "recommended" as const,
        }))
    : [];

  const recommendedActions: RecommendedAction[] =
    aiActions.length > 0
      ? aiActions
      : [
          {
            key: `act_${insightId}_1`,
            title: `Review ${kpi.name} drivers`,
            description: `Audit underlying line items and activity behind the ${changePct}% shift from ${previousValue} to ${currentValue}.`,
            targetDepartment: kpi.metricKey.includes("burn") ? "Finance & Ops" : "Growth & Sales",
            suggestedOwner: kpi.metricKey.includes("burn") ? "CFO" : "CEO",
            priority: severity === "critical" ? "high" : "medium",
            expectedImpact: "Verify root cause before committing budget or headcount changes.",
            status: "recommended",
          },
        ];

  const baseFacts: string[] = [
    `${kpi.name} moved ${changePct}% from ${previousValue} to ${currentValue}.`,
    metricsSnapshot.runwayMonths !== null
      ? `Current runway is ${metricsSnapshot.runwayMonths} months against monthly burn of ₹${metricsSnapshot.monthlyBurn}.`
      : `Current monthly burn is ₹${metricsSnapshot.monthlyBurn}; runway is unknown until cash reserve is recorded.`,
  ];

  const aiFacts = Array.isArray(parsedAi?.verifiedFacts)
    ? parsedAi!.verifiedFacts.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 4)
    : [];

  const verifiedFacts = aiFacts.length > 0 ? aiFacts : baseFacts;

  const aiHypotheses = Array.isArray(parsedAi?.hypotheses)
    ? parsedAi!.hypotheses.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 4)
    : [];

  const hypotheses: string[] =
    aiHypotheses.length > 0
      ? aiHypotheses
      : ["AI hypothesis synthesis unavailable for this run; inspect recent uploads and invoices for primary variance causes."];

  const summary =
    typeof parsedAi?.summary === "string" && parsedAi.summary.trim()
      ? parsedAi.summary.trim().slice(0, 600)
      : aiInvestigationText
      ? aiInvestigationText.slice(0, 500)
      : `Detected a ${severity} threshold breach in ${kpi.name} (${changePct}% shift from ${previousValue} to ${currentValue}). Review recorded transactions and recommended next steps.`;

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

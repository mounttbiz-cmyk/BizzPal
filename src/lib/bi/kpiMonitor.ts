import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { calculateBusinessMetrics } from "./metricsEngine";
import { investigateBusinessAnomaly } from "./investigator";

export interface KpiEvaluationResult {
  kpiId: string;
  metricKey: string;
  name: string;
  currentValue: number;
  targetValue?: number;
  previousValue?: number;
  changePct?: number;
  status: "healthy" | "warning" | "critical";
  isBreached: boolean;
  breachReason?: string;
  insightCreated?: boolean;
  insightId?: string;
}

/**
 * Get all KPI definitions for a business
 */
export function getKpiDefinitions(businessId = DEFAULT_BUSINESS_ID) {
  const rows = db
    .prepare("SELECT * FROM kpi_definitions WHERE business_id = ? ORDER BY created_at ASC")
    .all(businessId) as any[];

  return rows.map((r) => ({
    id: r.id,
    businessId: r.business_id,
    metricKey: r.metric_key,
    name: r.name,
    description: r.description,
    targetValue: r.target_value,
    warningThreshold: r.warning_threshold,
    criticalThreshold: r.critical_threshold,
    comparisonType: r.comparison_type,
    alertSeverity: r.alert_severity,
    frequency: r.frequency,
    enabled: Boolean(r.enabled),
    lastEvaluatedAt: r.last_evaluated_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/**
 * Save or update KPI definition
 */
export function upsertKpiDefinition(data: {
  id?: string;
  businessId?: string;
  metricKey: string;
  name: string;
  description?: string;
  targetValue?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  comparisonType?: string;
  alertSeverity?: string;
  frequency?: string;
  enabled?: boolean;
}) {
  const businessId = data.businessId || DEFAULT_BUSINESS_ID;
  const id = data.id || `kpi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO kpi_definitions (id, business_id, metric_key, name, description, target_value, warning_threshold, critical_threshold, comparison_type, alert_severity, frequency, enabled, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      metric_key = excluded.metric_key,
      name = excluded.name,
      description = excluded.description,
      target_value = excluded.target_value,
      warning_threshold = excluded.warning_threshold,
      critical_threshold = excluded.critical_threshold,
      comparison_type = excluded.comparison_type,
      alert_severity = excluded.alert_severity,
      frequency = excluded.frequency,
      enabled = excluded.enabled,
      updated_at = excluded.updated_at
  `).run(
    id,
    businessId,
    data.metricKey,
    data.name,
    data.description || "",
    data.targetValue ?? null,
    data.warningThreshold ?? null,
    data.criticalThreshold ?? null,
    data.comparisonType || "period_over_period",
    data.alertSeverity || "warning",
    data.frequency || "daily",
    data.enabled !== false ? 1 : 0,
    now,
    now
  );

  return { id, businessId, ...data };
}

/**
 * Evaluate all configured KPIs for a business and trigger proactive investigation
 */
export async function evaluateBusinessKpis(businessId = DEFAULT_BUSINESS_ID): Promise<KpiEvaluationResult[]> {
  const kpis = getKpiDefinitions(businessId).filter((k) => k.enabled);
  const metrics = calculateBusinessMetrics(businessId);
  const history = metrics.history;
  const results: KpiEvaluationResult[] = [];
  const now = new Date().toISOString();

  for (const kpi of kpis) {
    let currentVal = 0;
    let prevVal = 0;

    // Resolve metric value
    if (kpi.metricKey === "monthly_revenue") {
      currentVal = metrics.monthlyRevenue;
      prevVal = history.length >= 2 ? history[history.length - 2].revenue : currentVal;
    } else if (kpi.metricKey === "monthly_burn") {
      currentVal = metrics.monthlyBurn;
      prevVal = history.length >= 2 ? history[history.length - 2].burn : currentVal;
    } else if (kpi.metricKey === "runway_months") {
      currentVal = metrics.runwayMonths;
      prevVal = currentVal;
    } else if (kpi.metricKey === "gross_margin_pct") {
      currentVal = metrics.grossMarginPct;
      prevVal = currentVal;
    } else if (kpi.metricKey === "ltv_cac_ratio") {
      currentVal = metrics.ltvCacRatio;
      prevVal = currentVal;
    } else {
      currentVal = metrics.monthlyRevenue;
    }

    let changePct = 0;
    if (prevVal > 0) {
      changePct = Number((((currentVal - prevVal) / prevVal) * 100).toFixed(1));
    }

    let isBreached = false;
    let status: "healthy" | "warning" | "critical" = "healthy";
    let breachReason = "";

    // Evaluation logic based on comparison type
    if (kpi.comparisonType === "period_over_period" || kpi.comparisonType === "pct_change") {
      // Check negative drops or positive spikes
      if (kpi.criticalThreshold !== null && kpi.criticalThreshold !== undefined) {
        if (kpi.criticalThreshold < 0 && changePct <= kpi.criticalThreshold) {
          isBreached = true;
          status = "critical";
          breachReason = `Decline of ${changePct}% breached critical threshold (${kpi.criticalThreshold}%).`;
        } else if (kpi.criticalThreshold > 0 && changePct >= kpi.criticalThreshold) {
          isBreached = true;
          status = "critical";
          breachReason = `Increase of ${changePct}% breached critical threshold (${kpi.criticalThreshold}%).`;
        }
      }

      if (!isBreached && kpi.warningThreshold !== null && kpi.warningThreshold !== undefined) {
        if (kpi.warningThreshold < 0 && changePct <= kpi.warningThreshold) {
          isBreached = true;
          status = "warning";
          breachReason = `Decline of ${changePct}% breached warning threshold (${kpi.warningThreshold}%).`;
        } else if (kpi.warningThreshold > 0 && changePct >= kpi.warningThreshold) {
          isBreached = true;
          status = "warning";
          breachReason = `Increase of ${changePct}% breached warning threshold (${kpi.warningThreshold}%).`;
        }
      }
    } else if (kpi.comparisonType === "threshold") {
      // Direct threshold check (e.g. runway < 6 months, margin < 65%)
      if (kpi.criticalThreshold !== null && kpi.criticalThreshold !== undefined && currentVal <= kpi.criticalThreshold) {
        isBreached = true;
        status = "critical";
        breachReason = `Value (${currentVal}) dropped below critical threshold (${kpi.criticalThreshold}).`;
      } else if (kpi.warningThreshold !== null && kpi.warningThreshold !== undefined && currentVal <= kpi.warningThreshold) {
        isBreached = true;
        status = "warning";
        breachReason = `Value (${currentVal}) dropped below warning threshold (${kpi.warningThreshold}).`;
      }
    }

    // Update last evaluated timestamp
    db.prepare("UPDATE kpi_definitions SET last_evaluated_at = ? WHERE id = ?").run(now, kpi.id);

    let insightCreated = false;
    let insightId: string | undefined;

    // Deduplication & alert cooldown: Check if an unresolved insight exists within last 24h
    if (isBreached) {
      const existingInsight = db
        .prepare(`
          SELECT id, status, created_at 
          FROM business_insights 
          WHERE business_id = ? AND kpi_id = ? AND status NOT IN ('resolved', 'dismissed')
          ORDER BY created_at DESC LIMIT 1
        `)
        .get(businessId, kpi.id) as any;

      if (!existingInsight) {
        // Trigger AI-powered investigation and create evidence-based insight
        const insight = await investigateBusinessAnomaly({
          businessId,
          kpi,
          currentValue: currentVal,
          previousValue: prevVal,
          changePct,
          severity: status === "critical" ? "critical" : "warning",
          breachReason,
          metricsSnapshot: metrics,
        });

        insightCreated = true;
        insightId = insight.id;
      } else {
        insightId = existingInsight.id;
      }
    }

    results.push({
      kpiId: kpi.id,
      metricKey: kpi.metricKey,
      name: kpi.name,
      currentValue: currentVal,
      targetValue: kpi.targetValue,
      previousValue: prevVal,
      changePct,
      status,
      isBreached,
      breachReason: isBreached ? breachReason : undefined,
      insightCreated,
      insightId,
    });
  }

  return results;
}

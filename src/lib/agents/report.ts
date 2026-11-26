import { db, getPlatformConfig } from "@/lib/db";
import { actionById } from "@/lib/platform/policy";

/**
 * What the agents actually did over a period, built only from the records: jobs (workflow_tasks), actions (the audit
 * trail), approvals, emails sent (agent_deliveries) and credits (credit_ledger). Time saved is an estimate from a
 * minutes-per-action table the admin can change (platform config "agent_minutes_saved").
 */

export const DEFAULT_MINUTES_SAVED: Record<string, number> = {
  "message.draft": 6,
  "email.send": 3,
  "tasks.create_internal": 2,
  "tasks.list": 0,
  "brief.read": 0,
};

export interface AgentReport {
  days: number;
  since: string;
  jobs: { total: number; completed: number; failed: number; skipped: number; waiting: number; running: number };
  actions: { total: number; byAction: Array<{ action: string; label: string; count: number }> };
  approvals: { approved: number; rejected: number; expired: number; pending: number };
  emailsSent: number;
  creditsSpent: number;
  minutesSaved: number;
}

export function agentReport(opts: { businessId: string; walletBusinessId: string; days: number; agentInstanceId?: string }): AgentReport {
  const days = [7, 30, 90].includes(opts.days) ? opts.days : 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const agentFilter = opts.agentInstanceId ? " AND agent_instance_id = ?" : "";
  const agentArg = opts.agentInstanceId ? [opts.agentInstanceId] : [];

  const tasks = db
    .prepare(`SELECT id, trace_id, state, finished_at, reservation_id, output FROM workflow_tasks WHERE business_id = ? AND created_at >= ?${agentFilter}`)
    .all(opts.businessId, since, ...agentArg) as any[];
  const jobs = { total: tasks.length, completed: 0, failed: 0, skipped: 0, waiting: 0, running: 0 };
  for (const t of tasks) {
    const skipped = t.state === "failed" && !t.reservation_id && String(t.output || "").includes('"summary":"Skipped:');
    if (skipped) jobs.skipped++;
    else if (t.state === "completed") jobs.completed++;
    else if (t.state === "input_required" && !t.finished_at) jobs.waiting++;
    else if (t.state === "working" && !t.finished_at) jobs.running++;
    else jobs.failed++;
  }

  // Actions that actually ran, counted from the audit trail of these jobs
  const counts = new Map<string, number>();
  const traces = tasks.map(t => t.trace_id).filter(Boolean);
  for (let i = 0; i < traces.length; i += 400) {
    const chunk = traces.slice(i, i + 400);
    const rows = db
      .prepare(`SELECT resource, COUNT(*) AS n FROM audit_events WHERE business_id = ? AND action = 'action.done' AND trace_id IN (${chunk.map(() => "?").join(",")}) GROUP BY resource`)
      .all(opts.businessId, ...chunk) as any[];
    for (const r of rows) counts.set(r.resource, (counts.get(r.resource) || 0) + Number(r.n));
  }
  const byAction = Array.from(counts.entries())
    .map(([action, count]) => ({ action, label: actionById(action)?.label || action, count }))
    .sort((a, b) => b.count - a.count);

  const ap = db
    .prepare(`SELECT status, expires_at FROM approvals WHERE business_id = ? AND created_at >= ?${agentFilter}`)
    .all(opts.businessId, since, ...agentArg) as any[];
  const nowIso = new Date().toISOString();
  const approvals = { approved: 0, rejected: 0, expired: 0, pending: 0 };
  for (const a of ap) {
    if (a.status === "approved" || a.status === "used") approvals.approved++;
    else if (a.status === "rejected") approvals.rejected++;
    else if (a.status === "expired" || (a.status === "pending" && a.expires_at < nowIso)) approvals.expired++;
    else if (a.status === "pending") approvals.pending++;
  }

  const taskIds = tasks.map(t => t.id);
  let emailsSent = 0;
  let consumedPaise = 0;
  for (let i = 0; i < taskIds.length; i += 400) {
    const chunk = taskIds.slice(i, i + 400);
    const marks = chunk.map(() => "?").join(",");
    emailsSent += Number(
      (db.prepare(`SELECT COUNT(*) AS n FROM agent_deliveries WHERE business_id = ? AND status = 'sent' AND action = 'email.send' AND task_id IN (${marks})`).get(opts.businessId, ...chunk) as any)?.n || 0
    );
    consumedPaise += Number(
      (db.prepare(`SELECT COALESCE(SUM(-amount_paise), 0) AS p FROM credit_ledger WHERE business_id = ? AND type = 'consume' AND task_id IN (${marks})`).get(opts.walletBusinessId, ...chunk) as any)?.p || 0
    );
  }

  const minutesTable = { ...DEFAULT_MINUTES_SAVED, ...(getPlatformConfig<Record<string, number>>("agent_minutes_saved", {}) || {}) };
  const minutesSaved = byAction.reduce((sum, a) => sum + a.count * Math.max(0, Number(minutesTable[a.action]) || 0), 0);

  return {
    days,
    since,
    jobs,
    actions: { total: byAction.reduce((s, a) => s + a.count, 0), byAction },
    approvals,
    emailsSent,
    creditsSpent: Math.round(consumedPaise) / 100,
    minutesSaved,
  };
}

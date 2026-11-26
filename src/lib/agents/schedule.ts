import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { aiTierFor } from "@/lib/ai/providers";
import { recordAudit } from "@/lib/platform/audit";
import { checkDailyAiLimit } from "@/lib/platform/usage";
import { getAgent } from "./lifecycle";
import { recordSkippedRun, startJob } from "./runtime";

/**
 * Agents that run on their own: on a schedule (daily or weekly at a set time, India time), or when something happens
 * in the business (businessEvent). Every run is an ordinary job, with the agent's budget, a credit reservation and the
 * plan's daily AI limit. A paused or retired agent never runs; a run that cannot start is recorded with the reason.
 */

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_schedules (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      wallet_business_id TEXT NOT NULL,
      agent_instance_id TEXT NOT NULL UNIQUE,
      instruction TEXT NOT NULL,
      cadence TEXT NOT NULL,
      run_time TEXT NOT NULL,
      weekday INTEGER,
      trigger_event TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      next_run_at TEXT,
      last_run_at TEXT,
      last_result TEXT,
      owner_email TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agent_schedules_due ON agent_schedules (enabled, next_run_at);
  `);
} catch {}

export type Cadence = "daily" | "weekly";
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const IST_OFFSET_MS = 330 * 60 * 1000; // India has no daylight saving

export interface AgentSchedule {
  enabled: boolean;
  cadence: Cadence;
  time: string;
  weekday: number | null;
  instruction: string;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastResult: string | null;
}

export class ScheduleError extends Error {
  status = 400;
  code = "invalid_schedule";
}

/** The next moment, after `from`, that matches the schedule (computed in India time, returned as an ISO string). */
export function nextRunAt(cadence: Cadence, time: string, weekday: number | null, from = new Date()): string {
  const [h, m] = time.split(":").map(Number);
  const istNow = new Date(from.getTime() + IST_OFFSET_MS);
  const c = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate(), h, m, 0, 0));
  if (cadence === "weekly" && weekday !== null) {
    let add = (weekday - c.getUTCDay() + 7) % 7;
    if (add === 0 && c.getTime() <= istNow.getTime()) add = 7;
    c.setUTCDate(c.getUTCDate() + add);
  } else if (c.getTime() <= istNow.getTime()) {
    c.setUTCDate(c.getUTCDate() + 1);
  }
  return new Date(c.getTime() - IST_OFFSET_MS).toISOString();
}

function toSchedule(r: any): AgentSchedule {
  return {
    enabled: Boolean(r.enabled),
    cadence: r.cadence,
    time: r.run_time,
    weekday: r.weekday === null || r.weekday === undefined ? null : Number(r.weekday),
    instruction: r.instruction,
    nextRunAt: r.enabled ? r.next_run_at : null,
    lastRunAt: r.last_run_at,
    lastResult: r.last_result,
  };
}

export function getSchedule(businessId: string, agentInstanceId: string): AgentSchedule | null {
  const r = db.prepare("SELECT * FROM agent_schedules WHERE business_id = ? AND agent_instance_id = ?").get(businessId, agentInstanceId);
  return r ? toSchedule(r) : null;
}

export function saveSchedule(
  opts: { businessId: string; walletBusinessId: string; agentInstanceId: string; ownerEmail: string },
  input: { enabled?: unknown; cadence?: unknown; time?: unknown; weekday?: unknown; instruction?: unknown }
): AgentSchedule {
  const inst = getAgent(opts.businessId, opts.agentInstanceId);
  if (!inst) throw Object.assign(new ScheduleError("That agent was not found."), { status: 404 });
  if (inst.state === "retired") throw new ScheduleError("A retired agent cannot be scheduled.");
  const cadence: Cadence = input.cadence === "weekly" ? "weekly" : "daily";
  const time = String(input.time || "");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new ScheduleError("Choose a time, for example 09:00.");
  const weekday = cadence === "weekly" ? Number(input.weekday) : null;
  if (cadence === "weekly" && !(Number.isInteger(weekday) && weekday! >= 0 && weekday! <= 6)) throw new ScheduleError("Choose a day of the week.");
  const instruction = String(input.instruction || "").trim().slice(0, 2000);
  if (instruction.length < 5) throw new ScheduleError("Describe what the agent should do on each run.");
  const enabled = input.enabled !== false;
  const now = new Date().toISOString();
  const next = enabled ? nextRunAt(cadence, time, weekday) : null;
  const existing = db.prepare("SELECT id FROM agent_schedules WHERE business_id = ? AND agent_instance_id = ?").get(opts.businessId, opts.agentInstanceId) as any;
  if (existing) {
    db.prepare(
      "UPDATE agent_schedules SET instruction = ?, cadence = ?, run_time = ?, weekday = ?, enabled = ?, next_run_at = ?, owner_email = ?, wallet_business_id = ?, updated_at = ? WHERE id = ?"
    ).run(instruction, cadence, time, weekday, enabled ? 1 : 0, next, opts.ownerEmail, opts.walletBusinessId, now, existing.id);
  } else {
    db.prepare(
      `INSERT INTO agent_schedules (id, business_id, wallet_business_id, agent_instance_id, instruction, cadence, run_time, weekday, enabled, next_run_at, owner_email, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(`sch_${randomBytes(8).toString("hex")}`, opts.businessId, opts.walletBusinessId, opts.agentInstanceId, instruction, cadence, time, weekday, enabled ? 1 : 0, next, opts.ownerEmail, now);
  }
  recordAudit({ businessId: opts.businessId, actor: opts.ownerEmail, action: "agent.schedule_saved", resource: opts.agentInstanceId, detail: { cadence, time, weekday, enabled } });
  return getSchedule(opts.businessId, opts.agentInstanceId)!;
}

export function deleteSchedule(businessId: string, agentInstanceId: string, actor: string) {
  db.prepare("DELETE FROM agent_schedules WHERE business_id = ? AND agent_instance_id = ?").run(businessId, agentInstanceId);
  recordAudit({ businessId, actor, action: "agent.schedule_removed", resource: agentInstanceId, detail: {} });
}

/** Starts one run for a schedule row, or records why it could not start. Returns a short result for the owner. */
function startRun(s: any, instruction: string, actor: string): string {
  const inst = getAgent(s.business_id, s.agent_instance_id);
  const skip = (reason: string) => {
    recordSkippedRun({ businessId: s.business_id, walletBusinessId: s.wallet_business_id, agentInstanceId: s.agent_instance_id, purpose: instruction, reason, actor });
    return `Skipped: ${reason}`;
  };
  if (!inst) return "Skipped: the agent no longer exists.";
  if (inst.state !== "active") return skip(inst.state === "paused" ? "The agent is paused." : "The agent is not switched on.");
  try {
    checkDailyAiLimit(s.owner_email);
  } catch (err) {
    return skip((err as Error)?.message || "Today's AI limit for your plan has been reached.");
  }
  try {
    startJob({
      businessId: s.business_id,
      walletBusinessId: s.wallet_business_id,
      agentInstanceId: s.agent_instance_id,
      instruction,
      actor,
      tier: aiTierFor(s.owner_email),
    });
    return "Started";
  } catch (err) {
    const msg = (err as Error)?.message || "It could not start.";
    return skip(/credit/i.test(msg) ? "Not enough credits. Add credits to keep this agent running." : msg);
  }
}

/** Called by the background scheduler: starts every scheduled run that is due. */
export function runDueSchedules(now = new Date()): number {
  let rows: any[] = [];
  try {
    rows = db.prepare("SELECT * FROM agent_schedules WHERE enabled = 1 AND next_run_at IS NOT NULL AND next_run_at <= ?").all(now.toISOString()) as any[];
  } catch {
    return 0;
  }
  let started = 0;
  for (const s of rows) {
    // Move the schedule on first, so a slow run or a restart can never start the same run twice
    const next = nextRunAt(s.cadence, s.run_time, s.weekday === null ? null : Number(s.weekday), now);
    const claimed: any = db.prepare("UPDATE agent_schedules SET next_run_at = ?, last_run_at = ? WHERE id = ? AND next_run_at = ?").run(next, now.toISOString(), s.id, s.next_run_at);
    if (!claimed?.changes) continue;
    const inst = getAgent(s.business_id, s.agent_instance_id);
    if (!inst || inst.state === "retired") {
      db.prepare("UPDATE agent_schedules SET enabled = 0, last_result = ? WHERE id = ?").run("Stopped: the agent was retired.", s.id);
      continue;
    }
    const result = startRun(s, s.instruction, `schedule:${s.id}`);
    if (result === "Started") started++;
    db.prepare("UPDATE agent_schedules SET last_result = ? WHERE id = ?").run(result, s.id);
  }
  return started;
}

/**
 * Something happened in the business (for example a new lead). Starts the agents set to react to it.
 * Lead and enquiry sources call this as they are connected.
 */
export function businessEvent(businessId: string, event: "new_lead" | "new_enquiry", details: string): number {
  let rows: any[] = [];
  try {
    rows = db.prepare("SELECT * FROM agent_schedules WHERE business_id = ? AND enabled = 1 AND trigger_event = ?").all(businessId, event) as any[];
  } catch {
    return 0;
  }
  let started = 0;
  for (const s of rows) {
    const instruction = `${s.instruction}\n\nWhat just happened: ${String(details || "").slice(0, 1500)}`;
    const result = startRun(s, instruction, `event:${event}`);
    if (result === "Started") started++;
    db.prepare("UPDATE agent_schedules SET last_run_at = ?, last_result = ? WHERE id = ?").run(new Date().toISOString(), result, s.id);
  }
  return started;
}

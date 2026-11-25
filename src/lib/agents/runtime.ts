import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { agentById } from "@/lib/xray/packs";
import { briefForAdvisors } from "@/lib/brief";
import { generateChatDetailed, type AiTier } from "@/lib/ai/providers";
import { newSpanId, newTraceId, recordAudit } from "@/lib/platform/audit";
import { actionById, authorize } from "@/lib/platform/policy";
import { reserveCredits, settleReservation, WalletError } from "@/lib/platform/wallet";
import { connectionStatus, getAgent, type AgentBudget } from "./lifecycle";

/**
 * Running agent work (PRD 7, 11, 12): one task at a time, each with a trace id, a credit reservation and hard limits.
 *
 * For every action the runtime checks, in order: the task is still running and inside its deadline and limits; the
 * action is one this agent may use; the system it needs is connected; the risk tier allows it (T2 needs a matching
 * approval, T3 is refused). Only then does it run. Every step is written to the audit trail under the task's trace
 * id, and the AI cost of the task is charged to the wallet when the task ends — never more than was reserved.
 */

export type TaskState = "working" | "input_required" | "completed" | "failed" | "canceled";

export interface TaskRecord {
  id: string;
  businessId: string;
  agentInstanceId: string;
  traceId: string;
  state: TaskState;
  purpose: string;
  budget: AgentBudget;
  reservationId: string | null;
  toolCalls: number;
  hops: number;
  tokens: number;
  costInr: number;
  deadline: string;
  result: string | null;
  output: JobOutput | null;
  createdBy: string;
  createdAt: string;
  finishedAt: string | null;
}

export class RuntimeError extends Error {
  status: number;
  code: string;
  constructor(message: string, code = "runtime_error", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_tasks (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      wallet_business_id TEXT NOT NULL,
      agent_instance_id TEXT NOT NULL,
      trace_id TEXT NOT NULL,
      parent_task_id TEXT,
      state TEXT NOT NULL,
      purpose TEXT NOT NULL,
      budget TEXT NOT NULL,
      reservation_id TEXT,
      tool_calls INTEGER NOT NULL DEFAULT 0,
      hops INTEGER NOT NULL DEFAULT 0,
      deadline TEXT NOT NULL,
      result TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      finished_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_workflow_tasks_business ON workflow_tasks (business_id, created_at);
  `);
} catch {}
// What a job produced, step by step (JSON), shown to the owner
try {
  db.exec("ALTER TABLE workflow_tasks ADD COLUMN output TEXT");
} catch {}

export interface JobStep {
  action: string;
  label: string;
  why: string;
  status: "done" | "approval_required" | "refused";
  result?: unknown;
  reason?: string;
}
export interface JobOutput {
  summary: string;
  steps: JobStep[];
}

/** Tokens and rupees of AI used under a trace. */
function spentOnTrace(traceId: string): { tokens: number; costInr: number } {
  const r = db.prepare("SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS t, COALESCE(SUM(cost_inr), 0) AS c FROM ai_usage WHERE trace_id = ?").get(traceId) as any;
  return { tokens: Number(r?.t || 0), costInr: Math.round(Number(r?.c || 0) * 10000) / 10000 };
}

function toTask(r: any): TaskRecord {
  const spent = spentOnTrace(r.trace_id);
  return {
    id: r.id,
    businessId: r.business_id,
    agentInstanceId: r.agent_instance_id,
    traceId: r.trace_id,
    state: r.state,
    purpose: r.purpose,
    budget: JSON.parse(r.budget),
    reservationId: r.reservation_id,
    toolCalls: r.tool_calls,
    hops: r.hops,
    tokens: spent.tokens,
    costInr: spent.costInr,
    deadline: r.deadline,
    result: r.result,
    output: (() => {
      try {
        return r.output ? JSON.parse(r.output) : null;
      } catch {
        return null;
      }
    })(),
    createdBy: r.created_by,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
  };
}

/**
 * Stops tasks that ran past their deadline without finishing (for example when the server restarted mid-job), so
 * their reserved credits are released instead of being held forever.
 */
function stopOverdue(businessId: string) {
  const rows = db
    .prepare("SELECT id FROM workflow_tasks WHERE business_id = ? AND finished_at IS NULL AND deadline < ?")
    .all(businessId, new Date().toISOString()) as any[];
  for (const r of rows) {
    try {
      finishTask(businessId, r.id, "failed", "system", "The task ran past its time limit.");
    } catch {}
  }
}

export function getTask(businessId: string, id: string): TaskRecord | null {
  stopOverdue(businessId);
  const r = db.prepare("SELECT * FROM workflow_tasks WHERE id = ? AND business_id = ?").get(id, businessId);
  return r ? toTask(r) : null;
}

export function listTasks(businessId: string, agentInstanceId?: string): TaskRecord[] {
  stopOverdue(businessId);
  const rows = (agentInstanceId
    ? db.prepare("SELECT * FROM workflow_tasks WHERE business_id = ? AND agent_instance_id = ? ORDER BY created_at DESC LIMIT 50").all(businessId, agentInstanceId)
    : db.prepare("SELECT * FROM workflow_tasks WHERE business_id = ? ORDER BY created_at DESC LIMIT 50").all(businessId)) as any[];
  return rows.map(toTask);
}

/** Starts a task for an active agent, reserving its full budget from the wallet first. */
export function startTask(opts: { businessId: string; walletBusinessId: string; agentInstanceId: string; purpose: string; actor: string }): TaskRecord {
  const inst = getAgent(opts.businessId, opts.agentInstanceId);
  if (!inst) throw new RuntimeError("That agent was not found.", "not_found", 404);
  if (inst.state !== "active") throw new RuntimeError("This agent is not active, so it cannot take on work.", "agent_not_active", 409);
  const id = `tsk_${randomBytes(10).toString("hex")}`;
  const traceId = newTraceId();
  let reservationId: string;
  try {
    reservationId = reserveCredits(opts.walletBusinessId, inst.budget.maxCostInr, { taskId: id, traceId, actor: opts.actor }).id;
  } catch (err) {
    if (err instanceof WalletError) throw new RuntimeError(err.message, err.code, err.status);
    throw err;
  }
  const now = Date.now();
  db.prepare(
    `INSERT INTO workflow_tasks (id, business_id, wallet_business_id, agent_instance_id, trace_id, state, purpose, budget, reservation_id, deadline, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, 'working', ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    opts.businessId,
    opts.walletBusinessId,
    inst.id,
    traceId,
    opts.purpose.slice(0, 300) || "Task",
    JSON.stringify(inst.budget),
    reservationId,
    new Date(now + inst.budget.deadlineMinutes * 60_000).toISOString(),
    opts.actor,
    new Date(now).toISOString()
  );
  recordAudit({ businessId: opts.businessId, traceId, actor: opts.actor, action: "task.started", resource: id, detail: { agent: inst.agentId, purpose: opts.purpose, budget: inst.budget } });
  return getTask(opts.businessId, id)!;
}

/** Ends a task: charges what its AI work actually cost and releases the rest of the reservation. */
export function finishTask(businessId: string, id: string, state: Exclude<TaskState, "working" | "input_required">, actor: string, result?: string): TaskRecord {
  const row = db.prepare("SELECT * FROM workflow_tasks WHERE id = ? AND business_id = ?").get(id, businessId) as any;
  if (!row) throw new RuntimeError("That task was not found.", "not_found", 404);
  if (row.finished_at) return toTask(row);
  const spent = spentOnTrace(row.trace_id);
  db.prepare("UPDATE workflow_tasks SET state = ?, result = ?, finished_at = ? WHERE id = ? AND finished_at IS NULL").run(
    state,
    result ? result.slice(0, 2000) : row.result,
    new Date().toISOString(),
    id
  );
  if (row.reservation_id) {
    settleReservation(row.wallet_business_id, row.reservation_id, spent.costInr, { actor, note: `Task ${id}` });
  }
  recordAudit({ businessId, traceId: row.trace_id, actor, action: `task.${state}`, resource: id, detail: { costInr: spent.costInr, tokens: spent.tokens, toolCalls: row.tool_calls } });
  return getTask(businessId, id)!;
}

type Executor = (ctx: { businessId: string; traceId: string; target: string; payload: any; tier: AiTier; maxOutputHint: number }) => Promise<unknown>;

// The actions that run inside BizzPal itself. Actions in outside systems join this list as those connections arrive.
const EXECUTORS: Record<string, Executor> = {
  "brief.read": async ({ businessId }) => ({ brief: briefForAdvisors(businessId).lines }),
  "tasks.list": async ({ businessId }) =>
    (db.prepare("SELECT id, title, priority, status FROM tasks WHERE business_id = ? AND status != 'done' ORDER BY created_at DESC LIMIT 20").all(businessId) as any[]).map(t => ({ ...t })),
  "tasks.create_internal": async ({ businessId, payload }) => {
    const title = String(payload?.title || "").trim().slice(0, 200);
    if (!title) throw new RuntimeError("A task needs a title.", "invalid_input");
    const priority = ["high", "medium", "low"].includes(payload?.priority) ? payload.priority : "medium";
    const id = `task_${randomBytes(8).toString("hex")}`;
    db.prepare("INSERT INTO tasks (id, business_id, title, owner, gap, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'todo', ?)").run(
      id,
      businessId,
      `[Agent] ${title}`,
      "AI agent",
      "Agent work",
      priority,
      new Date().toISOString()
    );
    return { taskId: id, title };
  },
  "message.draft": async ({ businessId, traceId, payload, tier }) => {
    const instruction = String(payload?.instruction || "").trim().slice(0, 1500);
    if (!instruction) throw new RuntimeError("Say what the message should be about.", "invalid_input");
    const answer = await generateChatDetailed(
      {
        system: `You draft short business messages for review by a person. Use only these facts about the business:\n${briefForAdvisors(businessId).lines.join("\n") || "None recorded."}\nNever invent prices, discounts, guarantees or facts. Plain text, under 120 words.`,
        message: instruction,
        temperature: 0.3,
        meter: { businessId, feature: "agent", traceId },
      },
      tier
    );
    if (!answer) throw new RuntimeError("The draft could not be written right now.", "ai_unavailable", 503);
    return { draft: answer.text, note: "A draft only. Nothing has been sent." };
  },
};

/**
 * Asks to run one action within a task. Returns the result, or that an approval is needed, or why it was refused.
 */
export async function runAction(opts: {
  businessId: string;
  taskId: string;
  action: string;
  target?: string;
  payload?: unknown;
  approvalId?: string | null;
  actor: string;
  tier: AiTier;
}): Promise<
  | { status: "done"; result: unknown; spanId: string }
  | { status: "approval_required"; approvalId: string; expiresAt: string }
  | { status: "refused"; reason: string; code: string }
> {
  const row = db.prepare("SELECT * FROM workflow_tasks WHERE id = ? AND business_id = ?").get(opts.taskId, opts.businessId) as any;
  if (!row) throw new RuntimeError("That task was not found.", "not_found", 404);
  const task = toTask(row);
  const target = String(opts.target || "business").slice(0, 200);
  const refuse = (code: string, reason: string) => {
    recordAudit({ businessId: opts.businessId, traceId: task.traceId, actor: opts.actor, action: "action.refused", resource: opts.action, detail: { code, target } });
    return { status: "refused" as const, reason, code };
  };

  if (task.state !== "working" && task.state !== "input_required") return refuse("task_closed", "This task has already finished.");
  const inst = getAgent(opts.businessId, task.agentInstanceId);
  if (!inst || inst.state !== "active") {
    finishTask(opts.businessId, task.id, "canceled", "system", "The agent was paused or retired.");
    return refuse("agent_not_active", "The agent is no longer active, so the task was stopped.");
  }
  if (Date.now() > new Date(task.deadline).getTime()) {
    finishTask(opts.businessId, task.id, "failed", "system", "Deadline passed.");
    return refuse("deadline", "The task ran past its deadline and was stopped.");
  }
  if (task.toolCalls >= task.budget.maxToolCalls) {
    finishTask(opts.businessId, task.id, "failed", "system", "Tool call limit reached.");
    return refuse("tool_limit", `The task reached its limit of ${task.budget.maxToolCalls} actions and was stopped.`);
  }
  if (task.costInr >= task.budget.maxCostInr || task.tokens >= task.budget.maxTokens) {
    finishTask(opts.businessId, task.id, "failed", "system", "Budget reached.");
    return refuse("budget", "The task reached its spending limit and was stopped.");
  }

  const def = agentById(inst.agentId);
  if (!def?.agent.tools.includes(opts.action)) return refuse("not_allowed", "This agent is not allowed to do that.");
  const action = actionById(opts.action);
  if (!action) return refuse("unknown_action", "Unknown action.");
  if (action.requires && !connectionStatus(opts.businessId, [action.requires])[0].connected) {
    return refuse("not_connected", `${action.label} needs a connection that is not set up yet.`);
  }

  const decision = authorize({
    businessId: opts.businessId,
    action: opts.action,
    target,
    payload: opts.payload,
    actor: opts.actor,
    traceId: task.traceId,
    taskId: task.id,
    agentInstanceId: inst.id,
    approvalId: opts.approvalId || null,
  });
  if (decision.outcome === "deny") return refuse(decision.tier === "T3" ? "tier3" : "denied", decision.reason);
  if (decision.outcome === "approval_required") {
    // The task waits for a person (A2A: INPUT_REQUIRED) until the approval is given and the action is asked again
    db.prepare("UPDATE workflow_tasks SET state = 'input_required' WHERE id = ? AND state = 'working'").run(task.id);
    return { status: "approval_required", approvalId: decision.approvalId, expiresAt: decision.expiresAt };
  }

  const executor = EXECUTORS[opts.action];
  if (!executor) return refuse("not_available", `${action.label} is not available yet.`);

  const spanId = newSpanId();
  db.prepare("UPDATE workflow_tasks SET tool_calls = tool_calls + 1, state = 'working' WHERE id = ? AND finished_at IS NULL").run(task.id);
  try {
    const result = await executor({
      businessId: opts.businessId,
      traceId: task.traceId,
      target,
      payload: opts.payload,
      tier: opts.tier,
      maxOutputHint: task.budget.maxTokens - task.tokens,
    });
    recordAudit({ businessId: opts.businessId, traceId: task.traceId, actor: opts.actor, action: "action.done", resource: opts.action, detail: { spanId, tier: action.tier, target } });
    // Stop straight away if this action took the task over its limits
    const after = spentOnTrace(task.traceId);
    if (after.costInr > task.budget.maxCostInr || after.tokens > task.budget.maxTokens) {
      finishTask(opts.businessId, task.id, "failed", "system", "Budget exceeded by the last action.");
    }
    return { status: "done", result, spanId };
  } catch (err) {
    const message = err instanceof RuntimeError ? err.message : "The action failed.";
    recordAudit({ businessId: opts.businessId, traceId: task.traceId, actor: opts.actor, action: "action.failed", resource: opts.action, detail: { spanId, error: message } });
    return { status: "refused", reason: message, code: err instanceof RuntimeError ? err.code : "failed" };
  }
}

// ------------------------------------------------------------------ jobs

/** How the planner may call each in-app action. */
const ACTION_INPUTS: Record<string, string> = {
  "brief.read": "{} (rarely needed: you already have the brief)",
  "tasks.list": "{} lists the open tasks, to avoid creating duplicates",
  "message.draft": '{"instruction": "who the message is for, what it must say, and the tone"} writes a draft for the owner to review; nothing is sent',
  "tasks.create_internal": '{"title": "a clear follow-up action, under 120 characters", "priority": "high" | "medium" | "low"}',
};
const MAX_JOB_STEPS = 4;

/**
 * Starts a job for an active agent: the task and its credit reservation are created now, and the work runs in the
 * background (it can take longer than one web request may). Poll the task to see the steps as they finish.
 */
export function startJob(opts: { businessId: string; walletBusinessId: string; agentInstanceId: string; instruction: string; actor: string; tier: AiTier }): TaskRecord {
  const instruction = opts.instruction.trim().slice(0, 2000);
  if (instruction.length < 5) throw new RuntimeError("Describe the job in a sentence or two.", "invalid_input");
  const task = startTask({ ...opts, purpose: instruction });
  void runJob(opts.businessId, task.id, instruction, opts.actor, opts.tier).catch(err => {
    console.warn("[agents] job failed:", (err as Error)?.message);
    try {
      finishTask(opts.businessId, task.id, "failed", "system", "The job stopped unexpectedly.");
    } catch {}
  });
  return task;
}

function saveOutput(taskId: string, output: JobOutput) {
  db.prepare("UPDATE workflow_tasks SET output = ? WHERE id = ?").run(JSON.stringify(output).slice(0, 60_000), taskId);
}

async function runJob(businessId: string, taskId: string, instruction: string, actor: string, tier: AiTier) {
  const task = getTask(businessId, taskId)!;
  const inst = getAgent(businessId, task.agentInstanceId);
  const def = inst ? agentById(inst.agentId) : null;
  if (!inst || !def) {
    finishTask(businessId, taskId, "failed", "system", "The agent was not found.");
    return;
  }

  // Only actions this agent may take and that can run today
  const usable = def.agent.tools.filter(t => EXECUTORS[t] && actionById(t));
  const brief = briefForAdvisors(businessId).lines;
  const output: JobOutput = { summary: "", steps: [] };

  // 1. Plan. The AI only proposes; every step still goes through the runtime's checks below.
  const plan = await generateChatDetailed(
    {
      system: [
        `You are "${def.agent.name}", an AI agent working for this business. Your job: ${def.agent.job}`,
        `Rules you never break: ${def.agent.guardrails}`,
        `About the business (the only facts you may use):\n${brief.join("\n") || "Nothing recorded."}`,
        `Actions you can take:\n${usable.map(a => `- ${a}: ${actionById(a)!.label}. Input: ${ACTION_INPUTS[a] || "{}"}`).join("\n")}`,
        `Plan the owner's request as at most ${MAX_JOB_STEPS} steps, using only these actions. If the request needs something you cannot do (sending, booking, updating another system, payments), do the closest safe thing (a draft or a follow-up task) and say so in the summary.`,
        `Answer with JSON only: {"steps": [{"action": "...", "input": {...}, "why": "one short sentence"}], "summary": "two sentences for the owner on what you did and what they should do next"}`,
      ].join("\n\n"),
      message: instruction,
      json: true,
      temperature: 0.2,
      meter: { businessId, feature: "agent", traceId: task.traceId },
    },
    tier
  );

  let parsed: any = null;
  try {
    parsed = plan ? JSON.parse(plan.text.replace(/^```(?:json)?\s*|\s*```$/g, "")) : null;
  } catch {}
  if (!parsed || !Array.isArray(parsed.steps)) {
    output.summary = plan ? "The agent could not make a clear plan for this job. Try describing it more specifically." : "The AI is not answering right now, so the agent could not plan this job. No credits were used.";
    saveOutput(taskId, output);
    finishTask(businessId, taskId, "failed", "system", output.summary);
    return;
  }
  output.summary = String(parsed.summary || "").slice(0, 600);

  // 2. Carry out each step through the runtime, which enforces the limits, the agent's list and the risk tiers
  for (const step of parsed.steps.slice(0, MAX_JOB_STEPS)) {
    const action = String(step?.action || "");
    const outcome = await runAction({ businessId, taskId, action, payload: step?.input && typeof step.input === "object" ? step.input : {}, actor: `agent:${inst.id}`, tier });
    output.steps.push({
      action,
      label: actionById(action)?.label || action,
      why: String(step?.why || "").slice(0, 300),
      status: outcome.status,
      ...(outcome.status === "done" ? { result: outcome.result } : outcome.status === "refused" ? { reason: outcome.reason } : { reason: "Waiting for your approval." }),
    });
    saveOutput(taskId, output);
    const now = getTask(businessId, taskId);
    if (!now || now.finishedAt) break; // a limit stopped the task
  }

  saveOutput(taskId, output);
  const done = output.steps.some(s => s.status === "done");
  const waiting = output.steps.some(s => s.status === "approval_required");
  if (!waiting) finishTask(businessId, taskId, done ? "completed" : "failed", "system", output.summary);
}

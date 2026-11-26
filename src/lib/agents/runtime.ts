import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { agentById } from "@/lib/xray/packs";
import { briefForAdvisors } from "@/lib/brief";
import { generateChatDetailed, type AiTier } from "@/lib/ai/providers";
import { newSpanId, newTraceId, recordAudit } from "@/lib/platform/audit";
import { actionById, approvalPayload, authorize, previewOf, type ApprovalPreview } from "@/lib/platform/policy";
import { isEmail, sendFromBusiness, EmailAccountError } from "@/lib/integrations/emailAccount";
import { houseStyleFor, maybeRelearn } from "./memory";
import { notifyApprovalNeeded } from "./notify";
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
// Everything an agent sent to the outside world. One row per approval: the same approval can never send twice.
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_deliveries (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      approval_id TEXT NOT NULL UNIQUE,
      task_id TEXT,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      provider_ref TEXT,
      sandbox INTEGER NOT NULL DEFAULT 0,
      error TEXT,
      created_at TEXT NOT NULL,
      finished_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_agent_deliveries_business ON agent_deliveries (business_id, created_at);
  `);
} catch {}

export interface JobStep {
  action: string;
  label: string;
  why: string;
  status: "done" | "approval_required" | "refused";
  result?: unknown;
  reason?: string;
  /** Set while the step waits for the owner */
  approvalId?: string;
  preview?: ApprovalPreview;
}
export interface PlannedStep {
  action: string;
  input: Record<string, unknown>;
  why: string;
}
export interface JobOutput {
  summary: string;
  steps: JobStep[];
  /** The agent's plan, so a job can carry on after an approval */
  plan?: PlannedStep[];
  /** Index in the plan of the next step to run */
  next?: number;
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
    .prepare("SELECT id, state FROM workflow_tasks WHERE business_id = ? AND finished_at IS NULL AND deadline < ?")
    .all(businessId, new Date().toISOString()) as any[];
  for (const r of rows) {
    try {
      finishTask(
        businessId,
        r.id,
        "failed",
        "system",
        r.state === "input_required" ? "No decision was made in time, so the job was stopped. Nothing was sent." : "The task ran past its time limit."
      );
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

type Executor = (ctx: {
  businessId: string;
  traceId: string;
  taskId: string;
  target: string;
  payload: any;
  tier: AiTier;
  maxOutputHint: number;
  /** The approval this run uses (T2 actions) */
  approvalId: string | null;
}) => Promise<unknown>;

/** Runs an outside action at most once per approval. A second attempt returns the first result instead of acting again. */
async function deliverOnce(
  ctx: { businessId: string; taskId: string; approvalId: string | null },
  action: string,
  send: () => Promise<{ ref: string; sandbox: boolean }>
): Promise<{ ref: string; sandbox: boolean; repeated: boolean }> {
  if (!ctx.approvalId) throw new RuntimeError("This action needs an approval.", "approval_required", 409);
  const existing = db.prepare("SELECT * FROM agent_deliveries WHERE approval_id = ?").get(ctx.approvalId) as any;
  if (existing) {
    if (existing.status === "sent") return { ref: existing.provider_ref || "", sandbox: Boolean(existing.sandbox), repeated: true };
    throw new RuntimeError("This was already tried with this approval. Ask the agent again for a new approval.", "already_attempted", 409);
  }
  const id = `dlv_${randomBytes(10).toString("hex")}`;
  db.prepare("INSERT INTO agent_deliveries (id, business_id, approval_id, task_id, action, status, created_at) VALUES (?, ?, ?, ?, ?, 'sending', ?)").run(
    id,
    ctx.businessId,
    ctx.approvalId,
    ctx.taskId,
    action,
    new Date().toISOString()
  );
  try {
    const r = await send();
    db.prepare("UPDATE agent_deliveries SET status = 'sent', provider_ref = ?, sandbox = ?, finished_at = ? WHERE id = ?").run(r.ref, r.sandbox ? 1 : 0, new Date().toISOString(), id);
    return { ...r, repeated: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    db.prepare("UPDATE agent_deliveries SET status = 'failed', error = ?, finished_at = ? WHERE id = ?").run(message.slice(0, 300), new Date().toISOString(), id);
    if (err instanceof EmailAccountError) throw new RuntimeError(err.message, "send_failed", err.status);
    throw err;
  }
}

/** Checks an email before it is put in front of the owner, so nothing malformed can be approved. */
export function validateEmailPayload(payload: any): { to: string; subject: string; body: string } {
  const to = String(payload?.to || "").trim().toLowerCase();
  const subject = String(payload?.subject || "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
  const body = String(payload?.body || "").trim().slice(0, 10000);
  if (!isEmail(to)) throw new RuntimeError("The email needs a valid recipient address.", "invalid_input");
  if (!subject) throw new RuntimeError("The email needs a subject.", "invalid_input");
  if (body.length < 5) throw new RuntimeError("The email needs a message.", "invalid_input");
  return { to, subject, body };
}

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
  "email.send": async ({ businessId, taskId, approvalId, payload }) => {
    const email = validateEmailPayload(payload);
    const sent = await deliverOnce({ businessId, taskId, approvalId }, "email.send", async () => {
      const r = await sendFromBusiness(businessId, email);
      return { ref: r.messageId, sandbox: r.sandbox };
    });
    return {
      sentTo: email.to,
      subject: email.subject,
      sandbox: sent.sandbox,
      note: sent.sandbox ? "Test account: the email was recorded, not sent." : sent.repeated ? "Already sent earlier with this approval." : "Sent from your email account.",
    };
  },
  "message.draft": async ({ businessId, traceId, payload, tier }) => {
    const instruction = String(payload?.instruction || "").trim().slice(0, 1500);
    if (!instruction) throw new RuntimeError("Say what the message should be about.", "invalid_input");
    const style = houseStyleFor(businessId);
    const answer = await generateChatDetailed(
      {
        system: `You draft short business messages for review by a person. Use only these facts about the business:\n${briefForAdvisors(businessId).lines.join("\n") || "None recorded."}\n${style ? `Write in the business's house style:\n${style}\n` : ""}Never invent prices, discounts, guarantees or facts. Plain text, under 120 words.`,
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

  // An email is checked before it is put in front of the owner
  if (opts.action === "email.send") {
    try {
      opts = { ...opts, payload: validateEmailPayload(opts.payload) };
    } catch (err) {
      return refuse("invalid_input", err instanceof RuntimeError ? err.message : "The email is not complete.");
    }
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
    // The task waits for a person (A2A: INPUT_REQUIRED) until the approval is given and the action is asked again.
    // Its time limit runs from the end of the approval window, so waiting for the owner never times it out early.
    const resumeBy = new Date(new Date(decision.expiresAt).getTime() + task.budget.deadlineMinutes * 60_000).toISOString();
    db.prepare("UPDATE workflow_tasks SET state = 'input_required', deadline = ? WHERE id = ? AND finished_at IS NULL").run(resumeBy, task.id);
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
      taskId: task.id,
      approvalId: opts.approvalId || null,
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
  "email.send": '{"to": "the recipient\'s email address, only if the owner gave it", "subject": "short subject", "body": "the full email, ready to send"} sends from the business\'s own email account, only after the owner approves it',
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

  // Only actions this agent may take and that can run today (outside actions only when their system is connected)
  const usable = def.agent.tools.filter(t => {
    const a = actionById(t);
    if (!EXECUTORS[t] || !a) return false;
    return !a.requires || connectionStatus(businessId, [a.requires])[0].connected;
  });
  const brief = briefForAdvisors(businessId).lines;
  const style = houseStyleFor(businessId);
  const output: JobOutput = { summary: "", steps: [] };
  const canSend = usable.includes("email.send");

  // 1. Plan. The AI only proposes; every step still goes through the runtime's checks below.
  const plan = await generateChatDetailed(
    {
      system: [
        `You are "${def.agent.name}", an AI agent working for this business. Your job: ${def.agent.job}`,
        `Rules you never break: ${def.agent.guardrails}`,
        `About the business (the only facts you may use):\n${brief.join("\n") || "Nothing recorded."}`,
        style ? `House style the owner approved:\n${style}` : "",
        `Actions you can take:\n${usable.map(a => `- ${a}: ${actionById(a)!.label}. Input: ${ACTION_INPUTS[a] || "{}"}`).join("\n")}`,
        canSend
          ? `Plan the owner's request as at most ${MAX_JOB_STEPS} steps, using only these actions. Sending an email always waits for the owner's approval. Only email an address the owner gave you; never guess one. If the request needs something you cannot do (WhatsApp, booking, updating another system, payments), do the closest safe thing and say so in the summary.`
          : `Plan the owner's request as at most ${MAX_JOB_STEPS} steps, using only these actions. If the request needs something you cannot do (sending, booking, updating another system, payments), do the closest safe thing (a draft or a follow-up task) and say so in the summary.`,
        `Answer with JSON only: {"steps": [{"action": "...", "input": {...}, "why": "one short sentence"}], "summary": "two sentences for the owner on what you did and what they should do next"}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
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
  output.plan = parsed.steps.slice(0, MAX_JOB_STEPS).map((st: any) => ({
    action: String(st?.action || ""),
    input: st?.input && typeof st.input === "object" ? st.input : {},
    why: String(st?.why || "").slice(0, 300),
  }));
  output.next = 0;
  saveOutput(taskId, output);
  await executeFrom(businessId, taskId, output, `agent:${inst.id}`, tier);
}

/**
 * Carries out the plan from output.next. Stops at a step that needs the owner's approval (the job waits) or when a
 * limit stops the task, and finishes the job once every step has run.
 */
async function executeFrom(businessId: string, taskId: string, output: JobOutput, actor: string, tier: AiTier) {
  const plan = output.plan || [];
  while ((output.next ?? 0) < plan.length) {
    const i = output.next ?? 0;
    const step = plan[i];
    const outcome = await runAction({ businessId, taskId, action: step.action, payload: step.input, actor, tier });
    output.next = i + 1;
    if (outcome.status === "approval_required") {
      const payload = approvalPayload(businessId, outcome.approvalId);
      output.steps.push({
        action: step.action,
        label: actionById(step.action)?.label || step.action,
        why: step.why,
        status: "approval_required",
        approvalId: outcome.approvalId,
        reason: "Waiting for your approval.",
        preview: previewOf(step.action, "business", payload),
      });
      saveOutput(taskId, output);
      const task = getTask(businessId, taskId);
      const inst = task ? getAgent(businessId, task.agentInstanceId) : null;
      const name = (inst && agentById(inst.agentId)?.agent.name) || "Your agent";
      void notifyApprovalNeeded({ businessId, taskId, approvalId: outcome.approvalId, agentName: name, actionLabel: actionById(step.action)?.label || step.action }).catch(() => {});
      return; // the job carries on when the owner decides
    }
    output.steps.push({
      action: step.action,
      label: actionById(step.action)?.label || step.action,
      why: step.why,
      status: outcome.status,
      ...(outcome.status === "done" ? { result: outcome.result } : { reason: outcome.reason }),
    });
    saveOutput(taskId, output);
    const now = getTask(businessId, taskId);
    if (!now || now.finishedAt) return; // a limit stopped the task
  }
  saveOutput(taskId, output);
  const done = output.steps.some(s => s.status === "done");
  finishTask(businessId, taskId, done ? "completed" : "failed", "system", output.summary);
}

/**
 * Carries on a job after the owner approved or rejected one of its steps. Approved: the step runs with exactly what was
 * approved (including the owner's edits). Rejected: the step is marked as refused and the job moves on.
 */
export async function resumeAfterDecision(businessId: string, approvalId: string, decision: "approve" | "reject", actor: string, tier: AiTier) {
  const a = db.prepare("SELECT task_id, action FROM approvals WHERE id = ? AND business_id = ?").get(approvalId, businessId) as any;
  if (!a?.task_id) return;
  const row = db.prepare("SELECT * FROM workflow_tasks WHERE id = ? AND business_id = ?").get(a.task_id, businessId) as any;
  if (!row || row.finished_at) return;
  const task = toTask(row);
  const output = task.output;
  const idx = output?.steps.findIndex(s => s.approvalId === approvalId && s.status === "approval_required") ?? -1;
  if (!output || idx < 0) return;
  const step = output.steps[idx];
  const inst = getAgent(businessId, task.agentInstanceId);
  const agentActor = inst ? `agent:${inst.id}` : actor;

  if (decision === "reject") {
    output.steps[idx] = { ...step, status: "refused", reason: "You rejected this, so it was not done.", approvalId: undefined, preview: step.preview };
    db.prepare("UPDATE workflow_tasks SET state = 'working' WHERE id = ? AND finished_at IS NULL").run(task.id);
  } else {
    const payload = approvalPayload(businessId, approvalId);
    db.prepare("UPDATE workflow_tasks SET state = 'working' WHERE id = ? AND finished_at IS NULL").run(task.id);
    const outcome = await runAction({ businessId, taskId: task.id, action: step.action, payload, approvalId, actor: agentActor, tier });
    output.steps[idx] =
      outcome.status === "done"
        ? { ...step, status: "done", result: outcome.result, reason: undefined, approvalId: undefined }
        : { ...step, status: "refused", reason: outcome.status === "refused" ? outcome.reason : "It needed a new approval.", approvalId: undefined };
    if (outcome.status === "done" && step.action === "email.send") maybeRelearn(businessId, actor, tier);
  }
  saveOutput(task.id, output);
  const now = getTask(businessId, task.id);
  if (!now || now.finishedAt) return;
  await executeFrom(businessId, task.id, output, agentActor, tier);
}

/**
 * Records a scheduled run that could not start (agent paused, not enough credits), so the owner sees why in Recent
 * jobs. No credits are reserved for it.
 */
export function recordSkippedRun(opts: { businessId: string; walletBusinessId: string; agentInstanceId: string; purpose: string; reason: string; actor: string }) {
  const id = `tsk_${randomBytes(10).toString("hex")}`;
  const traceId = newTraceId();
  const now = new Date().toISOString();
  const inst = getAgent(opts.businessId, opts.agentInstanceId);
  db.prepare(
    `INSERT INTO workflow_tasks (id, business_id, wallet_business_id, agent_instance_id, trace_id, state, purpose, budget, deadline, result, created_by, created_at, finished_at, output)
     VALUES (?, ?, ?, ?, ?, 'failed', ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    opts.businessId,
    opts.walletBusinessId,
    opts.agentInstanceId,
    traceId,
    opts.purpose.slice(0, 300),
    JSON.stringify(inst?.budget || {}),
    now,
    opts.reason.slice(0, 500),
    opts.actor,
    now,
    now,
    JSON.stringify({ summary: `Skipped: ${opts.reason}`, steps: [] })
  );
  recordAudit({ businessId: opts.businessId, traceId, actor: opts.actor, action: "task.skipped", resource: id, detail: { reason: opts.reason } });
  return id;
}

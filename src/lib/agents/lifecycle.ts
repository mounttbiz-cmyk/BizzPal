import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { agentById, REQUIREMENT_LABELS } from "@/lib/xray/packs";
import { recordAudit, newTraceId } from "@/lib/platform/audit";
import { walletBalance } from "@/lib/platform/wallet";
import { actionById } from "@/lib/platform/policy";

/**
 * Agent lifecycle (PRD 7.1 and 12):
 *
 *   draft ──evaluate──▶ approval_required ──activate (owner)──▶ active ⇄ paused ──▶ retired
 *      ▲                     │ (a gate fails: back to draft, with the reasons)
 *      └─────────────────────┘
 *
 * Evaluation runs the gates in code:
 *   G0 configuration: the agent is a known one, every tool it may use is a known action, its budget is within limits
 *   G1 golden set and G2 red team: a passing evaluation run is on record for this agent version
 *   Connections: every system it needs is connected for this business
 *   G3 budget: the per-task limits are set, and the wallet holds enough credits for one task
 * Activation is an explicit decision by the owner (G4). Any change to the budget of an active agent sends it back
 * for approval. Nothing here is decided by the AI.
 */

export const AGENT_VERSION = "1.0.0";

export type AgentState = "draft" | "evaluating" | "approval_required" | "active" | "paused" | "retired";

export interface AgentBudget {
  /** Most credits (₹) one task may spend */
  maxCostInr: number;
  /** Most AI tokens one task may use */
  maxTokens: number;
  /** Most tool calls one task may make */
  maxToolCalls: number;
  /** Most hand-offs between agents (PRD: 5) */
  maxHops: number;
  /** Minutes before an unfinished task is stopped */
  deadlineMinutes: number;
}

export const DEFAULT_BUDGET: AgentBudget = { maxCostInr: 15, maxTokens: 12000, maxToolCalls: 12, maxHops: 5, deadlineMinutes: 10 };
const LIMITS = { maxCostInr: [1, 500], maxTokens: [500, 100000], maxToolCalls: [1, 50], maxHops: [1, 5], deadlineMinutes: [1, 120] } as const;

export interface GateResult {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface AgentInstance {
  id: string;
  businessId: string;
  agentId: string;
  name: string;
  version: string;
  state: AgentState;
  budget: AgentBudget;
  evaluation: { at: string; gates: GateResult[]; passed: boolean } | null;
  pausedReason: string | null;
  createdBy: string;
  createdAt: string;
  activatedBy: string | null;
  activatedAt: string | null;
  updatedAt: string;
}

export class AgentError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_instances (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      version TEXT NOT NULL,
      state TEXT NOT NULL,
      budget TEXT NOT NULL,
      evaluation TEXT,
      paused_reason TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      activated_by TEXT,
      activated_at TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_instances_unique ON agent_instances (business_id, agent_id) WHERE state != 'retired';

    -- Results of an agent's golden-set and red-team suites, per version (PRD 12: G1 and G2)
    CREATE TABLE IF NOT EXISTS agent_evaluations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      version TEXT NOT NULL,
      suite TEXT NOT NULL,
      passed INTEGER NOT NULL,
      score REAL,
      detail TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_agent_evaluations ON agent_evaluations (agent_id, version, suite, created_at);
  `);
} catch {}

const parse = (s: unknown, fallback: any) => {
  try {
    return typeof s === "string" && s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
};

function toInstance(r: any): AgentInstance {
  const def = agentById(r.agent_id);
  return {
    id: r.id,
    businessId: r.business_id,
    agentId: r.agent_id,
    name: def?.agent.name || r.agent_id,
    version: r.version,
    state: r.state,
    budget: { ...DEFAULT_BUDGET, ...parse(r.budget, {}) },
    evaluation: parse(r.evaluation, null),
    pausedReason: r.paused_reason || null,
    createdBy: r.created_by,
    createdAt: r.created_at,
    activatedBy: r.activated_by || null,
    activatedAt: r.activated_at || null,
    updatedAt: r.updated_at,
  };
}

export function getAgent(businessId: string, id: string): AgentInstance | null {
  const r = db.prepare("SELECT * FROM agent_instances WHERE id = ? AND business_id = ?").get(id, businessId);
  return r ? toInstance(r) : null;
}

export function listAgents(businessId: string): AgentInstance[] {
  return (db.prepare("SELECT * FROM agent_instances WHERE business_id = ? ORDER BY created_at DESC").all(businessId) as any[]).map(toInstance);
}

function setState(inst: AgentInstance, state: AgentState, actor: string, extra: Record<string, unknown> = {}, detail: Record<string, unknown> = {}) {
  const cols: Record<string, unknown> = { state, updated_at: new Date().toISOString(), ...extra };
  const keys = Object.keys(cols);
  db.prepare(`UPDATE agent_instances SET ${keys.map(k => `${k} = ?`).join(", ")} WHERE id = ? AND business_id = ?`).run(
    ...keys.map(k => cols[k] as any),
    inst.id,
    inst.businessId
  );
  recordAudit({ businessId: inst.businessId, traceId: (detail.traceId as string) || null, actor, action: `agent.${state}`, resource: inst.id, detail: { agentId: inst.agentId, from: inst.state, ...detail } });
}

/** Creates a draft of a pack agent for this business, or returns the existing one. */
export function createDraft(businessId: string, agentId: string, actor: string): AgentInstance {
  const def = agentById(agentId);
  if (!def) throw new AgentError("That agent does not exist.", 404);
  const existing = db.prepare("SELECT * FROM agent_instances WHERE business_id = ? AND agent_id = ? AND state != 'retired'").get(businessId, agentId);
  if (existing) return toInstance(existing);
  const now = new Date().toISOString();
  const id = `agt_${randomBytes(10).toString("hex")}`;
  db.prepare(
    `INSERT INTO agent_instances (id, business_id, agent_id, version, state, budget, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?)`
  ).run(id, businessId, agentId, AGENT_VERSION, JSON.stringify(DEFAULT_BUDGET), actor, now, now);
  recordAudit({ businessId, actor, action: "agent.draft", resource: id, detail: { agentId, version: AGENT_VERSION } });
  return getAgent(businessId, id)!;
}

export function cleanBudget(input: Partial<AgentBudget>): AgentBudget {
  const out = { ...DEFAULT_BUDGET };
  for (const key of Object.keys(LIMITS) as Array<keyof AgentBudget>) {
    if (input[key] === undefined) continue;
    const n = Number(input[key]);
    const [min, max] = LIMITS[key];
    if (!Number.isFinite(n) || n < min || n > max) {
      throw new AgentError(`${key} must be between ${min} and ${max}.`);
    }
    out[key] = key === "maxCostInr" ? Math.round(n * 100) / 100 : Math.round(n);
  }
  return out;
}

/** Which required systems are connected for this business. */
export function connectionStatus(businessId: string, requires: string[]): Array<{ key: string; label: string; connected: boolean }> {
  return requires.map(key => {
    let connected = false;
    try {
      if (key === "documents") {
        connected = Number((db.prepare("SELECT COUNT(*) AS n FROM company_documents WHERE business_id = ?").get(businessId) as any)?.n || 0) > 0;
      } else {
        connected = Boolean(db.prepare("SELECT id FROM integrations WHERE business_id = ? AND tool_key = ? AND status = 'connected'").get(businessId, key));
      }
    } catch {}
    return { key, label: REQUIREMENT_LABELS[key] || key, connected };
  });
}

function latestSuite(agentId: string, version: string, suite: string) {
  return db
    .prepare("SELECT * FROM agent_evaluations WHERE agent_id = ? AND version = ? AND suite = ? ORDER BY created_at DESC LIMIT 1")
    .get(agentId, version, suite) as any;
}

/** Runs the gates. Every one must pass for the agent to move to "approval required". */
export function runGates(inst: AgentInstance, walletBusinessId: string): GateResult[] {
  const def = agentById(inst.agentId);
  const gates: GateResult[] = [];

  const unknownTools = (def?.agent.tools || []).filter(t => !actionById(t));
  gates.push({
    id: "G0",
    label: "Configuration",
    passed: Boolean(def) && unknownTools.length === 0,
    detail: !def ? "Unknown agent." : unknownTools.length ? `Unknown actions: ${unknownTools.join(", ")}` : `Version ${inst.version}, ${def.agent.tools.length} allowed actions.`,
  });

  for (const [id, suite, label] of [
    ["G1", "golden", "Golden-set test"],
    ["G2", "redteam", "Red-team test"],
  ] as const) {
    const run = latestSuite(inst.agentId, inst.version, suite);
    gates.push({
      id,
      label,
      passed: Boolean(run?.passed),
      detail: run ? (run.passed ? `Passed${run.score !== null ? ` (score ${run.score})` : ""} on ${run.created_at.slice(0, 10)}.` : "The last run did not pass.") : `No ${label.toLowerCase()} has been run for version ${inst.version} yet.`,
    });
  }

  const conns = connectionStatus(inst.businessId, def?.agent.requires || []);
  const missing = conns.filter(c => !c.connected);
  gates.push({
    id: "connections",
    label: "Required connections",
    passed: missing.length === 0,
    detail: missing.length ? `Connect ${missing.map(m => m.label).join(", ")}.` : `All connected: ${conns.map(c => c.label).join(", ") || "none needed"}.`,
  });

  const w = walletBalance(walletBusinessId);
  gates.push({
    id: "G3",
    label: "Budget and credits",
    passed: w.available >= inst.budget.maxCostInr,
    detail:
      w.available >= inst.budget.maxCostInr
        ? `Up to ₹${inst.budget.maxCostInr} per task; ${w.available} credits available.`
        : `Each task can cost up to ₹${inst.budget.maxCostInr}, but only ${w.available} credits are available.`,
  });
  return gates;
}

export function evaluateAgent(businessId: string, walletBusinessId: string, id: string, actor: string): AgentInstance {
  const inst = getAgent(businessId, id);
  if (!inst) throw new AgentError("That agent was not found.", 404);
  if (!["draft", "paused", "approval_required"].includes(inst.state)) throw new AgentError(`An agent that is ${inst.state.replace("_", " ")} cannot be evaluated.`);
  const traceId = newTraceId();
  setState(inst, "evaluating", actor, {}, { traceId });
  const gates = runGates(inst, walletBusinessId);
  const passed = gates.every(g => g.passed);
  const evaluation = JSON.stringify({ at: new Date().toISOString(), gates, passed });
  setState({ ...inst, state: "evaluating" }, passed ? "approval_required" : "draft", actor, { evaluation, paused_reason: null }, { traceId, passed, failed: gates.filter(g => !g.passed).map(g => g.id) });
  return getAgent(businessId, id)!;
}

/** The owner switches it on. The gates are checked again, since connections or credits may have changed. */
export function activateAgent(businessId: string, walletBusinessId: string, id: string, actor: string): AgentInstance {
  const inst = getAgent(businessId, id);
  if (!inst) throw new AgentError("That agent was not found.", 404);
  if (inst.state !== "approval_required") throw new AgentError("Only an agent that passed evaluation can be activated. Evaluate it first.", 409);
  const gates = runGates(inst, walletBusinessId);
  if (!gates.every(g => g.passed)) {
    setState(inst, "draft", actor, { evaluation: JSON.stringify({ at: new Date().toISOString(), gates, passed: false }) }, { reason: "gates_changed" });
    throw new AgentError("Something changed since it was evaluated, so it is back in draft. See the checks.", 409);
  }
  setState(inst, "active", actor, { activated_by: actor, activated_at: new Date().toISOString(), paused_reason: null });
  return getAgent(businessId, id)!;
}

export function pauseAgent(businessId: string, id: string, actor: string, reason: string): AgentInstance {
  const inst = getAgent(businessId, id);
  if (!inst) throw new AgentError("That agent was not found.", 404);
  if (inst.state !== "active") throw new AgentError("Only an active agent can be paused.", 409);
  setState(inst, "paused", actor, { paused_reason: reason.slice(0, 300) }, { reason });
  return getAgent(businessId, id)!;
}

export function retireAgent(businessId: string, id: string, actor: string): AgentInstance {
  const inst = getAgent(businessId, id);
  if (!inst) throw new AgentError("That agent was not found.", 404);
  if (inst.state === "retired") return inst;
  setState(inst, "retired", actor);
  return getAgent(businessId, id)!;
}

/** New limits. An agent that was approved or active must be approved again (PRD: a material change resets it). */
export function updateBudget(businessId: string, id: string, input: Partial<AgentBudget>, actor: string): AgentInstance {
  const inst = getAgent(businessId, id);
  if (!inst) throw new AgentError("That agent was not found.", 404);
  if (inst.state === "retired") throw new AgentError("A retired agent cannot be changed.", 409);
  const budget = cleanBudget({ ...inst.budget, ...input });
  const needsReapproval = inst.state === "active" || inst.state === "paused" || inst.state === "approval_required";
  db.prepare("UPDATE agent_instances SET budget = ?, updated_at = ? WHERE id = ? AND business_id = ?").run(JSON.stringify(budget), new Date().toISOString(), id, businessId);
  recordAudit({ businessId, actor, action: "agent.budget_changed", resource: id, detail: { ...budget } });
  if (needsReapproval) setState({ ...inst, budget }, "draft", actor, { evaluation: null }, { reason: "budget_changed" });
  return getAgent(businessId, id)!;
}

/** Records a golden-set or red-team result for an agent version (used by the evaluation harness). */
export function recordEvaluation(agentId: string, version: string, suite: "golden" | "redteam", passed: boolean, score: number | null, detail: string) {
  db.prepare("INSERT INTO agent_evaluations (id, agent_id, version, suite, passed, score, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    `evl_${randomBytes(8).toString("hex")}`,
    agentId,
    version,
    suite,
    passed ? 1 : 0,
    score,
    detail.slice(0, 1000),
    new Date().toISOString()
  );
}

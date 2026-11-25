import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { recordAudit } from "./audit";

/**
 * Risk tiers and approvals (PRD 7.2, 13.2A). Enforced here, at the server, never by instructions to the AI.
 *
 *  T0  read-only            runs directly
 *  T1  internal, reversible runs directly (drafting, internal notes); sending a draft is a separate, re-tiered action
 *  T2  reversible external  needs an approval bound to this exact action, target and payload
 *  T3  high impact          refused in this release (PRD: not autonomous in MVP)
 *
 * An approval is single-use, expires, and is bound to the payload's hash: a changed payload needs a new approval.
 * If the approval check cannot run, T2 fails closed.
 */

export type RiskTier = "T0" | "T1" | "T2" | "T3";

export interface ActionDefinition {
  id: string;
  label: string;
  tier: RiskTier;
  /** Integration that must be connected for the action to run (by tool key) */
  requires?: string;
}

// Every action an agent can ask for. Anything not listed is refused.
export const ACTIONS: ActionDefinition[] = [
  { id: "brief.read", label: "Read the business brief", tier: "T0" },
  { id: "tasks.list", label: "List open tasks", tier: "T0" },
  { id: "crm.read_lead", label: "Read a lead in the CRM", tier: "T0", requires: "crm" },
  { id: "message.draft", label: "Draft a message for review", tier: "T1" },
  { id: "tasks.create_internal", label: "Create an internal BizzPal task", tier: "T1" },
  { id: "crm.update_lead", label: "Update a lead in the CRM", tier: "T2", requires: "crm" },
  { id: "calendar.book_slot", label: "Book a calendar slot", tier: "T2", requires: "calendar" },
  { id: "whatsapp.send_template", label: "Send an approved WhatsApp template", tier: "T2", requires: "whatsapp" },
  { id: "salespal.start_call", label: "Start an opted-in SalesPal call", tier: "T2", requires: "salespal" },
  { id: "payment.release", label: "Release a payment", tier: "T3" },
  { id: "contract.change_price", label: "Change a contract or price", tier: "T3" },
  { id: "data.delete", label: "Permanently delete records", tier: "T3" },
  { id: "permissions.change", label: "Change permissions", tier: "T3" },
];

export const actionById = (id: string) => ACTIONS.find(a => a.id === id) || null;

/** Stable hash of a payload: the same content always gives the same hash, whatever the key order. */
export function payloadHash(action: string, target: string, payload: unknown): string {
  const canonical = (v: any): any =>
    Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  return createHash("sha256").update(JSON.stringify({ action, target, payload: canonical(payload ?? null) })).digest("hex");
}

export type Decision =
  | { outcome: "allow"; tier: RiskTier }
  | { outcome: "approval_required"; tier: RiskTier; approvalId: string; expiresAt: string }
  | { outcome: "deny"; tier: RiskTier | null; reason: string };

const APPROVAL_TTL_MS = 30 * 60 * 1000;

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      trace_id TEXT,
      task_id TEXT,
      agent_instance_id TEXT,
      action TEXT NOT NULL,
      tier TEXT NOT NULL,
      target TEXT NOT NULL,
      payload_hash TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      decided_by TEXT,
      decided_at TEXT,
      used_at TEXT,
      nonce TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_approvals_business ON approvals (business_id, status, created_at);
  `);
} catch {}

/**
 * Decides whether an action may run now. For T2 it either consumes a matching approval or creates a request for one.
 */
export function authorize(req: {
  businessId: string;
  action: string;
  target: string;
  payload: unknown;
  actor: string;
  traceId: string;
  taskId?: string;
  agentInstanceId?: string;
  approvalId?: string | null;
}): Decision {
  const def = actionById(req.action);
  if (!def) {
    recordAudit({ businessId: req.businessId, traceId: req.traceId, actor: req.actor, action: "policy.deny", resource: req.action, detail: { reason: "unknown_action" } });
    return { outcome: "deny", tier: null, reason: "This action is not allowed." };
  }
  if (def.tier === "T3") {
    recordAudit({ businessId: req.businessId, traceId: req.traceId, actor: req.actor, action: "policy.deny", resource: req.action, detail: { tier: "T3" } });
    return { outcome: "deny", tier: "T3", reason: "High-impact actions (money, contracts, deletion, permissions) are never done by an agent. A person must do them." };
  }
  if (def.tier === "T0" || def.tier === "T1") {
    recordAudit({ businessId: req.businessId, traceId: req.traceId, actor: req.actor, action: "policy.allow", resource: req.action, detail: { tier: def.tier, target: req.target } });
    return { outcome: "allow", tier: def.tier };
  }

  // T2: needs an approval for exactly this
  const hash = payloadHash(req.action, req.target, req.payload);
  if (req.approvalId) {
    const used = consumeApproval(req.businessId, req.approvalId, req.action, req.target, hash, req.actor, req.traceId);
    if (used === true) return { outcome: "allow", tier: "T2" };
    return { outcome: "deny", tier: "T2", reason: used };
  }
  const now = Date.now();
  const id = `apr_${randomBytes(10).toString("hex")}`;
  const expiresAt = new Date(now + APPROVAL_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO approvals (id, business_id, trace_id, task_id, agent_instance_id, action, tier, target, payload_hash, summary, status, requested_by, nonce, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'T2', ?, ?, ?, 'pending', ?, ?, ?, ?)`
  ).run(
    id,
    req.businessId,
    req.traceId,
    req.taskId || null,
    req.agentInstanceId || null,
    req.action,
    req.target.slice(0, 200),
    hash,
    `${def.label}: ${req.target}`.slice(0, 300),
    req.actor,
    randomBytes(8).toString("hex"),
    expiresAt,
    new Date(now).toISOString()
  );
  recordAudit({ businessId: req.businessId, traceId: req.traceId, actor: req.actor, action: "approval.requested", resource: id, detail: { action: req.action, target: req.target, tier: "T2" } });
  return { outcome: "approval_required", tier: "T2", approvalId: id, expiresAt };
}

/** Returns true when the approval matched and is now used up, otherwise the reason it cannot be used. */
function consumeApproval(businessId: string, id: string, action: string, target: string, hash: string, actor: string, traceId: string): true | string {
  const a = db.prepare("SELECT * FROM approvals WHERE id = ? AND business_id = ?").get(id, businessId) as any;
  const deny = (reason: string, code: string) => {
    recordAudit({ businessId, traceId, actor, action: "approval.rejected_use", resource: id, detail: { reason: code } });
    return reason;
  };
  if (!a) return deny("That approval was not found.", "not_found");
  if (a.status === "used") return deny("That approval has already been used. Each approval works once.", "replay");
  if (a.status !== "approved") return deny(a.status === "rejected" ? "This action was rejected." : "This action has not been approved yet.", a.status);
  if (new Date(a.expires_at).getTime() < Date.now()) return deny("That approval has expired. Please ask again.", "expired");
  if (a.action !== action || a.target !== target.slice(0, 200) || a.payload_hash !== hash) {
    return deny("The action changed after it was approved, so it needs a new approval.", "payload_changed");
  }
  const res: any = db.prepare("UPDATE approvals SET status = 'used', used_at = ? WHERE id = ? AND status = 'approved'").run(new Date().toISOString(), id);
  if (!res?.changes) return deny("That approval has already been used.", "replay");
  recordAudit({ businessId, traceId: a.trace_id || traceId, actor, action: "approval.used", resource: id, detail: { action } });
  return true;
}

/** The owner's decision on a pending approval. */
export function decideApproval(businessId: string, id: string, decision: "approve" | "reject", actor: string): { ok: true } | { ok: false; reason: string } {
  const a = db.prepare("SELECT * FROM approvals WHERE id = ? AND business_id = ?").get(id, businessId) as any;
  if (!a) return { ok: false, reason: "That approval was not found." };
  if (a.status !== "pending") return { ok: false, reason: "This has already been decided." };
  if (new Date(a.expires_at).getTime() < Date.now()) {
    db.prepare("UPDATE approvals SET status = 'expired' WHERE id = ?").run(id);
    return { ok: false, reason: "This request has expired." };
  }
  const status = decision === "approve" ? "approved" : "rejected";
  db.prepare("UPDATE approvals SET status = ?, decided_by = ?, decided_at = ? WHERE id = ? AND status = 'pending'").run(status, actor, new Date().toISOString(), id);
  recordAudit({ businessId, traceId: a.trace_id, actor, action: `approval.${status}`, resource: id, detail: { action: a.action, target: a.target } });
  return { ok: true };
}

export function listApprovals(businessId: string, status?: string) {
  const rows = (status
    ? db.prepare("SELECT * FROM approvals WHERE business_id = ? AND status = ? ORDER BY created_at DESC LIMIT 100").all(businessId, status)
    : db.prepare("SELECT * FROM approvals WHERE business_id = ? ORDER BY created_at DESC LIMIT 100").all(businessId)) as any[];
  return rows.map(a => ({
    id: a.id,
    action: a.action,
    tier: a.tier,
    target: a.target,
    summary: a.summary,
    status: a.status !== "pending" || new Date(a.expires_at).getTime() >= Date.now() ? a.status : "expired",
    traceId: a.trace_id,
    taskId: a.task_id,
    agentInstanceId: a.agent_instance_id,
    requestedBy: a.requested_by,
    decidedBy: a.decided_by,
    expiresAt: a.expires_at,
    createdAt: a.created_at,
  }));
}

import { createHash, randomBytes } from "crypto";
import { db, getPlatformConfig } from "@/lib/db";
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
  { id: "email.send", label: "Send an email", tier: "T2", requires: "email" },
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

/** How long a request waits for the owner. Platform config "agent_approval_ttl_hours", 1 to 168 hours, default 24. */
export function approvalTtlMs(): number {
  const h = Number(getPlatformConfig<number>("agent_approval_ttl_hours", 24));
  return Math.min(168, Math.max(1, Number.isFinite(h) ? h : 24)) * 60 * 60 * 1000;
}

/** What the owner sees before deciding: a title and labelled lines, built from the exact payload. */
export interface ApprovalPreview {
  title: string;
  lines: Array<{ label: string; value: string }>;
  /** Payload fields the owner may edit before approving */
  editable: string[];
}

export function previewOf(action: string, target: string, payload: any): ApprovalPreview {
  const p = payload && typeof payload === "object" ? payload : {};
  const text = (v: unknown, max = 4000) => String(v ?? "").slice(0, max);
  if (action === "email.send") {
    return {
      title: `Send an email to ${text(p.to, 200)}`,
      lines: [
        { label: "To", value: text(p.to, 200) },
        { label: "Subject", value: text(p.subject, 300) },
        { label: "Message", value: text(p.body) },
      ],
      editable: ["subject", "body"],
    };
  }
  const def = actionById(action);
  return {
    title: `${def?.label || action}${target && target !== "business" ? `: ${target}` : ""}`,
    lines: Object.entries(p)
      .slice(0, 12)
      .map(([k, v]) => ({ label: k, value: typeof v === "string" ? text(v) : text(JSON.stringify(v)) })),
    editable: [],
  };
}

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
// The exact action to run (so the owner can see it and the job can carry on after approval), the version the agent
// first proposed (to learn from the owner's edits), the owner's note, and when the owner was told about it.
for (const col of ["payload TEXT", "original_payload TEXT", "decision_note TEXT", "notified_at TEXT"]) {
  try {
    db.exec(`ALTER TABLE approvals ADD COLUMN ${col}`);
  } catch {}
}

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
  const expiresAt = new Date(now + approvalTtlMs()).toISOString();
  const payloadJson = JSON.stringify(req.payload ?? null).slice(0, 20000);
  db.prepare(
    `INSERT INTO approvals (id, business_id, trace_id, task_id, agent_instance_id, action, tier, target, payload_hash, summary, status, requested_by, nonce, expires_at, created_at, payload, original_payload)
     VALUES (?, ?, ?, ?, ?, ?, 'T2', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
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
    new Date(now).toISOString(),
    payloadJson,
    payloadJson
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

/**
 * The owner's decision on a pending approval. When approving, the owner may first edit the fields the preview marks as
 * editable; the approval is then bound to the edited version, which is what runs.
 */
export function decideApproval(
  businessId: string,
  id: string,
  decision: "approve" | "reject",
  actor: string,
  opts: { note?: string; edits?: Record<string, unknown> } = {}
): { ok: true; edited: boolean } | { ok: false; reason: string } {
  const a = db.prepare("SELECT * FROM approvals WHERE id = ? AND business_id = ?").get(id, businessId) as any;
  if (!a) return { ok: false, reason: "That approval was not found." };
  if (a.status !== "pending") return { ok: false, reason: "This has already been decided." };
  if (new Date(a.expires_at).getTime() < Date.now()) {
    db.prepare("UPDATE approvals SET status = 'expired' WHERE id = ?").run(id);
    return { ok: false, reason: "This request has expired." };
  }
  const note = String(opts.note || "").trim().slice(0, 500) || null;
  let edited = false;
  if (decision === "approve" && opts.edits && typeof opts.edits === "object") {
    let payload: any = null;
    try {
      payload = JSON.parse(a.payload || "null");
    } catch {}
    if (!payload || typeof payload !== "object") return { ok: false, reason: "This request cannot be edited." };
    const allowed = previewOf(a.action, a.target, payload).editable;
    for (const [k, v] of Object.entries(opts.edits)) {
      if (!allowed.includes(k)) return { ok: false, reason: `"${k}" cannot be changed here.` };
      // Same clean-up the email check uses, so an approved edit always matches when it runs
      const value = k === "body" ? String(v ?? "").trim().slice(0, 10000) : String(v ?? "").replace(/[\r\n]+/g, " ").trim().slice(0, 200);
      if (!value) return { ok: false, reason: `"${k}" cannot be empty.` };
      if (value !== String(payload[k] ?? "")) {
        payload[k] = value;
        edited = true;
      }
    }
    if (edited) {
      db.prepare("UPDATE approvals SET payload = ?, payload_hash = ? WHERE id = ? AND status = 'pending'").run(
        JSON.stringify(payload),
        payloadHash(a.action, a.target, payload),
        id
      );
    }
  }
  const status = decision === "approve" ? "approved" : "rejected";
  db.prepare("UPDATE approvals SET status = ?, decided_by = ?, decided_at = ?, decision_note = ? WHERE id = ? AND status = 'pending'").run(
    status,
    actor,
    new Date().toISOString(),
    note,
    id
  );
  recordAudit({ businessId, traceId: a.trace_id, actor, action: `approval.${status}`, resource: id, detail: { action: a.action, target: a.target, edited } });
  return { ok: true, edited };
}

/** The exact payload an approval covers (after any edits by the owner). */
export function approvalPayload(businessId: string, id: string): unknown {
  const a = db.prepare("SELECT payload FROM approvals WHERE id = ? AND business_id = ?").get(id, businessId) as any;
  try {
    return a?.payload ? JSON.parse(a.payload) : null;
  } catch {
    return null;
  }
}

/** Number of requests waiting for the owner right now. */
export function pendingApprovalCount(businessId: string): number {
  const r = db.prepare("SELECT COUNT(*) AS n FROM approvals WHERE business_id = ? AND status = 'pending' AND expires_at > ?").get(businessId, new Date().toISOString()) as any;
  return Number(r?.n || 0);
}

export function listApprovals(businessId: string, status?: string) {
  const rows = (status
    ? db.prepare("SELECT * FROM approvals WHERE business_id = ? AND status = ? ORDER BY created_at DESC LIMIT 100").all(businessId, status)
    : db.prepare("SELECT * FROM approvals WHERE business_id = ? ORDER BY created_at DESC LIMIT 100").all(businessId)) as any[];
  return rows.map(a => {
    let payload: any = null;
    try {
      payload = a.payload ? JSON.parse(a.payload) : null;
    } catch {}
    return {
    id: a.id,
    action: a.action,
    actionLabel: actionById(a.action)?.label || a.action,
    tier: a.tier,
    target: a.target,
    summary: a.summary,
    preview: payload ? previewOf(a.action, a.target, payload) : null,
    note: a.decision_note || null,
    decidedAt: a.decided_at || null,
    status: a.status !== "pending" || new Date(a.expires_at).getTime() >= Date.now() ? a.status : "expired",
    traceId: a.trace_id,
    taskId: a.task_id,
    agentInstanceId: a.agent_instance_id,
    requestedBy: a.requested_by,
    decidedBy: a.decided_by,
    expiresAt: a.expires_at,
    createdAt: a.created_at,
    };
  });
}

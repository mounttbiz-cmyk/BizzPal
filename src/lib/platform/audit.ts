import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

/**
 * Tracing and the audit trail (PRD sections 12 and 13).
 *
 * - A trace id is created when a piece of work starts (an agent task, an X-Ray...) and is carried by every step,
 *   usage record, approval and audit event that belongs to it, so the whole story can be followed later.
 * - Audit events are append-only and chained per business: each event stores the hash of the one before it, so an
 *   edited or deleted event breaks the chain and verifyAuditChain() reports where.
 */

export const newTraceId = () => `trc_${randomBytes(12).toString("hex")}`;
export const newSpanId = () => `spn_${randomBytes(6).toString("hex")}`;

export interface AuditEvent {
  id: string;
  businessId: string;
  traceId: string | null;
  actor: string;
  action: string;
  resource: string;
  detail: Record<string, unknown>;
  createdAt: string;
  hash: string;
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_events (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      business_id TEXT NOT NULL,
      trace_id TEXT,
      actor TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      hash TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_business ON audit_events (business_id, seq);
    CREATE INDEX IF NOT EXISTS idx_audit_trace ON audit_events (trace_id);
  `);
} catch {}

const GENESIS = "genesis";

function digest(prev: string, e: { id: string; businessId: string; traceId: string | null; actor: string; action: string; resource: string; detail: string; createdAt: string }) {
  return createHash("sha256")
    .update([prev, e.id, e.businessId, e.traceId || "", e.actor, e.action, e.resource, e.detail, e.createdAt].join("\u001f"))
    .digest("hex");
}

/** Keeps secrets and message bodies out of the trail (PRD 12: redact by default). */
function redact(detail: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(detail || {})) {
    if (/pin|password|secret|token|api_?key|otp|cvv|card/i.test(k)) out[k] = "[redacted]";
    else if (typeof v === "string") out[k] = v.length > 300 ? `${v.slice(0, 300)}…` : v;
    else out[k] = v;
  }
  return out;
}

/** Adds an event to the business's trail. Runs synchronously, so the chain can never fork. */
export function recordAudit(e: { businessId: string; traceId?: string | null; actor: string; action: string; resource: string; detail?: Record<string, unknown> }): AuditEvent {
  const prevRow = db.prepare("SELECT hash FROM audit_events WHERE business_id = ? ORDER BY seq DESC LIMIT 1").get(e.businessId) as any;
  const prev = prevRow?.hash || GENESIS;
  const event = {
    id: `aud_${randomBytes(10).toString("hex")}`,
    businessId: e.businessId,
    traceId: e.traceId || null,
    actor: String(e.actor || "system").slice(0, 200),
    action: String(e.action).slice(0, 80),
    resource: String(e.resource || "").slice(0, 200),
    detail: JSON.stringify(redact(e.detail || {})),
    createdAt: new Date().toISOString(),
  };
  const hash = digest(prev, event);
  db.prepare(
    `INSERT INTO audit_events (id, business_id, trace_id, actor, action, resource, detail, created_at, prev_hash, hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(event.id, event.businessId, event.traceId, event.actor, event.action, event.resource, event.detail, event.createdAt, prev, hash);
  return { ...event, detail: JSON.parse(event.detail), hash };
}

export function listAudit(businessId: string, opts: { limit?: number; traceId?: string } = {}): AuditEvent[] {
  const limit = Math.min(Math.max(opts.limit || 100, 1), 500);
  const rows = (opts.traceId
    ? db.prepare("SELECT * FROM audit_events WHERE business_id = ? AND trace_id = ? ORDER BY seq ASC LIMIT ?").all(businessId, opts.traceId, limit)
    : db.prepare("SELECT * FROM audit_events WHERE business_id = ? ORDER BY seq DESC LIMIT ?").all(businessId, limit)) as any[];
  return rows.map(r => ({
    id: r.id,
    businessId: r.business_id,
    traceId: r.trace_id,
    actor: r.actor,
    action: r.action,
    resource: r.resource,
    detail: (() => {
      try {
        return JSON.parse(r.detail);
      } catch {
        return {};
      }
    })(),
    createdAt: r.created_at,
    hash: r.hash,
  }));
}

/** Recomputes the whole chain. Any edited, removed or re-ordered event is reported. */
export function verifyAuditChain(businessId: string): { ok: boolean; checked: number; brokenAt?: string } {
  const rows = db.prepare("SELECT * FROM audit_events WHERE business_id = ? ORDER BY seq ASC").all(businessId) as any[];
  let prev = GENESIS;
  for (const r of rows) {
    const expected = digest(prev, {
      id: r.id,
      businessId: r.business_id,
      traceId: r.trace_id,
      actor: r.actor,
      action: r.action,
      resource: r.resource,
      detail: r.detail,
      createdAt: r.created_at,
    });
    if (r.prev_hash !== prev || r.hash !== expected) return { ok: false, checked: rows.length, brokenAt: r.id };
    prev = r.hash;
  }
  return { ok: true, checked: rows.length };
}

import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";

/**
 * Leads and enquiries from the business's own sources: a Google Sheet of leads, and new emails in the connected email
 * account. Each source remembers what it has already seen, so a lead is added once, and only things that arrive after
 * the source was connected can start agents (connecting a sheet with 500 rows never starts 500 jobs).
 */

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lead_sources (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      config TEXT NOT NULL DEFAULT '{}',
      state TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_synced_at TEXT,
      last_error TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_lead_sources_business ON lead_sources (business_id);
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      external_key TEXT NOT NULL,
      name TEXT,
      email TEXT,
      phone TEXT,
      company TEXT,
      subject TEXT,
      message TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      received_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (business_id, source_id, external_key)
    );
    CREATE INDEX IF NOT EXISTS idx_leads_business ON leads (business_id, received_at);
  `);
} catch {}

export type SourceKind = "google_sheet" | "email_inbox";
export type LeadKind = "lead" | "enquiry";

export interface LeadSource {
  id: string;
  kind: SourceKind;
  label: string;
  config: any;
  state: any;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface Lead {
  id: string;
  sourceId: string;
  kind: LeadKind;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string | null;
  status: "new" | "done";
  receivedAt: string;
}

const json = (s: string, fallback: any = {}) => {
  try {
    return JSON.parse(s || "");
  } catch {
    return fallback;
  }
};

const toSource = (r: any): LeadSource => ({
  id: r.id,
  kind: r.kind,
  label: r.label,
  config: json(r.config),
  state: json(r.state),
  enabled: Boolean(r.enabled),
  lastSyncedAt: r.last_synced_at,
  lastError: r.last_error,
  createdAt: r.created_at,
});

const toLead = (r: any): Lead => ({
  id: r.id,
  sourceId: r.source_id,
  kind: r.kind,
  name: r.name,
  email: r.email,
  phone: r.phone,
  company: r.company,
  subject: r.subject,
  message: r.message,
  status: r.status === "done" ? "done" : "new",
  receivedAt: r.received_at,
});

export function listSources(businessId: string): LeadSource[] {
  return (db.prepare("SELECT * FROM lead_sources WHERE business_id = ? ORDER BY created_at").all(businessId) as any[]).map(toSource);
}

export function getSource(businessId: string, id: string): LeadSource | null {
  const r = db.prepare("SELECT * FROM lead_sources WHERE id = ? AND business_id = ?").get(id, businessId);
  return r ? toSource(r) : null;
}

export function findSource(businessId: string, kind: SourceKind): LeadSource | null {
  const r = db.prepare("SELECT * FROM lead_sources WHERE business_id = ? AND kind = ? ORDER BY created_at DESC LIMIT 1").get(businessId, kind);
  return r ? toSource(r) : null;
}

export function createSource(businessId: string, kind: SourceKind, label: string, config: any, actor: string): LeadSource {
  const id = `src_${randomBytes(8).toString("hex")}`;
  db.prepare("INSERT INTO lead_sources (id, business_id, kind, label, config, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    id,
    businessId,
    kind,
    label.slice(0, 200),
    JSON.stringify(config || {}),
    actor,
    new Date().toISOString()
  );
  return getSource(businessId, id)!;
}

export function updateSource(businessId: string, id: string, patch: { config?: any; state?: any; enabled?: boolean; lastSyncedAt?: string; lastError?: string | null; label?: string }) {
  const cur = getSource(businessId, id);
  if (!cur) return null;
  db.prepare("UPDATE lead_sources SET config = ?, state = ?, enabled = ?, last_synced_at = ?, last_error = ?, label = ? WHERE id = ?").run(
    JSON.stringify(patch.config ?? cur.config),
    JSON.stringify(patch.state ?? cur.state),
    (patch.enabled ?? cur.enabled) ? 1 : 0,
    patch.lastSyncedAt ?? cur.lastSyncedAt,
    patch.lastError === undefined ? cur.lastError : patch.lastError,
    (patch.label ?? cur.label).slice(0, 200),
    id
  );
  return getSource(businessId, id);
}

/** Removes the source and the leads it brought in. */
export function deleteSource(businessId: string, id: string): boolean {
  const r: any = db.prepare("DELETE FROM lead_sources WHERE id = ? AND business_id = ?").run(id, businessId);
  if (!r?.changes) return false;
  db.prepare("DELETE FROM leads WHERE source_id = ? AND business_id = ?").run(id, businessId);
  return true;
}

export function listLeads(businessId: string, opts: { kind?: LeadKind; status?: "new" | "done"; q?: string; limit?: number } = {}): Lead[] {
  const where = ["business_id = ?"];
  const args: unknown[] = [businessId];
  if (opts.kind) {
    where.push("kind = ?");
    args.push(opts.kind);
  }
  if (opts.status) {
    where.push("status = ?");
    args.push(opts.status);
  }
  if (opts.q) {
    where.push("(LOWER(COALESCE(name,'')) LIKE ? OR LOWER(COALESCE(email,'')) LIKE ? OR LOWER(COALESCE(company,'')) LIKE ? OR LOWER(COALESCE(subject,'')) LIKE ?)");
    const like = `%${opts.q.toLowerCase()}%`;
    args.push(like, like, like, like);
  }
  return (db.prepare(`SELECT * FROM leads WHERE ${where.join(" AND ")} ORDER BY received_at DESC LIMIT ?`).all(...args, Math.min(opts.limit || 200, 1000)) as any[]).map(toLead);
}

export function setLeadStatus(businessId: string, id: string, status: "new" | "done"): boolean {
  const r: any = db.prepare("UPDATE leads SET status = ? WHERE id = ? AND business_id = ?").run(status, id, businessId);
  return Boolean(r?.changes);
}

export function countNew(businessId: string): { leads: number; enquiries: number } {
  const rows = db.prepare("SELECT kind, COUNT(*) AS n FROM leads WHERE business_id = ? AND status = 'new' GROUP BY kind").all(businessId) as any[];
  return { leads: Number(rows.find(r => r.kind === "lead")?.n || 0), enquiries: Number(rows.find(r => r.kind === "enquiry")?.n || 0) };
}

/** Adds a lead or enquiry once. Returns the new lead, or null when it was already there. */
export function addLead(
  businessId: string,
  source: LeadSource,
  kind: LeadKind,
  externalKey: string,
  fields: { name?: string; email?: string; phone?: string; company?: string; subject?: string; message?: string; receivedAt?: string }
): Lead | null {
  const id = `lead_${randomBytes(9).toString("hex")}`;
  const clip = (v: unknown, n: number) => {
    const s = String(v ?? "").replace(/\s+/g, " ").trim();
    return s ? s.slice(0, n) : null;
  };
  const now = new Date().toISOString();
  const key = createHash("sha256").update(externalKey).digest("hex");
  const r: any = db
    .prepare(
      `INSERT OR IGNORE INTO leads (id, business_id, source_id, kind, external_key, name, email, phone, company, subject, message, received_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      businessId,
      source.id,
      kind,
      key,
      clip(fields.name, 160),
      clip(fields.email, 200)?.toLowerCase() ?? null,
      clip(fields.phone, 40),
      clip(fields.company, 200),
      clip(fields.subject, 300),
      String(fields.message ?? "").trim().slice(0, 4000) || null,
      fields.receivedAt || now,
      now
    );
  if (!r?.changes) return null;
  return toLead(db.prepare("SELECT * FROM leads WHERE id = ?").get(id));
}

/** What an agent is told about a new lead or enquiry. Never more than the person sent. */
export function describeLead(l: Lead): string {
  return [
    l.kind === "enquiry" ? "A new enquiry arrived by email." : "A new lead was added to the lead sheet.",
    l.name ? `Name: ${l.name}` : "",
    l.company ? `Company: ${l.company}` : "",
    l.email ? `Email: ${l.email}` : "",
    l.phone ? `Phone: ${l.phone}` : "",
    l.subject ? `Subject: ${l.subject}` : "",
    l.message ? `Message: ${l.message.slice(0, 1200)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Server-side record of what has actually been verified. The browser can never write to this
 * directly: rows are created only by the verify API routes after a real check passes, and the
 * registration endpoint reads "verified" from here, never from the client.
 */

export type VerificationKind = "gstin" | "domain" | "bank";
export type VerificationStatus = "pending" | "verified" | "unverified" | "failed";

export interface VerificationRow {
  id: string;
  email: string;
  kind: VerificationKind;
  subject: string;
  status: VerificationStatus;
  token: string | null;
  evidence: any;
  created_at: string;
  verified_at: string | null;
}

export type VerificationLevel = "unverified" | "registry_verified" | "registry_and_website_verified";

let schemaReady = false;

const BUSINESS_COLUMNS: [string, string][] = [
  ["legal_name", "TEXT"],
  ["trade_name", "TEXT"],
  ["gstin", "TEXT"],
  ["pan", "TEXT"],
  ["registered_state", "TEXT"],
  ["registered_address", "TEXT"],
  ["constitution", "TEXT"],
  ["gst_status", "TEXT"],
  ["gst_registration_date", "TEXT"],
  ["entity_type", "TEXT"],
  ["verification_level", "TEXT DEFAULT 'unverified'"],
  ["verified_at", "TEXT"],
  ["financials_source", "TEXT DEFAULT 'none'"],
];

export function ensureVerificationSchema(): void {
  if (schemaReady) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_verifications (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      kind TEXT NOT NULL,
      subject TEXT NOT NULL,
      status TEXT NOT NULL,
      token TEXT,
      evidence TEXT,
      created_at TEXT NOT NULL,
      verified_at TEXT,
      UNIQUE(email, kind, subject)
    );
    CREATE TABLE IF NOT EXISTS payment_sources (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      provider TEXT NOT NULL,
      status TEXT NOT NULL,
      cred_enc TEXT NOT NULL,
      label TEXT,
      snapshot TEXT,
      connected_at TEXT NOT NULL,
      synced_at TEXT,
      UNIQUE(email, provider)
    );
    CREATE TABLE IF NOT EXISTS team_invites (
      id TEXT PRIMARY KEY,
      owner_email TEXT NOT NULL,
      invite_email TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      verified_at TEXT,
      verified_via TEXT,
      UNIQUE(owner_email, invite_email)
    );
  `);
  let existing = new Set<string>();
  try {
    existing = new Set((db.prepare("PRAGMA table_info(businesses)").all() as any[]).map((c) => c.name));
  } catch {}
  for (const [name, type] of BUSINESS_COLUMNS) {
    if (!existing.has(name)) {
      try { db.exec(`ALTER TABLE businesses ADD COLUMN ${name} ${type}`); } catch {}
    }
  }
  schemaReady = true;
}

function hydrate(row: any): VerificationRow | null {
  if (!row) return null;
  let evidence: any = null;
  try { evidence = row.evidence ? JSON.parse(row.evidence) : null; } catch {}
  return { ...row, evidence };
}

export const cleanEmail = (e: string) => (e || "").trim().toLowerCase();

export function getVerification(email: string, kind: VerificationKind, subject: string): VerificationRow | null {
  ensureVerificationSchema();
  return hydrate(
    db.prepare("SELECT * FROM business_verifications WHERE email = ? AND kind = ? AND subject = ?").get(cleanEmail(email), kind, subject)
  );
}

export function listVerifications(email: string): VerificationRow[] {
  ensureVerificationSchema();
  const rows = db.prepare("SELECT * FROM business_verifications WHERE email = ? ORDER BY created_at DESC").all(cleanEmail(email)) as any[];
  return rows.map((r) => hydrate(r)!).filter(Boolean);
}

export function saveVerification(
  email: string,
  kind: VerificationKind,
  subject: string,
  patch: { status: VerificationStatus; token?: string | null; evidence?: any }
): void {
  ensureVerificationSchema();
  const now = new Date().toISOString();
  const e = cleanEmail(email);
  const existing = getVerification(e, kind, subject);
  const evidence = patch.evidence !== undefined ? JSON.stringify(patch.evidence) : existing ? JSON.stringify(existing.evidence) : null;
  const verifiedAt = patch.status === "verified" ? now : null;
  if (existing) {
    db.prepare(
      "UPDATE business_verifications SET status = ?, token = ?, evidence = ?, verified_at = ? WHERE id = ?"
    ).run(patch.status, patch.token !== undefined ? patch.token : existing.token, evidence, verifiedAt, existing.id);
  } else {
    db.prepare(
      "INSERT INTO business_verifications (id, email, kind, subject, status, token, evidence, created_at, verified_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(randomUUID(), e, kind, subject, patch.status, patch.token ?? null, evidence, now, verifiedAt);
  }
}

/**
 * What this account has really proven, computed from server records only.
 *   registry_verified              = the GST registry confirmed the GSTIN exists and is active
 *   registry_and_website_verified  = the above AND the founder controls a company website
 * These are two independent facts. Neither alone proves the person IS that GSTIN's business
 * (GSTINs are public); that link needs a bank-account name match, which is a later phase.
 */
export function computeLevel(email: string): {
  level: VerificationLevel;
  gstin: VerificationRow | null;
  domain: VerificationRow | null;
  bank: VerificationRow | null;
} {
  const rows = listVerifications(email);
  const gstin = rows.find((r) => r.kind === "gstin" && r.status === "verified") || null;
  const domain = rows.find((r) => r.kind === "domain" && r.status === "verified") || null;
  const bank = rows.find((r) => r.kind === "bank" && r.status === "verified") || null;
  const level: VerificationLevel = gstin && domain ? "registry_and_website_verified" : gstin ? "registry_verified" : "unverified";
  return { level, gstin, domain, bank };
}

/** Sliding-window limiter for endpoints that cost money or hit the network. */
const hits = new Map<string, number[]>();
export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { hits.set(key, recent); return true; }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

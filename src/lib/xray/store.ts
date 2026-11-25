import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { aiTierFor } from "@/lib/ai/providers";
import { briefForAdvisors } from "@/lib/brief";
import { newTraceId, recordAudit } from "@/lib/platform/audit";
import { crawlWebsite, CrawlError, type CrawlSnapshot } from "./crawl";
import { analyseWebsite, AnalysisError, XRAY_PROMPT_VERSION, XRAY_SCHEMA_VERSION, type XRayResult } from "./analyze";

/**
 * Business X-Rays are kept per business, one row per run, with the snapshot that was read and the versions used,
 * so a report can be shown again and compared with later ones. A run reads the website and analyses it in the
 * background; the page checks on its progress.
 */

export type XRayStatus = "reading" | "analysing" | "done" | "failed";

export interface XRayRecord {
  id: string;
  businessId: string;
  url: string;
  status: XRayStatus;
  progress: { read: number; total: number } | null;
  error: string | null;
  schemaVersion: string;
  promptVersion: string;
  snapshot: Omit<CrawlSnapshot, "pages"> & { pages: Array<Omit<CrawlSnapshot["pages"][number], "text">> } | null;
  result: XRayResult | null;
  createdBy: string;
  createdAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}

// A run that has said nothing for this long has stopped (for example, the server restarted)
const STALE_MS = 4 * 60 * 1000;

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_xrays (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      url TEXT NOT NULL,
      status TEXT NOT NULL,
      progress TEXT,
      error TEXT,
      schema_version TEXT NOT NULL,
      prompt_version TEXT NOT NULL,
      snapshot TEXT,
      result TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finished_at TEXT,
      duration_ms INTEGER,
      trace_id TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_business_xrays_business ON business_xrays (business_id, created_at DESC);
  `);
} catch {}
// Existing databases: add the trace column
try {
  db.exec("ALTER TABLE business_xrays ADD COLUMN trace_id TEXT");
} catch {}

const parse = (s: unknown) => {
  if (typeof s !== "string" || !s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

function toRecord(row: any): XRayRecord {
  let status = row.status as XRayStatus;
  let error = row.error || null;
  if ((status === "reading" || status === "analysing") && Date.now() - new Date(row.updated_at).getTime() > STALE_MS) {
    status = "failed";
    error = "This X-Ray stopped before it finished. Please run it again.";
  }
  return {
    id: row.id,
    businessId: row.business_id,
    url: row.url,
    status,
    progress: parse(row.progress),
    error,
    schemaVersion: row.schema_version,
    promptVersion: row.prompt_version,
    snapshot: parse(row.snapshot),
    result: parse(row.result),
    createdBy: row.created_by,
    createdAt: row.created_at,
    finishedAt: row.finished_at || null,
    durationMs: row.duration_ms ?? null,
  };
}

export function getXRay(businessId: string, id: string): XRayRecord | null {
  const row = db.prepare("SELECT * FROM business_xrays WHERE id = ? AND business_id = ?").get(id, businessId);
  return row ? toRecord(row) : null;
}

export function listXRays(businessId: string, limit = 20): Array<Pick<XRayRecord, "id" | "url" | "status" | "createdAt" | "durationMs">> {
  const rows = db
    .prepare("SELECT * FROM business_xrays WHERE business_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(businessId, limit) as any[];
  return rows.map(r => {
    const rec = toRecord(r);
    return { id: rec.id, url: rec.url, status: rec.status, createdAt: rec.createdAt, durationMs: rec.durationMs };
  });
}

function update(id: string, fields: Record<string, unknown>) {
  const keys = Object.keys(fields);
  db.prepare(`UPDATE business_xrays SET ${keys.map(k => `${k} = ?`).join(", ")}, updated_at = ? WHERE id = ?`).run(
    ...keys.map(k => fields[k] as any),
    new Date().toISOString(),
    id
  );
}

/** Starts an X-Ray, or returns the one already running for this business. */
export function startXRay(opts: { businessId: string; businessName: string; url: string; email: string }): { id: string; alreadyRunning: boolean } {
  const running = db
    .prepare("SELECT * FROM business_xrays WHERE business_id = ? AND status IN ('reading', 'analysing') ORDER BY created_at DESC LIMIT 1")
    .get(opts.businessId) as any;
  if (running && toRecord(running).status !== "failed") return { id: running.id, alreadyRunning: true };

  const id = `xray_${randomBytes(10).toString("hex")}`;
  const traceId = newTraceId();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO business_xrays (id, business_id, url, status, progress, schema_version, prompt_version, created_by, created_at, updated_at)
     VALUES (?, ?, ?, 'reading', ?, ?, ?, ?, ?, ?)`
  ).run(id, opts.businessId, opts.url, JSON.stringify({ read: 0, total: 1 }), XRAY_SCHEMA_VERSION, XRAY_PROMPT_VERSION, opts.email, now, now);
  update(id, { trace_id: traceId });
  recordAudit({ businessId: opts.businessId, traceId, actor: opts.email, action: "xray.started", resource: id, detail: { url: opts.url } });

  // The work continues after the request has answered; the page checks its progress
  void run(id, { ...opts, traceId });
  return { id, alreadyRunning: false };
}

async function run(id: string, opts: { businessId: string; businessName: string; url: string; email: string; traceId: string }) {
  const started = Date.now();
  try {
    const snapshot = await crawlWebsite(opts.url, (read, total) => update(id, { progress: JSON.stringify({ read, total }) }));
    // The stored snapshot keeps what was read and when, without the full page text
    const storedSnapshot = { ...snapshot, pages: snapshot.pages.map(({ text, ...p }) => p) };
    update(id, { status: "analysing", snapshot: JSON.stringify(storedSnapshot), url: snapshot.finalUrl });

    const owner = briefForAdvisors(opts.businessId).lines;
    const result = await analyseWebsite(snapshot, owner, opts.businessName, aiTierFor(opts.email), { businessId: opts.businessId, feature: "xray", traceId: opts.traceId });
    update(id, { status: "done", result: JSON.stringify(result), finished_at: new Date().toISOString(), duration_ms: Date.now() - started });
    recordAudit({ businessId: opts.businessId, traceId: opts.traceId, actor: "system", action: "xray.done", resource: id, detail: { pages: snapshot.pages.length, problems: result.opportunities.length } });
  } catch (err) {
    const message =
      err instanceof CrawlError || err instanceof AnalysisError ? err.message : "Something went wrong while running the X-Ray. Please try again.";
    if (!(err instanceof CrawlError || err instanceof AnalysisError)) console.error("[xray]", err);
    update(id, { status: "failed", error: message, finished_at: new Date().toISOString(), duration_ms: Date.now() - started });
    recordAudit({ businessId: opts.businessId, traceId: opts.traceId, actor: "system", action: "xray.failed", resource: id, detail: { error: message } });
  }
}

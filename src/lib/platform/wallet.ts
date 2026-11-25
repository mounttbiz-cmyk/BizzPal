import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { recordAudit } from "./audit";

/**
 * Prepaid credit wallet (PRD 11.2). 1 credit = ₹1 of metered platform usage.
 *
 * - The ledger is append-only: purchase, grant, consume, refund, adjustment and expiry entries are never edited.
 * - Work reserves credits before it starts; on settlement the actual cost is consumed and the rest released.
 * - The balance can never go negative. Every check-then-write below runs synchronously, with no await in between,
 *   so two tasks in this server process cannot both spend the same credits. (BizzPal runs as one process; a second
 *   process would need a database with row locks for this guarantee.)
 *
 * Amounts are stored in paise (1/100 credit) as integers, so there is no rounding drift.
 */

export type LedgerType = "purchase" | "grant" | "consume" | "refund" | "adjustment" | "expiry";

export class WalletError extends Error {
  status: number;
  code: string;
  constructor(message: string, code = "wallet_error", status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_ledger (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      id TEXT NOT NULL UNIQUE,
      business_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      balance_after_paise INTEGER NOT NULL,
      task_id TEXT,
      trace_id TEXT,
      reference TEXT,
      note TEXT,
      actor TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_credit_ledger_business ON credit_ledger (business_id, seq);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_reference ON credit_ledger (business_id, reference) WHERE reference IS NOT NULL;

    CREATE TABLE IF NOT EXISTS credit_reservations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      trace_id TEXT,
      amount_paise INTEGER NOT NULL,
      status TEXT NOT NULL,
      consumed_paise INTEGER,
      created_at TEXT NOT NULL,
      settled_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_credit_reservations_business ON credit_reservations (business_id, status);
  `);
} catch {}

export const toPaise = (credits: number) => Math.round(credits * 100);
export const toCredits = (paise: number) => Math.round(paise) / 100;
const newId = (p: string) => `${p}_${randomBytes(10).toString("hex")}`;

/** Credits on the ledger, before reservations. */
function ledgerBalancePaise(businessId: string): number {
  const row = db.prepare("SELECT balance_after_paise FROM credit_ledger WHERE business_id = ? ORDER BY seq DESC LIMIT 1").get(businessId) as any;
  return Number(row?.balance_after_paise || 0);
}

function reservedPaise(businessId: string): number {
  const row = db.prepare("SELECT COALESCE(SUM(amount_paise), 0) AS n FROM credit_reservations WHERE business_id = ? AND status = 'reserved'").get(businessId) as any;
  return Number(row?.n || 0);
}

export function walletBalance(businessId: string) {
  const balance = ledgerBalancePaise(businessId);
  const reserved = reservedPaise(businessId);
  return { balance: toCredits(balance), reserved: toCredits(reserved), available: toCredits(balance - reserved) };
}

function append(businessId: string, type: LedgerType, amountPaise: number, e: { taskId?: string; traceId?: string | null; reference?: string; note?: string; actor: string }) {
  const before = ledgerBalancePaise(businessId);
  const after = before + amountPaise;
  if (after < 0) throw new WalletError("That would take the wallet below zero.", "insufficient_credits", 402);
  const id = newId("crd");
  const res: any = db
    .prepare(
      `INSERT INTO credit_ledger (id, business_id, type, amount_paise, balance_after_paise, task_id, trace_id, reference, note, actor, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, businessId, type, amountPaise, after, e.taskId || null, e.traceId || null, e.reference || null, (e.note || "").slice(0, 300), e.actor, new Date().toISOString());
  if (!res?.changes) {
    // The unique reference refused a second entry for the same payment
    throw new WalletError("This was already added to the wallet.", "duplicate", 409);
  }
  return { id, balanceAfter: toCredits(after) };
}

/** Adds credits (a purchase, or credits granted by the platform). `reference` makes it safe to repeat. */
export function addCredits(businessId: string, credits: number, e: { type: "purchase" | "grant" | "refund" | "adjustment"; actor: string; reference?: string; note?: string; traceId?: string | null }) {
  const paise = toPaise(credits);
  if (!Number.isFinite(paise) || paise <= 0) throw new WalletError("Enter a positive number of credits.");
  if (paise > toPaise(10_000_000)) throw new WalletError("That amount is too large.");
  const r = append(businessId, e.type, paise, e);
  recordAudit({ businessId, traceId: e.traceId, actor: e.actor, action: `credits.${e.type}`, resource: r.id, detail: { credits, reference: e.reference || null, note: e.note || null } });
  return r;
}

/** Holds credits for a task before it runs. Refused when the available balance is too low. */
export function reserveCredits(businessId: string, credits: number, e: { taskId: string; traceId?: string | null; actor: string }) {
  const paise = toPaise(credits);
  if (!Number.isFinite(paise) || paise <= 0) throw new WalletError("A reservation must be positive.");
  // Check and write with nothing in between (see the note at the top)
  const available = ledgerBalancePaise(businessId) - reservedPaise(businessId);
  if (available < paise) {
    throw new WalletError(
      `Not enough credits: this needs up to ${toCredits(paise)} and ${Math.max(0, toCredits(available))} are available.`,
      "insufficient_credits",
      402
    );
  }
  const id = newId("rsv");
  db.prepare(
    "INSERT INTO credit_reservations (id, business_id, task_id, trace_id, amount_paise, status, created_at) VALUES (?, ?, ?, ?, ?, 'reserved', ?)"
  ).run(id, businessId, e.taskId, e.traceId || null, paise, new Date().toISOString());
  recordAudit({ businessId, traceId: e.traceId, actor: e.actor, action: "credits.reserve", resource: id, detail: { taskId: e.taskId, credits: toCredits(paise) } });
  return { id, reserved: toCredits(paise) };
}

/**
 * Settles a reservation: the actual cost is consumed (never more than was reserved) and the rest is released.
 * Settling twice does nothing the second time.
 */
export function settleReservation(businessId: string, reservationId: string, actualCredits: number, e: { actor: string; note?: string }) {
  const r = db.prepare("SELECT * FROM credit_reservations WHERE id = ? AND business_id = ?").get(reservationId, businessId) as any;
  if (!r) throw new WalletError("Reservation not found.", "not_found", 404);
  if (r.status !== "reserved") return { consumed: toCredits(r.consumed_paise || 0), released: 0, alreadySettled: true };
  const consumed = Math.min(Math.max(0, toPaise(actualCredits)), Number(r.amount_paise));
  db.prepare("UPDATE credit_reservations SET status = 'settled', consumed_paise = ?, settled_at = ? WHERE id = ? AND status = 'reserved'").run(
    consumed,
    new Date().toISOString(),
    reservationId
  );
  if (consumed > 0) append(businessId, "consume", -consumed, { taskId: r.task_id, traceId: r.trace_id, note: e.note || "Task cost", actor: e.actor });
  recordAudit({
    businessId,
    traceId: r.trace_id,
    actor: e.actor,
    action: "credits.settle",
    resource: reservationId,
    detail: { taskId: r.task_id, reserved: toCredits(r.amount_paise), consumed: toCredits(consumed), released: toCredits(r.amount_paise - consumed) },
  });
  return { consumed: toCredits(consumed), released: toCredits(r.amount_paise - consumed), alreadySettled: false };
}

export function ledger(businessId: string, limit = 100) {
  const rows = db.prepare("SELECT * FROM credit_ledger WHERE business_id = ? ORDER BY seq DESC LIMIT ?").all(businessId, Math.min(limit, 500)) as any[];
  return rows.map(r => ({
    id: r.id,
    type: r.type as LedgerType,
    credits: toCredits(r.amount_paise),
    balanceAfter: toCredits(r.balance_after_paise),
    taskId: r.task_id,
    traceId: r.trace_id,
    note: r.note,
    actor: r.actor,
    createdAt: r.created_at,
  }));
}

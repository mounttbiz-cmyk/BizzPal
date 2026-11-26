import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import type { Movement } from "./parse";

/**
 * Money in and out of the business, from uploaded bank statements and Tally exports. Every row is a real transaction
 * from the owner's own file; categories are suggested from the description and the owner can change any of them.
 * Uploading the same file (or an overlapping statement) twice never counts a transaction twice.
 */

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS money_imports (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      source TEXT NOT NULL,
      file_name TEXT NOT NULL,
      layout TEXT,
      rows_read INTEGER NOT NULL DEFAULT 0,
      rows_added INTEGER NOT NULL DEFAULT 0,
      rows_duplicate INTEGER NOT NULL DEFAULT 0,
      rows_skipped INTEGER NOT NULL DEFAULT 0,
      from_date TEXT,
      to_date TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_money_imports_business ON money_imports (business_id, created_at);
    CREATE TABLE IF NOT EXISTS money_movements (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      import_id TEXT NOT NULL,
      source TEXT NOT NULL,
      seq INTEGER NOT NULL DEFAULT 0,
      txn_date TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      balance REAL,
      voucher_type TEXT,
      category TEXT NOT NULL,
      category_by TEXT NOT NULL DEFAULT 'auto',
      hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (business_id, hash)
    );
    CREATE INDEX IF NOT EXISTS idx_money_movements_month ON money_movements (business_id, txn_date);
  `);
} catch {}

export type MoneySource = "bank" | "tally";

// ------------------------------------------------------------------ categories

export const IN_CATEGORIES = ["Sales", "Interest", "Loans & investment", "Refunds received", "Own transfer", "Other income"] as const;
export const OUT_CATEGORIES = [
  "Salaries",
  "Rent",
  "Taxes",
  "Software",
  "Utilities",
  "Marketing",
  "Suppliers",
  "Loan repayment",
  "Bank charges",
  "Cash withdrawal",
  "Own transfer",
  "Other spending",
] as const;
/** Tally voucher categories */
export const TALLY_CATEGORIES = ["Sales", "Collections", "Payments", "Purchases"] as const;

/** Moving money between your own accounts is neither revenue nor spending */
const NOT_SPENDING = new Set(["Own transfer"]);

const RULES: Array<{ test: RegExp; inCat?: string; outCat?: string }> = [
  { test: /\b(self|own a\/?c|own account|sweep|fd booked|fd closure|to fd|from fd)\b/i, inCat: "Own transfer", outCat: "Own transfer" },
  { test: /\b(salary|salaries|sal |payroll|wages|stipend)\b/i, outCat: "Salaries" },
  { test: /\b(rent|lease)\b/i, outCat: "Rent" },
  { test: /\b(gst|tds|cbdt|income tax|advance tax|professional tax|epfo|esic|pf contribution|challan)\b/i, outCat: "Taxes" },
  { test: /\b(aws|amazon web|google ?cloud|gsuite|workspace|microsoft|azure|zoho|adobe|slack|notion|atlassian|github|hostinger|godaddy|subscription)\b/i, outCat: "Software" },
  { test: /\b(electricity|bescom|bses|tata power|msedcl|airtel|jio|vodafone|vi |broadband|water bill|gas bill)\b/i, outCat: "Utilities" },
  { test: /\b(facebook|meta platforms|fb ads|google ads|adwords|linkedin|instagram|marketing|advertis)/i, outCat: "Marketing" },
  { test: /\b(emi|loan repay|loan a\/?c|repayment)\b/i, outCat: "Loan repayment" },
  { test: /\b(loan disb|disbursement|capital infusion|share capital|investment received)\b/i, inCat: "Loans & investment" },
  { test: /\b(charges|chrg|chgs|annual fee|sms alert|min bal|gst on chg)\b/i, outCat: "Bank charges" },
  { test: /\b(atm|cash wdl|cash withdrawal|atw)\b/i, outCat: "Cash withdrawal" },
  { test: /\b(int\.? ?pd|interest|int cr|sb int)\b/i, inCat: "Interest" },
  { test: /\b(refund|reversal|rev |cashback)\b/i, inCat: "Refunds received" },
];

export function suggestCategory(m: Movement, source: MoneySource): string {
  if (source === "tally") {
    const t = (m.voucherType || "").toLowerCase();
    if (t.includes("sale")) return "Sales";
    if (t.includes("receipt")) return "Collections";
    if (t.includes("purchase")) return "Purchases";
    return "Payments";
  }
  for (const r of RULES) {
    if (r.test.test(m.description)) {
      if (m.amount > 0 && r.inCat) return r.inCat;
      if (m.amount < 0 && r.outCat) return r.outCat;
    }
  }
  return m.amount > 0 ? "Sales" : "Suppliers";
}

export function categoriesFor(source: MoneySource, amount: number): readonly string[] {
  if (source === "tally") return TALLY_CATEGORIES;
  return amount > 0 ? IN_CATEGORIES : OUT_CATEGORIES;
}

// ------------------------------------------------------------------ importing

export interface ImportSummary {
  id: string;
  source: MoneySource;
  fileName: string;
  layout: string | null;
  rowsRead: number;
  rowsAdded: number;
  rowsDuplicate: number;
  rowsSkipped: number;
  fromDate: string | null;
  toDate: string | null;
  createdAt: string;
}

const toSummary = (r: any): ImportSummary => ({
  id: r.id,
  source: r.source,
  fileName: r.file_name,
  layout: r.layout,
  rowsRead: r.rows_read,
  rowsAdded: r.rows_added,
  rowsDuplicate: r.rows_duplicate,
  rowsSkipped: r.rows_skipped,
  fromDate: r.from_date,
  toDate: r.to_date,
  createdAt: r.created_at,
});

export function saveImport(opts: { businessId: string; source: MoneySource; fileName: string; layout: string; movements: Movement[]; skipped: number; actor: string }): ImportSummary {
  const id = `imp_${randomBytes(8).toString("hex")}`;
  const now = new Date().toISOString();
  const insert = db.prepare(
    `INSERT OR IGNORE INTO money_movements (id, business_id, import_id, source, seq, txn_date, description, amount, balance, voucher_type, category, category_by, hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'auto', ?, ?)`
  );
  let added = 0;
  // The same transaction can appear twice in one statement (two identical payments on a day): count repeats inside
  // the file so they stay separate, while a second upload of the same file still matches the first.
  const seen = new Map<string, number>();
  opts.movements.forEach((m, i) => {
    const base = `${opts.source}|${m.date}|${m.amount.toFixed(2)}|${m.description.toLowerCase()}|${m.balance ?? ""}|${m.voucherType || ""}`;
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    const hash = createHash("sha256").update(`${base}|${n}`).digest("hex");
    const r: any = insert.run(
      `mv_${randomBytes(9).toString("hex")}`,
      opts.businessId,
      id,
      opts.source,
      i,
      m.date,
      m.description,
      m.amount,
      m.balance,
      m.voucherType || null,
      suggestCategory(m, opts.source),
      hash,
      now
    );
    if (r?.changes) added++;
  });
  const dates = opts.movements.map(m => m.date).sort();
  db.prepare(
    `INSERT INTO money_imports (id, business_id, source, file_name, layout, rows_read, rows_added, rows_duplicate, rows_skipped, from_date, to_date, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, opts.businessId, opts.source, opts.fileName.slice(0, 200), opts.layout, opts.movements.length, added, opts.movements.length - added, opts.skipped, dates[0] || null, dates[dates.length - 1] || null, opts.actor, now);
  return toSummary(db.prepare("SELECT * FROM money_imports WHERE id = ?").get(id));
}

export function listImports(businessId: string): ImportSummary[] {
  return (db.prepare("SELECT * FROM money_imports WHERE business_id = ? ORDER BY created_at DESC LIMIT 100").all(businessId) as any[]).map(toSummary);
}

/** Removes an upload and the transactions it added. */
export function deleteImport(businessId: string, id: string): boolean {
  const r: any = db.prepare("DELETE FROM money_imports WHERE id = ? AND business_id = ?").run(id, businessId);
  if (!r?.changes) return false;
  db.prepare("DELETE FROM money_movements WHERE import_id = ? AND business_id = ?").run(id, businessId);
  return true;
}

// ------------------------------------------------------------------ reading

export interface MovementRow {
  id: string;
  source: MoneySource;
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  category: string;
  categoryBy: "auto" | "owner";
  categories: readonly string[];
}

export function listMovements(businessId: string, opts: { month?: string; source?: MoneySource; q?: string; limit?: number } = {}): MovementRow[] {
  const where = ["business_id = ?"];
  const args: unknown[] = [businessId];
  if (opts.month && /^\d{4}-\d{2}$/.test(opts.month)) {
    where.push("substr(txn_date, 1, 7) = ?");
    args.push(opts.month);
  }
  if (opts.source) {
    where.push("source = ?");
    args.push(opts.source);
  }
  if (opts.q) {
    where.push("(LOWER(description) LIKE ? OR LOWER(category) LIKE ?)");
    args.push(`%${opts.q.toLowerCase()}%`, `%${opts.q.toLowerCase()}%`);
  }
  const rows = db
    .prepare(`SELECT * FROM money_movements WHERE ${where.join(" AND ")} ORDER BY txn_date DESC, seq DESC LIMIT ?`)
    .all(...args, Math.min(opts.limit || 300, 2000)) as any[];
  return rows.map(r => ({
    id: r.id,
    source: r.source,
    date: r.txn_date,
    description: r.description,
    amount: Number(r.amount),
    balance: r.balance === null ? null : Number(r.balance),
    category: r.category,
    categoryBy: r.category_by,
    categories: categoriesFor(r.source, Number(r.amount)),
  }));
}

export function setCategory(businessId: string, id: string, category: string): MovementRow | null {
  const r = db.prepare("SELECT * FROM money_movements WHERE id = ? AND business_id = ?").get(id, businessId) as any;
  if (!r) return null;
  if (!categoriesFor(r.source, Number(r.amount)).includes(category)) throw new Error("That category does not fit this transaction.");
  db.prepare("UPDATE money_movements SET category = ?, category_by = 'owner' WHERE id = ?").run(category, id);
  return listMovements(businessId, { limit: 2000 }).find(m => m.id === id) || null;
}

// ------------------------------------------------------------------ monthly figures

export interface MonthFigures {
  month: string; // YYYY-MM
  moneyIn: number;
  moneyOut: number;
  revenue: number;
  spending: number;
  closingCash: number | null;
  revenueFrom: MoneySource | null;
  spendingFrom: MoneySource | null;
  byCategory: Array<{ category: string; amount: number }>;
}

/**
 * Month by month. Spending and cash come from bank statements when there are any for that month. Revenue comes from
 * Tally sales when Tally covers the month (sales are counted when made), otherwise from money received as sales in the
 * bank. Moving money between your own accounts is left out of both.
 */
export function monthlyFigures(businessId: string, months = 24): MonthFigures[] {
  const rows = db
    .prepare("SELECT source, substr(txn_date, 1, 7) AS m, txn_date, seq, amount, balance, category FROM money_movements WHERE business_id = ? ORDER BY txn_date, seq")
    .all(businessId) as any[];
  const byMonth = new Map<string, any[]>();
  for (const r of rows) {
    if (!byMonth.has(r.m)) byMonth.set(r.m, []);
    byMonth.get(r.m)!.push(r);
  }
  const out: MonthFigures[] = [];
  for (const [month, list] of Array.from(byMonth.entries()).sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const bank = list.filter(r => r.source === "bank");
    const tally = list.filter(r => r.source === "tally");
    const sum = (xs: any[]) => Math.round(xs.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100;
    const tallySales = tally.filter(r => r.category === "Sales");
    const bankSales = bank.filter(r => r.amount > 0 && r.category === "Sales");
    const revenueFrom: MoneySource | null = tallySales.length ? "tally" : bankSales.length ? "bank" : null;
    const revenue = revenueFrom === "tally" ? sum(tallySales) : sum(bankSales);
    const bankOut = bank.filter(r => r.amount < 0 && !NOT_SPENDING.has(r.category));
    const tallyOut = tally.filter(r => r.category === "Payments");
    const spendingFrom: MoneySource | null = bankOut.length ? "bank" : tallyOut.length ? "tally" : null;
    const spending = Math.abs(spendingFrom === "bank" ? sum(bankOut) : sum(tallyOut));
    const withBalance = bank.filter(r => r.balance !== null && r.balance !== undefined);
    const closingCash = withBalance.length ? Number(withBalance[withBalance.length - 1].balance) : null;
    const pool = bank.length ? bank : tally;
    const cats = new Map<string, number>();
    for (const r of pool) cats.set(r.category, (cats.get(r.category) || 0) + Math.abs(Number(r.amount)));
    out.push({
      month,
      moneyIn: sum(pool.filter(r => r.amount > 0)),
      moneyOut: Math.abs(sum(pool.filter(r => r.amount < 0))),
      revenue,
      spending,
      closingCash,
      revenueFrom,
      spendingFrom,
      byCategory: Array.from(cats.entries())
        .map(([category, amount]) => ({ category, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount),
    });
  }
  return out.slice(-months);
}

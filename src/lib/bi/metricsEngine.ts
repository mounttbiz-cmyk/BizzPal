import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";

/**
 * The business's own figures. Everything here is either entered by the owner, read from an uploaded file, or counted
 * from their own tasks. Nothing is estimated or filled in: a figure BizzPal does not have is 0 (or null when 0 would
 * be misleading). The history is real too: BizzPal saves one snapshot of the owner's numbers per month, so it only
 * grows as time passes.
 */

export interface BusinessMetricSnapshot {
  monthlyRevenue: number;
  annualRevenue: number;
  monthlyBurn: number;
  cashReserve: number;
  /** null when cash or burn is not known */
  runwayMonths: number | null;
  teamSize: number;
  /** Share of the business's tasks marked done. null when there are no tasks */
  tasksCompletedRate: number | null;
  /** One saved snapshot per month, oldest first */
  history: {
    month: string;
    revenue: number;
    burn: number;
    netCash: number;
  }[];
  hasUploadedData: boolean;
  lastUpdated: string;
}

let ready = false;
function ensureHistoryTable() {
  if (ready) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS business_metric_history (
      business_id TEXT NOT NULL,
      month TEXT NOT NULL,
      revenue REAL NOT NULL DEFAULT 0,
      burn REAL NOT NULL DEFAULT 0,
      cash REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (business_id, month)
    );
  `);
  ready = true;
}

const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short", year: "numeric" });
};

export function calculateBusinessMetrics(businessId = DEFAULT_BUSINESS_ID): BusinessMetricSnapshot {
  const biz = db.prepare("SELECT * FROM businesses WHERE id = ?").get(businessId) as any;

  const uploads = db
    .prepare("SELECT * FROM business_data_uploads WHERE business_id = ? AND active = 1 ORDER BY created_at DESC")
    .all(businessId) as any[];

  let uploadedMonthlyRev = 0;
  let uploadedBurn = 0;
  let uploadedCash = 0;
  for (const u of uploads) {
    try {
      const sum = JSON.parse(u.metrics_summary || "{}");
      if (sum.monthlyRevenue) uploadedMonthlyRev = Math.max(uploadedMonthlyRev, Number(sum.monthlyRevenue));
      if (sum.monthlyBurn) uploadedBurn = Math.max(uploadedBurn, Number(sum.monthlyBurn));
      if (sum.cashOnHand) uploadedCash = Math.max(uploadedCash, Number(sum.cashOnHand));
    } catch {}
  }

  const monthlyRev = uploadedMonthlyRev || Number(biz?.monthly_revenue) || 0;
  const monthlyBurn = uploadedBurn || Number(biz?.monthly_burn) || 0;
  const cashReserve = uploadedCash || Number(biz?.cash_on_hand) || 0;
  const teamSize = Number(biz?.team_size) || 0;
  const runwayMonths = monthlyBurn > 0 && cashReserve > 0 ? Number((cashReserve / monthlyBurn).toFixed(1)) : null;

  let tasksCompletedRate: number | null = null;
  try {
    const tasks = db.prepare("SELECT status FROM tasks WHERE business_id = ?").all(businessId) as any[];
    if (tasks.length > 0) tasksCompletedRate = Number(((tasks.filter(t => t.status === "done").length / tasks.length) * 100).toFixed(1));
  } catch {}

  // Save this month's real figures, and read back the months saved so far
  let history: BusinessMetricSnapshot["history"] = [];
  try {
    ensureHistoryTable();
    if (monthlyRev > 0 || monthlyBurn > 0 || cashReserve > 0) {
      const ym = new Date().toISOString().slice(0, 7);
      db.prepare(
        `INSERT INTO business_metric_history (business_id, month, revenue, burn, cash, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(business_id, month) DO UPDATE SET revenue = excluded.revenue, burn = excluded.burn, cash = excluded.cash, updated_at = excluded.updated_at`
      ).run(businessId, ym, monthlyRev, monthlyBurn, cashReserve, new Date().toISOString());
    }
    const rows = db.prepare("SELECT month, revenue, burn FROM business_metric_history WHERE business_id = ? ORDER BY month DESC LIMIT 12").all(businessId) as any[];
    history = rows.reverse().map(r => ({ month: monthLabel(r.month), revenue: Number(r.revenue), burn: Number(r.burn), netCash: Number(r.revenue) - Number(r.burn) }));
  } catch {}

  return {
    monthlyRevenue: monthlyRev,
    annualRevenue: monthlyRev * 12,
    monthlyBurn,
    cashReserve,
    runwayMonths,
    teamSize,
    tasksCompletedRate,
    history,
    hasUploadedData: uploads.length > 0,
    lastUpdated: new Date().toISOString(),
  };
}

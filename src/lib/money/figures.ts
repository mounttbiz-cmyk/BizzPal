import { db } from "@/lib/db";
import { totalRevenue } from "@/lib/payments/store";
import { monthlyFigures, type MonthFigures } from "./store";

/**
 * The business's headline numbers, each with where it came from. One place decides, so the dashboard, the advisors
 * and the forecasts all show the same figure. In order of trust:
 *   1. bank statements and Tally (real transactions), for a recent month
 *   2. Razorpay / Stripe (real payments, last 30 days) for revenue
 *   3. an uploaded figures file
 *   4. what the owner typed in
 * A figure nobody has given is null, never 0 and never a guess.
 */

export type FigureSource = "bank" | "tally" | "razorpay" | "stripe" | "payments" | "upload" | "typed";

export interface Figure {
  value: number | null;
  source: FigureSource | null;
  /** For people: "From your bank statement, October 2026" */
  label: string;
  /** When the source was last updated */
  asOf: string | null;
}

export interface BusinessFigures {
  monthlyRevenue: Figure;
  monthlySpending: Figure;
  cash: Figure;
  runwayMonths: number | null;
  /** The month the bank or Tally figures are for (YYYY-MM), if any */
  month: string | null;
  months: MonthFigures[];
}

const monthName = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const SOURCE_NAME: Record<string, string> = { bank: "your bank statement", tally: "Tally" };

/** The latest month that is over, or the current month when it is the only one. */
function referenceMonth(months: MonthFigures[], now = new Date()): MonthFigures | null {
  if (months.length === 0) return null;
  const current = now.toISOString().slice(0, 7);
  const last = months[months.length - 1];
  if (last.month === current && months.length > 1) return months[months.length - 2];
  return last;
}

/** Only recent transactions should drive today's numbers */
function isRecent(ym: string, now = new Date()) {
  const [y, m] = ym.split("-").map(Number);
  const monthsAgo = (now.getFullYear() - y) * 12 + (now.getMonth() + 1 - m);
  return monthsAgo <= 3;
}

function latestUploadSummary(businessId: string): { revenue: number; burn: number; cash: number; at: string } | null {
  try {
    const rows = db.prepare("SELECT metrics_summary, created_at FROM business_data_uploads WHERE business_id = ? AND active = 1 ORDER BY created_at DESC").all(businessId) as any[];
    let revenue = 0,
      burn = 0,
      cash = 0,
      at = "";
    for (const u of rows) {
      const s = JSON.parse(u.metrics_summary || "{}");
      if (!revenue && Number(s.monthlyRevenue) > 0) revenue = Number(s.monthlyRevenue);
      if (!burn && Number(s.monthlyBurn) > 0) burn = Number(s.monthlyBurn);
      if (!cash && Number(s.cashOnHand) > 0) cash = Number(s.cashOnHand);
      if (!at) at = u.created_at;
    }
    return rows.length ? { revenue, burn, cash, at } : null;
  } catch {
    return null;
  }
}

export function businessFigures(businessId: string, email?: string | null): BusinessFigures {
  const months = monthlyFigures(businessId);
  const ref = referenceMonth(months);
  const useRef = ref && isRecent(ref.month) ? ref : null;
  const lastImport = (db.prepare("SELECT MAX(created_at) AS at FROM money_imports WHERE business_id = ?").get(businessId) as any)?.at || null;
  const biz = db.prepare("SELECT monthly_revenue, monthly_burn, cash_on_hand, updated_at FROM businesses WHERE id = ?").get(businessId) as any;
  const upload = latestUploadSummary(businessId);
  const pay = email ? totalRevenue(email) : null;
  const none: Figure = { value: null, source: null, label: "Not added yet", asOf: null };

  // Revenue
  let monthlyRevenue: Figure = none;
  if (useRef && useRef.revenueFrom && useRef.revenue > 0) {
    monthlyRevenue = { value: useRef.revenue, source: useRef.revenueFrom, label: `From ${SOURCE_NAME[useRef.revenueFrom]}, ${monthName(useRef.month)}`, asOf: lastImport };
  } else if (pay && pay.revenueInr > 0) {
    const src = pay.sources.length === 1 ? pay.sources[0] : "payments";
    const name = pay.sources.map(s => (s === "stripe" ? "Stripe" : "Razorpay")).join(" and ");
    monthlyRevenue = { value: pay.revenueInr, source: src as FigureSource, label: `From ${name}, last 30 days`, asOf: pay.asOf };
  } else if (upload?.revenue) {
    monthlyRevenue = { value: upload.revenue, source: "upload", label: "From your uploaded file", asOf: upload.at };
  } else if (Number(biz?.monthly_revenue) > 0) {
    monthlyRevenue = { value: Number(biz.monthly_revenue), source: "typed", label: "Added by you", asOf: biz.updated_at || null };
  }

  // Spending
  let monthlySpending: Figure = none;
  if (useRef && useRef.spendingFrom && useRef.spending > 0) {
    monthlySpending = { value: useRef.spending, source: useRef.spendingFrom, label: `From ${SOURCE_NAME[useRef.spendingFrom]}, ${monthName(useRef.month)}`, asOf: lastImport };
  } else if (upload?.burn) {
    monthlySpending = { value: upload.burn, source: "upload", label: "From your uploaded file", asOf: upload.at };
  } else if (Number(biz?.monthly_burn) > 0) {
    monthlySpending = { value: Number(biz.monthly_burn), source: "typed", label: "Added by you", asOf: biz.updated_at || null };
  }

  // Cash: the latest bank balance, wherever it falls
  let cash: Figure = none;
  const withCash = [...months].reverse().find(m => m.closingCash !== null && isRecent(m.month));
  if (withCash && withCash.closingCash !== null) {
    cash = { value: withCash.closingCash, source: "bank", label: `Bank balance, end of ${monthName(withCash.month)}`, asOf: lastImport };
  } else if (upload?.cash) {
    cash = { value: upload.cash, source: "upload", label: "From your uploaded file", asOf: upload.at };
  } else if (Number(biz?.cash_on_hand) > 0) {
    cash = { value: Number(biz.cash_on_hand), source: "typed", label: "Added by you", asOf: biz.updated_at || null };
  }

  const runwayMonths =
    cash.value && monthlySpending.value && monthlySpending.value > 0 ? Math.round((cash.value / monthlySpending.value) * 10) / 10 : null;

  return { monthlyRevenue, monthlySpending, cash, runwayMonths, month: useRef?.month || null, months };
}

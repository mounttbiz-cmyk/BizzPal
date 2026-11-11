import { NextResponse } from "next/server";
import { db, PLACES_COST_PER_REQUEST_USD } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const since = monthStart.toISOString();

    const accounts = db
      .prepare(
        `SELECT account_email AS email,
                MAX(account_name) AS name,
                COUNT(*) AS runs,
                SUM(returned) AS leads,
                SUM(google_requests) AS googleRequests,
                SUM(est_cost_usd) AS costUsd,
                SUM(CASE WHEN created_at >= ? THEN est_cost_usd ELSE 0 END) AS monthCostUsd,
                MAX(created_at) AS lastRunAt
           FROM datapal_usage_log
          GROUP BY account_email
          ORDER BY costUsd DESC, lastRunAt DESC`
      )
      .all(since) as any[];

    const recent = db
      .prepare(
        `SELECT id, account_email AS email, account_name AS name, requested, returned,
                source_mode AS sourceMode, google_requests AS googleRequests,
                est_cost_usd AS costUsd, created_at AS createdAt
           FROM datapal_usage_log
          ORDER BY id DESC
          LIMIT 40`
      )
      .all() as any[];

    const totals = db
      .prepare(
        `SELECT COUNT(*) AS runs,
                COALESCE(SUM(google_requests), 0) AS googleRequests,
                COALESCE(SUM(est_cost_usd), 0) AS costUsd,
                COALESCE(SUM(CASE WHEN created_at >= ? THEN est_cost_usd ELSE 0 END), 0) AS monthCostUsd
           FROM datapal_usage_log`
      )
      .get(since) as any;

    return NextResponse.json({
      success: true,
      costPerRequestUsd: PLACES_COST_PER_REQUEST_USD,
      usdToInr: Number(process.env.USD_TO_INR_RATE || 88),
      totals,
      accounts,
      recent,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Could not load usage" }, { status: 500 });
  }
}

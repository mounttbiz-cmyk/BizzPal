import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { businessFigures } from "@/lib/money/figures";

export const dynamic = "force-dynamic";

/** Revenue, spending, cash and runway, each with where it came from. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const f = businessFigures(getUserBusinessId(auth.email), auth.email);
  return NextResponse.json({
    success: true,
    figures: { monthlyRevenue: f.monthlyRevenue, monthlySpending: f.monthlySpending, cash: f.cash, runwayMonths: f.runwayMonths, month: f.month },
    history: f.months.slice(-12).map(m => ({ month: m.month, revenue: m.revenue, spending: m.spending, closingCash: m.closingCash })),
  });
}

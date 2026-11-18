import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId, getUserBusiness } from "@/lib/db";
import { calculateBusinessMetrics } from "@/lib/bi/metricsEngine";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** The business's own figures. Nothing is estimated: a figure that is not known is 0 or null. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const m = calculateBusinessMetrics(getUserBusinessId(auth.email));
    return NextResponse.json({
      success: true,
      business: getUserBusiness(auth.email),
      metrics: {
        monthlyRevenue: m.monthlyRevenue,
        annualRevenue: m.annualRevenue,
        monthlyBurn: m.monthlyBurn,
        cashReserve: m.cashReserve,
        runwayMonths: m.runwayMonths,
        teamSize: m.teamSize,
        hasUploadedData: m.hasUploadedData,
      },
      history: m.history,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

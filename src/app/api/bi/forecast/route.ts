import { NextRequest, NextResponse } from "next/server";
import { generateMetricForecast } from "@/lib/bi/forecaster";
import { getPlatformConfig, getActiveBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const metric = (searchParams.get("metric") as "revenue" | "burn") || "revenue";
    const months = Number(searchParams.get("months") || 4);

    const bizId =
      searchParams.get("businessId") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const forecast = generateMetricForecast(metric, bizId, months);

    return NextResponse.json({
      success: true,
      forecast,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

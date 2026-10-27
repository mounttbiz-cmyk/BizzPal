import { NextRequest, NextResponse } from "next/server";
import { evaluateBusinessKpis } from "@/lib/bi/kpiMonitor";
import { getPlatformConfig, getActiveBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let bizId: string | null = null;
    try {
      const body = await req.json();
      bizId = body.businessId;
    } catch {}

    const targetBizId =
      bizId ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const evaluationResults = await evaluateBusinessKpis(targetBizId);

    const breaches = evaluationResults.filter((r) => r.isBreached);

    return NextResponse.json({
      success: true,
      evaluatedCount: evaluationResults.length,
      breachedCount: breaches.length,
      results: evaluationResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

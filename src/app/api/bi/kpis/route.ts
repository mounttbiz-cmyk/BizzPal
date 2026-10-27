import { NextRequest, NextResponse } from "next/server";
import { getKpiDefinitions, upsertKpiDefinition, evaluateBusinessKpis } from "@/lib/bi/kpiMonitor";
import { getPlatformConfig, getActiveBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bizId =
      searchParams.get("businessId") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const kpis = getKpiDefinitions(bizId);
    return NextResponse.json({ success: true, kpis });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const bizId =
      body.businessId ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    if (!body.metricKey || !body.name) {
      return NextResponse.json({ success: false, error: "metricKey and name are required" }, { status: 400 });
    }

    const saved = upsertKpiDefinition({
      id: body.id,
      businessId: bizId,
      metricKey: body.metricKey,
      name: body.name,
      description: body.description,
      targetValue: body.targetValue !== undefined ? Number(body.targetValue) : undefined,
      warningThreshold: body.warningThreshold !== undefined ? Number(body.warningThreshold) : undefined,
      criticalThreshold: body.criticalThreshold !== undefined ? Number(body.criticalThreshold) : undefined,
      comparisonType: body.comparisonType,
      alertSeverity: body.alertSeverity,
      frequency: body.frequency,
      enabled: body.enabled !== undefined ? Boolean(body.enabled) : true,
    });

    return NextResponse.json({ success: true, kpi: saved });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

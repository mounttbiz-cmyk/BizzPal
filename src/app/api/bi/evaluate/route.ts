import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { evaluateBusinessKpis } from "@/lib/bi/kpiMonitor";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const targetBizId = tenantId;

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

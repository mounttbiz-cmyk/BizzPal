import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { updateInsightStatus, approveInsightAction } from "@/lib/bi/investigator";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const insightId = params.id;
    const bizId =
      tenantId;

    const row = db
      .prepare("SELECT * FROM business_insights WHERE id = ? AND business_id = ?")
      .get(insightId, bizId) as any;

    if (!row) {
      return NextResponse.json({ success: false, error: "Insight not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      insight: {
        id: row.id,
        businessId: row.business_id,
        kpiId: row.kpi_id,
        title: row.title,
        severity: row.severity,
        status: row.status,
        observedValue: row.observed_value,
        previousValue: row.previous_value,
        changePct: row.change_pct,
        evidenceSummary: JSON.parse(row.evidence_summary || "{}"),
        rootCauseAnalysis: JSON.parse(row.root_cause_analysis || "{}"),
        recommendedActions: JSON.parse(row.recommended_actions || "[]"),
        auditTrail: JSON.parse(row.audit_trail || "[]"),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const insightId = params.id;
    const body = await req.json();
    const bizId =
      tenantId;

    // Handle approving a specific action
    if (body.approveAction && body.actionKey) {
      const result = await approveInsightAction(
        insightId,
        body.actionKey,
        auth.email,
        bizId
      );
      return NextResponse.json(result);
    }

    // Handle standard status update
    if (body.status) {
      const success = updateInsightStatus(
        insightId,
        body.status,
        body.note,
        auth.email,
        bizId
      );
      return NextResponse.json({ success, message: `Status updated to ${body.status}` });
    }

    return NextResponse.json({ success: false, error: "No valid action provided" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

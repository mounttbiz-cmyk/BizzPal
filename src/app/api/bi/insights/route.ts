import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId, getUserBusiness } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getBusinessInsights } from "@/lib/bi/investigator";
import { getPlatformConfig, getActiveBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const { searchParams } = new URL(req.url);
    const bizId =
      tenantId;

    const status = searchParams.get("status") || undefined;
    const severity = searchParams.get("severity") || undefined;

    const insights = getBusinessInsights(bizId, { status, severity });

    return NextResponse.json({
      success: true,
      count: insights.length,
      insights,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

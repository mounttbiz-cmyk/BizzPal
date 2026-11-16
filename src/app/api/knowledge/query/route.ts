import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId, getUserBusiness } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { queryCompanyMemory } from "@/lib/knowledge/retrieval";
import { getPlatformConfig, getActiveBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const { question } = body;

    if (!question || typeof question !== "string" || !question.trim()) {
      return NextResponse.json({ success: false, error: "Question is required" }, { status: 400 });
    }

    const bizId =
      tenantId;

    const response = await queryCompanyMemory(question.trim(), bizId);

    return NextResponse.json({
      success: true,
      question: question.trim(),
      ...response,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

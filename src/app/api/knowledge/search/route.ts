import { NextRequest, NextResponse } from "next/server";
import { searchCompanyKnowledge } from "@/lib/knowledge/retrieval";
import { getPlatformConfig, getActiveBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, limit, minSimilarity, documentId } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json({ success: false, error: "Search query is required" }, { status: 400 });
    }

    const bizId =
      body.businessId ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const results = await searchCompanyKnowledge(query.trim(), bizId, {
      limit: limit ? Number(limit) : 6,
      minSimilarity: minSimilarity !== undefined ? Number(minSimilarity) : 0.5,
      documentId,
    });

    return NextResponse.json({
      success: true,
      query: query.trim(),
      count: results.length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

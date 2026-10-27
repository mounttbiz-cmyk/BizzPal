import { NextRequest, NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID, getPlatformConfig, getActiveBusiness } from "@/lib/db";
import { getPersistentBusinessFacts } from "@/lib/knowledge/retrieval";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const bizId =
      searchParams.get("businessId") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const facts = getPersistentBusinessFacts(bizId, category);
    return NextResponse.json({ success: true, facts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, key, value, sourceCitation, sourceDocumentId, verifiedBy } = body;

    if (!category || !key || !value) {
      return NextResponse.json(
        { success: false, error: "category, key, and value are required" },
        { status: 400 }
      );
    }

    const bizId =
      body.businessId ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const factId = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO business_facts (id, business_id, category, fact_key, fact_value, confidence, source_document_id, source_citation, verified_by, is_active, valid_from, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 1.0, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      factId,
      bizId,
      category,
      key,
      value,
      sourceDocumentId || null,
      sourceCitation || "Executive Approval",
      verifiedBy || "Executive Founder",
      now,
      now,
      now
    );

    return NextResponse.json({
      success: true,
      fact: {
        id: factId,
        businessId: bizId,
        category,
        key,
        value,
        sourceCitation,
        verifiedBy: verifiedBy || "Executive Founder",
        createdAt: now,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const factId = searchParams.get("id");
    if (!factId) {
      return NextResponse.json({ success: false, error: "Fact id is required" }, { status: 400 });
    }

    const bizId =
      searchParams.get("businessId") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    db.prepare("UPDATE business_facts SET is_active = 0, valid_to = ? WHERE id = ? AND business_id = ?").run(
      new Date().toISOString(),
      factId,
      bizId
    );

    return NextResponse.json({ success: true, message: "Fact deactivated" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

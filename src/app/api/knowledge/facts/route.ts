import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPersistentBusinessFacts } from "@/lib/knowledge/retrieval";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const purpose = searchParams.get("purpose") || undefined;
    const classification = searchParams.get("classification") || undefined;
    const includeExpired = searchParams.get("includeExpired") === "1";

    const facts = getPersistentBusinessFacts(tenantId, {
      category,
      purpose,
      classification,
      includeExpired,
      role: auth.role,
    });
    return NextResponse.json({ success: true, facts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const {
      category,
      key,
      value,
      sourceCitation,
      source,
      sourceDocumentId,
      verifiedBy,
      owner,
      expiresAt,
      classification,
      purpose,
    } = body;

    if (!category || !key || !value) {
      return NextResponse.json(
        { success: false, error: "category, key, and value are required" },
        { status: 400 }
      );
    }

    const factId = `fact_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const resolvedSource = String(source || sourceCitation || "Executive Approval").slice(0, 300);
    const resolvedOwner = String(owner || verifiedBy || auth.email).slice(0, 160);
    const resolvedVerifier = String(verifiedBy || auth.email).slice(0, 160);
    const allowedClasses = ["public", "internal", "confidential", "restricted"];
    const resolvedClass = allowedClasses.includes(String(classification || "").toLowerCase())
      ? String(classification).toLowerCase()
      : "internal";
    const resolvedPurpose = String(purpose || "general").trim().slice(0, 80) || "general";
    let resolvedExpiry: string | null = null;
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid expiresAt date" }, { status: 400 });
      }
      resolvedExpiry = parsed.toISOString();
    }

    // Ensure provenance columns exist on older databases
    for (const col of [
      "ALTER TABLE business_facts ADD COLUMN owner TEXT",
      "ALTER TABLE business_facts ADD COLUMN verified_at TEXT",
      "ALTER TABLE business_facts ADD COLUMN expires_at TEXT",
      "ALTER TABLE business_facts ADD COLUMN version INTEGER DEFAULT 1",
      "ALTER TABLE business_facts ADD COLUMN classification TEXT DEFAULT 'internal'",
      "ALTER TABLE business_facts ADD COLUMN purpose TEXT DEFAULT 'general'",
    ]) {
      try { db.exec(col); } catch {}
    }

    // Increment version if an active fact with the same category + key already exists for this tenant
    const prev = db
      .prepare("SELECT id, version FROM business_facts WHERE business_id = ? AND category = ? AND fact_key = ? AND is_active = 1 ORDER BY version DESC LIMIT 1")
      .get(tenantId, category, key) as any;
    const nextVersion = prev ? Number(prev.version || 1) + 1 : 1;
    if (prev) {
      db.prepare("UPDATE business_facts SET is_active = 0, valid_to = ?, updated_at = ? WHERE id = ? AND business_id = ?").run(
        now,
        now,
        prev.id,
        tenantId
      );
    }

    db.prepare(`
      INSERT INTO business_facts (
        id, business_id, category, fact_key, fact_value, confidence,
        source_document_id, source_citation, verified_by, owner, verified_at, expires_at,
        version, classification, purpose, is_active, valid_from, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, 1.0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      factId,
      tenantId,
      category,
      key,
      value,
      sourceDocumentId || null,
      resolvedSource,
      resolvedVerifier,
      resolvedOwner,
      now,
      resolvedExpiry,
      nextVersion,
      resolvedClass,
      resolvedPurpose,
      now,
      now,
      now
    );

    return NextResponse.json({
      success: true,
      fact: {
        id: factId,
        businessId: tenantId,
        category,
        key,
        value,
        owner: resolvedOwner,
        source: resolvedSource,
        sourceCitation: resolvedSource,
        verifiedBy: resolvedVerifier,
        verifiedAt: now,
        expiresAt: resolvedExpiry,
        version: nextVersion,
        classification: resolvedClass,
        purpose: resolvedPurpose,
        createdAt: now,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const { searchParams } = new URL(req.url);
    const factId = searchParams.get("id");
    if (!factId) {
      return NextResponse.json({ success: false, error: "Fact id is required" }, { status: 400 });
    }

    const bizId =
      tenantId;

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

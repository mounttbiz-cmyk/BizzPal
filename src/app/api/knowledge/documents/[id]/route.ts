import { NextRequest, NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID, getPlatformConfig, getActiveBusiness } from "@/lib/db";
import { deleteCompanyDocument } from "@/lib/knowledge/ingest";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const { searchParams } = new URL(req.url);
    const bizId =
      searchParams.get("businessId") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const doc = db
      .prepare("SELECT * FROM company_documents WHERE id = ? AND business_id = ?")
      .get(documentId, bizId) as any;

    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found or unauthorized" }, { status: 404 });
    }

    const chunks = db
      .prepare(
        "SELECT id, chunk_index, char_count, token_estimate, page_number, section_title, content FROM document_chunks WHERE document_id = ? AND business_id = ? ORDER BY chunk_index ASC"
      )
      .all(documentId, bizId) as any[];

    return NextResponse.json({
      success: true,
      document: {
        id: doc.id,
        businessId: doc.business_id,
        title: doc.title,
        fileName: doc.file_name,
        fileType: doc.file_type,
        fileSize: doc.file_size,
        status: doc.status,
        chunkCount: doc.chunk_count,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
        metadata: JSON.parse(doc.metadata || "{}"),
      },
      chunks,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;
    const { searchParams } = new URL(req.url);
    const bizId =
      searchParams.get("businessId") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    await deleteCompanyDocument(documentId, bizId);
    return NextResponse.json({ success: true, message: "Document removed successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

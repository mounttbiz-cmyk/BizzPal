import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ingestCompanyDocument, deleteCompanyDocument } from "@/lib/knowledge/ingest";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const documentId = params.id;
    const bizId =
      tenantId;

    const doc = db
      .prepare("SELECT * FROM company_documents WHERE id = ? AND business_id = ?")
      .get(documentId, bizId) as any;

    if (!doc) {
      return NextResponse.json({ success: false, error: "Document not found" }, { status: 404 });
    }

    // Retrieve existing text from chunks
    const chunks = db
      .prepare("SELECT content FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC")
      .all(documentId) as any[];

    const fullText = chunks.map((c) => c.content).join("\n\n");

    // Remove old chunks
    await deleteCompanyDocument(documentId, bizId);

    // Re-ingest
    const result = await ingestCompanyDocument({
      businessId: bizId,
      fileName: doc.file_name,
      title: doc.title,
      mimeType: doc.mime_type,
      content: fullText,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

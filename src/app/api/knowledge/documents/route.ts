import { NextRequest, NextResponse } from "next/server";
import { getCompanyDocuments, ingestCompanyDocument } from "@/lib/knowledge/ingest";
import { getPlatformConfig, getActiveBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bizId =
      searchParams.get("businessId") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    const docs = getCompanyDocuments(bizId);
    return NextResponse.json({ success: true, documents: docs, businessId: bizId });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    const bizId =
      req.headers.get("x-business-id") ||
      getPlatformConfig("active_tenant_id", null) ||
      getActiveBusiness()?.id ||
      DEFAULT_BUSINESS_ID;

    let fileName = "company_document.txt";
    let fileBuffer: Buffer | string = "";
    let title: string | undefined;
    let mimeType = "text/plain";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
      }

      fileName = file.name;
      mimeType = file.type || "text/plain";
      title = (formData.get("title") as string) || undefined;
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    } else {
      const body = await req.json();
      if (!body.content) {
        return NextResponse.json({ success: false, error: "Missing document content" }, { status: 400 });
      }
      fileName = body.fileName || "document.txt";
      title = body.title;
      fileBuffer = body.content;
      mimeType = body.mimeType || "text/plain";
    }

    const result = await ingestCompanyDocument({
      businessId: bizId,
      fileName,
      title,
      mimeType,
      content: fileBuffer,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

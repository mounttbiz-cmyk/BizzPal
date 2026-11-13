import { NextResponse } from "next/server";
import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { parseUploadedContent, ParsedBusinessMetrics } from "@/lib/upload/dataParser";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get current business record
    const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID) as any;

    // 2. Get active upload record
    let activeUpload: any = null;
    try {
      activeUpload = db
        .prepare("SELECT * FROM business_data_uploads WHERE business_id = ? AND active = 1 ORDER BY created_at DESC LIMIT 1")
        .get(DEFAULT_BUSINESS_ID);
    } catch {}

    // 3. Get recent history
    let history: any[] = [];
    try {
      history = db
        .prepare("SELECT id, file_name, file_type, created_at, metrics_summary FROM business_data_uploads WHERE business_id = ? ORDER BY created_at DESC LIMIT 5")
        .all(DEFAULT_BUSINESS_ID);
    } catch {}

    return NextResponse.json({
      success: true,
      business: business
        ? {
            id: business.id,
            name: business.name,
            industry: business.industry,
            industryLabel: business.industry_label,
            founderName: business.founder_name,
            teamSize: business.team_size,
            annualRevenue: business.annual_revenue,
            monthlyRevenue: business.monthly_revenue,
            monthlyBurn: business.monthly_burn,
            cashOnHand: business.cash_on_hand,
            updatedAt: business.updated_at,
          }
        : null,
      activeUpload: activeUpload
        ? {
            id: activeUpload.id,
            fileName: activeUpload.file_name,
            fileType: activeUpload.file_type,
            metrics: JSON.parse(activeUpload.metrics_summary || "{}"),
            createdAt: activeUpload.created_at,
          }
        : null,
      history: history.map(h => ({
        id: h.id,
        fileName: h.file_name,
        fileType: h.file_type,
        createdAt: h.created_at,
        metrics: JSON.parse(h.metrics_summary || "{}"),
      })),
    });
  } catch (error: any) {
    console.error("GET /api/business/upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let metrics: ParsedBusinessMetrics;
    let fileName = "uploaded_data.csv";
    let fileType = "csv";
    let rawContent = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: "No file provided in form data" }, { status: 400 });
      }
      fileName = file.name;
      const isExcel = fileName.toLowerCase().endsWith(".xlsx") || fileName.toLowerCase().endsWith(".xls");
      fileType = fileName.toLowerCase().endsWith(".json") ? "json" : "csv";

      if (isExcel) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(Buffer.from(arrayBuffer), { type: "buffer" });
        const firstSheet = workbook.SheetNames[0];
        if (!firstSheet) {
          return NextResponse.json({ success: false, error: "Excel file has no worksheets" }, { status: 400 });
        }
        rawContent = XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
      } else {
        rawContent = await file.text();
      }

      metrics = parseUploadedContent(rawContent, fileName);
    } else {
      const body = await req.json();
      if (body.rawContent && body.fileName) {
        fileName = body.fileName;
        fileType = fileName.toLowerCase().endsWith(".json") ? "json" : "csv";
        rawContent = body.rawContent;
        metrics = parseUploadedContent(rawContent, fileName);
      } else if (body.metrics) {
        metrics = body.metrics;
        fileName = body.fileName || "manual_entry";
        fileType = body.fileType || "manual";
      } else {
        return NextResponse.json({ success: false, error: "Invalid upload request format" }, { status: 400 });
      }
    }

    const now = new Date().toISOString();
    const uploadId = `upl_${Date.now()}`;

    // Mark previous uploads inactive
    try {
      db.prepare("UPDATE business_data_uploads SET active = 0 WHERE business_id = ?").run(DEFAULT_BUSINESS_ID);
    } catch {}

    // Insert new upload record
    try {
      db.prepare(`
        INSERT INTO business_data_uploads (
          id, business_id, file_name, file_type, metrics_summary, raw_data, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        uploadId,
        DEFAULT_BUSINESS_ID,
        fileName,
        fileType,
        JSON.stringify(metrics),
        rawContent ? JSON.stringify(metrics.rawRowsPreview || []) : null,
        now
      );
    } catch (err: any) {
      console.warn("Failed to record in business_data_uploads:", err.message);
    }

    // Update main business record with uploaded metrics
    const currentBiz = db.prepare("SELECT * FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID) as any;
    const finalName = metrics.name || currentBiz?.name || "My Enterprise";
    const finalIndustry = metrics.industry || currentBiz?.industry || "saas";
    const finalIndustryLabel = metrics.industryLabel || currentBiz?.industry_label || "B2B SaaS & Cloud Platforms";
    const finalFounder = metrics.founderName || currentBiz?.founder_name || "Founder";
    const finalTeamSize = metrics.teamSize ?? currentBiz?.team_size ?? 1;
    const finalMonthlyRev = metrics.monthlyRevenue ?? currentBiz?.monthly_revenue ?? 0;
    const finalAnnualRev = metrics.annualRevenue ?? (finalMonthlyRev * 12);
    const finalBurn = metrics.monthlyBurn ?? currentBiz?.monthly_burn ?? 0;
    const finalCash = metrics.cashOnHand ?? currentBiz?.cash_on_hand ?? 0;

    db.prepare(`
      UPDATE businesses SET
        name = ?,
        industry = ?,
        industry_label = ?,
        founder_name = ?,
        team_size = ?,
        annual_revenue = ?,
        monthly_revenue = ?,
        monthly_burn = ?,
        cash_on_hand = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      finalName,
      finalIndustry,
      finalIndustryLabel,
      finalFounder,
      finalTeamSize,
      finalAnnualRev,
      finalMonthlyRev,
      finalBurn,
      finalCash,
      now,
      DEFAULT_BUSINESS_ID
    );

    return NextResponse.json({
      success: true,
      uploadId,
      fileName,
      metrics: {
        ...metrics,
        name: finalName,
        industry: finalIndustry,
        industryLabel: finalIndustryLabel,
        founderName: finalFounder,
        teamSize: finalTeamSize,
        monthlyRevenue: finalMonthlyRev,
        annualRevenue: finalAnnualRev,
        monthlyBurn: finalBurn,
        cashOnHand: finalCash,
        runwayMonths: finalBurn > 0 ? Number((finalCash / finalBurn).toFixed(1)) : 18,
        revPerHead: finalTeamSize > 0 ? Math.round(finalAnnualRev / finalTeamSize) : finalAnnualRev,
      },
      message: "Business metrics synchronized successfully",
    });
  } catch (error: any) {
    console.error("POST /api/business/upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const now = new Date().toISOString();

    // Deactivate all uploads
    try {
      db.prepare("UPDATE business_data_uploads SET active = 0 WHERE business_id = ?").run(DEFAULT_BUSINESS_ID);
    } catch {}

    // Reset default business values
    db.prepare(`
      UPDATE businesses SET
        name = 'My Enterprise',
        industry = 'saas',
        industry_label = 'B2B SaaS & Cloud Platforms',
        founder_name = 'Founder',
        team_size = 1,
        annual_revenue = 0,
        monthly_revenue = 0,
        monthly_burn = 0,
        cash_on_hand = 0,
        updated_at = ?
      WHERE id = ?
    `).run(now, DEFAULT_BUSINESS_ID);

    return NextResponse.json({
      success: true,
      message: "Restored baseline enterprise business data",
      business: {
        name: "My Enterprise",
        industry: "saas",
        industryLabel: "B2B SaaS & Cloud Platforms",
        founderName: "Founder",
        teamSize: 1,
        annualRevenue: 0,
        monthlyRevenue: 0,
        monthlyBurn: 0,
        cashOnHand: 0,
        runwayMonths: 0,
      },
    });
  } catch (error: any) {
    console.error("DELETE /api/business/upload error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

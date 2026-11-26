import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/platform/audit";
import { ParseError, parseBankStatement, parseTally } from "@/lib/money/parse";
import { listImports, listMovements, monthlyFigures, saveImport, type MoneySource } from "@/lib/money/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;

/** Uploads, month-by-month figures and transactions. ?month=2026-10&q=rent&source=bank filters the transactions. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can see the bank and Tally figures." }, { status: 403 });
  const businessId = getUserBusinessId(auth.email);
  const url = new URL(req.url);
  const source = url.searchParams.get("source");
  return NextResponse.json({
    success: true,
    imports: listImports(businessId),
    months: monthlyFigures(businessId),
    movements: listMovements(businessId, {
      month: url.searchParams.get("month") || undefined,
      q: (url.searchParams.get("q") || "").trim().slice(0, 100) || undefined,
      source: source === "bank" || source === "tally" ? source : undefined,
      limit: 500,
    }),
  });
}

/** Upload a bank statement or a Tally Day Book: multipart form with "file" and "source" (bank | tally). */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can upload bank or Tally files." }, { status: 403 });
  if (!rateLimit(`money-import:${auth.email}`, 30, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "Too many uploads in the last hour. Please wait a little." }, { status: 429 });
  }
  const businessId = getUserBusinessId(auth.email);
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Choose a file to upload." }, { status: 400 });
  }
  const file = form.get("file");
  const source = String(form.get("source") || "") as MoneySource;
  if (source !== "bank" && source !== "tally") return NextResponse.json({ success: false, error: "Say whether this is a bank statement or a Tally export." }, { status: 400 });
  if (!file || typeof file === "string") return NextResponse.json({ success: false, error: "Choose a file to upload." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ success: false, error: "The file is larger than 5 MB. Upload a shorter period." }, { status: 400 });

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const parsed = source === "bank" ? parseBankStatement(buf, file.name) : parseTally(buf, file.name);
    const summary = saveImport({ businessId, source, fileName: file.name, layout: parsed.layout, movements: parsed.movements, skipped: parsed.skipped, actor: auth.email });
    recordAudit({ businessId, actor: auth.email, action: "money.imported", resource: summary.id, detail: { source, rows: summary.rowsRead, added: summary.rowsAdded } });
    return NextResponse.json({ success: true, import: summary, months: monthlyFigures(businessId) });
  } catch (err) {
    if (err instanceof ParseError) return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    console.error("[money import]", (err as Error)?.message);
    return NextResponse.json({ success: false, error: "Could not read this file. Check it is a bank statement or Tally export and try again." }, { status: 400 });
  }
}

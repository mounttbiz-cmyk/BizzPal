import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { recordAudit } from "@/lib/platform/audit";
import { createSource, deleteSource, findSource } from "@/lib/leads/store";
import { LEAD_FIELDS, SheetError, guessMapping, readSheet, syncSheet, type Mapping } from "@/lib/leads/sheet";
import { InboxError, connectInbox } from "@/lib/leads/inbox";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cleanMapping(input: any, headers?: string[]): Mapping {
  const out: Mapping = {};
  for (const f of LEAD_FIELDS) {
    const v = typeof input?.[f] === "string" ? input[f].trim() : "";
    if (v && (!headers || headers.includes(v))) out[f] = v;
  }
  return out;
}

/**
 * Owner only.
 *   { action: "preview", fileId, mimeType }                      -> the sheet's columns, a few rows and a suggested mapping
 *   { action: "sheet", fileId, fileName, mimeType, mapping }      -> connect a Google Sheet of leads (existing rows come in quietly)
 *   { action: "inbox", imapHost? }                                -> read new enquiries from the connected email account
 */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can connect lead sources." }, { status: 403 });
  if (!rateLimit(`lead-sources:${auth.email}`, 30, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please wait a little." }, { status: 429 });
  }
  const businessId = getUserBusinessId(auth.email);
  const b = await req.json().catch(() => ({}));
  try {
    if (b.action === "preview") {
      const { headers, rows } = await readSheet(businessId, String(b.fileId || ""), b.mimeType || undefined);
      return NextResponse.json({ success: true, headers, sample: rows.slice(0, 5), rows: rows.length, mapping: guessMapping(headers) });
    }
    if (b.action === "sheet") {
      const fileId = String(b.fileId || "");
      if (!/^[\w-]{10,200}$/.test(fileId)) return NextResponse.json({ success: false, error: "Pick a sheet first." }, { status: 400 });
      const { headers } = await readSheet(businessId, fileId, b.mimeType || undefined);
      const mapping = cleanMapping(b.mapping, headers);
      if (!mapping.name && !mapping.email && !mapping.phone) {
        return NextResponse.json({ success: false, error: "Choose at least the name, email or phone column." }, { status: 400 });
      }
      // One sheet per business: connecting another replaces it
      const old = findSource(businessId, "google_sheet");
      if (old) deleteSource(businessId, old.id);
      const fileName = String(b.fileName || "Lead sheet").slice(0, 200);
      const src = createSource(businessId, "google_sheet", fileName, { fileId, fileName, mimeType: b.mimeType || "application/vnd.google-apps.spreadsheet", mapping }, auth.email);
      const r = await syncSheet(businessId, src);
      recordAudit({ businessId, actor: auth.email, action: "leads.sheet_connected", resource: src.id, detail: { fileName, rows: r.total } });
      return NextResponse.json({ success: true, added: r.added });
    }
    if (b.action === "inbox") {
      const src = await connectInbox(businessId, { imapHost: typeof b.imapHost === "string" ? b.imapHost : undefined }, auth.email);
      recordAudit({ businessId, actor: auth.email, action: "leads.inbox_connected", resource: src.id, detail: { host: src.config.host } });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    if (err instanceof SheetError || err instanceof InboxError) return NextResponse.json({ success: false, error: err.message }, { status: 400 });
    console.error("[lead sources]", (err as Error)?.message);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

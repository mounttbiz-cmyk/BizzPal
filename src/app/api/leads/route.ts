import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { getEmailAccount } from "@/lib/integrations/emailAccount";
import { getGoogleDriveToken } from "@/lib/integrations/googleDrive";
import { countNew, listLeads, listSources } from "@/lib/leads/store";
import { imapHostFor } from "@/lib/leads/inbox";

export const dynamic = "force-dynamic";

/** Leads and enquiries, the sources they come from, and what can be connected. ?kind=lead|enquiry&status=new|done&q= */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const businessId = getUserBusinessId(auth.email);
  const url = new URL(req.url);
  const kind = url.searchParams.get("kind");
  const status = url.searchParams.get("status");
  const email = getEmailAccount(businessId);
  const drive = await getGoogleDriveToken(businessId).catch(() => ({ connected: false }));
  return NextResponse.json({
    success: true,
    canManage: auth.isOwner,
    leads: listLeads(businessId, {
      kind: kind === "lead" || kind === "enquiry" ? kind : undefined,
      status: status === "new" || status === "done" ? status : undefined,
      q: (url.searchParams.get("q") || "").trim().slice(0, 100) || undefined,
    }),
    counts: countNew(businessId),
    sources: listSources(businessId).map(s => ({
      id: s.id,
      kind: s.kind,
      label: s.label,
      enabled: s.enabled,
      lastSyncedAt: s.lastSyncedAt,
      lastError: s.lastError,
      fileName: s.config.fileName || null,
      mapping: s.config.mapping || null,
      host: s.kind === "email_inbox" ? s.config.host : null,
    })),
    available: {
      googleDrive: Boolean((drive as any).connected),
      email: email ? { fromEmail: email.fromEmail, imapHost: email.sandbox ? null : imapHostFor(email.host) } : null,
    },
  });
}

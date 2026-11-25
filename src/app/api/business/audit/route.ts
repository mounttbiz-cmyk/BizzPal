import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { listAudit, verifyAuditChain } from "@/lib/platform/audit";

export const dynamic = "force-dynamic";

/** The audit trail of the company the owner is working in, and whether it is intact. Owner only. */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can see the audit log." }, { status: 403 });
  const businessId = getUserBusinessId(auth.email);
  const url = new URL(req.url);
  const traceId = url.searchParams.get("trace") || undefined;
  return NextResponse.json({
    success: true,
    events: listAudit(businessId, { limit: 200, traceId }),
    integrity: verifyAuditChain(businessId),
  });
}

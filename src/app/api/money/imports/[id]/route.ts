import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { recordAudit } from "@/lib/platform/audit";
import { deleteImport } from "@/lib/money/store";

export const dynamic = "force-dynamic";

/** Remove an upload and the transactions it added. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can remove uploads." }, { status: 403 });
  const businessId = getUserBusinessId(auth.email);
  if (!deleteImport(businessId, params.id)) return NextResponse.json({ success: false, error: "That upload was not found." }, { status: 404 });
  recordAudit({ businessId, actor: auth.email, action: "money.import_removed", resource: params.id, detail: {} });
  return NextResponse.json({ success: true });
}

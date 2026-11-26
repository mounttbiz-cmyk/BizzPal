import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { recordAudit } from "@/lib/platform/audit";
import { deleteSource, getSource, updateSource } from "@/lib/leads/store";
import { syncSource } from "@/lib/leads/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Check now for new leads or enquiries. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can do this." }, { status: 403 });
  const businessId = getUserBusinessId(auth.email);
  const src = getSource(businessId, params.id);
  if (!src) return NextResponse.json({ success: false, error: "That source was not found." }, { status: 404 });
  try {
    const r = await syncSource(businessId, src);
    return NextResponse.json({ success: true, added: r.added });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message || "Could not check it right now." }, { status: 400 });
  }
}

/** Pause or resume: { enabled } */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can do this." }, { status: 403 });
  const businessId = getUserBusinessId(auth.email);
  const b = await req.json().catch(() => ({}));
  if (typeof b.enabled !== "boolean") return NextResponse.json({ success: false, error: "Say whether it should be on." }, { status: 400 });
  const src = updateSource(businessId, params.id, { enabled: b.enabled });
  if (!src) return NextResponse.json({ success: false, error: "That source was not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}

/** Disconnect the source; the leads it brought in are removed too. */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can do this." }, { status: 403 });
  const businessId = getUserBusinessId(auth.email);
  if (!deleteSource(businessId, params.id)) return NextResponse.json({ success: false, error: "That source was not found." }, { status: 404 });
  recordAudit({ businessId, actor: auth.email, action: "leads.source_removed", resource: params.id, detail: {} });
  return NextResponse.json({ success: true });
}

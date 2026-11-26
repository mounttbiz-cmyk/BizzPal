import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { setLeadStatus } from "@/lib/leads/store";

export const dynamic = "force-dynamic";

/** Mark a lead or enquiry as dealt with, or as new again: { status: "done" | "new" } */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const b = await req.json().catch(() => ({}));
  if (b.status !== "done" && b.status !== "new") return NextResponse.json({ success: false, error: "Choose done or new." }, { status: 400 });
  if (!setLeadStatus(getUserBusinessId(auth.email), params.id, b.status)) {
    return NextResponse.json({ success: false, error: "That lead was not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

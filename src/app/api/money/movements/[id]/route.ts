import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { setCategory } from "@/lib/money/store";

export const dynamic = "force-dynamic";

/** Change a transaction's category: { category } */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isOwner) return NextResponse.json({ success: false, error: "Only the account owner can change categories." }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  try {
    const row = setCategory(getUserBusinessId(auth.email), params.id, String(b.category || ""));
    if (!row) return NextResponse.json({ success: false, error: "That transaction was not found." }, { status: 404 });
    return NextResponse.json({ success: true, movement: row });
  } catch (err) {
    return NextResponse.json({ success: false, error: (err as Error).message }, { status: 400 });
  }
}

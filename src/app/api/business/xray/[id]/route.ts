import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { getXRay } from "@/lib/xray/store";

export const dynamic = "force-dynamic";

/** One X-Ray of the company the person is working in: its progress while running, the report when done. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const xray = getXRay(getUserBusinessId(auth.email), String(params.id || ""));
  if (!xray) return NextResponse.json({ success: false, error: "That X-Ray was not found." }, { status: 404 });
  return NextResponse.json({ success: true, xray });
}

import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { decideApproval } from "@/lib/platform/policy";

export const dynamic = "force-dynamic";

/** The owner approves or rejects one request: { decision: "approve" | "reject" }. Each approval covers one action, once. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  try {
    const b = await body(req);
    if (b.decision !== "approve" && b.decision !== "reject") {
      return NextResponse.json({ success: false, error: "Choose approve or reject." }, { status: 400 });
    }
    const r = decideApproval(a.businessId, params.id, b.decision, a.auth.email);
    if (!r.ok) return NextResponse.json({ success: false, error: r.reason }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err);
  }
}

import { NextResponse } from "next/server";
import { failure, requireAgentUser } from "@/lib/agents/api";
import { listApprovals } from "@/lib/platform/policy";

export const dynamic = "force-dynamic";

/** Approval requests for this company, newest first. ?status=pending for the ones waiting. */
export async function GET(req: Request) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  try {
    const status = new URL(req.url).searchParams.get("status") || undefined;
    return NextResponse.json({ success: true, approvals: listApprovals(a.businessId, status) });
  } catch (err) {
    return failure(err);
  }
}

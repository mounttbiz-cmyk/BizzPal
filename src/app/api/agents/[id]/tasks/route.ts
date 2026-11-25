import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { startTask } from "@/lib/agents/runtime";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Starts a task for an active agent. Its full budget is reserved from the wallet first. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  if (!rateLimit(`agent-task:${a.auth.email}`, 60, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "Too many tasks started in the last hour." }, { status: 429 });
  }
  try {
    const b = await body(req);
    const task = startTask({
      businessId: a.businessId,
      walletBusinessId: a.walletBusinessId,
      agentInstanceId: params.id,
      purpose: String(b.purpose || "").trim() || "Task",
      actor: a.auth.email,
    });
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (err) {
    return failure(err);
  }
}

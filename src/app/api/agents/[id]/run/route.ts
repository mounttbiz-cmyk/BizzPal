import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { startJob } from "@/lib/agents/runtime";
import { aiTierFor } from "@/lib/ai/providers";
import { checkDailyAiLimit } from "@/lib/platform/usage";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * Gives an active agent a job: { instruction }. The task and its credit reservation are created at once and the work
 * runs in the background; poll GET /api/agents/tasks/:taskId for the steps. Owner only.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  if (!rateLimit(`agent-job:${a.auth.email}`, 30, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "Too many jobs in the last hour. Please wait a little." }, { status: 429 });
  }
  try {
    checkDailyAiLimit(a.auth.email);
    const b = await body(req);
    const task = startJob({
      businessId: a.businessId,
      walletBusinessId: a.walletBusinessId,
      agentInstanceId: params.id,
      instruction: String(b.instruction || ""),
      actor: a.auth.email,
      tier: aiTierFor(a.auth.email),
    });
    return NextResponse.json({ success: true, task }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}

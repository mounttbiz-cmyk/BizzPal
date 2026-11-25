import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { finishTask, getTask, runAction, RuntimeError } from "@/lib/agents/runtime";
import { listAudit } from "@/lib/platform/audit";
import { aiTierFor } from "@/lib/ai/providers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** A task with every step recorded under its trace id. */
export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  try {
    const task = getTask(a.businessId, params.taskId);
    if (!task) throw new RuntimeError("That task was not found.", "not_found", 404);
    return NextResponse.json({ success: true, task, trace: listAudit(a.businessId, { traceId: task.traceId, limit: 200 }) });
  } catch (err) {
    return failure(err);
  }
}

/** Asks the agent to take one action within the task: { action, target?, payload?, approvalId? }. */
export async function POST(req: Request, { params }: { params: { taskId: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  try {
    const b = await body(req);
    const outcome = await runAction({
      businessId: a.businessId,
      taskId: params.taskId,
      action: String(b.action || ""),
      target: typeof b.target === "string" ? b.target : undefined,
      payload: b.payload,
      approvalId: typeof b.approvalId === "string" ? b.approvalId : null,
      actor: a.auth.email,
      tier: aiTierFor(a.auth.email),
    });
    const status = outcome.status === "done" ? 200 : outcome.status === "approval_required" ? 202 : 409;
    return NextResponse.json({ success: outcome.status === "done", ...outcome, task: getTask(a.businessId, params.taskId) }, { status });
  } catch (err) {
    return failure(err);
  }
}

/** Ends the task: { outcome: "completed" | "canceled" }. Its actual cost is charged and the rest released. */
export async function PATCH(req: Request, { params }: { params: { taskId: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  try {
    const b = await body(req);
    const outcome = b.outcome === "canceled" ? "canceled" : "completed";
    const task = finishTask(a.businessId, params.taskId, outcome, a.auth.email, typeof b.note === "string" ? b.note : undefined);
    return NextResponse.json({ success: true, task });
  } catch (err) {
    return failure(err);
  }
}

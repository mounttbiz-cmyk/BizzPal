import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { failure, requireAgentUser } from "@/lib/agents/api";
import { getAgent } from "@/lib/agents/lifecycle";
import { agentById } from "@/lib/xray/packs";
import { listApprovals, pendingApprovalCount } from "@/lib/platform/policy";

export const dynamic = "force-dynamic";

/**
 * Approval requests for this company, newest first, with the agent's name and the job each belongs to.
 * ?status=pending for the ones waiting. ?count=1 returns only the number waiting (for the sidebar badge).
 */
export async function GET(req: Request) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("count")) {
      return NextResponse.json({ success: true, pending: pendingApprovalCount(a.businessId) });
    }
    const status = url.searchParams.get("status") || undefined;
    const names = new Map<string, string>();
    const approvals = listApprovals(a.businessId, status).map(ap => {
      let agentName = "";
      if (ap.agentInstanceId) {
        if (!names.has(ap.agentInstanceId)) {
          const inst = getAgent(a.businessId, ap.agentInstanceId);
          names.set(ap.agentInstanceId, (inst && agentById(inst.agentId)?.agent.name) || "Agent");
        }
        agentName = names.get(ap.agentInstanceId)!;
      }
      const job = ap.taskId ? (db.prepare("SELECT purpose, state FROM workflow_tasks WHERE id = ? AND business_id = ?").get(ap.taskId, a.businessId) as any) : null;
      return { ...ap, agentName: agentName || "Agent", job: job ? { purpose: job.purpose, state: job.state } : null };
    });
    return NextResponse.json({ success: true, approvals, canDecide: a.auth.isOwner });
  } catch (err) {
    return failure(err);
  }
}

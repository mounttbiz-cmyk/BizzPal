import { NextResponse } from "next/server";
import { failure, requireAgentUser } from "@/lib/agents/api";
import { getAgent } from "@/lib/agents/lifecycle";
import { agentReport } from "@/lib/agents/report";

export const dynamic = "force-dynamic";

/** What the agents did: ?days=7|30|90, optionally ?agent=<instance id> for one agent. */
export async function GET(req: Request) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  try {
    const url = new URL(req.url);
    const days = Number(url.searchParams.get("days")) || 7;
    const agent = url.searchParams.get("agent") || undefined;
    if (agent && !getAgent(a.businessId, agent)) return NextResponse.json({ success: false, error: "That agent was not found." }, { status: 404 });
    return NextResponse.json({ success: true, report: agentReport({ businessId: a.businessId, walletBusinessId: a.walletBusinessId, days, agentInstanceId: agent }) });
  } catch (err) {
    return failure(err);
  }
}

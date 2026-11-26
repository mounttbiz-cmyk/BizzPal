import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { connectionStatus, createDraft, listAgents } from "@/lib/agents/lifecycle";
import { EVERYDAY_AGENTS, INDUSTRY_PACKS } from "@/lib/xray/packs";
import { walletBalance } from "@/lib/platform/wallet";
import { listApprovals } from "@/lib/platform/policy";

export const dynamic = "force-dynamic";

/** This company's agents, the agents it could add (with what each needs connected), credits and waiting approvals. */
export async function GET(req: Request) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  try {
    return NextResponse.json({
      success: true,
      canManage: a.auth.isOwner,
      agents: listAgents(a.businessId),
      catalogue: [EVERYDAY_AGENTS, ...INDUSTRY_PACKS].map(p => ({
        industry: p.id,
        name: p.name,
        agents: p.agents.map(ag => ({
          id: ag.id,
          name: ag.name,
          job: ag.job,
          guardrails: ag.guardrails,
          approvals: ag.approvals,
          connections: connectionStatus(a.businessId, ag.requires),
        })),
      })),
      wallet: walletBalance(a.walletBusinessId),
      pendingApprovals: listApprovals(a.businessId, "pending").filter(x => x.status === "pending"),
    });
  } catch (err) {
    return failure(err);
  }
}

/** Adds an agent as a draft. Nothing runs until it passes evaluation and the owner activates it. */
export async function POST(req: Request) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  try {
    const b = await body(req);
    const agent = createDraft(a.businessId, String(b.agentId || ""), a.auth.email);
    return NextResponse.json({ success: true, agent });
  } catch (err) {
    return failure(err);
  }
}

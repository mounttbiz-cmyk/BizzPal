import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { activateAgent, AgentError, evaluateAgent, getAgent, pauseAgent, retireAgent, runGates, updateBudget } from "@/lib/agents/lifecycle";
import { listTasks } from "@/lib/agents/runtime";
import { agentById } from "@/lib/xray/packs";

export const dynamic = "force-dynamic";

/** One agent: its state, the gates as they stand right now, its limits and recent tasks. */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  try {
    const agent = getAgent(a.businessId, params.id);
    if (!agent) throw new AgentError("That agent was not found.", 404);
    const def = agentById(agent.agentId);
    return NextResponse.json({
      success: true,
      agent,
      definition: def ? { ...def.agent, industry: def.pack.name } : null,
      checks: runGates(agent, a.walletBusinessId),
      tasks: listTasks(a.businessId, agent.id),
      canManage: a.auth.isOwner,
    });
  } catch (err) {
    return failure(err);
  }
}

/**
 * Lifecycle steps, owner only: { step: "evaluate" | "activate" | "pause" | "retire" } or { budget: {...} }.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  try {
    const b = await body(req);
    const who = a.auth.email;
    let agent;
    if (b.budget && typeof b.budget === "object") agent = updateBudget(a.businessId, params.id, b.budget, who);
    else if (b.step === "evaluate") agent = evaluateAgent(a.businessId, a.walletBusinessId, params.id, who);
    else if (b.step === "activate") agent = activateAgent(a.businessId, a.walletBusinessId, params.id, who);
    else if (b.step === "pause") agent = pauseAgent(a.businessId, params.id, who, String(b.reason || "Paused by the owner"));
    else if (b.step === "retire") agent = retireAgent(a.businessId, params.id, who);
    else throw new AgentError("Unknown step.");
    return NextResponse.json({ success: true, agent });
  } catch (err) {
    return failure(err);
  }
}

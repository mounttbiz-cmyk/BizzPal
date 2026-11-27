import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AGENT_VERSION, recordEvaluation } from "@/lib/agents/lifecycle";
import { EVERYDAY_AGENTS, INDUSTRY_PACKS, agentById } from "@/lib/xray/packs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recent = db
      .prepare("SELECT * FROM agent_evaluations ORDER BY created_at DESC LIMIT 50")
      .all() as any[];
    const allAgents = [
      ...INDUSTRY_PACKS.flatMap(pack =>
        pack.agents.map(a => ({ id: a.id, name: a.name, role: pack.name }))
      ),
      ...EVERYDAY_AGENTS.agents.map(a => ({ id: a.id, name: a.name, role: EVERYDAY_AGENTS.name })),
    ];
    return NextResponse.json({
      success: true,
      version: AGENT_VERSION,
      agents: allAgents,
      evaluations: recent,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Could not load evaluations" }, { status: 500 });
  }
}

/**
 * Platform admin only: record the result of an agent's golden-set or red-team suite (gates G1 and G2) for a
 * version. Until an automated evaluation harness exists, the team records each suite's result here after running it.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const agentId = String(b?.agentId || "");
  const suite = b?.suite === "golden" || b?.suite === "redteam" ? b.suite : null;
  if (!agentById(agentId) || !suite || typeof b?.passed !== "boolean") {
    return NextResponse.json({ success: false, error: "Give agentId, suite (golden or redteam) and passed (true or false)." }, { status: 400 });
  }
  const score = b?.score === undefined || b?.score === null ? null : Number(b.score);
  recordEvaluation(agentId, typeof b?.version === "string" ? b.version : AGENT_VERSION, suite, b.passed, Number.isFinite(score) ? score : null, String(b?.detail || ""));
  return NextResponse.json({ success: true });
}

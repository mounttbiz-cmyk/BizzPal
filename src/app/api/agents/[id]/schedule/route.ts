import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { getAgent } from "@/lib/agents/lifecycle";
import { ScheduleError, deleteSchedule, getSchedule, saveSchedule } from "@/lib/agents/schedule";

export const dynamic = "force-dynamic";

/** The agent's automatic run: { enabled, cadence: "daily" | "weekly", time: "HH:MM" (India time), weekday: 0-6, instruction } */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  if (!getAgent(a.businessId, params.id)) return NextResponse.json({ success: false, error: "That agent was not found." }, { status: 404 });
  return NextResponse.json({ success: true, schedule: getSchedule(a.businessId, params.id) });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  try {
    const b = await body(req);
    const schedule = saveSchedule(
      { businessId: a.businessId, walletBusinessId: a.walletBusinessId, agentInstanceId: params.id, ownerEmail: a.auth.email },
      b
    );
    return NextResponse.json({ success: true, schedule });
  } catch (err) {
    if (err instanceof ScheduleError) return NextResponse.json({ success: false, error: err.message }, { status: err.status });
    return failure(err);
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  if (!getAgent(a.businessId, params.id)) return NextResponse.json({ success: false, error: "That agent was not found." }, { status: 404 });
  deleteSchedule(a.businessId, params.id, a.auth.email);
  return NextResponse.json({ success: true });
}

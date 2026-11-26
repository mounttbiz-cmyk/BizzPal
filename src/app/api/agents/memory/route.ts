import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { getMemory, learnHouseStyle, saveMemory } from "@/lib/agents/memory";
import { aiTierFor } from "@/lib/ai/providers";
import { checkDailyAiLimit } from "@/lib/platform/usage";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** The house style agents write in, learned from the owner's approved emails. */
export async function GET(req: Request) {
  const a = requireAgentUser(req);
  if (a instanceof NextResponse) return a;
  return NextResponse.json({ success: true, memory: getMemory(a.businessId) });
}

/** The owner edits it or switches it on or off: { style?, enabled? } */
export async function PUT(req: Request) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  try {
    const b = await body(req);
    const input: { style?: string; enabled?: boolean } = {};
    if (typeof b.style === "string") input.style = b.style;
    if (typeof b.enabled === "boolean") input.enabled = b.enabled;
    return NextResponse.json({ success: true, memory: saveMemory(a.businessId, input, a.auth.email) });
  } catch (err) {
    return failure(err);
  }
}

/** Learn it again now from the approved emails. */
export async function POST(req: Request) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  if (!rateLimit(`agent-memory:${a.auth.email}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "Please wait a little before learning again." }, { status: 429 });
  }
  try {
    checkDailyAiLimit(a.auth.email);
    const r = await learnHouseStyle(a.businessId, a.auth.email, aiTierFor(a.auth.email));
    if (!r.ok) return NextResponse.json({ success: false, error: r.reason }, { status: 409 });
    return NextResponse.json({ success: true, memory: r.memory });
  } catch (err) {
    return failure(err);
  }
}

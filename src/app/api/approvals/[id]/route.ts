import { NextResponse } from "next/server";
import { body, failure, requireAgentUser } from "@/lib/agents/api";
import { resumeAfterDecision } from "@/lib/agents/runtime";
import { aiTierFor } from "@/lib/ai/providers";
import { decideApproval } from "@/lib/platform/policy";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * The owner approves or rejects one request: { decision: "approve" | "reject", note?, edits? }.
 * edits may change the fields the preview marks as editable (for an email: subject and body); the approval then covers
 * the edited version. Each approval covers one action, once. The job carries on in the background.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const a = requireAgentUser(req, { owner: true });
  if (a instanceof NextResponse) return a;
  if (!rateLimit(`approval-decide:${a.auth.email}`, 120, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "Too many decisions in a short time. Please wait a little." }, { status: 429 });
  }
  try {
    const b = await body(req);
    if (b.decision !== "approve" && b.decision !== "reject") {
      return NextResponse.json({ success: false, error: "Choose approve or reject." }, { status: 400 });
    }
    const edits = b.edits && typeof b.edits === "object" && !Array.isArray(b.edits) ? b.edits : undefined;
    const r = decideApproval(a.businessId, params.id, b.decision, a.auth.email, { note: b.note, edits });
    if (!r.ok) return NextResponse.json({ success: false, error: r.reason }, { status: 409 });
    void resumeAfterDecision(a.businessId, params.id, b.decision, a.auth.email, aiTierFor(a.auth.email)).catch(err =>
      console.warn("[approvals] resume failed:", (err as Error)?.message)
    );
    return NextResponse.json({ success: true, edited: r.edited });
  } catch (err) {
    return failure(err);
  }
}

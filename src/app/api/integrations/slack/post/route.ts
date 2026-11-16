import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { db, getUserBusinessId } from "@/lib/db";
import { safeDecrypt } from "@/lib/integrations/crypto";
import { postToSlack } from "@/lib/integrations/slack";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** POST { text }: sends a message to the Slack channel this business connected. */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));
  const text = String(body?.text || "").trim();
  if (!text) return NextResponse.json({ success: false, error: "Write a message first." }, { status: 400 });
  if (!rateLimit(`slack-post:${auth.email}`, 60, 3_600_000).ok) {
    return NextResponse.json({ success: false, error: "You have posted a lot already. Please try again later." }, { status: 429 });
  }

  const row = db.prepare("SELECT api_key, status FROM integrations WHERE business_id = ? AND tool_key = 'slack'").get(getUserBusinessId(auth.email)) as any;
  if (!row || row.status !== "connected" || !row.api_key) {
    return NextResponse.json({ success: false, error: "Slack isn't connected yet." }, { status: 400 });
  }
  const sent = await postToSlack(safeDecrypt(row.api_key), text);
  if (!sent.ok) return NextResponse.json({ success: false, error: sent.error }, { status: 502 });
  return NextResponse.json({ success: true });
}

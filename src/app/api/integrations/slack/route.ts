import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { db, getUserBusinessId } from "@/lib/db";
import { safeEncrypt } from "@/lib/integrations/crypto";
import { postToSlack, SLACK_WEBHOOK_PATTERN } from "@/lib/integrations/slack";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Connect Slack: POST { webhookUrl }. A test message is posted to the channel first, so "connected" always means it worked. */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  const body = await req.json().catch(() => ({}));
  const webhookUrl = String(body?.webhookUrl || "").trim();
  if (!SLACK_WEBHOOK_PATTERN.test(webhookUrl)) {
    return NextResponse.json({ success: false, error: "That doesn't look like a Slack incoming webhook URL. It starts with https://hooks.slack.com/services/" }, { status: 400 });
  }
  if (!rateLimit(`slack-connect:${auth.email}`, 10, 3_600_000).ok) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const sent = await postToSlack(webhookUrl, "BizzPal is now connected to this channel.");
  if (!sent.ok) return NextResponse.json({ success: false, error: sent.error }, { status: 422 });

  let stored: string;
  try {
    stored = safeEncrypt(webhookUrl);
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "Could not store the connection safely." }, { status: 503 });
  }
  const now = new Date().toISOString();
  const existing = db.prepare("SELECT id FROM integrations WHERE business_id = ? AND tool_key = 'slack'").get(tenantId) as any;
  if (existing) {
    db.prepare("UPDATE integrations SET status = 'connected', api_key = ?, config = ?, updated_at = ? WHERE id = ?")
      .run(stored, JSON.stringify({ verified: true }), now, existing.id);
  } else {
    db.prepare("INSERT INTO integrations (id, business_id, tool_key, name, category, status, api_key, config, updated_at) VALUES (?, ?, 'slack', 'Slack', 'business', 'connected', ?, ?, ?)")
      .run(`int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, tenantId, stored, JSON.stringify({ verified: true }), now);
  }
  return NextResponse.json({ success: true });
}

/** Disconnect Slack and forget the webhook URL. */
export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  db.prepare("UPDATE integrations SET status = 'not_connected', api_key = NULL, config = NULL, updated_at = ? WHERE business_id = ? AND tool_key = 'slack'")
    .run(new Date().toISOString(), getUserBusinessId(auth.email));
  return NextResponse.json({ success: true });
}

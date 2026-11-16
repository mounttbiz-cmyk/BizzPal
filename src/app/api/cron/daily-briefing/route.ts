import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sendAllBriefings } from "@/lib/briefing";
import { appBaseUrl, mailConfigured } from "@/lib/mail";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/**
 * Called by the server's scheduler every morning (see docs/DEPLOYMENT.md):
 *   curl -X POST -H "Authorization: Bearer $CRON_TOKEN" https://your-site/api/cron/daily-briefing
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_TOKEN || "";
  if (secret.length < 16) {
    return NextResponse.json({ error: "CRON_TOKEN is not set (use at least 16 characters)." }, { status: 503 });
  }
  const supplied = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!sameSecret(supplied, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!mailConfigured()) return NextResponse.json({ error: "Email isn't set up on this server." }, { status: 503 });

  const result = await sendAllBriefings(appBaseUrl(req));
  return NextResponse.json({ success: true, ...result });
}

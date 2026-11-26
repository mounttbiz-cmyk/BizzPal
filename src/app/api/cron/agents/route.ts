import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runDueSchedules } from "@/lib/agents/schedule";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/**
 * Starts every scheduled agent run that is due. The app's own scheduler already does this every minute; this route lets
 * an outside cron do it too:
 *   curl -X POST -H "Authorization: Bearer $CRON_TOKEN" https://your-site/api/cron/agents
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_TOKEN || "";
  if (secret.length < 16) {
    return NextResponse.json({ error: "CRON_TOKEN is not set (use at least 16 characters)." }, { status: 503 });
  }
  const supplied = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!sameSecret(supplied, secret)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ success: true, started: runDueSchedules() });
}

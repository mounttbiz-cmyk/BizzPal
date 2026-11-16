import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { getBriefingSetting, sendBriefingTo, setBriefingSetting } from "@/lib/briefing";
import { appBaseUrl, mailConfigured } from "@/lib/mail";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** GET: is the daily briefing on, and can this server send email? */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const setting = getBriefingSetting(getUserBusinessId(auth.email));
  return NextResponse.json({ success: true, enabled: setting.enabled, email: setting.email || auth.email, emailConfigured: mailConfigured() });
}

/** PUT { enabled }: turn the daily briefing on or off. It goes to the signed-in owner's email. */
export async function PUT(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body?.enabled);
  if (enabled && !mailConfigured()) {
    return NextResponse.json({ success: false, error: "Email isn't set up on this server yet, so the briefing can't be sent." }, { status: 503 });
  }
  setBriefingSetting(getUserBusinessId(auth.email), { enabled, email: auth.email });
  return NextResponse.json({ success: true, enabled });
}

/** POST: send today's briefing to the signed-in person right now. */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!rateLimit(`briefing-now:${auth.email}`, 5, 3_600_000).ok) {
    return NextResponse.json({ success: false, error: "You have sent several already. Please try again later." }, { status: 429 });
  }
  if (!mailConfigured()) {
    return NextResponse.json({ success: false, error: "Email isn't set up on this server yet." }, { status: 503 });
  }
  const r = await sendBriefingTo(auth.email, appBaseUrl(req));
  if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 502 });
  return NextResponse.json({ success: true, sentTo: auth.email });
}

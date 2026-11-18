import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getRegisteredUser, getUserBusinessId } from "@/lib/db";
import { appBaseUrl, mailConfigured } from "@/lib/mail";
import { rateLimit } from "@/lib/rateLimit";
import { channelsByIds, youtubeConfigured, YouTubeError } from "@/lib/datapal/youtube";
import { sendOutreach } from "@/lib/datapal/outreach";
import { listSaved, saveChannel } from "@/lib/datapal/youtubeSaved";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

/**
 * POST { channelId, to, subject, body, confirm: true }
 * Sends one email to an address that was found for that creator. The sender is the signed-in person: replies go to them.
 */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!mailConfigured()) return NextResponse.json({ success: false, error: "Email isn't set up on this server yet." }, { status: 503 });
  if (!youtubeConfigured()) return NextResponse.json({ success: false, error: "YouTube search isn't set up yet." }, { status: 503 });
  // Any attempt, even a wrong one, counts towards a loose limit. Real sends have a tighter one below.
  if (!rateLimit(`outreach-try:${auth.email}`, 60, 3_600_000).ok) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please wait a while." }, { status: 429 });
  }

  const b = await req.json().catch(() => ({}));
  const channelId = String(b?.channelId || "");
  const to = String(b?.to || "").trim().toLowerCase();
  const subject = String(b?.subject || "").replace(/\s+/g, " ").trim();
  const body = String(b?.body || "").trim();

  if (b?.confirm !== true) return NextResponse.json({ success: false, error: "Please confirm this is genuine business outreach first." }, { status: 400 });
  if (!CHANNEL_ID.test(channelId)) return NextResponse.json({ success: false, error: "Unknown channel." }, { status: 400 });
  if (subject.length < 3 || subject.length > 120) return NextResponse.json({ success: false, error: "The subject should be 3 to 120 characters." }, { status: 400 });
  if (body.length < 20 || body.length > 2000) return NextResponse.json({ success: false, error: "The message should be 20 to 2000 characters." }, { status: 400 });
  if ((body.match(/https?:\/\//gi) || []).length > 3) return NextResponse.json({ success: false, error: "Please use at most 3 links in the message." }, { status: 400 });

  try {
    // The address must be one we found for this creator. People cannot use this to email arbitrary addresses.
    const [channel] = await channelsByIds([channelId]);
    if (!channel) return NextResponse.json({ success: false, error: "That channel could not be found." }, { status: 404 });
    if (!channel.emails.some(e => e.value.toLowerCase() === to)) {
      return NextResponse.json({ success: false, error: "That address isn't one of the emails found for this creator." }, { status: 400 });
    }

    if (!rateLimit(`outreach-send:${auth.email}`, 5, 3_600_000).ok) {
      return NextResponse.json({ success: false, error: "You have sent several emails in the last hour. Please wait a while." }, { status: 429 });
    }

    const user: any = getRegisteredUser(auth.email);
    const result = await sendOutreach({
      fromEmail: auth.email,
      fromName: String(user?.name || auth.email.split("@")[0]),
      to,
      subject,
      body,
      channelId,
      baseUrl: appBaseUrl(req),
    });
    if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: result.status });

    // Keep track of who has been contacted
    const biz = getUserBusinessId(auth.email);
    const existing = listSaved(biz).find(s => s.channelId === channelId);
    saveChannel(biz, channelId, "contacted", existing?.note || `Emailed ${to}`);

    return NextResponse.json({ success: true, sentToday: result.sentToday, limit: result.limit });
  } catch (e) {
    if (e instanceof YouTubeError) return NextResponse.json({ success: false, error: e.message }, { status: e.code === "quota" ? 429 : 502 });
    console.error("Outreach failed:", e);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

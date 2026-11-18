import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { hasPaidPlan } from "@/lib/ai/providers";
import { rateLimit } from "@/lib/rateLimit";
import { channelsByIds, youtubeConfigured, YouTubeError } from "@/lib/datapal/youtube";
import { draftOutreach, scoreFit } from "@/lib/datapal/youtubeFit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

/**
 * POST { mode: "score", offer, channelIds }  : how well each channel suits what the person is promoting.
 * POST { mode: "draft", offer, channelId }   : a short email and WhatsApp message to open the conversation.
 * The channel facts come from our own saved copy, never from the browser.
 */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  if (!youtubeConfigured()) return NextResponse.json({ success: false, error: "YouTube search isn't set up yet." }, { status: 503 });
  if (!rateLimit(`yt-ai:${auth.email}`, 30, 3_600_000).ok) {
    return NextResponse.json({ success: false, error: "You have used the AI suggestions several times. Please try again in a while." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const offer = String(body?.offer || "").trim();
  if (offer.length < 3) return NextResponse.json({ success: false, error: "Say what you are promoting first, for example “protein supplements for gym-goers”." }, { status: 400 });
  const paid = hasPaidPlan(auth.email);

  try {
    if (body?.mode === "draft") {
      const id = String(body?.channelId || "");
      if (!CHANNEL_ID.test(id)) return NextResponse.json({ success: false, error: "Unknown channel." }, { status: 400 });
      const [channel] = await channelsByIds([id]);
      if (!channel) return NextResponse.json({ success: false, error: "That channel could not be found." }, { status: 404 });
      const draft = await draftOutreach(offer, channel, paid);
      if (!draft) return NextResponse.json({ success: false, error: "The AI couldn't write a message right now. Please try again." }, { status: 502 });
      return NextResponse.json({ success: true, draft });
    }

    const ids: string[] = (Array.isArray(body?.channelIds) ? body.channelIds : []).map(String).filter((i: string) => CHANNEL_ID.test(i)).slice(0, 10);
    if (ids.length === 0) return NextResponse.json({ success: false, error: "No channels to rate." }, { status: 400 });
    const channels = await channelsByIds(ids);
    const scores = await scoreFit(offer, channels, paid);
    if (!scores) return NextResponse.json({ success: false, error: "The AI couldn't rate these right now. Please try again." }, { status: 502 });
    return NextResponse.json({ success: true, scores });
  } catch (e) {
    if (e instanceof YouTubeError) return NextResponse.json({ success: false, error: e.message }, { status: e.code === "quota" ? 429 : 502 });
    console.error("YouTube fit failed:", e);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { consumeDataPalCredits, getDataPalCredits } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { lookupChannels, parseInput, youtubeConfigured, YouTubeError } from "@/lib/datapal/youtube";

export const dynamic = "force-dynamic";

/**
 * POST { query }: a channel link, @handle, channel ID, or keywords.
 * Each channel returned uses one DataPal record. Nothing is charged when nothing is found.
 */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const email = auth.email;

  if (!rateLimit(`yt-ip:${clientIp(req)}`, 40, 10 * 60 * 1000).ok || !rateLimit(`yt-user:${email}`, 15, 10 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "You are searching too fast. Please wait a few minutes." }, { status: 429 });
  }
  if (!youtubeConfigured()) {
    return NextResponse.json({ success: false, code: "not_configured", error: "YouTube search isn't set up yet." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  let input;
  try {
    input = parseInput(String(body?.query || ""));
  } catch (e) {
    return NextResponse.json({ success: false, error: (e as Error).message }, { status: 400 });
  }
  // A keyword search costs YouTube 100 times more than looking up one channel, so it has its own limit.
  if (input.kind === "search" && !rateLimit(`yt-search:${email}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "You have run several keyword searches. Please try again in an hour, or paste a channel link instead." }, { status: 429 });
  }

  const credits = getDataPalCredits(email);
  if (credits.remaining <= 0) {
    return NextResponse.json({ success: false, code: "no_credits", error: "You have used all your DataPal records. Buy credits or upgrade your plan." }, { status: 402 });
  }

  try {
    const { channels, cached } = await lookupChannels(input, Math.min(10, credits.remaining));
    const results = channels.slice(0, credits.remaining);
    const after = consumeDataPalCredits(email, results.length);
    return NextResponse.json({
      success: true,
      kind: input.kind,
      cached,
      results,
      remaining: after.remaining,
      message: results.length === 0 ? "No channel found. Check the link or try other keywords." : undefined,
    });
  } catch (e) {
    if (e instanceof YouTubeError) {
      const status = e.code === "bad_input" ? 400 : e.code === "not_configured" || e.code === "config" ? 503 : e.code === "quota" ? 429 : 502;
      return NextResponse.json({ success: false, code: e.code, error: e.message }, { status });
    }
    console.error("YouTube lookup failed:", e);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

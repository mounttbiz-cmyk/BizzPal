import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { consumeDataPalCredits, getDataPalCredits } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { lookupChannels, parseInput, youtubeConfigured, YouTubeError, type ParsedInput, type YouTubeChannel } from "@/lib/datapal/youtube";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BULK = 20;

/**
 * POST { query } : a channel link, video link, @handle, channel ID, or keywords.
 * POST { queries: [...] } : up to 20 links, @handles or IDs (one per line), no keywords.
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
  const bulk = Array.isArray(body?.queries);
  const rawList: string[] = bulk ? body.queries.map((q: unknown) => String(q || "").trim()).filter(Boolean).slice(0, MAX_BULK) : [String(body?.query || "")];

  const inputs: ParsedInput[] = [];
  const skipped: Array<{ text: string; reason: string }> = [];
  for (const text of rawList) {
    try {
      const parsed = parseInput(text);
      if (bulk && parsed.kind === "search") skipped.push({ text, reason: "Keywords can't be used in a list. Search them on their own." });
      else inputs.push(parsed);
    } catch (e) {
      if (!bulk) return NextResponse.json({ success: false, error: (e as Error).message }, { status: 400 });
      skipped.push({ text, reason: "Not a channel link, video link, @handle or channel ID." });
    }
  }
  if (inputs.length === 0) {
    return NextResponse.json({ success: false, error: bulk ? "None of those lines could be read as a channel." : "Enter a channel link, @handle, channel ID or a few keywords." }, { status: 400 });
  }

  // A keyword search costs YouTube 100 times more than looking up one channel, so it has its own limit.
  if (inputs.some(i => i.kind === "search") && !rateLimit(`yt-search:${email}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json({ success: false, error: "You have run several keyword searches. Please try again in an hour, or paste a channel link instead." }, { status: 429 });
  }

  const credits = getDataPalCredits(email);
  if (credits.remaining <= 0) {
    return NextResponse.json({ success: false, code: "no_credits", error: "You have used all your DataPal records. Buy credits or upgrade your plan." }, { status: 402 });
  }

  try {
    const found: YouTubeChannel[] = [];
    let cached = true;
    let nextPageToken: string | null = null;
    const pageToken = typeof body?.pageToken === "string" && body.pageToken.length < 300 ? body.pageToken : undefined;
    for (const input of inputs) {
      if (found.length >= credits.remaining) break;
      const r = await lookupChannels(input, Math.min(10, credits.remaining - found.length), input.kind === "search" ? pageToken : undefined);
      cached = cached && r.cached;
      if (input.kind === "search") nextPageToken = r.nextPageToken ?? null;
      for (const c of r.channels) if (!found.some(f => f.channelId === c.channelId)) found.push(c);
    }
    const results = found.slice(0, credits.remaining);
    const after = consumeDataPalCredits(email, results.length);
    return NextResponse.json({
      success: true,
      cached,
      results,
      skipped,
      remaining: after.remaining,
      limited: found.length > results.length,
      nextPageToken: results.length > 0 ? nextPageToken : null,
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

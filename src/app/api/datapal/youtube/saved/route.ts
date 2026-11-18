import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { channelsByIds, youtubeConfigured, YouTubeError } from "@/lib/datapal/youtube";
import { listSaved, removeSaved, saveChannel, STATUSES, type SavedStatus } from "@/lib/datapal/youtubeSaved";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

/** GET: the saved shortlist, with each channel's details fetched fresh (no DataPal records are used). */
export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const saved = listSaved(getUserBusinessId(auth.email));
  if (saved.length === 0 || !youtubeConfigured()) return NextResponse.json({ success: true, items: saved.map(s => ({ ...s, channel: null })) });

  let channels: Awaited<ReturnType<typeof channelsByIds>> = [];
  let warning = "";
  try {
    channels = await channelsByIds(saved.map(s => s.channelId));
  } catch (e) {
    warning = e instanceof YouTubeError ? e.message : "Channel details could not be loaded right now.";
  }
  const byId = new Map(channels.map(c => [c.channelId, c]));
  return NextResponse.json({ success: true, warning: warning || undefined, items: saved.map(s => ({ ...s, channel: byId.get(s.channelId) || null })) });
}

/** POST { channelId, status?, note? }: save a channel, or update its status and note. */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  const channelId = String(body?.channelId || "");
  if (!CHANNEL_ID.test(channelId)) return NextResponse.json({ success: false, error: "Unknown channel." }, { status: 400 });
  const status: SavedStatus = (STATUSES as readonly string[]).includes(body?.status) ? body.status : "new";
  const result = saveChannel(getUserBusinessId(auth.email), channelId, status, String(body?.note || ""));
  if (!result.ok) return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}

/** DELETE { channelId } */
export async function DELETE(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = await req.json().catch(() => ({}));
  removeSaved(getUserBusinessId(auth.email), String(body?.channelId || ""));
  return NextResponse.json({ success: true });
}

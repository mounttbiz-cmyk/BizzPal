import { db } from "@/lib/db";

/**
 * YouTube channel lookup for DataPal. Reads PUBLIC channel information through the official YouTube Data API
 * and pulls out the emails and links the creator wrote in the channel description.
 *
 * Cost (the free daily allowance is 10,000 units): looking up a channel is 1 unit, a keyword search is 100.
 * Results are kept for 24 hours so repeat lookups cost nothing, and nothing is kept longer than YouTube allows.
 */

export interface YouTubeChannel {
  channelId: string;
  title: string;
  handle: string | null;
  url: string;
  thumbnail: string | null;
  country: string | null;
  /** null when the channel hides its subscriber count */
  subscribers: number | null;
  videos: number | null;
  views: number | null;
  description: string;
  emails: string[];
  links: Array<{ url: string; label: string }>;
  createdAt: string | null;
}

export type ParsedInput =
  | { kind: "id"; value: string }
  | { kind: "handle"; value: string }
  | { kind: "username"; value: string }
  | { kind: "search"; value: string };

export class YouTubeError extends Error {
  constructor(public code: "not_configured" | "quota" | "config" | "unavailable" | "bad_input", message: string) {
    super(message);
  }
}

const API_BASE = () => (process.env.YOUTUBE_API_BASE || "https://www.googleapis.com/youtube/v3").replace(/\/+$/, "");
const CACHE_HOURS = 24;
const DAILY_UNITS = () => Number(process.env.YOUTUBE_DAILY_UNITS) || 9000;

export const youtubeConfigured = () => Boolean(process.env.YOUTUBE_API_KEY);

// ---------------------------------------------------------------- reading what the person typed

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

/** A channel link, @handle, channel ID or plain keywords. */
export function parseInput(raw: string): ParsedInput {
  const text = String(raw || "").trim();
  if (text.length < 2 || text.length > 200) throw new YouTubeError("bad_input", "Enter a channel link, @handle, channel ID or a few keywords.");
  if (CHANNEL_ID.test(text)) return { kind: "id", value: text };
  if (/^@[A-Za-z0-9._-]{2,60}$/.test(text)) return { kind: "handle", value: text };

  if (/^(https?:\/\/)?([a-z0-9-]+\.)?(youtube\.com|youtu\.be)\b/i.test(text)) {
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "channel" && CHANNEL_ID.test(parts[1] || "")) return { kind: "id", value: parts[1] };
      if (parts[0]?.startsWith("@")) return { kind: "handle", value: decodeURIComponent(parts[0]) };
      if (parts[0] === "user" && parts[1]) return { kind: "username", value: parts[1] };
      if (parts[0] === "c" && parts[1]) return { kind: "search", value: decodeURIComponent(parts[1]) };
    } catch {}
    throw new YouTubeError("bad_input", "That doesn't look like a channel link. Paste a channel link, @handle or channel ID, or type keywords.");
  }
  return { kind: "search", value: text.replace(/\s+/g, " ") };
}

// ---------------------------------------------------------------- finding contact details

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const URLS = /https?:\/\/[^\s<>"')\]]+/g;

export function extractEmails(text: string): string[] {
  const found = (text.match(EMAIL) || [])
    .map(e => e.replace(/[.,;:!?]+$/, "").toLowerCase())
    .filter(e => !/\.(png|jpe?g|gif|webp|svg)$/.test(e));
  return Array.from(new Set(found)).slice(0, 5);
}

const NAMED_HOSTS: Array<[RegExp, string]> = [
  [/instagram\.com/i, "Instagram"],
  [/(twitter\.com|x\.com)/i, "X (Twitter)"],
  [/facebook\.com|fb\.com/i, "Facebook"],
  [/linkedin\.com/i, "LinkedIn"],
  [/t\.me|telegram\.me/i, "Telegram"],
  [/(wa\.me|whatsapp\.com)/i, "WhatsApp"],
  [/(linktr\.ee|beacons\.ai|bio\.link)/i, "Link page"],
];

export function extractLinks(text: string): Array<{ url: string; label: string }> {
  const urls = Array.from(new Set((text.match(URLS) || []).map(u => u.replace(/[.,;:!?]+$/, ""))));
  return urls
    .filter(u => !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/(watch|shorts|playlist)/i.test(u))
    .slice(0, 8)
    .map(url => {
      let host = "";
      try { host = new URL(url).hostname.replace(/^www\./, ""); } catch {}
      return { url, label: NAMED_HOSTS.find(([re]) => re.test(url))?.[1] || host || "Link" };
    });
}

function toChannel(item: any): YouTubeChannel {
  const s = item.snippet || {};
  const st = item.statistics || {};
  const description = String(s.description || "");
  const custom = String(s.customUrl || "");
  const num = (v: any) => (v === undefined || v === null || v === "" ? null : Number(v));
  return {
    channelId: item.id,
    title: String(s.title || "Untitled channel"),
    handle: custom ? (custom.startsWith("@") ? custom : `@${custom}`) : null,
    url: custom.startsWith("@") ? `https://www.youtube.com/${custom}` : `https://www.youtube.com/channel/${item.id}`,
    thumbnail: s.thumbnails?.default?.url || s.thumbnails?.medium?.url || null,
    country: s.country || null,
    subscribers: st.hiddenSubscriberCount ? null : num(st.subscriberCount),
    videos: num(st.videoCount),
    views: num(st.viewCount),
    description: description.slice(0, 600),
    emails: extractEmails(description),
    links: extractLinks(description),
    createdAt: s.publishedAt || null,
  };
}

// ---------------------------------------------------------------- saved results and the daily budget

let ready = false;
function ensureSchema() {
  if (ready) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS youtube_cache (
      cache_key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS youtube_usage (
      day TEXT PRIMARY KEY,
      units INTEGER NOT NULL DEFAULT 0
    );
  `);
  ready = true;
}

function cacheGet<T>(key: string): T | null {
  ensureSchema();
  const row = db.prepare("SELECT payload, fetched_at FROM youtube_cache WHERE cache_key = ?").get(key) as any;
  if (!row || Date.now() - row.fetched_at > CACHE_HOURS * 3_600_000) return null;
  try { return JSON.parse(row.payload) as T; } catch { return null; }
}

function cacheSet(key: string, value: unknown) {
  ensureSchema();
  db.prepare("INSERT INTO youtube_cache (cache_key, payload, fetched_at) VALUES (?, ?, ?) ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, fetched_at = excluded.fetched_at")
    .run(key, JSON.stringify(value), Date.now());
  // YouTube's rules do not allow keeping API data for long, so anything older than 3 days is removed.
  db.prepare("DELETE FROM youtube_cache WHERE fetched_at < ?").run(Date.now() - 3 * 86_400_000);
}

const today = () => new Date().toISOString().slice(0, 10);

function unitsUsedToday(): number {
  ensureSchema();
  return (db.prepare("SELECT units FROM youtube_usage WHERE day = ?").get(today()) as any)?.units || 0;
}

function spend(units: number) {
  ensureSchema();
  db.prepare("INSERT INTO youtube_usage (day, units) VALUES (?, ?) ON CONFLICT(day) DO UPDATE SET units = units + excluded.units").run(today(), units);
  db.prepare("DELETE FROM youtube_usage WHERE day < date('now', '-14 day')").run();
}

// ---------------------------------------------------------------- talking to YouTube

async function callYouTube(path: string, params: Record<string, string>, cost: number): Promise<any> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new YouTubeError("not_configured", "YouTube search isn't set up yet.");
  if (unitsUsedToday() + cost > DAILY_UNITS()) {
    throw new YouTubeError("quota", "YouTube search has reached its limit for today. Please try again tomorrow.");
  }
  const url = new URL(`${API_BASE()}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  let res: Response;
  try {
    res = await fetch(url, { headers: { "x-goog-api-key": key }, signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new YouTubeError("unavailable", "Couldn't reach YouTube. Please try again.");
  }
  if (res.ok) {
    spend(cost);
    return res.json();
  }
  const body: any = await res.json().catch(() => ({}));
  const reason = String(body?.error?.errors?.[0]?.reason || body?.error?.status || "");
  if (/quota|dailyLimit|rateLimit/i.test(reason)) throw new YouTubeError("quota", "YouTube search has reached its limit for today. Please try again tomorrow.");
  if (res.status === 400 || res.status === 403) {
    console.error("YouTube API refused the request:", res.status, reason);
    throw new YouTubeError("config", "YouTube search isn't working right now. Please contact support.");
  }
  throw new YouTubeError("unavailable", "YouTube didn't answer. Please try again.");
}

async function channelsByIds(ids: string[]): Promise<YouTubeChannel[]> {
  const out: YouTubeChannel[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const hit = cacheGet<YouTubeChannel>(`channel:${id}`);
    if (hit) out.push(hit); else missing.push(id);
  }
  if (missing.length > 0) {
    const data = await callYouTube("channels", { part: "snippet,statistics", id: missing.join(","), maxResults: "50" }, 1);
    for (const item of data.items || []) {
      const channel = toChannel(item);
      cacheSet(`channel:${channel.channelId}`, channel);
      out.push(channel);
    }
  }
  // keep the order YouTube ranked them in
  return ids.map(id => out.find(c => c.channelId === id)).filter(Boolean) as YouTubeChannel[];
}

/** Finds channels for what the person typed. `limit` only matters for keyword searches. */
export async function lookupChannels(input: ParsedInput, limit: number): Promise<{ channels: YouTubeChannel[]; cached: boolean }> {
  if (input.kind === "id") {
    const hit = cacheGet<YouTubeChannel>(`channel:${input.value}`);
    return { channels: await channelsByIds([input.value]), cached: Boolean(hit) };
  }

  if (input.kind === "handle" || input.kind === "username") {
    const key = `${input.kind}:${input.value.toLowerCase()}`;
    const cachedId = cacheGet<string>(key);
    if (cachedId) return { channels: await channelsByIds([cachedId]), cached: true };
    const data = await callYouTube("channels", { part: "snippet,statistics", ...(input.kind === "handle" ? { forHandle: input.value } : { forUsername: input.value }) }, 1);
    const item = (data.items || [])[0];
    if (!item) return { channels: [], cached: false };
    const channel = toChannel(item);
    cacheSet(`channel:${channel.channelId}`, channel);
    cacheSet(key, channel.channelId);
    return { channels: [channel], cached: false };
  }

  const key = `search:${input.value.toLowerCase()}`;
  let ids = cacheGet<string[]>(key);
  const wasCached = Boolean(ids);
  if (!ids) {
    const data = await callYouTube("search", { part: "snippet", type: "channel", q: input.value, maxResults: "10" }, 100);
    ids = (data.items || []).map((i: any) => i?.id?.channelId || i?.snippet?.channelId).filter(Boolean);
    cacheSet(key, ids);
  }
  return { channels: await channelsByIds(ids!.slice(0, Math.max(1, limit))), cached: wasCached };
}

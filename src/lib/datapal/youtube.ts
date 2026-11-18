import { db } from "@/lib/db";
import { extractEmails, extractPhones, mergeContacts, type Contact } from "@/lib/datapal/contacts";
import { readCreatorSites } from "@/lib/datapal/contactPages";
import { annotateEmails } from "@/lib/datapal/emailCheck";

/**
 * YouTube channel lookup for DataPal. Reads PUBLIC channel information through the official YouTube Data API,
 * works out how active and engaged the creator is, and pulls out the emails and numbers the creator published
 * (in the channel description or on their own website).
 *
 * Cost (the free daily allowance is 10,000 units): a channel lookup is 1 unit, recent activity adds 2 per new channel,
 * a keyword search is 100. Results are kept for 24 hours so repeat lookups cost nothing.
 */

export interface RecentVideo {
  title: string;
  url: string;
  views: number | null;
  publishedAt: string | null;
}

export interface ChannelActivity {
  lastUploadAt: string | null;
  status: "active" | "recent" | "inactive" | "unknown";
  uploadsPerMonth: number | null;
  /** Average views of the creator's latest videos */
  avgViews: number | null;
  /** (likes + comments) as a percentage of views, averaged over the latest videos. null when likes are hidden */
  engagementPct: number | null;
  /** How many of the latest videos look like paid brand work (#ad, sponsored, promo code...) */
  sponsoredVideos: number;
  sampled: number;
  recent: RecentVideo[];
}

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
  /** The topics the creator tagged the channel with */
  keywords: string[];
  topics: string[];
  /** Written in the description, or found on the creator's own website */
  emails: Contact[];
  phones: Contact[];
  links: Array<{ url: string; label: string }>;
  createdAt: string | null;
  activity: ChannelActivity | null;
}

export type ParsedInput =
  | { kind: "id"; value: string }
  | { kind: "handle"; value: string }
  | { kind: "username"; value: string }
  | { kind: "video"; value: string }
  | { kind: "search"; value: string };

export class YouTubeError extends Error {
  constructor(public code: "not_configured" | "quota" | "config" | "unavailable" | "bad_input", message: string) {
    super(message);
  }
}

const API_BASE = () => (process.env.YOUTUBE_API_BASE || "https://www.googleapis.com/youtube/v3").replace(/\/+$/, "");
const CACHE_HOURS = 24;
const DAILY_UNITS = () => Number(process.env.YOUTUBE_DAILY_UNITS) || 9000;
const CACHE_VERSION = "v2";

export const youtubeConfigured = () => Boolean(process.env.YOUTUBE_API_KEY);

// ---------------------------------------------------------------- reading what the person typed

const CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/** A channel link, video link, @handle, channel ID or plain keywords. */
export function parseInput(raw: string): ParsedInput {
  const text = String(raw || "").trim();
  if (text.length < 2 || text.length > 200) throw new YouTubeError("bad_input", "Enter a channel link, @handle, channel ID or a few keywords.");
  if (CHANNEL_ID.test(text)) return { kind: "id", value: text };
  if (/^@[A-Za-z0-9._-]{2,60}$/.test(text)) return { kind: "handle", value: text };

  if (/^(https?:\/\/)?([a-z0-9-]+\.)?(youtube\.com|youtu\.be)\b/i.test(text)) {
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      const parts = url.pathname.split("/").filter(Boolean);
      if (url.hostname.replace(/^www\./, "") === "youtu.be" && VIDEO_ID.test(parts[0] || "")) return { kind: "video", value: parts[0] };
      if (parts[0] === "watch" && VIDEO_ID.test(url.searchParams.get("v") || "")) return { kind: "video", value: url.searchParams.get("v")! };
      if ((parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") && VIDEO_ID.test(parts[1] || "")) return { kind: "video", value: parts[1] };
      if (parts[0] === "channel" && CHANNEL_ID.test(parts[1] || "")) return { kind: "id", value: parts[1] };
      if (parts[0]?.startsWith("@")) return { kind: "handle", value: decodeURIComponent(parts[0]) };
      if (parts[0] === "user" && parts[1]) return { kind: "username", value: parts[1] };
      if (parts[0] === "c" && parts[1]) return { kind: "search", value: decodeURIComponent(parts[1]) };
    } catch {}
    throw new YouTubeError("bad_input", "That doesn't look like a channel or video link. Paste a channel link, @handle or channel ID, or type keywords.");
  }
  return { kind: "search", value: text.replace(/\s+/g, " ") };
}

// ---------------------------------------------------------------- links

const URLS = /https?:\/\/[^\s<>"')\]]+/g;

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

// ---------------------------------------------------------------- building a channel from YouTube's answer

const num = (v: any) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));

function keywordList(raw: unknown): string[] {
  const out: string[] = [];
  for (const m of Array.from(String(raw || "").matchAll(/"([^"]+)"|(\S+)/g))) {
    const word = (m[1] || m[2] || "").trim();
    if (word && word.length <= 40 && !out.includes(word)) out.push(word);
    if (out.length >= 8) break;
  }
  return out;
}

function topicList(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const names = urls.map(u => {
    try { return decodeURIComponent(String(u).split("/").pop() || "").replace(/_/g, " "); } catch { return ""; }
  }).filter(Boolean);
  return Array.from(new Set(names)).slice(0, 5);
}

function toChannel(item: any): YouTubeChannel {
  const s = item.snippet || {};
  const st = item.statistics || {};
  const description = String(s.description || "");
  const custom = String(s.customUrl || "");
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
    keywords: keywordList(item.brandingSettings?.channel?.keywords),
    topics: topicList(item.topicDetails?.topicCategories),
    emails: extractEmails(description).map(value => ({ value, source: "Description" })),
    phones: extractPhones(description).map(value => ({ value, source: "Description" })),
    links: extractLinks(description),
    createdAt: s.publishedAt || null,
    activity: null,
  };
}

/** Adds the emails and numbers listed on the creator's own website or link page. Never blocks the answer for long. */
async function addSiteContacts(channel: YouTubeChannel): Promise<void> {
  try {
    const found = await Promise.race([
      readCreatorSites(channel.links.map(l => l.url), 2),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 9000)),
    ]);
    if (!found) return;
    channel.emails = mergeContacts(channel.emails, found.emails);
    channel.phones = mergeContacts(channel.phones, found.phones);
  } catch {}
}

// ---------------------------------------------------------------- how active and engaged the creator is

const SPONSORED = /(#ad\b|#sponsored|#paidpromotion|paid promotion|sponsored|in partnership with|in collaboration with|promo code|use code|discount code)/i;

async function addActivity(channel: YouTubeChannel, uploadsPlaylist: string | undefined): Promise<void> {
  if (!uploadsPlaylist) return;
  try {
    const list = await callYouTube("playlistItems", { part: "snippet", playlistId: uploadsPlaylist, maxResults: "10" }, 1);
    const items: any[] = (list.items || []).filter((i: any) => i?.snippet?.resourceId?.videoId);
    if (items.length === 0) {
      channel.activity = { lastUploadAt: null, status: "unknown", uploadsPerMonth: null, avgViews: null, engagementPct: null, sponsoredVideos: 0, sampled: 0, recent: [] };
      return;
    }
    const ids = items.map(i => i.snippet.resourceId.videoId as string);
    const detail = await callYouTube("videos", { part: "snippet,statistics", id: ids.join(","), maxResults: "10" }, 1);
    const byId = new Map<string, any>((detail.items || []).map((v: any) => [v.id, v]));

    const videos = ids.map(id => byId.get(id)).filter(Boolean).map((v: any) => ({
      id: v.id as string,
      title: String(v.snippet?.title || ""),
      description: String(v.snippet?.description || "").slice(0, 400),
      publishedAt: (v.snippet?.publishedAt as string) || null,
      views: num(v.statistics?.viewCount),
      likes: num(v.statistics?.likeCount),
      comments: num(v.statistics?.commentCount),
    }));
    if (videos.length === 0) return;

    const dates = videos.map(v => (v.publishedAt ? new Date(v.publishedAt).getTime() : NaN)).filter(n => !Number.isNaN(n)).sort((a, b) => b - a);
    const last = dates[0] ? new Date(dates[0]).toISOString() : null;
    const ageDays = dates[0] ? (Date.now() - dates[0]) / 86_400_000 : Infinity;
    const status: ChannelActivity["status"] = ageDays <= 30 ? "active" : ageDays <= 90 ? "recent" : Number.isFinite(ageDays) ? "inactive" : "unknown";
    const spanDays = dates.length >= 2 ? (dates[0] - dates[dates.length - 1]) / 86_400_000 : 0;

    // Videos from the last two days are still collecting views, so they are left out of the averages
    const settled = videos.filter(v => v.publishedAt && Date.now() - new Date(v.publishedAt).getTime() > 2 * 86_400_000);
    const base = settled.length > 0 ? settled : videos;
    const withViews = base.filter(v => v.views !== null && v.views > 0);
    const avgViews = withViews.length ? Math.round(withViews.reduce((a, v) => a + (v.views as number), 0) / withViews.length) : null;
    const withLikes = withViews.filter(v => v.likes !== null || v.comments !== null);
    const engagementPct = withLikes.length
      ? Math.round((withLikes.reduce((a, v) => a + (((v.likes || 0) + (v.comments || 0)) / (v.views as number)), 0) / withLikes.length) * 1000) / 10
      : null;

    channel.activity = {
      lastUploadAt: last,
      status,
      uploadsPerMonth: spanDays > 0 ? Math.round(((dates.length - 1) / (spanDays / 30)) * 10) / 10 : null,
      avgViews,
      engagementPct,
      sponsoredVideos: videos.filter(v => SPONSORED.test(`${v.title} ${v.description}`)).length,
      sampled: videos.length,
      recent: videos.slice(0, 5).map(v => ({ title: v.title, url: `https://www.youtube.com/watch?v=${v.id}`, views: v.views, publishedAt: v.publishedAt })),
    };
  } catch (e) {
    // The channel details are still useful without activity, unless the daily limit has been reached
    if (e instanceof YouTubeError && e.code === "quota") return;
  }
}

/** Everything extra we work out for a channel the first time it is fetched. */
async function enrich(channel: YouTubeChannel, uploadsPlaylist: string | undefined): Promise<void> {
  await Promise.all([addSiteContacts(channel), addActivity(channel, uploadsPlaylist)]);
  channel.emails = await annotateEmails(channel.emails);
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

const channelKey = (id: string) => `channel:${CACHE_VERSION}:${id}`;
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

const CHANNEL_PARTS = "snippet,statistics,contentDetails,topicDetails,brandingSettings";

/** Fetches the channels not already saved, adds the extras, and saves them. */
async function fetchFresh(params: Record<string, string>): Promise<YouTubeChannel[]> {
  const data = await callYouTube("channels", { part: CHANNEL_PARTS, ...params }, 1);
  const items: any[] = data.items || [];
  const fresh = items.map(i => ({ channel: toChannel(i), uploads: i.contentDetails?.relatedPlaylists?.uploads as string | undefined }));
  await Promise.all(fresh.map(f => enrich(f.channel, f.uploads)));
  for (const f of fresh) cacheSet(channelKey(f.channel.channelId), f.channel);
  return fresh.map(f => f.channel);
}

/** Channels for a list of IDs, using the saved copy when it is less than a day old. */
export async function channelsByIds(ids: string[]): Promise<YouTubeChannel[]> {
  const known = new Map<string, YouTubeChannel>();
  const missing: string[] = [];
  for (const id of ids) {
    const hit = cacheGet<YouTubeChannel>(channelKey(id));
    if (hit) known.set(id, hit); else missing.push(id);
  }
  for (let i = 0; i < missing.length; i += 50) {
    for (const c of await fetchFresh({ id: missing.slice(i, i + 50).join(","), maxResults: "50" })) known.set(c.channelId, c);
  }
  // keep the order they were asked for
  return ids.map(id => known.get(id)).filter(Boolean) as YouTubeChannel[];
}

/** Finds channels for what the person typed. `limit` only matters for keyword searches. */
export async function lookupChannels(input: ParsedInput, limit: number): Promise<{ channels: YouTubeChannel[]; cached: boolean }> {
  if (input.kind === "id") {
    const hit = cacheGet<YouTubeChannel>(channelKey(input.value));
    return { channels: await channelsByIds([input.value]), cached: Boolean(hit) };
  }

  if (input.kind === "video") {
    const key = `video:${input.value}`;
    let channelId = cacheGet<string>(key);
    const wasCached = Boolean(channelId);
    if (!channelId) {
      const data = await callYouTube("videos", { part: "snippet", id: input.value }, 1);
      channelId = data.items?.[0]?.snippet?.channelId || null;
      if (!channelId) return { channels: [], cached: false };
      cacheSet(key, channelId);
    }
    return { channels: await channelsByIds([channelId]), cached: wasCached };
  }

  if (input.kind === "handle" || input.kind === "username") {
    const key = `${input.kind}:${input.value.toLowerCase()}`;
    const cachedId = cacheGet<string>(key);
    if (cachedId) return { channels: await channelsByIds([cachedId]), cached: true };
    const found = await fetchFresh(input.kind === "handle" ? { forHandle: input.value } : { forUsername: input.value });
    if (found.length === 0) return { channels: [], cached: false };
    cacheSet(key, found[0].channelId);
    return { channels: [found[0]], cached: false };
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

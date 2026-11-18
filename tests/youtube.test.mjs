// DataPal YouTube lookup, tested against a pretend YouTube server and a pretend creator website (never the real ones).
// Start the app with:  YOUTUBE_API_BASE=http://127.0.0.1:2626 YOUTUBE_API_KEY=test-key
// and run the tests with YT_FAKE=1. Two runs are used:
//   1. normal app: the creator's website on this computer must NOT be opened (private addresses are blocked)
//   2. app started with DATAPAL_FETCH_ALLOW_LOCAL=1 and tests run with YT_LOCAL_FETCH=1: the website IS read
// Skipped without YT_FAKE.
import http from "node:http";
import { call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

if (!process.env.YT_FAKE) {
  console.log("SKIP YouTube tests (see the top of tests/youtube.test.mjs)");
  process.exit(0);
}

const LOCAL_FETCH = process.env.YT_LOCAL_FETCH === "1";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const NL = String.fromCharCode(10);
const t = reporter();
const db = openDatabase();
const USER = `yt_user_${Date.now()}@example.test`;
const OTHER = `yt_other_${Date.now()}@example.test`;
const UC = "UC" + "a".repeat(22);
const UC_B = "UC" + "b".repeat(22);
const UC_C = "UC" + "c".repeat(22);
const UC_M = "UC" + "m".repeat(22); // has a manager
const UC_BZ = "UC" + "z".repeat(22); // has a business address and a personal one, no manager
const VIDEO_OF_A = "aaaaaaaaaaa";
const calls = [];
const siteHits = [];
const daysAgo = d => new Date(Date.now() - d * 86_400_000).toISOString();

const NL0 = String.fromCharCode(10);
const MANAGED_DESCRIPTION = [
  "Business enquiries: ceo-personal@gmail.test",
  "Management: Night Media - mgmt@nightmedia.test +91 90000 22222",
  "Instagram https://instagram.com/bigstar",
].join(NL0);
const BUSINESS_DESCRIPTION = [
  "For business enquiries: biz@bigcreator.test",
  "My personal address: me@gmail.test",
].join(NL0);

const DESCRIPTION = [
  "Business: Hello@FitIndia.test.",
  "Call +91 98765 43210 or WhatsApp https://wa.me/919812345678",
  "Instagram https://instagram.com/fitindia",
  "Shop http://127.0.0.1:2627/shop",
  "Telegram https://t.me/fitindia_official",
].join(" ");

const channel = (id, title, description, extra = {}) => ({
  id,
  snippet: { title, description, customUrl: extra.customUrl || "", country: extra.country || "IN", defaultLanguage: extra.lang, publishedAt: "2020-01-01T00:00:00Z", thumbnails: { default: { url: "https://example.test/a.jpg" } } },
  statistics: { subscriberCount: extra.subs || "125000", videoCount: "340", viewCount: "9000000", hiddenSubscriberCount: Boolean(extra.hidden) },
  contentDetails: { relatedPlaylists: { uploads: id === UC ? "UUa" : "UUb" } },
  topicDetails: { topicCategories: id === UC ? ["https://en.wikipedia.org/wiki/Physical_fitness"] : [] },
  brandingSettings: { channel: { keywords: id === UC ? 'fitness "home workouts" yoga' : "" } },
});

// five videos for the busy channel: last 5, 18, 33, 52 and 70 days ago; the newest one is an ad
const VIDEOS = [
  { id: "v1", title: "Morning routine #ad", description: "Sponsored by FitBrand. Use code FIT10", days: 5, views: "40000", likes: "2000", comments: "200" },
  { id: "v2", title: "Home workout plan", description: "No sponsors here", days: 18, views: "30000", likes: "1500", comments: "100" },
  { id: "v3", title: "Yoga for beginners", description: "", days: 33, views: "20000", likes: "800", comments: "50" },
  { id: "v4", title: "Diet myths", description: "", days: 52, views: "10000", likes: "400", comments: "50" },
  { id: "v5", title: "Gym tour", description: "", days: 70, views: "50000", likes: "1000", comments: "100" },
];

const fakeYouTube = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  calls.push({ path: url.pathname, key: req.headers["x-goog-api-key"] });
  res.setHeader("Content-Type", "application/json");
  if (req.headers["x-goog-api-key"] !== "test-key") { res.statusCode = 403; return res.end(JSON.stringify({ error: { errors: [{ reason: "keyInvalid" }] } })); }

  if (url.pathname.endsWith("/search")) {
    if (url.searchParams.get("pageToken") === "PAGE2") return res.end(JSON.stringify({ items: [{ id: { channelId: UC_C } }] }));
    return res.end(JSON.stringify({ items: [{ id: { channelId: UC } }, { id: { channelId: UC_B } }], nextPageToken: "PAGE2" }));
  }

  if (url.pathname.endsWith("/playlistItems")) {
    if (url.searchParams.get("playlistId") !== "UUa") return res.end(JSON.stringify({ items: [] }));
    return res.end(JSON.stringify({ items: VIDEOS.map(v => ({ snippet: { resourceId: { videoId: v.id }, publishedAt: daysAgo(v.days), title: v.title } })) }));
  }

  if (url.pathname.endsWith("/videos")) {
    const ids = (url.searchParams.get("id") || "").split(",").filter(Boolean);
    if (ids[0] === VIDEO_OF_A) return res.end(JSON.stringify({ items: [{ id: VIDEO_OF_A, snippet: { channelId: UC } }] }));
    return res.end(JSON.stringify({ items: ids.map(id => VIDEOS.find(v => v.id === id)).filter(Boolean).map(v => ({
      id: v.id, snippet: { title: v.title, description: v.description, publishedAt: daysAgo(v.days) }, statistics: { viewCount: v.views, likeCount: v.likes, commentCount: v.comments },
    })) }));
  }

  if (url.pathname.endsWith("/channels")) {
    if (url.searchParams.get("forHandle") === "@nobody") return res.end(JSON.stringify({ items: [] }));
    const ids = (url.searchParams.get("id") || "").split(",").filter(Boolean);
    const list = ids.length === 0 ? [UC] : ids;
    return res.end(JSON.stringify({ items: list.map(id => id === UC
      ? channel(id, "Fit India", DESCRIPTION, { customUrl: "@fitindia", lang: "hi" })
      : id === UC_M ? channel(id, "Big Creator", MANAGED_DESCRIPTION, { customUrl: "@bigstar" })
      : id === UC_BZ ? channel(id, "Business Creator", BUSINESS_DESCRIPTION, { customUrl: "@bizcreator" })
      : id === UC_C ? channel(id, "Third Channel", "Third one", { country: "IN" })
      : channel(id, "Quiet Channel", "Contact: team@gmail.com", { hidden: true, country: "US" })) }));
  }
  res.statusCode = 404; res.end("{}");
});

const fakeSite = http.createServer((req, res) => {
  siteHits.push(req.url);
  res.setHeader("Content-Type", req.url === "/robots.txt" ? "text/plain" : "text/html");
  if (req.url === "/robots.txt") return res.end(["User-agent: *", "Disallow: /secret"].join(NL));
  if (req.url === "/tg/fitindia_official") return res.end('<html><head><meta property="og:description" content="Business enquiries: tg-biz@fitindia.test or call +91 99999 88888"></head><body></body></html>');
  if (req.url === "/shop") return res.end("<html><body><h1>Fit India shop</h1><p>Buy things.</p></body></html>");
  if (req.url === "/contact") return res.end('<html><body><a href="mailto:booking@fitindia.test?subject=Hi">Book us</a> <a href="tel:+919000011111">Call</a> sales [at] fitindia [dot] test</body></html>');
  res.statusCode = 404; res.end("not found");
});

await new Promise(r => fakeYouTube.listen(2626, "127.0.0.1", r));
await new Promise(r => fakeSite.listen(2627, "127.0.0.1", r));

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [USER, OTHER]) {
    del("DELETE FROM registered_users WHERE email = ?", e);
    del("DELETE FROM datapal_credits WHERE account_email = ?", e);
    del("DELETE FROM youtube_saved WHERE business_id = ?", "biz_" + e.replace(/[^a-zA-Z0-9]/g, "_"));
    del("DELETE FROM outreach_log WHERE user_email = ?", e);
  }
  del("DELETE FROM email_suppressions WHERE email IN (?, ?)", "hello@fitindia.test", "team@gmail.com");
  del("DELETE FROM outreach_log WHERE to_email IN (?, ?)", "hello@fitindia.test", "team@gmail.com");
  del("DELETE FROM youtube_cache");
  del("DELETE FROM youtube_usage");
}
cleanup();

try {
  t.check("not signed in -> 401", (await call("/api/datapal/youtube", { method: "POST", body: { query: "x" } })).status === 401);
  t.check("not signed in -> 401 (AI)", (await call("/api/datapal/youtube/fit", { method: "POST", body: {} })).status === 401);
  t.check("not signed in -> 401 (saved list)", (await call("/api/datapal/youtube/saved")).status === 401);
  for (const e of [USER, OTHER]) await call("/api/auth/register", { method: "POST", body: { email: e, name: "Y", password: "YouTubeTest123!" } });
  const cookie = sessionToken(USER);
  const ask = body => call("/api/datapal/youtube", { method: "POST", cookie, body });
  const credits = async () => (await call("/api/datapal/credits", { cookie })).json?.status?.remainingQuota;

  t.check("a too-short query is refused", (await ask({ query: "a" })).status === 400);
  t.check("a YouTube link that is neither a channel nor a video is refused", (await ask({ query: "https://youtube.com/feed/trending" })).status === 400);

  const before = await credits();
  const byHandle = await ask({ query: "https://www.youtube.com/@fitindia" });
  t.check("lookup by link works", byHandle.status === 200 && byHandle.json?.results?.length === 1);
  const c = byHandle.json?.results?.[0];
  t.check("the channel's details are returned", c?.title === "Fit India" && c?.subscribers === 125000 && c?.country === "IN" && c?.handle === "@fitindia");
  t.check("the email in the description is found (and lowercased)", c?.emails?.some(e => e.value === "hello@fitindia.test" && e.source === "Description"));
  t.check("a role address like hello@ is labelled a business address", c?.emails?.find(e => e.value === "hello@fitindia.test")?.kind === "business");
  t.check("an address on a domain that does not exist is never marked as able to receive mail", c?.emails?.find(e => e.value === "hello@fitindia.test")?.deliverable !== true);
  t.check("phone numbers in the description are found and tidied", c?.phones?.some(p => p.value === "+91 98765 43210"));
  t.check("a WhatsApp link in the description gives a phone number", c?.phones?.some(p => p.value === "+91 98123 45678"));
  t.check("links are found and named", c?.links?.some(l => l.label === "Instagram") && c?.links?.some(l => l.url === "http://127.0.0.1:2627/shop"));
  t.check("the key goes in a header, not the web address", calls.every(x => x.key === "test-key"));
  t.check("niche tags come from the channel's own keywords", JSON.stringify(c?.keywords) === JSON.stringify(["fitness", "home workouts", "yoga"]));
  t.check("topics come from YouTube's topic list", c?.topics?.includes("Physical fitness"));
  t.check("the channel's language is named", c?.language === "Hindi", String(c?.language));
  t.check("social profiles linked in the description are listed", c?.socials?.some(x => x.platform === "Instagram" && x.handle === "@fitindia") && c?.socials?.some(x => x.platform === "Telegram" && x.handle === "@fitindia_official"));

  const act = c?.activity;
  t.check("the channel is marked active (last upload 5 days ago)", act?.status === "active");
  t.check("the last upload date is the newest video", act && Math.abs(Date.now() - new Date(act.lastUploadAt).getTime() - 5 * 86_400_000) < 2 * 86_400_000);
  t.check("average views come from the latest videos", act?.avgViews === 30000, String(act?.avgViews));
  t.check("engagement is likes plus comments over views", act?.engagementPct > 4 && act?.engagementPct < 8, String(act?.engagementPct));
  t.check("one of the latest videos is spotted as a paid brand deal", act?.sponsoredVideos === 1 && act?.sampled === 5);
  t.check("the latest videos are listed", act?.recent?.length === 5 && act.recent[0].title === "Morning routine #ad");
  t.check("uploads per month is worked out", typeof act?.uploadsPerMonth === "number" && act.uploadsPerMonth > 1);

  const afterOne = await credits();
  t.check("one record was used", typeof before === "number" && before - afterOne === 1, `${before} -> ${afterOne}`);

  if (LOCAL_FETCH) {
    t.check("the creator's website was opened and its contact page read", siteHits.includes("/shop") && siteHits.includes("/contact"));
    t.check("the website's robots.txt was checked", siteHits.includes("/robots.txt"));
    t.check("an email from the website (mailto link) is added with its source", c?.emails?.some(e => e.value === "booking@fitindia.test" && e.source === "127.0.0.1"));
    t.check("an email written as 'name [at] site [dot] test' is found", c?.emails?.some(e => e.value === "sales@fitindia.test"));
    t.check("a phone number from a tel: link on the website is added", c?.phones?.some(p => p.value === "+91 90000 11111"));
    t.check("pages the site disallows were not opened", !siteHits.includes("/secret"));
    t.check("the creator's public Telegram bio was read for an email", c?.emails?.some(e => e.value === "tg-biz@fitindia.test" && e.source === "Telegram @fitindia_official"));
    t.check("and for a phone number", c?.phones?.some(p => p.value === "+91 99999 88888"));
  } else {
    t.check("the website on this computer was NOT opened (private addresses are blocked)", siteHits.length === 0, JSON.stringify(siteHits));
    t.check("so nothing from it was added", !c?.emails?.some(e => e.source !== "Description"));
  }

  const callsBefore = calls.length;
  const again = await ask({ query: "@fitindia" });
  t.check("the same channel again comes from the saved copy (no new YouTube call)", again.status === 200 && again.json?.results?.length === 1 && calls.length === callsBefore);
  t.check("a channel that does not exist returns nothing", (await ask({ query: "@nobody" })).json?.results?.length === 0);
  t.check("lookup by channel ID works", (await ask({ query: UC })).json?.results?.[0]?.channelId === UC);

  // a creator who lists a manager: only the manager is shown
  const managed = (await ask({ query: UC_M })).json?.results?.[0];
  t.check("a named manager's email is shown", managed?.emails?.some(e => e.value === "mgmt@nightmedia.test" && e.role === "manager" && e.label === "Management"));
  t.check("a named manager's phone number is shown", managed?.phones?.some(p => p.value === "+91 90000 22222" && p.role === "manager"));
  t.check("when there is a manager, the creator's other emails are hidden", managed?.emails?.length === 1 && !managed.emails.some(e => e.value === "ceo-personal@gmail.test"));
  t.check("the card is marked as a management contact, with the agency name the creator wrote", managed?.management?.name === "Night Media", JSON.stringify(managed?.management));

  // a creator with a business address but no manager: business first, nothing hidden
  const biz = (await ask({ query: UC_BZ })).json?.results?.[0];
  t.check("with no manager the card is not marked as management", biz?.management === null);
  t.check("a business-labelled address comes first, with the creator's own label", biz?.emails?.[0]?.value === "biz@bigcreator.test" && biz.emails[0].role === "business" && biz.emails[0].label === "Business enquiries");
  t.check("and the personal address is still shown after it", biz?.emails?.some(e => e.value === "me@gmail.test" && !e.role));
  t.check("a creator who lists nothing gets no invented manager", c?.management === null);

  const byVideo = await ask({ query: `https://youtu.be/${VIDEO_OF_A}` });
  t.check("a video link finds the channel that made it", byVideo.status === 200 && byVideo.json?.results?.[0]?.channelId === UC);
  t.check("a watch?v= video link also works", (await ask({ query: `https://www.youtube.com/watch?v=${VIDEO_OF_A}` })).json?.results?.[0]?.channelId === UC);

  const search = await ask({ query: "fitness creators india" });
  t.check("keyword search returns channels", search.status === 200 && search.json?.results?.length === 2);
  t.check("hidden subscriber counts are shown as hidden (null)", search.json?.results?.some(r => r.subscribers === null));
  const quiet = search.json?.results?.find(r => r.title === "Quiet Channel");
  t.check("a free-mail address is labelled personal", quiet?.emails?.[0]?.kind === "business" || quiet?.emails?.[0]?.kind === "personal");
  t.check("a channel with no uploads has no activity numbers", !quiet?.activity || quiet.activity.sampled === 0);
  t.check("a channel with no phone listed has an empty phone list", quiet?.phones?.length === 0);
  t.check("a keyword search says there are more results", search.json?.nextPageToken === "PAGE2");
  const more = await ask({ query: "fitness creators india", pageToken: "PAGE2" });
  t.check("'load more' returns the next channels", more.status === 200 && more.json?.results?.length === 1 && more.json.results[0].channelId === UC_C);
  t.check("and has no further page", !more.json?.nextPageToken);

  // a list of channels
  const bulkBefore = await credits();
  const bulk = await ask({ queries: ["@fitindia", `https://www.youtube.com/channel/${UC_B}`, "some keywords", "!!!"] });
  t.check("a list returns each channel once", bulk.status === 200 && bulk.json?.results?.length === 2);
  t.check("keywords inside a list are skipped, not searched", bulk.json?.skipped?.some(s => s.text === "some keywords"));
  t.check("each channel in the list used one record", (await credits()) === bulkBefore - 2, `${bulkBefore} -> ${await credits()}`);
  t.check("a list with nothing readable is refused", (await ask({ queries: ["???", "!!!"] })).status === 400);

  // AI endpoints: only the checks that do not depend on an AI answer
  const fit = body => call("/api/datapal/youtube/fit", { method: "POST", cookie, body });
  t.check("AI rating needs to know what is being promoted", (await fit({ mode: "score", offer: "", channelIds: [UC] })).status === 400);
  t.check("AI rating refuses made-up channel IDs", (await fit({ mode: "score", offer: "protein", channelIds: ["../../x"] })).status === 400);
  t.check("AI message refuses a made-up channel ID", (await fit({ mode: "draft", offer: "protein", channelId: "nope" })).status === 400);

  // Optional: look at what the real AI says (set YT_TRY_AI=1). Not a pass/fail check, because AI answers vary.
  if (process.env.YT_TRY_AI) {
    const s = await fit({ mode: "score", offer: "protein supplements for gym-goers in India", channelIds: [UC, UC_B] });
    console.log("AI score:", s.status, JSON.stringify(s.json));
    const d = await fit({ mode: "draft", offer: "protein supplements for gym-goers in India", channelId: UC });
    console.log("AI draft:", d.status, JSON.stringify(d.json));
  }

  // saved list
  const saved = body => call("/api/datapal/youtube/saved", { method: "POST", cookie, body });
  t.check("saving a made-up channel ID is refused", (await saved({ channelId: "nope" })).status === 400);
  t.check("a channel can be saved", (await saved({ channelId: UC, status: "new", note: "" })).json?.success === true);
  t.check("its status and note can be updated", (await saved({ channelId: UC, status: "contacted", note: "asked for rates" })).json?.success === true);
  const list = await call("/api/datapal/youtube/saved", { cookie });
  const item = list.json?.items?.find(i => i.channelId === UC);
  t.check("the saved list shows status, note and fresh details", item?.status === "contacted" && item?.note === "asked for rates" && item?.channel?.title === "Fit India");
  t.check("opening the saved list costs no records", (await credits()) === bulkBefore - 2);
  t.check("another account does not see this saved list", !(await call("/api/datapal/youtube/saved", { cookie: sessionToken(OTHER) })).json?.items?.some(i => i.channelId === UC));
  t.check("the saved list only keeps the ID, status and note (no channel data stored)",
    JSON.stringify(Object.keys(db.prepare("SELECT * FROM youtube_saved LIMIT 1").get() || {}).sort()) === JSON.stringify(["business_id", "channel_id", "note", "saved_at", "status"]));
  await call("/api/datapal/youtube/saved", { method: "DELETE", cookie, body: { channelId: UC } });
  t.check("a saved channel can be removed", !(await call("/api/datapal/youtube/saved", { cookie })).json?.items?.some(i => i.channelId === UC));

  // ---------- emailing a creator (needs the app started with SMTP_* pointing at the test mail server, and MAIL_SINK) ----------
  if (process.env.MAIL_SINK) {
    const { readFileSync } = await import("node:fs");
    const sink = () => readFileSync(process.env.MAIL_SINK, "utf8").split("=" + NL).join("").replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    const send = body => call("/api/datapal/youtube/outreach", { method: "POST", cookie, body });
    const good = { channelId: UC, to: "hello@fitindia.test", subject: "Collaboration idea", body: "Hi, we sell protein for gym-goers and would love to work with you. Could we talk this week?", confirm: true };

    t.check("outreach: not signed in -> 401", (await call("/api/datapal/youtube/outreach", { method: "POST", body: good })).status === 401);
    t.check("outreach: needs the confirmation tick", (await send({ ...good, confirm: false })).status === 400);
    t.check("outreach: refuses an address that was not found for the creator", (await send({ ...good, to: "someone.else@example.test" })).status === 400);
    t.check("outreach: refuses a very short message", (await send({ ...good, body: "Hi" })).status === 400);
    t.check("outreach: refuses too many links", (await send({ ...good, body: "Look at http://a.test http://b.test http://c.test http://d.test please reply soon" })).status === 400);

    const sent = await send(good);
    t.check("outreach: an email to a found address is sent", sent.status === 200 && sent.json?.success === true, JSON.stringify(sent.json));
    await new Promise(r => setTimeout(r, 800));
    const mail = sink();
    t.check("outreach: it went to the creator's address", mail.includes("RCPT TO:<hello@fitindia.test>"));
    t.check("outreach: replies go to the sender", mail.includes("Reply-To: " + USER) || mail.includes("Reply-To: <" + USER + ">"));
    t.check("outreach: it is sent in the sender's name 'via BizzPal'", /From: .*via BizzPal/i.test(mail));
    t.check("outreach: it says who sent it and has an unsubscribe link", mail.includes("written and sent by") && mail.includes("/api/outreach/unsubscribe?t="));
    t.check("outreach: it carries the one-click unsubscribe header", mail.includes("List-Unsubscribe-Post: List-Unsubscribe=One-Click"));
    t.check("outreach: the same address cannot be emailed again within two weeks", (await send(good)).status === 409);
    t.check("outreach: the creator is marked as contacted in the saved list",
      (await call("/api/datapal/youtube/saved", { cookie })).json?.items?.find(i => i.channelId === UC)?.status === "contacted");

    // unsubscribe: another found address, then it is never emailed again
    const other = { ...good, channelId: UC_B, to: "team@gmail.com" };
    t.check("outreach: a second creator can be emailed", (await send(other)).status === 200);
    await new Promise(r => setTimeout(r, 800));
    const links = Array.from(sink().matchAll(/unsubscribe[?]t=([A-Za-z0-9_.-]+)/g));
    const token = links[links.length - 1]?.[1];
    t.check("outreach: a tampered unsubscribe link is refused", (await fetch(BASE_URL + "/api/outreach/unsubscribe?t=" + token + "x")).status === 400);
    t.check("outreach: the real unsubscribe link works", (await fetch(BASE_URL + "/api/outreach/unsubscribe?t=" + token)).status === 200);
    db.prepare("DELETE FROM outreach_log WHERE to_email = ?").run("team@gmail.com");
    const blocked = await send(other);
    t.check("outreach: after unsubscribing, that address is never emailed again", blocked.status === 409 && /not to be emailed/.test(blocked.json?.error || ""), JSON.stringify(blocked.json));
  } else {
    console.log("SKIP outreach email checks (set MAIL_SINK and start the app with SMTP_* pointing at the test mail server)");
  }

  db.prepare("INSERT INTO datapal_credits (account_email, used, addon, updated_at) VALUES (?, 100000, 0, ?) ON CONFLICT(account_email) DO UPDATE SET used = 100000").run(USER, new Date().toISOString());
  t.check("with no records left it asks to buy more (402)", (await ask({ query: "@fitindia" })).status === 402);
} finally {
  fakeYouTube.close();
  fakeSite.close();
  cleanup();
}
process.exit(t.done() ? 0 : 1);

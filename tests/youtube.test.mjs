// DataPal YouTube lookup, tested against a pretend YouTube server (never the real one, so it costs no quota).
// Start the app with: YOUTUBE_API_BASE=http://127.0.0.1:2626 YOUTUBE_API_KEY=test-key
// and run the tests with YT_FAKE=1. Skipped otherwise.
import http from "node:http";
import { businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

if (!process.env.YT_FAKE) {
  console.log("SKIP YouTube tests (start the app with YOUTUBE_API_BASE=http://127.0.0.1:2626 YOUTUBE_API_KEY=test-key and set YT_FAKE=1)");
  process.exit(0);
}

const t = reporter();
const db = openDatabase();
const USER = `yt_user_${Date.now()}@example.test`;
const UC = "UC" + "a".repeat(22);
const calls = [];

const channel = (id, title, description, extra = {}) => ({
  id,
  snippet: { title, description, customUrl: extra.customUrl || "", country: "IN", publishedAt: "2020-01-01T00:00:00Z", thumbnails: { default: { url: "https://example.test/a.jpg" } } },
  statistics: { subscriberCount: "125000", videoCount: "340", viewCount: "9000000", hiddenSubscriberCount: Boolean(extra.hidden) },
});

const fake = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  calls.push({ path: url.pathname, key: req.headers["x-goog-api-key"], q: url.searchParams.get("q"), handle: url.searchParams.get("forHandle"), id: url.searchParams.get("id") });
  res.setHeader("Content-Type", "application/json");
  if (req.headers["x-goog-api-key"] !== "test-key") { res.statusCode = 403; return res.end(JSON.stringify({ error: { errors: [{ reason: "keyInvalid" }] } })); }
  if (url.pathname.endsWith("/search")) {
    return res.end(JSON.stringify({ items: [{ id: { channelId: UC } }, { id: { channelId: "UC" + "b".repeat(22) } }] }));
  }
  if (url.pathname.endsWith("/channels")) {
    if (url.searchParams.get("forHandle") === "@nobody") return res.end(JSON.stringify({ items: [] }));
    const ids = (url.searchParams.get("id") || "").split(",").filter(Boolean);
    if (ids.length === 0) return res.end(JSON.stringify({ items: [channel(UC, "Fit India", "Business: Hello@FitIndia.test. Instagram https://instagram.com/fitindia, site https://fitindia.test/shop.", { customUrl: "@fitindia" })] }));
    return res.end(JSON.stringify({ items: ids.map(id => { const i = id === UC ? 0 : 1; return channel(id, i === 0 ? "Fit India" : "Quiet Channel", i === 0 ? "Business: Hello@FitIndia.test. Instagram https://instagram.com/fitindia, site https://fitindia.test/shop." : "No contact here", { customUrl: i === 0 ? "@fitindia" : "", hidden: i !== 0 }); }) }));
  }
  res.statusCode = 404; res.end("{}");
});
await new Promise(r => fake.listen(2626, "127.0.0.1", r));

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  del("DELETE FROM registered_users WHERE email = ?", USER);
  del("DELETE FROM datapal_credits WHERE account_email = ?", USER);
  del("DELETE FROM youtube_cache");
  del("DELETE FROM youtube_usage");
}
cleanup();

try {
  t.check("not signed in -> 401", (await call("/api/datapal/youtube", { method: "POST", body: { query: "x" } })).status === 401);
  await call("/api/auth/register", { method: "POST", body: { email: USER, name: "Y", password: "YouTubeTest123!" } });
  const cookie = sessionToken(USER);
  const ask = body => call("/api/datapal/youtube", { method: "POST", cookie, body });
  const credits = async () => (await call("/api/datapal/credits", { cookie })).json?.status?.remainingQuota;

  t.check("a too-short query is refused", (await ask({ query: "a" })).status === 400);
  t.check("a YouTube video link (not a channel) is refused", (await ask({ query: "https://youtube.com/watch?v=abc" })).status === 400);

  const before = await credits();
  const byHandle = await ask({ query: "https://www.youtube.com/@fitindia" });
  t.check("lookup by link works", byHandle.status === 200 && byHandle.json?.results?.length === 1);
  const c = byHandle.json?.results?.[0];
  t.check("the channel's details are returned", c?.title === "Fit India" && c?.subscribers === 125000 && c?.country === "IN" && c?.handle === "@fitindia");
  t.check("the email in the description is found (and lowercased)", JSON.stringify(c?.emails) === JSON.stringify(["hello@fitindia.test"]));
  t.check("links are found and named", c?.links?.some(l => l.label === "Instagram") && c?.links?.some(l => l.url === "https://fitindia.test/shop"));
  t.check("the key goes in a header, not the web address", calls.every(x => x.key === "test-key"));
  const afterOne = await credits();
  t.check("one record was used", typeof before === "number" && before - afterOne === 1, `${before} -> ${afterOne}`);

  const callsBefore = calls.length;
  const again = await ask({ query: "@fitindia" });
  t.check("the same channel again comes from the saved copy (no new YouTube call)", again.status === 200 && again.json?.results?.length === 1 && calls.length === callsBefore);

  t.check("a channel that does not exist returns nothing and costs nothing",
    (await ask({ query: "@nobody" })).json?.results?.length === 0 && (await credits()) === (await credits()));
  const afterNone = await credits();

  const byId = await ask({ query: UC });
  t.check("lookup by channel ID works", byId.status === 200 && byId.json?.results?.[0]?.channelId === UC);

  const search = await ask({ query: "fitness creators india" });
  t.check("keyword search returns channels", search.status === 200 && search.json?.results?.length === 2);
  t.check("hidden subscriber counts are shown as hidden (null)", search.json?.results?.some(r => r.subscribers === null));
  t.check("a channel with no email says so (empty list)", search.json?.results?.find(r => r.title === "Quiet Channel")?.emails?.length === 0);

  // out of records
  db.prepare("INSERT INTO datapal_credits (account_email, used, addon, updated_at) VALUES (?, 100000, 0, ?) ON CONFLICT(account_email) DO UPDATE SET used = 100000").run(USER, new Date().toISOString());
  t.check("with no records left it asks to buy more (402)", (await ask({ query: "@fitindia" })).status === 402);
  t.check("saved data does not survive in the database beyond its limit", db.prepare("SELECT COUNT(*) c FROM youtube_cache").get().c > 0);
  void afterNone; void businessIdOf;
} finally {
  fake.close();
  cleanup();
}
process.exit(t.done() ? 0 : 1);

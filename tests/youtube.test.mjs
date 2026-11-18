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
const NL = String.fromCharCode(10);
const t = reporter();
const db = openDatabase();
const USER = `yt_user_${Date.now()}@example.test`;
const UC = "UC" + "a".repeat(22);
const UC_B = "UC" + "b".repeat(22);
const calls = [];
const siteHits = [];

const DESCRIPTION = [
  "Business: Hello@FitIndia.test.",
  "Call +91 98765 43210 or WhatsApp https://wa.me/919812345678",
  "Instagram https://instagram.com/fitindia",
  "Shop http://127.0.0.1:2627/shop",
].join(" ");

const channel = (id, title, description, extra = {}) => ({
  id,
  snippet: { title, description, customUrl: extra.customUrl || "", country: "IN", publishedAt: "2020-01-01T00:00:00Z", thumbnails: { default: { url: "https://example.test/a.jpg" } } },
  statistics: { subscriberCount: "125000", videoCount: "340", viewCount: "9000000", hiddenSubscriberCount: Boolean(extra.hidden) },
});

const fakeYouTube = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  calls.push({ path: url.pathname, key: req.headers["x-goog-api-key"] });
  res.setHeader("Content-Type", "application/json");
  if (req.headers["x-goog-api-key"] !== "test-key") { res.statusCode = 403; return res.end(JSON.stringify({ error: { errors: [{ reason: "keyInvalid" }] } })); }
  if (url.pathname.endsWith("/search")) return res.end(JSON.stringify({ items: [{ id: { channelId: UC } }, { id: { channelId: UC_B } }] }));
  if (url.pathname.endsWith("/channels")) {
    if (url.searchParams.get("forHandle") === "@nobody") return res.end(JSON.stringify({ items: [] }));
    const ids = (url.searchParams.get("id") || "").split(",").filter(Boolean);
    const list = ids.length === 0 ? [UC] : ids;
    return res.end(JSON.stringify({ items: list.map(id => id === UC
      ? channel(id, "Fit India", DESCRIPTION, { customUrl: "@fitindia" })
      : channel(id, "Quiet Channel", "No contact here", { hidden: true })) }));
  }
  res.statusCode = 404; res.end("{}");
});

const fakeSite = http.createServer((req, res) => {
  siteHits.push(req.url);
  res.setHeader("Content-Type", req.url === "/robots.txt" ? "text/plain" : "text/html");
  if (req.url === "/robots.txt") return res.end(["User-agent: *", "Disallow: /secret"].join(NL));
  if (req.url === "/shop") return res.end("<html><body><h1>Fit India shop</h1><p>Buy things.</p></body></html>");
  if (req.url === "/contact") return res.end('<html><body><a href="mailto:booking@fitindia.test?subject=Hi">Book us</a> <a href="tel:+919000011111">Call</a> sales [at] fitindia [dot] test</body></html>');
  res.statusCode = 404; res.end("not found");
});

await new Promise(r => fakeYouTube.listen(2626, "127.0.0.1", r));
await new Promise(r => fakeSite.listen(2627, "127.0.0.1", r));

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
  t.check("the email in the description is found (and lowercased)", c?.emails?.some(e => e.value === "hello@fitindia.test" && e.source === "Description"));
  t.check("phone numbers in the description are found and tidied", c?.phones?.some(p => p.value === "+91 98765 43210"));
  t.check("a WhatsApp link in the description gives a phone number", c?.phones?.some(p => p.value === "+91 98123 45678"));
  t.check("links are found and named", c?.links?.some(l => l.label === "Instagram") && c?.links?.some(l => l.url === "http://127.0.0.1:2627/shop"));
  t.check("the key goes in a header, not the web address", calls.every(x => x.key === "test-key"));
  const afterOne = await credits();
  t.check("one record was used", typeof before === "number" && before - afterOne === 1, `${before} -> ${afterOne}`);

  if (LOCAL_FETCH) {
    t.check("the creator's website was opened and its contact page read", siteHits.includes("/shop") && siteHits.includes("/contact"));
    t.check("the website's robots.txt was checked", siteHits.includes("/robots.txt"));
    t.check("an email from the website (mailto link) is added with its source", c?.emails?.some(e => e.value === "booking@fitindia.test" && e.source === "127.0.0.1"));
    t.check("an email written as 'name [at] site [dot] test' is found", c?.emails?.some(e => e.value === "sales@fitindia.test"));
    t.check("a phone number from a tel: link on the website is added", c?.phones?.some(p => p.value === "+91 90000 11111"));
    t.check("pages the site disallows were not opened", !siteHits.includes("/secret"));
  } else {
    t.check("the website on this computer was NOT opened (private addresses are blocked)", siteHits.length === 0, JSON.stringify(siteHits));
    t.check("so nothing from it was added", !c?.emails?.some(e => e.source !== "Description"));
  }

  const callsBefore = calls.length;
  const again = await ask({ query: "@fitindia" });
  t.check("the same channel again comes from the saved copy (no new YouTube call)", again.status === 200 && again.json?.results?.length === 1 && calls.length === callsBefore);
  t.check("a channel that does not exist returns nothing", (await ask({ query: "@nobody" })).json?.results?.length === 0);

  const byId = await ask({ query: UC });
  t.check("lookup by channel ID works", byId.status === 200 && byId.json?.results?.[0]?.channelId === UC);

  const search = await ask({ query: "fitness creators india" });
  t.check("keyword search returns channels", search.status === 200 && search.json?.results?.length === 2);
  t.check("hidden subscriber counts are shown as hidden (null)", search.json?.results?.some(r => r.subscribers === null));
  const quiet = search.json?.results?.find(r => r.title === "Quiet Channel");
  t.check("a channel with nothing listed has empty email and phone lists", quiet?.emails?.length === 0 && quiet?.phones?.length === 0);

  db.prepare("INSERT INTO datapal_credits (account_email, used, addon, updated_at) VALUES (?, 100000, 0, ?) ON CONFLICT(account_email) DO UPDATE SET used = 100000").run(USER, new Date().toISOString());
  t.check("with no records left it asks to buy more (402)", (await ask({ query: "@fitindia" })).status === 402);
} finally {
  fakeYouTube.close();
  fakeSite.close();
  cleanup();
}
process.exit(t.done() ? 0 : 1);

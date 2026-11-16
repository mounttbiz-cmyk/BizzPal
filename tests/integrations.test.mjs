// Slack, daily briefing and the scheduled job: sign-in is required, bad input is refused, and nothing is "connected" without a real test.
import { call, openDatabase, reporter, sessionToken, businessIdOf } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const USER = `integ_user_${Date.now()}@example.test`;

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  del("DELETE FROM registered_users WHERE email = ?", USER);
  del("DELETE FROM integrations WHERE business_id = ?", businessIdOf(USER));
  del("DELETE FROM platform_config WHERE config_key = ?", `daily_briefing:${businessIdOf(USER)}`);
}
cleanup();

try {
  // nobody signed in
  for (const [method, path] of [["GET", "/api/briefing"], ["PUT", "/api/briefing"], ["POST", "/api/briefing"], ["POST", "/api/integrations/slack"], ["DELETE", "/api/integrations/slack"], ["POST", "/api/integrations/slack/post"]]) {
    t.check(`not signed in -> 401 ${method} ${path}`, (await call(path, { method, body: method === "GET" ? undefined : {} })).status === 401);
  }
  t.check("the old webhooks are gone (404)", (await call("/api/webhooks/whatsapp", { method: "POST", body: {} })).status === 404);
  t.check("the old Stripe webhook is gone (404)", (await call("/api/integrations/stripe/webhook", { method: "POST", body: {} })).status === 404);

  // scheduled job needs its secret
  const cron = await call("/api/cron/daily-briefing", { method: "POST" });
  t.check("scheduled job refuses a call without the secret", cron.status === 401 || cron.status === 503);

  await call("/api/auth/register", { method: "POST", body: { email: USER, name: "Integ", password: "IntegTest123!" } });
  const cookie = sessionToken(USER);

  // Slack
  t.check("Slack: a made-up URL is refused", (await call("/api/integrations/slack", { method: "POST", cookie, body: { webhookUrl: "not a url" } })).status === 400);
  t.check("Slack: another website is refused (cannot be pointed elsewhere)", (await call("/api/integrations/slack", { method: "POST", cookie, body: { webhookUrl: "https://evil.example.com/services/T1/B1/x" } })).status === 400);
  t.check("Slack: posting when not connected is refused", (await call("/api/integrations/slack/post", { method: "POST", cookie, body: { text: "hello" } })).status === 400);
  t.check("Slack: cannot be marked connected through the generic route", (await call("/api/integrations", { method: "POST", cookie, body: { toolKey: "slack", status: "connected", apiKey: "x" } })).status === 400);
  t.check("Stripe: cannot be marked connected through the generic route", (await call("/api/integrations", { method: "POST", cookie, body: { toolKey: "stripe", status: "connected", apiKey: "x" } })).status === 400);
  const list = await call("/api/integrations", { cookie });
  t.check("nothing shows as connected for a new account", !(list.json?.integrations || []).some(i => i.status === "connected"));

  // Briefing
  const state = await call("/api/briefing", { cookie });
  t.check("briefing status is readable", state.status === 200 && state.json?.enabled === false);
  const on = await call("/api/briefing", { method: "PUT", cookie, body: { enabled: true } });
  if (state.json?.emailConfigured) {
    t.check("briefing can be turned on when email is set up", on.status === 200 && on.json?.enabled === true);
    t.check("briefing stays on after reading it back", (await call("/api/briefing", { cookie })).json?.enabled === true);
  } else {
    t.check("briefing cannot be turned on without email (honest error)", on.status === 503);
  }
  const off = await call("/api/briefing", { method: "PUT", cookie, body: { enabled: false } });
  t.check("briefing can be turned off", off.status === 200 && off.json?.enabled === false);
} finally {
  cleanup();
}
process.exit(t.done() ? 0 : 1);

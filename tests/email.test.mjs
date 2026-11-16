// Forgot-password and invite emails. Needs the app running WITH these settings pointing at a test mail server:
//   SMTP_HOST=127.0.0.1 SMTP_PORT=2525 SMTP_USER=test SMTP_PASS=test MAIL_FROM="BizzPal <test@bizzpal.test>"
// and MAIL_SINK=<path of the file the test mail server writes to>. Skipped when MAIL_SINK is not set.
import { readFileSync } from "node:fs";
import { BASE, call, openDatabase, reporter, sessionToken, businessIdOf } from "./helpers.mjs";

const sinkFile = process.env.MAIL_SINK;
if (!sinkFile) {
  console.log("SKIP email tests (set MAIL_SINK and run the app with SMTP_* pointing at the test mail server)");
  process.exit(0);
}

const t = reporter();
const db = openDatabase();
const email = "mailtest_owner@example.test";
const teammate = "mailtest_mate@example.test";
const wait = ms => new Promise(r => setTimeout(r, ms));
// The test mail server keeps the raw message; undo the quoted-printable encoding mail uses.
const sink = () => {
  const raw = readFileSync(sinkFile, "utf8");
  const NL = String.fromCharCode(10);
  const joined = raw.split("=" + NL).join("");
  return joined.replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
};

function cleanup() {
  const del = (sql, ...args) => { try { db.prepare(sql).run(...args); } catch {} };
  del("DELETE FROM registered_users WHERE email IN (?, ?)", email, teammate);
  del("DELETE FROM password_resets WHERE email IN (?, ?)", email, teammate);
  del("DELETE FROM team_invites WHERE owner_email = ?", email);
  del("DELETE FROM platform_config WHERE config_key = ?", `daily_briefing:${businessIdOf(email)}`);
}
cleanup();

try {
  // account with a password
  const reg = await call("/api/auth/register", { method: "POST", body: { email, name: "Mail Tester", password: "OldPassw0rd!" } });
  t.check("test account created", reg.status === 200 || reg.status === 201, `status ${reg.status}`);

  // forgot password: same answer for a known and an unknown address
  const known = await call("/api/auth/forgot", { method: "POST", body: { email } });
  const unknown = await call("/api/auth/forgot", { method: "POST", body: { email: "nobody_here@example.test" } });
  t.check("forgot password answers the same for known and unknown emails", known.status === 200 && unknown.status === 200 && known.json?.message === unknown.json?.message);
  t.check("bad email address is rejected", (await call("/api/auth/forgot", { method: "POST", body: { email: "nope" } })).status === 400);

  await wait(800);
  const mail = sink();
  const all = [...mail.matchAll(/reset-password[?]token=([A-Za-z0-9_%-]+)/g)];
  const m = all.length ? all[all.length - 1] : null;
  t.check("a reset email was sent to the known account", mail.includes(email) && Boolean(m));
  t.check("no email was sent for the unknown account", !mail.includes("nobody_here@example.test"));
  const token = m ? decodeURIComponent(m[1]) : "";

  // the link
  t.check("link is valid", (await call(`/api/auth/reset?token=${encodeURIComponent(token)}`)).json?.valid === true);
  t.check("a wrong token is not valid", (await call("/api/auth/reset?token=abcdefghijklmnopqrstuvwxyz0123456789")).json?.valid === false);
  t.check("a short new password is refused", (await call("/api/auth/reset", { method: "POST", body: { token, password: "short" } })).status === 400);
  const done = await call("/api/auth/reset", { method: "POST", body: { token, password: "BrandNewPass1!" } });
  t.check("new password is accepted", done.status === 200 && done.json?.success === true);
  t.check("the link cannot be used twice", (await call("/api/auth/reset", { method: "POST", body: { token, password: "AnotherPass22!" } })).status === 400);

  // sign-in with old and new password
  const oldLogin = await call("/api/auth/login", { method: "POST", body: { email, password: "OldPassw0rd!" } });
  const newLogin = await call("/api/auth/login", { method: "POST", body: { email, password: "BrandNewPass1!" } });
  t.check("old password no longer works", oldLogin.status !== 200);
  t.check("new password works", newLogin.status === 200);

  // invite email
  const cookie = sessionToken(email);
  const inv = await call("/api/team/invites", { method: "POST", cookie, body: { inviteEmail: teammate, name: "Mate", role: "Manager" } });
  t.check("invite created and emailed", inv.status === 200 && inv.json?.emailed === true, JSON.stringify(inv.json?.emailed));
  await wait(800);
  const mail2 = sink();
  t.check("invite email went to the teammate with a join link", mail2.includes(teammate) && /\/join\/[A-Za-z0-9_-]{20,}/.test(mail2));

  // daily briefing by email
  const before = sink().length;
  const sendNow = await call("/api/briefing", { method: "POST", cookie });
  t.check("briefing: 'send me one now' succeeds", sendNow.status === 200 && sendNow.json?.success === true);
  await wait(800);
  const added = sink().slice(before);
  t.check("briefing: the email reached the owner with the right subject", added.includes(email) && added.includes("Your BizzPal briefing"));
  t.check("briefing can be turned on", (await call("/api/briefing", { method: "PUT", cookie, body: { enabled: true } })).json?.enabled === true);

  // the scheduled job
  const cronToken = process.env.CRON_TOKEN;
  if (cronToken) {
    const bad = await fetch(BASE + "/api/cron/daily-briefing", { method: "POST", headers: { Authorization: "Bearer wrong-token-wrong-token" } });
    t.check("scheduled job refuses a wrong secret", bad.status === 401);
    const good = await fetch(BASE + "/api/cron/daily-briefing", { method: "POST", headers: { Authorization: `Bearer ${cronToken}` } });
    const gj = await good.json().catch(() => ({}));
    t.check("scheduled job sends the briefings", good.status === 200 && gj.sent >= 1, JSON.stringify(gj));
  } else {
    console.log("SKIP scheduled-job checks (set CRON_TOKEN for the app and the test)");
  }
} finally {
  cleanup();
}
process.exit(t.done() ? 0 : 1);

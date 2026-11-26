// Phase 2: enquiries from the business's own inbox (the test email account here, so no real mailbox is touched),
// leads from a Google Sheet, and agents that start when one arrives.
import { BASE, call, loadEnv, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const env = loadEnv();
const db = openDatabase();
const stamp = Date.now();
const OWNER = `leads_owner_${stamp}@example.test`;
const OTHER = `leads_other_${stamp}@example.test`;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const mail = ({ from, name = "", subject, body, messageId, headers = "" }) =>
  [
    `From: ${name ? `"${name}" ` : ""}<${from}>`,
    `To: clinic@example.test`,
    `Subject: ${subject}`,
    `Message-ID: <${messageId}@example.test>`,
    `Date: ${new Date().toUTCString()}`,
    headers,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ]
    .filter(l => l !== "")
    .join("\r\n")
    .replace("Content-Type: text/plain; charset=utf-8", "Content-Type: text/plain; charset=utf-8\r\n");

try {
  for (const e of [OWNER, OTHER]) await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "LeadsTest123!" } });
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);

  t.check("leads need sign-in", (await call("/api/leads")).status === 401);
  const first = (await call("/api/leads", { cookie: owner })).json;
  t.check("a new account has no leads and no sources", first?.leads?.length === 0 && first.sources.length === 0 && first.available.email === null);
  t.check("reading enquiries needs a connected email account", (await call("/api/leads/sources", { method: "POST", cookie: owner, body: { action: "inbox" } })).status === 400);
  t.check("a lead sheet needs Google Drive connected", /Google Drive/.test((await call("/api/leads/sources", { method: "POST", cookie: owner, body: { action: "preview", fileId: "1AbCdEfGhIjKlMnOp" } })).json?.error || ""));

  // ---------------------------------------------------------------- email enquiries
  await call("/api/integrations/email", { method: "POST", cookie: owner, body: { host: "sandbox.example.test", port: 465, user: "clinic@example.test", password: "secret-pass" } });
  // Already in the inbox before reading is switched on: never imported
  await call("/api/integrations/email/sandbox-inbox", { method: "POST", cookie: owner, body: { raw: mail({ from: "old@example.test", subject: "Old email", body: "From before.", messageId: `old-${stamp}` }) } });
  const on = await call("/api/leads/sources", { method: "POST", cookie: owner, body: { action: "inbox" } });
  t.check("reading enquiries can be switched on", on.status === 200);
  const src = (await call("/api/leads", { cookie: owner })).json?.sources?.find(s => s.kind === "email_inbox");

  // Agent that should react to new enquiries
  const cookieAdmin = await (async () => {
    const passcode = env.SUPERADMIN_PASSCODE || env.ADMIN_PASSCODE;
    if (!passcode) return null;
    const res = await fetch(BASE + "/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
    return /bizzpal_admin_token=([^;]+)/.exec(res.headers.get("set-cookie") || "")?.[1] || null;
  })();
  let agentId = null;
  if (cookieAdmin) {
    await fetch(BASE + "/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json", Cookie: `bizzpal_admin_token=${cookieAdmin}` }, body: JSON.stringify({ email: OWNER, credits: 100, note: "test", reference: `leads-${stamp}` }) });
    await call("/api/business/brief", { method: "PUT", cookie: owner, body: { summary: "A clinic.", values: { offering: "Dental care", customers: "Families" } } });
    agentId = (await call("/api/agents", { method: "POST", cookie: owner, body: { agentId: "everyday_quote_followup" } })).json?.agent?.id;
    await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "evaluate" } });
    await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "activate" } });
    const trig = await call(`/api/agents/${agentId}/schedule`, { method: "PUT", cookie: owner, body: { trigger: "new_enquiry", instruction: "Draft a short reply to this enquiry." } });
    t.check("an agent can be set to start when a new enquiry arrives", trig.status === 200 && trig.json?.schedule?.trigger === "new_enquiry" && trig.json.schedule.nextRunAt === null);
  }

  const add = raw => call("/api/integrations/email/sandbox-inbox", { method: "POST", cookie: owner, body: { raw } });
  await add(mail({ from: "priya@example.test", name: "Priya Shah", subject: "Price for a check-up", body: "Hello, what does a family check-up cost?\n\nOn Mon, someone wrote:\n> old quoted text", messageId: `q1-${stamp}` }));
  await add(mail({ from: "news@example.test", subject: "Our newsletter", body: "Deals!", messageId: `n1-${stamp}`, headers: "List-Unsubscribe: <mailto:u@example.test>" }));
  await add(mail({ from: "no-reply@example.test", subject: "Your receipt", body: "Receipt", messageId: `r1-${stamp}` }));
  await add(mail({ from: "clinic@example.test", subject: "Sent by us", body: "Our own mail", messageId: `s1-${stamp}` }));
  const tasksBefore = agentId ? Number(db.prepare("SELECT COUNT(*) AS n FROM workflow_tasks WHERE agent_instance_id = ?").get(agentId).n) : 0;

  const sync = await call(`/api/leads/sources/${src?.id}`, { method: "POST", cookie: owner });
  t.check("checking the inbox adds only the real enquiry", sync.status === 200 && sync.json?.added === 1);
  const enquiries = (await call("/api/leads?kind=enquiry", { cookie: owner })).json?.leads || [];
  const q = enquiries[0];
  t.check("the enquiry has the sender, subject and message", enquiries.length === 1 && q.name === "Priya Shah" && q.email === "priya@example.test" && q.subject === "Price for a check-up");
  t.check("quoted earlier messages are left out", q?.message?.includes("family check-up") && !q.message.includes("old quoted text"));
  t.check("emails from before reading was switched on are not imported", !enquiries.some(e => e.subject === "Old email"));

  if (agentId) {
    let after = tasksBefore;
    for (let i = 0; i < 20 && after === tasksBefore; i++) {
      await sleep(250);
      after = Number(db.prepare("SELECT COUNT(*) AS n FROM workflow_tasks WHERE agent_instance_id = ?").get(agentId).n);
    }
    const job = db.prepare("SELECT purpose FROM workflow_tasks WHERE agent_instance_id = ? ORDER BY created_at DESC LIMIT 1").get(agentId);
    t.check("the new enquiry starts the agent, which is told who it is from", after === tasksBefore + 1 && /Priya Shah/.test(job?.purpose || "") && /check-up/.test(job?.purpose || ""));
    // Let the job settle so its credits are released before cleanup
    for (let i = 0; i < 40; i++) {
      const open = Number(db.prepare("SELECT COUNT(*) AS n FROM workflow_tasks WHERE agent_instance_id = ? AND finished_at IS NULL AND state = 'working'").get(agentId).n);
      if (!open) break;
      await sleep(500);
    }
  }

  const again = await call(`/api/leads/sources/${src?.id}`, { method: "POST", cookie: owner });
  t.check("checking again adds nothing twice", again.json?.added === 0);

  // ---------------------------------------------------------------- dealing with them
  t.check("an enquiry can be marked done", (await call(`/api/leads/${q?.id}`, { method: "PATCH", cookie: owner, body: { status: "done" } })).status === 200);
  t.check("done items leave the new list", ((await call("/api/leads?status=new", { cookie: owner })).json?.leads || []).length === 0);
  t.check("another account cannot see them", ((await call("/api/leads", { cookie: other })).json?.leads || []).length === 0);
  t.check("another account cannot change them", (await call(`/api/leads/${q?.id}`, { method: "PATCH", cookie: other, body: { status: "new" } })).status === 404);
  t.check("another account cannot use this inbox", (await call(`/api/leads/sources/${src?.id}`, { method: "POST", cookie: other })).status === 404);
  t.check("the test mailbox is refused for a real account", (await call("/api/integrations/email/sandbox-inbox", { method: "POST", cookie: other, body: { raw: "x" } })).status === 400);

  const off = await call(`/api/leads/sources/${src?.id}`, { method: "DELETE", cookie: owner });
  t.check("stopping reading removes its enquiries from BizzPal", off.status === 200 && ((await call("/api/leads?kind=enquiry", { cookie: owner })).json?.leads || []).length === 0);
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  db.close();
}
// The accounts made here are removed by tests/cleanup.mjs after the run
process.exit(t.done() ? 0 : 1);

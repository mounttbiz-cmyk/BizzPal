// Phase 1 roadmap: agents that do real work. The approvals inbox, sending email from the business's own account
// (a sandbox account here, so nothing is really sent), carrying a job on after a decision, automatic runs, the results
// report and the house style. Nothing here needs the AI: actions are driven step by step through the task API.
import { BASE, businessIdOf, call, loadEnv, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const env = loadEnv();
const stamp = Date.now();
const OWNER = `aw_owner_${stamp}@example.test`;
const OTHER = `aw_other_${stamp}@example.test`;
const BIZ = businessIdOf(OWNER);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function adminCookie() {
  const passcode = env.SUPERADMIN_PASSCODE || env.ADMIN_PASSCODE;
  if (!passcode) return null;
  const res = await fetch(BASE + "/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
  const m = /bizzpal_admin_token=([^;]+)/.exec(res.headers.get("set-cookie") || "");
  return m ? m[1] : null;
}

/** Waits until the task is finished or waiting, and returns it. */
async function settle(taskId, cookie, rounds = 40) {
  let task = null;
  for (let i = 0; i < rounds; i++) {
    task = (await call(`/api/agents/tasks/${taskId}`, { cookie })).json?.task;
    if (task?.finishedAt || task?.state === "input_required") return task;
    await sleep(500);
  }
  return task;
}

/** Puts a planned job in place, as the planner would, waiting on approvalId at step 0. */
function waitingJob(taskId, approvalId, email) {
  const output = {
    summary: "Test job",
    steps: [{ action: "email.send", label: "Send an email", why: "test", status: "approval_required", approvalId, reason: "Waiting for your approval." }],
    plan: [
      { action: "email.send", input: email, why: "test" },
      { action: "tasks.create_internal", input: { title: `Follow up ${stamp}`, priority: "low" }, why: "test" },
    ],
    next: 1,
  };
  db.prepare("UPDATE workflow_tasks SET output = ?, state = 'input_required' WHERE id = ?").run(JSON.stringify(output), taskId);
}

try {
  const cookieAdmin = await adminCookie();
  if (!cookieAdmin) {
    console.log("SKIP agent work tests (no SUPERADMIN_PASSCODE in .env)");
  } else {
    for (const e of [OWNER, OTHER]) await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "AgentWork123!" } });
    const owner = sessionToken(OWNER);
    const other = sessionToken(OTHER);
    await fetch(BASE + "/api/admin/credits", {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: `bizzpal_admin_token=${cookieAdmin}` },
      body: JSON.stringify({ email: OWNER, credits: 200, note: "test", reference: `aw-${stamp}` }),
    });
    await call("/api/business/brief", { method: "PUT", cookie: owner, body: { summary: "A clinic chain.", values: { offering: "Dental care", customers: "Families in Pune" } } });

    // ---------------------------------------------------------------- email connection
    const forged = await call("/api/integrations", { method: "POST", cookie: owner, body: { toolKey: "email", status: "connected" } });
    t.check("email cannot be marked connected without a real test", forged.status === 400);
    const badHost = await call("/api/integrations/email", { method: "POST", cookie: owner, body: { host: "not a host", port: 465, user: "a", password: "b" } });
    t.check("a bad email server is refused with a reason", badHost.status === 400 && /SMTP server/.test(badHost.json?.error || ""));
    const conn = await call("/api/integrations/email", {
      method: "POST",
      cookie: owner,
      body: { host: "sandbox.example.test", port: 465, user: "clinic@example.test", password: "secret-pass", fromName: "Test Clinic" },
    });
    t.check("the email account connects after its test", conn.status === 200 && conn.json?.account?.fromEmail === "clinic@example.test");
    t.check("the password never comes back", !JSON.stringify(conn.json).includes("secret-pass") && !JSON.stringify((await call("/api/integrations", { cookie: owner })).json).includes("secret-pass"));
    const stored = db.prepare("SELECT api_key FROM integrations WHERE business_id = ? AND tool_key = 'email'").get(BIZ);
    t.check("the password is stored encrypted", Boolean(stored?.api_key) && !String(stored.api_key).includes("secret-pass"));
    const otherList = (await call("/api/integrations", { cookie: other })).json?.integrations || [];
    t.check("another account does not see the connection", !otherList.some(i => i.id === "email"));
    t.check("only the owner's account can connect email for its business", (await call("/api/integrations/email", { cookie: other })).json?.account === null);

    // ---------------------------------------------------------------- agent with email
    const created = await call("/api/agents", { method: "POST", cookie: owner, body: { agentId: "everyday_collections" } });
    const agentId = created.json?.agent?.id;
    await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "evaluate" } });
    const act = await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "activate" } });
    t.check("an everyday agent with email passes its checks and switches on", act.json?.agent?.state === "active");

    const newTask = async () => (await call(`/api/agents/${agentId}/tasks`, { method: "POST", cookie: owner, body: { purpose: `aw test ${stamp}` } })).json?.task?.id;
    const email = { to: "patient@example.test", subject: "Your invoice", body: "Hello, this is a gentle reminder about invoice 42." };

    // ---------------------------------------------------------------- approvals
    const t1 = await newTask();
    const bad = await call(`/api/agents/tasks/${t1}`, { method: "POST", cookie: owner, body: { action: "email.send", payload: { to: "not-an-email", subject: "x", body: "hello there" } } });
    t.check("an incomplete email is refused before it reaches the owner", bad.status === 409 && bad.json?.code === "invalid_input");
    const ask = await call(`/api/agents/tasks/${t1}`, { method: "POST", cookie: owner, body: { action: "email.send", payload: email } });
    const a1 = ask.json?.approvalId;
    t.check("sending an email waits for the owner's approval", ask.status === 202 && Boolean(a1) && ask.json?.task?.state === "input_required");
    const ttl = new Date(ask.json?.expiresAt).getTime() - Date.now();
    t.check("a request waits about 24 hours", ttl > 23 * 3600e3 && ttl < 25 * 3600e3);

    const count = await call("/api/approvals?count=1", { cookie: owner });
    t.check("the sidebar count shows the waiting request", count.json?.pending >= 1);
    const list = (await call("/api/approvals?status=pending", { cookie: owner })).json;
    const item = list?.approvals?.find(x => x.id === a1);
    t.check(
      "the inbox shows exactly what will be sent, with the agent's name",
      item?.preview?.lines?.some(l => l.label === "To" && l.value === email.to) && item.preview.lines.some(l => l.label === "Message" && l.value === email.body) && item.agentName === "Payment Reminder Agent"
    );
    t.check("another account cannot see the request", !((await call("/api/approvals", { cookie: other })).json?.approvals || []).some(x => x.id === a1));
    const otherDecide = await call(`/api/approvals/${a1}`, { method: "POST", cookie: other, body: { decision: "approve" } });
    t.check("another account cannot approve it", otherDecide.status === 409 || otherDecide.status === 404 || otherDecide.status === 403);
    const badEdit = await call(`/api/approvals/${a1}`, { method: "POST", cookie: owner, body: { decision: "approve", edits: { to: "someone@else.test" } } });
    t.check("the recipient cannot be changed by an edit", badEdit.status === 409);

    const edited = { ...email, body: "Hello, a friendly reminder about invoice 42. Thank you!" };
    const ok = await call(`/api/approvals/${a1}`, { method: "POST", cookie: owner, body: { decision: "approve", edits: { body: edited.body } } });
    t.check("the owner can edit the message and approve it", ok.status === 200 && ok.json?.edited === true);
    const stale = await call(`/api/agents/tasks/${t1}`, { method: "POST", cookie: owner, body: { action: "email.send", payload: email, approvalId: a1 } });
    t.check("the agent's original text cannot use an approval given to the edited text", stale.status === 409 && /changed/.test(stale.json?.reason || ""));
    const sent = await call(`/api/agents/tasks/${t1}`, { method: "POST", cookie: owner, body: { action: "email.send", payload: edited, approvalId: a1 } });
    t.check("the approved email is sent (sandbox: recorded, not sent)", sent.status === 200 && sent.json?.result?.sandbox === true && sent.json.result.sentTo === email.to);
    const replay = await call(`/api/agents/tasks/${t1}`, { method: "POST", cookie: owner, body: { action: "email.send", payload: edited, approvalId: a1 } });
    t.check("one approval sends once", replay.status === 409);
    t.check("exactly one delivery is recorded for the approval", Number(db.prepare("SELECT COUNT(*) AS n FROM agent_deliveries WHERE approval_id = ?").get(a1).n) === 1);
    await call(`/api/agents/tasks/${t1}`, { method: "PATCH", cookie: owner, body: { outcome: "completed" } });

    // ---------------------------------------------------------------- a job carries on after the decision
    const t2 = await newTask();
    const a2 = (await call(`/api/agents/tasks/${t2}`, { method: "POST", cookie: owner, body: { action: "email.send", payload: email } })).json?.approvalId;
    waitingJob(t2, a2, email);
    await call(`/api/approvals/${a2}`, { method: "POST", cookie: owner, body: { decision: "reject", note: "wrong patient" } });
    const job2 = await settle(t2, owner);
    t.check(
      "after a rejection nothing is sent and the job carries on with its next step",
      job2?.finishedAt && job2.output?.steps?.[0]?.status === "refused" && job2.output.steps[1]?.status === "done" && !db.prepare("SELECT 1 FROM agent_deliveries WHERE approval_id = ?").get(a2)
    );
    t.check("the reason for the rejection is kept", (await call("/api/approvals", { cookie: owner })).json?.approvals?.find(x => x.id === a2)?.note === "wrong patient");

    const t3 = await newTask();
    const a3 = (await call(`/api/agents/tasks/${t3}`, { method: "POST", cookie: owner, body: { action: "email.send", payload: email } })).json?.approvalId;
    waitingJob(t3, a3, email);
    await call(`/api/approvals/${a3}`, { method: "POST", cookie: owner, body: { decision: "approve" } });
    const job3 = await settle(t3, owner);
    t.check(
      "after an approval the step runs with what was approved, then the job finishes",
      job3?.state === "completed" && job3.output?.steps?.[0]?.status === "done" && job3.output.steps[0].result?.sentTo === email.to && job3.output.steps[1]?.status === "done"
    );
    t.check("its reserved credits are released when it finishes", (await call("/api/credits", { cookie: owner })).json?.wallet?.reserved === 0);

    // ---------------------------------------------------------------- results report
    const rep = (await call(`/api/agents/report?days=7&agent=${agentId}`, { cookie: owner })).json?.report;
    const sentRows = Number(db.prepare("SELECT COUNT(*) AS n FROM agent_deliveries WHERE business_id = ? AND status = 'sent'").get(BIZ).n);
    t.check("the report counts the emails actually sent", rep?.emailsSent === sentRows && sentRows === 2);
    t.check("the report counts approvals and rejections", rep?.approvals?.approved >= 2 && rep.approvals.rejected === 1);
    const consumed = Number(db.prepare("SELECT COALESCE(SUM(-amount_paise), 0) AS p FROM credit_ledger WHERE business_id = ? AND type = 'consume'").get(BIZ).p) / 100;
    t.check("credits spent in the report match the ledger", Math.abs((rep?.creditsSpent ?? -1) - consumed) < 0.01);
    t.check("another account cannot read this agent's report", (await call(`/api/agents/report?agent=${agentId}`, { cookie: other })).status === 404);

    // ---------------------------------------------------------------- schedules
    t.check("a schedule needs a valid time", (await call(`/api/agents/${agentId}/schedule`, { method: "PUT", cookie: owner, body: { cadence: "daily", time: "25:00", instruction: "Check overdue invoices" } })).status === 400);
    const sch = await call(`/api/agents/${agentId}/schedule`, { method: "PUT", cookie: owner, body: { cadence: "weekly", weekday: 1, time: "09:30", instruction: "Check overdue invoices and remind" } });
    t.check("a weekly schedule is saved with its next run in the future", sch.status === 200 && new Date(sch.json?.schedule?.nextRunAt).getTime() > Date.now());
    const istNext = new Date(new Date(sch.json?.schedule?.nextRunAt).getTime() + 330 * 60e3);
    t.check("the next run is on the chosen day and time, India time", istNext.getUTCDay() === 1 && istNext.getUTCHours() === 9 && istNext.getUTCMinutes() === 30);
    t.check("another account cannot see the schedule", (await call(`/api/agents/${agentId}/schedule`, { cookie: other })).status === 404);

    // A due run while the agent is paused is skipped, with the reason recorded and no credits held
    await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "pause", reason: "test" } });
    db.prepare("UPDATE agent_schedules SET next_run_at = ? WHERE agent_instance_id = ?").run(new Date(Date.now() - 1000).toISOString(), agentId);
    const before = Number(db.prepare("SELECT COUNT(*) AS n FROM workflow_tasks WHERE business_id = ?").get(BIZ).n);
    if (env.CRON_TOKEN) {
      await fetch(BASE + "/api/cron/agents", { method: "POST", headers: { Authorization: `Bearer ${env.CRON_TOKEN}` } });
    }
    let row = null;
    for (let i = 0; i < 90 && !row?.last_result; i++) {
      row = db.prepare("SELECT last_result, next_run_at FROM agent_schedules WHERE agent_instance_id = ?").get(agentId);
      if (!row?.last_result) await sleep(1000);
    }
    if (!row?.last_result) {
      console.log("SKIP scheduled-run check (the app's scheduler did not run within 90 seconds; set CRON_TOKEN to trigger it directly)");
    } else {
      const skipped = db.prepare("SELECT * FROM workflow_tasks WHERE business_id = ? ORDER BY created_at DESC LIMIT 1").get(BIZ);
      t.check(
        "a run while the agent is paused is skipped and the reason is shown",
        /paused/i.test(row.last_result) && Number(db.prepare("SELECT COUNT(*) AS n FROM workflow_tasks WHERE business_id = ?").get(BIZ).n) === before + 1 && !skipped.reservation_id && /paused/i.test(skipped.result || "")
      );
      t.check("the schedule moves on to its next run", new Date(row.next_run_at).getTime() > Date.now());

      // Switched on again, but with too few free credits: the run is skipped and says so
      await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "evaluate" } });
      await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "activate" } });
      const holding = [];
      for (let i = 0; i < 30; i++) {
        const w = (await call("/api/credits", { cookie: owner })).json?.wallet;
        if (!w || w.available < 15) break;
        holding.push(await newTask());
      }
      db.prepare("UPDATE agent_schedules SET next_run_at = ?, last_result = NULL WHERE agent_instance_id = ?").run(new Date(Date.now() - 1000).toISOString(), agentId);
      if (env.CRON_TOKEN) await fetch(BASE + "/api/cron/agents", { method: "POST", headers: { Authorization: `Bearer ${env.CRON_TOKEN}` } });
      let low = null;
      for (let i = 0; i < 90 && !low?.last_result; i++) {
        low = db.prepare("SELECT last_result FROM agent_schedules WHERE agent_instance_id = ?").get(agentId);
        if (!low?.last_result) await sleep(1000);
      }
      t.check("a run without enough free credits is skipped and says why", /credits/i.test(low?.last_result || ""));
      for (const id of holding) await call(`/api/agents/tasks/${id}`, { method: "PATCH", cookie: owner, body: { outcome: "canceled" } });
      t.check("the held credits are released again", (await call("/api/credits", { cookie: owner })).json?.wallet?.reserved === 0);
    }

    // ---------------------------------------------------------------- house style
    const mem = (await call("/api/agents/memory", { cookie: owner })).json?.memory;
    t.check("approved emails are counted as examples to learn from", mem?.newExamples >= 2);
    const saved = await call("/api/agents/memory", { method: "PUT", cookie: owner, body: { style: "- Warm and short. Call 98765 43210 or write to a@b.com" } });
    t.check("the owner can write the house style, and contact details are removed", saved.status === 200 && !/98765|a@b\.com/.test(saved.json?.memory?.style || ""));
    const off = await call("/api/agents/memory", { method: "PUT", cookie: owner, body: { enabled: false } });
    t.check("the owner can switch it off", off.json?.memory?.enabled === false);
    t.check("another account cannot change it", (await call("/api/agents/memory", { method: "PUT", cookie: other, body: { style: "x" } })).status === 200 && (await call("/api/agents/memory", { cookie: owner })).json?.memory?.style !== "x");
  }
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  db.close();
}
// The accounts and businesses created here are removed by tests/cleanup.mjs after the run
process.exit(t.done() ? 0 : 1);

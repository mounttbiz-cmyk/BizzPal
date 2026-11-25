// PRD Phase 1: credit wallet, risk tiers and approvals, agent lifecycle and runtime limits, audit trail and tracing.
import { BASE, businessIdOf, call, loadEnv, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const env = loadEnv();
const stamp = Date.now();
const OWNER = `p1_owner_${stamp}@example.test`;
const OTHER = `p1_other_${stamp}@example.test`;
const BIZ = businessIdOf(OWNER);

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [OWNER, OTHER]) {
    const id = businessIdOf(e);
    for (const table of ["credit_ledger", "credit_reservations", "audit_events", "ai_usage", "agent_instances", "workflow_tasks", "approvals", "tasks", "integrations", "team_audit_logs"]) {
      del(`DELETE FROM ${table} WHERE business_id = ?`, id);
    }
    del("DELETE FROM businesses WHERE id = ?", id);
    del("DELETE FROM registered_users WHERE email = ?", e);
  }
  del("DELETE FROM agent_evaluations WHERE detail = ?", `phase1-test-${stamp}`);
}
cleanup();

async function adminCookie() {
  const passcode = env.SUPERADMIN_PASSCODE || env.ADMIN_PASSCODE;
  if (!passcode) return null;
  const res = await fetch(BASE + "/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode }) });
  const m = /bizzpal_admin_token=([^;]+)/.exec(res.headers.get("set-cookie") || "");
  return m ? m[1] : null;
}
async function admin(path, body, cookie) {
  const res = await fetch(BASE + path, { method: "POST", headers: { "Content-Type": "application/json", Cookie: `bizzpal_admin_token=${cookie}` }, body: JSON.stringify(body) });
  return { status: res.status, json: await res.json().catch(() => null) };
}

try {
  for (const e of [OWNER, OTHER]) await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "PhaseOne123!" } });
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);

  // ---------------------------------------------------------------- wallet
  const w0 = await call("/api/credits", { cookie: owner });
  t.check("a new account starts with zero credits", w0.status === 200 && w0.json?.wallet?.available === 0);
  t.check("today's AI spend and the plan's daily limit are shown", typeof w0.json?.today?.limitInr === "number" && w0.json.today.limitInr > 0);
  const anonGrant = await fetch(BASE + "/api/admin/credits", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: OWNER, credits: 100 }) });
  t.check("only a platform admin can grant credits", anonGrant.status === 401 || anonGrant.status === 403 || anonGrant.redirected);

  const cookie = await adminCookie();
  if (!cookie) {
    console.log("SKIP wallet and agent checks that need an admin session (no SUPERADMIN_PASSCODE in .env)");
  } else {
    const g = await admin("/api/admin/credits", { email: OWNER, credits: 40, note: "test", reference: `p1-${stamp}` }, cookie);
    t.check("an admin can add credits", g.status === 200 && g.json?.wallet?.available === 40);
    const dup = await admin("/api/admin/credits", { email: OWNER, credits: 40, reference: `p1-${stamp}` }, cookie);
    t.check("the same payment reference cannot be added twice", dup.status === 409);
    t.check("negative or zero grants are refused", (await admin("/api/admin/credits", { email: OWNER, credits: -5 }, cookie)).status === 400);

    // ---------------------------------------------------------------- lifecycle
    const created = await call("/api/agents", { method: "POST", cookie: owner, body: { agentId: "saas_lead_closer" } });
    const agentId = created.json?.agent?.id;
    t.check("an agent starts as a draft", created.status === 200 && created.json.agent.state === "draft");
    const again = await call("/api/agents", { method: "POST", cookie: owner, body: { agentId: "saas_lead_closer" } });
    t.check("adding the same agent twice returns the same draft", again.json?.agent?.id === agentId);
    t.check("unknown agents are refused", (await call("/api/agents", { method: "POST", cookie: owner, body: { agentId: "free_money_bot" } })).status === 404);

    const early = await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "activate" } });
    t.check("a draft cannot be activated without passing evaluation", early.status === 409);

    const ev1 = await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "evaluate" } });
    const failed = (ev1.json?.agent?.evaluation?.gates || []).filter(g => !g.passed).map(g => g.id);
    t.check("evaluation fails while tests and connections are missing", ev1.json?.agent?.state === "draft" && failed.includes("G1") && failed.includes("G2") && failed.includes("connections"));

    // Pass the gates the honest way: record suite results and connect the systems it needs
    for (const suite of ["golden", "redteam"]) await admin("/api/admin/agent-evaluations", { agentId: "saas_lead_closer", suite, passed: true, score: 0.97, detail: `phase1-test-${stamp}` }, cookie);
    for (const key of ["salespal", "crm", "calendar"]) {
      db.prepare("INSERT INTO integrations (id, business_id, tool_key, name, category, status, config, updated_at) VALUES (?, ?, ?, ?, 'business', 'connected', '{}', ?)")
        .run(`int_${stamp}_${key}`, BIZ, key, key, new Date().toISOString());
    }
    const ev2 = await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "evaluate" } });
    t.check("with every gate passed, it waits for the owner's approval", ev2.json?.agent?.state === "approval_required");
    const act = await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "activate" } });
    t.check("the owner can activate it", act.json?.agent?.state === "active");

    const otherSee = await call(`/api/agents/${agentId}`, { cookie: other });
    t.check("another account cannot see or touch this agent", otherSee.status === 404);

    // ---------------------------------------------------------------- tasks, tiers and approvals
    const task = await call(`/api/agents/${agentId}/tasks`, { method: "POST", cookie: owner, body: { purpose: "Follow up demo leads" } });
    const taskId = task.json?.task?.id;
    const reserved = (await call("/api/credits", { cookie: owner })).json?.wallet;
    t.check("starting a task reserves its budget from the wallet", task.status === 201 && reserved.reserved === 15 && reserved.available === 25);

    const run = (body) => call(`/api/agents/tasks/${taskId}`, { method: "POST", cookie: owner, body });
    const t0 = await run({ action: "brief.read" });
    t.check("a T0 (read) action runs directly", t0.status === 200 && t0.json?.status === "done");
    const t1 = await run({ action: "tasks.create_internal", payload: { title: "Call back Acme", priority: "high" } });
    t.check("a T1 (internal) action runs directly and does real work", t1.json?.status === "done" && Boolean(db.prepare("SELECT id FROM tasks WHERE business_id = ? AND title = ?").get(BIZ, "[Agent] Call back Acme")));
    const notAllowed = await run({ action: "payment.release", payload: { amount: 50000 } });
    t.check("an action outside the agent's list is refused", notAllowed.json?.status === "refused" && notAllowed.json?.code === "not_allowed");

    const payload = { leadId: "L-1", stage: "demo_booked" };
    const t2 = await run({ action: "crm.update_lead", target: "lead L-1", payload });
    t.check("a T2 action waits for an approval", t2.status === 202 && t2.json?.status === "approval_required" && Boolean(t2.json?.approvalId));
    t.check("the task waits for a person meanwhile", t2.json?.task?.state === "input_required");
    const approvalId = t2.json?.approvalId;
    const notYet = await run({ action: "crm.update_lead", target: "lead L-1", payload, approvalId });
    t.check("it cannot run before the approval is given", notYet.json?.status === "refused");
    const otherDecides = await call(`/api/approvals/${approvalId}`, { method: "POST", cookie: other, body: { decision: "approve" } });
    t.check("another account cannot approve it", otherDecides.status === 409 || otherDecides.status === 404);
    await call(`/api/approvals/${approvalId}`, { method: "POST", cookie: owner, body: { decision: "approve" } });
    const changed = await run({ action: "crm.update_lead", target: "lead L-1", payload: { ...payload, stage: "won" }, approvalId });
    t.check("an approval does not cover a changed payload", changed.json?.status === "refused" && /changed/i.test(changed.json?.reason || ""));
    // A fresh request and approval for the exact payload, used once
    const t2b = await run({ action: "crm.update_lead", target: "lead L-1", payload });
    await call(`/api/approvals/${t2b.json.approvalId}`, { method: "POST", cookie: owner, body: { decision: "approve" } });
    const used = await run({ action: "crm.update_lead", target: "lead L-1", payload: { stage: "demo_booked", leadId: "L-1" }, approvalId: t2b.json.approvalId });
    t.check("a matching approval lets it through (key order does not matter)", used.json?.code === "not_available" || used.json?.status === "done");
    const replay = await run({ action: "crm.update_lead", target: "lead L-1", payload, approvalId: t2b.json.approvalId });
    t.check("an approval cannot be used twice", replay.json?.status === "refused" && /already been used/i.test(replay.json?.reason || ""));

    // An action that uses AI is metered under the task's trace and charged to the wallet at the end
    const draft = await run({ action: "message.draft", payload: { instruction: "Two lines thanking a lead for booking a demo." } });
    let charged = 0;
    if (draft.json?.status === "done") {
      const usage = db.prepare("SELECT COUNT(*) AS n, COALESCE(SUM(cost_inr), 0) AS c FROM ai_usage WHERE trace_id = ?").get(task.json.task.traceId);
      charged = Number(usage.c);
      t.check("AI used by an agent is recorded under the task's trace", Number(usage.n) >= 1 && charged > 0 && draft.json?.task?.costInr > 0);
    } else {
      console.log("SKIP AI metering check (no AI provider answered from here)");
    }

    // ---------------------------------------------------------------- settlement
    const done = await call(`/api/agents/tasks/${taskId}`, { method: "PATCH", cookie: owner, body: { outcome: "completed" } });
    if (charged > 0) {
      const consumed = db.prepare("SELECT COALESCE(SUM(amount_paise), 0) AS p FROM credit_ledger WHERE business_id = ? AND type = 'consume'").get(BIZ);
      t.check("the wallet is charged exactly what the task's AI cost", Math.abs(-Number(consumed.p) / 100 - Math.round(charged * 100) / 100) <= 0.01);
    }
    const after = (await call("/api/credits", { cookie: owner })).json;
    t.check("finishing a task releases what it did not use", done.json?.task?.state === "completed" && after.wallet.reserved === 0 && after.wallet.balance <= 40 && after.wallet.balance >= 25);
    const afterRun = await run({ action: "brief.read" });
    t.check("a finished task takes no more actions", afterRun.json?.status === "refused" && afterRun.json?.code === "task_closed");

    // A budget bigger than the wallet can hold is refused before any work starts
    await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { budget: { maxCostInr: 400 } } });
    const reapprove = (await call(`/api/agents/${agentId}`, { cookie: owner })).json?.agent;
    t.check("changing an active agent's limits sends it back for approval", reapprove?.state === "draft");
    db.prepare("UPDATE agent_instances SET state = 'active' WHERE id = ?").run(agentId);
    const tooBig = await call(`/api/agents/${agentId}/tasks`, { method: "POST", cookie: owner, body: { purpose: "Big job" } });
    t.check("the wallet can never go below zero", tooBig.status === 402 && (await call("/api/credits", { cookie: owner })).json.wallet.available >= 0);

    // Pause stops new work
    await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { budget: { maxCostInr: 5 } } });
    db.prepare("UPDATE agent_instances SET state = 'active' WHERE id = ?").run(agentId);
    await call(`/api/agents/${agentId}`, { method: "PATCH", cookie: owner, body: { step: "pause", reason: "test" } });
    const paused = await call(`/api/agents/${agentId}/tasks`, { method: "POST", cookie: owner, body: { purpose: "x" } });
    t.check("a paused agent takes no new tasks", paused.status === 409);

    // ---------------------------------------------------------------- audit trail
    const audit = await call("/api/business/audit", { cookie: owner });
    const actions = new Set((audit.json?.events || []).map(e => e.action));
    t.check("every step is in the audit trail", ["agent.draft", "agent.active", "task.started", "policy.allow", "approval.requested", "approval.approved", "approval.used", "credits.reserve", "credits.settle"].every(a => actions.has(a)));
    t.check("the audit trail is intact", audit.json?.integrity?.ok === true && audit.json.integrity.checked > 5);
    const traced = await call(`/api/business/audit?trace=${task.json.task.traceId}`, { cookie: owner });
    t.check("a task's steps share one trace id", traced.json?.events?.length >= 5 && traced.json.events.every(e => e.traceId === task.json.task.traceId));
    db.prepare("UPDATE audit_events SET detail = '{\"edited\":true}' WHERE id = (SELECT id FROM audit_events WHERE business_id = ? ORDER BY seq LIMIT 1 OFFSET 2)").run(BIZ);
    const tampered = await call("/api/business/audit", { cookie: owner });
    t.check("editing an audit event is detected", tampered.json?.integrity?.ok === false && Boolean(tampered.json.integrity.brokenAt));
    t.check("another account cannot read this audit trail", ((await call("/api/business/audit", { cookie: other })).json?.events || []).every(e => e.businessId !== BIZ));
  }

  // ---------------------------------------------------------------- daily AI limit
  const id = businessIdOf(OTHER);
  db.prepare("INSERT INTO ai_usage (id, business_id, feature, provider, model, input_tokens, output_tokens, cost_usd, cost_inr, usd_to_inr, created_at) VALUES (?, ?, 'chat', 'test', 'test', 0, 0, 1, 999, 88, ?)")
    .run(`use_test_${stamp}`, id, new Date().toISOString());
  const limited = await call("/api/ai/chat", { method: "POST", cookie: other, body: { message: "hello", agentId: "ceo" } });
  t.check("AI stops once the plan's daily limit is used up", limited.status === 429 && /limit/i.test(limited.json?.error || ""));
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);

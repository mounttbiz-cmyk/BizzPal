// Who may see and change what: no login, forged logins, and customers trying to reach each other's data.
import { BASE, businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const db = openDatabase();
const A = "sec-test-a@example.com";
const B = "sec-test-b@example.com";
const NOBODY = "sec-test-nobody@example.com";
const now = new Date().toISOString();

for (const e of [A, B]) {
  db.prepare("INSERT OR IGNORE INTO registered_users (id, email, name, provider, created_at) VALUES (?, ?, ?, 'email', ?)").run("usr_" + e, e, e, now);
  db.prepare("INSERT OR IGNORE INTO businesses (id, name, founder_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(businessIdOf(e), e + " Co", "Founder", now, now);
}

const t = reporter();
const { check } = t;

try {
  const tA = sessionToken(A);
  const tB = sessionToken(B);

  // 1. Nobody signed in
  for (const p of ["/api/tasks", "/api/team", "/api/analytics", "/api/automations", "/api/knowledge/documents", "/api/bi/kpis", "/api/integrations", "/api/datapal/credits", "/api/checkin", "/api/business/upload", "/api/business/intake", "/api/team/permissions"]) {
    const r = await call(p);
    check(`not signed in -> 401 ${p}`, r.status === 401, `got ${r.status}`);
  }
  check("not signed in -> POST /api/ai/chat 401", (await call("/api/ai/chat", { method: "POST", body: { message: "hi", agentId: "cfo" } })).status === 401);
  check("not signed in -> POST /api/datapal/extract 401", (await call("/api/datapal/extract", { method: "POST", body: { config: {} } })).status === 401);
  check("not signed in -> POST /api/payments/razorpay/order 401", (await call("/api/payments/razorpay/order", { method: "POST", body: { planId: "datapal_pack_100" } })).status === 401);

  // 2. Account endpoint
  let r = await call("/api/auth/account-status?email=" + A);
  check("a stranger learns only whether the account exists", r.status === 200 && r.json.exists === true && !("name" in r.json) && !("businessProfile" in r.json));
  r = await call("/api/auth/account-status?email=" + A, { cookie: tA });
  check("the owner gets the account details", r.status === 200 && r.json.email === A);
  r = await call("/api/auth/account-status", { method: "POST", body: { email: "attacker-made@example.com", name: "x" } });
  check("cannot create an account without signing in", r.status === 401);
  r = await call("/api/auth/account-status", { method: "POST", body: { email: B, name: "hijack" }, cookie: tA });
  check("cannot change someone else's account", r.status === 403);
  r = await call("/api/auth/account-status?email=" + B, { method: "DELETE", cookie: tA });
  check("cannot delete someone else's account", r.status === 403);
  r = await call("/api/auth/account-status?email=" + B, { method: "DELETE" });
  check("cannot delete an account without signing in", r.status === 403);

  // 3. Bad cookies
  check("forged cookie rejected", (await call("/api/tasks", { cookie: tA.slice(0, -3) + "AAA" })).status === 401);
  check("expired cookie rejected", (await call("/api/tasks", { cookie: sessionToken(A, -10) })).status === 401);
  check("valid cookie for an unregistered email rejected", (await call("/api/tasks", { cookie: sessionToken(NOBODY) })).status === 401);
  r = await call("/api/auth/session", { cookie: tA });
  check("session check works for a real sign-in", r.status === 200 && r.json.email === A);

  // 4. Each customer sees only their own data
  r = await call("/api/tasks", { method: "POST", cookie: tA, body: { title: "A secret task", businessId: businessIdOf(B) } });
  check("A can create a task", r.status === 200 || r.status === 201);
  const taskId = r.json?.task?.id || r.json?.id;
  check("A sees A's task", (await call("/api/tasks", { cookie: tA })).json.tasks.some(x => x.title === "A secret task"));
  check("B does NOT see A's task", !(await call("/api/tasks", { cookie: tB })).json.tasks.some(x => x.title === "A secret task"));
  check("B cannot read A's tasks with ?businessId=", !(await call("/api/tasks?businessId=" + businessIdOf(A), { cookie: tB })).json.tasks.some(x => x.title === "A secret task"));
  if (taskId) {
    await call("/api/tasks?id=" + taskId, { method: "DELETE", cookie: tB });
    check("B cannot delete A's task", (await call("/api/tasks", { cookie: tA })).json.tasks.some(x => x.title === "A secret task"));
  }

  r = await call("/api/team", { method: "POST", cookie: tA, body: { name: "Member A", email: "member-a@example.com", role: "Operator" } });
  const memberId = r.json?.member?.id;
  check("B does NOT see A's team members", !(await call("/api/team", { cookie: tB })).json.members.some(m => m.email === "member-a@example.com"));
  if (memberId) {
    await call("/api/team?id=" + memberId, { method: "DELETE", cookie: tB });
    check("B cannot remove A's team member", (await call("/api/team", { cookie: tA })).json.members.some(m => m.email === "member-a@example.com"));
  }

  // 5. Automations and permissions are per business
  r = await call("/api/automations", { method: "POST", cookie: tA, body: { title: "A rule", trigger: "when x", action: "do y" } });
  const ruleId = r.json?.automation?.id;
  check("A can create an automation", r.status === 200 && ruleId);
  check("B does NOT see A's automation", !(await call("/api/automations", { cookie: tB })).json.automations.some(x => x.title === "A rule"));
  r = await call("/api/automations", { method: "PUT", cookie: tB, body: { id: ruleId, enabled: false } });
  check("B cannot switch off A's automation", r.status === 404);
  check("A's automation is still on", (await call("/api/automations", { cookie: tA })).json.automations.find(x => x.id === ruleId)?.enabled === true);

  r = await call("/api/team/permissions", { method: "PUT", cookie: tA, body: { matrix: { finance: { Owner: "Full", Executive: "None", Manager: "None", Operator: "None" } } } });
  check("A can save permissions", r.status === 200);
  const permsB = await call("/api/team/permissions", { cookie: tB });
  check("A's permissions do not change B's", permsB.status === 200 && permsB.json.matrix.finance?.Executive !== "None");

  // 6. Money
  check("A reads their own DataPal balance", (await call("/api/datapal/credits", { cookie: tA })).json?.status);
  r = await call("/api/payments/razorpay/order", { method: "POST", cookie: tA, body: { planId: "datapal_pack_100", userEmail: B } });
  check("an order is billed to the signed-in user, not the body", r.status === 200 && r.json.success);
  const orderId = r.json?.orderId;
  r = await call("/api/payments/razorpay/verify", { method: "POST", cookie: tB, body: { razorpay_order_id: orderId, razorpay_payment_id: "pay_sim_x", razorpay_signature: "x" } });
  check("B cannot confirm A's order", r.status === 403);
  check("the full payment ledger is not public", (await call("/api/payments/transactions?admin=true")).status === 403);
  check("the full payment ledger is not available to a customer", (await call("/api/payments/transactions?admin=true", { cookie: tA })).status === 403);
  check("a customer reads their own payment history", (await call("/api/payments/transactions", { cookie: tA })).status === 200);
} finally {
  for (const e of [A, B]) {
    const biz = businessIdOf(e);
    db.prepare("DELETE FROM registered_users WHERE email = ?").run(e);
    db.prepare("DELETE FROM businesses WHERE id = ?").run(biz);
    db.prepare("DELETE FROM tasks WHERE business_id = ?").run(biz);
    db.prepare("DELETE FROM team_members WHERE business_id = ?").run(biz);
    db.prepare("DELETE FROM business_automations WHERE business_id = ?").run(biz);
    db.prepare("DELETE FROM platform_config WHERE config_key = ?").run(`team_permissions:${biz}`);
    db.prepare("DELETE FROM payment_transactions WHERE user_email = ?").run(e);
    db.prepare("DELETE FROM datapal_credits WHERE account_email = ?").run(e);
  }
  console.log(`(tested against ${BASE})`);
}
process.exit(t.done() ? 0 : 1);

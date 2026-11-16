// Teammates: who they work for, what their role allows, and that the rules hold at the server.
// Accepting an invite needs a real Google sign-in, so the test marks the invite as confirmed in the database
// (exactly what the Google step does) and then checks everything else through the real APIs.
import { BASE, businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const OWNER = `team_owner_${stamp}@example.test`;
const MATE = `team_mate_${stamp}@example.test`;
const OTHER = `team_other_${stamp}@example.test`;
const now = () => Math.floor(Date.now() / 1000);

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [OWNER, MATE, OTHER]) {
    del("DELETE FROM registered_users WHERE email = ?", e);
    del("DELETE FROM tasks WHERE business_id = ?", businessIdOf(e));
    del("DELETE FROM platform_config WHERE key = ?", `team_permissions:${businessIdOf(e)}`);
  }
  del("DELETE FROM team_invites WHERE owner_email = ?", OWNER);
}
cleanup();

try {
  for (const e of [OWNER, MATE, OTHER]) {
    await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "TeamTest123!" } });
  }
  const owner = sessionToken(OWNER);

  // the owner invites a teammate as Operator
  const inv = await call("/api/team/invites", { method: "POST", cookie: owner, body: { inviteEmail: MATE, name: "Mate", role: "Operator" } });
  t.check("owner can invite", inv.status === 200 && inv.json?.ok === true);

  const task = await call("/api/tasks", { method: "POST", cookie: owner, body: { title: "Owner-only task" } });
  t.check("owner creates a task", task.status === 200 || task.status === 201);

  // before the invite is confirmed the teammate has nothing of the owner's
  const mateOld = sessionToken(MATE, 3600, now() - 3600);
  t.check("unconfirmed invite: teammate does not see the owner's tasks",
    !(await call("/api/tasks", { cookie: mateOld })).json.tasks?.some(x => x.title === "Owner-only task"));

  // the teammate confirms (what the Google step does)
  db.prepare("UPDATE team_invites SET status = 'verified', verified_at = ?, verified_via = 'google' WHERE owner_email = ? AND invite_email = ?")
    .run(new Date().toISOString(), OWNER, MATE);
  await new Promise(r => setTimeout(r, 1200));
  const mate = sessionToken(MATE, 3600, now());

  // an old sign-in (from before they joined) cannot get into the owner's workspace
  t.check("a sign-in from before joining is refused", (await call("/api/tasks", { cookie: mateOld })).status === 401);

  // joined: works in the owner's business
  const tasks = await call("/api/tasks", { cookie: mate });
  t.check("teammate sees the owner's tasks", tasks.status === 200 && tasks.json.tasks.some(x => x.title === "Owner-only task"));
  const session = await call("/api/auth/session", { cookie: mate });
  t.check("server reports the teammate's role", session.json?.role === "Operator" && session.json?.isOwner === false);
  t.check("server reports the owner as Owner", (await call("/api/auth/session", { cookie: owner })).json?.role === "Owner");
  t.check("a stranger still sees none of it", !(await call("/api/tasks", { cookie: sessionToken(OTHER) })).json.tasks?.some(x => x.title === "Owner-only task"));

  // Operator defaults: finance None, integrations None, tools Read only
  t.check("Operator: finance is blocked (None)", (await call("/api/analytics", { cookie: mate })).status === 403);
  t.check("Operator: integrations are blocked (None)", (await call("/api/integrations", { cookie: mate })).status === 403);
  t.check("Operator: tools can be read", (await call("/api/datapal/credits", { cookie: mate })).status === 200);
  t.check("Operator: tools cannot be changed (Read only)",
    (await call("/api/datapal/extract", { method: "POST", cookie: mate, body: { config: {} } })).status === 403);

  // owner-only actions
  t.check("teammate cannot add team members", (await call("/api/team", { method: "POST", cookie: mate, body: { name: "x", email: "x@example.test", role: "Operator" } })).status === 403);
  t.check("teammate cannot list invite links", (await call("/api/team/invites", { cookie: mate })).status === 403);
  t.check("teammate cannot invite others", (await call("/api/team/invites", { method: "POST", cookie: mate, body: { inviteEmail: "z@example.test", role: "Operator" } })).status === 403);
  t.check("teammate cannot touch payments", (await call("/api/payments", { method: "POST", cookie: mate, body: { provider: "stripe", apiKey: "sk_live_x" } })).status === 403);
  t.check("teammate cannot change permissions", (await call("/api/team/permissions", { method: "PUT", cookie: mate, body: { matrix: {} } })).status === 403);
  t.check("teammate can read permissions", (await call("/api/team/permissions", { cookie: mate })).status === 200);
  t.check("teammate cannot change the business profile", (await call("/api/business/intake", { method: "POST", cookie: mate, body: { name: "Hacked" } })).status === 403);

  // the owner changes the rules and the teammate's access follows
  const perms = (await call("/api/team/permissions", { cookie: owner })).json.matrix;
  perms.finance.Operator = "Read only";
  const put = await call("/api/team/permissions", { method: "PUT", cookie: owner, body: { matrix: perms } });
  t.check("owner saves permissions", put.status === 200);
  t.check("after the change: finance can be read", (await call("/api/analytics", { cookie: mate })).status === 200);

  // the owner is unaffected
  t.check("owner still sees invite links", (await call("/api/team/invites", { cookie: owner })).status === 200);
  t.check("owner still reads analytics", (await call("/api/analytics", { cookie: owner })).status === 200);

  // removing the teammate takes their access away
  const list = (await call("/api/team/invites", { cookie: owner })).json.invites;
  const id = list.find(i => i.email === MATE)?.id;
  await call("/api/team/invites", { method: "DELETE", cookie: owner, body: { id } });
  await new Promise(r => setTimeout(r, 300));
  t.check("after removal the teammate no longer sees the owner's tasks",
    !(await call("/api/tasks", { cookie: mate })).json.tasks?.some(x => x.title === "Owner-only task"));
} finally {
  cleanup();
}
process.exit(t.done() ? 0 : 1);

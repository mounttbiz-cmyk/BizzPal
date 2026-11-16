// Deleting an account removes everything stored for it, and only that account's data.
import { businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const GONE = `del_me_${stamp}@example.test`;
const STAYS = `del_other_${stamp}@example.test`;
const count = (sql, ...a) => db.prepare(sql).get(...a).c;

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [GONE, STAYS]) {
    del("DELETE FROM registered_users WHERE email = ?", e);
    del("DELETE FROM tasks WHERE business_id = ?", businessIdOf(e));
    del("DELETE FROM integrations WHERE business_id = ?", businessIdOf(e));
    del("DELETE FROM platform_config WHERE config_key LIKE ?", `%:${businessIdOf(e)}`);
    del("DELETE FROM team_invites WHERE owner_email = ?", e);
  }
}
cleanup();

try {
  for (const e of [GONE, STAYS]) await call("/api/auth/register", { method: "POST", body: { email: e, name: "T", password: "DeleteTest123!" } });
  const gone = sessionToken(GONE);
  const stays = sessionToken(STAYS);

  for (const [who, cookie] of [[GONE, gone], [STAYS, stays]]) {
    await call("/api/tasks", { method: "POST", cookie, body: { title: `Task of ${who}` } });
    await call("/api/team/invites", { method: "POST", cookie, body: { inviteEmail: `mate_${stamp}_${who.slice(0, 6)}@example.test`, role: "Operator" } });
    await call("/api/team/permissions", { method: "PUT", cookie, body: { matrix: (await call("/api/team/permissions", { cookie })).json.matrix } });
    db.prepare("INSERT INTO integrations (id, business_id, tool_key, name, category, status, updated_at) VALUES (?, ?, 'slack', 'Slack', 'business', 'connected', ?)")
      .run(`int_${who}`, businessIdOf(who), new Date().toISOString());
  }
  t.check("setup: the account has tasks, an invite, permissions and an integration",
    count("SELECT COUNT(*) c FROM tasks WHERE business_id = ?", businessIdOf(GONE)) > 0 &&
    count("SELECT COUNT(*) c FROM team_invites WHERE owner_email = ?", GONE) > 0 &&
    count("SELECT COUNT(*) c FROM integrations WHERE business_id = ?", businessIdOf(GONE)) > 0);

  t.check("someone else cannot delete the account", (await call(`/api/auth/account-status?email=${encodeURIComponent(GONE)}`, { method: "DELETE", cookie: stays })).status === 403);
  t.check("the owner can delete it", (await call(`/api/auth/account-status?email=${encodeURIComponent(GONE)}`, { method: "DELETE", cookie: gone })).json?.success === true);

  t.check("the account is gone", count("SELECT COUNT(*) c FROM registered_users WHERE email = ?", GONE) === 0);
  t.check("its tasks are gone", count("SELECT COUNT(*) c FROM tasks WHERE business_id = ?", businessIdOf(GONE)) === 0);
  t.check("its integrations are gone", count("SELECT COUNT(*) c FROM integrations WHERE business_id = ?", businessIdOf(GONE)) === 0);
  t.check("its invites are gone", count("SELECT COUNT(*) c FROM team_invites WHERE owner_email = ?", GONE) === 0);
  t.check("its saved settings are gone", count("SELECT COUNT(*) c FROM platform_config WHERE config_key LIKE ?", `%:${businessIdOf(GONE)}`) === 0);

  t.check("the other account still has its account", count("SELECT COUNT(*) c FROM registered_users WHERE email = ?", STAYS) === 1);
  t.check("the other account still has its tasks", count("SELECT COUNT(*) c FROM tasks WHERE business_id = ?", businessIdOf(STAYS)) > 0);
  t.check("the other account still has its invite and integration",
    count("SELECT COUNT(*) c FROM team_invites WHERE owner_email = ?", STAYS) > 0 &&
    count("SELECT COUNT(*) c FROM integrations WHERE business_id = ?", businessIdOf(STAYS)) > 0);
} finally {
  cleanup();
}
process.exit(t.done() ? 0 : 1);

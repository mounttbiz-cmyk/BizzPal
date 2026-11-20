// Automations run on the server against real figures, log each run, and never pile up duplicate tasks.
import { call, openDatabase, reporter, sessionToken, businessIdOf } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const USER = `auto_user_${Date.now()}@example.test`;
const OTHER = `auto_other_${Date.now()}@example.test`;

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const u of [USER, OTHER]) {
    const biz = businessIdOf(u);
    del("DELETE FROM registered_users WHERE email = ?", u);
    del("DELETE FROM business_automations WHERE business_id = ?", biz);
    del("DELETE FROM automation_runs WHERE business_id = ?", biz);
    del("DELETE FROM tasks WHERE business_id = ?", biz);
    del("DELETE FROM businesses WHERE id = ?", biz);
  }
}
cleanup();

try {
  t.check("running needs sign-in", (await call("/api/automations/run", { method: "POST", body: { id: "x" } })).status === 401);

  await call("/api/auth/register", { method: "POST", body: { email: USER, name: "Auto", password: "AutoTest123!" } });
  await call("/api/auth/register", { method: "POST", body: { email: OTHER, name: "Other", password: "AutoTest123!" } });
  const cookie = sessionToken(USER);
  const otherCookie = sessionToken(OTHER);

  // real figures: 2 months of runway
  const biz = businessIdOf(USER);
  db.prepare("INSERT OR REPLACE INTO businesses (id, name, cash_on_hand, monthly_burn, monthly_revenue) VALUES (?, ?, ?, ?, ?)").run(biz, "Auto Co", 200000, 100000, 50000);

  const created = await call("/api/automations", { method: "POST", cookie, body: { title: "Runway alert", trigger: "Runway below 6 months", action: "Cut costs", category: "Finance" } });
  const id = created.json?.automation?.id;
  t.check("an automation can be created", Boolean(id));

  t.check("someone else cannot run it", (await call("/api/automations/run", { method: "POST", cookie: otherCookie, body: { id } })).status === 404);

  const first = await call("/api/automations/run", { method: "POST", cookie, body: { id } });
  t.check("run finds the real runway problem", first.json?.status === "triggered" && /2\.0 months/.test(first.json?.detail || ""));
  t.check("a task was added the first time", first.json?.taskAdded === true);

  const second = await call("/api/automations/run", { method: "POST", cookie, body: { id } });
  t.check("running again does not add a duplicate task", second.json?.taskAdded === false);
  const tasks = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE business_id = ? AND title LIKE '[Automation]%'").get(biz).n;
  t.check("only one automation task exists", tasks === 1);

  const list = await call("/api/automations", { cookie });
  t.check("the run history comes from the server", (list.json?.runs || []).length === 2 && list.json.runs[0].automationName === "Runway alert");
  const other = await call("/api/automations", { cookie: otherCookie });
  t.check("another business sees none of it", (other.json?.runs || []).length === 0);
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);

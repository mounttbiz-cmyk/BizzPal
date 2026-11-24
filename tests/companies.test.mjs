// Groups of companies: categories, nested companies, switching, and that one group can never touch another's.
import { businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const OWNER = `group_owner_${stamp}@example.test`;
const OTHER = `group_other_${stamp}@example.test`;
const MATE = `group_mate_${stamp}@example.test`;
const GROUP = businessIdOf(OWNER);

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [OWNER, OTHER, MATE]) {
    const group = businessIdOf(e);
    const ids = [group, ...db.prepare("SELECT id FROM businesses WHERE group_id = ?").all(group).map(r => r.id)];
    for (const id of ids) {
      del("DELETE FROM tasks WHERE business_id = ?", id);
      del("DELETE FROM team_audit_logs WHERE business_id = ?", id);
      del("DELETE FROM integrations WHERE business_id = ?", id);
      del("DELETE FROM businesses WHERE id = ?", id);
    }
    del("DELETE FROM business_segments WHERE group_id = ?", group);
    del("DELETE FROM active_business WHERE email = ?", e);
    del("DELETE FROM registered_users WHERE email = ?", e);
  }
  del("DELETE FROM team_invites WHERE owner_email = ?", OWNER);
}
cleanup();

try {
  for (const e of [OWNER, OTHER, MATE]) {
    await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "GroupTest123!" } });
  }
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);
  await call("/api/business/intake", { method: "POST", cookie: owner, body: { name: "Test Group", industryLabel: "Holding" } });
  await call("/api/business/intake", { method: "POST", cookie: other, body: { name: "Other Co", industryLabel: "Retail" } });

  // --- building the group
  const empty = await call("/api/companies", { cookie: owner });
  t.check("a new account is a group with no companies", empty.status === 200 && empty.json?.companies?.length === 0 && empty.json?.group?.id === GROUP);
  t.check("the owner can manage the group", empty.json?.canManage === true);

  const seg = await call("/api/companies/segments", { method: "POST", cookie: owner, body: { name: "IT & Digital" } });
  const seg2 = await call("/api/companies/segments", { method: "POST", cookie: owner, body: { name: "Automobiles" } });
  t.check("categories can be created with any name", seg.status === 200 && seg2.status === 200);
  const dupSeg = await call("/api/companies/segments", { method: "POST", cookie: owner, body: { name: "it & digital" } });
  t.check("a duplicate category name is refused", dupSeg.status === 409);

  const digital = await call("/api/companies", {
    method: "POST",
    cookie: owner,
    body: { name: "Digital Co", segmentId: seg.json.id, industry: "it", industryLabel: "IT & Technology Services", monthlyRevenue: 500000, teamSize: 40 },
  });
  t.check("a company can be added to a category", digital.status === 200 && Boolean(digital.json?.id));
  const brand = await call("/api/companies", { method: "POST", cookie: owner, body: { name: "Brand App", parentId: digital.json.id, segmentId: seg2.json.id } });
  t.check("a company can be added under another company", brand.status === 200);
  const motors = await call("/api/companies", { method: "POST", cookie: owner, body: { name: "Motors", segmentId: seg2.json.id, website: "motors.example.com" } });

  const view = await call("/api/companies", { cookie: owner });
  const byName = n => view.json?.companies?.find(c => c.name === n);
  t.check("the overview lists every company", view.json?.companies?.length === 3);
  t.check("a nested company takes its parent's category", byName("Brand App")?.segmentId === seg.json.id && byName("Brand App")?.parentId === digital.json.id);
  t.check("figures are kept, and missing ones are empty rather than zero", byName("Digital Co")?.monthlyRevenue === 500000 && byName("Motors")?.monthlyRevenue === null);
  t.check("websites are tidied", byName("Motors")?.website === "https://motors.example.com");

  const dupCo = await call("/api/companies", { method: "POST", cookie: owner, body: { name: "digital co" } });
  t.check("a duplicate company name is refused", dupCo.status === 409);
  const loop = await call("/api/companies", { method: "PATCH", cookie: owner, body: { id: digital.json.id, parentId: brand.json.id } });
  t.check("a company cannot be placed under its own company", loop.status === 400);
  const badWeb = await call("/api/companies", { method: "POST", cookie: owner, body: { name: "Bad Web", website: "not a site" } });
  t.check("a malformed website is refused", badWeb.status === 400);

  // --- moving a company moves the ones under it
  const moved = await call("/api/companies", { method: "PATCH", cookie: owner, body: { id: digital.json.id, segmentId: seg2.json.id } });
  const afterMove = await call("/api/companies", { cookie: owner });
  const find = (v, n) => v.json?.companies?.find(c => c.name === n);
  t.check("changing a company's category moves the companies under it", moved.status === 200 && find(afterMove, "Brand App")?.segmentId === seg2.json.id);

  // --- working inside a company
  const sw = await call("/api/companies/active", { method: "POST", cookie: owner, body: { businessId: digital.json.id } });
  t.check("the owner can switch to a company", sw.status === 200 && sw.json?.activeBusinessId === digital.json.id);
  const session = await call("/api/auth/session", { cookie: owner });
  t.check("the session says which company is open", session.json?.activeBusinessId === digital.json.id);
  const intake = await call("/api/business/intake", { cookie: owner });
  t.check("the business profile is the company's", intake.json?.business?.name === "Digital Co");

  await call("/api/tasks", { method: "POST", cookie: owner, body: { title: "Company task" } });
  const companyTasks = await call("/api/tasks", { cookie: owner });
  t.check("data created inside a company belongs to it", companyTasks.json?.tasks?.some(x => x.title === "Company task") && companyTasks.json?.businessId === digital.json.id);

  await call("/api/business/intake", { method: "POST", cookie: owner, body: { name: "Digital Co", monthlyRevenue: 750000 } });
  const groupRow = db.prepare("SELECT name FROM businesses WHERE id = ?").get(GROUP);
  const companyRowAfter = db.prepare("SELECT monthly_revenue FROM businesses WHERE id = ?").get(digital.json.id);
  t.check("saving the profile inside a company never renames the group", groupRow?.name === "Test Group" && Number(companyRowAfter?.monthly_revenue) === 750000);
  const account = db.prepare("SELECT business_profile FROM registered_users WHERE email = ?").get(OWNER);
  t.check("the account's own profile is left alone", !String(account?.business_profile || "").includes("Digital Co"));

  const back = await call("/api/companies/active", { method: "POST", cookie: owner, body: { businessId: GROUP } });
  const groupTasks = await call("/api/tasks", { cookie: owner });
  t.check("switching back to the group shows the group's own data", back.status === 200 && !groupTasks.json?.tasks?.some(x => x.title === "Company task"));
  const groupSession = await call("/api/auth/session", { cookie: owner });
  t.check("in the group itself the session reports no company", groupSession.json?.activeBusinessId === null);

  const overview = await call("/api/companies", { cookie: owner });
  t.check("open tasks are counted per company", find(overview, "Digital Co")?.openTasks === 1);

  // --- another account
  const steal = await call("/api/companies/active", { method: "POST", cookie: other, body: { businessId: digital.json.id } });
  t.check("another account cannot open the group's company", steal.status === 404);
  const otherTasks = await call("/api/tasks", { cookie: other });
  t.check("another account still sees only its own data", !otherTasks.json?.tasks?.some(x => x.title === "Company task"));
  const edit = await call("/api/companies", { method: "PATCH", cookie: other, body: { id: digital.json.id, name: "Hijacked" } });
  const remove = await call(`/api/companies?id=${digital.json.id}`, { method: "DELETE", cookie: other });
  t.check("another account cannot change or remove the group's company", edit.status === 404 && remove.status === 404);
  const otherSegDel = await call(`/api/companies/segments?id=${seg.json.id}`, { method: "DELETE", cookie: other });
  t.check("another account cannot delete the group's category", otherSegDel.status === 404);
  const otherView = await call("/api/companies", { cookie: other });
  t.check("another account's overview is its own", otherView.json?.companies?.length === 0 && otherView.json?.group?.id === businessIdOf(OTHER));
  const noAuth = await call("/api/companies");
  t.check("signed-out requests are refused", noAuth.status === 401);

  // --- a teammate of the group
  await call("/api/team/invites", { method: "POST", cookie: owner, body: { inviteEmail: MATE, name: "Mate", role: "Manager" } });
  db.prepare("UPDATE team_invites SET status = 'verified', verified_at = ?, verified_via = 'google' WHERE owner_email = ? AND invite_email = ?")
    .run(new Date(Date.now() - 60000).toISOString(), OWNER, MATE);
  const mate = sessionToken(MATE);
  const mateView = await call("/api/companies", { cookie: mate });
  t.check("a teammate sees the owner's group", mateView.json?.group?.id === GROUP && mateView.json?.companies?.length === 3);
  t.check("a teammate cannot manage the group", mateView.json?.canManage === false);
  const mateAdd = await call("/api/companies", { method: "POST", cookie: mate, body: { name: "Teammate Co" } });
  const mateSeg = await call("/api/companies/segments", { method: "POST", cookie: mate, body: { name: "Teammate category" } });
  t.check("a teammate cannot add companies or categories", mateAdd.status === 403 && mateSeg.status === 403);
  const mateSwitch = await call("/api/companies/active", { method: "POST", cookie: mate, body: { businessId: digital.json.id } });
  const mateTasks = await call("/api/tasks", { cookie: mate });
  t.check("a teammate can open a company of the group", mateSwitch.status === 200 && mateTasks.json?.tasks?.some(x => x.title === "Company task"));
  const ownerStill = await call("/api/tasks", { cookie: owner });
  t.check("each person's open company is their own", ownerStill.json?.businessId === GROUP);
  const matePerms = await call("/api/team/permissions", { cookie: mate });
  t.check("team permissions stay the group's while in a company", matePerms.status === 200);

  // --- categories
  const up = await call("/api/companies/segments", { method: "PATCH", cookie: owner, body: { id: seg2.json.id, move: "up" } });
  const order = await call("/api/companies", { cookie: owner });
  t.check("categories can be reordered", up.status === 200 && order.json?.segments?.[0]?.id === seg2.json.id);
  const delSeg = await call(`/api/companies/segments?id=${seg2.json.id}`, { method: "DELETE", cookie: owner });
  const afterSegDel = await call("/api/companies", { cookie: owner });
  t.check(
    "deleting a category keeps its companies, without a category",
    delSeg.status === 200 && afterSegDel.json?.companies?.length === 3 && afterSegDel.json.companies.every(c => c.segmentId === null)
  );

  // --- removing a company with one under it, while it is open
  await call("/api/companies/active", { method: "POST", cookie: owner, body: { businessId: digital.json.id } });
  const del = await call(`/api/companies?id=${digital.json.id}`, { method: "DELETE", cookie: owner });
  t.check("removing a company removes the companies under it", del.status === 200 && del.json?.removed === 2);
  const leftTasks = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE business_id = ?").get(digital.json.id);
  t.check("its data is removed too", Number(leftTasks?.n) === 0);
  const fallback = await call("/api/tasks", { cookie: owner });
  t.check("someone who had it open is back in the group", fallback.json?.businessId === GROUP);
  const groupStill = db.prepare("SELECT id FROM businesses WHERE id = ?").get(GROUP);
  t.check("the group itself is untouched", Boolean(groupStill) && Boolean(motors.json?.id) && Boolean(db.prepare("SELECT id FROM businesses WHERE id = ?").get(motors.json.id)));
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);

// The business brief: saving answers, keeping each business's brief private, teammates, learning from chat,
// and the safety checks on links and files used for suggestions.
import { BASE, businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const OWNER = `brief_owner_${stamp}@example.test`;
const OTHER = `brief_other_${stamp}@example.test`;
const MATE = `brief_mate_${stamp}@example.test`;

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [OWNER, OTHER, MATE]) {
    const group = businessIdOf(e);
    const ids = [group, ...db.prepare("SELECT id FROM businesses WHERE group_id = ?").all(group).map(r => r.id)];
    for (const id of ids) {
      del("DELETE FROM business_briefs WHERE business_id = ?", id);
      del("DELETE FROM integrations WHERE business_id = ?", id);
      del("DELETE FROM team_audit_logs WHERE business_id = ?", id);
      del("DELETE FROM businesses WHERE id = ?", id);
    }
    del("DELETE FROM business_segments WHERE group_id = ?", group);
    del("DELETE FROM active_business WHERE email = ?", e);
    del("DELETE FROM registered_users WHERE email = ?", e);
  }
  del("DELETE FROM team_invites WHERE owner_email = ?", OWNER);
}
cleanup();

async function upload(cookie, fields) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  const res = await fetch(BASE + "/api/business/brief/suggest", { method: "POST", body: form, headers: cookie ? { Cookie: `bizzpal_user_token=${cookie}` } : {} });
  return { status: res.status, json: await res.json().catch(() => null) };
}

try {
  for (const e of [OWNER, OTHER, MATE]) {
    await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "BriefTest123!" } });
  }
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);
  await call("/api/business/intake", { method: "POST", cookie: owner, body: { name: "Sharma Sweets", industryLabel: "Food" } });

  // --- reading and saving
  const empty = await call("/api/business/brief", { cookie: owner });
  t.check("a new business starts with an empty brief", empty.status === 200 && empty.json?.answered === 0 && empty.json?.total >= 1);
  t.check("the questions come from the server", Array.isArray(empty.json?.fields) && empty.json.fields.every(f => f.key && f.label && f.question));
  t.check("the owner can edit it", empty.json?.canEdit === true);

  const save = await call("/api/business/brief", {
    method: "PUT",
    cookie: owner,
    body: { summary: "  A sweet shop in Pune.  ", values: { offering: "Mithai and namkeen", customers: "  Families  ", made_up_question: "ignored" } },
  });
  t.check("answers are saved", save.status === 200 && save.json?.answered === 2);
  const read = await call("/api/business/brief", { cookie: owner });
  t.check("saved answers come back, tidied", read.json?.values?.offering?.value === "Mithai and namkeen" && read.json?.values?.customers?.value === "Families" && read.json?.summary === "A sweet shop in Pune.");
  t.check("unknown questions are not stored", !read.json?.values?.made_up_question);
  t.check("each answer remembers it came from the owner", read.json?.values?.offering?.source === "owner");

  const clear = await call("/api/business/brief", { method: "PUT", cookie: owner, body: { values: { customers: "" } } });
  t.check("an empty answer clears it", clear.json?.answered === 1);
  const long = await call("/api/business/brief", { method: "PUT", cookie: owner, body: { values: { goals: "x".repeat(5000) } } });
  const longRead = await call("/api/business/brief", { cookie: owner });
  t.check("very long answers are cut to a sensible length", long.status === 200 && longRead.json?.values?.goals?.value.length <= 600);

  // --- learning from chat
  const learn1 = await call("/api/business/brief/learn", { method: "POST", cookie: owner, body: { key: "customers", value: "Families in Kothrud" } });
  const learn2 = await call("/api/business/brief/learn", { method: "POST", cookie: owner, body: { key: "customers", value: "Corporate Diwali gifting" } });
  t.check("something learned in chat is saved", learn1.status === 200 && learn1.json?.value === "Families in Kothrud");
  t.check("a second thing learned is added, not overwritten", learn2.json?.value === "Families in Kothrud; Corporate Diwali gifting");
  const learnBad = await call("/api/business/brief/learn", { method: "POST", cookie: owner, body: { key: "nope", value: "x" } });
  t.check("learning into an unknown question is refused", learnBad.status === 400);

  // --- privacy
  const otherRead = await call("/api/business/brief", { cookie: other });
  t.check("another account sees only its own brief", otherRead.json?.answered === 0 && !otherRead.json?.values?.offering);
  t.check("signed-out requests are refused", (await call("/api/business/brief")).status === 401);

  // --- companies of a group keep their own brief
  const co = await call("/api/companies", { method: "POST", cookie: owner, body: { name: "Sharma Caterers" } });
  await call("/api/companies/active", { method: "POST", cookie: owner, body: { businessId: co.json.id } });
  const coBrief = await call("/api/business/brief", { cookie: owner });
  t.check("a company of the group has its own brief", coBrief.json?.businessName === "Sharma Caterers" && coBrief.json?.answered === 0);
  await call("/api/business/brief", { method: "PUT", cookie: owner, body: { values: { offering: "Wedding catering" } } });
  await call("/api/companies/active", { method: "POST", cookie: owner, body: { businessId: businessIdOf(OWNER) } });
  const groupBrief = await call("/api/business/brief", { cookie: owner });
  t.check("the group's brief is untouched by the company's", groupBrief.json?.values?.offering?.value === "Mithai and namkeen");

  // --- teammates can read but not change
  await call("/api/team/invites", { method: "POST", cookie: owner, body: { inviteEmail: MATE, name: "Mate", role: "Manager" } });
  db.prepare("UPDATE team_invites SET status = 'verified', verified_at = ?, verified_via = 'google' WHERE owner_email = ? AND invite_email = ?")
    .run(new Date(Date.now() - 60000).toISOString(), OWNER, MATE);
  const mate = sessionToken(MATE);
  const mateRead = await call("/api/business/brief", { cookie: mate });
  t.check("a teammate can read the owner's brief", mateRead.status === 200 && mateRead.json?.values?.offering?.value === "Mithai and namkeen" && mateRead.json?.canEdit === false);
  const mateWrite = await call("/api/business/brief", { method: "PUT", cookie: mate, body: { values: { offering: "changed" } } });
  const mateLearn = await call("/api/business/brief/learn", { method: "POST", cookie: mate, body: { key: "goals", value: "x" } });
  const mateSuggest = await upload(mate, { description: "We sell sweets in Pune to families." });
  t.check("a teammate cannot change it", mateWrite.status === 403 && mateLearn.status === 403 && mateSuggest.status === 403);

  // --- suggestion inputs are checked before anything is read
  t.check("asking for suggestions with nothing given is refused", (await upload(owner, {})).status === 400);
  t.check("a link that isn't a web address is refused", (await upload(owner, { link: "not a link" })).status === 400);
  const privateLink = await upload(owner, { link: "http://127.0.0.1:3000/api/health" });
  t.check("private and internal addresses are never opened", privateLink.status === 422);
  const metadata = await upload(owner, { link: "http://169.254.169.254/latest/meta-data/" });
  t.check("cloud metadata addresses are never opened", metadata.status === 422);
  t.check("unsupported file types are refused", (await upload(owner, { file: new File(["MZ"], "tool.exe", { type: "application/octet-stream" }) })).status === 400);
  t.check("empty files are refused", (await upload(owner, { file: new File([], "menu.txt", { type: "text/plain" }) })).status === 400);
  const big = new File([new Uint8Array(9 * 1024 * 1024)], "menu.pdf", { type: "application/pdf" });
  t.check("files over 8 MB are refused", (await upload(owner, { file: big })).status === 400);

  // --- a real suggestion (needs an AI provider; skipped when none can answer from here)
  const suggestion = await upload(owner, {
    description: "We are Sharma Sweets in Kothrud, Pune. We make mithai like kaju katli and motichoor laddoo and sell over the counter and on Swiggy. Prices are 400 to 1200 rupees a kilo. Our goal this year is a second shop in Baner.",
  });
  if (suggestion.status === 503) {
    console.log("SKIP suggestion from a description (no AI provider answered from this machine)");
  } else {
    const v = suggestion.json?.values || {};
    const known = new Set(empty.json.fields.map(f => f.key));
    t.check("suggestions come back only for known questions", suggestion.status === 200 && Object.keys(v).every(k => known.has(k)));
    t.check("suggestions use what the owner wrote", JSON.stringify(v).toLowerCase().includes("baner") || JSON.stringify(v).toLowerCase().includes("kothrud"));
    t.check("nothing is saved until the owner saves", (await call("/api/business/brief", { cookie: owner })).json?.values?.locations === undefined);
  }
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);

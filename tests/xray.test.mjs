// Business X-Ray: who can run and see it, the website safety checks, and that a finished report only cites pages
// that were actually read.
import { businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const OWNER = `xray_owner_${stamp}@example.test`;
const OTHER = `xray_other_${stamp}@example.test`;
const MATE = `xray_mate_${stamp}@example.test`;

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [OWNER, OTHER, MATE]) {
    const id = businessIdOf(e);
    del("DELETE FROM business_xrays WHERE business_id = ?", id);
    del("DELETE FROM integrations WHERE business_id = ?", id);
    del("DELETE FROM team_audit_logs WHERE business_id = ?", id);
    del("DELETE FROM businesses WHERE id = ?", id);
    del("DELETE FROM registered_users WHERE email = ?", e);
  }
  del("DELETE FROM team_invites WHERE owner_email = ?", OWNER);
}
cleanup();

async function waitFor(cookie, id, ms = 150_000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const r = await call(`/api/business/xray/${id}`, { cookie });
    const x = r.json?.xray;
    if (x && (x.status === "done" || x.status === "failed")) return x;
    await new Promise(res => setTimeout(res, 2000));
  }
  return null;
}

try {
  for (const e of [OWNER, OTHER, MATE]) {
    await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "XrayTest123!" } });
  }
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);

  const empty = await call("/api/business/xray", { cookie: owner });
  t.check("a new business has no X-Ray yet", empty.status === 200 && empty.json?.latest === null && empty.json?.canRun === true);
  t.check("signed-out requests are refused", (await call("/api/business/xray")).status === 401);

  // --- addresses are checked before anything is opened
  t.check("an empty address is refused", (await call("/api/business/xray", { method: "POST", cookie: owner, body: { url: "" } })).status === 400);
  t.check("something that isn't a web address is refused", (await call("/api/business/xray", { method: "POST", cookie: owner, body: { url: "not a website" } })).status === 400);

  const local = await call("/api/business/xray", { method: "POST", cookie: owner, body: { url: "http://127.0.0.1:3000/" } });
  const localDone = local.status === 202 ? await waitFor(owner, local.json.id) : null;
  t.check("this server and private addresses are never opened", localDone?.status === "failed" && !localDone?.snapshot);
  const meta = await call("/api/business/xray", { method: "POST", cookie: owner, body: { url: "http://169.254.169.254/latest/meta-data/" } });
  const metaDone = meta.status === 202 ? await waitFor(owner, meta.json.id) : null;
  t.check("cloud metadata addresses are never opened", metaDone?.status === "failed" && !metaDone?.snapshot);

  // --- privacy
  const stolen = await call(`/api/business/xray/${local.json.id}`, { cookie: other });
  t.check("another account cannot open this business's X-Ray", stolen.status === 404);
  const otherList = await call("/api/business/xray", { cookie: other });
  t.check("another account's list is its own", otherList.json?.history?.length === 0);

  // --- teammates can look but not run
  await call("/api/team/invites", { method: "POST", cookie: owner, body: { inviteEmail: MATE, name: "Mate", role: "Manager" } });
  db.prepare("UPDATE team_invites SET status = 'verified', verified_at = ?, verified_via = 'google' WHERE owner_email = ? AND invite_email = ?")
    .run(new Date(Date.now() - 60000).toISOString(), OWNER, MATE);
  const mate = sessionToken(MATE);
  const mateView = await call("/api/business/xray", { cookie: mate });
  t.check("a teammate can see the owner's X-Rays", mateView.status === 200 && mateView.json?.history?.length >= 2 && mateView.json?.canRun === false);
  const mateRun = await call("/api/business/xray", { method: "POST", cookie: mate, body: { url: "example.com" } });
  t.check("a teammate cannot start an X-Ray", mateRun.status === 403);

  // --- a real website (needs internet and an AI provider; the AI part is skipped when none answers from here)
  const first = await call("/api/business/xray", { method: "POST", cookie: owner, body: { url: "https://www.webenza.com" } });
  const again = await call("/api/business/xray", { method: "POST", cookie: owner, body: { url: "https://www.webenza.com" } });
  t.check("only one X-Ray runs at a time for a business", first.status === 202 && again.json?.id === first.json?.id && again.json?.alreadyRunning === true);
  const real = await waitFor(owner, first.json.id);
  if (!real || (real.status === "failed" && /analysis|couldn't open/i.test(real.error || ""))) {
    console.log("SKIP real-site checks (" + (real?.error || "no result") + ")");
  } else {
    const pageIds = new Set((real.snapshot?.pages || []).map(p => p.id));
    const r = real.result;
    t.check("a real website is read and analysed", real.status === "done" && pageIds.size >= 1 && Boolean(r));
    t.check("the snapshot records what was read and when", real.snapshot.pages.every(p => p.url && p.fetchedAt && p.contentHash && !("text" in p)));
    t.check("every finding has evidence from a page that was read", r.opportunities.every(o => o.evidence.length > 0 && o.evidence.every(e => pageIds.has(e.page) || e.page === "brief")));
    t.check("at most three problems are shown", r.opportunities.length <= 3);
    t.check("the priority score is the PRD formula", r.opportunities.every(o => {
      const f = o.factors;
      return Math.abs(o.score - Math.round(((f.impact * f.confidence * f.feasibility * f.urgency) / f.effort) * 10) / 10) < 0.01;
    }));
    t.check("every profile fact names its source", Object.values(r.profile).every(f => f.value === null || (f.sources.length > 0 && f.sources.every(s => pageIds.has(s) || s === "brief"))));
    t.check("the industry is one of the allowed ones", ["real_estate", "financial_services", "saas_agency", "general"].includes(r.industry.id));
    t.check("a general business gets no agent", r.industry.id !== "general" || r.recommendedAgent === null);
    t.check("the run is stored with its versions", real.schemaVersion === "xray.v1" && Boolean(real.promptVersion));
    t.check("it finished in under 90 seconds", real.durationMs < 90_000, `${Math.round(real.durationMs / 1000)}s`);
  }
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);

// Brain Drive verified facts: provenance (owner, source, verifiedAt, expiresAt, version), purpose/role filtering,
// expired-fact exclusion, and strict tenant isolation.
import { businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const OWNER = `bd_owner_${stamp}@example.test`;
const OTHER = `bd_other_${stamp}@example.test`;
const MATE = `bd_mate_${stamp}@example.test`;

function cleanup() {
  const del = (sql, ...a) => { try { db.prepare(sql).run(...a); } catch {} };
  for (const e of [OWNER, OTHER, MATE]) {
    const id = businessIdOf(e);
    del("DELETE FROM business_facts WHERE business_id = ?", id);
    del("DELETE FROM businesses WHERE id = ?", id);
    del("DELETE FROM registered_users WHERE email = ?", e);
  }
  del("DELETE FROM team_invites WHERE owner_email = ?", OWNER);
}
cleanup();

try {
  t.check("facts require sign-in", (await call("/api/knowledge/facts")).status === 401);

  for (const e of [OWNER, OTHER, MATE]) {
    await call("/api/auth/register", { method: "POST", body: { email: e, name: e.split("@")[0], password: "BrainTest123!" } });
  }
  const owner = sessionToken(OWNER);
  const other = sessionToken(OTHER);

  // 1. Create a verified fact with provenance
  const future = new Date(Date.now() + 86_400_000).toISOString();
  const created = await call("/api/knowledge/facts", {
    method: "POST",
    cookie: owner,
    body: {
      category: "finance",
      key: "gst_rate",
      value: "18%",
      owner: "CFO",
      source: "https://example.com/pricing",
      expiresAt: future,
      classification: "internal",
      purpose: "pricing",
    },
  });
  const f1 = created.json?.fact;
  t.check(
    "fact stores owner, source, verifiedAt, expiresAt, and version 1",
    created.status === 200 && f1?.owner === "CFO" && f1?.source === "https://example.com/pricing" && Boolean(f1?.verifiedAt) && f1?.expiresAt === future && f1?.version === 1
  );

  // 2. Updating same category+key increments version to 2
  const updated = await call("/api/knowledge/facts", {
    method: "POST",
    cookie: owner,
    body: { category: "finance", key: "gst_rate", value: "12%", source: "CA confirmation", purpose: "pricing" },
  });
  t.check("updating a fact increments its version", updated.status === 200 && updated.json?.fact?.version === 2);

  // 3. Expired facts are excluded by default
  const past = new Date(Date.now() - 86_400_000).toISOString();
  await call("/api/knowledge/facts", {
    method: "POST",
    cookie: owner,
    body: { category: "marketing", key: "old_offer", value: "10% off", expiresAt: past },
  });
  const activeList = (await call("/api/knowledge/facts", { cookie: owner })).json?.facts || [];
  t.check("expired facts are excluded by default", activeList.some(f => f.key === "gst_rate" && f.version === 2) && !activeList.some(f => f.key === "old_offer"));
  const allList = (await call("/api/knowledge/facts?includeExpired=1", { cookie: owner })).json?.facts || [];
  t.check("expired facts can be inspected when requested", allList.some(f => f.key === "old_offer" && f.expired === true));

  // 4. Purpose filtering
  const salesList = (await call("/api/knowledge/facts?purpose=sales", { cookie: owner })).json?.facts || [];
  t.check("purpose filter excludes facts scoped to another purpose", !salesList.some(f => f.key === "gst_rate"));

  // 5. Role / classification filtering
  await call("/api/knowledge/facts", {
    method: "POST",
    cookie: owner,
    body: { category: "legal", key: "board_note", value: "Confidential term sheet", classification: "restricted" },
  });
  await call("/api/team/invites", { method: "POST", cookie: owner, body: { inviteEmail: MATE, name: "Mate", role: "Manager" } });
  db.prepare("UPDATE team_invites SET status = 'verified', verified_at = ?, verified_via = 'google' WHERE owner_email = ? AND invite_email = ?")
    .run(new Date(Date.now() - 60000).toISOString(), OWNER, MATE);
  const mate = sessionToken(MATE);
  const permsRes = await call("/api/team/permissions", { cookie: owner });
  const matrix = permsRes.json?.matrix || {};
  if (matrix.compliance) matrix.compliance.Manager = "Read only";
  await call("/api/team/permissions", { method: "PUT", cookie: owner, body: { matrix } });
  const mateFactsRes = await call("/api/knowledge/facts", { cookie: mate });
  const mateFacts = mateFactsRes.json?.facts || [];
  t.check("restricted facts are hidden from non-owner roles", mateFactsRes.status === 200 && !mateFacts.some(f => f.key === "board_note") && mateFacts.some(f => f.key === "gst_rate"));

  // 6. Tenant isolation
  const otherFacts = (await call("/api/knowledge/facts", { cookie: other })).json?.facts || [];
  t.check("another business cannot see owner's facts", otherFacts.length === 0);
  await call(`/api/knowledge/facts?id=${encodeURIComponent(updated.json.fact.id)}`, { method: "DELETE", cookie: other });
  const stillThere = (await call("/api/knowledge/facts", { cookie: owner })).json?.facts || [];
  t.check("another business cannot delete owner's facts", stillThere.some(f => f.id === updated.json.fact.id));
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);

// Plan activation: paid plans can only come from a verified payment, never from a direct request.
import { businessIdOf, call, openDatabase, reporter, sessionToken } from "./helpers.mjs";

const t = reporter();
const db = openDatabase();
const stamp = Date.now();
const USER = `activate_${stamp}@example.test`;
const VICTIM = `activate_victim_${stamp}@example.test`;

function cleanup() {
  for (const e of [USER, VICTIM]) {
    for (const sql of ["DELETE FROM subscriptions WHERE user_email = ?", "DELETE FROM payment_transactions WHERE user_email = ?", "DELETE FROM registered_users WHERE email = ?"]) {
      try { db.prepare(sql).run(e); } catch {}
    }
    try { db.prepare("DELETE FROM businesses WHERE id = ?").run(businessIdOf(e)); } catch {}
  }
}
cleanup();

const planOf = email => db.prepare("SELECT plan_id FROM subscriptions WHERE user_email = ?").get(email)?.plan_id || null;

try {
  for (const e of [USER, VICTIM]) await call("/api/auth/register", { method: "POST", body: { email: e, name: "Test", password: "Activate123!" } });
  const user = sessionToken(USER);

  const plans = (await call("/api/public/config")).json?.plans || [];
  const paid = plans.find(p => p.id !== "free" && parseFloat(String(p.price).replace(/[^0-9.]/g, "")) > 0);
  const free = plans.find(p => p.id === "free");

  // signed out, with someone else's email in the body
  const anon = await call("/api/payments/activate", { method: "POST", body: { planId: paid?.id || "growth", userEmail: VICTIM } });
  t.check("signed-out requests are refused, even with an email", anon.status === 401 && planOf(VICTIM) === null);

  if (paid) {
    const direct = await call("/api/payments/activate", { method: "POST", cookie: user, body: { planId: paid.id } });
    t.check("a paid plan cannot be switched on without paying", direct.status === 402 && planOf(USER) === null);
    const forOther = await call("/api/payments/activate", { method: "POST", cookie: user, body: { planId: paid.id, userEmail: VICTIM } });
    t.check("an email in the request is ignored", forOther.status === 402 && planOf(VICTIM) === null);

    // A verified payment switched it on: confirming it again is fine
    db.prepare("INSERT INTO subscriptions (id, user_email, plan_id, plan_name, amount, currency, status, created_at, current_period_end) VALUES (?, ?, ?, ?, 1, 'INR', 'active', ?, ?)")
      .run(`sub_${stamp}`, USER, paid.id, paid.name, new Date().toISOString(), new Date(Date.now() + 864e5).toISOString());
    const confirm = await call("/api/payments/activate", { method: "POST", cookie: user, body: { planId: paid.id } });
    t.check("a plan that was paid for is confirmed", confirm.status === 200 && planOf(USER) === paid.id);
  } else {
    console.log("SKIP paid-plan checks (no paid plan is configured)");
  }

  if (free) {
    const toFree = await call("/api/payments/activate", { method: "POST", cookie: user, body: { planId: "free" } });
    t.check("the free plan can be chosen directly", toFree.status === 200 && planOf(USER) === "free");
  }
  const unknown = await call("/api/payments/activate", { method: "POST", cookie: user, body: { planId: "platinum_unlimited" } });
  t.check("unknown plans are refused", unknown.status === 404);
} catch (err) {
  t.check("test run", false, String(err?.stack || err));
} finally {
  cleanup();
}

process.exit(t.done() ? 0 : 1);

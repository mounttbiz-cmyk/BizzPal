// Removes every account and business the tests created, so the admin console only shows real customers.
// Test data is recognised by the reserved test domain: emails ending in "@example.test" and business ids ending
// in "_example_test" (plus the companies inside such a group). Real accounts are never touched.
//
//   node tests/cleanup.mjs           (the app must be running; deletes go through the admin API)
//
// run.mjs calls this after every test run.
import { pathToFileURL } from "node:url";
import { BASE, loadEnv, openDatabase } from "./helpers.mjs";

const TEST_EMAIL = /@example\.test$/i;
const TEST_BUSINESS = /_example_test$/i;

export async function cleanupTestData({ quiet = false } = {}) {
  const env = loadEnv();
  const passcode = env.SUPERADMIN_PASSCODE || env.ADMIN_PASSCODE;
  if (!passcode) {
    if (!quiet) console.log("SKIP cleanup (no SUPERADMIN_PASSCODE in .env)");
    return { users: 0, businesses: 0 };
  }

  const db = openDatabase();
  let users, businesses;
  try {
    users = db.prepare("SELECT email FROM registered_users").all().map(r => r.email).filter(e => TEST_EMAIL.test(e));
    // Top-level test businesses only: deleting a group also deletes its companies
    businesses = db
      .prepare("SELECT id FROM businesses WHERE group_id IS NULL OR group_id = ''")
      .all()
      .map(r => r.id)
      .filter(id => TEST_BUSINESS.test(id));
  } finally {
    db.close();
  }
  if (users.length === 0 && businesses.length === 0) {
    if (!quiet) console.log("No test data to remove.");
    return { users: 0, businesses: 0 };
  }

  const auth = await fetch(BASE + "/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ passcode }),
  });
  const cookie = (auth.headers.getSetCookie?.() || []).map(c => c.split(";")[0]).join("; ");
  if (!auth.ok || !cookie) throw new Error(`Could not sign in to the admin API (HTTP ${auth.status})`);

  const del = async query => {
    const res = await fetch(`${BASE}/api/admin/tenants?${query}`, { method: "DELETE", headers: { cookie, Accept: "application/json" } });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(`Delete failed for ${query}: HTTP ${res.status} ${json.error || ""}`);
  };
  for (const email of users) await del(`userEmail=${encodeURIComponent(email)}`);
  for (const id of businesses) await del(`businessId=${encodeURIComponent(id)}`);

  if (!quiet) console.log(`Removed ${users.length} test accounts and ${businesses.length} test businesses.`);
  return { users: users.length, businesses: businesses.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  cleanupTestData().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

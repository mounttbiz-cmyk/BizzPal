// Email and password sign-in: sign-up rules, hashing, wrong passwords, lock-out, password changes.
import { businessIdOf, call, openDatabase, reporter } from "./helpers.mjs";

const db = openDatabase();
const post = (path, body, cookie) => call(path, { method: "POST", body, cookie });

const NEW = "qa.signup@mounttgroup.com";
const GOOGLE = "qa.googleuser@mounttgroup.com";
const OLD = "qa.olduser@mounttgroup.com";
const all = [NEW, GOOGLE, OLD];

const cleanup = () => {
  for (const e of all) {
    db.prepare("DELETE FROM registered_users WHERE email = ?").run(e);
    db.prepare("DELETE FROM businesses WHERE id = ?").run(businessIdOf(e));
  }
};
cleanup();
const now = new Date().toISOString();
db.prepare("INSERT INTO registered_users (id, email, name, provider, created_at) VALUES (?, ?, 'G', 'google', ?)").run("usr_g_qa", GOOGLE, now);
db.prepare("INSERT INTO registered_users (id, email, name, provider, created_at) VALUES (?, ?, 'O', 'email', ?)").run("usr_o_qa", OLD, now);

const t = reporter();
const { check } = t;

try {
  let r = await post("/api/auth/register", { email: NEW, password: "short", name: "QA" });
  check("weak password refused", r.status === 400 && r.json.code === "weak_password");
  r = await post("/api/auth/register", { email: "someone@mailinator.com", password: "a-good-password-1", name: "QA" });
  check("throw-away email refused", r.status === 400);

  r = await post("/api/auth/register", { email: NEW, password: "a-good-password-1", name: "QA Signup" });
  check("sign-up works and sets a session", r.status === 200 && r.json.success && r.cookie);
  check("the session cookie is HttpOnly", /HttpOnly/i.test(r.setCookie));
  const cookie = r.cookie;
  const me = await call("/api/auth/session", { cookie });
  check("the session says who I am", me.status === 200 && me.json.email === NEW && me.json.name === "QA Signup");
  const row = db.prepare("SELECT password_hash FROM registered_users WHERE email = ?").get(NEW);
  check("the password is stored hashed, not as text", row.password_hash?.startsWith("scrypt$") && !row.password_hash.includes("a-good-password-1"));
  check("a new account can use the app APIs", (await call("/api/tasks", { cookie })).status === 200);

  r = await post("/api/auth/register", { email: NEW, password: "another-password-2", name: "Dupe" });
  check("cannot sign up twice with the same email", r.status === 409 && r.json.code === "account_exists");

  check("the correct password signs in", (await post("/api/auth/login", { email: NEW, password: "a-good-password-1" })).cookie);
  r = await post("/api/auth/login", { email: NEW, password: "wrong-password-1" });
  check("a wrong password is refused", r.status === 401 && r.json.code === "invalid_credentials" && !r.cookie);
  r = await post("/api/auth/login", { email: "nobody.at.all@mounttgroup.com", password: "whatever-123" });
  check("an unknown email gets the same answer as a wrong password", r.status === 401 && r.json.code === "invalid_credentials");

  r = await post("/api/auth/login", { email: GOOGLE, password: "anything-123" });
  check("a Google account is told to use Google", r.status === 400 && r.json.code === "google_account");
  r = await post("/api/auth/login", { email: OLD, password: "anything-123" });
  check("an older account without a password needs a reset", r.status === 403 && r.json.code === "needs_password_reset");

  r = await post("/api/auth/password", { currentPassword: "wrong-password-1", newPassword: "new-password-123" }, cookie);
  check("cannot change the password with the wrong current one", r.status === 403);
  r = await post("/api/auth/password", { currentPassword: "a-good-password-1", newPassword: "new-password-123" }, cookie);
  check("can change the password with the right current one", r.status === 200 && r.json.success);
  check("the old password no longer works", (await post("/api/auth/login", { email: NEW, password: "a-good-password-1" })).status === 401);
  check("the new password works", (await post("/api/auth/login", { email: NEW, password: "new-password-123" })).status === 200);
  check("changing a password needs a session", (await post("/api/auth/password", { newPassword: "new-password-999" })).status === 401);

  check("nobody but the admin can reset a password", (await post("/api/admin/users/password", { email: OLD, newPassword: "set-by-admin-1" })).status === 401);

  let locked = false;
  for (let i = 0; i < 12 && !locked; i++) {
    locked = (await post("/api/auth/login", { email: NEW, password: "bad-guess-" + i })).status === 429;
  }
  check("repeated wrong passwords are locked out", locked);
  check("even the right password waits during the lock-out", (await post("/api/auth/login", { email: NEW, password: "new-password-123" })).status === 429);
} finally {
  cleanup();
}
process.exit(t.done() ? 0 : 1);

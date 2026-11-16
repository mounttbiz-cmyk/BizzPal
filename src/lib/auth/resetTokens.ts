import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";

/** One-time password reset links. Only a hash of the token is stored, so a copy of the database cannot be used to reset anyone. */

const TTL_MS = 60 * 60 * 1000; // links work for one hour
let ready = false;

function ensureSchema() {
  if (ready) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
  `);
  ready = true;
}

const hashOf = (token: string) => createHash("sha256").update(token).digest("hex");
const clean = (email: string) => String(email || "").trim().toLowerCase();

/** Creates a new link for the email and cancels any older ones. Returns the raw token for the email only. */
export function createResetToken(email: string): string {
  ensureSchema();
  const e = clean(email);
  db.prepare("UPDATE password_resets SET used_at = ? WHERE email = ? AND used_at IS NULL").run(new Date().toISOString(), e);
  const token = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO password_resets (id, email, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
    randomUUID(), e, hashOf(token), Date.now() + TTL_MS, new Date().toISOString()
  );
  return token;
}

/** Looks the token up without using it up (for showing the form). */
export function checkResetToken(token: string): string | null {
  ensureSchema();
  if (!/^[A-Za-z0-9_-]{30,64}$/.test(String(token || ""))) return null;
  const row = db.prepare("SELECT email, expires_at, used_at FROM password_resets WHERE token_hash = ?").get(hashOf(token)) as any;
  if (!row || row.used_at || row.expires_at < Date.now()) return null;
  return row.email;
}

/** Uses the token up. Returns the email it belonged to, or null if it was wrong, used or expired. */
export function consumeResetToken(token: string): string | null {
  const email = checkResetToken(token);
  if (!email) return null;
  const r = db.prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ? AND used_at IS NULL").run(new Date().toISOString(), hashOf(token));
  return Number(r.changes) === 1 ? email : null;
}

import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { sendMail, type MailResult } from "@/lib/mail";

/**
 * Emailing a creator from inside BizzPal. It is built to be careful, because unwanted bulk email harms the people who
 * receive it and BizzPal's own ability to send mail:
 *  - only to an address that was found for that creator (never typed in freely),
 *  - a small daily limit per person, and never the same address twice within two weeks,
 *  - every message says who sent it, replies go straight to the sender, and there is a one-click unsubscribe,
 *  - anyone who unsubscribes is never emailed through BizzPal again.
 */

const DAILY_LIMIT = () => Number(process.env.OUTREACH_DAILY_LIMIT) || 10;
const REPEAT_DAYS = 14;

let ready = false;
function ensureSchema() {
  if (ready) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS outreach_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_email TEXT NOT NULL,
      to_email TEXT NOT NULL,
      channel_id TEXT,
      subject TEXT,
      sent_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_outreach_user ON outreach_log(user_email, sent_at);
    CREATE INDEX IF NOT EXISTS idx_outreach_to ON outreach_log(to_email, sent_at);
    CREATE TABLE IF NOT EXISTS email_suppressions (
      email TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL
    );
  `);
  ready = true;
}

const clean = (e: string) => String(e || "").trim().toLowerCase();

// ---------------------------------------------------------------- unsubscribe links

function key(): string {
  const k = process.env.SECRETS_KEY || process.env.ADMIN_SESSION_SECRET || process.env.SUPERADMIN_PASSCODE || "";
  return k ? `unsubscribe-v1:${k}` : "";
}

const sign = (email: string) => createHmac("sha256", key()).update(email).digest("base64url");

export function unsubscribeToken(email: string): string | null {
  if (!key()) return null;
  const e = clean(email);
  return `${Buffer.from(e).toString("base64url")}.${sign(e)}`;
}

/** The email an unsubscribe link belongs to, or null when the link was altered. */
export function verifyUnsubscribeToken(token: string): string | null {
  try {
    if (!key()) return null;
    const [enc, sig] = String(token || "").split(".");
    if (!enc || !sig) return null;
    const email = Buffer.from(enc, "base64url").toString("utf8");
    const expected = Buffer.from(sign(email));
    const given = Buffer.from(sig);
    return expected.length === given.length && timingSafeEqual(expected, given) ? email : null;
  } catch {
    return null;
  }
}

export function suppress(email: string) {
  ensureSchema();
  db.prepare("INSERT OR IGNORE INTO email_suppressions (email, created_at) VALUES (?, ?)").run(clean(email), Date.now());
}

export function isSuppressed(email: string): boolean {
  ensureSchema();
  return Boolean(db.prepare("SELECT 1 FROM email_suppressions WHERE email = ?").get(clean(email)));
}

// ---------------------------------------------------------------- sending

export type OutreachResult = { ok: true; sentToday: number; limit: number } | { ok: false; status: number; error: string };

export async function sendOutreach(opts: {
  fromEmail: string;
  fromName: string;
  to: string;
  subject: string;
  body: string;
  channelId: string;
  baseUrl: string;
}): Promise<OutreachResult> {
  ensureSchema();
  const to = clean(opts.to);
  const from = clean(opts.fromEmail);
  const token = unsubscribeToken(to);
  if (!token) return { ok: false, status: 503, error: "Email sending isn't set up safely on this server yet." };

  if (isSuppressed(to)) return { ok: false, status: 409, error: "This person has asked not to be emailed through BizzPal, so the message was not sent." };

  const dayAgo = Date.now() - 86_400_000;
  const sentToday = (db.prepare("SELECT COUNT(*) c FROM outreach_log WHERE user_email = ? AND sent_at > ?").get(from, dayAgo) as any).c as number;
  if (sentToday >= DAILY_LIMIT()) return { ok: false, status: 429, error: `You have reached today's limit of ${DAILY_LIMIT()} emails to creators. Please try again tomorrow.` };

  const recent = db.prepare("SELECT sent_at FROM outreach_log WHERE to_email = ? AND sent_at > ? ORDER BY sent_at DESC LIMIT 1").get(to, Date.now() - REPEAT_DAYS * 86_400_000) as any;
  if (recent) return { ok: false, status: 409, error: `This address was already emailed through BizzPal in the last ${REPEAT_DAYS} days. Please wait before writing again.` };

  const unsubscribeUrl = `${opts.baseUrl}/api/outreach/unsubscribe?t=${encodeURIComponent(token)}`;
  const NL = String.fromCharCode(10);
  const footer = [
    "",
    "--",
    `This message was written and sent by ${opts.fromName} (${from}) using BizzPal. Reply to this email to reach them directly.`,
    `If you do not want to receive messages sent through BizzPal, unsubscribe here: ${unsubscribeUrl}`,
  ].join(NL);

  const sent: MailResult = await sendMail({
    to,
    subject: opts.subject,
    text: opts.body.trim() + NL + footer,
    replyTo: from,
    fromName: `${opts.fromName} via BizzPal`,
    headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
  });
  if (!sent.ok) return { ok: false, status: 502, error: sent.error };

  db.prepare("INSERT INTO outreach_log (user_email, to_email, channel_id, subject, sent_at) VALUES (?, ?, ?, ?, ?)").run(from, to, opts.channelId, opts.subject.slice(0, 200), Date.now());
  return { ok: true, sentToday: sentToday + 1, limit: DAILY_LIMIT() };
}

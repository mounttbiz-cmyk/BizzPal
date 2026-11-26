import { randomBytes } from "crypto";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "@/lib/db";
import { getEmailCredentials, SANDBOX_HOST } from "@/lib/integrations/emailAccount";
import { businessEvent } from "@/lib/agents/schedule";
import { addLead, createSource, describeLead, findSource, updateSource, type LeadSource } from "./store";

/**
 * New enquiries from the business's own inbox, read from the email account it already connected (the same login,
 * over IMAP). Only emails that arrive after reading is switched on are taken; newsletters, automatic replies and the
 * business's own messages are left out. Nothing in the mailbox is changed: messages are not even marked as read.
 *
 * The test account (sandbox.example.test) reads from a local test mailbox instead, and only off production.
 */

const KNOWN_IMAP: Record<string, string> = {
  "smtp.gmail.com": "imap.gmail.com",
  "smtp.office365.com": "outlook.office365.com",
  "smtp-mail.outlook.com": "outlook.office365.com",
  "smtp.zoho.in": "imap.zoho.in",
  "smtp.zoho.com": "imap.zoho.com",
  "smtp.mail.yahoo.com": "imap.mail.yahoo.com",
  "smtpout.secureserver.net": "imap.secureserver.net",
  "smtp.hostinger.com": "imap.hostinger.com",
};

export class InboxError extends Error {}

export function imapHostFor(smtpHost: string): string {
  return KNOWN_IMAP[smtpHost] || smtpHost.replace(/^smtp\./, "imap.");
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sandbox_inbox (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      uid INTEGER NOT NULL,
      raw TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
} catch {}

function client(host: string, user: string, password: string) {
  return new ImapFlow({ host, port: 993, secure: true, auth: { user, pass: password }, logger: false, socketTimeout: 30_000 });
}

/** Switches on reading enquiries. Tests the login first; existing emails are not imported. */
export async function connectInbox(businessId: string, input: { imapHost?: string }, actor: string): Promise<LeadSource> {
  const creds = getEmailCredentials(businessId);
  if (!creds) throw new InboxError("Connect your email account on the Integrations page first.");
  const existing = findSource(businessId, "email_inbox");
  const host = creds.sandbox ? SANDBOX_HOST : String(input.imapHost || imapHostFor(creds.host)).trim().toLowerCase();
  if (!creds.sandbox && !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) throw new InboxError("Enter the incoming mail (IMAP) server, for example imap.gmail.com.");

  let lastUid = 0;
  if (creds.sandbox) {
    if (process.env.NODE_ENV === "production") throw new InboxError("That account is only for testing.");
    lastUid = Number((db.prepare("SELECT MAX(uid) AS u FROM sandbox_inbox WHERE business_id = ?").get(businessId) as any)?.u || 0);
  } else {
    const c = client(host, creds.user, creds.password);
    try {
      await c.connect();
      const box = await c.mailboxOpen("INBOX", { readOnly: true });
      lastUid = Math.max(0, Number(box.uidNext || 1) - 1);
    } catch (e: any) {
      throw new InboxError(
        /auth|login|credentials/i.test(String(e?.message || e?.responseText || ""))
          ? "The mail server refused the login for reading. For Gmail, turn on IMAP in Gmail settings and use the same app password."
          : "Could not reach the incoming mail server. Check the server name."
      );
    } finally {
      await c.logout().catch(() => {});
    }
  }

  const config = { host, mailbox: "INBOX" };
  const state = { lastUid };
  if (existing) return updateSource(businessId, existing.id, { config, state, enabled: true, lastError: null })!;
  const src = createSource(businessId, "email_inbox", creds.fromEmail, config, actor);
  return updateSource(businessId, src.id, { state })!;
}

const AUTOMATED = /^(no-?reply|noreply|do-?not-?reply|mailer-daemon|postmaster|notifications?|alerts?|bounce)/i;

/** Reads emails that arrived since the last check and adds them as enquiries. */
export async function syncInbox(businessId: string, source: LeadSource): Promise<{ added: number }> {
  const creds = getEmailCredentials(businessId);
  if (!creds) {
    updateSource(businessId, source.id, { lastError: "The email account is no longer connected.", lastSyncedAt: new Date().toISOString() });
    throw new InboxError("The email account is no longer connected.");
  }
  const own = creds.fromEmail.toLowerCase();
  let lastUid = Number(source.state.lastUid || 0);
  let added = 0;

  const take = async (uid: number, raw: Buffer | string) => {
    const mail = await simpleParser(raw);
    const from = mail.from?.value?.[0];
    const address = String(from?.address || "").toLowerCase();
    const headers = mail.headers;
    // Newsletters and mailing lists carry List-Unsubscribe / List-Id (the parser groups them under "list")
    const rawKeys = new Set((mail.headerLines || []).map(h => String(h.key || "").toLowerCase()));
    const bulk =
      headers.has("list") ||
      rawKeys.has("list-unsubscribe") ||
      rawKeys.has("list-id") ||
      /bulk|list|junk/i.test(String(headers.get("precedence") || "")) ||
      /auto-replied|auto-generated/i.test(String(headers.get("auto-submitted") || ""));
    if (!address || address === own || AUTOMATED.test(address.split("@")[0]) || bulk) return;
    const text = String(mail.text || "")
      .split(/\n(?:On .+ wrote:|-{2,} ?Original Message)/)[0]
      .trim()
      .slice(0, 4000);
    const lead = addLead(businessId, source, "enquiry", String(mail.messageId || `uid:${uid}`), {
      name: from?.name || address.split("@")[0],
      email: address,
      subject: mail.subject || "(no subject)",
      message: text,
      receivedAt: (mail.date || new Date()).toISOString(),
    });
    if (lead) {
      added++;
      businessEvent(businessId, "new_enquiry", describeLead(lead));
    }
  };

  try {
    if (creds.sandbox) {
      if (process.env.NODE_ENV === "production") throw new InboxError("That account is only for testing.");
      const rows = db.prepare("SELECT uid, raw FROM sandbox_inbox WHERE business_id = ? AND uid > ? ORDER BY uid LIMIT 50").all(businessId, lastUid) as any[];
      for (const r of rows) {
        await take(r.uid, r.raw);
        lastUid = Math.max(lastUid, r.uid);
      }
    } else {
      const c = client(source.config.host, creds.user, creds.password);
      await c.connect();
      try {
        await c.mailboxOpen(source.config.mailbox || "INBOX", { readOnly: true });
        const messages: Array<{ uid: number; raw: Buffer }> = [];
        for await (const msg of c.fetch({ uid: `${lastUid + 1}:*` }, { uid: true, size: true, source: true }, { uid: true })) {
          if (msg.uid <= lastUid) continue; // "n:*" returns the last message even when there is nothing new
          if (Number(msg.size || 0) <= 2_000_000 && msg.source) messages.push({ uid: msg.uid, raw: msg.source });
          else lastUid = Math.max(lastUid, msg.uid);
          if (messages.length >= 50) break;
        }
        for (const m of messages) {
          await take(m.uid, m.raw);
          lastUid = Math.max(lastUid, m.uid);
        }
      } finally {
        await c.logout().catch(() => {});
      }
    }
    updateSource(businessId, source.id, { state: { ...source.state, lastUid }, lastSyncedAt: new Date().toISOString(), lastError: null });
    return { added };
  } catch (err) {
    updateSource(businessId, source.id, {
      state: { ...source.state, lastUid },
      lastSyncedAt: new Date().toISOString(),
      lastError: err instanceof InboxError ? err.message : "Could not read the inbox. It will try again shortly.",
    });
    throw err;
  }
}

/** Tests only: puts a message in the test mailbox of a business that uses the test email account. */
export function addSandboxMessage(businessId: string, raw: string) {
  if (process.env.NODE_ENV === "production") throw new InboxError("Not available.");
  const creds = getEmailCredentials(businessId);
  if (!creds?.sandbox) throw new InboxError("Only for the test email account.");
  const uid = Number((db.prepare("SELECT MAX(uid) AS u FROM sandbox_inbox WHERE business_id = ?").get(businessId) as any)?.u || 0) + 1;
  db.prepare("INSERT INTO sandbox_inbox (id, business_id, uid, raw, created_at) VALUES (?, ?, ?, ?, ?)").run(
    `sbx_${randomBytes(6).toString("hex")}`,
    businessId,
    uid,
    raw.slice(0, 200_000),
    new Date().toISOString()
  );
  return uid;
}

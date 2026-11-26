import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { safeDecrypt, safeEncrypt } from "./crypto";

/**
 * A business's own email account, used by its AI agents to send emails the owner has approved. Mail goes out from the
 * business's own address over its own SMTP server (Gmail with an app password, Outlook, Zoho Mail, any SMTP), never
 * from BizzPal's address. The connection is tested before it is saved, and the password is stored encrypted.
 *
 * Tests and local development can connect to the reserved host "sandbox.example.test": nothing is sent, the message is
 * only recorded. That host is refused on a production server.
 */

export const SANDBOX_HOST = "sandbox.example.test";
const TOOL_KEY = "email";

export interface EmailAccountInput {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail?: string;
  fromName?: string;
}

export interface EmailAccount {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromEmail: string;
  fromName: string;
  sandbox: boolean;
  connectedAt: string;
}

export const EMAIL_PRESETS = [
  { id: "gmail", label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 465, help: "Use an app password: Google Account → Security → 2-Step Verification → App passwords." },
  { id: "outlook", label: "Outlook / Microsoft 365", host: "smtp.office365.com", port: 587, help: "Your email password, or an app password if your organisation uses one." },
  { id: "zoho", label: "Zoho Mail", host: "smtp.zoho.in", port: 465, help: "Use an app-specific password from Zoho Mail settings." },
  { id: "other", label: "Other (SMTP)", host: "", port: 587, help: "Your email provider's SMTP server and port." },
];

export class EmailAccountError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
export const isEmail = (v: unknown) => typeof v === "string" && v.length <= 254 && EMAIL_RE.test(v.trim());

function clean(input: EmailAccountInput) {
  const host = String(input.host || "").trim().toLowerCase();
  const port = Number(input.port) || 587;
  const user = String(input.user || "").trim();
  const password = String(input.password || "");
  const fromEmail = String(input.fromEmail || user).trim().toLowerCase();
  const fromName = String(input.fromName || "").replace(/[<>"\r\n]/g, "").trim().slice(0, 80);
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)) throw new EmailAccountError("Enter the SMTP server, for example smtp.gmail.com.");
  if (![25, 465, 587, 2525].includes(port)) throw new EmailAccountError("The port is usually 465 or 587.");
  if (!user) throw new EmailAccountError("Enter the email account's username.");
  if (!password) throw new EmailAccountError("Enter the password or app password.");
  if (!isEmail(fromEmail)) throw new EmailAccountError("Enter the email address messages should come from.");
  const sandbox = host === SANDBOX_HOST;
  if (sandbox && process.env.NODE_ENV === "production") throw new EmailAccountError("That server is only for testing.");
  return { host, port, secure: port === 465, user, password, fromEmail, fromName, sandbox };
}

function transportFor(a: { host: string; port: number; secure: boolean; user: string; password: string }) {
  return nodemailer.createTransport({
    host: a.host,
    port: a.port,
    secure: a.secure,
    auth: { user: a.user, pass: a.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

/** Tests the account, then saves it for the business. Throws with a plain reason when the test fails. */
export async function connectEmailAccount(businessId: string, input: EmailAccountInput, actor: string): Promise<EmailAccount> {
  const a = clean(input);
  if (!a.sandbox) {
    try {
      await transportFor(a).verify();
    } catch (e: any) {
      const code = String(e?.code || "");
      const reason =
        code === "EAUTH"
          ? "The email server refused the username or password. For Gmail, use an app password, not your normal password."
          : code === "ETIMEDOUT" || code === "ECONNECTION" || code === "ESOCKET" || code === "ENOTFOUND"
            ? "Could not reach that email server. Check the server name and port."
            : "The email server did not accept the connection. Check the details and try again.";
      throw new EmailAccountError(reason);
    }
  }
  const now = new Date().toISOString();
  const config = { host: a.host, port: a.port, secure: a.secure, user: a.user, fromEmail: a.fromEmail, fromName: a.fromName, sandbox: a.sandbox, connectedAt: now, connectedBy: actor };
  const secret = safeEncrypt(a.password);
  const existing = db.prepare("SELECT id FROM integrations WHERE business_id = ? AND tool_key = ?").get(businessId, TOOL_KEY) as any;
  if (existing) {
    db.prepare("UPDATE integrations SET status = 'connected', api_key = ?, config = ?, updated_at = ? WHERE id = ?").run(secret, JSON.stringify(config), now, existing.id);
  } else {
    db.prepare(
      "INSERT INTO integrations (id, business_id, tool_key, name, category, status, api_key, config, updated_at) VALUES (?, ?, ?, ?, ?, 'connected', ?, ?, ?)"
    ).run(`int_${randomBytes(8).toString("hex")}`, businessId, TOOL_KEY, "Email", "communication", secret, JSON.stringify(config), now);
  }
  return getEmailAccount(businessId)!;
}

export function disconnectEmailAccount(businessId: string) {
  db.prepare("DELETE FROM integrations WHERE business_id = ? AND tool_key = ?").run(businessId, TOOL_KEY);
}

/** The connected account, without its password. */
export function getEmailAccount(businessId: string): EmailAccount | null {
  const row = db.prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ? AND status = 'connected'").get(businessId, TOOL_KEY) as any;
  if (!row) return null;
  try {
    const c = JSON.parse(row.config || "{}");
    return { host: c.host, port: c.port, secure: Boolean(c.secure), user: c.user, fromEmail: c.fromEmail, fromName: c.fromName || "", sandbox: Boolean(c.sandbox), connectedAt: c.connectedAt || row.updated_at };
  } catch {
    return null;
  }
}

/** Sends one email from the business's own account. Returns the provider's message id (or a sandbox id). */
export async function sendFromBusiness(businessId: string, msg: { to: string; subject: string; body: string }): Promise<{ messageId: string; sandbox: boolean }> {
  const row = db.prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ? AND status = 'connected'").get(businessId, TOOL_KEY) as any;
  if (!row) throw new EmailAccountError("No email account is connected.", 409);
  const c = JSON.parse(row.config || "{}");
  if (c.sandbox) {
    if (process.env.NODE_ENV === "production") throw new EmailAccountError("That server is only for testing.", 409);
    return { messageId: `sandbox_${randomBytes(8).toString("hex")}`, sandbox: true };
  }
  const password = safeDecrypt(row.api_key || "");
  try {
    const info = await transportFor({ host: c.host, port: c.port, secure: Boolean(c.secure), user: c.user, password }).sendMail({
      from: c.fromName ? { name: c.fromName, address: c.fromEmail } : c.fromEmail,
      to: msg.to,
      subject: msg.subject,
      text: msg.body,
    });
    return { messageId: String(info?.messageId || ""), sandbox: false };
  } catch (e: any) {
    console.error("[email account] send failed:", e?.code || e?.message);
    throw new EmailAccountError(e?.code === "EAUTH" ? "The email account refused the login. Reconnect it on the Integrations page." : "The email could not be sent. Please try again.", 502);
  }
}

/** The account's login, for reading the inbox (server only; never sent to the browser). */
export function getEmailCredentials(businessId: string): { host: string; port: number; user: string; password: string; fromEmail: string; sandbox: boolean } | null {
  const row = db.prepare("SELECT * FROM integrations WHERE business_id = ? AND tool_key = ? AND status = 'connected'").get(businessId, TOOL_KEY) as any;
  if (!row) return null;
  try {
    const c = JSON.parse(row.config || "{}");
    return { host: c.host, port: c.port, user: c.user, password: safeDecrypt(row.api_key || ""), fromEmail: c.fromEmail, sandbox: Boolean(c.sandbox) };
  } catch {
    return null;
  }
}

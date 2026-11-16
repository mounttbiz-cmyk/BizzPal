import nodemailer from "nodemailer";

/**
 * Sends email over any SMTP service (Gmail, Resend, SendGrid, Zoho Mail, Amazon SES...).
 * Settings: SMTP_HOST, SMTP_PORT (587 or 465), SMTP_USER, SMTP_PASS and MAIL_FROM (for example
 * "BizzPal <hello@bizzpal.ai>"). Without them nothing is sent and callers are told so.
 */

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: nodemailer.Transporter | null = null;
function getTransport(): nodemailer.Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transport;
}

export type MailResult = { ok: true } | { ok: false; error: string };

export async function sendMail(opts: { to: string; subject: string; text: string; html?: string }): Promise<MailResult> {
  if (!mailConfigured()) return { ok: false, error: "Email isn't set up on this server." };
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM || `BizzPal <${process.env.SMTP_USER}>`,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true };
  } catch (e: any) {
    console.error("Email send failed:", e?.code || e?.message || e);
    return { ok: false, error: "The email could not be sent. Please try again." };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

/** A plain, professional email: heading, paragraph, one button. */
export function emailTemplate(opts: { heading: string; paragraphs: string[]; buttonLabel: string; buttonUrl: string; footnote?: string }): { text: string; html: string } {
  const text = [opts.heading, "", ...opts.paragraphs, "", `${opts.buttonLabel}: ${opts.buttonUrl}`, ...(opts.footnote ? ["", opts.footnote] : [])].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1c2333">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;border:1px solid #e3e6ec">
<tr><td style="padding:28px 32px 8px;font-size:20px;font-weight:700">Bizz<span style="color:#8a6414">Pal</span></td></tr>
<tr><td style="padding:8px 32px 0;font-size:18px;font-weight:600">${esc(opts.heading)}</td></tr>
<tr><td style="padding:12px 32px 0;font-size:14px;line-height:1.6;color:#4a5468">${opts.paragraphs.map(p => `<p style="margin:0 0 12px">${esc(p)}</p>`).join("")}</td></tr>
<tr><td style="padding:8px 32px 8px"><a href="${esc(opts.buttonUrl)}" style="display:inline-block;background:#8a6414;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px">${esc(opts.buttonLabel)}</a></td></tr>
<tr><td style="padding:8px 32px 28px;font-size:12px;line-height:1.6;color:#7a8396">${opts.footnote ? esc(opts.footnote) + "<br>" : ""}If the button does not work, copy this link into your browser:<br><span style="word-break:break-all">${esc(opts.buttonUrl)}</span></td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

/** Public address of the site, for links in emails. */
export function appBaseUrl(req?: Request): string {
  const configured = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  if (req) {
    try { return new URL(req.url).origin; } catch {}
  }
  return "http://localhost:3000";
}

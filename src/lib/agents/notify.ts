import { db } from "@/lib/db";
import { appBaseUrl, emailTemplate, mailConfigured, sendMail } from "@/lib/mail";

/**
 * Telling the owner that an agent is waiting for them. One email per job, with a link straight to the request and no
 * message content (the content stays inside BizzPal, behind sign-in).
 */

/** The owner of a business: the person whose own business it is, or the owner of the group it belongs to. */
export function ownerEmailFor(businessId: string): string | null {
  try {
    const b = db.prepare("SELECT group_id FROM businesses WHERE id = ?").get(businessId) as any;
    const id = b?.group_id || businessId;
    const users = db.prepare("SELECT email FROM registered_users").all() as any[];
    const match = users.find(u => `biz_${String(u.email).trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}` === id);
    return match ? String(match.email).trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function notifyApprovalNeeded(opts: { businessId: string; taskId: string; approvalId: string; agentName: string; actionLabel: string }) {
  // Only the first request of a job sends an email
  const already = db
    .prepare("SELECT COUNT(*) AS n FROM approvals WHERE business_id = ? AND task_id = ? AND notified_at IS NOT NULL")
    .get(opts.businessId, opts.taskId) as any;
  if (Number(already?.n || 0) > 0) return;
  db.prepare("UPDATE approvals SET notified_at = ? WHERE id = ? AND business_id = ?").run(new Date().toISOString(), opts.approvalId, opts.businessId);

  const to = ownerEmailFor(opts.businessId);
  if (!to || !mailConfigured()) return;
  const url = `${appBaseUrl()}/approvals?id=${encodeURIComponent(opts.approvalId)}`;
  const mail = emailTemplate({
    heading: `${opts.agentName} needs your approval`,
    paragraphs: [
      `Your AI agent wants to: ${opts.actionLabel.toLowerCase()}.`,
      "Nothing happens until you approve it. You can read it, change it, approve it or reject it in BizzPal.",
    ],
    buttonLabel: "Review the request",
    buttonUrl: url,
    footnote: "You get this email because an agent you switched on is waiting for your decision.",
  });
  const sent = await sendMail({ to, subject: `${opts.agentName} needs your approval`, text: mail.text, html: mail.html });
  if (!sent.ok) console.warn("[agents] approval email not sent:", sent.error);
}

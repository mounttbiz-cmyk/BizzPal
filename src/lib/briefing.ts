import { db, getPlatformConfig, setPlatformConfig, clearMemoryConfigCache, getUserBusinessId } from "@/lib/db";
import { emailTemplate, sendMail, type MailResult } from "@/lib/mail";

/**
 * The daily briefing email: a short summary of the business's real numbers and open tasks.
 * Turned on or off per business; a scheduled job (see docs/DEPLOYMENT.md) sends it every morning.
 */

const PREFIX = "daily_briefing:";
const keyFor = (businessId: string) => `${PREFIX}${businessId}`;

interface BriefingSetting {
  enabled: boolean;
  email: string;
}

export function getBriefingSetting(businessId: string): BriefingSetting {
  try {
    const v = getPlatformConfig<BriefingSetting>(keyFor(businessId), { enabled: false, email: "" });
    return { enabled: Boolean(v?.enabled), email: String(v?.email || "") };
  } catch {
    return { enabled: false, email: "" };
  }
}

export function setBriefingSetting(businessId: string, setting: BriefingSetting) {
  clearMemoryConfigCache(keyFor(businessId));
  setPlatformConfig(keyFor(businessId), setting);
}

const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

/** Plain-text lines for the email. Only real numbers are included. */
export function buildBriefing(businessId: string): { subject: string; heading: string; paragraphs: string[] } {
  const biz = db.prepare("SELECT name, founder_name, monthly_revenue, monthly_burn, cash_on_hand FROM businesses WHERE id = ?").get(businessId) as any;
  const name = biz?.name || "your business";
  const lines: string[] = [];

  const revenue = Number(biz?.monthly_revenue || 0);
  const burn = Number(biz?.monthly_burn || 0);
  const cash = Number(biz?.cash_on_hand || 0);
  const numbers: string[] = [];
  if (revenue > 0) numbers.push(`Monthly revenue ${inr(revenue)}`);
  if (burn > 0) numbers.push(`Monthly burn ${inr(burn)}`);
  if (cash > 0) numbers.push(`Cash in bank ${inr(cash)}`);
  if (cash > 0 && burn > 0) numbers.push(`Runway about ${(cash / burn).toFixed(1)} months`);
  if (numbers.length > 0) lines.push("Your numbers: " + numbers.join(" · ") + ".");
  else lines.push("Add your revenue, burn and cash in Settings to see your runway here.");

  const open = db.prepare(
    "SELECT title, priority FROM tasks WHERE business_id = ? AND status <> 'done' ORDER BY CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, created_at DESC LIMIT 5"
  ).all(businessId) as any[];
  const openCount = (db.prepare("SELECT COUNT(*) c FROM tasks WHERE business_id = ? AND status <> 'done'").get(businessId) as any)?.c || 0;
  if (openCount > 0) {
    lines.push(`You have ${openCount} open ${openCount === 1 ? "task" : "tasks"}. Top priorities:`);
    open.forEach((t, i) => lines.push(`${i + 1}. ${t.title}${t.priority === "high" ? " (high priority)" : ""}`));
  } else {
    lines.push("You have no open tasks. A good moment to plan the week.");
  }

  const date = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return { subject: `Your BizzPal briefing for ${date}`, heading: `Good morning. Here is ${name} today.`, paragraphs: lines };
}

export async function sendBriefingTo(email: string, baseUrl: string): Promise<MailResult> {
  const content = buildBriefing(getUserBusinessId(email));
  const mail = emailTemplate({
    heading: content.heading,
    paragraphs: content.paragraphs,
    buttonLabel: "Open your dashboard",
    buttonUrl: `${baseUrl}/dashboard`,
    footnote: "You get this email because the daily briefing is turned on in your BizzPal settings. You can turn it off there at any time.",
  });
  return sendMail({ to: email, subject: content.subject, text: mail.text, html: mail.html });
}

/** Sends the briefing to everyone who turned it on. Used by the scheduled job. */
export async function sendAllBriefings(baseUrl: string): Promise<{ sent: number; failed: number }> {
  const rows = db.prepare("SELECT config_value FROM platform_config WHERE config_key LIKE ?").all(`${PREFIX}%`) as any[];
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    let setting: BriefingSetting | null = null;
    try { setting = JSON.parse(row.config_value); } catch {}
    if (!setting?.enabled || !setting.email) continue;
    const r = await sendBriefingTo(setting.email, baseUrl);
    if (r.ok) sent++; else failed++;
  }
  return { sent, failed };
}

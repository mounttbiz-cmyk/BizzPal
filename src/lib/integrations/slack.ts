/** Posting to Slack through an incoming webhook (a URL a customer creates in their own Slack). */

// Only Slack's own address is ever called, so a customer cannot point this at another server.
export const SLACK_WEBHOOK_PATTERN = /^https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]+$/;

export async function postToSlack(webhookUrl: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!SLACK_WEBHOOK_PATTERN.test(webhookUrl)) return { ok: false, error: "That is not a valid Slack webhook URL." };
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: String(text).slice(0, 3000) }),
      signal: AbortSignal.timeout(8000),
    });
    const answer = (await res.text().catch(() => "")).trim();
    if (res.ok && answer === "ok") return { ok: true };
    if (res.status === 404 || answer === "no_service" || answer === "invalid_token") return { ok: false, error: "Slack didn't accept this webhook. It may have been deleted or mistyped." };
    if (answer === "channel_is_archived") return { ok: false, error: "That Slack channel is archived." };
    return { ok: false, error: "Slack could not deliver the message. Please check the webhook and try again." };
  } catch {
    return { ok: false, error: "Couldn't reach Slack. Please try again." };
  }
}

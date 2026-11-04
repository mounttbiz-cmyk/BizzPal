export type AcceptDecision = "ok" | "already" | "invalid" | "revoked" | "wrong_email" | "email_not_verified";

/**
 * Decides whether a person may accept an invite. "verifiedEmail" must come from Google's own sign-in
 * response (the email Google has confirmed belongs to the signed-in person), never from the browser.
 */
export function decideAcceptance(
  invite: { invite_email: string; status: string } | null,
  googleEmail: string,
  googleEmailVerified: boolean
): AcceptDecision {
  if (!invite) return "invalid";
  if (invite.status === "revoked") return "revoked";
  if (!googleEmailVerified) return "email_not_verified";
  if (invite.invite_email.trim().toLowerCase() !== (googleEmail || "").trim().toLowerCase()) return "wrong_email";
  if (invite.status === "verified") return "already";
  return "ok";
}

export const maskEmail = (e: string) => {
  const [u, d] = e.split("@");
  if (!d) return e;
  return `${u.slice(0, 1)}${"•".repeat(Math.max(1, Math.min(u.length - 1, 5)))}@${d}`;
};

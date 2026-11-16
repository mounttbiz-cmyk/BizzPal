import { NextResponse } from "next/server";
import { getRegisteredUser } from "@/lib/db";
import { createResetToken } from "@/lib/auth/resetTokens";
import { appBaseUrl, emailTemplate, mailConfigured, sendMail } from "@/lib/mail";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const GENERIC = "If an account exists for that email, we have sent a link to reset the password. It works for one hour.";

/** POST { email }: emails a one-time reset link. The answer is the same whether or not the account exists. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(email)) {
    return NextResponse.json({ success: false, error: "Please enter a valid email address." }, { status: 400 });
  }
  if (!rateLimit(`forgot-ip:${clientIp(req)}`, 10, 3_600_000).ok || !rateLimit(`forgot-em:${email}`, 3, 3_600_000).ok) {
    return NextResponse.json({ success: false, error: "Too many requests. Please try again in a while." }, { status: 429 });
  }
  if (!mailConfigured()) {
    return NextResponse.json({ success: false, error: "Password reset by email isn't set up on this server yet. Please contact support." }, { status: 503 });
  }

  const user = getRegisteredUser(email);
  if (user) {
    const token = createResetToken(email);
    const url = `${appBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;
    const mail = emailTemplate({
      heading: "Reset your password",
      paragraphs: ["We received a request to reset the password for your BizzPal account.", "This link works once and expires in one hour."],
      buttonLabel: "Choose a new password",
      buttonUrl: url,
      footnote: "If you did not ask for this, you can ignore this email. Your password has not changed.",
    });
    await sendMail({ to: email, subject: "Reset your BizzPal password", text: mail.text, html: mail.html });
  }
  return NextResponse.json({ success: true, message: GENERIC });
}

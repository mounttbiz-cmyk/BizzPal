import { NextResponse } from "next/server";
import { setUserPasswordHash } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { checkResetToken, consumeResetToken } from "@/lib/auth/resetTokens";
import { clearFailures } from "@/lib/rateLimit";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** GET ?token=: is this link still good? */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  return NextResponse.json({ valid: Boolean(checkResetToken(token)) });
}

/** POST { token, password }: sets the new password and uses the link up. */
export async function POST(req: Request) {
  if (!rateLimit(`reset-ip:${clientIp(req)}`, 20, 3_600_000).ok) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please try again later." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const pwError = validatePassword(body?.password);
  if (pwError) return NextResponse.json({ success: false, error: pwError }, { status: 400 });

  const email = consumeResetToken(String(body?.token || ""));
  if (!email) {
    return NextResponse.json({ success: false, error: "This link has expired or was already used. Please ask for a new one." }, { status: 400 });
  }
  setUserPasswordHash(email, hashPassword(String(body.password)));
  clearFailures(`login-fail:email:${email}`);
  return NextResponse.json({ success: true });
}

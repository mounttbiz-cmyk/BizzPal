import { NextResponse } from "next/server";
import { getRegisteredUser, registerUser, setUserPasswordHash } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { createUserSession, sessionSetCookie } from "@/lib/userSession";
import { validateWorkEmail } from "@/lib/validation/emailValidator";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/** Create an account with email and password: POST { email, password, name? } */
export async function POST(req: Request) {
  const limit = rateLimit(`register:${clientIp(req)}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ success: false, code: "too_many_attempts", error: "Too many sign-ups from this connection. Please try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const name = String(body?.name || "").trim().slice(0, 100);

  const check = validateWorkEmail(email);
  if (!check.isValid) {
    return NextResponse.json({ success: false, code: "bad_email", error: check.error || "Please enter a valid work email address." }, { status: 400 });
  }
  const pwError = validatePassword(body?.password);
  if (pwError) {
    return NextResponse.json({ success: false, code: "weak_password", error: pwError }, { status: 400 });
  }
  if (getRegisteredUser(email)) {
    return NextResponse.json({ success: false, code: "account_exists", error: "An account with this email already exists. Please log in instead." }, { status: 409 });
  }

  if (!registerUser(email, name || email.split("@")[0], "email")) {
    return NextResponse.json({ success: false, code: "failed", error: "We could not create the account. Please try again." }, { status: 500 });
  }
  setUserPasswordHash(email, hashPassword(String(body.password)));

  const token = createUserSession(email);
  if (!token) {
    return NextResponse.json({ success: false, code: "not_configured", error: "Sign-in is not configured on this server." }, { status: 503 });
  }
  const res = NextResponse.json({ success: true, email, name: name || email.split("@")[0] });
  res.headers.append("Set-Cookie", sessionSetCookie(token, req));
  return res;
}

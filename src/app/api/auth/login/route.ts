import { NextResponse } from "next/server";
import { getRegisteredUser, getUserPasswordHash } from "@/lib/db";
import { dummyVerify, verifyPassword } from "@/lib/auth/password";
import { createUserSession, sessionSetCookie } from "@/lib/userSession";
import { clearFailures, clientIp, recordFailure, tooManyFailures } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const WINDOW = 15 * 60 * 1000;

/** Sign in with email and password: POST { email, password } */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim().toLowerCase();
  const password = typeof body?.password === "string" ? body.password : "";

  const emailKey = `login-fail:email:${email}`;
  const ipKey = `login-fail:ip:${clientIp(req)}`;
  if (tooManyFailures(emailKey, 8) || tooManyFailures(ipKey, 40)) {
    return NextResponse.json(
      { success: false, code: "too_many_attempts", error: "Too many wrong attempts. Please wait 15 minutes and try again." },
      { status: 429 }
    );
  }

  const user = email ? getRegisteredUser(email) : null;
  const hash = user ? getUserPasswordHash(email) : null;

  // An account that has never had a password (it signs in with Google)
  if (user && !hash && String(user.provider || "").toLowerCase().includes("google")) {
    return NextResponse.json(
      { success: false, code: "google_account", error: "This account signs in with Google. Please use \"Continue with Google\"." },
      { status: 400 }
    );
  }
  // An account that existed before passwords were kept here: it needs a new password from the administrator
  if (user && !hash) {
    dummyVerify(password);
    return NextResponse.json(
      { success: false, code: "needs_password_reset", error: "Your password needs to be set again. Please contact support to reset it." },
      { status: 403 }
    );
  }

  const ok = user && hash ? verifyPassword(password, hash) : (dummyVerify(password), false);
  if (!ok) {
    recordFailure(emailKey, WINDOW);
    recordFailure(ipKey, WINDOW);
    return NextResponse.json({ success: false, code: "invalid_credentials", error: "Incorrect email or password." }, { status: 401 });
  }

  clearFailures(emailKey);
  const token = createUserSession(email);
  if (!token) {
    return NextResponse.json({ success: false, code: "not_configured", error: "Sign-in is not configured on this server." }, { status: 503 });
  }
  const res = NextResponse.json({ success: true, email, name: user?.name || email.split("@")[0] });
  res.headers.append("Set-Cookie", sessionSetCookie(token, req));
  return res;
}

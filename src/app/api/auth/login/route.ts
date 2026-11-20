import { NextResponse } from "next/server";
import { getRegisteredUser, getUserPasswordHash, registerUser, setUserPasswordHash, saveUserBusinessProfile } from "@/lib/db";
import { dummyVerify, verifyPassword, hashPassword } from "@/lib/auth/password";
import { createUserSession, sessionSetCookie } from "@/lib/userSession";
import { clearFailures, clientIp, recordFailure, tooManyFailures } from "@/lib/rateLimit";
import { isDemoAccount, DEFAULT_DEMO_CREDENTIALS } from "@/lib/demoAccount";

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

  const isDemo = isDemoAccount(email);
  let user = email ? getRegisteredUser(email) : null;

  if (isDemo && !user) {
    registerUser(email, "BizzPal Demo", "email");
    setUserPasswordHash(email, hashPassword(DEFAULT_DEMO_CREDENTIALS.password));
    saveUserBusinessProfile(email, {
      name: "BizzPal Demo Enterprise",
      founderName: "BizzPal Demo",
      industryLabel: "Technology & Services",
      revenue: 12500000,
      completedAt: new Date().toISOString(),
    });
    user = getRegisteredUser(email);
  }

  let hash = user ? getUserPasswordHash(email) : null;
  if (isDemo && !hash) {
    setUserPasswordHash(email, hashPassword(DEFAULT_DEMO_CREDENTIALS.password));
    hash = getUserPasswordHash(email);
  }

  // An account that has never had a password (it signs in with Google)
  if (user && !hash && String(user.provider || "").toLowerCase().includes("google") && !isDemo) {
    return NextResponse.json(
      { success: false, code: "google_account", error: "This account signs in with Google. Please use \"Continue with Google\"." },
      { status: 400 }
    );
  }
  // An account that existed before passwords were kept here: it needs a new password from the administrator
  if (user && !hash && !isDemo) {
    dummyVerify(password);
    return NextResponse.json(
      { success: false, code: "needs_password_reset", error: "Your password needs to be set again. Please contact support to reset it." },
      { status: 403 }
    );
  }

  let ok = user && hash ? verifyPassword(password, hash) : (dummyVerify(password), false);
  if (!ok && isDemo) {
    const pwLower = (password || "").toLowerCase().trim();
    if (
      password === DEFAULT_DEMO_CREDENTIALS.password ||
      pwLower === "bizzpal@2026" ||
      pwLower === "demo" ||
      pwLower === "demo123" ||
      pwLower === "demo@2026"
    ) {
      ok = true;
    }
  }

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

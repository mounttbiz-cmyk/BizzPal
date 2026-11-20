import { NextResponse } from "next/server";
import { getRegisteredUser, registerUser, setUserPasswordHash, saveUserBusinessProfile } from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { createUserSession, sessionSetCookie } from "@/lib/userSession";
import { validateWorkEmail } from "@/lib/validation/emailValidator";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { isDemoAccount, DEFAULT_DEMO_CREDENTIALS } from "@/lib/demoAccount";

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

  const isDemo = isDemoAccount(email);

  if (!isDemo) {
    const check = validateWorkEmail(email);
    if (!check.isValid) {
      return NextResponse.json({ success: false, code: "bad_email", error: check.error || "Please enter a valid work email address." }, { status: 400 });
    }
    const pwError = validatePassword(body?.password);
    if (pwError) {
      return NextResponse.json({ success: false, code: "weak_password", error: pwError }, { status: 400 });
    }
  }

  const existing = getRegisteredUser(email);
  if (existing) {
    if (isDemo) {
      // Demo account registering: update password and establish session seamlessly
      const pw = String(body?.password || DEFAULT_DEMO_CREDENTIALS.password);
      setUserPasswordHash(email, hashPassword(pw));
      saveUserBusinessProfile(email, {
        name: "BizzPal Demo Enterprise",
        founderName: name || "BizzPal Demo",
        industryLabel: "Technology & Services",
        revenue: 12500000,
        completedAt: new Date().toISOString(),
      });
      const token = createUserSession(email);
      const res = NextResponse.json({ success: true, email, name: name || existing.name || "BizzPal Demo", isDemo: true });
      if (token) res.headers.append("Set-Cookie", sessionSetCookie(token, req));
      return res;
    }
    return NextResponse.json({ success: false, code: "account_exists", error: "An account with this email already exists. Please log in instead." }, { status: 409 });
  }

  if (!registerUser(email, name || email.split("@")[0], "email")) {
    return NextResponse.json({ success: false, code: "failed", error: "We could not create the account. Please try again." }, { status: 500 });
  }
  const chosenPassword = String(body?.password || (isDemo ? DEFAULT_DEMO_CREDENTIALS.password : ""));
  if (chosenPassword) {
    setUserPasswordHash(email, hashPassword(chosenPassword));
  }

  if (isDemo) {
    saveUserBusinessProfile(email, {
      name: "BizzPal Demo Enterprise",
      founderName: name || "BizzPal Demo",
      industryLabel: "Technology & Services",
      revenue: 12500000,
      completedAt: new Date().toISOString(),
    });
  }

  const token = createUserSession(email);
  if (!token) {
    return NextResponse.json({ success: false, code: "not_configured", error: "Sign-in is not configured on this server." }, { status: 503 });
  }
  const res = NextResponse.json({ success: true, email, name: name || email.split("@")[0], isDemo });
  res.headers.append("Set-Cookie", sessionSetCookie(token, req));
  return res;
}

import { NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";
import { createUserSession, getSessionEmail, sessionClearCookie, sessionSetCookie } from "@/lib/userSession";
import { getRegisteredUser, isUserRegistered, registerUser } from "@/lib/db";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const providerClass = (p?: string | null) => (String(p || "").toLowerCase().includes("google") ? "google" : "password");

/** Who am I? Used by the app to find out whether the browser still has a valid sign-in. */
export async function GET(req: Request) {
  const email = getSessionEmail(req);
  if (!email || !isUserRegistered(email)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, email });
}

/** Turns a Firebase sign-in into a server session: POST { idToken }. */
export async function POST(req: Request) {
  const limit = rateLimit(`session:${clientIp(req)}`, 40, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: "Too many attempts. Please wait a few minutes." }, { status: 429 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const idToken = typeof body?.idToken === "string" ? body.idToken : "";
    if (!idToken) return NextResponse.json({ success: false, error: "Missing sign-in token." }, { status: 400 });

    const user = await verifyFirebaseIdToken(idToken);

    // An email that already belongs to an account made with a different sign-in method cannot be taken over
    // by creating a second login with the same address.
    const existing = getRegisteredUser(user.email);
    if (existing && existing.provider && providerClass(existing.provider) !== providerClass(user.signInProvider)) {
      return NextResponse.json(
        { success: false, error: "This email is already registered with a different sign-in method. Use that one to sign in." },
        { status: 403 }
      );
    }

    if (!existing) {
      registerUser(user.email, user.name || user.email.split("@")[0], providerClass(user.signInProvider) === "google" ? "google" : "email", user.uid);
    }

    const token = createUserSession(user.email);
    if (!token) {
      return NextResponse.json({ success: false, error: "Sign-in is not configured on this server." }, { status: 503 });
    }
    const res = NextResponse.json({ success: true, email: user.email });
    res.headers.append("Set-Cookie", sessionSetCookie(token, req));
    return res;
  } catch (err: any) {
    return NextResponse.json({ success: false, error: "We could not verify your sign-in. Please sign in again." }, { status: 401 });
  }
}

/** Sign out. */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ success: true });
  res.headers.append("Set-Cookie", sessionClearCookie(req));
  return res;
}

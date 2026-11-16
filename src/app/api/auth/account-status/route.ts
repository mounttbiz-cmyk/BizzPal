import { NextResponse } from "next/server";
import { registerUser, getRegisteredUser, saveUserBusinessProfile, deleteRegisteredUser, recordUserLogin } from "@/lib/db";
import { getSessionEmail } from "@/lib/userSession";
import { rateLimit, clientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ exists: false, error: "Email parameter required" }, { status: 400 });
    }

    const limit = rateLimit(`acct-status:${clientIp(request)}`, 60, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json({ exists: false, error: "Too many requests." }, { status: 429 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = getRegisteredUser(cleanEmail);
    const exists = Boolean(user);

    // Anyone can ask whether an address has an account (the sign-in page needs that), but nothing about it.
    // The account's own details are only returned to the signed-in owner.
    if (getSessionEmail(request) !== cleanEmail) {
      return NextResponse.json({ exists });
    }
    return NextResponse.json({
      exists,
      email: cleanEmail,
      name: user?.name || null,
      provider: user?.provider || null,
      businessProfile: user?.businessProfile || null,
      lastLoginAt: user?.last_login_at || null,
    });
  } catch (err: any) {
    console.error("Account status check error:", err);
    return NextResponse.json({ exists: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, provider, uid, businessProfile, action, lastLoginAt } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
    }

    // Only the signed-in owner of an address can create or change its account
    const signedIn = getSessionEmail(request);
    if (!signedIn) {
      return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
    }
    if (String(email).trim().toLowerCase() !== signedIn) {
      return NextResponse.json({ success: false, error: "Not allowed." }, { status: 403 });
    }

    if (action === "login" || lastLoginAt) {
      recordUserLogin(email, lastLoginAt);
    }

    const success = registerUser(email, name, provider, uid, businessProfile);
    if (businessProfile) {
      saveUserBusinessProfile(email, businessProfile);
    }
    return NextResponse.json({ success, email });
  } catch (err: any) {
    console.error("Account status register error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ success: false, error: "Email parameter required" }, { status: 400 });
    }

    // An account can only be deleted by its own signed-in owner
    const signedIn = getSessionEmail(request);
    if (!signedIn || signedIn !== email.trim().toLowerCase()) {
      return NextResponse.json({ success: false, error: "Not allowed." }, { status: 403 });
    }

    const success = deleteRegisteredUser(email);
    return NextResponse.json({ success, email });
  } catch (err: any) {
    console.error("Account delete error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

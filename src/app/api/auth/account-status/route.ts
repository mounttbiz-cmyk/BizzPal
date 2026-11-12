import { NextResponse } from "next/server";
import { isUserRegistered, registerUser, getRegisteredUser, saveUserBusinessProfile, deleteRegisteredUser, recordUserLogin } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ exists: false, error: "Email parameter required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = getRegisteredUser(cleanEmail);
    const exists = Boolean(user);
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

    const success = deleteRegisteredUser(email);
    return NextResponse.json({ success, email });
  } catch (err: any) {
    console.error("Account delete error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

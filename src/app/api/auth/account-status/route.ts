import { NextResponse } from "next/server";
import { isUserRegistered, registerUser, getRegisteredUser, saveUserBusinessProfile, deleteRegisteredUser } from "@/lib/db";

export const dynamic = "force-dynamic";

const DEMO_EMAILS = ["demo@bizzpal.ai", "razorpay@bizzpal.ai", "reviewer@bizzpal.ai"];

const DEMO_BUSINESS_PROFILE = {
  name: "BizzPal Technologies Pvt Ltd",
  legalName: "BIZZPAL TECHNOLOGIES PRIVATE LIMITED",
  founderName: "Demo Founder",
  gstin: "27AAPFU0939F1ZV",
  industry: "it_tech",
  industryLabel: "IT & Technology Services",
  revenue: 1250000,
  monthlyRevenue: 1250000,
  annualRevenue: 15000000,
  burn: 320000,
  monthlyBurn: 320000,
  cash: 4500000,
  cashOnHand: 4500000,
  teamSize: 14,
  plan: "growth",
  status: "active",
  website: "https://bizzpal.ai",
  connectedTools: ["google", "razorpay", "workday", "salesforce"],
  completedAt: "2026-01-15T00:00:00.000Z",
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ exists: false, error: "Email parameter required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const isDemo = DEMO_EMAILS.includes(cleanEmail);

    let user = getRegisteredUser(cleanEmail);
    if (!user && isDemo) {
      registerUser(cleanEmail, "Demo Founder", "password", "usr_demo_razorpay", DEMO_BUSINESS_PROFILE);
      saveUserBusinessProfile(cleanEmail, DEMO_BUSINESS_PROFILE);
      user = getRegisteredUser(cleanEmail);
    }

    const exists = isDemo || Boolean(user);
    return NextResponse.json({ 
      exists, 
      email: cleanEmail,
      name: user?.name || (isDemo ? "Demo Founder" : null),
      provider: user?.provider || (isDemo ? "password" : null),
      businessProfile: user?.businessProfile || (isDemo ? DEMO_BUSINESS_PROFILE : null),
    });
  } catch (err: any) {
    console.error("Account status check error:", err);
    return NextResponse.json({ exists: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, provider, uid, businessProfile } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Email is required" }, { status: 400 });
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

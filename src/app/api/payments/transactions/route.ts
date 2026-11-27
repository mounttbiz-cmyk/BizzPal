import { NextResponse } from "next/server";
import { getAllPaymentTransactions, getUserPaymentHistory, getUserActiveSubscription } from "@/lib/db";
import { getSessionEmail } from "@/lib/userSession";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/adminSession";
import { readCookie } from "@/lib/userSession";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    // The customer is whoever is signed in. The full ledger is for the admin only.
    const email = getSessionEmail(req);
    const wantsAll = searchParams.get("admin") === "true";
    const isSuperadmin = wantsAll && (await verifyAdminSession(readCookie(req, ADMIN_COOKIE)));
    if (wantsAll && !isSuperadmin) {
      return NextResponse.json({ success: false, error: "Not allowed." }, { status: 403 });
    }

    if (!isSuperadmin && !email) {
      return NextResponse.json({ success: false, error: "Please sign in again." }, { status: 401 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const isLive = Boolean(
      keyId &&
      keySecret &&
      /^rzp_(live|test)_/.test(keyId) &&
      !keyId.includes("YOUR_KEY") &&
      keySecret.length > 6 &&
      !keySecret.includes("YOUR_")
    );

    const gatewayStatus = {
      isLive,
      mode: keyId.startsWith("rzp_live_") && isLive ? "Live Production" : "Test Simulation / Sandbox",
      keyConfigured: Boolean(keyId && !keyId.includes("YOUR_KEY")),
      secretConfigured: Boolean(keySecret && !keySecret.includes("YOUR_")),
      ...(isSuperadmin ? { keyPrefix: keyId ? keyId.slice(0, 8) + "..." : "Not configured" } : {}),
    };

    if (isSuperadmin) {
      const transactions = getAllPaymentTransactions(100);
      return NextResponse.json({
        success: true,
        gatewayStatus,
        transactions,
      });
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const userTransactions = getUserPaymentHistory(cleanEmail);
      const activeSubscription = getUserActiveSubscription(cleanEmail);
      return NextResponse.json({
        success: true,
        gatewayStatus,
        activeSubscription,
        transactions: userTransactions,
      });
    }

    return NextResponse.json({
      success: true,
      gatewayStatus,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}


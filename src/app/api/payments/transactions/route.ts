import { NextResponse } from "next/server";
import { getAllPaymentTransactions, getUserPaymentHistory, getUserActiveSubscription } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const isSuperadmin = searchParams.get("admin") === "true";

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "";
    const isLive = Boolean(
      keyId &&
      keySecret &&
      keyId.startsWith("rzp_") &&
      !keyId.includes("YOUR_KEY") &&
      keySecret.length > 6 &&
      !keySecret.includes("YOUR_")
    );

    const gatewayStatus = {
      isLive,
      mode: isLive ? "Live Production" : "Test Simulation / Sandbox",
      keyConfigured: Boolean(keyId && !keyId.includes("YOUR_KEY")),
      secretConfigured: Boolean(keySecret && !keySecret.includes("YOUR_")),
      keyPrefix: keyId ? keyId.slice(0, 8) + "..." : "Not configured",
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


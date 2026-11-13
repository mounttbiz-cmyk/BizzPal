import { NextResponse } from "next/server";
import crypto from "crypto";
import { confirmPaymentAndActivateSubscription, confirmDataPalPackPayment, getPaymentTransactionByOrder, getPlatformConfig } from "@/lib/db";
import { resolvePack } from "@/lib/datapal/plans";
import { getRazorpayCredentials, simulatedPaymentsAllowed } from "@/lib/payments/config";
import { DEFAULT_SUBSCRIPTION_PLANS } from "@/config/seeds/defaultCatalog";

export const dynamic = "force-dynamic";

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userName } = body;

    if (!razorpay_order_id) {
      return NextResponse.json({ success: false, error: "Missing order id." }, { status: 400 });
    }

    // The order recorded at creation time is the source of truth for plan, amount and buyer.
    const tx = getPaymentTransactionByOrder(razorpay_order_id);
    if (!tx) {
      return NextResponse.json({ success: false, error: "Unknown order." }, { status: 404 });
    }

    const { keySecret, isLive } = getRazorpayCredentials();
    const isSimOrder = String(razorpay_order_id).startsWith("order_sim_");

    if (isLive) {
      // With real keys a signature is always required; simulated orders are never accepted.
      if (isSimOrder || !razorpay_payment_id || !razorpay_signature) {
        return NextResponse.json({ success: false, error: "Payment signature required." }, { status: 400 });
      }
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
      if (!safeEqualHex(expected, String(razorpay_signature))) {
        return NextResponse.json({ success: false, error: "Payment signature verification failed." }, { status: 400 });
      }
    } else if (!simulatedPaymentsAllowed()) {
      // Never accept simulated payments on a live server
      return NextResponse.json({ success: false, error: "Payments are not available right now." }, { status: 503 });
    } else if (!isSimOrder) {
      return NextResponse.json({ success: false, error: "Invalid simulated order." }, { status: 400 });
    }

    // A DataPal top-up adds records instead of changing the plan
    if (String(tx.plan_id).startsWith("datapal_pack_")) {
      const pack = resolvePack(String(tx.plan_id));
      if (!pack) {
        return NextResponse.json({ success: false, error: "Unknown top-up." }, { status: 400 });
      }
      const packPaymentId = razorpay_payment_id || `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const applied = confirmDataPalPackPayment({
        orderId: razorpay_order_id,
        paymentId: packPaymentId,
        email: tx.user_email,
        records: pack.records,
        rawResponse: {
          order_id: razorpay_order_id,
          payment_id: packPaymentId,
          mode: isLive ? "live_verified" : "sandbox_verified",
          verified_at: new Date().toISOString(),
        },
      });
      return NextResponse.json({
        success: true,
        kind: "datapal_pack",
        records: pack.records,
        paymentId: packPaymentId,
        alreadyApplied: applied.alreadyApplied,
        credits: {
          planTier: applied.credits.planTier,
          baseQuota: applied.credits.baseQuota,
          usedData: applied.credits.used,
          addonCredits: applied.credits.addon,
          totalAllowed: applied.credits.totalAllowed,
          remainingData: applied.credits.remaining,
          usedLeads: applied.credits.used,
          remainingQuota: applied.credits.remaining,
        },
      });
    }

    const configuredPlans = getPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);
    const matchedPlan = Array.isArray(configuredPlans) ? configuredPlans.find((p: any) => p.id === tx.plan_id) : null;
    const planName = matchedPlan?.name || body.planName || "BizzPal Business OS";

    const paymentId = razorpay_payment_id || `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const activation = confirmPaymentAndActivateSubscription({
      orderId: razorpay_order_id,
      paymentId,
      userEmail: tx.user_email,
      userName: userName || "Founder",
      planId: tx.plan_id,
      planName,
      amount: tx.amount,
      currency: tx.currency || "INR",
      rawResponse: {
        order_id: razorpay_order_id,
        payment_id: paymentId,
        mode: isLive ? "live_verified" : "sandbox_verified",
        verified_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription activated successfully!",
      planId: tx.plan_id,
      planName,
      paymentId,
      userEmail: tx.user_email,
      periodEnd: activation.periodEnd,
      subscriptionId: activation.subscriptionId,
    });
  } catch (error: any) {
    console.error("[Razorpay Verify API Error]:", error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to verify payment." }, { status: 500 });
  }
}

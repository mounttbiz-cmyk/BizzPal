import { NextResponse } from "next/server";
import crypto from "crypto";
import { resolvePack } from "@/lib/datapal/plans";
import { confirmCreditPackPayment, isCreditPackId } from "@/lib/platform/creditPacks";
import {
  confirmDataPalPackPayment,
  confirmPaymentAndActivateSubscription,
  extendSubscriptionPeriod,
  getPaymentTransactionByOrder,
  markPaymentFailed,
} from "@/lib/db";
import { getRazorpayCredentials, getWebhookSecret } from "@/lib/payments/config";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");
    const webhookSecret = getWebhookSecret();

    if (webhookSecret) {
      const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      const ok =
        signature && signature.length === expected.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
      if (!ok) {
        console.warn("[Razorpay Webhook] Invalid or missing signature rejected");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else if (process.env.NODE_ENV === "production" || getRazorpayCredentials().isLive) {
      // Never accept unsigned webhooks on production or once Razorpay keys are configured.
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event;
    const payment = event.payload?.payment?.entity || {};

    if (eventType === "payment.captured" || eventType === "order.paid") {
      // Plan, amount and buyer come from our own order record, not the payload notes.
      const tx = payment.order_id ? getPaymentTransactionByOrder(payment.order_id) : null;
      const paymentId = payment.id || `pay_wh_${Date.now()}`;
      // Top-ups are not plans: they must never activate a subscription
      if (tx && isCreditPackId(tx.plan_id)) {
        confirmCreditPackPayment({ orderId: payment.order_id, paymentId, email: tx.user_email, planId: tx.plan_id, rawResponse: event });
      } else if (tx && String(tx.plan_id).startsWith("datapal_pack_")) {
        const pack = resolvePack(String(tx.plan_id));
        if (pack) confirmDataPalPackPayment({ orderId: payment.order_id, paymentId, email: tx.user_email, records: pack.records, rawResponse: event });
      } else if (tx) {
        confirmPaymentAndActivateSubscription({
          orderId: payment.order_id,
          paymentId: payment.id || `pay_wh_${Date.now()}`,
          userEmail: tx.user_email,
          planId: tx.plan_id,
          planName: payment.notes?.planName || tx.plan_id,
          amount: tx.amount,
          currency: tx.currency || "INR",
          rawResponse: event,
        });
      }
    } else if (eventType === "payment.failed") {
      if (payment.order_id) markPaymentFailed(payment.order_id, payment.id || null, event);
      console.warn(`[Razorpay Webhook] Payment failed for order ${payment.order_id}: ${payment.error_description || ""}`);
    } else if (eventType === "subscription.charged") {
      const email = payment.email || payment.notes?.userEmail || event.payload?.subscription?.entity?.notes?.userEmail;
      if (email) extendSubscriptionPeriod(email);
    }

    return NextResponse.json({ status: "ok", received: true });
  } catch (error: any) {
    console.error("[Razorpay Webhook Error]:", error);
    return NextResponse.json({ status: "error", message: error?.message }, { status: 500 });
  }
}

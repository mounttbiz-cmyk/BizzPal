import { NextResponse } from "next/server";
import { confirmPaymentAndActivateSubscription, getPlatformConfig } from "@/lib/db";
import { getSessionEmail } from "@/lib/userSession";
import { DEFAULT_SUBSCRIPTION_PLANS } from "@/config/seeds/defaultCatalog";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { planId, planName, userEmail: bodyEmail, userName } = body;

    let email = getSessionEmail(req);
    if (!email && bodyEmail && typeof bodyEmail === "string" && bodyEmail.includes("@")) {
      email = bodyEmail.trim().toLowerCase();
    }

    if (!email) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    if (!planId) {
      return NextResponse.json({ success: false, error: "planId is required" }, { status: 400 });
    }

    const configuredPlans = getPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);
    const matchedPlan = Array.isArray(configuredPlans) ? configuredPlans.find((p: any) => p.id === planId) : null;
    const resolvedName = matchedPlan?.name || planName || "BizzPal Business OS";

    const cleanEmail = email.trim().toLowerCase();
    const activation = confirmPaymentAndActivateSubscription({
      orderId: `order_act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      paymentId: `pay_act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userEmail: cleanEmail,
      userName: userName || "Founder",
      planId: planId,
      planName: resolvedName,
      amount: 0,
      currency: "INR",
      rawResponse: {
        mode: "plan_activation",
        activated_at: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully activated ${resolvedName}`,
      planId,
      planName: resolvedName,
      userEmail: cleanEmail,
      periodEnd: activation.periodEnd,
      subscriptionId: activation.subscriptionId,
    });
  } catch (err: any) {
    console.error("[Payments Activate Error]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Failed to activate plan" }, { status: 500 });
  }
}

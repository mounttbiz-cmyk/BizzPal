import { NextResponse } from "next/server";
import { confirmPaymentAndActivateSubscription, getPlatformConfig, getRegisteredUser, getUserActiveSubscription } from "@/lib/db";
import { requireUser } from "@/lib/auth/requireUser";
import { DEFAULT_SUBSCRIPTION_PLANS } from "@/config/seeds/defaultCatalog";

export const dynamic = "force-dynamic";

/** "₹3,999", "3999/month", 0 → rupees. Anything that is not a positive number counts as free. */
function priceInRupees(price: unknown): number {
  if (typeof price === "number") return price > 0 ? price : 0;
  const n = parseFloat(String(price ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Saves the plan a customer chose, on the server, for the signed-in account only.
 *
 * - A plan priced at ₹0 in the platform's plan list is switched on directly.
 * - A paid plan is only ever switched on by a verified Razorpay payment (/api/payments/razorpay/verify). Here it
 *   is merely confirmed when that payment already activated it; otherwise the request is refused.
 *
 * Who it is for always comes from the sign-in, never from the request body.
 */
export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await req.json().catch(() => ({}));
    const planId = typeof body?.planId === "string" ? body.planId.trim() : "";
    if (!planId) return NextResponse.json({ success: false, error: "planId is required" }, { status: 400 });

    const plans = getPlatformConfig<any[]>("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS as any[]);
    const plan = Array.isArray(plans) ? plans.find(p => p?.id === planId && p.enabled !== false) : null;
    if (!plan) return NextResponse.json({ success: false, error: "That plan is not available." }, { status: 404 });

    const current: any = getUserActiveSubscription(auth.email);

    if (priceInRupees(plan.price) > 0) {
      // Paid plan: only confirm what a verified payment already switched on
      const stillActive = !current?.current_period_end || new Date(current.current_period_end).getTime() > Date.now();
      if (current?.plan_id === planId && current?.status === "active" && stillActive) {
        return NextResponse.json({ success: true, planId, planName: current.plan_name || plan.name, periodEnd: current.current_period_end || null });
      }
      return NextResponse.json({ success: false, error: "This plan needs a completed payment before it can be switched on." }, { status: 402 });
    }

    // Free plan: nothing to pay, so it can be switched on (or switched back to) directly
    if (current?.plan_id === planId && current?.status === "active") {
      return NextResponse.json({ success: true, planId, planName: current.plan_name || plan.name, periodEnd: current.current_period_end || null });
    }
    const user = getRegisteredUser(auth.email);
    const activation = confirmPaymentAndActivateSubscription({
      orderId: `order_free_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      paymentId: `free_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userEmail: auth.email,
      userName: user?.name || "Founder",
      planId,
      planName: String(plan.name || planId),
      amount: 0,
      currency: "INR",
      rawResponse: { mode: "free_plan_activation", activated_at: new Date().toISOString() },
    });
    return NextResponse.json({ success: true, planId, planName: plan.name, periodEnd: activation.periodEnd });
  } catch (err: any) {
    console.error("[payments/activate]", err);
    return NextResponse.json({ success: false, error: "Could not switch the plan. Please try again." }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getPlatformConfig, createPaymentOrderRecord } from "@/lib/db";
import { getRazorpayCredentials, simulatedPaymentsAllowed } from "@/lib/payments/config";
import { resolvePack } from "@/lib/datapal/plans";
import { DEFAULT_SUBSCRIPTION_PLANS } from "@/config/seeds/defaultCatalog";

export const dynamic = "force-dynamic";

/**
 * Helper to parse numerical price from string like "₹3,999", "3,999", "9999/month"
 */
function parsePriceToPaise(priceVal: string | number): number {
  if (typeof priceVal === "number") {
    return Math.round(priceVal * 100);
  }
  const clean = String(priceVal || "").replace(/[^0-9.]/g, "");
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { planId, planName: rawPlanName, amount: rawAmount, userEmail, userName, businessId } = body;

    if (!planId) {
      return NextResponse.json({ success: false, error: "planId is required" }, { status: 400 });
    }

    // 1. Resolve dynamic plan details from Superadmin config
    const configuredPlans = getPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);
    const matchedPlan = Array.isArray(configuredPlans)
      ? configuredPlans.find((p: any) => p.id === planId)
      : null;

    let planName = matchedPlan?.name || rawPlanName || "BizzPal Business OS";
    let amountInPaise = 0;

    if (matchedPlan?.price) {
      amountInPaise = parsePriceToPaise(matchedPlan.price);
    } else if (rawAmount) {
      amountInPaise = parsePriceToPaise(rawAmount);
    }

    // DataPal top-up packs: the price always comes from the server's own list
    if (String(planId).startsWith("datapal_pack_")) {
      const pack = resolvePack(String(planId));
      if (!pack) {
        return NextResponse.json({ success: false, error: "That amount is not available." }, { status: 400 });
      }
      planName = `${pack.records.toLocaleString("en-IN")} DataPal records`;
      amountInPaise = pack.priceInr * 100;
    }

    if (amountInPaise <= 0) {
      // Free plan or zero cost
      return NextResponse.json({
        success: true,
        orderId: `order_free_${Date.now()}`,
        amount: 0,
        currency: "INR",
        isFreePlan: true,
        isSandboxMode: false,
        keyId: "",
        plan: { id: planId, name: planName, price: "₹0" }
      });
    }

    // 2. Check Razorpay credentials
    const { keyId, keySecret, isLive: isRealRazorpay } = getRazorpayCredentials();

    let orderId = "";
    let isSandboxMode = false;
    let rawOrderResponse: any = null;

    if (isRealRazorpay) {
      try {
        const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const receipt = `rcpt_${Date.now()}_${planId}`.slice(0, 40);

        const res = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${basicAuth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: "INR",
            receipt,
            notes: {
              planId,
              planName,
              userEmail: userEmail || "guest@bizzpal.ai",
              businessId: businessId || "default"
            }
          }),
        });

        const data = await res.json();
        if (res.ok && data.id) {
          orderId = data.id;
          rawOrderResponse = data;
        } else {
          console.error("[Razorpay Live Order Failed]:", data);
          return NextResponse.json(
            { success: false, error: data?.error?.description || "Razorpay could not create the order." },
            { status: 502 }
          );
        }
      } catch (err: any) {
        console.error("[Razorpay Network Error]:", err?.message);
        return NextResponse.json(
          { success: false, error: "Could not reach Razorpay. Please try again." },
          { status: 502 }
        );
      }
    } else {
      // Simulated checkout is for local testing only. A live server without real keys must refuse,
      // otherwise anyone could "buy" a plan for free.
      if (!simulatedPaymentsAllowed()) {
        return NextResponse.json(
          { success: false, error: "Payments are not available right now. Please contact support." },
          { status: 503 }
        );
      }
      isSandboxMode = true;
      orderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }

    // 3. Persist order record in SQLite payment_transactions
    createPaymentOrderRecord({
      orderId,
      userEmail: userEmail || "guest@bizzpal.ai",
      planId,
      amount: amountInPaise,
      currency: "INR",
      status: "created",
      rawResponse: rawOrderResponse || { mode: isSandboxMode ? "sandbox_simulation" : "live" }
    });

    return NextResponse.json({
      success: true,
      orderId,
      amount: amountInPaise,
      currency: "INR",
      keyId: isSandboxMode ? "rzp_test_simulation" : keyId,
      isSandboxMode,
      isFreePlan: false,
      plan: {
        id: planId,
        name: planName,
        priceFormatted: matchedPlan?.price || `₹${(amountInPaise / 100).toLocaleString("en-IN")}`
      }
    });
  } catch (error: any) {
    console.error("[Razorpay Order API Error]:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to initiate payment order" },
      { status: 500 }
    );
  }
}


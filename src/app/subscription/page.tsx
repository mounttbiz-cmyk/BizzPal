"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { PortalModal } from "@/components/ui/PortalModal";
import { loadRazorpaySDK } from "@/lib/payments/loadRazorpay";
import { DEFAULT_SUBSCRIPTION_PLANS } from "@/config/seeds/defaultCatalog";

interface PlanTier {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  color: string;
  badge?: string;
  isPopular?: boolean;
  features: string[];
  ctaLabel: string;
  isCurrent?: boolean;
  actionType?: "self_serve" | "contact" | "custom_link";
  contactEmail?: string;
  customUrl?: string;
  enabled?: boolean;
}

// Used only until the live plan list loads. The live list comes from Admin > Pricing.
const DEFAULT_FALLBACK_PLANS = DEFAULT_SUBSCRIPTION_PLANS as unknown as PlanTier[];

export default function SubscriptionPage() {
  const router = useRouter();
  const { plan: currentPlan, activatePlan, hasActivated } = usePlanAccess();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Razorpay Modals State
  const [sandboxModalOrder, setSandboxModalOrder] = useState<{
    orderId: string;
    amount: number;
    planId: string;
    planName: string;
    userEmail: string;
    userName: string;
    priceFormatted: string;
  } | null>(null);

  const [paymentSuccessModal, setPaymentSuccessModal] = useState<{
    planName: string;
    planId: string;
    paymentId: string;
    periodEnd?: string;
  } | null>(null);

  // Close modals on Escape
  useEscapeKey(() => {
    setSandboxModalOrder(null);
  }, Boolean(sandboxModalOrder));

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const ensureSessionAndOpenDashboard = (planId: string, planName: string) => {
    try {
      activatePlan(planId);

      // Guarantee user session is active so AuthGuard always admits the user to dashboard
      let session = localStorage.getItem("bizzpal_user_session");
      if (!session) {
        const profileStr = localStorage.getItem("bizzpal_business_profile");
        const profile = profileStr ? JSON.parse(profileStr) : null;
        const userSession = {
          id: `usr_${Date.now()}`,
          email: profile?.website ? `founder@${profile.website.replace(/^https?:\/\//, "")}` : "founder@mycompany.in",
          name: profile?.founderName || "Founder",
          role: "owner",
          provider: "email",
          authenticatedAt: new Date().toISOString(),
        };
        localStorage.setItem("bizzpal_user_session", JSON.stringify(userSession));
      }
    } catch (e) {
      // ignore
    }

    notify(`${planName} activated! Launching your Business OS…`);
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 600);
  };

  // Helper to extract active user details for checkout
  const getUserCheckoutDetails = () => {
    let email = "founder@bizzpal.ai";
    let name = "Founder";
    let phone = "";
    try {
      const sessStr = localStorage.getItem("bizzpal_user_session");
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        if (sess.email) email = sess.email.trim().toLowerCase();
        if (sess.name) name = sess.name;
      }
      const bizStr = localStorage.getItem("bizzpal_business_profile");
      if (bizStr) {
        const biz = JSON.parse(bizStr);
        if (biz.founderName && !name) name = biz.founderName;
        if (biz.whatsappNumber) phone = biz.whatsappNumber;
      }
    } catch {}
    return { email, name, phone };
  };

  // Verify payment on backend API and complete activation
  const verifyPaymentAndActivate = async (payload: {
    razorpay_order_id: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    planId: string;
    planName: string;
    userEmail: string;
    userName: string;
    amount: number;
    isSandboxMode: boolean;
  }) => {
    try {
      setIsProcessing(true);
      const res = await fetch("/api/payments/razorpay/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        notify(data.error || "Payment verification failed. Please try again.");
        setIsProcessing(false);
        setProcessingPlanId(null);
        return;
      }

      // 1. Activate plan in local client state and user-specific storage
      activatePlan(payload.planId);
      localStorage.setItem("bizzpal_subscription_plan", payload.planId);
      if (payload.userEmail) {
        localStorage.setItem(`bizzpal_subscription_plan_${payload.userEmail}`, payload.planId);
      }

      // 2. Broadcast live synchronization
      try {
        window.dispatchEvent(new CustomEvent("bizzpal_plan_updated", { detail: { planId: payload.planId } }));
        const bc = new BroadcastChannel("bizzpal_channel");
        bc.postMessage({ type: "PLAN_UPDATED", planId: payload.planId, userEmail: payload.userEmail });
        bc.close();
      } catch {}

      // 3. Show celebratory success modal
      setSandboxModalOrder(null);
      setPaymentSuccessModal({
        planName: payload.planName,
        planId: payload.planId,
        paymentId: data.paymentId || payload.razorpay_payment_id || "PAY_CONFIRMED",
        periodEnd: data.periodEnd,
      });
    } catch (err: any) {
      console.error("[Checkout Verification Error]:", err);
      notify("Network error verifying payment. Please check your connection.");
    } finally {
      setIsProcessing(false);
      setProcessingPlanId(null);
    }
  };

  // Main payment initiation handler
  const handleInitiatePayment = async (plan: PlanTier) => {
    // Current active plan check
    if (currentPlan === plan.id) {
      ensureSessionAndOpenDashboard(plan.id, plan.name);
      return;
    }

    // Custom external checkout link check
    if (plan.actionType === "custom_link" && plan.customUrl) {
      window.open(plan.customUrl, "_blank");
      return;
    }

    // Contact sales check
    const isContact =
      plan.actionType === "contact" ||
      plan.price.toLowerCase().includes("custom") ||
      plan.ctaLabel.toLowerCase().includes("contact");
    if (isContact) {
      const email = plan.contactEmail || "sales@bizzpal.app";
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Enterprise plan enquiry — ${plan.name}`)}`;
      return;
    }

    // Free plan direct activation
    if (plan.id === "free" || plan.price === "₹0" || plan.price === "0") {
      ensureSessionAndOpenDashboard(plan.id, plan.name);
      return;
    }

    // Paid Plan: Initiate Razorpay Order
    setIsProcessing(true);
    setProcessingPlanId(plan.id);

    const userDetails = getUserCheckoutDetails();

    try {
      const orderRes = await fetch("/api/payments/razorpay/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          planName: plan.name,
          amount: plan.price,
          userEmail: userDetails.email,
          userName: userDetails.name,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || !orderData.success) {
        notify(orderData.error || "Failed to initiate payment. Please try again.");
        setIsProcessing(false);
        setProcessingPlanId(null);
        return;
      }

      // Check if order is free
      if (orderData.isFreePlan) {
        ensureSessionAndOpenDashboard(plan.id, plan.name);
        setIsProcessing(false);
        setProcessingPlanId(null);
        return;
      }

      // If Razorpay keys are not yet configured or in test simulation:
      if (orderData.isSandboxMode) {
        setIsProcessing(false);
        setSandboxModalOrder({
          orderId: orderData.orderId,
          amount: orderData.amount,
          planId: plan.id,
          planName: plan.name,
          userEmail: userDetails.email,
          userName: userDetails.name,
          priceFormatted: orderData.plan?.priceFormatted || plan.price,
        });
        return;
      }

      // Live / Test Mode: Load official Razorpay Checkout SDK
      const sdkLoaded = await loadRazorpaySDK();
      if (!sdkLoaded || !(window as any).Razorpay) {
        notify("Couldn't load the Razorpay checkout. Check your connection and try again.");
        setIsProcessing(false);
        setProcessingPlanId(null);
        return;
      }

      // Open official Razorpay modal
      const razorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "BizzPal™",
        description: `Subscription to ${plan.name}`,
        image: "/logo.png",
        order_id: orderData.orderId,
        prefill: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone,
        },
        theme: {
          color: "#B48C36", // Boardroom gold
        },
        handler: async (response: any) => {
          await verifyPaymentAndActivate({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            planId: plan.id,
            planName: plan.name,
            userEmail: userDetails.email,
            userName: userDetails.name,
            amount: orderData.amount,
            isSandboxMode: false,
          });
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setProcessingPlanId(null);
          },
        },
      };

      const rzpInstance = new (window as any).Razorpay(razorpayOptions);
      rzpInstance.on("payment.failed", (response: any) => {
        setIsProcessing(false);
        setProcessingPlanId(null);
        notify(`Payment cancelled: ${response?.error?.description || "Transaction failed"}`);
      });
      rzpInstance.open();
    } catch (err: any) {
      console.error("[Razorpay Checkout Exception]:", err);
      notify("Failed to initialize checkout. Please try again.");
      setIsProcessing(false);
      setProcessingPlanId(null);
    }
  };

  const [plans, setPlans] = useState<PlanTier[]>(() => DEFAULT_FALLBACK_PLANS.filter(p => p.enabled !== false));

  const loadPlans = () => {
    fetch("/api/public/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && Array.isArray(d.plans)) {
          const activePlans = d.plans.filter((p: any) => p.enabled !== false);
          setPlans(activePlans);
          try {
            localStorage.setItem("bizzpal_subscription_plans", JSON.stringify(d.plans));
          } catch {}
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem("bizzpal_subscription_plans");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlans(parsed.filter((p: any) => p.enabled !== false));
        }
      }
    } catch {}
    loadPlans();

    // Listen for live updates when Superadmin edits plans in another tab or window
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "bizzpal_subscription_plans" && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setPlans(updated.filter((p: any) => p.enabled !== false));
          }
        } catch {}
      }
    };

    const handleCustomSync = () => {
      try {
        const cached = localStorage.getItem("bizzpal_subscription_plans");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setPlans(parsed.filter((p: any) => p.enabled !== false));
          }
        }
      } catch {}
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("bizzpal_config_updated", handleCustomSync);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("bizzpal_channel");
      bc.onmessage = () => loadPlans();
    } catch {}
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bizzpal_config_updated", handleCustomSync);
      if (bc) bc.close();
    };
  }, []);

  // Layout adapts to however many plans exist (cards wrap and stay centred)
  const planCount = plans.length;
  const wrapMax =
    planCount <= 2 ? "max-w-3xl" : planCount === 3 ? "max-w-6xl" : planCount === 4 ? "max-w-7xl" : "max-w-[90rem]";
  const cardBasis =
    planCount <= 1
      ? "w-full max-w-sm"
      : planCount === 2
      ? "w-full md:basis-[calc(50%-0.75rem)]"
      : planCount === 3
      ? "w-full md:basis-[calc(50%-0.75rem)] lg:basis-[calc(33.333%-1rem)]"
      : planCount === 4
      ? "w-full md:basis-[calc(50%-0.75rem)] xl:basis-[calc(25%-1.125rem)]"
      : "w-full md:basis-[calc(50%-0.75rem)] lg:basis-[calc(33.333%-1rem)] 2xl:basis-[calc(20%-1.2rem)]";
  const compact = planCount >= 4;

  return (
    <div className="min-h-screen bg-bg text-text p-4 sm:p-6 lg:p-8 flex flex-col">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-surface border border-line shadow-lg text-sm text-text">
          {toast}
        </div>
      )}

      <header className="max-w-7xl w-full mx-auto pb-5 border-b border-line flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface border border-line flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BizzPal" width={28} height={28} className="object-contain" />
          </div>
          <span className="font-semibold text-text">BizzPal</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-text-muted hover:text-text px-3.5 py-2 rounded-lg border border-line bg-surface whitespace-nowrap"
          >
            <span className="hidden sm:inline">Back to dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="w-28 sm:w-32 shrink-0">
            <ThemeSwitch compact />
          </div>
        </div>
      </header>

      <main className="max-w-[90rem] w-full mx-auto flex-1 py-12 sm:py-16 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h1 className="text-4xl sm:text-5xl font-semibold text-text">Choose your plan</h1>
          <p className="text-base sm:text-lg text-text-muted leading-relaxed">
            Start free and upgrade when you need more tools, advisors or team seats.
          </p>
        </div>

        <div className={`flex flex-wrap justify-center items-stretch gap-6 mx-auto pt-3 ${wrapMax}`}>
          {plans.map(p => {
            const featured = Boolean(p.isPopular);
            const isCurrent = currentPlan === p.id;
            const busy = isProcessing && processingPlanId === p.id;
            const [first, ...rest] = p.features;
            const hasInherit = typeof first === "string" && /^all\b/i.test(first) && /feature/i.test(first);
            const listItems = hasInherit ? rest : p.features;
            const badgeText = isCurrent ? "Your plan" : p.badge;

            return (
              <section
                key={p.id}
                className={`relative rounded-2xl ${compact ? "p-6 xl:p-7 pt-9" : "p-7 sm:p-8 pt-9"} grow-0 shrink-0 ${cardBasis} flex flex-col border bg-surface ${
                  featured ? "border-line-strong shadow-[0_8px_30px_-12px_rgba(0,0,0,0.18)]" : "border-line"
                }`}
              >
                {badgeText && (
                  <span
                    className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      featured && !isCurrent
                        ? "bg-brass text-white"
                        : "bg-surface border border-line-strong text-text"
                    }`}
                  >
                    {badgeText}
                  </span>
                )}

                <h2 className="text-xl font-semibold text-text">{p.name}</h2>
                <p className={`text-sm text-text-muted leading-6 mt-2 ${planCount >= 5 ? "min-h-[6rem]" : "min-h-[4.5rem]"}`}>{p.tagline}</p>

                <div className="flex items-baseline gap-1.5 mt-4 h-14">
                  <span className={`${compact ? "text-3xl 2xl:text-4xl" : "text-4xl"} font-semibold text-text whitespace-nowrap`}>{p.price}</span>
                  <span className="text-sm text-text-muted whitespace-nowrap">{p.period}</span>
                </div>

                <div className={`mt-6 ${compact ? "min-h-[4.25rem]" : ""}`}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => handleInitiatePayment(p)}
                    className={`w-full py-3 px-4 rounded-xl border text-sm font-medium cursor-pointer flex items-center justify-center text-center gap-2 disabled:opacity-60 transition-colors ${
                      isCurrent
                        ? "border-line text-text hover:bg-surface-2"
                        : featured
                        ? "border-transparent bg-brass text-white hover:brightness-110"
                        : "border-transparent bg-surface-2 text-text hover:bg-line"
                    }`}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Starting checkout…</span>
                      </>
                    ) : isCurrent ? (
                      "Open dashboard"
                    ) : (
                      p.ctaLabel || "Choose plan"
                    )}
                  </button>
                </div>

                <div className={`${compact ? "mt-3" : "mt-8"} pt-6 border-t border-line flex-1`}>
                  <p className="text-sm font-medium text-text mb-3">{hasInherit ? `${first}, plus:` : "What's included:"}</p>
                  <ul className="space-y-3.5">
                    {listItems.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-text-muted leading-snug">
                        <Check className="w-4 h-4 text-jade shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl border border-line bg-surface shadow-sm px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-base font-medium text-text">Not sure which plan fits?</p>
            <p className="text-sm text-text-muted mt-0.5">Tell us about your business and we&apos;ll help you choose.</p>
          </div>
          <a
            href="mailto:sales@bizzpal.app?subject=Help%20choosing%20a%20plan"
            className="px-5 py-2.5 rounded-xl border border-line text-sm text-text hover:bg-surface-2 whitespace-nowrap self-start sm:self-auto"
          >
            Talk to us
          </a>
        </div>
      </main>

      {sandboxModalOrder && (
        <PortalModal isOpen={Boolean(sandboxModalOrder)} onClose={() => setSandboxModalOrder(null)}>
          <div
            className="w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-text">Checkout</h3>
                <p className="text-sm text-text-muted mt-1">Test mode. No real payment is taken.</p>
              </div>
              <button
                type="button"
                onClick={() => setSandboxModalOrder(null)}
                aria-label="Close"
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6">
              <div className="p-4 rounded-lg border border-line flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text">{sandboxModalOrder.planName}</p>
                  <p className="text-xs text-text-muted mt-1 truncate">Billed to {sandboxModalOrder.userEmail}</p>
                  <p className="text-xs text-text-muted truncate">Order {sandboxModalOrder.orderId}</p>
                </div>
                <p className="text-lg text-text shrink-0">{sandboxModalOrder.priceFormatted}</p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSandboxModalOrder(null)}
                className="px-3.5 py-2 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  verifyPaymentAndActivate({
                    razorpay_order_id: sandboxModalOrder.orderId,
                    razorpay_payment_id: `pay_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                    razorpay_signature: `sig_mock_${Date.now()}`,
                    planId: sandboxModalOrder.planId,
                    planName: sandboxModalOrder.planName,
                    userEmail: sandboxModalOrder.userEmail,
                    userName: sandboxModalOrder.userName,
                    amount: sandboxModalOrder.amount,
                    isSandboxMode: true,
                  });
                }}
                className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  "Complete test payment"
                )}
              </button>
            </div>
          </div>
        </PortalModal>
      )}

      {paymentSuccessModal && (
        <PortalModal isOpen={Boolean(paymentSuccessModal)} onClose={() => {}}>
          <div
            className="w-[28rem] max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface shadow-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-5 space-y-2">
              <h2 className="text-lg font-semibold text-text">You&apos;re on {paymentSuccessModal.planName}</h2>
              <p className="text-sm text-text-muted leading-relaxed">
                Your payment went through and the new features are now active in your workspace.
              </p>
            </div>

            <dl className="mx-6 mb-6 rounded-lg border border-line divide-y divide-line text-sm">
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-text-muted">Plan</dt>
                <dd className="text-text capitalize">{paymentSuccessModal.planId}</dd>
              </div>
              <div className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-text-muted">Payment reference</dt>
                <dd className="text-text truncate max-w-[180px]">{paymentSuccessModal.paymentId}</dd>
              </div>
            </dl>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/dashboard";
                }}
                className="w-full py-2.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

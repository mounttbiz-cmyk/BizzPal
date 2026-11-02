"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, CheckCircle2, X, Building2, Zap, Crown, Tag, ShieldCheck, Loader2, Sparkles, AlertCircle, CreditCard } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { PortalModal } from "@/components/ui/PortalModal";
import { loadRazorpaySDK } from "@/lib/payments/loadRazorpay";

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

const DEFAULT_FALLBACK_PLANS: PlanTier[] = [
  {
    id: "free",
    name: "BizzPal Starter Free",
    tagline: "Try BizzPal free to see how it works.",
    price: "₹0",
    period: "/forever",
    color: "border-emerald-400/30 text-emerald-400",
    badge: "Free Trial",
    isPopular: false,
    actionType: "self_serve",
    features: [
      "Business Dashboard",
      "CEO AI Assistant (Astra)",
      "Company Health Score",
      "Profit & ROI Calculators",
      "Save up to 5 Documents & SOPs",
      "Daily Business Briefings",
      "Task Manager",
      "Free AI questions",
    ],
    ctaLabel: "Start Free & Open Dashboard",
  },
  {
    id: "starter",
    name: "Starter Business OS",
    tagline: "For solo founders and early teams (1-5 people).",
    price: "₹3,999",
    period: "/month",
    color: "border-cyan-400/30 text-cyan-400",
    badge: "Most Popular",
    isPopular: true,
    actionType: "self_serve",
    features: [
      "All Free tier features",
      "All 3 AI Executives (CEO, CFO, CMO)",
      "Automated Daily 8:00 AM WhatsApp Briefings",
      "Connect 3 Business Tools (Stripe, Slack, Zoho)",
      "Cash Runway & Burn Alarm System",
      "Unlimited AI Strategy Consultations",
      "3 Team Member Seats",
      "Email & WhatsApp Support",
    ],
    ctaLabel: "Activate Starter Plan",
  },
  {
    id: "growth",
    name: "Growth Scale",
    tagline: "For expanding businesses ready to scale (5-30 people).",
    price: "₹9,999",
    period: "/month",
    color: "border-violet-400/30 text-violet-400",
    badge: "Recommended",
    isPopular: false,
    actionType: "self_serve",
    features: [
      "All Starter tier features",
      "Scenario Planner & Simulator",
      "Executive Playbooks & Growth Vectors",
      "Connect Unlimited Tools & Bank Accounts",
      "Weekly AI Strategic Audits",
      "Custom KPI Dashboards & Role-based Access",
      "10 Team Member Seats",
      "Dedicated Account Manager",
    ],
    ctaLabel: "Activate Growth Scale",
  },
  
];

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

  const [plans, setPlans] = useState<PlanTier[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bizzpal_subscription_plans");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.filter((p: any) => p.enabled !== false);
          }
        }
      } catch {}
    }
    return DEFAULT_FALLBACK_PLANS;
  });

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

  return (
    <div className="min-h-screen bg-bg text-text p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-xl bg-surface border border-brass/40 shadow-2xl text-xs font-semibold text-text flex items-center gap-2 animate-fade-in ring-1 ring-brass/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>{toast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="max-w-7xl w-full mx-auto pb-5 sm:pb-6 border-b border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-surface border border-line flex items-center justify-center p-1 shadow-sm group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="BizzPal Logo"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-text font-sans">BizzPal</span>
              <span className="text-[10px] ml-2 px-1.5 py-0.2 rounded bg-brass-soft text-brass font-bold uppercase">
                Capability Tiers
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-text-muted hover:text-text btn-tactile px-3 py-1.5 rounded-lg border border-line bg-surface-2 whitespace-nowrap"
          >
            Go to Dashboard →
          </Link>
          <div className="w-28 sm:w-32 shrink-0">
            <ThemeSwitch compact />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl w-full mx-auto my-auto py-8 sm:py-12 space-y-8 sm:space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto px-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/10 border border-gold/25 text-gold text-xs font-bold uppercase tracking-wider">
            <Tag className="w-3.5 h-3.5" />
            <span>Plans & Pricing</span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold text-text tracking-tight font-sans leading-tight">
            Choose the Plan That Fits Your Business
          </h1>
          <p className="text-sm sm:text-base text-text-muted leading-relaxed max-w-xl mx-auto">
            Start free to see what BizzPal can do, or choose a plan with more tools, AI executives, and automated workflows.
          </p>
        </div>

        {/* Plans Grid */}
        <div
          className={`grid grid-cols-1 gap-6 items-stretch mx-auto ${
            {
              1: "max-w-sm md:grid-cols-1",
              2: "max-w-3xl md:grid-cols-2",
              3: "max-w-6xl md:grid-cols-2 lg:grid-cols-3",
              4: "max-w-7xl md:grid-cols-2 lg:grid-cols-4",
            }[Math.min(plans.length, 4) as 1 | 2 | 3 | 4] ?? "max-w-7xl md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5"
          }`}
        >
          {plans.map(p => {
            const isPopular = Boolean(p.isPopular);
            const isCurrent = currentPlan === p.id;
            const isContact =
              p.actionType === "contact" ||
              p.price.toLowerCase().includes("custom") ||
              p.ctaLabel.toLowerCase().includes("contact");

            const accent = isPopular
              ? { text: "text-gold", icon: "text-gold" }
              : { text: "text-text", icon: "text-emerald-500/80" };

            return (
              <div
                key={p.id}
                className={`group rounded-2xl sm:rounded-3xl border p-5 sm:p-8 flex flex-col justify-between transition-all duration-300 relative overflow-hidden ${
                  isPopular
                    ? "bg-surface border-gold/40 shadow-[0_20px_50px_-12px_var(--gold-glow)] ring-1 ring-gold/20 lg:scale-[1.04] lg:-translate-y-2 z-10"
                    : "bg-surface border-line hover:border-gold/30 shadow-sm hover:shadow-lg hover:shadow-gold/5 hover:-translate-y-1.5"
                }`}
              >
                {isPopular && (
                  <div className="pointer-events-none absolute inset-x-0 -top-24 h-40 bg-gold/[0.08] blur-3xl" />
                )}

                {p.badge && (
                  <div
                    className={`absolute top-0 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-b-xl text-[10px] font-extrabold uppercase tracking-wider ${
                      isPopular
                        ? "btn-gold-gradient shadow-md"
                        : "bg-surface-2 text-text-muted border border-line border-t-0"
                    }`}
                  >
                    {p.badge}
                  </div>
                )}

                <div className="space-y-6 pt-5">
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-extrabold text-text tracking-tight">{p.name}</h3>
                    <p className="text-[13px] text-text-muted leading-relaxed min-h-[2.5rem]">
                      {p.tagline}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-4xl font-extrabold tracking-tight ${accent.text}`}>
                      {p.price}
                    </span>
                    <span className="text-sm text-text-muted font-medium">{p.period}</span>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing && processingPlanId === p.id}
                    onClick={() => handleInitiatePayment(p)}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all btn-tactile cursor-pointer text-center flex items-center justify-center gap-2 ${
                      isCurrent
                        ? "bg-surface-2 border border-line text-emerald-500 dark:text-emerald-400 hover:bg-surface"
                        : isPopular
                        ? "btn-gold-gradient shadow-md hover:brightness-105 active:scale-[0.98]"
                        : "bg-surface-2 hover:bg-surface border border-line-strong hover:border-gold/30 text-text"
                    }`}
                  >
                    {isProcessing && processingPlanId === p.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-brass" />
                        <span>Initializing Checkout…</span>
                      </>
                    ) : isCurrent ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Current Plan (Active)</span>
                      </>
                    ) : (
                      p.ctaLabel || "Select Plan"
                    )}
                  </button>

                  {/* Features List */}
                  <div className="pt-6 border-t border-line space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted/80 block">
                      What's included
                    </span>
                    <ul className="space-y-2.5">
                      {p.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2.5">
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${accent.icon}`} />
                          <span className="text-text text-[13px] leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* RAZORPAY SANDBOX TEST SIMULATION MODAL                         */}
      {/* ============================================================== */}
      {sandboxModalOrder && (
        <PortalModal isOpen={Boolean(sandboxModalOrder)} onClose={() => setSandboxModalOrder(null)}>
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-line bg-surface shadow-2xl space-y-5 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">Razorpay Checkout</h3>
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">
                    Sandbox / Test Simulation Mode
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSandboxModalOrder(null)}
                className="text-xs text-text-muted hover:text-text cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-line flex items-center justify-between">
                <div>
                  <div className="font-bold text-text text-sm">{sandboxModalOrder.planName}</div>
                  <div className="text-[11px] text-text-muted">Order ID: {sandboxModalOrder.orderId}</div>
                  <div className="text-[11px] text-text-muted">Billing To: {sandboxModalOrder.userEmail}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-brass">
                    {sandboxModalOrder.priceFormatted}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                    UPI · Cards · NetBanking
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Ready for Live Razorpay Keys</span>
                </div>
                Your Razorpay keys are currently in placeholder mode in <code className="bg-surface px-1 py-0.5 rounded border border-line">.env.local</code>. You can simulate a successful Razorpay payment now to test order creation, cryptographic verification, and plan activation!
              </div>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSandboxModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-text-muted hover:text-text cursor-pointer hover:bg-surface-2 transition-all"
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
                className="px-5 py-2.5 rounded-xl btn-gold-gradient text-xs font-bold btn-tactile hover:brightness-105 cursor-pointer disabled:opacity-50 shadow-md flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Payment…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Simulate Successful Payment (Test)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </PortalModal>
      )}

      {/* ============================================================== */}
      {/* CELEBRATORY PAYMENT SUCCESS MODAL                              */}
      {/* ============================================================== */}
      {paymentSuccessModal && (
        <PortalModal isOpen={Boolean(paymentSuccessModal)} onClose={() => {}}>
          <div
            className="w-full max-w-md p-6 rounded-3xl border border-emerald-500/30 bg-surface shadow-2xl space-y-5 text-center animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">
                Payment Confirmed
              </span>
              <h2 className="text-xl font-extrabold text-text tracking-tight">
                Welcome to {paymentSuccessModal.planName}!
              </h2>
              <p className="text-xs text-text-muted leading-relaxed max-w-sm mx-auto">
                Your payment was verified and processed successfully. All specialized executive tools, AI assistants, and automated workflows are now active.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-surface-2 border border-line text-left text-xs space-y-1 font-mono">
              <div className="flex justify-between text-text-muted">
                <span>Plan Tier:</span>
                <span className="text-text font-bold uppercase">{paymentSuccessModal.planId}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Payment Reference:</span>
                <span className="text-emerald-500 truncate max-w-[180px]">{paymentSuccessModal.paymentId}</span>
              </div>
              <div className="flex justify-between text-text-muted">
                <span>Status:</span>
                <span className="text-emerald-500 font-bold">Active Workspace</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
              className="w-full py-3 rounded-xl btn-gold-gradient font-bold text-xs btn-tactile hover:brightness-105 shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Launch Business OS Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, ArrowRight, CheckCircle2, X, Building2, Zap, Crown, Tag } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { PortalModal } from "@/components/ui/PortalModal";

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
  {
    id: "enterprise",
    name: "Enterprise Custom",
    tagline: "For mid-market companies & conglomerates (30+ people).",
    price: "Custom",
    period: "/billed annually",
    color: "border-amber-400/30 text-amber-400",
    badge: "Enterprise",
    isPopular: false,
    actionType: "contact",
    contactEmail: "sales@bizzpal.app",
    features: [
      "All Growth Scale features",
      "Self-hosted / Dedicated Cloud Deployment",
      "Custom AI Executive Models trained on your data",
      "Custom ERP & Legacy Integrations",
      "Enterprise SLA (99.9% uptime)",
      "Unlimited Seats & Departments",
      "SOC 2 Type II & ISO 27001 Compliance",
      "24/7 Executive Hotline",
    ],
    ctaLabel: "Contact Enterprise Sales",
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { plan: currentPlan, activatePlan, hasActivated } = usePlanAccess();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<PlanTier | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Close Plan modal on Escape
  useEscapeKey(() => setSelectedPlanForModal(null), Boolean(selectedPlanForModal));

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
        if (d.success && Array.isArray(d.plans) && d.plans.length > 0) {
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
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("bizzpal_config_updated", handleCustomSync);
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
                    onClick={() => {
                      if (isCurrent) {
                        ensureSessionAndOpenDashboard(p.id, p.name);
                        return;
                      }

                      if (p.actionType === "custom_link" && p.customUrl) {
                        window.open(p.customUrl, "_blank");
                        return;
                      }

                      if (isContact) {
                        const email = p.contactEmail || "sales@bizzpal.app";
                        window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Enterprise plan enquiry — ${p.name}`)}`;
                        return;
                      }

                      if (p.id === "free") {
                        ensureSessionAndOpenDashboard(p.id, p.name);
                      } else {
                        setSelectedPlanForModal(p);
                      }
                    }}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all btn-tactile cursor-pointer text-center ${
                      isCurrent
                        ? "bg-surface-2 border border-line text-emerald-500 dark:text-emerald-400 hover:bg-surface flex items-center justify-center gap-1.5"
                        : isPopular
                        ? "btn-gold-gradient shadow-md hover:brightness-105 active:scale-[0.98]"
                        : "bg-surface-2 hover:bg-surface border border-line-strong hover:border-gold/30 text-text"
                    }`}
                  >
                    {isCurrent ? (
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

      {/* Payment Confirmation Modal */}
      {selectedPlanForModal && (
        <PortalModal isOpen={Boolean(selectedPlanForModal)} onClose={() => setSelectedPlanForModal(null)}>
          <div
            className="w-full max-w-md p-6 rounded-2xl border border-line bg-surface shadow-2xl space-y-4 animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-text">Confirm Subscription</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPlanForModal(null)}
                className="text-xs text-text-muted hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-line flex items-center justify-between">
                <div>
                  <div className="font-bold text-text">{selectedPlanForModal.name}</div>
                  <div className="text-[11px] text-text-muted">{selectedPlanForModal.tagline}</div>
                </div>
                <div className="text-base font-bold font-mono text-brass">
                  {selectedPlanForModal.price}
                </div>
              </div>

              <p className="text-[11px] text-text-muted leading-relaxed">
                You are activating {selectedPlanForModal.name}. All features, AI agents, specialized tools, and workflows will be unlocked immediately for your workspace.
              </p>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedPlanForModal(null)}
                className="px-3 py-1.5 rounded-lg border border-line text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setIsProcessing(true);
                  setTimeout(() => {
                    setIsProcessing(false);
                    ensureSessionAndOpenDashboard(selectedPlanForModal.id, selectedPlanForModal.name);
                    setSelectedPlanForModal(null);
                  }, 800);
                }}
                className="px-4 py-2 rounded-xl btn-gold-gradient font-bold btn-tactile hover:brightness-105 cursor-pointer disabled:opacity-50 shadow-md"
              >
                {isProcessing ? "Activating OS…" : `Confirm & Launch OS`}
              </button>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

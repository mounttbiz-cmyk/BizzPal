"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ContainerTile } from "../ui/ContainerTile";
import { StatusBadge } from "../ui/Badge";
import { BrainCircuit, LineChart, ArrowRight, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";

import { useBusinessDataSync } from "@/lib/upload/events";

interface BriefingWidgetProps {
  companyName?: string;
  ceoName?: string;
}

export function BriefingWidget({
  companyName: propCompanyName = "Your Enterprise",
  ceoName = "Astra",
}: BriefingWidgetProps) {
  const [companyName, setCompanyName] = useState(propCompanyName);
  const [founderName, setFounderName] = useState("Founder");
  const [industryLabel, setIndustryLabel] = useState("Technology");
  const [monthlyRev, setMonthlyRev] = useState(0);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);
  const [isUploaded, setIsUploaded] = useState(false);
  const [activeCeoName, setActiveCeoName] = useState(ceoName);

  useEffect(() => {
    const syncCeo = () => {
      try {
        const raw = localStorage.getItem("bizzpal_custom_advisors");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.ceo?.name) {
            setActiveCeoName(parsed.ceo.name);
            return;
          }
        }
      } catch {}
      setActiveCeoName(ceoName);
    };
    syncCeo();
    window.addEventListener("bizzpal_advisors_updated", syncCeo);
    window.addEventListener("storage", syncCeo);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", syncCeo);
      window.removeEventListener("storage", syncCeo);
    };
  }, [ceoName]);

  const applyProfile = (p: any) => {
    if (!p) return;
    if (p.name) setCompanyName(p.name);
    if (p.founderName) setFounderName(p.founderName);
    if (p.industryLabel) setIndustryLabel(p.industryLabel);
    else if (p.industry) setIndustryLabel(p.industry);
    if (p.revenue !== undefined && p.revenue !== null) setMonthlyRev(Number(p.revenue));
    else if (p.monthlyRevenue !== undefined && p.monthlyRevenue !== null) setMonthlyRev(Number(p.monthlyRevenue));
    if (p.burn !== undefined && p.burn !== null) setBurn(Number(p.burn));
    else if (p.monthlyBurn !== undefined && p.monthlyBurn !== null) setBurn(Number(p.monthlyBurn));
    if (p.cash !== undefined && p.cash !== null) setCash(Number(p.cash));
    else if (p.cashOnHand !== undefined && p.cashOnHand !== null) setCash(Number(p.cashOnHand));
    if (p.isUploadedData) setIsUploaded(true);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_business_profile");
      if (saved) {
        applyProfile(JSON.parse(saved));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) {
              applyProfile(d.business);
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useBusinessDataSync(metrics => {
    applyProfile(metrics);
  });

  const isFresh = monthlyRev === 0 && burn === 0 && cash === 0;
  const runwayMonths = burn > 0 ? (cash / burn).toFixed(1) : cash > 0 ? "Infinite (Zero Burn)" : "0.0";

  return (
    <ContainerTile span={2} id="widget_daily_briefing">
      <div className="flex flex-col h-full justify-between space-y-4">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-line/60 dark:border-b-[#2D2722]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/25 dark:bg-[#18161D] dark:border-[#2D2722] flex items-center justify-center text-gold dark:text-[#D9B44A]">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-text dark:text-[#EBE7DF] uppercase tracking-wider font-sans flex items-center gap-1.5">
                  <span>Executive AI Briefing</span>
                  <StatusBadge label={isFresh ? "Calibrating" : "Autonomous"} tone="ai" />
                </h2>
                <span className="text-[10px] text-text-muted dark:text-[#97928E]">
                  Synthesized by {activeCeoName} (Chief Executive AI)
                </span>
              </div>
            </div>
            <StatusBadge label={isFresh ? "Fresh Baseline" : "Live Feed"} tone={isFresh ? "neutral" : "live"} pulse={!isFresh} />
          </div>

          {/* Structured Intelligence Cards */}
          <div className="py-3 space-y-2.5">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] dark:bg-[#18161D] dark:border-[#2D2722] dark:hover:border-[#41372A] dark:hover:bg-[#1C1A22] transition-colors space-y-1"
            >
              <div className="flex items-center gap-2">
                <LineChart className="w-3.5 h-3.5 text-blue-400 dark:text-[#D9B44A]" />
                <span className="text-[11px] font-bold text-text dark:text-[#D9B44A] uppercase tracking-wider font-mono">
                  Revenue & Growth Trajectory
                </span>
              </div>
              <p className="text-xs text-text-muted dark:text-[#97928E] leading-relaxed pl-5">
                {monthlyRev > 0 ? (
                  <>
                    Monthly operating revenue for <strong className="text-text dark:text-[#EBE7DF] font-bold">{companyName}</strong> is verified at <strong className="text-text dark:text-[#EBE7DF] font-bold font-mono">₹{monthlyRev.toLocaleString("en-IN")}</strong> in {industryLabel}.
                  </>
                ) : (
                  <>
                    Operating revenue for <strong className="text-text dark:text-[#EBE7DF] font-bold">{companyName}</strong> is currently at baseline zero. Input your current monthly billings to track real growth trajectory.
                  </>
                )}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              className="p-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] dark:bg-[#18161D] dark:border-[#2D2722] dark:hover:border-[#41372A] dark:hover:bg-[#1C1A22] transition-colors space-y-1"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 dark:text-[#3FA96A]" />
                <span className="text-[11px] font-bold text-emerald-400 dark:text-[#3FA96A] uppercase tracking-wider font-mono">
                  Capital Reserves & Buffer
                </span>
              </div>
              <p className="text-xs text-text-muted dark:text-[#97928E] leading-relaxed pl-5">
                {cash > 0 || burn > 0 ? (
                  <>
                    Net burn at <strong className="text-text dark:text-[#EBE7DF] font-bold font-mono">₹{burn.toLocaleString("en-IN")}</strong> against <strong className="text-text dark:text-[#EBE7DF] font-bold font-mono">₹{cash.toLocaleString("en-IN")}</strong> in bank reserves yields <strong className="text-emerald-400 dark:text-[#3FA96A] font-bold font-mono">{runwayMonths} months</strong> of liquid runway.
                  </>
                ) : (
                  <>
                    Cash reserves and burn rate uncalibrated. Record bank balances and recurring costs to establish real-time runway forecasting.
                  </>
                )}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.19, ease: [0.22, 1, 0.36, 1] }}
              className="p-3.5 rounded-xl bg-gold/[0.06] border border-gold/25 dark:bg-[#18161D] dark:border-[#2D2722] dark:hover:border-[#41372A] space-y-1"
            >
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-gold dark:text-[#D9B44A]" />
                <span className="text-[11px] font-bold text-gold dark:text-[#D9B44A] uppercase tracking-wider font-mono">
                  Strategic Directive (Immediate)
                </span>
              </div>
              <p className="text-xs text-text dark:text-[#EBE7DF] leading-relaxed pl-5 font-medium">
                {isFresh ? (
                  `Execute Quick Business Input to seed verified operational figures for ${companyName}.`
                ) : (
                  `Maintain margin discipline and monitor cash conversion cycles across ${industryLabel} contracts.`
                )}
              </p>
            </motion.div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-line/60 dark:border-t-[#2D2722] flex items-center justify-between text-xs">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-gold dark:text-[#D9B44A] hover:brightness-110 dark:hover:text-[#F0D98A] font-semibold text-xs btn-tactile cursor-pointer group"
          >
            <span>Ask {activeCeoName} to elaborate</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/gaps"
            className="text-text-muted dark:text-[#97928E] hover:text-text dark:hover:text-[#EBE7DF] text-xs cursor-pointer"
          >
            Review Gap Playbooks →
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

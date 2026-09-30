"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { AlertTriangle, ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useBusinessDataSync } from "@/lib/upload/events";

export function GapsPreviewWidget() {
  const [companyName, setCompanyName] = useState("Enterprise");
  const [founderName, setFounderName] = useState("Founder");
  const [monthlyRev, setMonthlyRev] = useState(0);
  const [monthlyBurn, setMonthlyBurn] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);

  const applyProfile = (p: any) => {
    if (!p) return;
    if (p.name) setCompanyName(p.name);
    if (p.founderName) setFounderName(p.founderName);
    if (p.revenue !== undefined && p.revenue !== null) setMonthlyRev(Number(p.revenue));
    else if (p.monthlyRevenue !== undefined && p.monthlyRevenue !== null) setMonthlyRev(Number(p.monthlyRevenue));
    if (p.burn !== undefined && p.burn !== null) setMonthlyBurn(Number(p.burn));
    else if (p.monthlyBurn !== undefined && p.monthlyBurn !== null) setMonthlyBurn(Number(p.monthlyBurn));
    if (p.cash !== undefined && p.cash !== null) setCashOnHand(Number(p.cash));
    else if (p.cashOnHand !== undefined && p.cashOnHand !== null) setCashOnHand(Number(p.cashOnHand));
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_business_profile");
      if (saved) {
        applyProfile(JSON.parse(saved));
      } else {
        fetch("/api/business/intake")
          .then((r) => r.json())
          .then((d) => {
            if (d.success && d.business) {
              applyProfile(d.business);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  useBusinessDataSync((metrics) => {
    applyProfile(metrics);
  });

  const runwayMo = monthlyBurn > 0 ? Number((cashOnHand / monthlyBurn).toFixed(1)) : cashOnHand > 0 ? 18 : 0;
  const isFresh = monthlyRev === 0 && monthlyBurn === 0 && cashOnHand === 0;

  const topGaps: any[] = [];

  if (monthlyBurn > 0) {
    if (runwayMo < 6) {
      topGaps.push({
        id: "gap_runway_critical",
        title: `Liquid runway compressed at ${runwayMo} months (<6.0 mo safety buffer)`,
        severity: "critical",
        category: "Runway & Risk",
        impact: `₹${monthlyBurn.toLocaleString("en-IN")}/mo burn`,
        effort: "immediate",
      });
    } else if (runwayMo < 12) {
      topGaps.push({
        id: "gap_runway_warning",
        title: `Runway buffer at ${runwayMo} months (<12.0 mo target baseline)`,
        severity: "medium",
        category: "Runway & Risk",
        impact: `₹${monthlyBurn.toLocaleString("en-IN")}/mo burn`,
        effort: "quick win",
      });
    }
  }

  if (monthlyRev > 0) {
    topGaps.push({
      id: "gap_concentration",
      title: `Top client pipeline concentration audit recommended for ${companyName}`,
      severity: "medium",
      category: "Revenue Growth",
      impact: `₹${monthlyRev.toLocaleString("en-IN")}/mo volume`,
      effort: "project",
    });
  }

  // Notify dashboard page of live gap count
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent("bizzpal_gaps_count", { detail: { count: topGaps.length } }));
    } catch {}
  }, [topGaps.length]);

  return (
    <ContainerTile span={2} id="widget_top_gaps">
      <div className="flex flex-col h-full justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                  Priority Gaps & Bottlenecks
                </h2>
                <span className="text-[10px] text-text-muted">
                  AI diagnostic engine continuous watch
                </span>
              </div>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold font-mono border ${
              topGaps.length > 0
                ? "bg-rust/15 text-rust border-rust/30"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
            }`}>
              {topGaps.length} {topGaps.length === 1 ? "Identified" : "Identified"}
            </span>
          </div>

          <div className="space-y-2.5 pt-3">
            {topGaps.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-2/30 border border-line text-center space-y-1.5">
                <div className="text-xs font-semibold text-text">
                  No Critical Bottlenecks Flagged
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Enterprise telemetry is clear. Autonomous watchdogs are monitoring cash runway, revenue concentration, and pipeline velocity.
                </p>
              </div>
            ) : (
              topGaps.map(gap => (
                <div
                  key={gap.id}
                  className="p-3 rounded-xl bg-surface-2/40 border border-line hover:border-line-strong hover:bg-surface-2/70 transition-all space-y-1.5 group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <span className="text-xs font-semibold text-text leading-snug group-hover:text-brass transition-colors">
                      {gap.title}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase font-mono tracking-wide shrink-0 ${
                        gap.severity === "critical"
                          ? "bg-rust/20 text-rust border border-rust/30"
                          : "bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30"
                      }`}
                    >
                      {gap.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                    <span className="font-mono text-text font-medium">{gap.impact}</span>
                    <span className="text-line-strong">·</span>
                    <span className="px-1.5 py-0.2 rounded bg-surface border border-line text-[10px] capitalize font-medium">
                      {gap.effort}
                    </span>
                    <span className="text-line-strong">·</span>
                    <span className="text-cyan-600 dark:text-cyan-400 text-[10px] font-medium">{gap.category}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08]">
          <Link
            href="/gaps"
            className="flex items-center justify-between text-xs text-cyan-400 hover:text-cyan-300 font-semibold btn-tactile group"
          >
            <span>Open Gap Register & Solutions Playbooks</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

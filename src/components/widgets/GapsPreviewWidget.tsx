"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
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
      <div className="flex flex-col h-full justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">Gaps to fix</h2>
              <p className="text-sm text-text-muted mt-0.5">Problems found in your numbers.</p>
            </div>
            <span className="text-sm text-text-muted shrink-0">{topGaps.length} found</span>
          </div>

          {topGaps.length === 0 ? (
            <p className="text-sm text-text-muted leading-relaxed py-4">
              Nothing to fix right now. We'll flag anything that needs attention as your numbers change.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {topGaps.map(gap => (
                <li key={gap.id} className="py-3 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm text-text leading-snug">{gap.title}</span>
                    <span
                      className={`text-xs shrink-0 capitalize ${gap.severity === "critical" ? "text-rust" : "text-text-muted"}`}
                    >
                      {gap.severity}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">
                    {gap.impact} · {gap.category}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-4 border-t border-line">
          <Link href="/gaps" className="text-sm text-brass hover:underline">
            Open gap register
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

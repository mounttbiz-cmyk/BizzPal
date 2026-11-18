"use client";

import { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import Link from "next/link";
import { useBusinessDataSync } from "@/lib/upload/events";

export function GapsPreviewWidget() {
  const [monthlyBurn, setMonthlyBurn] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);

  const applyProfile = (p: any) => {
    if (!p) return;
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

  // Only worked out when both numbers are known. Nothing is assumed.
  const runwayMo = monthlyBurn > 0 && cashOnHand > 0 ? Number((cashOnHand / monthlyBurn).toFixed(1)) : null;

  const topGaps: any[] = [];

  // The same rule as the Gap register: cash runway under 6 months. Checks that need data we do not have are not shown.
  if (runwayMo !== null && runwayMo < 6) {
    topGaps.push({
      id: "gap_runway_critical",
      title: `Cash runway is ${runwayMo} months, under the 6-month minimum`,
      severity: "critical",
      category: "Runway & Risk",
      impact: `\u20B9${monthlyBurn.toLocaleString("en-IN")}/mo burn`,
      effort: "immediate",
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
              Nothing found in the numbers BizzPal has. It can only check what it can see, so add your cash, burn and records for more checks.
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

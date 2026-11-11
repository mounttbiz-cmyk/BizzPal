"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import Link from "next/link";

import { useBusinessDataSync } from "@/lib/upload/events";
import { useCustomAdvisors } from "@/lib/advisors";

interface BriefingWidgetProps {
  companyName?: string;
  ceoName?: string;
}

export function BriefingWidget({
  companyName: propCompanyName = "Your Enterprise",
  ceoName = "CEO",
}: BriefingWidgetProps) {
  const { ceoName: customCeoName } = useCustomAdvisors();
  const [companyName, setCompanyName] = useState(propCompanyName);
  const [founderName, setFounderName] = useState("Founder");
  const [industryLabel, setIndustryLabel] = useState("Technology");
  const [monthlyRev, setMonthlyRev] = useState(0);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);
  const activeCeoName = customCeoName || ceoName || "CEO";

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
      <div className="flex flex-col h-full justify-between gap-6">
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-text">AI briefing</h2>
            <p className="text-sm text-text-muted mt-0.5">
              Written by {activeCeoName} · {isFresh ? "Based on starting figures" : "Based on your latest data"}
            </p>
          </div>

          <div className="divide-y divide-line">
            <div className="pb-4">
              <h3 className="text-sm font-medium text-text">Revenue</h3>
              <p className="text-sm text-text-muted leading-relaxed mt-1">
                {monthlyRev > 0 ? (
                  <>
                    {companyName} earns <span className="text-text font-medium">₹{monthlyRev.toLocaleString("en-IN")}</span> a month in {industryLabel}.
                  </>
                ) : (
                  <>No monthly revenue added yet. Add your current billings to see your growth.</>
                )}
              </p>
            </div>

            <div className="py-4">
              <h3 className="text-sm font-medium text-text">Cash</h3>
              <p className="text-sm text-text-muted leading-relaxed mt-1">
                {cash > 0 || burn > 0 ? (
                  <>
                    You spend <span className="text-text font-medium">₹{burn.toLocaleString("en-IN")}</span> a month and have{" "}
                    <span className="text-text font-medium">₹{cash.toLocaleString("en-IN")}</span> in the bank, which lasts about{" "}
                    <span className="text-text font-medium">{runwayMonths} months</span>.
                  </>
                ) : (
                  <>Add your bank balance and monthly costs to see how long your cash will last.</>
                )}
              </p>
            </div>

            <div className="pt-4">
              <h3 className="text-sm font-medium text-text">Next step</h3>
              <p className="text-sm text-text-muted leading-relaxed mt-1">
                {isFresh
                  ? `Use Quick business input to add ${companyName}'s real numbers.`
                  : `Keep an eye on margins and how quickly customers pay across your ${industryLabel} contracts.`}
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-line flex items-center justify-between text-sm">
          <Link href="/chat" className="text-brass hover:underline">
            Ask {activeCeoName} more
          </Link>
          <Link href="/gaps" className="text-text-muted hover:text-text">
            See gaps
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

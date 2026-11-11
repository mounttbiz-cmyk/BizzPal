"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { useBusinessDataSync } from "@/lib/upload/events";

export function KpiGridWidget() {
  const [industryLabel, setIndustryLabel] = useState("your industry");
  const [monthlyRev, setMonthlyRev] = useState(0);
  const [annualRev, setAnnualRev] = useState(0);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [grossMarginVal, setGrossMarginVal] = useState(0);

  const applyProfile = (p: any) => {
    if (!p) return;
    if (p.industryLabel) setIndustryLabel(p.industryLabel);
    else if (p.industry) setIndustryLabel(p.industry);
    if (p.revenue !== undefined && p.revenue !== null) setMonthlyRev(Number(p.revenue));
    else if (p.monthlyRevenue !== undefined && p.monthlyRevenue !== null) setMonthlyRev(Number(p.monthlyRevenue));
    if (p.annualRevenue !== undefined && p.annualRevenue !== null) setAnnualRev(Number(p.annualRevenue));
    else if (p.revenue) setAnnualRev(Number(p.revenue) * 12);
    if (p.burn !== undefined && p.burn !== null) setBurn(Number(p.burn));
    else if (p.monthlyBurn !== undefined && p.monthlyBurn !== null) setBurn(Number(p.monthlyBurn));
    if (p.cash !== undefined && p.cash !== null) setCash(Number(p.cash));
    else if (p.cashOnHand !== undefined && p.cashOnHand !== null) setCash(Number(p.cashOnHand));
    if (p.teamSize !== undefined && p.teamSize !== null) setTeamSize(Number(p.teamSize));
    if (p.grossMargin !== undefined && p.grossMargin !== null) setGrossMarginVal(Number(p.grossMargin));
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
    } catch {
      // ignore
    }
  }, []);

  useBusinessDataSync(metrics => {
    applyProfile(metrics);
  });

  const runwayMonths = burn > 0 ? (cash / burn).toFixed(1) : cash > 0 ? "18+" : "0.0";
  const effectiveTeam = teamSize || (monthlyRev > 0 ? 1 : 0);
  const revPerHead = effectiveTeam > 0 ? Math.round((annualRev || monthlyRev * 12) / effectiveTeam) : 0;

  const kpis = [
    {
      id: "mrr",
      label: "Monthly revenue",
      value: `₹${monthlyRev.toLocaleString("en-IN")}`,
      note: monthlyRev > 0 ? "From your billings" : "Not added yet",
    },
    {
      id: "runway",
      label: "Cash runway",
      value: `${runwayMonths} mo`,
      note: burn > 0 ? `₹${burn.toLocaleString("en-IN")} spent a month` : "Add your monthly costs",
    },
    {
      id: "rev_head",
      label: "Revenue per person (yearly)",
      value: `₹${revPerHead.toLocaleString("en-IN")}`,
      note: effectiveTeam > 0 ? `${effectiveTeam} team ${effectiveTeam === 1 ? "member" : "members"}` : "Add your team size",
    },
    {
      id: "gross_margin",
      label: "Gross margin",
      value: grossMarginVal > 0 ? `${grossMarginVal}%` : "—",
      note: grossMarginVal > 0 ? `For ${industryLabel}` : "Add your costs of sale",
    },
  ];

  return (
    <ContainerTile span={4} id="widget_kpi_board">
      <div className="space-y-5">
        <div>
          <h2 className="text-base font-semibold text-text">Key numbers</h2>
          <p className="text-sm text-text-muted mt-0.5">Your main figures in Indian rupees (₹).</p>
        </div>

        <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-4 gap-4">
          {kpis.map(kpi => (
            <div key={kpi.id} className="rounded-xl bg-surface-2/60 p-4">
              <p className="text-sm text-text-muted">{kpi.label}</p>
              <div className="text-2xl font-semibold text-text mt-2">
                <AnimatedNumber value={kpi.value} />
              </div>
              <p className="text-xs text-text-muted mt-1">{kpi.note}</p>
            </div>
          ))}
        </div>
      </div>
    </ContainerTile>
  );
}

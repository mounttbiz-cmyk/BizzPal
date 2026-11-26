"use client";

import { useState, useEffect, useRef } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { AnimatedNumber } from "../ui/AnimatedNumber";
import { useBusinessDataSync } from "@/lib/upload/events";

export function KpiGridWidget() {
  const [monthlyRev, setMonthlyRev] = useState(0);
  const [annualRev, setAnnualRev] = useState(0);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  // Where each figure came from (bank statement, Tally, Razorpay, upload or typed in)
  const [sources, setSources] = useState<{ revenue?: string; spending?: string; cash?: string }>({});
  const [fromFigures, setFromFigures] = useState(false);

  const loadFigures = () =>
    fetch("/api/business/figures", { cache: "no-store" })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d?.success) return;
        const f = d.figures;
        setFromFigures(true);
        setMonthlyRev(Number(f.monthlyRevenue.value) || 0);
        setAnnualRev((Number(f.monthlyRevenue.value) || 0) * 12);
        setBurn(Number(f.monthlySpending.value) || 0);
        setCash(Number(f.cash.value) || 0);
        setSources({ revenue: f.monthlyRevenue.label, spending: f.monthlySpending.label, cash: f.cash.label });
      })
      .catch(() => {});

  const applyProfile = (p: any) => {
    if (!p) return;
    if (fromFiguresRef.current) {
      if (p.teamSize !== undefined && p.teamSize !== null) setTeamSize(Number(p.teamSize));
      return;
    }
    if (p.revenue !== undefined && p.revenue !== null) setMonthlyRev(Number(p.revenue));
    else if (p.monthlyRevenue !== undefined && p.monthlyRevenue !== null) setMonthlyRev(Number(p.monthlyRevenue));
    if (p.annualRevenue !== undefined && p.annualRevenue !== null) setAnnualRev(Number(p.annualRevenue));
    else if (p.revenue) setAnnualRev(Number(p.revenue) * 12);
    if (p.burn !== undefined && p.burn !== null) setBurn(Number(p.burn));
    else if (p.monthlyBurn !== undefined && p.monthlyBurn !== null) setBurn(Number(p.monthlyBurn));
    if (p.cash !== undefined && p.cash !== null) setCash(Number(p.cash));
    else if (p.cashOnHand !== undefined && p.cashOnHand !== null) setCash(Number(p.cashOnHand));
    if (p.teamSize !== undefined && p.teamSize !== null) setTeamSize(Number(p.teamSize));
  };

  const fromFiguresRef = useRef(false);
  useEffect(() => {
    fromFiguresRef.current = fromFigures;
  }, [fromFigures]);

  useEffect(() => {
    loadFigures();
    const refresh = () => loadFigures();
    window.addEventListener("bizzpal_business_data_updated", refresh);
    return () => window.removeEventListener("bizzpal_business_data_updated", refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    loadFigures();
  });

  const runwayMonths = burn > 0 && cash > 0 ? (cash / burn).toFixed(1) : null;
  const effectiveTeam = teamSize || 0;
  const revPerHead = effectiveTeam > 0 && monthlyRev > 0 ? Math.round((annualRev || monthlyRev * 12) / effectiveTeam) : 0;
  const money = (n: number) => (n > 0 ? `₹${n.toLocaleString("en-IN")}` : "—");

  const kpis = [
    {
      id: "mrr",
      label: "Monthly revenue",
      value: money(monthlyRev),
      note: monthlyRev > 0 ? sources.revenue || "Added by you" : "Not added yet",
    },
    {
      id: "spending",
      label: "Monthly spending",
      value: money(burn),
      note: burn > 0 ? sources.spending || "Added by you" : "Not added yet",
    },
    {
      id: "runway",
      label: "Cash runway",
      value: runwayMonths ? `${runwayMonths} mo` : "—",
      note: cash > 0 ? `${money(cash)} in the bank${sources.cash ? ` · ${sources.cash.replace(/^Bank balance, /, "")}` : ""}` : "Needs your cash and spending",
    },
    {
      id: "rev_head",
      label: "Revenue per person (yearly)",
      value: money(revPerHead),
      note: effectiveTeam > 0 ? `${effectiveTeam} team ${effectiveTeam === 1 ? "member" : "members"}` : "Add your team size",
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

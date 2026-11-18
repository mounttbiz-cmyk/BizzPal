"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import Link from "next/link";
import { useBusinessDataSync } from "@/lib/upload/events";
import { RealTimeBiSection } from "@/components/bi/RealTimeBiSection";

function formatShortINR(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
  return `₹${val}`;
}

export default function AnalyticsPage() {
  const [view, setView] = useState<"insights" | "financials">("insights");
  const [companyName, setCompanyName] = useState("");
  const [industryName, setIndustryName] = useState("");
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [teamSize, setTeamSize] = useState(0);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);
  const [grossMargin, setGrossMargin] = useState(0);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const applyProfile = (saved: any) => {
    if (!saved) return;
    if (saved.name) setCompanyName(saved.name);
    if (saved.industryLabel) setIndustryName(saved.industryLabel);
    else if (saved.industry) setIndustryName(saved.industry);

    setAnnualRevenue(
      Number(saved.annualRevenue || (saved.revenue ? saved.revenue * 12 : saved.monthlyRevenue ? saved.monthlyRevenue * 12 : 0))
    );
    setBurn(Number(saved.burn || saved.monthlyBurn || saved.monthlyNetBurn || 0));
    setCash(Number(saved.cash || saved.cashOnHand || 0));
    setTeamSize(Number(saved.teamSize || 0));
    setGrossMargin(Number(saved.grossMargin || 0));
  };

  useEffect(() => {
    try {
      const savedProfileStr = localStorage.getItem("bizzpal_business_profile");
      if (savedProfileStr) {
        applyProfile(JSON.parse(savedProfileStr));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) applyProfile(d.business);
          })
          .catch(() => {});
      }
    } catch {
      // ignore bad saved data
    }
  }, []);

  useBusinessDataSync(metrics => {
    applyProfile(metrics);
  });

  const monthlyRev = annualRevenue > 0 ? Math.round(annualRevenue / 12) : 0;
  const runwayMonths = burn > 0 && cash > 0 ? (cash / burn).toFixed(1) : null;
  const revPerHead = teamSize > 0 && annualRevenue > 0 ? Math.round(annualRevenue / teamSize) : 0;

  // Straight-line projection from the real cash and burn: what happens if nothing changes
  const cashProjection = burn > 0 && cash > 0 ? Array.from({ length: 13 }, (_, m) => ({ month: m, cash: Math.max(0, cash - burn * m) })) : [];
  const maxCash = Math.max(1, ...cashProjection.map(d => d.cash));

  const handleExport = () => {
    try {
      const rows = [
        ["BizzPal Analytics Report"],
        ["Company", companyName],
        ["Sector", industryName],
        ["Generated", new Date().toLocaleString()],
        [],
        ["Annual revenue (INR)", annualRevenue],
        ["Monthly revenue (INR)", monthlyRev],
        ["Monthly burn (INR)", burn],
        ["Cash reserves (INR)", cash],
        ["Runway (months)", runwayMonths ?? "not enough data"],
        ["Gross margin (%)", grossMargin || "not entered"],
        ["Team size", teamSize || "not entered"],
        ...(cashProjection.length > 0 ? [[], ["Month from now", "Projected cash (INR), if nothing changes"], ...cashProjection.map(d => [d.month, d.cash])] : []),
      ];
      const csv = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csv));
      link.setAttribute("download", `bizzpal_${companyName.toLowerCase().replace(/\s+/g, "_")}_analytics.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setExportNotice("Report downloaded.");
    } catch {
      setExportNotice("Export failed. Check browser permissions.");
    }
    setTimeout(() => setExportNotice(null), 3000);
  };

  const notEntered = "Not entered";
  const kpis = [
    { label: "Annual revenue", value: annualRevenue > 0 ? `\u20B9${annualRevenue.toLocaleString("en-IN")}` : notEntered, note: monthlyRev > 0 ? `\u20B9${monthlyRev.toLocaleString("en-IN")} / month` : "Add it in Settings or connect payments" },
    { label: "Cash runway", value: runwayMonths ? `${runwayMonths} months` : notEntered, note: burn > 0 ? `Burn \u20B9${burn.toLocaleString("en-IN")} / month` : "Needs your cash and monthly burn" },
    { label: "Gross margin", value: grossMargin > 0 ? `${grossMargin}%` : notEntered, note: grossMargin > 0 ? "As you entered it" : "Not known to BizzPal yet" },
    { label: "Revenue per head", value: revPerHead > 0 ? `\u20B9${revPerHead.toLocaleString("en-IN")}` : notEntered, note: teamSize > 0 ? `${teamSize} team ${teamSize === 1 ? "member" : "members"}` : "Add your team size in Settings" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Analytics</h1>
          <p className="text-sm text-text-muted mt-1">Your numbers, and what they mean for {companyName || "your business"}.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="px-3.5 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 inline-flex items-center gap-2 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </header>

      {exportNotice && <p className="text-sm text-text-muted">{exportNotice}</p>}

      <nav className="flex items-center gap-1 border-b border-line" aria-label="Analytics view">
        {[
          { id: "insights" as const, label: "Insights" },
          { id: "financials" as const, label: "Financials" },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            onClick={() => setView(tab.id)}
            className={`px-4 pb-2.5 -mb-px text-sm border-b-2 cursor-pointer ${
              view === tab.id
                ? "border-brass text-text font-semibold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {view === "insights" && <RealTimeBiSection companyName={companyName} />}

      {view === "financials" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="p-4 rounded-xl border border-line bg-surface">
                <p className="text-xs text-text-muted">{k.label}</p>
                <p className="text-xl font-bold text-text mt-1">{k.value}</p>
                <p className="text-xs text-text-muted mt-1">{k.note}</p>
              </div>
            ))}
          </div>

          <section className="p-5 rounded-xl border border-line bg-surface space-y-4">
            <div>
              <h2 className="text-base font-semibold text-text">Cash if nothing changes</h2>
              <p className="text-xs text-text-muted mt-0.5">A straight line from your cash in bank and your monthly burn. It is arithmetic on your own numbers, not a forecast of sales.</p>
            </div>

            {cashProjection.length === 0 ? (
              <p className="text-sm text-text-muted py-6">Add your cash in bank and monthly burn in Settings to see how long your cash lasts.</p>
            ) : (
              <>
                <div className="flex gap-2">
                  <div className="flex flex-col justify-between text-[10px] text-text-muted h-44 text-right w-11 pb-2 shrink-0">
                    <span>{formatShortINR(maxCash)}</span>
                    <span>{formatShortINR(Math.round(maxCash * 0.5))}</span>
                    <span>{"\u20B9"}0</span>
                  </div>
                  <div className="flex-1 min-w-0 overflow-x-auto">
                    <div className="min-w-[420px]">
                      <div className="h-44 flex items-end gap-2 border-b border-line">
                        {cashProjection.map(d => (
                          <div key={d.month} className="flex-1 h-full flex items-end justify-center">
                            <div
                              className="w-full max-w-[22px] rounded-t bg-brass"
                              style={{ height: `${Math.max(d.cash > 0 ? 3 : 0, (d.cash / maxCash) * 100)}%` }}
                              title={`Month ${d.month}: \u20B9${d.cash.toLocaleString("en-IN")}`}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-2">
                        {cashProjection.map(d => (
                          <span key={d.month} className="flex-1 text-center text-[11px] text-text-muted">{d.month === 0 ? "Now" : d.month}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-muted">Months from now. Your cash reaches zero in about {runwayMonths} months at the current burn.</p>
              </>
            )}
          </section>

          <p className="text-sm text-text-muted">
            See what to fix first in the{" "}
            <Link href="/gaps" className="text-brass hover:underline">
              Gap Register
            </Link>{" "}
            or test a change in the{" "}
            <Link href="/simulator" className="text-brass hover:underline">
              Decision Simulator
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}

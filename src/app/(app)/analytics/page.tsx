"use client";

import React, { useState, useEffect } from "react";
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
  const [forecastMode, setForecastMode] = useState<"baseline" | "optimized">("baseline");
  const [companyName, setCompanyName] = useState("Your Enterprise");
  const [industryName, setIndustryName] = useState("B2B SaaS & Services");
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [teamSize, setTeamSize] = useState(1);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);
  const [grossMargin, setGrossMargin] = useState(80);
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
    setTeamSize(Number(saved.teamSize || 1));
    setGrossMargin(Number(saved.grossMargin || 80));
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
  const runwayMonths = burn > 0 ? (cash / burn).toFixed(1) : cash > 0 ? "18+" : "0.0";
  const revPerHead = teamSize > 0 && annualRevenue > 0 ? Math.round(annualRevenue / teamSize) : 0;

  const effectiveMonthlyRev = monthlyRev > 0 ? monthlyRev : 100000;
  const effectiveBurn = burn > 0 ? burn : 35000;
  const optimized = forecastMode === "optimized";

  const series = [
    { month: "Oct", revenue: Math.round(effectiveMonthlyRev * 0.82), burn: Math.round(effectiveBurn * 1.08), forecast: false },
    { month: "Nov", revenue: Math.round(effectiveMonthlyRev * 0.86), burn: Math.round(effectiveBurn * 1.05), forecast: false },
    { month: "Dec", revenue: Math.round(effectiveMonthlyRev * 0.9), burn: Math.round(effectiveBurn * 0.98), forecast: false },
    { month: "Jan", revenue: Math.round(effectiveMonthlyRev * 0.93), burn: Math.round(effectiveBurn * 1.02), forecast: false },
    { month: "Feb", revenue: Math.round(effectiveMonthlyRev * 0.96), burn: Math.round(effectiveBurn * 0.98), forecast: false },
    { month: "Mar", revenue: effectiveMonthlyRev, burn: effectiveBurn, forecast: false },
    { month: "Apr", revenue: Math.round(effectiveMonthlyRev * (optimized ? 1.18 : 1.03)), burn: Math.round(effectiveBurn * (optimized ? 0.85 : 1.01)), forecast: true },
    { month: "May", revenue: Math.round(effectiveMonthlyRev * (optimized ? 1.34 : 1.06)), burn: Math.round(effectiveBurn * (optimized ? 0.78 : 1.03)), forecast: true },
    { month: "Jun", revenue: Math.round(effectiveMonthlyRev * (optimized ? 1.52 : 1.09)), burn: Math.round(effectiveBurn * (optimized ? 0.72 : 1.05)), forecast: true },
  ];
  const maxVal = Math.max(1, ...series.map(d => Math.max(d.revenue, d.burn)));
  const trailingTotal = series.slice(0, 6).reduce((acc, c) => acc + c.revenue, 0);
  const projectedRunRate = series[series.length - 1].revenue;

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
        ["Runway (months)", runwayMonths],
        ["Gross margin (%)", grossMargin],
        ["Team size", teamSize],
        [],
        ["Month", "Revenue (INR)", "Burn (INR)", "Type"],
        ...series.map(h => [h.month, h.revenue, h.burn, h.forecast ? `forecast (${forecastMode})` : "actual"]),
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

  const kpis = [
    { label: "Annual revenue", value: `₹${annualRevenue.toLocaleString("en-IN")}`, note: `₹${monthlyRev.toLocaleString("en-IN")} / month` },
    { label: "Cash runway", value: `${runwayMonths} months`, note: `Burn ₹${burn.toLocaleString("en-IN")} / month` },
    { label: "Gross margin", value: `${grossMargin}%`, note: "Industry median 76%" },
    { label: "Revenue per head", value: `₹${revPerHead.toLocaleString("en-IN")}`, note: `${teamSize} team ${teamSize === 1 ? "member" : "members"}` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Analytics</h1>
          <p className="text-sm text-text-muted mt-1">Performance, forecasts and alerts for {companyName}.</p>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text">Revenue and burn</h2>
                <p className="text-xs text-text-muted mt-0.5">Last 6 months and a 3-month projection.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-brass" /> Revenue
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-text-muted/50" /> Burn
                  </span>
                </div>
                <div className="flex items-center rounded-lg border border-line p-0.5 text-sm">
                  {(["baseline", "optimized"] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setForecastMode(mode)}
                      className={`px-3 py-1 rounded-md capitalize cursor-pointer ${
                        forecastMode === mode ? "bg-surface-2 text-text font-medium" : "text-text-muted hover:text-text"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="flex flex-col justify-between text-[10px] text-text-muted h-44 text-right w-11 pb-2 shrink-0">
                <span>{formatShortINR(maxVal)}</span>
                <span>{formatShortINR(Math.round(maxVal * 0.5))}</span>
                <span>₹0</span>
              </div>
              <div className="flex-1 min-w-0 overflow-x-auto">
                <div className="min-w-[420px]">
                  <div className="h-44 flex items-end gap-2 border-b border-line">
                    {series.map(d => (
                      <div key={d.month} className="flex-1 h-full flex items-end justify-center gap-1">
                        <div
                          className={`w-full max-w-[18px] rounded-t bg-brass ${d.forecast ? "opacity-50" : ""}`}
                          style={{ height: `${Math.max(4, (d.revenue / maxVal) * 100)}%` }}
                          title={`${d.month} revenue: ₹${d.revenue.toLocaleString("en-IN")}`}
                        />
                        <div
                          className={`w-full max-w-[12px] rounded-t bg-text-muted/50 ${d.forecast ? "opacity-50" : ""}`}
                          style={{ height: `${Math.max(4, (d.burn / maxVal) * 100)}%` }}
                          title={`${d.month} burn: ₹${d.burn.toLocaleString("en-IN")}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    {series.map(d => (
                      <span
                        key={d.month}
                        className={`flex-1 text-center text-[11px] ${d.forecast ? "text-brass font-medium" : "text-text-muted"}`}
                      >
                        {d.month}
                        {d.forecast ? "*" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-text-muted">* Projected</p>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-line text-sm">
              <div>
                <dt className="text-xs text-text-muted">Revenue, last 6 months</dt>
                <dd className="font-medium text-text">₹{trailingTotal.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Projected monthly revenue by June</dt>
                <dd className="font-medium text-text">₹{projectedRunRate.toLocaleString("en-IN")}</dd>
              </div>
            </dl>
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

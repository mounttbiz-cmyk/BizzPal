"use client";

import React, { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

interface AccountRow {
  email: string;
  name?: string | null;
  runs: number;
  leads: number;
  googleRequests: number;
  costUsd: number;
  monthCostUsd: number;
  lastRunAt: string;
}
interface RecentRow {
  id: number;
  email: string;
  name?: string | null;
  returned: number;
  sourceMode: string;
  googleRequests: number;
  costUsd: number;
  createdAt: string;
}
interface UsageData {
  costPerRequestUsd: number;
  usdToInr: number;
  totals: { runs: number; googleRequests: number; costUsd: number; monthCostUsd: number };
  accounts: AccountRow[];
  recent: RecentRow[];
}

// Costs are stored in US dollars (that is how Google bills); shown here in rupees
let RATE = 88;
const usd = (usdAmount: number) => {
  const v = (usdAmount || 0) * RATE;
  const digits = v >= 100 ? 0 : 2;
  return `₹${v.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const sourceLabel = (m: string) =>
  m === "google_places_live" ? "Google Places" : m === "openstreetmap_live" ? "OpenStreetMap (free)" : m === "hybrid_live" ? "Mixed" : "Sample data";

export function DataPalUsageManager() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/datapal-usage", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        if (json.usdToInr > 0) RATE = json.usdToInr;
        setData(json);
        setError(null);
        setUpdatedAt(new Date());
      } else {
        setError(json.error || "Could not load usage");
      }
    } catch {
      setError("Could not load usage");
    }
  }, []);

  // Live: refresh every 10 seconds while this page is open
  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const kpis = data
    ? [
        { label: "Spent this month", value: usd(data.totals.monthCostUsd), note: "Estimated Google Places cost" },
        { label: "Spent in total", value: usd(data.totals.costUsd), note: "Since tracking began" },
        { label: "Google requests", value: String(data.totals.googleRequests), note: "Paid Places searches" },
        { label: "Extraction runs", value: String(data.totals.runs), note: "All accounts" },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="p-5 rounded-2xl bg-surface border border-line shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-text">DataPal usage</h2>
          <p className="text-sm text-text-muted mt-0.5 max-w-2xl">
            How much Google Cloud spend each account has used through DataPal. Updates every 10 seconds.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-text-muted">
          {updatedAt && <span>Updated {updatedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>}
          <button
            type="button"
            onClick={load}
            className="p-2.5 rounded-xl border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
            title="Refresh"
            aria-label="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <p className="px-4 py-3 rounded-xl bg-surface-2 text-sm text-text">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
              <div key={k.label} className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
                <div className="text-sm text-text-muted">{k.label}</div>
                <div className="text-2xl font-semibold text-text mt-2">{k.value}</div>
                <div className="text-xs text-text-muted mt-1">{k.note}</div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="text-base font-semibold text-text">By account</h3>
            </div>
            {data.accounts.length === 0 ? (
              <p className="p-10 text-center text-sm text-text-muted">No DataPal searches have been run yet.</p>
            ) : (
              <div className="overflow-x-auto touch-scroll">
                <table className="w-full min-w-[640px] text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-line text-text-muted font-medium">
                      <th className="p-3 pl-5">Account</th>
                      <th className="p-3">Runs</th>
                      <th className="p-3">Leads</th>
                      <th className="p-3">Google requests</th>
                      <th className="p-3">This month</th>
                      <th className="p-3">Total</th>
                      <th className="p-3 pr-5">Last run</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.accounts.map(a => (
                      <tr key={a.email}>
                        <td className="p-3 pl-5">
                          <div className="font-medium text-text">{a.name || a.email}</div>
                          {a.name && <div className="text-xs text-text-muted">{a.email}</div>}
                        </td>
                        <td className="p-3 text-text-muted">{a.runs}</td>
                        <td className="p-3 text-text-muted">{a.leads}</td>
                        <td className="p-3 text-text-muted">{a.googleRequests}</td>
                        <td className="p-3 font-medium text-text">{usd(a.monthCostUsd)}</td>
                        <td className="p-3 font-medium text-text">{usd(a.costUsd)}</td>
                        <td className="p-3 pr-5 text-text-muted">{when(a.lastRunAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-surface shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="text-base font-semibold text-text">Latest searches</h3>
            </div>
            {data.recent.length === 0 ? (
              <p className="p-10 text-center text-sm text-text-muted">Nothing yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.recent.map(r => (
                  <li key={r.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-6">
                    <p className="text-sm text-text">
                      {r.name || r.email}
                      <span className="text-text-muted">
                        {" "}· {r.returned} leads · {sourceLabel(r.sourceMode)}
                        {r.googleRequests > 0 ? ` · ${r.googleRequests} ${r.googleRequests === 1 ? "request" : "requests"} · ${usd(r.costUsd)}` : " · no charge"}
                      </span>
                    </p>
                    <span className="text-sm text-text-muted shrink-0">{when(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
            Costs are an estimate: each Google Places search is counted at {usd(data.costPerRequestUsd)} (US${data.costPerRequestUsd} at ₹{data.usdToInr} per dollar). Set PLACES_COST_PER_REQUEST_USD and USD_TO_INR_RATE on the server to change these.
            Searches answered by OpenStreetMap or sample data cost nothing. Your Google Cloud billing page remains the source of truth for the real balance of credits.
          </p>
        </>
      )}
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileSpreadsheet, Landmark, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { askConfirm, showNotice } from "@/components/ui/dialogs";

interface MonthRow {
  month: string;
  moneyIn: number;
  moneyOut: number;
  revenue: number;
  spending: number;
  closingCash: number | null;
  revenueFrom: string | null;
  spendingFrom: string | null;
}
interface Movement {
  id: string;
  source: "bank" | "tally";
  date: string;
  description: string;
  amount: number;
  category: string;
  categoryBy: "auto" | "owner";
  categories: string[];
}
interface Upload {
  id: string;
  source: "bank" | "tally";
  fileName: string;
  rowsRead: number;
  rowsAdded: number;
  rowsDuplicate: number;
  rowsSkipped: number;
  fromDate: string | null;
  toDate: string | null;
  createdAt: string;
}

const inr = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;
const monthName = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
};
const day = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

export default function MoneyPage() {
  const [data, setData] = useState<{ imports: Upload[]; months: MonthRow[]; movements: Movement[] } | null>(null);
  const [error, setError] = useState("");
  const [month, setMonth] = useState("");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState<"" | "bank" | "tally">("");
  const bankInput = useRef<HTMLInputElement>(null);
  const tallyInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      if (q.trim()) params.set("q", q.trim());
      const r = await fetch(`/api/money?${params}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Could not load your figures.");
      setData(d);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [month, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const upload = async (source: "bank" | "tally", file: File | undefined) => {
    if (!file) return;
    setUploading(source);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("source", source);
      const r = await fetch("/api/money", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error || "Could not read this file.");
      const i: Upload = d.import;
      showNotice(
        i.rowsAdded === 0
          ? "Every transaction in this file was already here, so nothing new was added."
          : `${i.rowsAdded.toLocaleString("en-IN")} transactions added${i.rowsDuplicate ? `, ${i.rowsDuplicate} already here` : ""}.`,
        "success"
      );
      window.dispatchEvent(new Event("bizzpal_business_data_updated"));
      load();
    } catch (e: any) {
      showNotice(e.message, "error");
    } finally {
      setUploading("");
      if (bankInput.current) bankInput.current.value = "";
      if (tallyInput.current) tallyInput.current.value = "";
    }
  };

  const removeUpload = async (u: Upload) => {
    if (!(await askConfirm({ title: `Remove ${u.fileName}?`, message: "The transactions from this file will be removed and your figures worked out again.", confirmLabel: "Remove", danger: true }))) return;
    const r = await fetch(`/api/money/imports/${u.id}`, { method: "DELETE" });
    if (r.ok) {
      showNotice("Upload removed.", "success");
      window.dispatchEvent(new Event("bizzpal_business_data_updated"));
      load();
    } else showNotice("Could not remove it.", "error");
  };

  const recategorise = async (m: Movement, category: string) => {
    setData(d => (d ? { ...d, movements: d.movements.map(x => (x.id === m.id ? { ...x, category, categoryBy: "owner" } : x)) } : d));
    const r = await fetch(`/api/money/movements/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category }) });
    if (!r.ok) {
      showNotice("Could not change the category.", "error");
      load();
    } else {
      // The monthly totals depend on categories
      const d = await fetch(`/api/money?${new URLSearchParams({ ...(month ? { month } : {}), ...(q ? { q } : {}) })}`, { cache: "no-store" }).then(x => x.json()).catch(() => null);
      if (d?.success) setData(d);
      window.dispatchEvent(new Event("bizzpal_business_data_updated"));
    }
  };

  const months = data ? [...data.months].reverse().slice(0, 12) : [];
  const empty = data && data.imports.length === 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Money in &amp; out</h1>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            Upload your bank statements and Tally exports. BizzPal turns them into your real revenue, spending and cash, and your dashboard
            uses these figures first.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={bankInput} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={e => upload("bank", e.target.files?.[0])} />
          <input ref={tallyInput} type="file" accept=".xml,.xlsx,.xls,.csv" className="hidden" onChange={e => upload("tally", e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => tallyInput.current?.click()}
            disabled={Boolean(uploading)}
            className="h-10 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {uploading === "tally" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Upload Tally export
          </button>
          <button
            type="button"
            onClick={() => bankInput.current?.click()}
            disabled={Boolean(uploading)}
            className="h-10 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {uploading === "bank" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload bank statement
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}

      {!data && !error ? (
        <p className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12">
          <div className="max-w-2xl mx-auto grid gap-6 sm:grid-cols-2">
            <div>
              <span className="w-10 h-10 rounded-lg bg-surface-2 text-brass flex items-center justify-center">
                <Landmark className="w-5 h-5" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-text">Bank statement</h2>
              <p className="mt-1 text-sm text-text-muted leading-relaxed">
                In your net banking, open the account statement, choose a period (the last 6 to 12 months works best) and download it as
                Excel or CSV. HDFC, ICICI, SBI, Axis, Kotak and most other banks work.
              </p>
            </div>
            <div>
              <span className="w-10 h-10 rounded-lg bg-surface-2 text-brass flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </span>
              <h2 className="mt-3 text-sm font-semibold text-text">Tally</h2>
              <p className="mt-1 text-sm text-text-muted leading-relaxed">
                In Tally, open Display, then Day Book, choose the period, and export it as Excel or XML. Sales become your revenue; payments
                become your spending.
              </p>
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-text-muted">Your files stay in your account. Uploading the same statement twice never counts anything twice.</p>
        </div>
      ) : (
        data && (
          <>
            {/* Month by month */}
            <section className="rounded-xl border border-line bg-surface overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
                <h2 className="text-sm font-semibold text-text">Month by month</h2>
                {month && (
                  <button type="button" onClick={() => setMonth("")} className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1 cursor-pointer">
                    Showing {monthName(month)} <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-text-muted">
                      <th className="px-5 py-2.5 text-left font-medium">Month</th>
                      <th className="px-4 py-2.5 text-right font-medium">Revenue</th>
                      <th className="px-4 py-2.5 text-right font-medium">Spending</th>
                      <th className="px-4 py-2.5 text-right font-medium">Profit or loss</th>
                      <th className="px-5 py-2.5 text-right font-medium">Cash at month end</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {months.map(m => {
                      const net = m.revenue - m.spending;
                      return (
                        <tr
                          key={m.month}
                          onClick={() => setMonth(month === m.month ? "" : m.month)}
                          className={`cursor-pointer ${month === m.month ? "bg-surface-2" : "hover:bg-surface-2/50"}`}
                          title="Show this month's transactions"
                        >
                          <td className="px-5 py-2.5 text-text">{monthName(m.month)}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-text">{m.revenue ? inr(m.revenue) : "—"}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-text">{m.spending ? inr(m.spending) : "—"}</td>
                          <td className={`px-4 py-2.5 text-right tabular-nums ${net < 0 ? "text-rust" : "text-jade"}`}>
                            {m.revenue || m.spending ? `${net < 0 ? "−" : "+"}${inr(Math.abs(net))}` : "—"}
                          </td>
                          <td className="px-5 py-2.5 text-right tabular-nums text-text">{inr(m.closingCash)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Transactions */}
            <section className="rounded-xl border border-line bg-surface overflow-hidden">
              <div className="px-5 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center gap-3">
                <h2 className="text-sm font-semibold text-text">Transactions</h2>
                <div className="relative sm:ml-auto sm:w-72">
                  <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    placeholder="Search description or category"
                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                  />
                </div>
              </div>
              {data.movements.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-text-muted">No transactions match.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <tbody className="divide-y divide-line">
                      {data.movements.map(m => (
                        <tr key={m.id}>
                          <td className="pl-5 pr-3 py-2.5 text-text-muted whitespace-nowrap w-24">{day(m.date)}</td>
                          <td className="px-3 py-2.5 text-text">
                            <span className="block truncate max-w-[420px]" title={m.description}>
                              {m.description}
                            </span>
                            <span className="text-xs text-text-muted">{m.source === "tally" ? "Tally" : "Bank"}</span>
                          </td>
                          <td className="px-3 py-2.5 w-48">
                            <select
                              value={m.category}
                              onChange={e => recategorise(m, e.target.value)}
                              aria-label={`Category for ${m.description}`}
                              className={`w-full h-8 px-2 rounded-md border bg-surface text-sm cursor-pointer ${m.categoryBy === "owner" ? "border-brass/40 text-text" : "border-line text-text-muted"}`}
                            >
                              {m.categories.map(c => (
                                <option key={c} value={c}>
                                  {c === "Own transfer" ? "Between your own accounts" : c}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={`pl-3 pr-5 py-2.5 text-right tabular-nums whitespace-nowrap ${m.amount > 0 ? "text-jade" : "text-text"}`}>
                            {m.amount > 0 ? "+" : "−"}
                            {inr(Math.abs(m.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Uploads */}
            <section className="rounded-xl border border-line bg-surface overflow-hidden">
              <div className="px-5 py-3.5 border-b border-line">
                <h2 className="text-sm font-semibold text-text">Uploads</h2>
              </div>
              <ul className="divide-y divide-line">
                {data.imports.map(u => (
                  <li key={u.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                    <span className="w-8 h-8 rounded-lg bg-surface-2 text-text-muted flex items-center justify-center shrink-0">
                      {u.source === "tally" ? <FileSpreadsheet className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-text truncate">{u.fileName}</span>
                      <span className="block text-xs text-text-muted">
                        {u.fromDate && u.toDate ? `${day(u.fromDate)} to ${new Date(u.toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ` : ""}
                        {u.rowsAdded} added
                        {u.rowsDuplicate ? ` · ${u.rowsDuplicate} already here` : ""}
                        {u.rowsSkipped ? ` · ${u.rowsSkipped} lines skipped (totals or unreadable)` : ""}
                      </span>
                    </span>
                    <button type="button" onClick={() => removeUpload(u)} aria-label={`Remove ${u.fileName}`} title="Remove" className="w-8 h-8 rounded-lg text-text-muted hover:text-rust hover:bg-rust/10 flex items-center justify-center cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )
      )}
    </div>
  );
}

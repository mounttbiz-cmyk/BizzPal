"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface CreditsData {
  wallet: { balance: number; reserved: number; available: number };
  ledger: Array<{ id: string; type: string; credits: number; balanceAfter: number; note: string; createdAt: string; taskId: string | null }>;
  today: { spentInr: number; limitInr: number; plan: string };
  usage30d: Array<{ feature: string; calls: number; inputTokens: number; outputTokens: number; costInr: number }>;
}

const FEATURE: Record<string, string> = { chat: "AI advisors", xray: "Business X-Ray", brief: "Business brief", agent: "AI agents" };
const TYPE: Record<string, string> = { purchase: "Bought", grant: "Added by BizzPal", consume: "Used by a task", refund: "Refund", adjustment: "Adjustment", expiry: "Expired" };
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: n < 10 ? 2 : 0, maximumFractionDigits: 2 })}`;
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

export default function CreditsPage() {
  const [d, setD] = useState<CreditsData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/credits", { cache: "no-store" })
      .then(r => r.json())
      .then(j => (j.success ? setD(j) : setError(j.error || "Could not load credits.")))
      .catch(() => setError("Could not load credits."));
  }, []);

  if (!d) {
    return error ? (
      <p className="text-sm text-rust">{error}</p>
    ) : (
      <p className="text-sm text-text-muted flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </p>
    );
  }

  const pct = d.today.limitInr > 0 ? Math.min(100, Math.round((d.today.spentInr / d.today.limitInr) * 100)) : 0;
  const total30 = d.usage30d.reduce((s, u) => s + u.costInr, 0);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h2 className="text-lg font-semibold text-text">Credits & usage</h2>
        <p className="text-sm text-text-muted mt-1 max-w-2xl">
          Credits pay for the work AI agents do (1 credit = ₹1). A task holds its credits before it starts and gives back whatever it didn&apos;t use. Your
          plan covers the AI advisors, X-Ray and business brief up to a daily limit.
        </p>
      </div>

      <section className="grid gap-px rounded-xl border border-line bg-line overflow-hidden sm:grid-cols-3">
        {[
          { label: "Available credits", value: d.wallet.available.toLocaleString("en-IN"), note: "Ready for agent work" },
          { label: "Held by running tasks", value: d.wallet.reserved.toLocaleString("en-IN"), note: "Returned if not used" },
          { label: "Balance", value: d.wallet.balance.toLocaleString("en-IN"), note: "Available plus held" },
        ].map(s => (
          <div key={s.label} className="bg-surface px-5 py-4">
            <p className="text-xs text-text-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-text tabular-nums">{s.value}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{s.note}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-surface p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold text-text">AI used today</h3>
          <span className="text-sm text-text tabular-nums">
            {inr(d.today.spentInr)} <span className="text-text-muted">of {inr(d.today.limitInr)}</span>
          </span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-rust" : "bg-brass"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-text-muted">Your plan&apos;s daily limit. AI pauses when it is reached and starts again at midnight, India time.</p>
      </section>

      <section className="rounded-xl border border-line bg-surface">
        <div className="px-5 py-4 border-b border-line flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-text">Last 30 days</h3>
          <span className="text-sm text-text tabular-nums">{inr(total30)}</span>
        </div>
        {d.usage30d.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">No AI use yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-text-muted text-left">
                <th className="px-5 py-2 font-normal">Feature</th>
                <th className="px-5 py-2 font-normal text-right">Requests</th>
                <th className="px-5 py-2 font-normal text-right hidden sm:table-cell">Tokens</th>
                <th className="px-5 py-2 font-normal text-right">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {d.usage30d.map(u => (
                <tr key={u.feature}>
                  <td className="px-5 py-2.5 text-text">{FEATURE[u.feature] || u.feature}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{u.calls.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums hidden sm:table-cell">{(u.inputTokens + u.outputTokens).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{inr(u.costInr)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-xl border border-line bg-surface">
        <div className="px-5 py-4 border-b border-line">
          <h3 className="text-sm font-semibold text-text">Credit history</h3>
          <p className="text-xs text-text-muted mt-0.5">Every change to your credits, newest first. Entries are never edited.</p>
        </div>
        {d.ledger.length === 0 ? (
          <p className="px-5 py-6 text-sm text-text-muted">No credits yet. Credits for agents will be available to buy here soon; BizzPal can add credits for a pilot.</p>
        ) : (
          <ul className="divide-y divide-line">
            {d.ledger.map(e => (
              <li key={e.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                <span className="min-w-0">
                  <span className="block text-text">{TYPE[e.type] || e.type}</span>
                  <span className="block text-xs text-text-muted truncate">
                    {when(e.createdAt)}
                    {e.note ? ` · ${e.note}` : ""}
                  </span>
                </span>
                <span className="text-right shrink-0">
                  <span className={`block tabular-nums font-medium ${e.credits < 0 ? "text-text" : "text-emerald-700 dark:text-emerald-400"}`}>
                    {e.credits > 0 ? "+" : ""}
                    {e.credits.toLocaleString("en-IN")}
                  </span>
                  <span className="block text-xs text-text-muted tabular-nums">Balance {e.balanceAfter.toLocaleString("en-IN")}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

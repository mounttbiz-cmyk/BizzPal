"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { loadWorkspaceState, saveWorkspaceState } from "@/lib/workspace/stateClient";

/**
 * Decision simulator. Every number here is either from the business's own profile or typed in by the person.
 * Nothing is pre-filled with example figures: the results are plain arithmetic on those numbers.
 */

interface Option {
  id: string;
  name: string;
  oneTime: string;
  monthlyCost: string;
  monthlyRevenue: string;
  delay: string;
}

interface Outcome {
  cashByMonth: number[];
  endCash: number;
  runwayMonths: number | null; // null = cash lasts beyond 5 years
  totalCost: number;
  totalRevenue: number;
  paybackMonth: number | null;
  returnPct: number | null;
}

const DRAFT_KEY = "bizzpal_simulator_draft";
const MAX_OPTIONS = 3;
const LINE_COLORS = ["#8a6414", "#2563eb", "#059669", "#9333ea"];

const toNum = (v: string) => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const inr = (n: number) => `${n < 0 ? "-" : ""}₹${Math.abs(Math.round(n)).toLocaleString("en-IN")}`;
const newOption = (n: number): Option => ({ id: `opt_${Date.now()}_${n}`, name: "", oneTime: "", monthlyCost: "", monthlyRevenue: "", delay: "" });

/** Month by month: cash after the one-time cost, then each month's burn, the new cost, and the new revenue once it starts. */
function simulate(cash: number, burn: number, o: { oneTime: number; monthlyCost: number; monthlyRevenue: number; delay: number }, horizon: number): Outcome {
  const cashByMonth = [cash - o.oneTime];
  let c = cash - o.oneTime;
  let cumCost = o.oneTime;
  let cumRev = 0;
  let payback: number | null = null;
  let runsOut: number | null = c <= 0 ? 0 : null;
  let endCash = c;
  let costAtHorizon = cumCost;
  let revAtHorizon = 0;
  for (let m = 1; m <= 60; m++) {
    const rev = m > o.delay ? o.monthlyRevenue : 0;
    c = c - burn - o.monthlyCost + rev;
    cumCost += o.monthlyCost;
    cumRev += rev;
    if (payback === null && cumCost > 0 && cumRev >= cumCost) payback = m;
    if (runsOut === null && c <= 0) runsOut = m;
    if (m <= horizon) {
      cashByMonth.push(c);
      endCash = c;
      costAtHorizon = cumCost;
      revAtHorizon = cumRev;
    }
  }
  return {
    cashByMonth,
    endCash,
    runwayMonths: runsOut,
    totalCost: costAtHorizon,
    totalRevenue: revAtHorizon,
    paybackMonth: payback !== null && payback <= horizon ? payback : null,
    returnPct: costAtHorizon > 0 ? ((revAtHorizon - costAtHorizon) / costAtHorizon) * 100 : null,
  };
}

export default function SimulatorPage() {
  const [loaded, setLoaded] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [owner, setOwner] = useState("");
  const [cash, setCash] = useState("");
  const [burn, setBurn] = useState("");
  const [fromProfile, setFromProfile] = useState(false);
  const [horizon, setHorizon] = useState(12);
  const [decision, setDecision] = useState("");
  const [options, setOptions] = useState<Option[]>([newOption(1)]);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [taskMsg, setTaskMsg] = useState("");

  // The business's own numbers, then saved scenario draft from SQLite
  useEffect(() => {
    let active = true;
    (async () => {
      let profile: any = null;
      try {
        const d = await fetch("/api/business/intake", { cache: "no-store" }).then(r => r.json());
        if (d?.success && d.business) {
          profile = { ...d.business, cash: d.business.cashOnHand, burn: d.business.monthlyBurn, founderName: d.business.founderName };
          try { localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business)); } catch {}
        }
      } catch {}
      if (!profile) {
        try { profile = JSON.parse(localStorage.getItem("bizzpal_business_profile") || "null"); } catch {}
      }
      if (!active) return;
      const c = Number(profile?.cash ?? profile?.cashOnHand ?? 0);
      const b = Number(profile?.burn ?? profile?.monthlyBurn ?? 0);
      setCompanyName(profile?.name || "");
      setOwner(profile?.founderName || "");
      if (c > 0) setCash(String(c));
      if (b > 0) setBurn(String(b));
      setFromProfile(c > 0 || b > 0);
      const draft = await loadWorkspaceState<{ decision?: string; options?: Option[]; horizon?: number }>("simulator", DRAFT_KEY);
      if (active && draft) {
        if (draft.decision) setDecision(draft.decision);
        if (Array.isArray(draft.options) && draft.options.length > 0) setOptions(draft.options.slice(0, MAX_OPTIONS));
        if (draft.horizon) setHorizon(draft.horizon);
      }
      if (active) setLoaded(true);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      saveWorkspaceState("simulator", { decision, options, horizon }, DRAFT_KEY).catch(() => {});
    }, 350);
    return () => clearTimeout(t);
  }, [loaded, decision, options, horizon]);

  const cashN = toNum(cash);
  const burnN = toNum(burn);
  const ready = cashN > 0 && burnN >= 0 && cash.trim() !== "";

  const baseline = useMemo(() => simulate(cashN, burnN, { oneTime: 0, monthlyCost: 0, monthlyRevenue: 0, delay: 0 }, horizon), [cashN, burnN, horizon]);
  const results = useMemo(
    () => options.map(o => simulate(cashN, burnN, { oneTime: toNum(o.oneTime), monthlyCost: toNum(o.monthlyCost), monthlyRevenue: toNum(o.monthlyRevenue), delay: Math.max(0, Math.round(toNum(o.delay))) }, horizon)),
    [options, cashN, burnN, horizon]
  );

  const filled = options.map((o, i) => ({ o, r: results[i] })).filter(x => x.o.name.trim() && (toNum(x.o.oneTime) || toNum(x.o.monthlyCost) || toNum(x.o.monthlyRevenue)));
  const best = {
    runway: filled.length > 1 ? [...filled].sort((a, b) => (b.r.runwayMonths ?? 999) - (a.r.runwayMonths ?? 999))[0]?.o.id : null,
    ret: filled.length > 1 ? [...filled].filter(x => x.r.returnPct !== null).sort((a, b) => (b.r.returnPct as number) - (a.r.returnPct as number))[0]?.o.id : null,
  };

  const update = (id: string, patch: Partial<Option>) => setOptions(prev => prev.map(o => (o.id === id ? { ...o, ...patch } : o)));
  const runwayText = (r: Outcome) => (r.runwayMonths === null ? "More than 5 years" : r.runwayMonths === 0 ? "Already out of cash" : `${r.runwayMonths} months`);

  const askAi = async () => {
    setAiBusy(true);
    setAiError("");
    setAiText("");
    const lines = [
      `I am deciding: ${decision || "a business decision"}.`,
      `My cash is ${inr(cashN)} and my net monthly burn is ${inr(burnN)}. Without any change my cash lasts ${runwayText(baseline)}.`,
      ...filled.map(({ o, r }) => `${o.name}: one-time cost ${inr(toNum(o.oneTime))}, extra monthly cost ${inr(toNum(o.monthlyCost))}, extra monthly revenue ${inr(toNum(o.monthlyRevenue))} starting after month ${toNum(o.delay) || 0}. Result: cash lasts ${runwayText(r)}; after ${horizon} months cash is ${inr(r.endCash)}; return on the extra spend is ${r.returnPct === null ? "not defined" : r.returnPct.toFixed(0) + "%"}.`),
      "Using only these figures, say which option looks better and why, what could go wrong, and what I should check before deciding. Be brief and do not invent any numbers.",
    ];
    try {
      const res = await fetch("/api/ai/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: lines.join(" "), agentId: "cfo" }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success && d.text) setAiText(d.text);
      else setAiError(d.error || "The AI couldn't answer right now. Please try again.");
    } catch {
      setAiError("Couldn't reach the server. Please try again.");
    }
    setAiBusy(false);
  };

  const saveTask = async (o: Option) => {
    setTaskMsg("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `Decide: ${decision || "decision"}. Option: ${o.name}`, owner: owner || "Owner", priority: "medium", status: "todo" }),
      });
      setTaskMsg(res.ok ? "Added to your tasks." : "Couldn't add the task. Please try again.");
    } catch {
      setTaskMsg("Couldn't add the task. Please try again.");
    }
    setTimeout(() => setTaskMsg(""), 5000);
  };

  // chart
  const chartMax = Math.max(1, ...[baseline, ...results].flatMap(r => r.cashByMonth));
  const chartMin = Math.min(0, ...[baseline, ...results].flatMap(r => r.cashByMonth));
  const W = 640, H = 220, PAD = 28;
  const x = (m: number) => PAD + (m / horizon) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - chartMin) / (chartMax - chartMin || 1)) * (H - PAD * 2);
  const line = (r: Outcome) => r.cashByMonth.map((v, m) => `${m === 0 ? "M" : "L"}${x(m).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const field = "w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass";
  const label = "block text-xs font-medium text-text-muted mb-1";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-text">Decision simulator</h1>
        <p className="text-sm text-text-muted mt-1">
          See what a decision does to your cash before you make it. You enter what each option costs and earns; BizzPal works out the runway, the payback and the return. No figures are assumed.
        </p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text">1. Your starting numbers</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {fromProfile ? `Taken from ${companyName || "your business"}'s profile. Change them to test a what-if.` : "BizzPal doesn't have your cash and burn yet. Enter them here, or add them in Settings."}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={label}>Cash in bank (&#8377;)</label>
            <input type="text" inputMode="numeric" value={cash} onChange={e => setCash(e.target.value)} placeholder="Amount in rupees" className={field} />
          </div>
          <div>
            <label className={label}>Net monthly burn (&#8377;)</label>
            <input type="text" inputMode="numeric" value={burn} onChange={e => setBurn(e.target.value)} placeholder="What you lose each month" className={field} />
          </div>
          <div>
            <label className={label}>Look ahead</label>
            <select value={horizon} onChange={e => setHorizon(Number(e.target.value))} className={field}>
              {[6, 12, 18, 24].map(m => <option key={m} value={m}>{m} months</option>)}
            </select>
          </div>
        </div>
        {ready && <p className="text-sm text-text-muted">If nothing changes, your cash lasts <span className="text-text font-medium">{runwayText(baseline)}</span>.</p>}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-text">2. The decision and its options</h2>
          <p className="text-sm text-text-muted mt-0.5">For example hiring someone, raising a price, or running a campaign. Add up to {MAX_OPTIONS} options to compare.</p>
        </div>
        <div>
          <label className={label}>What are you deciding?</label>
          <input type="text" value={decision} onChange={e => setDecision(e.target.value)} maxLength={120} placeholder="Describe the decision" className={field} />
        </div>

        <div className="space-y-4">
          {options.map((o, i) => (
            <div key={o.id} className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: LINE_COLORS[i + 1] }} />
                <input type="text" value={o.name} onChange={e => update(o.id, { name: e.target.value })} maxLength={80} placeholder={`Option ${i + 1} name`} className={field} />
                {options.length > 1 && (
                  <button type="button" onClick={() => setOptions(prev => prev.filter(x => x.id !== o.id))} aria-label="Remove option" className="p-2 text-text-muted hover:text-rust cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div><label className={label}>One-time cost (&#8377;)</label><input type="text" inputMode="numeric" value={o.oneTime} onChange={e => update(o.id, { oneTime: e.target.value })} placeholder="0" className={field} /></div>
                <div><label className={label}>Extra cost per month (&#8377;)</label><input type="text" inputMode="numeric" value={o.monthlyCost} onChange={e => update(o.id, { monthlyCost: e.target.value })} placeholder="0" className={field} /></div>
                <div><label className={label}>Extra revenue per month (&#8377;)</label><input type="text" inputMode="numeric" value={o.monthlyRevenue} onChange={e => update(o.id, { monthlyRevenue: e.target.value })} placeholder="0" className={field} /></div>
                <div><label className={label}>Revenue starts after (months)</label><input type="text" inputMode="numeric" value={o.delay} onChange={e => update(o.id, { delay: e.target.value })} placeholder="0" className={field} /></div>
              </div>
            </div>
          ))}
        </div>
        {options.length < MAX_OPTIONS && (
          <button type="button" onClick={() => setOptions(prev => [...prev, newOption(prev.length + 1)])} className="text-sm text-brass hover:underline cursor-pointer inline-flex items-center gap-1.5"><Plus className="w-4 h-4" />Add another option</button>
        )}
      </section>

      {!ready ? (
        <p className="p-8 text-center text-sm text-text-muted rounded-2xl border border-line">Enter your cash in bank and monthly burn above to see the results.</p>
      ) : filled.length === 0 ? (
        <p className="p-8 text-center text-sm text-text-muted rounded-2xl border border-line">Give an option a name and at least one cost or revenue figure to see what it does to your cash.</p>
      ) : (
        <section className="space-y-6">
          <h2 className="text-base font-semibold text-text">3. What each option does</h2>

          <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-medium text-text-muted">
                  <th className="py-3 pl-5 pr-3">&nbsp;</th>
                  <th className="py-3 px-3">Do nothing</th>
                  {filled.map(({ o }, i) => <th key={o.id} className="py-3 px-3"><span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: LINE_COLORS[options.findIndex(x => x.id === o.id) + 1] }} />{o.name}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {([
                  ["Cash lasts", (r: Outcome) => runwayText(r), (id: string) => (best.runway === id ? "Longest runway" : "")],
                  [`Cash after ${horizon} months`, (r: Outcome) => inr(r.endCash), () => ""],
                  [`Extra spend over ${horizon} months`, (r: Outcome) => inr(r.totalCost), () => ""],
                  [`Extra revenue over ${horizon} months`, (r: Outcome) => inr(r.totalRevenue), () => ""],
                  ["Pays for itself", (r: Outcome) => (r.paybackMonth !== null ? `Month ${r.paybackMonth}` : "Not within the period"), () => ""],
                  ["Return on the extra spend", (r: Outcome) => (r.returnPct === null ? "n/a" : `${r.returnPct.toFixed(0)}%`), (id: string) => (best.ret === id ? "Highest return" : "")],
                ] as Array<[string, (r: Outcome) => string, (id: string) => string]>).map(([name, fmt, tag]) => (
                  <tr key={name}>
                    <td className="py-3.5 pl-5 pr-3 text-text-muted">{name}</td>
                    <td className="py-3.5 px-3 text-text">{name === "Cash lasts" || name.startsWith("Cash after") ? fmt(baseline) : "n/a"}</td>
                    {filled.map(({ o, r }) => (
                      <td key={o.id} className="py-3.5 px-3 text-text">
                        {fmt(r)}
                        {tag(o.id) && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-jade/10 text-jade border border-jade/30">{tag(o.id)}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5">
            <p className="text-sm font-medium text-text mb-3">Cash over the next {horizon} months</p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Cash over time for each option">
              {chartMin < 0 && <line x1={PAD} x2={W - PAD} y1={y(0)} y2={y(0)} stroke="#c0392b" strokeDasharray="4 4" strokeWidth="1" />}
              <path d={line(baseline)} fill="none" stroke={LINE_COLORS[0]} strokeWidth="2" strokeDasharray="6 4" />
              {filled.map(({ o, r }) => <path key={o.id} d={line(r)} fill="none" stroke={LINE_COLORS[options.findIndex(x => x.id === o.id) + 1]} strokeWidth="2.5" />)}
            </svg>
            <div className="flex flex-wrap gap-4 text-xs text-text-muted mt-2">
              <span className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2 border-dashed" style={{ borderColor: LINE_COLORS[0] }} />Do nothing</span>
              {filled.map(({ o }) => <span key={o.id} className="inline-flex items-center gap-1.5"><span className="w-4 border-t-2" style={{ borderColor: LINE_COLORS[options.findIndex(x => x.id === o.id) + 1] }} />{o.name}</span>)}
              {chartMin < 0 && <span className="text-rust">Dashed red line: cash reaches zero</span>}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text">Get a second opinion</p>
                <p className="text-sm text-text-muted">The AI reads only the figures above. Its view is a suggestion, not a fact.</p>
              </div>
              <button type="button" onClick={askAi} disabled={aiBusy} className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2">
                {aiBusy && <Loader2 className="w-4 h-4 animate-spin" />}Ask the CFO advisor
              </button>
            </div>
            {aiError && <p className="text-sm text-rust">{aiError}</p>}
            {aiText && <div className="rounded-xl bg-surface-2/50 border border-line p-4 text-sm text-text whitespace-pre-wrap leading-relaxed"><p className="text-xs font-medium text-brass mb-2">AI suggestion</p>{aiText}</div>}
          </div>

          <div className="rounded-2xl border border-line bg-surface p-5 space-y-3">
            <p className="text-sm font-medium text-text">Decided? Add it to your tasks</p>
            <div className="flex flex-wrap gap-2">
              {filled.map(({ o }) => <button key={o.id} type="button" onClick={() => saveTask(o)} className="px-3.5 py-2 rounded-xl border border-line bg-surface text-sm text-text hover:bg-surface-2 cursor-pointer">Go with &ldquo;{o.name}&rdquo;</button>)}
            </div>
            {taskMsg && <p className="text-sm text-text-muted">{taskMsg} <Link href="/tasks" className="text-brass hover:underline">Open tasks</Link></p>}
          </div>
        </section>
      )}
    </div>
  );
}

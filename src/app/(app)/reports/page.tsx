"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Trash2, X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { buildBriefing, BriefingContent } from "@/lib/briefing/build";

interface LeadershipDecision {
  id: string;
  title: string;
  category: "finance" | "sales" | "operations" | "talent";
  impact: string;
  recommendation: string;
  status: "pending" | "approved" | "delegated" | "declined";
  actionTakenAt?: string;
  delegatedTo?: string;
  /** Suggested from your numbers (not added by you) */
  auto?: boolean;
}

const DECISIONS_KEY = "bizzpal_briefing_decisions_v2";
const HISTORY_KEY = "bizzpal_briefing_history";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

export default function ReportsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<{ open: number | null; done: number | null }>({ open: null, done: null });
  const [decisions, setDecisions] = useState<LeadershipDecision[]>([]);
  const [history, setHistory] = useState<BriefingContent[]>([]);
  const [selectedId, setSelectedId] = useState("live");
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [isAddDecisionOpen, setIsAddDecisionOpen] = useState(false);
  const [newDecTitle, setNewDecTitle] = useState("");
  const [newDecCategory, setNewDecCategory] = useState<LeadershipDecision["category"]>("finance");
  const [newDecImpact, setNewDecImpact] = useState("");
  const [newDecRecommendation, setNewDecRecommendation] = useState("");

  const notify = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  const loadTasks = async () => {
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks({
          open: data.tasks.filter((t: any) => t.status !== "done").length,
          done: data.tasks.filter((t: any) => t.status === "done").length,
        });
      }
    } catch {}
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_business_profile");
      if (saved) {
        setProfile(JSON.parse(saved));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) {
              setProfile(d.business);
              localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business));
            }
          })
          .catch(() => {});
      }
      const savedDecisions = localStorage.getItem(DECISIONS_KEY);
      if (savedDecisions) {
        const parsed = JSON.parse(savedDecisions);
        if (Array.isArray(parsed)) setDecisions(parsed);
      }
      const savedHistory = localStorage.getItem(HISTORY_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {}
    loadTasks();
  }, []);

  // The live briefing always reflects your latest numbers
  const live = useMemo(
    () => buildBriefing({ profile, openTasks: tasks.open, doneTasks: tasks.done }),
    [profile, tasks.open, tasks.done]
  );

  // Keep the suggested decisions in line with your numbers
  useEffect(() => {
    if (!profile) return;
    setDecisions(prev => {
      const wanted = new Map(live.suggestedDecisions.map(s => [s.id, s]));
      // drop suggestions that no longer apply and were never acted on
      let next = prev.filter(d => !(d.auto && d.status === "pending" && !wanted.has(d.id)));
      for (const s of live.suggestedDecisions) {
        if (!next.some(d => d.id === s.id)) {
          next = [{ ...s, status: "pending", auto: true }, ...next];
        }
      }
      const changed = JSON.stringify(next) !== JSON.stringify(prev);
      if (changed) {
        try {
          localStorage.setItem(DECISIONS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      }
      return prev;
    });
  }, [live, profile]);

  const saveDecisions = (next: LeadershipDecision[]) => {
    setDecisions(next);
    try {
      localStorage.setItem(DECISIONS_KEY, JSON.stringify(next));
    } catch {}
  };

  const isLive = selectedId === "live";
  const active: BriefingContent = isLive ? live : history.find(h => h.id === selectedId) || live;
  const pendingCount = decisions.filter(d => d.status === "pending").length;
  const companyName = profile?.name || "your business";
  const founderName = profile?.founderName || profile?.founder_name || "the founder";
  const industryName = profile?.industryLabel || profile?.industry_label || profile?.industry || "";

  const handleDecisionAction = (id: string, action: LeadershipDecision["status"], delegatedTo?: string) => {
    const target = decisions.find(d => d.id === id);
    if (action === "approved" && target) {
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Decision] ${target.title}`,
          owner: target.category === "finance" ? "CFO" : "Founder",
          gap: "Executive Briefing",
          priority: "high",
          category: target.category.toUpperCase(),
          status: "todo",
        }),
      }).catch(() => {});
    }
    saveDecisions(
      decisions.map(d =>
        d.id === id
          ? {
              ...d,
              status: action,
              actionTakenAt: action === "pending" ? undefined : new Date().toISOString(),
              delegatedTo: delegatedTo || (action === "delegated" ? "CEO" : undefined),
            }
          : d
      )
    );
    notify(
      action === "approved"
        ? "Approved. A task was added to your task list."
        : action === "delegated"
        ? `Delegated to ${delegatedTo || "CEO"}.`
        : action === "declined"
        ? "Declined."
        : "Moved back to waiting."
    );
  };

  const handleSaveCustomDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecTitle.trim()) return;
    saveDecisions([
      {
        id: `dec-${Date.now()}`,
        title: newDecTitle.trim(),
        category: newDecCategory,
        impact: newDecImpact.trim() || "Not estimated",
        recommendation: newDecRecommendation.trim() || "Added by you.",
        status: "pending",
      },
      ...decisions,
    ]);
    setIsAddDecisionOpen(false);
    setNewDecTitle("");
    setNewDecImpact("");
    setNewDecRecommendation("");
    notify("Decision added.");
  };

  const handleDeleteDecision = (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    saveDecisions(decisions.filter(d => d.id !== id));
    notify("Decision removed.");
  };

  // Saves today's numbers as a briefing you can look back at
  const handleSaveBriefing = async () => {
    setIsSaving(true);
    await loadTasks();
    const snapshot = buildBriefing({ profile, openTasks: tasks.open, doneTasks: tasks.done });
    const next = [snapshot, ...history].slice(0, 30);
    setHistory(next);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
    setSelectedId(snapshot.id);
    setIsSaving(false);
    notify("Briefing saved. You can open it again from the list.");
  };

  const handleCopy = () => {
    const lines = [
      `Briefing for ${companyName} (${dateLabel(active.generatedAt)})`,
      active.hasData
        ? `Health: ${active.healthScore}/100 (${active.healthLabel}) | Runway: ${active.runway} months | Cash: ${inr(active.cash)}`
        : "No business numbers added yet.",
      ...active.risks.map(r => `Risk (${r.severity.toLowerCase()}): ${r.title}`),
      isLive ? `Decisions waiting: ${pendingCount}` : "",
    ].filter(Boolean);
    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const editions = [
    {
      id: "live",
      title: "Latest briefing",
      cadence: "Updates with your numbers",
      note: pendingCount > 0 ? `${pendingCount} ${pendingCount === 1 ? "decision" : "decisions"} waiting` : "Nothing waiting",
    },
    ...history.map(h => ({
      id: h.id,
      title: `Saved ${dateLabel(h.generatedAt)}`,
      cadence: timeLabel(h.generatedAt),
      note: h.hasData ? `Health ${h.healthScore}` : "No data",
    })),
  ];

  const metrics = [
    { label: "Yearly revenue", value: inr(active.annualRevenue), note: `${inr(active.monthlyRevenue)} a month` },
    { label: "Cash in the bank", value: inr(active.cash), note: "From your numbers" },
    {
      label: "Cash runway",
      value: active.runway === "—" ? "—" : `${active.runway} months`,
      note: active.burn > 0 ? `Spending ${inr(active.burn)} a month` : "Add monthly costs",
    },
    {
      label: "Revenue per person",
      value: active.teamSize > 0 ? inr(active.revenuePerHead) : "—",
      note: active.teamSize > 0 ? `${active.teamSize} team ${active.teamSize === 1 ? "member" : "members"}` : "Add team size",
    },
  ];

  const inputClass =
    "w-full px-3 py-2 rounded-xl bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Executive briefing</h1>
          <p className="text-sm text-text-muted mt-1">
            Health, risks and decisions for {companyName}, built from your own numbers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
          >
            {copied ? "Copied" : "Copy summary"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
          >
            Print / PDF
          </button>
          <button
            type="button"
            onClick={handleSaveBriefing}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? "Saving…" : "Save today's briefing"}
          </button>
        </div>
      </div>

      {notice && <p className="px-4 py-3 rounded-xl bg-surface-2 text-sm text-text">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 lg:sticky lg:top-6 rounded-2xl border border-line bg-surface shadow-sm p-2">
          <h2 className="text-sm font-medium text-text px-3 pt-3 pb-2">Briefings</h2>
          <ul className="space-y-0.5 max-h-[28rem] overflow-y-auto">
            {editions.map(item => {
              const selected = selectedId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl cursor-pointer ${
                      selected ? "bg-surface-2" : "hover:bg-surface-2/60"
                    }`}
                  >
                    <p className={`text-sm ${selected ? "font-medium text-text" : "text-text"}`}>{item.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {item.cadence} · {item.note}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
          {history.length === 0 && (
            <p className="text-xs text-text-muted px-3 pb-3 pt-1 leading-relaxed">
              Press &ldquo;Save today&apos;s briefing&rdquo; to keep a copy and compare later.
            </p>
          )}
        </aside>

        <article className="lg:col-span-9 p-6 sm:p-8 rounded-2xl border border-line bg-surface shadow-sm space-y-10">
          <header className="space-y-1.5 pb-6 border-b border-line">
            <p className="text-xs text-text-muted">
              {isLive ? "Live · based on your latest numbers" : `Saved on ${dateLabel(active.generatedAt)} at ${timeLabel(active.generatedAt)}`}
            </p>
            <h2 className="text-2xl font-semibold text-text">
              Briefing for {dateLabel(isLive ? new Date().toISOString() : active.generatedAt)}
            </h2>
            <p className="text-sm text-text-muted">
              {industryName ? `${industryName} · ` : ""}Prepared for {founderName}
            </p>
          </header>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-text">Financial health</h3>
              <p className="text-sm text-text-muted">
                {active.hasData ? (
                  <>
                    Score <span className="text-text font-medium">{active.healthScore}/100</span> · {active.healthLabel}
                  </>
                ) : (
                  active.healthLabel
                )}
              </p>
            </div>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {metrics.map(m => (
                <div key={m.label} className="p-4 rounded-xl bg-surface-2/60">
                  <dt className="text-xs text-text-muted">{m.label}</dt>
                  <dd className="text-lg font-medium text-text mt-1.5">{m.value}</dd>
                  <p className="text-xs text-text-muted mt-0.5">{m.note}</p>
                </div>
              ))}
            </dl>
          </section>

          <section className="space-y-3">
            <h3 className="text-base font-semibold text-text">What the numbers say</h3>
            {active.signals.length === 0 ? (
              <p className="text-sm text-text-muted">Nothing to report yet. Add your numbers with Quick business input.</p>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {active.signals.map((signal, idx) => (
                  <li key={idx} className="p-4 rounded-xl border border-line">
                    <p className="text-sm font-medium text-text">{signal.title}</p>
                    <p className="text-sm text-text-muted leading-relaxed mt-0.5">{signal.desc}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-text">Risks</h3>
              {active.risks.length === 0 ? (
                <p className="text-sm text-text-muted">No risks found in your numbers.</p>
              ) : (
                <ul className="space-y-3">
                  {active.risks.map((risk, idx) => (
                    <li key={idx} className="p-4 rounded-xl border border-line">
                      <p className="text-sm font-medium text-text">
                        {risk.title}{" "}
                        <span className={`text-xs font-normal ${risk.severity === "High" ? "text-rust" : "text-text-muted"}`}>
                          · {risk.severity.toLowerCase()}
                        </span>
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed mt-0.5">{risk.desc}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-semibold text-text">Opportunities</h3>
              {active.opportunities.length === 0 ? (
                <p className="text-sm text-text-muted">Nothing clear yet. More numbers help us spot opportunities.</p>
              ) : (
                <ul className="space-y-3">
                  {active.opportunities.map((opp, idx) => (
                    <li key={idx} className="p-4 rounded-xl border border-line">
                      <p className="text-sm font-medium text-text">{opp.title}</p>
                      <p className="text-sm text-text-muted leading-relaxed mt-0.5">{opp.desc}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {isLive ? (
            <section className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-semibold text-text">Decisions</h3>
                  <p className="text-sm text-text-muted mt-0.5">
                    {pendingCount === 0 ? "Nothing waiting on you." : `${pendingCount} waiting for your decision.`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDecisionOpen(true)}
                  className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
                >
                  Add decision
                </button>
              </div>

              {decisions.length === 0 ? (
                <p className="text-sm text-text-muted">No decisions yet.</p>
              ) : (
                <ul className="space-y-3">
                  {decisions.map(dec => {
                    const isPending = dec.status === "pending";
                    return (
                      <li
                        key={dec.id}
                        className={`p-5 rounded-xl border border-line flex flex-col lg:flex-row lg:items-start justify-between gap-4 ${
                          dec.status === "declined" ? "opacity-60" : ""
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <p className="text-sm font-medium text-text">{dec.title}</p>
                          <p className="text-xs text-text-muted">
                            <span className="capitalize">{dec.category}</span> · {dec.auto ? "Suggested from your numbers" : "Added by you"}
                          </p>
                          <p className="text-sm text-text-muted leading-relaxed">{dec.recommendation}</p>
                          <p className="text-sm text-text pt-1">Why it matters: {dec.impact}</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isPending ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleDecisionAction(dec.id, "approved")}
                                className="px-4 py-1.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecisionAction(dec.id, "delegated", "CEO")}
                                className="px-4 py-1.5 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
                              >
                                Delegate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDecisionAction(dec.id, "declined")}
                                className="px-3 py-1.5 rounded-xl text-sm text-text-muted hover:text-text cursor-pointer"
                              >
                                Decline
                              </button>
                            </>
                          ) : (
                            <p className="text-sm text-text-muted">
                              {dec.status === "approved" && "Approved"}
                              {dec.status === "delegated" && `Delegated to ${dec.delegatedTo}`}
                              {dec.status === "declined" && "Declined"}
                              {dec.actionTakenAt && ` on ${dateLabel(dec.actionTakenAt)}`}
                              {" · "}
                              <button
                                type="button"
                                onClick={() => handleDecisionAction(dec.id, "pending")}
                                className="underline hover:text-text cursor-pointer"
                              >
                                Undo
                              </button>
                            </p>
                          )}
                          {!dec.auto && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDecision(dec.id, dec.title)}
                              title="Delete"
                              aria-label="Delete decision"
                              className="p-1 rounded text-text-muted hover:text-rust cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ) : (
            <p className="text-sm text-text-muted">Decisions are shown on the latest briefing only.</p>
          )}
        </article>
      </div>

      {isAddDecisionOpen && (
        <PortalModal isOpen={isAddDecisionOpen} onClose={() => setIsAddDecisionOpen(false)}>
          <div
            className="w-[32rem] max-w-[calc(100vw-2rem)] rounded-2xl bg-surface border border-line shadow-lg p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">Add decision</h3>
              <button
                type="button"
                onClick={() => setIsAddDecisionOpen(false)}
                aria-label="Close"
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomDecision} className="space-y-4 text-sm">
              <div>
                <label className="text-sm text-text block mb-1.5">Decision</label>
                <input
                  type="text"
                  required
                  value={newDecTitle}
                  onChange={e => setNewDecTitle(e.target.value)}
                  placeholder="e.g. Approve Q4 sales hiring"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm text-text block mb-1.5">Area</label>
                <select
                  value={newDecCategory}
                  onChange={e => setNewDecCategory(e.target.value as LeadershipDecision["category"])}
                  className={inputClass}
                >
                  <option value="finance">Finance</option>
                  <option value="sales">Sales</option>
                  <option value="operations">Operations</option>
                  <option value="talent">Talent</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-text block mb-1.5">Why it matters</label>
                <input
                  type="text"
                  value={newDecImpact}
                  onChange={e => setNewDecImpact(e.target.value)}
                  placeholder="e.g. More leads reaching a salesperson"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="text-sm text-text block mb-1.5">Notes</label>
                <textarea
                  rows={2}
                  value={newDecRecommendation}
                  onChange={e => setNewDecRecommendation(e.target.value)}
                  placeholder="Any details to remember"
                  className={inputClass}
                />
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDecisionOpen(false)}
                  className="px-4 py-2 rounded-lg text-text-muted hover:text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brass text-white font-medium hover:brightness-110 cursor-pointer"
                >
                  Add decision
                </button>
              </div>
            </form>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

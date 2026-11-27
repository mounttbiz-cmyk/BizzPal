"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, CircleDashed, FileSearch, Loader2, Pencil, ScanSearch, X } from "lucide-react";
import { INDUSTRY_NAMES, agentById, type IndustryId } from "@/lib/xray/packs";

// ------------------------------------------------------------------ types (as the API returns them)

interface Fact {
  value: string | null;
  sources: string[];
  basis: "stated" | "inferred";
}
interface Opportunity {
  type: "revenue" | "efficiency" | "risk";
  title: string;
  finding: string;
  whyItMatters: string;
  evidence: Array<{ page: string; quote: string }>;
  factors: { impact: number; confidence: number; feasibility: number; urgency: number; effort: number };
  score: number;
  howToCheck: string;
}
interface SnapshotPage {
  id: string;
  url: string;
  title: string;
  kind: string;
  fetchedAt: string;
  chars: number;
}
interface XRay {
  id: string;
  url: string;
  status: "reading" | "analysing" | "done" | "failed";
  progress: { read: number; total: number } | null;
  error: string | null;
  schemaVersion: string;
  promptVersion: string;
  snapshot: { finalUrl: string; crawledAt: string; durationMs: number; pages: SnapshotPage[]; skipped: Array<{ url: string; reason: string }>; notRead: number } | null;
  result: {
    partial?: boolean;
    modelPolicyVersion?: string;
    profile: Record<string, Fact>;
    industry: { id: IndustryId; reason: string; sources: string[] };
    opportunities: Opportunity[];
    recommendedAgent: { id: string; reason: string; forOpportunity: number } | null;
    limitations: string[];
  } | null;
  createdAt: string;
  finishedAt: string | null;
  durationMs: number | null;
}
interface HistoryItem {
  id: string;
  url: string;
  status: XRay["status"];
  createdAt: string;
  durationMs: number | null;
}

const PROFILE_ROWS: Array<{ key: string; label: string; brief?: { key: string; summary?: boolean } }> = [
  { key: "what_they_do", label: "What they do", brief: { key: "summary", summary: true } },
  { key: "products_services", label: "Products and services", brief: { key: "offering" } },
  { key: "target_customers", label: "Who they sell to", brief: { key: "customers" } },
  { key: "geography", label: "Where they operate", brief: { key: "locations" } },
  { key: "business_model", label: "How they make money", brief: { key: "pricing" } },
  { key: "conversion_paths", label: "How customers reach them", brief: { key: "channels" } },
];

const TYPE_STYLE: Record<Opportunity["type"], { label: string; cls: string }> = {
  revenue: { label: "Revenue", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  efficiency: { label: "Efficiency", cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  risk: { label: "Risk", cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
};

const PAGE_KIND: Record<string, string> = {
  home: "Home",
  about: "About",
  services: "Services",
  pricing: "Pricing",
  contact: "Contact",
  projects: "Projects",
  industry: "Offerings",
  team: "Team",
};

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

// ------------------------------------------------------------------ page

export default function BusinessXRayPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [canRun, setCanRun] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [url, setUrl] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [xray, setXray] = useState<XRay | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  };

  const loadOverview = useCallback(async () => {
    setLoadError("");
    try {
      const res = await fetch("/api/business/xray", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.error || "Could not load the X-Ray.");
      setCanRun(Boolean(d.canRun));
      setBusinessName(d.businessName || "");
      setHistory(d.history || []);
      setXray(d.latest || null);
      setUrl(u => u || d.latest?.url || d.website || "");
      return d.latest as XRay | null;
    } catch (e: any) {
      setLoadError(e.message || "Could not load the X-Ray.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const poll = useCallback(
    (id: string) => {
      stopPolling();
      const tick = async () => {
        try {
          const res = await fetch(`/api/business/xray/${encodeURIComponent(id)}`, { cache: "no-store" });
          const d = await res.json();
          if (res.ok && d.success) {
            setXray(d.xray);
            if (d.xray.status === "done" || d.xray.status === "failed") {
              loadOverview();
              return;
            }
          }
        } catch {}
        pollRef.current = setTimeout(tick, 2000);
      };
      pollRef.current = setTimeout(tick, 1200);
    },
    [loadOverview]
  );

  useEffect(() => {
    loadOverview().then(latest => {
      if (latest && (latest.status === "reading" || latest.status === "analysing")) poll(latest.id);
    });
    return stopPolling;
  }, [loadOverview, poll]);

  const run = async () => {
    setStartError("");
    setStarting(true);
    try {
      const res = await fetch("/api/business/xray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "Could not start the X-Ray.");
      setXray({
        id: d.id,
        url,
        status: "reading",
        progress: { read: 0, total: 1 },
        error: null,
        schemaVersion: "",
        promptVersion: "",
        snapshot: null,
        result: null,
        createdAt: new Date().toISOString(),
        finishedAt: null,
        durationMs: null,
      });
      poll(d.id);
    } catch (e: any) {
      setStartError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const openFromHistory = async (id: string) => {
    stopPolling();
    const res = await fetch(`/api/business/xray/${encodeURIComponent(id)}`, { cache: "no-store" });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.success) {
      setXray(d.xray);
      if (d.xray.status === "reading" || d.xray.status === "analysing") poll(id);
    }
  };

  const running = xray && (xray.status === "reading" || xray.status === "analysing");

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-sm text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading your Business X-Ray…
      </div>
    );
  }
  if (loadError) {
    return (
      <p className="py-24 text-center text-sm text-text-muted">
        {loadError}{" "}
        <button type="button" onClick={() => loadOverview()} className="text-brass hover:underline cursor-pointer">
          Try again
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-text">Business X-Ray</h1>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            We read {businessName ? `${businessName}'s` : "your"} website and show what the business does, the three problems most worth checking, and
            one AI agent that can help. Every finding shows the page it came from.
          </p>
        </div>
        {history.length > 1 && (
          <select
            value={xray?.id || ""}
            onChange={e => openFromHistory(e.target.value)}
            aria-label="Earlier X-Rays"
            className="h-9 px-3 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass lg:w-72"
          >
            {history.map(h => (
              <option key={h.id} value={h.id}>
                {when(h.createdAt)} · {host(h.url)}
                {h.status === "failed" ? " (failed)" : ""}
              </option>
            ))}
          </select>
        )}
      </header>

      {canRun && (
        <form
          onSubmit={e => {
            e.preventDefault();
            if (!running && !starting) run();
          }}
          className="rounded-xl border border-line bg-surface p-4 sm:p-5 flex flex-col sm:flex-row gap-3 sm:items-center"
        >
          <label htmlFor="xray-url" className="sr-only">
            Company website
          </label>
          <input
            id="xray-url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="yourcompany.com"
            inputMode="url"
            disabled={Boolean(running) || starting}
            className="flex-1 min-w-0 h-10 px-3.5 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-brass disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={Boolean(running) || starting || !url.trim()}
            className="h-10 px-5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-default"
          >
            {running || starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
            {running ? "Running…" : xray?.status === "done" ? "Run again" : "Run X-Ray"}
          </button>
          {startError && <p className="text-sm text-rust sm:hidden">{startError}</p>}
        </form>
      )}
      {startError && <p className="hidden sm:block text-sm text-rust -mt-3">{startError}</p>}
      {canRun && (
        <p className="text-xs text-text-muted -mt-3">
          We read only public pages of this website that its robots.txt allows. Nothing is changed on your site, and nothing is shared.
        </p>
      )}

      {!xray && <EmptyState canRun={canRun} />}
      {xray && running && <Progress xray={xray} />}
      {xray?.status === "failed" && (
        <div className="rounded-xl border border-rust/30 bg-rust/5 px-5 py-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-rust shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-text">This X-Ray could not finish</p>
            <p className="text-text-muted mt-0.5">{xray.error || "Please try again."}</p>
          </div>
        </div>
      )}
      {xray?.status === "done" && xray.result && <Report xray={xray} canCorrect={canRun} />}
    </div>
  );
}

// ------------------------------------------------------------------ pieces

function EmptyState({ canRun }: { canRun: boolean }) {
  const steps = [
    { title: "We read your website", text: "The home page and up to five important pages: about, services, pricing, contact." },
    { title: "You see the X-Ray", text: "What you do, the top three problems worth checking, and the evidence for each." },
    { title: "One agent to help", text: "For real estate, financial services and B2B SaaS / agencies, the AI agent best suited to the top problem." },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
      <div className="mx-auto w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted">
        <FileSearch className="w-5 h-5" />
      </div>
      <h2 className="text-base font-semibold text-text mt-4">No X-Ray yet</h2>
      <p className="text-sm text-text-muted mt-1">
        {canRun ? "Enter your website above and run your first X-Ray. It usually takes under a minute." : "The account owner hasn't run an X-Ray yet."}
      </p>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto text-left">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="w-6 h-6 rounded-full border border-line text-xs text-text-muted flex items-center justify-center shrink-0">{i + 1}</span>
            <span>
              <span className="block text-sm font-medium text-text">{s.title}</span>
              <span className="block text-xs text-text-muted mt-0.5 leading-relaxed">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Progress({ xray }: { xray: XRay }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(xray.createdAt).getTime();
    const t = setInterval(() => setElapsed(Math.max(0, Math.round((Date.now() - start) / 1000))), 1000);
    return () => clearInterval(t);
  }, [xray.createdAt]);

  const reading = xray.status === "reading";
  const steps = [
    {
      label: "Reading the website",
      detail: reading
        ? xray.progress && xray.progress.total > 1
          ? `${xray.progress.read} of ${xray.progress.total} pages`
          : "Opening the home page"
        : `${xray.snapshot?.pages.length || 0} pages read`,
      state: reading ? "active" : "done",
    },
    { label: "Finding what matters", detail: reading ? "" : "Checking every finding against the pages", state: reading ? "waiting" : "active" },
    { label: "Your X-Ray", detail: "", state: "waiting" },
  ] as const;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text">X-Ray of {host(xray.url)}</p>
        <span className="text-xs text-text-muted tabular-nums">{elapsed}s</span>
      </div>
      <ol className="mt-5 grid gap-4 sm:grid-cols-3">
        {steps.map(s => (
          <li key={s.label} className="flex items-start gap-3">
            {s.state === "done" ? (
              <span className="w-6 h-6 rounded-full bg-brass text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </span>
            ) : s.state === "active" ? (
              <Loader2 className="w-6 h-6 text-brass animate-spin shrink-0" />
            ) : (
              <CircleDashed className="w-6 h-6 text-text-muted/50 shrink-0" />
            )}
            <span>
              <span className={`block text-sm ${s.state === "waiting" ? "text-text-muted" : "text-text font-medium"}`}>{s.label}</span>
              {s.detail && <span className="block text-xs text-text-muted mt-0.5">{s.detail}</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Report({ xray, canCorrect }: { xray: XRay; canCorrect: boolean }) {
  const r = xray.result!;
  const pages = new Map((xray.snapshot?.pages || []).map(p => [p.id, p]));
  const pageLabel = (id: string) => (id === "brief" ? "Your business brief" : pages.get(id) ? `${PAGE_KIND[pages.get(id)!.kind] || "Page"} page` : id);
  const pageUrl = (id: string) => pages.get(id)?.url;
  const agent = r.recommendedAgent ? agentById(r.recommendedAgent.id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
        <span>
          <span className="text-text font-medium">{host(xray.snapshot?.finalUrl || xray.url)}</span> · {when(xray.finishedAt || xray.createdAt)}
        </span>
        <span>Industry: {INDUSTRY_NAMES[r.industry.id]}</span>
        {r.partial && <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium">Partial X-Ray</span>}
        {xray.durationMs ? <span>Took {Math.round(xray.durationMs / 1000)}s</span> : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-start">
        <div className="space-y-6 min-w-0">
          <section aria-label="Top problems">
            <h2 className="text-[15px] font-semibold text-text mb-3">Top problems worth checking</h2>
            {r.opportunities.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line px-5 py-8 text-sm text-text-muted text-center">
                We couldn&apos;t back any problem with clear evidence from the website, so none is shown. See the limitations for why.
              </div>
            ) : (
              <ol className="space-y-3">
                {r.opportunities.map((o, i) => (
                  <li key={i} className="rounded-xl border border-line bg-surface p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-surface-2 text-xs font-semibold text-text flex items-center justify-center shrink-0">{i + 1}</span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-text leading-snug">{o.title}</h3>
                          <span className={`inline-block mt-1.5 text-[11px] font-medium px-2 py-0.5 rounded ${TYPE_STYLE[o.type].cls}`}>{TYPE_STYLE[o.type].label}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0" title="Impact × Confidence × Feasibility × Urgency ÷ Effort. A ranking, not a forecast.">
                        <p className="text-[11px] text-text-muted">Priority</p>
                        <p className="text-base font-semibold text-text tabular-nums">{o.score}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-text leading-relaxed">{o.finding}</p>
                    {o.whyItMatters && <p className="mt-1.5 text-sm text-text-muted leading-relaxed">{o.whyItMatters}</p>}

                    <div className="mt-4 space-y-2">
                      {o.evidence.map((e, j) => (
                        <figure key={j} className="rounded-lg bg-surface-2/60 border-l-2 border-brass/60 px-3.5 py-2.5">
                          <blockquote className="text-[13px] text-text leading-relaxed">“{e.quote}”</blockquote>
                          <figcaption className="mt-1 text-xs text-text-muted">
                            {pageUrl(e.page) ? (
                              <a href={pageUrl(e.page)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-text">
                                From the {pageLabel(e.page).toLowerCase()} <ArrowUpRight className="w-3 h-3" />
                              </a>
                            ) : (
                              <>From {pageLabel(e.page).toLowerCase()}</>
                            )}
                          </figcaption>
                        </figure>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                      {o.howToCheck ? (
                        <p className="text-[13px] text-text-muted">
                          <span className="font-medium text-text">How to check: </span>
                          {o.howToCheck}
                        </p>
                      ) : (
                        <span />
                      )}
                      <dl className="flex gap-3 text-[11px] text-text-muted">
                        {(
                          [
                            ["Impact", o.factors.impact],
                            ["Confidence", o.factors.confidence],
                            ["Feasibility", o.factors.feasibility],
                            ["Urgency", o.factors.urgency],
                            ["Effort", o.factors.effort],
                          ] as const
                        ).map(([k, v]) => (
                          <div key={k} className="text-center">
                            <dt>{k}</dt>
                            <dd className="text-text font-medium tabular-nums">{v}/5</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {agent && r.recommendedAgent && (
            <section aria-label="Recommended agent" className="rounded-xl border border-brass/40 bg-surface p-5">
              <p className="text-xs font-medium text-brass">Recommended agent · for problem {r.recommendedAgent.forOpportunity + 1}</p>
              <h2 className="mt-1 text-base font-semibold text-text">{agent.agent.name}</h2>
              <p className="mt-1 text-sm text-text-muted">{agent.agent.job}</p>
              {r.recommendedAgent.reason && <p className="mt-2 text-sm text-text">{r.recommendedAgent.reason}</p>}
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <div>
                  <dt className="text-xs text-text-muted">What it does</dt>
                  <dd className="text-text mt-0.5">{agent.agent.actions}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">What it never does</dt>
                  <dd className="text-text mt-0.5">{agent.agent.guardrails}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Where you approve</dt>
                  <dd className="text-text mt-0.5">{agent.agent.approvals}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Needs connected</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {agent.agent.needs.map(n => (
                      <span key={n} className="text-xs px-2 py-0.5 rounded border border-line text-text">
                        {n}
                      </span>
                    ))}
                  </dd>
                </div>
              </dl>
              <ActivateAgent agentId={agent.agent.id} canActivate={canCorrect} />
            </section>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <ProfileCard r={r} pageLabel={pageLabel} canCorrect={canCorrect} />

          <section aria-label="Limitations" className="rounded-xl border border-line bg-surface p-5">
            <h2 className="text-sm font-semibold text-text">Limitations</h2>
            <p className="text-xs text-text-muted mt-0.5">What we could not find or confirm. Nothing here was guessed.</p>
            <ul className="mt-3 space-y-2 text-[13px] text-text-muted list-disc pl-4">
              {r.limitations.length ? r.limitations.map((l, i) => <li key={i}>{l}</li>) : <li>None. Every part of this X-Ray is backed by the pages read.</li>}
            </ul>
          </section>

          {xray.snapshot && (
            <section aria-label="Pages read" className="rounded-xl border border-line bg-surface p-5">
              <h2 className="text-sm font-semibold text-text">Pages read</h2>
              <p className="text-xs text-text-muted mt-0.5">
                {xray.snapshot.pages.length} read on {when(xray.snapshot.crawledAt)}
                {xray.snapshot.notRead ? `, ${xray.snapshot.notRead} more found but not read` : ""}
              </p>
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {xray.snapshot.pages.map(p => (
                  <li key={p.id} className="flex items-center gap-2 min-w-0">
                    <Check className="w-3.5 h-3.5 text-brass shrink-0" />
                    <span className="text-text-muted shrink-0 w-16">{PAGE_KIND[p.kind] || "Page"}</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="truncate text-text hover:underline" title={p.url}>
                      {p.title}
                    </a>
                  </li>
                ))}
                {xray.snapshot.skipped.map(s => (
                  <li key={s.url} className="flex items-start gap-2 min-w-0 text-text-muted">
                    <X className="w-3.5 h-3.5 text-rust shrink-0 mt-0.5" />
                    <span className="min-w-0">
                      <span className="block truncate" title={s.url}>
                        {s.url.replace(/^https?:\/\/(www\.)?/, "")}
                      </span>
                      <span className="block text-xs">{s.reason}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileCard({
  r,
  pageLabel,
  canCorrect,
}: {
  r: NonNullable<XRay["result"]>;
  pageLabel: (id: string) => string;
  canCorrect: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const save = async (row: (typeof PROFILE_ROWS)[number]) => {
    if (!row.brief) return;
    setSaving(true);
    setError("");
    try {
      const body = row.brief.summary ? { summary: draft } : { values: { [row.brief.key]: draft } };
      const res = await fetch("/api/business/brief", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "Could not save.");
      setSaved(s => ({ ...s, [row.key]: draft.trim() }));
      setEditing(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const name = r.profile.name?.value;
  return (
    <section aria-label="Business profile" className="rounded-xl border border-line bg-surface">
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-sm font-semibold text-text">{name || "Business profile"}</h2>
        <p className="text-xs text-text-muted mt-0.5">
          From the website. Corrections go into your{" "}
          <Link href="/settings/brief" className="underline hover:text-text">
            business brief
          </Link>
          , which your advisors use.
        </p>
      </div>
      <dl className="divide-y divide-line border-t border-line">
        {PROFILE_ROWS.map(row => {
          const fact = r.profile[row.key];
          const corrected = saved[row.key];
          const isEditing = editing === row.key;
          return (
            <div key={row.key} className="px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs text-text-muted">{row.label}</dt>
                {canCorrect && row.brief && !isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(row.key);
                      setDraft(corrected || fact?.value || "");
                      setError("");
                    }}
                    className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Pencil className="w-3 h-3" /> Correct this
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    rows={2}
                    maxLength={600}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass resize-none"
                  />
                  {error && <p className="text-xs text-rust">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => save(row)}
                      disabled={saving || !draft.trim()}
                      className="h-8 px-3 rounded-md bg-brass text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {saving && <Loader2 className="w-3 h-3 animate-spin" />}
                      Save to business brief
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className="h-8 px-3 rounded-md text-xs text-text-muted hover:text-text cursor-pointer">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : corrected ? (
                <dd className="mt-1 text-sm text-text">
                  {corrected}
                  <span className="ml-2 text-[11px] text-brass">Corrected by you</span>
                </dd>
              ) : fact?.value ? (
                <dd className="mt-1 text-sm text-text">
                  {fact.value}
                  <span className="block mt-1 text-[11px] text-text-muted">
                    {fact.basis === "stated" ? "Stated on" : "Inferred from"} {fact.sources.map(pageLabel).join(", ").toLowerCase()}
                  </span>
                </dd>
              ) : (
                <dd className="mt-1 text-sm text-text-muted">Not found on the website</dd>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}

/** Adds the recommended agent as a draft and opens it, where its checks show what is needed before it can work. */
function ActivateAgent({ agentId, canActivate }: { agentId: string; canActivate: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/agents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "Could not add the agent.");
      window.location.assign(`/agents?agent=${encodeURIComponent(d.agent.id)}`);
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  };
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      {canActivate ? (
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Activate this agent
        </button>
      ) : (
        <span className="text-xs text-text-muted">The account owner can activate agents.</span>
      )}
      <span className="text-xs text-text-muted">It starts as a draft. It works only after its checks pass and you switch it on.</span>
      {error && <span className="w-full text-sm text-rust">{error}</span>}
    </div>
  );
}

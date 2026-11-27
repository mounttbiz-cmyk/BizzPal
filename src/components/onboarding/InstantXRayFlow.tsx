"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, ScanSearch, ShieldAlert } from "lucide-react";
import { INDUSTRY_NAMES, agentById, type IndustryId } from "@/lib/xray/packs";

interface Opportunity {
  type: "revenue" | "efficiency" | "risk";
  title: string;
  finding: string;
  evidence: Array<{ page: string; quote: string }>;
  factors: { impact: number; confidence: number; feasibility: number; urgency: number; effort: number };
  score: number;
}

interface XRayRun {
  id: string;
  url: string;
  status: "reading" | "analysing" | "done" | "failed";
  progress: { read: number; total: number } | null;
  error: string | null;
  durationMs: number | null;
  result: {
    partial?: boolean;
    profile: Record<string, { value: string | null; sources: string[]; basis: "stated" | "inferred" }>;
    industry: { id: IndustryId; reason: string };
    opportunities: Opportunity[];
    recommendedAgent: { id: string; reason: string; forOpportunity: number } | null;
    limitations: string[];
  } | null;
}

/**
 * PRD AC-02: 90-second Magic Moment — Enter company URL -> X-Ray -> one-click "Activate this agent".
 */
export function InstantXRayFlow({
  initialUrl,
  onUseFullSetup,
  onSkipToDashboard,
  onOpenXRay,
}: {
  initialUrl?: string;
  onUseFullSetup: () => void;
  onSkipToDashboard: () => void;
  onOpenXRay?: () => void;
}) {
  const [url, setUrl] = useState(initialUrl || "");
  const [starting, setStarting] = useState(false);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const [xray, setXray] = useState<XRayRun | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pollRef.current) clearTimeout(pollRef.current);
  }, []);

  const poll = (id: string) => {
    if (pollRef.current) clearTimeout(pollRef.current);
    const tick = async () => {
      try {
        const res = await fetch(`/api/business/xray/${encodeURIComponent(id)}`, { cache: "no-store" });
        const d = await res.json();
        if (res.ok && d.success && d.xray) {
          setXray(d.xray);
          if (d.xray.status === "done" || d.xray.status === "failed") return;
        }
      } catch {}
      pollRef.current = setTimeout(tick, 1500);
    };
    pollRef.current = setTimeout(tick, 1200);
  };

  const startXRay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || starting) return;
    setError("");
    setStarting(true);
    try {
      const res = await fetch("/api/business/xray", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "Could not start the X-Ray.");
      setXray({ id: d.id, url: url.trim(), status: "reading", progress: { read: 0, total: 1 }, error: null, durationMs: null, result: null });
      poll(d.id);
    } catch (err: any) {
      setError(err.message || "Could not start the X-Ray.");
    } finally {
      setStarting(false);
    }
  };

  const activateRecommended = async () => {
    if (!xray?.result?.recommendedAgent || activating) return;
    setActivating(true);
    setError("");
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: xray.result.recommendedAgent.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.success) throw new Error(d.error || "Could not add the agent.");
      window.location.assign(`/agents?agent=${encodeURIComponent(d.agent.id)}`);
    } catch (err: any) {
      setError(err.message || "Could not activate the agent.");
      setActivating(false);
    }
  };

  const running = xray && (xray.status === "reading" || xray.status === "analysing");
  const rec = xray?.result?.recommendedAgent ? agentById(xray.result.recommendedAgent.id) : null;

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-theme space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-medium text-brass uppercase tracking-wider">90-Second Business X-Ray</p>
        <h1 className="text-xl sm:text-2xl font-semibold text-text tracking-tight">
          Add your company website to get started
        </h1>
        <p className="text-sm text-text-muted leading-relaxed">
          We will map what your business does, identify up to three evidence-backed opportunities, and recommend one AI agent you can put to work. You stay in control of every connection and action.
        </p>
      </div>

      <form onSubmit={startXRay} className="flex flex-col sm:flex-row gap-3">
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="yourcompany.com"
          inputMode="url"
          aria-label="Company website URL"
          disabled={Boolean(running) || starting}
          className="flex-1 min-w-0 h-11 px-4 rounded-xl bg-bg border border-line text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-brass disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={Boolean(running) || starting || !url.trim()}
          className="h-11 px-5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {running || starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />}
          {running ? "Analysing…" : "Run X-Ray"}
        </button>
      </form>

      {error && <p className="text-sm text-rust">{error}</p>}

      {running && (
        <div className="rounded-xl border border-line bg-bg/60 p-4 flex items-center gap-3 text-sm">
          <Loader2 className="w-4 h-4 text-brass animate-spin shrink-0" />
          <span className="text-text">
            {xray.status === "reading"
              ? `Reading public pages (${xray.progress?.read || 0} of ${xray.progress?.total || 1})…`
              : "Extracting evidence-backed profile and opportunities…"}
          </span>
        </div>
      )}

      {xray?.status === "failed" && (
        <div className="rounded-xl border border-rust/30 bg-rust/5 p-4 flex gap-3 text-sm">
          <ShieldAlert className="w-4 h-4 text-rust shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-text">Could not run X-Ray</p>
            <p className="text-text-muted mt-0.5">{xray.error || "Please check the URL and try again."}</p>
          </div>
        </div>
      )}

      {xray?.status === "done" && xray.result && (
        <div className="space-y-4 pt-2 border-t border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
            <span>
              Industry: <strong className="text-text">{INDUSTRY_NAMES[xray.result.industry.id]}</strong>
              {xray.result.partial ? " · Partial X-Ray" : ""}
            </span>
            {xray.durationMs ? <span>Completed in {Math.round(xray.durationMs / 1000)}s</span> : null}
          </div>

          {xray.result.profile?.what_they_do?.value && (
            <div className="rounded-xl bg-surface-2/50 p-4 text-sm text-text">
              {xray.result.profile.what_they_do.value}
            </div>
          )}

          {xray.result.opportunities.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted">Top findings ({xray.result.opportunities.length})</p>
              {xray.result.opportunities.map((o, idx) => (
                <div key={idx} className="rounded-xl border border-line p-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-text">{o.title}</span>
                    <span className="text-xs text-text-muted tabular-nums">Priority {o.score}</span>
                  </div>
                  <p className="text-xs text-text-muted mt-1">{o.finding}</p>
                </div>
              ))}
            </div>
          )}

          {rec && (
            <div className="rounded-xl border border-brass/40 bg-brass/[0.04] p-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-brass">Recommended Agent</p>
                <p className="text-base font-semibold text-text mt-0.5">{rec.agent.name}</p>
                <p className="text-xs text-text-muted mt-0.5">{rec.agent.job}</p>
              </div>
              <button
                type="button"
                onClick={activateRecommended}
                disabled={activating}
                className="h-10 px-4 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {activating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Activate this agent
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenXRay || (() => window.location.assign("/xray"))}
              className="text-xs font-medium text-text hover:text-brass inline-flex items-center gap-1 cursor-pointer"
            >
              Open full X-Ray & workspace <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted">
        <button type="button" onClick={onUseFullSetup} className="hover:text-text underline underline-offset-2 cursor-pointer">
          Use full 8-step business verification setup instead
        </button>
        <button type="button" onClick={onSkipToDashboard} className="hover:text-text cursor-pointer">
          Skip to dashboard
        </button>
      </div>
    </div>
  );
}

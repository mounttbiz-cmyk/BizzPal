"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import BuyCredits from "@/components/credits/BuyCredits";
import {
  Bot,
  Check,
  CircleDashed,
  Info,
  Loader2,
  Pause,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";

import { askConfirm } from "@/components/ui/dialogs";
// ------------------------------------------------------------------ types (as the APIs return them)

type State =
  | "draft"
  | "evaluating"
  | "approval_required"
  | "active"
  | "paused"
  | "retired";
interface Budget {
  maxCostInr: number;
  maxTokens: number;
  maxToolCalls: number;
  maxHops: number;
  deadlineMinutes: number;
}
interface Gate {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  warning?: boolean;
  fix?: "brief" | "credits" | "integrations";
}
interface Agent {
  id: string;
  agentId: string;
  name: string;
  version: string;
  state: State;
  budget: Budget;
  evaluation: { at: string; gates: Gate[]; passed: boolean } | null;
  pausedReason: string | null;
  activatedAt: string | null;
  createdAt: string;
}
interface CatalogueAgent {
  id: string;
  name: string;
  job: string;
  guardrails: string;
  approvals: string;
  connections: Array<{ key: string; label: string; connected: boolean }>;
}
interface Approval {
  id: string;
  action: string;
  tier: string;
  target: string;
  summary: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}
interface Task {
  id: string;
  state: string;
  purpose: string;
  toolCalls: number;
  costInr: number;
  traceId: string;
  createdAt: string;
  finishedAt: string | null;
  result: string | null;
  output: JobOutput | null;
}
interface JobStep {
  action: string;
  label: string;
  why: string;
  status: "done" | "approval_required" | "refused";
  result?: any;
  reason?: string;
}
interface JobOutput {
  summary: string;
  steps: JobStep[];
}

const STATE_LABEL: Record<State, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-surface-2 text-text-muted border-line" },
  evaluating: {
    label: "Evaluating",
    cls: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  },
  approval_required: {
    label: "Waiting for your approval",
    cls: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20",
  },
  active: {
    label: "Active",
    cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  paused: {
    label: "Paused",
    cls: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
  retired: {
    label: "Retired",
    cls: "bg-surface-2 text-text-muted border-line",
  },
};
const STEPS: Array<{ state: State; label: string }> = [
  { state: "draft", label: "Draft" },
  { state: "approval_required", label: "Checked" },
  { state: "active", label: "Active" },
];
const BUDGET_FIELDS: Array<{ key: keyof Budget; label: string; unit: string }> =
  [
    { key: "maxCostInr", label: "Most a task may cost", unit: "₹" },
    { key: "maxTokens", label: "Most AI tokens per task", unit: "tokens" },
    { key: "maxToolCalls", label: "Most actions per task", unit: "actions" },
    { key: "maxHops", label: "Most hand-offs between agents", unit: "hops" },
    { key: "deadlineMinutes", label: "Time limit per task", unit: "minutes" },
  ];

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.success === false)
    throw new Error(d.error || d.reason || "Something went wrong.");
  return d;
}
const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

// ------------------------------------------------------------------ page

export default function AgentsPage() {
  const [data, setData] = useState<{
    canManage: boolean;
    agents: Agent[];
    catalogue: Array<{
      industry: string;
      name: string;
      agents: CatalogueAgent[];
    }>;
    wallet: { balance: number; reserved: number; available: number };
    pendingApprovals: Approval[];
  } | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/agents", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok || !d.success)
        throw new Error(d.error || "Could not load agents.");
      setData(d);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  useEffect(() => {
    load();
    const id = new URLSearchParams(window.location.search).get("agent");
    if (id) setOpenId(id);
  }, [load]);

  if (!data) {
    return (
      <div className="py-24 flex items-center justify-center gap-2 text-sm text-text-muted">
        {error ? (
          <span>
            {error}{" "}
            <button
              type="button"
              onClick={load}
              className="text-brass hover:underline cursor-pointer"
            >
              Try again
            </button>
          </span>
        ) : (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading agents…
          </>
        )}
      </div>
    );
  }

  const live = data.agents.filter((a) => a.state !== "retired");
  return (
    <div className="space-y-6 pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text">AI Agents</h1>
          <p className="text-sm text-text-muted mt-1 max-w-2xl">
            Agents do real work for you. Each one starts as a draft, must pass
            its checks, and only works after you switch it on. You approve every
            change it wants to make in another system.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/settings/credits"
            className="text-sm text-text-muted hover:text-text"
          >
            Credits:{" "}
            <span className="text-text font-medium tabular-nums">
              {data.wallet.available}
            </span>
          </Link>
          {data.canManage && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="h-9 px-3.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add an agent
            </button>
          )}
        </div>
      </header>

      {data.pendingApprovals.length > 0 && (
        <Approvals
          items={data.pendingApprovals}
          canManage={data.canManage}
          onDone={load}
        />
      )}

      {live.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
          <div className="mx-auto w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted">
            <Bot className="w-5 h-5" />
          </div>
          <h2 className="text-base font-semibold text-text mt-4">
            No agents yet
          </h2>
          <p className="text-sm text-text-muted mt-1 max-w-md mx-auto">
            Run a{" "}
            <Link href="/xray" className="underline hover:text-text">
              Business X-Ray
            </Link>{" "}
            to see which agent fits your business best, or add one yourself.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {live.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setOpenId(a.id)}
                className="w-full text-left rounded-xl border border-line bg-surface p-5 hover:border-line-strong transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-lg bg-surface-2 text-brass flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-semibold text-text truncate">
                      {a.name}
                    </span>
                  </div>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATE_LABEL[a.state].cls}`}
                  >
                    {STATE_LABEL[a.state].label}
                  </span>
                </div>
                <p className="mt-3 text-xs text-text-muted">
                  Up to ₹{a.budget.maxCostInr} and {a.budget.maxToolCalls}{" "}
                  actions per task
                  {a.state === "draft" && a.evaluation && !a.evaluation.passed
                    ? ` · ${a.evaluation.gates.filter((g) => !g.passed).length} checks to fix`
                    : ""}
                  {a.pausedReason ? ` · ${a.pausedReason}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId && (
        <AgentPanel
          id={openId}
          onClose={() => {
            setOpenId(null);
            window.history.replaceState(null, "", "/agents");
            load();
          }}
          onChanged={load}
        />
      )}
      {adding && (
        <AddAgent
          catalogue={data.catalogue}
          onClose={() => setAdding(false)}
          onAdded={(id) => {
            setAdding(false);
            load();
            setOpenId(id);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ approvals

function Approvals({
  items,
  canManage,
  onDone,
}: {
  items: Approval[];
  canManage: boolean;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const decide = async (id: string, decision: "approve" | "reject") => {
    setBusy(id);
    setError("");
    try {
      await send(`/api/approvals/${id}`, "POST", { decision });
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <section
      aria-label="Waiting for your approval"
      className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-5"
    >
      <h2 className="text-sm font-semibold text-text flex items-center gap-2">
        <ShieldCheck className="w-4 h-4 text-amber-600" /> Waiting for your
        approval
      </h2>
      <p className="text-xs text-text-muted mt-0.5">
        Each approval covers exactly this action, once. If anything about it
        changes, it asks again.
      </p>
      {error && <p className="mt-2 text-sm text-rust">{error}</p>}
      <ul className="mt-3 space-y-2">
        {items.map((a) => (
          <li
            key={a.id}
            className="rounded-lg border border-line bg-surface px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-text">{a.summary}</p>
              <p className="text-xs text-text-muted mt-0.5">
                Risk {a.tier} · asked {when(a.createdAt)} · expires{" "}
                {when(a.expiresAt)}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => decide(a.id, "reject")}
                  className="h-8 px-3 rounded-md border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={busy === a.id}
                  onClick={() => decide(a.id, "approve")}
                  className="h-8 px-3 rounded-md bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50"
                >
                  Approve
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ------------------------------------------------------------------ add an agent

function AddAgent({
  catalogue,
  onClose,
  onAdded,
}: {
  catalogue: Array<{
    industry: string;
    name: string;
    agents: CatalogueAgent[];
  }>;
  onClose: () => void;
  onAdded: (id: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [industry, setIndustry] = useState(catalogue[0]?.industry || "");
  const pack = catalogue.find((p) => p.industry === industry) || catalogue[0];
  const add = async (agentId: string) => {
    setBusy(agentId);
    setError("");
    try {
      const d = await send("/api/agents", "POST", { agentId });
      onAdded(d.agent.id);
    } catch (e: any) {
      setError(e.message);
      setBusy(null);
    }
  };
  return (
    <Modal
      title="Add an agent"
      subtitle="Added as a draft. Nothing runs until it passes its checks and you switch it on."
      onClose={onClose}
    >
      {catalogue.length > 1 && (
        <div
          role="tablist"
          aria-label="Industry"
          className="flex gap-6 overflow-x-auto [scrollbar-width:none] shadow-[inset_0_-1px_0_var(--line)]"
        >
          {catalogue.map((p) => (
            <button
              key={p.industry}
              type="button"
              role="tab"
              aria-selected={p.industry === pack?.industry}
              onClick={() => setIndustry(p.industry)}
              className={`shrink-0 whitespace-nowrap pb-3 border-b-2 text-sm transition-colors cursor-pointer ${
                p.industry === pack?.industry
                  ? "border-brass text-text"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-rust">{error}</p>}

      {/* Every industry is laid out in the same spot and only the chosen one is shown, so the window keeps the
          height of the tallest list and does not jump when switching tabs. */}
      <div className="grid">
        {catalogue.map((p) => (
          <ul
            key={p.industry}
            aria-hidden={p.industry !== pack?.industry}
            className={`[grid-area:1/1] grid gap-4 md:grid-cols-2 content-start ${p.industry === pack?.industry ? "" : "invisible"}`}
          >
            {p.agents.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-line bg-surface p-5 flex flex-col hover:border-line-strong transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-surface-2 text-brass flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text leading-snug">
                      {a.name}
                    </p>
                    <p className="text-sm text-text-muted mt-1 leading-relaxed">
                      {a.job}
                    </p>
                  </div>
                </div>
                <div className="mt-auto pt-5 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] text-text-muted mb-1.5">Needs</p>
                    <div className="flex flex-wrap gap-1.5">
                      {a.connections.map((c) => (
                        <span
                          key={c.key}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md ${
                            c.connected
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-surface-2 text-text-muted"
                          }`}
                        >
                          {c.connected && <Check className="w-3 h-3" />}
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(a.id)}
                    disabled={Boolean(busy)}
                    className="h-9 px-4 rounded-lg border border-brass/40 text-brass text-sm font-medium hover:bg-brass hover:text-white hover:border-brass transition-colors cursor-pointer shrink-0 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {busy === a.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Add
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ one agent

function AgentPanel({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [d, setD] = useState<{
    agent: Agent;
    definition: any;
    checks: Gate[];
    tasks: Task[];
    canManage: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<{
    tone: "good" | "info";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [budget, setBudget] = useState<Record<string, string>>({});
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/agents/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const j = await res.json();
      if (!res.ok || !j.success)
        throw new Error(j.error || "Could not load the agent.");
      setD(j);
      setBudget(
        Object.fromEntries(
          Object.entries(j.agent.budget).map(([k, v]) => [k, String(v)]),
        ),
      );
    } catch (e: any) {
      setError(e.message);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const step = async (s: string, extra?: Record<string, unknown>) => {
    setBusy(s);
    setError("");
    setNotice(null);
    try {
      const r = await send(
        `/api/agents/${encodeURIComponent(id)}`,
        "PATCH",
        s === "budget" ? { budget: extra } : { step: s, ...(extra || {}) },
      );
      if (s === "evaluate") {
        const gates: Gate[] = r.agent?.evaluation?.gates || [];
        const open = gates.filter((g) => !g.passed).length;
        setNotice(
          open === 0
            ? {
                tone: "good",
                text: "Every check passed. Switch it on when you are ready.",
              }
            : {
                tone: "info",
                text: `${open} ${open === 1 ? "check needs" : "checks need"} your attention. Each one says what to do.`,
              },
        );
      }
      if (s === "activate")
        setNotice({
          tone: "good",
          text: "It is on. Give it its first job below.",
        });
      if (s === "budget") setNotice({ tone: "info", text: "Limits saved." });
      await load();
      onChanged();
    } catch (e: any) {
      setError(e.message);
      await load();
    } finally {
      setBusy("");
    }
  };

  if (!d) {
    return (
      <Modal title="Agent" onClose={onClose}>
        {error ? (
          <p className="text-sm text-rust">{error}</p>
        ) : (
          <p className="text-sm text-text-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        )}
      </Modal>
    );
  }

  const a = d.agent;
  const stepIndex =
    a.state === "active" || a.state === "paused"
      ? 2
      : a.state === "approval_required"
        ? 1
        : 0;
  const budgetChanged = BUDGET_FIELDS.some(
    (f) => Number(budget[f.key]) !== a.budget[f.key],
  );
  const ready = d.checks.every((g) => g.passed);

  return (
    <Modal
      title={a.name}
      subtitle={d.definition?.job}
      badge={
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${STATE_LABEL[a.state].cls}`}
        >
          {STATE_LABEL[a.state].label}
        </span>
      }
      onClose={onClose}
    >
      {a.state !== "retired" && (
        <ol className="flex items-center gap-3 max-w-xl" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = i < stepIndex || (i === 2 && a.state === "active");
            return (
              <li
                key={s.state}
                className="flex items-center gap-3 flex-1 last:flex-none"
              >
                <span className="flex items-center gap-2 shrink-0">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      done
                        ? "bg-brass text-white"
                        : i === stepIndex
                          ? "border-2 border-brass text-brass"
                          : "border border-line text-text-muted"
                    }`}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  <span className="text-sm text-text whitespace-nowrap">
                    {s.label}
                  </span>
                </span>
                {i < STEPS.length - 1 && (
                  <span className="h-px flex-1 bg-line min-w-6" />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {notice && (
        <p
          className={`text-sm rounded-lg px-4 py-2.5 ${notice.tone === "good" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "bg-surface-2 text-text"}`}
        >
          {notice.text}
        </p>
      )}
      {error && <p className="text-sm text-rust">{error}</p>}

      {a.state === "active" && d.canManage && (
        <JobBox agentId={a.id} onDone={load} />
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6 min-w-0">
          <section>
            <h3 className="text-sm font-semibold text-text mb-3">Checks</h3>
            <ul className="space-y-3">
              {d.checks.map((g) => (
                <li key={g.id} className="flex items-start gap-3 text-sm">
                  {g.passed && !g.warning ? (
                    <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  ) : g.passed ? (
                    <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  ) : (
                    <CircleDashed className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                  )}
                  <span className="min-w-0">
                    <span className="text-text">{g.label}</span>
                    <span className="block text-xs text-text-muted mt-0.5 leading-relaxed">
                      {g.detail}
                    </span>
                    {g.fix === "brief" && !g.passed && (
                      <Link
                        href="/settings/brief"
                        className="inline-block mt-1.5 text-xs font-medium text-brass hover:underline"
                      >
                        Fill in the business brief
                      </Link>
                    )}
                    {g.fix === "credits" && d.canManage && (
                      <button
                        type="button"
                        onClick={() => setBuying(true)}
                        className="mt-1.5 text-xs font-medium text-brass hover:underline cursor-pointer"
                      >
                        Add credits
                      </button>
                    )}
                    {g.fix === "integrations" && (
                      <Link
                        href="/integrations"
                        className="inline-block mt-1.5 text-xs font-medium text-brass hover:underline"
                      >
                        See integrations
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {d.canManage && a.state !== "retired" && (
            <div className="flex flex-wrap items-center gap-2">
              {(a.state === "draft" || a.state === "paused") && (
                <button
                  type="button"
                  onClick={() => step("evaluate")}
                  disabled={Boolean(busy)}
                  className="h-10 px-4 rounded-lg bg-text text-bg text-sm font-medium hover:opacity-90 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy === "evaluate" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {busy === "evaluate" ? "Running checks…" : "Run checks"}
                </button>
              )}
              {a.state === "approval_required" && (
                <button
                  type="button"
                  onClick={() => step("activate")}
                  disabled={Boolean(busy) || !ready}
                  className="h-10 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {busy === "activate" && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}{" "}
                  Switch on this agent
                </button>
              )}
              {a.state === "active" && (
                <button
                  type="button"
                  onClick={() =>
                    step("pause", { reason: "Paused by the owner" })
                  }
                  disabled={Boolean(busy)}
                  className="h-10 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" /> Pause
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  if (
                    await askConfirm({
                      title: `Retire ${a.name}?`,
                      message: "It will stop taking new work. Its history stays.",
                      confirmLabel: "Retire",
                      danger: true,
                    })
                  )
                    step("retire");
                }}
                disabled={Boolean(busy)}
                className="h-10 px-4 rounded-lg text-sm text-text-muted hover:text-rust cursor-pointer disabled:opacity-50"
              >
                Retire
              </button>
            </div>
          )}

          {d.definition && (
            <section className="grid gap-4 sm:grid-cols-2 text-sm rounded-xl bg-surface-2/60 p-4">
              <div>
                <p className="text-xs text-text-muted">What it never does</p>
                <p className="text-text mt-0.5">{d.definition.guardrails}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Where you approve</p>
                <p className="text-text mt-0.5">{d.definition.approvals}</p>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6 min-w-0">
          <section>
            <h3 className="text-sm font-semibold text-text">
              Limits for every task
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              A task stops as soon as it reaches any of these. Changing them on
              an approved agent needs the checks again.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {BUDGET_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="block text-xs text-text-muted mb-1">
                    {f.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      value={budget[f.key] ?? ""}
                      onChange={(e) =>
                        setBudget((b) => ({ ...b, [f.key]: e.target.value }))
                      }
                      disabled={!d.canManage || a.state === "retired"}
                      className="w-full h-9 px-3 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass disabled:opacity-60"
                    />
                    <span className="text-xs text-text-muted w-14 shrink-0">
                      {f.unit}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {d.canManage && budgetChanged && (
              <button
                type="button"
                onClick={() =>
                  step(
                    "budget",
                    Object.fromEntries(
                      BUDGET_FIELDS.map((f) => [f.key, Number(budget[f.key])]),
                    ),
                  )
                }
                disabled={Boolean(busy)}
                className="mt-3 h-9 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50"
              >
                Save limits
              </button>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-text mb-2">
              Recent jobs
            </h3>
            {d.tasks.length === 0 ? (
              <p className="text-sm text-text-muted">
                {a.state === "active"
                  ? "No jobs yet. Give it one above."
                  : "No jobs yet. Jobs can be given once it is switched on."}
              </p>
            ) : (
              <ul className="divide-y divide-line rounded-lg border border-line">
                {d.tasks.slice(0, 8).map((t) => (
                  <li
                    key={t.id}
                    className="px-3.5 py-2.5 text-sm flex items-center justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block text-text truncate">
                        {t.purpose}
                      </span>
                      <span className="block text-xs text-text-muted">
                        {when(t.createdAt)} · {TASK_STATE[t.state] || t.state} ·
                        ₹{t.costInr.toFixed(2)}
                      </span>
                    </span>
                    <Link
                      href={`/settings/audit?trace=${encodeURIComponent(t.traceId)}`}
                      className="text-xs text-text-muted hover:text-text shrink-0"
                    >
                      Steps
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {buying && (
        <BuyCredits
          needed={a.budget.maxCostInr}
          onClose={() => setBuying(false)}
          onBought={(credits) => {
            setBuying(false);
            setNotice({
              tone: "good",
              text: `${credits.toLocaleString("en-IN")} credits added. Run the checks again.`,
            });
            load();
            onChanged();
          }}
        />
      )}
    </Modal>
  );
}

const TASK_STATE: Record<string, string> = {
  working: "Working",
  input_required: "Waiting for you",
  completed: "Done",
  failed: "Stopped",
  canceled: "Canceled",
};

/** Give an active agent a job and watch it carry the job out, step by step. */
function JobBox({ agentId, onDone }: { agentId: string; onDone: () => void }) {
  const [instruction, setInstruction] = useState("");
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const running = Boolean(task && !task.finishedAt);

  // Follow the job until it finishes
  useEffect(() => {
    if (!task || task.finishedAt) return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/agents/tasks/${task.id}`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (j.success) {
          setTask(j.task);
          if (j.task.finishedAt) onDone();
        }
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [task, onDone]);

  const start = async () => {
    setStarting(true);
    setError("");
    setTask(null);
    try {
      const r = await send(
        `/api/agents/${encodeURIComponent(agentId)}/run`,
        "POST",
        { instruction },
      );
      setTask(r.task);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  };

  const out = task?.output;
  return (
    <section className="rounded-xl border border-line p-5 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-text">Give it a job</h3>
        <p className="text-xs text-text-muted mt-0.5">
          Say what you need in plain words, for example paste an enquiry and ask
          for a reply and a follow-up.
        </p>
      </div>
      <textarea
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        rows={3}
        maxLength={2000}
        disabled={running || starting}
        placeholder="e.g. Ramesh asked about 2BHK flats near Baner under ₹90 lakh and wants to visit this weekend. Draft a reply and create a follow-up task."
        className="w-full px-3.5 py-3 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted/70 focus:outline-none focus:border-brass resize-y disabled:opacity-60"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-text-muted">
          Credits are held while it works, and whatever it does not use is
          returned.
        </span>
        <button
          type="button"
          onClick={start}
          disabled={running || starting || instruction.trim().length < 5}
          className="h-10 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 shrink-0"
        >
          {(running || starting) && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {running ? "Working…" : "Start"}
        </button>
      </div>
      {error && <p className="text-sm text-rust">{error}</p>}

      {task && (
        <div className="border-t border-line pt-4 space-y-3">
          {running && !out?.steps?.length && (
            <p className="text-sm text-text-muted flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Planning the job…
            </p>
          )}
          {out?.steps?.map((s, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              {s.status === "done" ? (
                <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-text">{s.label}</p>
                {s.why && <p className="text-xs text-text-muted">{s.why}</p>}
                {s.status !== "done" && s.reason && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    {s.reason}
                  </p>
                )}
                {s.status === "done" && s.result?.draft && (
                  <div className="mt-2 rounded-lg bg-surface-2 p-3">
                    <p className="text-sm text-text whitespace-pre-wrap">
                      {s.result.draft}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard?.writeText(s.result.draft)
                      }
                      className="mt-2 text-xs font-medium text-brass hover:underline cursor-pointer"
                    >
                      Copy draft
                    </button>
                  </div>
                )}
                {s.status === "done" && s.result?.taskId && (
                  <Link
                    href="/tasks"
                    className="inline-block mt-1 text-xs font-medium text-brass hover:underline"
                  >
                    Task created: {s.result.title}
                  </Link>
                )}
              </div>
            </div>
          ))}
          {task.finishedAt && (
            <p
              className={`text-sm rounded-lg px-4 py-2.5 ${task.state === "completed" ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : "bg-surface-2 text-text"}`}
            >
              {out?.summary ||
                task.result ||
                (task.state === "completed" ? "Done." : "The job stopped.")}
              <span className="block text-xs opacity-80 mt-0.5">
                Cost ₹{task.costInr.toFixed(2)}. Nothing was sent outside
                BizzPal.
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/** A centred window over the page. Closes on Escape or a click outside, and stops the page behind from scrolling. */
function Modal({
  title,
  subtitle,
  badge,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);
  // Rendered straight into <body> so it covers the whole screen, menu included, and centres on the window rather
  // than on the page area (an animated parent would otherwise become its frame).
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/40 cursor-default"
      />
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden">
        <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-line flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-text">{title}</h2>
              {badge}
            </div>
            {subtitle && (
              <p className="text-sm text-text-muted mt-1 max-w-2xl">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

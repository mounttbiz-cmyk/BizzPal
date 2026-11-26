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
  approvalId?: string;
  preview?: { title: string };
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
        <Link
          href="/approvals"
          className="flex items-center justify-between gap-4 rounded-xl border border-brass/30 bg-brass/[0.05] px-5 py-4 hover:bg-brass/[0.08]"
        >
          <span className="flex items-center gap-3 min-w-0">
            <ShieldCheck className="w-5 h-5 text-brass shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-text">
                {data.pendingApprovals.length} {data.pendingApprovals.length === 1 ? "request is" : "requests are"} waiting for your approval
              </span>
              <span className="block text-xs text-text-muted">Nothing is sent until you approve it.</span>
            </span>
          </span>
          <span className="text-sm font-medium text-brass shrink-0">Review</span>
        </Link>
      )}

      {live.some((a) => a.state === "active" || a.state === "paused") && <AgentResults title="What your agents did" />}

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

      {live.length > 0 && <HouseStyle canManage={data.canManage} />}

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

          {(a.state === "active" || a.state === "paused") && (
            <ScheduleBox agentId={a.id} canManage={d.canManage} paused={a.state === "paused"} />
          )}

          {(a.state === "active" || a.state === "paused" || d.tasks.length > 0) && <AgentResults agentId={a.id} title="Results" compact />}

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
                      {t.output?.summary?.startsWith("Skipped:") && (
                        <span className="block text-xs text-rust mt-0.5">{t.output.summary}</span>
                      )}
                    </span>
                    {t.state === "input_required" && !t.finishedAt ? (
                      <Link
                        href={`/approvals${(() => {
                          const w = t.output?.steps?.find((x) => x.status === "approval_required" && x.approvalId);
                          return w ? `?id=${encodeURIComponent(w.approvalId!)}` : "";
                        })()}`}
                        className="text-xs font-medium text-brass hover:underline shrink-0"
                      >
                        Review
                      </Link>
                    ) : (
                      <Link
                        href={`/settings/audit?trace=${encodeURIComponent(t.traceId)}`}
                        className="text-xs text-text-muted hover:text-text shrink-0"
                      >
                        Steps
                      </Link>
                    )}
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
  const waiting = Boolean(task && !task.finishedAt && task.state === "input_required");
  const running = Boolean(task && !task.finishedAt && !waiting);

  // Follow the job until it finishes or waits for the owner
  useEffect(() => {
    if (!task || task.finishedAt || task.state === "input_required") return;
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/agents/tasks/${task.id}`, {
          cache: "no-store",
        });
        const j = await r.json();
        if (j.success) {
          setTask(j.task);
          if (j.task.finishedAt || j.task.state === "input_required") onDone();
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
          {waiting && (
            <p className="text-sm rounded-lg px-4 py-2.5 bg-brass/[0.06] text-text">
              The agent is waiting for your approval before it carries on.{" "}
              <Link href="/approvals" className="font-medium text-brass hover:underline">
                Open Approvals
              </Link>
            </p>
          )}
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
                {s.status === "approval_required" && s.approvalId ? (
                  <p className="text-xs mt-1">
                    <span className="text-text-muted">{s.preview?.title ? `${s.preview.title}. ` : ""}Waiting for your approval. </span>
                    <Link href={`/approvals?id=${encodeURIComponent(s.approvalId)}`} className="font-medium text-brass hover:underline">
                      Review it
                    </Link>
                  </p>
                ) : (
                  s.status !== "done" &&
                  s.reason && <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{s.reason}</p>
                )}
                {s.status === "done" && s.result?.sentTo && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {s.result.sandbox ? "Recorded (test account): " : "Sent to "}
                    {s.result.sentTo}
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
                Cost ₹{task.costInr.toFixed(2)}.{" "}
                {(() => {
                  const sent = (out?.steps || []).filter((x) => x.status === "done" && x.result?.sentTo && !x.result?.sandbox).length;
                  return sent > 0 ? `${sent} ${sent === 1 ? "email was" : "emails were"} sent from your account.` : "Nothing was sent outside BizzPal.";
                })()}
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ results

interface Report {
  days: number;
  jobs: { total: number; completed: number; failed: number; skipped: number; waiting: number; running: number };
  actions: { total: number; byAction: Array<{ action: string; label: string; count: number }> };
  approvals: { approved: number; rejected: number; expired: number; pending: number };
  emailsSent: number;
  creditsSpent: number;
  minutesSaved: number;
}

const hoursAndMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ""}`.trim() : `${m} min`);

/** What the agents (or one agent) did in the last 7 or 30 days, from the records. */
function AgentResults({ agentId, title, compact }: { agentId?: string; title: string; compact?: boolean }) {
  const [days, setDays] = useState(7);
  const [r, setR] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(`/api/agents/report?days=${days}${agentId ? `&agent=${encodeURIComponent(agentId)}` : ""}`, { cache: "no-store" })
      .then((x) => x.json())
      .then((d) => {
        if (!alive) return;
        if (d.success) setR(d.report);
        else setError(d.error || "Could not load the results.");
      })
      .catch(() => alive && setError("Could not load the results."));
    return () => {
      alive = false;
    };
  }, [days, agentId]);

  const stats = r
    ? [
        { label: "Jobs done", value: String(r.jobs.completed), note: r.jobs.failed + r.jobs.skipped ? `${r.jobs.failed + r.jobs.skipped} stopped or skipped` : r.jobs.waiting ? `${r.jobs.waiting} waiting for you` : "" },
        { label: "Emails sent", value: String(r.emailsSent), note: r.approvals.rejected ? `${r.approvals.rejected} rejected by you` : "" },
        { label: "Credits spent", value: `₹${r.creditsSpent.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`, note: "" },
        { label: "Time saved", value: r.minutesSaved ? `≈ ${hoursAndMinutes(r.minutesSaved)}` : "—", note: "Estimate" },
      ]
    : [];

  return (
    <section className={compact ? "" : "rounded-xl border border-line bg-surface p-5"}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <div className="inline-flex rounded-lg border border-line p-0.5 text-xs">
          {[7, 30].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setDays(n)}
              className={`px-2.5 h-7 rounded-md cursor-pointer ${days === n ? "bg-surface-2 text-text font-medium" : "text-text-muted hover:text-text"}`}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="text-sm text-rust">{error}</p>
      ) : !r ? (
        <p className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      ) : r.jobs.total === 0 ? (
        <p className="text-sm text-text-muted">No jobs in the last {r.days} days.</p>
      ) : (
        <div className={`grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 lg:grid-cols-4"}`}>
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-surface-2/60 px-4 py-3 min-w-0">
              <p className="text-xs text-text-muted">{s.label}</p>
              <p className="text-lg font-semibold text-text tabular-nums mt-0.5 truncate">{s.value}</p>
              {s.note && <p className="text-xs text-text-muted truncate">{s.note}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ schedule

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Let the agent run on its own, daily or weekly at a set time (India time). */
function ScheduleBox({ agentId, canManage, paused }: { agentId: string; canManage: boolean; paused: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<any>(null);
  // "daily" | "weekly" | "new_lead" | "new_enquiry"
  const [form, setForm] = useState({ cadence: "daily", time: "09:00", weekday: 1, instruction: "" });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const d = await send(`/api/agents/${encodeURIComponent(agentId)}/schedule`, "GET");
      setSaved(d.schedule);
      if (d.schedule)
        setForm({ cadence: d.schedule.trigger || d.schedule.cadence, time: d.schedule.trigger ? "09:00" : d.schedule.time, weekday: d.schedule.weekday ?? 1, instruction: d.schedule.instruction });
    } catch {}
    setLoaded(true);
  }, [agentId]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async (enabled: boolean) => {
    setBusy(true);
    setError("");
    try {
      const trigger = form.cadence === "new_lead" || form.cadence === "new_enquiry" ? form.cadence : null;
      const d = await send(`/api/agents/${encodeURIComponent(agentId)}/schedule`, "PUT", {
        ...form,
        cadence: trigger ? "daily" : form.cadence,
        trigger,
        enabled,
      });
      setSaved(d.schedule);
      setEditing(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!(await askConfirm({ title: "Stop the automatic runs?", message: "The agent will only work when you give it a job.", confirmLabel: "Stop", danger: true }))) return;
    setBusy(true);
    try {
      await send(`/api/agents/${encodeURIComponent(agentId)}/schedule`, "DELETE");
      setSaved(null);
      setForm({ cadence: "daily", time: "09:00", weekday: 1, instruction: "" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return null;
  const describe = (s: any) =>
    s.trigger === "new_lead"
      ? "Whenever a new lead arrives"
      : s.trigger === "new_enquiry"
        ? "Whenever a new enquiry arrives by email"
        : `${s.cadence === "weekly" ? `Every ${WEEKDAYS[s.weekday ?? 1]}` : "Every day"} at ${new Date(`2000-01-01T${s.time}:00`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
  const isTrigger = form.cadence === "new_lead" || form.cadence === "new_enquiry";

  return (
    <section>
      <h3 className="text-sm font-semibold text-text">Runs on its own</h3>
      {!editing ? (
        saved ? (
          <div className="mt-2 rounded-lg border border-line px-4 py-3 text-sm space-y-1">
            <p className="text-text">
              {saved.enabled ? describe(saved) : "Switched off"}
              {saved.enabled && paused && <span className="text-rust"> · skipped while the agent is paused</span>}
            </p>
            <p className="text-xs text-text-muted line-clamp-2">{saved.instruction}</p>
            <p className="text-xs text-text-muted">
              {saved.nextRunAt ? `Next run ${when(saved.nextRunAt)}` : ""}
              {saved.lastRunAt ? `${saved.nextRunAt ? " · " : ""}last ${when(saved.lastRunAt)}${saved.lastResult ? `: ${saved.lastResult}` : ""}` : ""}
            </p>
            {canManage && (
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-brass hover:underline cursor-pointer">
                  Change
                </button>
                <button type="button" onClick={() => save(!saved.enabled)} disabled={busy} className="text-xs text-text-muted hover:text-text cursor-pointer">
                  {saved.enabled ? "Switch off" : "Switch on"}
                </button>
                <button type="button" onClick={remove} disabled={busy} className="text-xs text-text-muted hover:text-rust cursor-pointer">
                  Remove
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted mt-0.5">
            It only works when you give it a job.{" "}
            {canManage && (
              <button type="button" onClick={() => setEditing(true)} className="font-medium text-brass hover:underline cursor-pointer">
                Set a schedule
              </button>
            )}
          </p>
        )
      ) : (
        <div className="mt-2 rounded-lg border border-line p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-text-muted mb-1">When it runs</span>
              <select
                value={form.cadence}
                onChange={(e) => setForm({ ...form, cadence: e.target.value })}
                className="w-full h-9 px-2 rounded-lg bg-surface border border-line text-sm text-text cursor-pointer"
              >
                <option value="daily">Every day</option>
                <option value="weekly">Every week</option>
                <option value="new_lead">When a new lead arrives</option>
                <option value="new_enquiry">When a new enquiry arrives</option>
              </select>
            </label>
            <label className={`block ${isTrigger ? "invisible" : ""}`}>
              <span className="block text-xs text-text-muted mb-1">Time (India)</span>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full h-9 px-2 rounded-lg bg-surface border border-line text-sm text-text"
              />
            </label>
          </div>
          {form.cadence === "weekly" && (
            <label className="block">
              <span className="block text-xs text-text-muted mb-1">Day</span>
              <select
                value={form.weekday}
                onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
                className="w-full h-9 px-2 rounded-lg bg-surface border border-line text-sm text-text cursor-pointer"
              >
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">What it should do each time</span>
            <textarea
              rows={3}
              maxLength={2000}
              value={form.instruction}
              onChange={(e) => setForm({ ...form, instruction: e.target.value })}
              placeholder={
                isTrigger
                  ? "For example: Draft a friendly reply to this person and create a follow-up task for tomorrow."
                  : "For example: List open tasks older than a week and create one follow-up task for the most urgent."
              }
              className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass"
            />
          </label>
          <p className="text-xs text-text-muted">
            {isTrigger
              ? `The agent is told who the ${form.cadence === "new_lead" ? "lead" : "enquiry"} is from and what they said. Leads come from your lead sheet and enquiries from your inbox (set them up under Leads & enquiries).`
              : "Each run is a normal job: it uses credits, keeps to the limits, and asks you before sending anything."}
          </p>
          {error && <p className="text-sm text-rust">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} disabled={busy} className="h-9 px-3 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => save(true)}
              disabled={busy || form.instruction.trim().length < 5}
              className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50"
            >
              Save schedule
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------ house style (agent memory)

/** The style the agents write in, learned from the emails the owner approved. The owner can edit it or switch it off. */
function HouseStyle({ canManage }: { canManage: boolean }) {
  const [m, setM] = useState<{ style: string; enabled: boolean; learnedFrom: number; learnedAt: string | null; newExamples: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    send("/api/agents/memory", "GET")
      .then((d) => setM(d.memory))
      .catch(() => {});
  }, []);

  const act = async (kind: "learn" | "save" | "toggle") => {
    setBusy(kind);
    setError("");
    try {
      const d =
        kind === "learn"
          ? await send("/api/agents/memory", "POST")
          : kind === "save"
            ? await send("/api/agents/memory", "PUT", { style: text })
            : await send("/api/agents/memory", "PUT", { enabled: !m?.enabled });
      setM(d.memory);
      setEditing(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  if (!m) return null;
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text">House style</h2>
          <p className="text-xs text-text-muted mt-0.5 max-w-xl">
            How your agents write: learned from the emails you approved and the changes you made to them. It never keeps customer contact details.
          </p>
        </div>
        {canManage && (m.style || m.learnedFrom > 0) && (
          <button type="button" onClick={() => act("toggle")} disabled={Boolean(busy)} className="text-xs text-text-muted hover:text-text cursor-pointer shrink-0">
            {m.enabled ? "Switch off" : "Switch on"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={7}
            maxLength={2000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text leading-relaxed focus:outline-none focus:border-brass"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(false)} className="h-9 px-3 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={() => act("save")} disabled={Boolean(busy)} className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50">
              Save
            </button>
          </div>
        </div>
      ) : m.style ? (
        <div className={`mt-3 rounded-lg bg-surface-2/60 px-4 py-3 ${m.enabled ? "" : "opacity-60"}`}>
          <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">{m.style}</p>
          <p className="text-xs text-text-muted mt-2">
            {m.enabled ? "In use" : "Switched off"}
            {m.learnedAt ? ` · learned from ${m.learnedFrom} ${m.learnedFrom === 1 ? "email" : "emails"} on ${when(m.learnedAt)}` : " · written by you"}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          {m.newExamples > 0
            ? `You have approved ${m.newExamples} ${m.newExamples === 1 ? "email" : "emails"}. BizzPal can learn your style from them.`
            : "Nothing learned yet. Once you approve a few emails from your agents, BizzPal learns how you like to write."}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-rust">{error}</p>}
      {canManage && !editing && (
        <div className="mt-3 flex flex-wrap gap-3">
          {m.newExamples > 0 && (
            <button type="button" onClick={() => act("learn")} disabled={Boolean(busy)} className="text-xs font-medium text-brass hover:underline cursor-pointer inline-flex items-center gap-1.5">
              {busy === "learn" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {m.style ? `Update from ${m.newExamples} new ${m.newExamples === 1 ? "email" : "emails"}` : "Learn my style"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setText(m.style);
              setEditing(true);
            }}
            className="text-xs text-text-muted hover:text-text cursor-pointer"
          >
            {m.style ? "Edit" : "Write it yourself"}
          </button>
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

"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

interface Event {
  id: string;
  traceId: string | null;
  actor: string;
  action: string;
  resource: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

// Plain words for what each recorded action means
const ACTION: Record<string, string> = {
  "agent.draft": "Agent added as a draft",
  "agent.evaluating": "Agent checks started",
  "agent.approval_required": "Agent passed its checks",
  "agent.draft:back": "Agent returned to draft",
  "agent.active": "Agent switched on",
  "agent.paused": "Agent paused",
  "agent.retired": "Agent retired",
  "agent.budget_changed": "Agent limits changed",
  "task.started": "Task started",
  "task.completed": "Task completed",
  "task.failed": "Task stopped",
  "task.canceled": "Task canceled",
  "action.done": "Action done",
  "action.refused": "Action refused",
  "action.failed": "Action failed",
  "policy.allow": "Allowed by risk policy",
  "policy.deny": "Blocked by risk policy",
  "approval.requested": "Approval requested",
  "approval.approved": "Approved",
  "approval.rejected": "Rejected",
  "approval.used": "Approval used",
  "approval.rejected_use": "Approval could not be used",
  "credits.grant": "Credits added",
  "credits.purchase": "Credits bought",
  "credits.reserve": "Credits held for a task",
  "credits.settle": "Task cost settled",
  "xray.started": "Business X-Ray started",
  "xray.done": "Business X-Ray finished",
  "xray.failed": "Business X-Ray failed",
};

const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", second: "2-digit" });

export default function AuditPage() {
  const [trace, setTrace] = useState<string>("");
  const [d, setD] = useState<{ events: Event[]; integrity: { ok: boolean; checked: number; brokenAt?: string } } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("trace") || "";
    setTrace(t);
  }, []);

  useEffect(() => {
    setD(null);
    fetch(`/api/business/audit${trace ? `?trace=${encodeURIComponent(trace)}` : ""}`, { cache: "no-store" })
      .then(r => r.json())
      .then(j => (j.success ? setD(j) : setError(j.error || "Could not load the audit log.")))
      .catch(() => setError("Could not load the audit log."));
  }, [trace]);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h2 className="text-lg font-semibold text-text">Audit log</h2>
        <p className="text-sm text-text-muted mt-1 max-w-2xl">
          Everything agents, approvals and credits did in this company, in order. Each entry is chained to the one before, so any change to the log is
          detected.
        </p>
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}
      {!d && !error && (
        <p className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      )}

      {d && (
        <>
          <div className={`rounded-xl border px-5 py-3.5 flex items-center gap-3 text-sm ${d.integrity.ok ? "border-line bg-surface" : "border-rust/40 bg-rust/5"}`}>
            {d.integrity.ok ? <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" /> : <ShieldAlert className="w-5 h-5 text-rust shrink-0" />}
            <span className="text-text">
              {d.integrity.ok
                ? `Intact: all ${d.integrity.checked} entries check out.`
                : `The log has been changed. The chain breaks at entry ${d.integrity.brokenAt}. Contact BizzPal support.`}
            </span>
          </div>

          {trace && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-text-muted">
                Showing one task&apos;s steps <span className="font-mono text-xs">{trace}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setTrace("");
                  window.history.replaceState(null, "", "/settings/audit");
                }}
                className="text-brass hover:underline cursor-pointer"
              >
                Show everything
              </button>
            </div>
          )}

          {d.events.length === 0 ? (
            <p className="text-sm text-text-muted">Nothing recorded yet.</p>
          ) : (
            <ol className="rounded-xl border border-line bg-surface divide-y divide-line">
              {d.events.map(e => (
                <li key={e.id} className="px-5 py-3 grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:gap-4 sm:items-baseline text-sm">
                  <span className="text-xs text-text-muted tabular-nums">{when(e.createdAt)}</span>
                  <span className="min-w-0">
                    <span className="text-text">{ACTION[e.action] || e.action}</span>
                    <span className="block text-xs text-text-muted truncate">
                      {e.actor} · {e.resource}
                      {Object.keys(e.detail || {}).length ? ` · ${Object.entries(e.detail).slice(0, 3).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(", ")}` : ""}
                    </span>
                  </span>
                  {e.traceId && !trace ? (
                    <button type="button" onClick={() => setTrace(e.traceId!)} className="text-xs text-text-muted hover:text-text text-left sm:text-right cursor-pointer">
                      Trace
                    </button>
                  ) : (
                    <span />
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

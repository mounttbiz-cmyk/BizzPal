"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, Check, Clock, Loader2, Pencil, X } from "lucide-react";
import { showNotice } from "@/components/ui/dialogs";

interface Preview {
  title: string;
  lines: Array<{ label: string; value: string }>;
  editable: string[];
}
interface Approval {
  id: string;
  action: string;
  actionLabel: string;
  target: string;
  status: "pending" | "approved" | "used" | "rejected" | "expired";
  preview: Preview | null;
  note: string | null;
  agentName: string;
  job: { purpose: string; state: string } | null;
  decidedBy: string | null;
  decidedAt: string | null;
  expiresAt: string;
  createdAt: string;
}

const when = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";

function timeLeft(iso: string) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.round((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h} h ${m} min left` : `${m} min left`;
}

const STATUS: Record<Approval["status"], { label: string; cls: string }> = {
  pending: { label: "Waiting", cls: "bg-brass/10 text-brass" },
  approved: { label: "Approved", cls: "bg-jade/10 text-jade" },
  used: { label: "Approved and done", cls: "bg-jade/10 text-jade" },
  rejected: { label: "Rejected", cls: "bg-rust/10 text-rust" },
  expired: { label: "Expired", cls: "bg-surface-2 text-text-muted" },
};

export default function ApprovalsPage() {
  return (
    <Suspense fallback={null}>
      <Approvals />
    </Suspense>
  );
}

function Approvals() {
  const params = useSearchParams();
  const focusId = params.get("id");
  const [items, setItems] = useState<Approval[] | null>(null);
  const [canDecide, setCanDecide] = useState(false);
  const [tab, setTab] = useState<"waiting" | "history">("waiting");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/approvals", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Could not load approvals.");
      setItems(d.approvals);
      setCanDecide(Boolean(d.canDecide));
      setError("");
    } catch (e: any) {
      setError(e.message || "Could not load approvals.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const waiting = useMemo(() => (items || []).filter(a => a.status === "pending"), [items]);
  const history = useMemo(() => (items || []).filter(a => a.status !== "pending"), [items]);

  // Opened from an email link: show the right tab and scroll to the request
  useEffect(() => {
    if (!focusId || !items) return;
    const found = items.find(a => a.id === focusId);
    if (found && found.status !== "pending") setTab("history");
    setTimeout(() => document.getElementById(`apr-${focusId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }, [focusId, items]);

  const list = tab === "waiting" ? waiting : history;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-text">Approvals</h1>
        <p className="text-sm text-text-muted mt-1">
          Before an AI agent sends anything outside BizzPal, it asks you here. Read it, change it if you like, then approve or reject it.
        </p>
      </div>

      {!canDecide && items && items.length > 0 && (
        <div className="rounded-xl border border-line bg-surface-2/50 px-4 py-3 text-sm text-text-muted">
          You can see these requests. Only the account owner can approve or reject them.
        </div>
      )}

      <div className="border-b border-line flex gap-6" role="tablist">
        {([
          { id: "waiting", label: "Waiting for you", count: waiting.length },
          { id: "history", label: "Decided", count: history.length },
        ] as const).map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`relative pb-3 text-sm cursor-pointer ${tab === t.id ? "text-text" : "text-text-muted hover:text-text"}`}
          >
            {t.label}
            {t.count > 0 && <span className="ml-1.5 text-xs text-text-muted tabular-nums">{t.count}</span>}
            {tab === t.id && <span className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full bg-brass" />}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}

      {!items ? (
        <p className="text-sm text-text-muted flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
          <p className="text-base font-medium text-text">{tab === "waiting" ? "Nothing is waiting for you" : "No decisions yet"}</p>
          <p className="text-sm text-text-muted mt-2 max-w-md mx-auto">
            {tab === "waiting"
              ? "When an agent wants to send an email for you, it appears here first. Nothing goes out without your approval."
              : "Requests you approve or reject are kept here."}
          </p>
          {tab === "waiting" && (
            <Link href="/agents" className="inline-block mt-4 text-sm text-brass hover:underline">
              Go to AI Agents
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {list.map(a => (
            <ApprovalCard key={a.id} a={a} focused={a.id === focusId} canDecide={canDecide && a.status === "pending"} onDone={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({ a, focused, canDecide, onDone }: { a: Approval; focused: boolean; canDecide: boolean; onDone: () => void }) {
  const editable = a.preview?.editable || [];
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"" | "approve" | "reject">("");

  const valueOf = (label: string) => a.preview?.lines.find(l => l.label.toLowerCase() === label)?.value || "";
  const startEdit = () => {
    setEdits({ subject: valueOf("subject"), body: valueOf("message") });
    setEditing(true);
  };

  const decide = async (decision: "approve" | "reject") => {
    setBusy(decision);
    try {
      const payload: any = { decision };
      if (decision === "reject" && note.trim()) payload.note = note.trim();
      if (decision === "approve" && editing) {
        payload.edits = Object.fromEntries(editable.map(k => [k, edits[k] ?? ""]));
      }
      const r = await fetch(`/api/approvals/${a.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error || "Could not save your decision.");
      showNotice(decision === "approve" ? (a.action === "email.send" ? "Approved. The email is being sent." : "Approved. The agent is carrying on.") : "Rejected. Nothing was sent.", "success");
      window.dispatchEvent(new Event("bizzpal_approvals_changed"));
      onDone();
    } catch (e: any) {
      showNotice(e.message, "error");
    } finally {
      setBusy("");
    }
  };

  const s = STATUS[a.status] || STATUS.expired;
  const isEmail = a.action === "email.send";

  return (
    <article
      id={`apr-${a.id}`}
      className={`rounded-2xl border bg-surface overflow-hidden ${focused ? "border-brass ring-2 ring-brass/20" : "border-line"}`}
    >
      <header className="px-5 py-4 border-b border-line flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-surface-2 text-text-muted flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-text">{a.preview?.title || a.actionLabel}</p>
            <p className="text-xs text-text-muted mt-0.5">
              {a.agentName} · asked {when(a.createdAt)}
              {a.job?.purpose ? ` · job: ${a.job.purpose.slice(0, 90)}${a.job.purpose.length > 90 ? "…" : ""}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {a.status === "pending" && (
            <span className="text-xs text-text-muted inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {timeLeft(a.expiresAt)}
            </span>
          )}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
        </div>
      </header>

      <div className="px-5 py-4">
        {!a.preview ? (
          <p className="text-sm text-text-muted">{a.actionLabel}</p>
        ) : editing ? (
          <div className="space-y-3">
            {a.preview.lines
              .filter(l => !["subject", "message"].includes(l.label.toLowerCase()))
              .map(l => (
                <p key={l.label} className="text-sm">
                  <span className="text-text-muted">{l.label}: </span>
                  <span className="text-text">{l.value}</span>
                </p>
              ))}
            <div>
              <label className="block text-sm font-medium text-text mb-1.5" htmlFor={`sub-${a.id}`}>Subject</label>
              <input
                id={`sub-${a.id}`}
                value={edits.subject || ""}
                onChange={e => setEdits({ ...edits, subject: e.target.value })}
                className="w-full h-10 px-3 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1.5" htmlFor={`body-${a.id}`}>Message</label>
              <textarea
                id={`body-${a.id}`}
                rows={8}
                value={edits.body || ""}
                onChange={e => setEdits({ ...edits, body: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text leading-relaxed focus:outline-none focus:border-brass"
              />
            </div>
          </div>
        ) : (
          <dl className="space-y-2">
            {a.preview.lines.map(l => (
              <div key={l.label} className={l.label === "Message" ? "pt-1" : "flex gap-2 text-sm"}>
                {l.label === "Message" ? (
                  <dd className="text-sm text-text whitespace-pre-wrap leading-relaxed rounded-lg bg-surface-2/60 border border-line px-4 py-3">{l.value}</dd>
                ) : (
                  <>
                    <dt className="text-text-muted w-20 shrink-0">{l.label}</dt>
                    <dd className="text-text min-w-0 break-words">{l.value}</dd>
                  </>
                )}
              </div>
            ))}
          </dl>
        )}

        {a.note && <p className="mt-3 text-sm text-text-muted">Your note: {a.note}</p>}
        {a.decidedAt && a.status !== "pending" && (
          <p className="mt-3 text-xs text-text-muted">
            {s.label} {when(a.decidedAt)}
            {a.decidedBy ? ` by ${a.decidedBy}` : ""}
          </p>
        )}

        {rejecting && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-text mb-1.5" htmlFor={`note-${a.id}`}>
              Why are you rejecting it? <span className="font-normal text-text-muted">(optional, helps the agent learn)</span>
            </label>
            <input
              id={`note-${a.id}`}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="For example: wrong customer, too pushy, price is wrong"
              className="w-full h-10 px-3 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass"
            />
          </div>
        )}
      </div>

      {canDecide && (
        <footer className="px-5 py-3.5 border-t border-line flex flex-wrap items-center justify-end gap-2">
          {rejecting ? (
            <>
              <button type="button" onClick={() => setRejecting(false)} disabled={Boolean(busy)} className="h-9 px-3.5 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer">
                Back
              </button>
              <button
                type="button"
                onClick={() => decide("reject")}
                disabled={Boolean(busy)}
                className="h-9 px-4 rounded-lg bg-rust text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === "reject" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setRejecting(true)}
                disabled={Boolean(busy)}
                className="h-9 px-3.5 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50"
              >
                Reject
              </button>
              {editable.length > 0 &&
                (editing ? (
                  <button type="button" onClick={() => setEditing(false)} disabled={Boolean(busy)} className="h-9 px-3.5 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer">
                    Cancel edits
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startEdit}
                    disabled={Boolean(busy)}
                    className="h-9 px-3.5 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                ))}
              <button
                type="button"
                onClick={() => decide("approve")}
                disabled={Boolean(busy)}
                className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isEmail ? (editing ? "Approve and send edited email" : "Approve and send") : "Approve"}
              </button>
            </>
          )}
        </footer>
      )}
    </article>
  );
}

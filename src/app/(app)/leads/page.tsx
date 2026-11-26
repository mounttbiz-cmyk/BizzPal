"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, FileSpreadsheet, Inbox, Loader2, RefreshCw, RotateCcw, Search, X } from "lucide-react";
import { askConfirm, showNotice } from "@/components/ui/dialogs";
import { pickGoogleSheet } from "@/lib/integrations/pickGoogleSheet";

interface Lead {
  id: string;
  kind: "lead" | "enquiry";
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  subject: string | null;
  message: string | null;
  status: "new" | "done";
  receivedAt: string;
}
interface Source {
  id: string;
  kind: "google_sheet" | "email_inbox";
  label: string;
  enabled: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  fileName: string | null;
  host: string | null;
}
interface Data {
  canManage: boolean;
  leads: Lead[];
  counts: { leads: number; enquiries: number };
  sources: Source[];
  available: { googleDrive: boolean; email: { fromEmail: string; imapHost: string | null } | null };
}

const FIELDS: Array<{ key: "name" | "email" | "phone" | "company" | "message"; label: string }> = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "company", label: "Company" },
  { key: "message", label: "Message or notes" },
];

function ago(iso: string | null) {
  if (!iso) return "not yet";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function LeadsPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"all" | "lead" | "enquiry">("all");
  const [showDone, setShowDone] = useState(false);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [mapping, setMapping] = useState<{ file: { id: string; name: string; mimeType: string }; headers: string[]; sample: Record<string, string>[]; rows: number; map: Record<string, string> } | null>(null);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams();
      if (tab !== "all") p.set("kind", tab);
      if (!showDone) p.set("status", "new");
      if (q.trim()) p.set("q", q.trim());
      const r = await fetch(`/api/leads?${p}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.success) throw new Error(d.error || "Could not load leads.");
      setData(d);
      setImapHost(h => h || d.available.email?.imapHost || "");
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }, [tab, showDone, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const sheet = data?.sources.find(s => s.kind === "google_sheet") || null;
  const inbox = data?.sources.find(s => s.kind === "email_inbox") || null;

  const post = async (url: string, body: unknown, method = "POST") => {
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.success === false) throw new Error(d.error || "Something went wrong.");
    return d;
  };

  const chooseSheet = async () => {
    setBusy("pick");
    try {
      const file = await pickGoogleSheet();
      if (!file) return;
      const d = await post("/api/leads/sources", { action: "preview", fileId: file.id, mimeType: file.mimeType });
      setMapping({ file, headers: d.headers, sample: d.sample, rows: d.rows, map: Object.fromEntries(Object.entries(d.mapping || {}).filter(([, v]) => v)) as Record<string, string> });
    } catch (e: any) {
      showNotice(e.message, "error");
    } finally {
      setBusy("");
    }
  };

  const connectSheet = async () => {
    if (!mapping) return;
    setBusy("connect");
    try {
      const d = await post("/api/leads/sources", { action: "sheet", fileId: mapping.file.id, fileName: mapping.file.name, mimeType: mapping.file.mimeType, mapping: mapping.map });
      showNotice(`Sheet connected. ${d.added} ${d.added === 1 ? "lead" : "leads"} brought in. New rows are checked every 5 minutes.`, "success");
      setMapping(null);
      load();
    } catch (e: any) {
      showNotice(e.message, "error");
    } finally {
      setBusy("");
    }
  };

  const startInbox = async () => {
    setBusy("inbox");
    try {
      await post("/api/leads/sources", { action: "inbox", imapHost });
      showNotice("Reading enquiries is on. New emails are checked every 5 minutes.", "success");
      load();
    } catch (e: any) {
      showNotice(e.message, "error");
    } finally {
      setBusy("");
    }
  };

  const syncNow = async (s: Source) => {
    setBusy(`sync-${s.id}`);
    try {
      const d = await post(`/api/leads/sources/${s.id}`, {});
      showNotice(d.added ? `${d.added} new ${s.kind === "email_inbox" ? (d.added === 1 ? "enquiry" : "enquiries") : d.added === 1 ? "lead" : "leads"}.` : "Nothing new.", "success");
      load();
    } catch (e: any) {
      showNotice(e.message, "error");
      load();
    } finally {
      setBusy("");
    }
  };

  const disconnect = async (s: Source) => {
    const what = s.kind === "email_inbox" ? "reading enquiries" : "the lead sheet";
    if (!(await askConfirm({ title: `Stop ${what}?`, message: `The ${s.kind === "email_inbox" ? "enquiries" : "leads"} it brought in will be removed from BizzPal. Nothing changes in your ${s.kind === "email_inbox" ? "mailbox" : "sheet"}.`, confirmLabel: "Disconnect", danger: true }))) return;
    try {
      await post(`/api/leads/sources/${s.id}`, undefined, "DELETE");
      load();
    } catch (e: any) {
      showNotice(e.message, "error");
    }
  };

  const mark = async (l: Lead, status: "new" | "done") => {
    setData(d => (d ? { ...d, leads: d.leads.map(x => (x.id === l.id ? { ...x, status } : x)) } : d));
    try {
      await post(`/api/leads/${l.id}`, { status }, "PATCH");
      if (!showDone && status === "done") setData(d => (d ? { ...d, leads: d.leads.filter(x => x.id !== l.id) } : d));
      load();
    } catch {
      load();
    }
  };

  const tabs = useMemo(
    () => [
      { id: "all" as const, label: "All", count: (data?.counts.leads || 0) + (data?.counts.enquiries || 0) },
      { id: "lead" as const, label: "Leads", count: data?.counts.leads || 0 },
      { id: "enquiry" as const, label: "Enquiries", count: data?.counts.enquiries || 0 },
    ],
    [data]
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold text-text">Leads &amp; enquiries</h1>
        <p className="text-sm text-text-muted mt-1 max-w-2xl">
          New leads from your Google Sheet and new enquiries from your inbox, in one place. Your{" "}
          <Link href="/agents" className="text-brass hover:underline">
            AI agents
          </Link>{" "}
          can reply to them as they arrive.
        </p>
      </div>

      {error && <p className="text-sm text-rust">{error}</p>}

      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Lead sheet */}
          <section className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-surface-2 text-brass flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-text">Lead sheet</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {sheet ? (
                    <>
                      <span className="text-text">{sheet.fileName || sheet.label}</span> · checked {ago(sheet.lastSyncedAt)}
                    </>
                  ) : (
                    "A Google Sheet where you keep leads. New rows become leads here."
                  )}
                </p>
                {sheet?.lastError && <p className="text-xs text-rust mt-1">{sheet.lastError}</p>}
              </div>
            </div>
            {data.canManage && (
              <div className="mt-auto flex flex-wrap gap-2">
                {sheet ? (
                  <>
                    <button type="button" onClick={() => syncNow(sheet)} disabled={Boolean(busy)} className="h-8 px-3 rounded-lg border border-line text-sm text-text hover:bg-surface-2 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                      {busy === `sync-${sheet.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check now
                    </button>
                    <button type="button" onClick={chooseSheet} disabled={Boolean(busy)} className="h-8 px-3 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50">
                      Use another sheet
                    </button>
                    <button type="button" onClick={() => disconnect(sheet)} className="h-8 px-3 rounded-lg text-sm text-text-muted hover:text-rust hover:bg-rust/10 cursor-pointer">
                      Disconnect
                    </button>
                  </>
                ) : data.available.googleDrive ? (
                  <button type="button" onClick={chooseSheet} disabled={Boolean(busy)} className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
                    {busy === "pick" && <Loader2 className="w-4 h-4 animate-spin" />} Choose a Google Sheet
                  </button>
                ) : (
                  <Link href="/integrations" className="h-9 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 inline-flex items-center">
                    Connect Google Drive first
                  </Link>
                )}
              </div>
            )}
          </section>

          {/* Inbox */}
          <section className="rounded-xl border border-line bg-surface p-5 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-lg bg-surface-2 text-brass flex items-center justify-center shrink-0">
                <Inbox className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-text">Enquiries from email</h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {inbox ? (
                    <>
                      Reading <span className="text-text">{inbox.label}</span> · checked {ago(inbox.lastSyncedAt)}
                    </>
                  ) : data.available.email ? (
                    `New emails to ${data.available.email.fromEmail} become enquiries. Newsletters and automatic emails are left out.`
                  ) : (
                    "New emails to your business address become enquiries."
                  )}
                </p>
                {inbox?.lastError && <p className="text-xs text-rust mt-1">{inbox.lastError}</p>}
              </div>
            </div>
            {data.canManage && (
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {inbox ? (
                  <>
                    <button type="button" onClick={() => syncNow(inbox)} disabled={Boolean(busy)} className="h-8 px-3 rounded-lg border border-line text-sm text-text hover:bg-surface-2 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50">
                      {busy === `sync-${inbox.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Check now
                    </button>
                    <button type="button" onClick={() => disconnect(inbox)} className="h-8 px-3 rounded-lg text-sm text-text-muted hover:text-rust hover:bg-rust/10 cursor-pointer">
                      Stop reading
                    </button>
                  </>
                ) : data.available.email ? (
                  <>
                    {data.available.email.imapHost !== null && (
                      <input
                        value={imapHost}
                        onChange={e => setImapHost(e.target.value)}
                        aria-label="Incoming mail server"
                        title="Incoming mail (IMAP) server"
                        className="h-9 w-48 px-3 rounded-lg border border-line bg-surface text-sm text-text focus:outline-none focus:border-brass"
                      />
                    )}
                    <button type="button" onClick={startInbox} disabled={Boolean(busy)} className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
                      {busy === "inbox" && <Loader2 className="w-4 h-4 animate-spin" />} Start reading enquiries
                    </button>
                  </>
                ) : (
                  <Link href="/integrations" className="h-9 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 inline-flex items-center">
                    Connect your email first
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* The list */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        <div className="px-4 border-b border-line flex flex-col sm:flex-row sm:items-center gap-3">
          <div role="tablist" className="flex gap-5">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`relative h-12 text-sm cursor-pointer ${tab === t.id ? "text-text" : "text-text-muted hover:text-text"}`}
              >
                {t.label}
                {t.count > 0 && <span className="ml-1.5 text-xs text-text-muted tabular-nums">{t.count}</span>}
                {tab === t.id && <span className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full bg-brass" />}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto flex items-center gap-3 pb-3 sm:pb-0">
            <label className="inline-flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
              <input type="checkbox" checked={showDone} onChange={e => setShowDone(e.target.checked)} className="accent-[var(--brass)]" />
              Show done
            </label>
            <div className="relative w-56">
              <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
              />
            </div>
          </div>
        </div>

        {!data ? (
          <p className="px-5 py-10 text-sm text-text-muted flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading…
          </p>
        ) : data.leads.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-text">{q ? `Nothing matches "${q}"` : showDone ? "Nothing here yet" : "You're all caught up"}</p>
            <p className="text-sm text-text-muted mt-1">
              {data.sources.length === 0 ? "Connect a lead sheet or your inbox above, and new leads and enquiries will appear here." : "New leads and enquiries appear here as they arrive."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {data.leads.map(l => {
              const isOpen = open === l.id;
              return (
                <li key={l.id} className={l.status === "done" ? "opacity-60" : ""}>
                  <div className="px-5 py-3 flex items-start gap-4 cursor-pointer hover:bg-surface-2/40" onClick={() => setOpen(isOpen ? null : l.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text truncate">
                        <span className="font-medium">{l.name || l.email || l.phone || "Unknown"}</span>
                        {l.company && <span className="text-text-muted"> · {l.company}</span>}
                      </p>
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {l.kind === "enquiry" ? l.subject || "Enquiry" : [l.email, l.phone].filter(Boolean).join(" · ") || "Lead"}
                        {!isOpen && l.message ? ` · ${l.message}` : ""}
                      </p>
                    </div>
                    <span className="text-xs text-text-muted shrink-0 pt-0.5">
                      {l.kind === "enquiry" ? "Email" : "Sheet"} · {ago(l.receivedAt)}
                    </span>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        mark(l, l.status === "done" ? "new" : "done");
                      }}
                      title={l.status === "done" ? "Mark as new" : "Mark as done"}
                      aria-label={l.status === "done" ? "Mark as new" : "Mark as done"}
                      className="w-8 h-8 -my-1 rounded-lg text-text-muted hover:text-jade hover:bg-jade/10 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      {l.status === "done" ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-5 pb-4 -mt-1 text-sm space-y-2">
                      <div className="flex flex-wrap gap-x-5 gap-y-1 text-text-muted">
                        {l.email && (
                          <a href={`mailto:${l.email}`} className="text-brass hover:underline">
                            {l.email}
                          </a>
                        )}
                        {l.phone && (
                          <a href={`tel:${l.phone}`} className="text-brass hover:underline">
                            {l.phone}
                          </a>
                        )}
                        <span>{new Date(l.receivedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                      </div>
                      {l.message && <p className="whitespace-pre-wrap text-text leading-relaxed rounded-lg bg-surface-2/60 border border-line px-4 py-3">{l.message}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {mapping && (
        <MappingWindow
          state={mapping}
          busy={busy === "connect"}
          onChange={map => setMapping({ ...mapping, map })}
          onClose={() => setMapping(null)}
          onConnect={connectSheet}
        />
      )}
    </div>
  );
}

function MappingWindow({
  state,
  busy,
  onChange,
  onClose,
  onConnect,
}: {
  state: { file: { name: string }; headers: string[]; sample: Record<string, string>[]; rows: number; map: Record<string, string> };
  busy: boolean;
  onChange: (map: Record<string, string>) => void;
  onClose: () => void;
  onConnect: () => void;
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const k = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", k);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", k);
    };
  }, [busy, onClose]);
  const ok = Boolean(state.map.name || state.map.email || state.map.phone);
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Match the columns">
      <button type="button" aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0 bg-slate-950/40 cursor-default" />
      <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-text">Match the columns</h2>
            <p className="text-sm text-text-muted mt-0.5 truncate">
              {state.file.name} · {state.rows} {state.rows === 1 ? "row" : "rows"}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="p-1.5 -mr-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5 overflow-y-auto space-y-3">
          <p className="text-sm text-text-muted">Tell BizzPal which column holds what. We guessed from the headings; change anything that is wrong.</p>
          {FIELDS.map(f => (
            <label key={f.key} className="grid grid-cols-[130px_1fr] items-center gap-3">
              <span className="text-sm text-text">{f.label}</span>
              <select
                value={state.map[f.key] || ""}
                onChange={e => onChange({ ...state.map, [f.key]: e.target.value })}
                className="h-9 px-2 rounded-lg border border-line bg-surface text-sm text-text cursor-pointer"
              >
                <option value="">Not in this sheet</option>
                {state.headers.map(h => (
                  <option key={h} value={h}>
                    {h}
                    {state.sample[0]?.[h] ? ` (e.g. ${state.sample[0][h].slice(0, 30)})` : ""}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <p className="text-xs text-text-muted pt-1">
            The leads already in the sheet are brought in now, quietly. Only rows added from now on can start your agents.
          </p>
        </div>
        <div className="px-6 py-4 border-t border-line flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="h-10 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer">
            Cancel
          </button>
          <button type="button" onClick={onConnect} disabled={busy || !ok} className="h-10 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />} Connect sheet
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

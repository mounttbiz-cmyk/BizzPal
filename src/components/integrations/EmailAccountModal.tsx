"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { IntegrationLogo } from "@/components/ui/IntegrationLogo";
import { askConfirm, showNotice } from "@/components/ui/dialogs";

interface Account {
  host: string;
  port: number;
  user: string;
  fromEmail: string;
  fromName: string;
  sandbox: boolean;
  connectedAt: string;
}
interface Preset {
  id: string;
  label: string;
  host: string;
  port: number;
  help: string;
}

const input =
  "w-full h-10 px-3 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";
const label = "block text-sm font-medium text-text mb-1.5";

/**
 * Connecting the business's own email account, so AI agents can send emails the owner approves from the owner's own
 * address. The server tests the login before saving it; the password is stored encrypted and never shown again.
 */
export function EmailAccountModal({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [preset, setPreset] = useState("gmail");
  const [form, setForm] = useState({ host: "smtp.gmail.com", port: 465, user: "", password: "", fromEmail: "", fromName: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetch("/api/integrations/email", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setAccount(d.account || null);
        setPresets(d.presets || []);
      })
      .catch(() => setError("Could not load your email connection."))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, busy, onClose]);

  if (!open || typeof document === "undefined") return null;

  const choosePreset = (id: string) => {
    setPreset(id);
    const p = presets.find(x => x.id === id);
    if (p) setForm(f => ({ ...f, host: p.host || (id === "other" ? "" : f.host), port: p.port }));
  };

  const connect = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/integrations/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, fromEmail: form.fromEmail || form.user }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.success) throw new Error(d.error || "Could not connect.");
      setAccount(d.account);
      setForm(f => ({ ...f, password: "" }));
      showNotice("Email connected. Your agents can now send emails you approve.", "success");
      onChanged();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!(await askConfirm({ title: "Disconnect your email?", message: "Agents will no longer be able to send emails. Emails already sent are not affected.", confirmLabel: "Disconnect", danger: true }))) return;
    setBusy(true);
    await fetch("/api/integrations/email", { method: "DELETE" }).catch(() => {});
    setAccount(null);
    setBusy(false);
    onChanged();
  };

  const help = presets.find(p => p.id === preset)?.help;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Email account">
      <button type="button" aria-label="Close" onClick={() => !busy && onClose()} className="absolute inset-0 bg-slate-950/40 cursor-default" />
      <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl">
        <div className="px-6 pt-5 pb-4 border-b border-line flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <IntegrationLogo id="email" className="w-9 h-9" />
            <div>
              <h2 className="text-lg font-semibold text-text">Email account</h2>
              <p className="text-sm text-text-muted">{account ? "Connected" : "Let your agents send emails you approve, from your own address."}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="p-1.5 -mr-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-text-muted flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading…
            </p>
          ) : account ? (
            <div className="space-y-4">
              <dl className="rounded-xl border border-line divide-y divide-line text-sm">
                {[
                  ["Sends from", account.fromName ? `${account.fromName} <${account.fromEmail}>` : account.fromEmail],
                  ["Server", `${account.host}:${account.port}`],
                  ["Connected", new Date(account.connectedAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })],
                ].map(([k, v]) => (
                  <div key={k} className="px-4 py-2.5 grid grid-cols-[110px_1fr] gap-3">
                    <dt className="text-text-muted">{k}</dt>
                    <dd className="text-text break-words">{v}</dd>
                  </div>
                ))}
              </dl>
              {account.sandbox && <p className="text-sm text-text-muted">Test account: emails are recorded, not sent.</p>}
              <p className="text-sm text-text-muted">Every email an agent writes waits in Approvals until you approve it.</p>
            </div>
          ) : (
            <form id="email-account-form" onSubmit={connect} className="space-y-4">
              <div>
                <span className={label}>Your email provider</span>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => choosePreset(p.id)}
                      className={`h-10 px-3 rounded-lg border text-sm text-left cursor-pointer ${preset === p.id ? "border-brass bg-brass/[0.05] text-text" : "border-line text-text-muted hover:text-text"}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {help && <p className="text-xs text-text-muted mt-2">{help}</p>}
              </div>
              {preset === "other" && (
                <div className="grid grid-cols-[1fr_96px] gap-3">
                  <div>
                    <label className={label} htmlFor="em-host">SMTP server</label>
                    <input id="em-host" required value={form.host} onChange={e => setForm({ ...form, host: e.target.value })} className={input} placeholder="smtp.yourprovider.com" />
                  </div>
                  <div>
                    <label className={label} htmlFor="em-port">Port</label>
                    <input id="em-port" type="number" required value={form.port} onChange={e => setForm({ ...form, port: Number(e.target.value) })} className={input} />
                  </div>
                </div>
              )}
              <div>
                <label className={label} htmlFor="em-user">Email address</label>
                <input id="em-user" type="email" required autoComplete="off" value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} className={input} placeholder="you@yourbusiness.com" />
              </div>
              <div>
                <label className={label} htmlFor="em-pass">{preset === "gmail" || preset === "zoho" ? "App password" : "Password"}</label>
                <input id="em-pass" type="password" required autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className={input} />
              </div>
              <div>
                <label className={label} htmlFor="em-name">
                  Sender name <span className="font-normal text-text-muted">(optional)</span>
                </label>
                <input id="em-name" value={form.fromName} onChange={e => setForm({ ...form, fromName: e.target.value })} className={input} placeholder="For example: Priya from Acme Clinics" />
              </div>
              <p className="text-xs text-text-muted">BizzPal tests the login before saving it. The password is stored encrypted and is never shown again.</p>
              {error && <p className="text-sm text-rust">{error}</p>}
            </form>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line flex items-center justify-end gap-2">
          {account ? (
            <>
              <button type="button" onClick={disconnect} disabled={busy} className="mr-auto h-10 px-3 rounded-lg text-sm text-text-muted hover:text-rust hover:bg-rust/10 cursor-pointer disabled:opacity-50">
                Disconnect
              </button>
              <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer">
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} disabled={busy} className="h-10 px-4 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50">
                Cancel
              </button>
              <button
                type="submit"
                form="email-account-form"
                disabled={busy || loading}
                className="h-10 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Test and connect
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

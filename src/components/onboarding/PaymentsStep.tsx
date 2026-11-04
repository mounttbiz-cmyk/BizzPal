"use client";

import React, { useState } from "react";
import { AlertTriangle, BadgeCheck, CreditCard, Eye, EyeOff, Info, Loader2, Lock, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { inr, type PaySource, type PayTotal } from "./types";
import { Callout, GhostButton, Pill, PrimaryButton, StepHeader } from "./ui";

type Provider = "razorpay" | "stripe";

interface Props {
  email: string;
  sources: PaySource[];
  total: PayTotal | null;
  onUpdate: (sources: PaySource[], total: PayTotal | null) => void;
  onBack: () => void;
  onNext: () => void;
}

const META: Record<Provider, { name: string; tag: string; help: string }> = {
  razorpay: { name: "Razorpay", tag: "UPI, cards, netbanking", help: "In your Razorpay dashboard open Account & Settings, then API Keys, and use your live key." },
  stripe: { name: "Stripe", tag: "Cards & international", help: "In Stripe open Developers, then API keys, and create a restricted key that can read Charges." },
};

const ago = (iso: string | null) => {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
};

export function PaymentsStep({ email, sources, total, onUpdate, onBack, onNext }: Props) {
  const [open, setOpen] = useState<Provider | null>(null);
  const [keyId, setKeyId] = useState("");
  const [secret, setSecret] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState<{ provider: Provider; message: string; kind?: string } | null>(null);
  const live = sources.filter((s) => s.status === "connected");

  const reset = () => { setKeyId(""); setSecret(""); setShow(false); setError(null); };

  const call = async (method: string, body: object) => {
    const res = await fetch("/api/payments", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, ...body }) });
    let d: any = {};
    try { d = await res.json(); } catch {}
    return { res, d };
  };

  const connect = async (p: Provider) => {
    setBusy(`connect-${p}`); setError(null);
    try {
      const { res, d } = await call("POST", p === "razorpay" ? { provider: p, keyId, keySecret: secret } : { provider: p, apiKey: secret });
      if (res.ok && d.ok) { onUpdate(d.sources, d.total); setOpen(null); reset(); }
      else setError({ provider: p, message: d.error || "Couldn't connect. Please try again.", kind: d.code });
    } catch {
      setError({ provider: p, message: "Couldn't reach the server. Check your connection and try again." });
    } finally { setBusy(""); }
  };

  const refresh = async (p: Provider) => {
    setBusy(`sync-${p}`); setError(null);
    try {
      const { res, d } = await call("PATCH", { provider: p });
      if (res.ok && d.ok) onUpdate(d.sources, d.total);
      else setError({ provider: p, message: d.error || "Couldn't refresh right now." });
    } catch { setError({ provider: p, message: "Couldn't reach the server." }); }
    finally { setBusy(""); }
  };

  const disconnect = async (p: Provider) => {
    setBusy(`del-${p}`);
    try {
      const { d } = await call("DELETE", { provider: p });
      if (d.ok) onUpdate(d.sources, d.total);
    } finally { setBusy(""); }
  };

  const canSubmit = (p: Provider) => (p === "razorpay" ? keyId.trim().length > 8 && secret.trim().length > 7 : secret.trim().length > 15);

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 4 · Payments" title="Connect your payment provider">
        We read your real payments straight from Razorpay or Stripe, so your revenue is never typed in by anyone. We only ever read; we can&apos;t move money.
      </StepHeader>

      {total && (
        <div className="rounded-2xl border border-jade/30 bg-jade/5 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 animate-fade-in">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Verified revenue · last 30 days</div>
            <div className="text-2xl font-bold text-text tracking-tight">{inr(total.revenueInr)}</div>
          </div>
          <div className="text-right">
            <Pill tone="good"><BadgeCheck className="w-3 h-3" />From your provider</Pill>
            <div className="text-[10px] text-text-muted mt-1.5">Updated {ago(total.asOf)}</div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {(["razorpay", "stripe"] as Provider[]).map((p) => {
          const src = sources.find((s) => s.provider === p);
          const isOpen = open === p;
          const snap = src?.snapshot;
          return (
            <div key={p} className={`rounded-2xl border transition-colors ${src ? "border-jade/30 bg-jade/5" : "border-line bg-surface-2/40"}`}>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0"><CreditCard className="w-5 h-5 text-brass" /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-text">{META[p].name}</span>
                      {src && <Pill tone="good">Connected</Pill>}
                    </div>
                    <p className="text-[11px] text-text-muted">{src ? `Key ${src.label}` : META[p].tag}</p>
                  </div>
                </div>
                {src ? (
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => refresh(p)} disabled={!!busy} className="h-9 px-3 rounded-lg border border-line bg-surface text-xs font-semibold hover:border-brass cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50">
                      {busy === `sync-${p}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-brass" />}Sync now
                    </button>
                    <button type="button" onClick={() => disconnect(p)} disabled={!!busy} className="h-9 px-3 rounded-lg border border-line bg-surface text-xs font-semibold text-text-muted hover:text-rust hover:border-rust/50 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50">
                      <Unplug className="w-3.5 h-3.5" />Disconnect
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => { reset(); setOpen(isOpen ? null : p); }} className="h-10 px-4 rounded-xl bg-brass text-bg text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer">
                    {isOpen ? "Cancel" : "Connect"}
                  </button>
                )}
              </div>

              {src && snap && (
                <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] animate-fade-in">
                  <Stat label="Net revenue" value={inr(snap.revenueInr)} strong />
                  <Stat label="Payments" value={String(snap.paymentCount)} />
                  <Stat label="Refunds" value={inr(snap.refundsInr)} />
                  <Stat label="Synced" value={ago(src.syncedAt)} />
                  {snap.otherCurrencyCount > 0 && (
                    <p className="col-span-2 sm:col-span-4 text-text-muted flex items-start gap-1.5"><Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />{snap.otherCurrencyCount} payment{snap.otherCurrencyCount === 1 ? "" : "s"} in other currencies {snap.otherCurrencyCount === 1 ? "isn't" : "aren't"} included. We never guess exchange rates.</p>
                  )}
                  {snap.truncated && (
                    <p className="col-span-2 sm:col-span-4 text-amber flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />Very high volume: we counted the most recent 5,000 payments.</p>
                  )}
                </div>
              )}

              {isOpen && !src && (
                <div className="px-4 pb-4 space-y-3 border-t border-line pt-4 animate-fade-in">
                  <p className="text-[11px] text-text-muted leading-relaxed">{META[p].help}</p>
                  {p === "razorpay" && (
                    <div className="space-y-1.5">
                      <label htmlFor="rzp-id" className="text-xs font-semibold text-text">Key ID</label>
                      <input id="rzp-id" value={keyId} onChange={(e) => setKeyId(e.target.value.trim())} placeholder="rzp_live_…" autoComplete="off" spellCheck={false}
                        className="w-full px-3.5 py-2.5 rounded-lg bg-surface border border-line text-xs font-mono text-text focus:outline-none focus:ring-2 focus:ring-brass" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <label htmlFor="pay-secret" className="text-xs font-semibold text-text">{p === "razorpay" ? "Key Secret" : "Restricted API key"}</label>
                    <div className="relative">
                      <input id="pay-secret" type={show ? "text" : "password"} value={secret} onChange={(e) => setSecret(e.target.value.trim())}
                        onKeyDown={(e) => { if (e.key === "Enter" && canSubmit(p) && !busy) connect(p); }}
                        placeholder={p === "razorpay" ? "Your key secret" : "rk_live_…"} autoComplete="off" spellCheck={false}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-lg bg-surface border border-line text-xs font-mono text-text focus:outline-none focus:ring-2 focus:ring-brass" />
                      <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide key" : "Show key"} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text cursor-pointer">
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error?.provider === p && (
                    <Callout tone={error.kind === "test_mode" ? "warn" : "bad"} icon={<AlertTriangle className="w-4 h-4" />} title={error.kind === "test_mode" ? "That's a test key" : "Couldn't connect"}>{error.message}</Callout>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <PrimaryButton onClick={() => connect(p)} disabled={!canSubmit(p)} loading={busy === `connect-${p}`}>
                      {busy === `connect-${p}` ? `Checking with ${META[p].name}…` : `Verify & connect ${META[p].name}`}
                    </PrimaryButton>
                    <span className="text-[11px] text-text-muted flex items-center gap-1.5"><Lock className="w-3.5 h-3.5 text-jade" />Stored encrypted. Disconnect any time.</span>
                  </div>
                </div>
              )}
              {src && error?.provider === p && (
                <div className="px-4 pb-4"><Callout tone="bad" icon={<AlertTriangle className="w-4 h-4" />} title="Couldn't refresh">{error.message}</Callout></div>
              )}
            </div>
          );
        })}
      </div>

      <Callout tone="info" icon={<ShieldCheck className="w-4 h-4 text-jade" />} title="Why we ask for a key, not a number">
        A key lets us read your actual payments, so the figure is accurate and can&apos;t be edited. Test-mode keys are refused because test payments aren&apos;t real money.
      </Callout>

      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <PrimaryButton id="btn-payments-next" onClick={onNext}>{live.length ? "Continue" : "I'll connect later"}</PrimaryButton>
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">{label}</div>
      <div className={`${strong ? "text-sm font-bold" : "text-xs font-medium"} text-text mt-0.5`}>{value}</div>
    </div>
  );
}

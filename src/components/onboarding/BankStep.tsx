"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, BadgeCheck, Banknote, Building, Info, Loader2, ShieldCheck } from "lucide-react";
import type { BankState, IfscLookup } from "./types";
import { Callout, Fact, GhostButton, Pill, PrimaryButton, StepHeader } from "./ui";

interface Props {
  state: BankState;
  ifsc: string;
  account: string;
  lookup: IfscLookup;
  registeredName: string; // from the GST registry, shown so the user knows what the holder must match
  onIfsc: (v: string) => void;
  onLookup: (l: IfscLookup) => void;
  onAccount: (v: string) => void;
  onVerify: () => void;
  onSkip: () => void;
  onReset: () => void;
  onBack: () => void;
  onNext: () => void;
}

const SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function BankStep({ state, ifsc, account, lookup, registeredName, onIfsc, onLookup, onAccount, onVerify, onSkip, onReset, onBack, onNext }: Props) {
  const checking = state.phase === "checking";
  const verified = state.phase === "verified";
  const shapeOk = SHAPE.test(ifsc);
  const accountOk = /^\d{9,18}$/.test(account);
  const seq = useRef(0);

  // Live bank + branch lookup as soon as the IFSC is the right shape (real, free directory)
  useEffect(() => {
    if (!shapeOk) { if (lookup.phase !== "idle") onLookup({ phase: "idle" }); return; }
    const mine = ++seq.current;
    onLookup({ phase: "looking" });
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/verify/bank?ifsc=${ifsc}`);
        const d = await res.json();
        if (mine !== seq.current) return; // a newer keystroke superseded this lookup
        if (d.status === "found") onLookup({ phase: "found", info: d.record });
        else if (d.status === "not_found") onLookup({ phase: "bad", message: "No bank branch has this IFSC. Check it against your cheque book or statement." });
        else onLookup({ phase: "bad", message: d.reason || "Couldn't check this IFSC right now." });
      } catch {
        if (mine === seq.current) onLookup({ phase: "bad", message: "Couldn't reach the bank directory. Check your connection." });
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ifsc]);

  const canVerify = lookup.phase === "found" && accountOk && !checking;
  const friendlyUnavailable = (r: string) => (/not switched on|credentials/i.test(r) ? "Our account-holder check isn't switched on yet." : r);

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 3 · Bank account" title="Link your business bank account">
        Your bank confirms who the account belongs to, and that name must match your GST-registered business name. That is what proves the account is really yours.
      </StepHeader>

      {registeredName && (
        <div className="px-3.5 py-2.5 rounded-xl bg-surface-2/60 border border-line flex items-center gap-2.5 text-xs">
          <Building className="w-4 h-4 text-brass shrink-0" />
          <span className="text-text-muted">The account holder must match</span>
          <strong className="text-text">{registeredName}</strong>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="ifsc" className="text-xs font-semibold text-text flex items-center justify-between">
            <span>IFSC code</span><span className="text-[10px] font-normal text-text-muted">on your cheque book</span>
          </label>
          <input
            id="ifsc"
            value={ifsc}
            onChange={(e) => onIfsc(e.target.value.replace(/\s/g, "").toUpperCase().slice(0, 11))}
            placeholder="HDFC0001234"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            disabled={checking || verified}
            className={`w-full px-4 py-3 rounded-xl bg-surface-2 border text-sm font-mono tracking-[0.15em] text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brass ${
              ifsc.length === 11 && lookup.phase === "bad" ? "border-rust" : lookup.phase === "found" ? "border-jade/60" : "border-line"
            }`}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="acct" className="text-xs font-semibold text-text flex items-center justify-between">
            <span>Account number</span><span className="text-[10px] font-normal text-text-muted">9 to 18 digits</span>
          </label>
          <input
            id="acct"
            value={account}
            onChange={(e) => onAccount(e.target.value.replace(/\D/g, "").slice(0, 18))}
            onKeyDown={(e) => { if (e.key === "Enter" && canVerify) onVerify(); }}
            placeholder="Enter your account number"
            inputMode="numeric"
            autoComplete="off"
            disabled={checking || verified}
            className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-line text-sm font-mono tracking-[0.12em] text-text placeholder:text-text-muted/50 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brass"
          />
        </div>
      </div>

      {/* Bank + branch found from the IFSC, live */}
      {lookup.phase === "looking" && <p className="text-[11px] text-text-muted flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Looking up your branch…</p>}
      {lookup.phase === "found" && !verified && (
        <div className="px-3.5 py-3 rounded-xl border border-jade/30 bg-jade/5 flex items-start gap-3 animate-fade-in">
          <Banknote className="w-5 h-5 text-jade shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-text">{lookup.info.bank}</div>
            <div className="text-[11px] text-text-muted">{lookup.info.branch}{lookup.info.city ? ` · ${lookup.info.city}` : ""}{lookup.info.state ? `, ${lookup.info.state}` : ""}</div>
          </div>
          <Pill tone="good">Branch found</Pill>
        </div>
      )}
      {lookup.phase === "bad" && (
        <p role="alert" className="text-[11px] text-rust font-medium flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{lookup.message}</p>
      )}

      {!verified && (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={onVerify} disabled={!canVerify} loading={checking}>
            {checking ? "Asking your bank…" : "Verify account holder"}
          </PrimaryButton>
          <span className="text-[11px] text-text-muted flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-jade" />No money is taken from you. We only store the last 4 digits.</span>
        </div>
      )}

      {state.phase === "verified" && (
        <div className="rounded-2xl border border-jade/30 bg-jade/5 p-4 sm:p-5 space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-jade font-bold text-sm"><BadgeCheck className="w-5 h-5" />Account confirmed by your bank</div>
            <Pill tone="good">Name matches</Pill>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            <Fact label="Bank" value={state.bank.bank} />
            <Fact label="Branch" value={state.bank.branch} />
            <Fact label="Account holder (from your bank)" value={state.holderName} />
            <Fact label="Account" value={`•••• ${state.last4}`} mono />
            <Fact label="IFSC" value={state.bank.ifsc} mono />
          </div>
          <button type="button" onClick={onReset} className="text-[11px] text-text-muted hover:text-brass underline decoration-dotted cursor-pointer">
            Use a different bank account
          </button>
        </div>
      )}

      {state.phase === "unavailable" && (
        <Callout tone="warn" icon={<AlertTriangle className="w-4 h-4" />} title="Bank and branch confirmed. Account holder not checked yet">
          {friendlyUnavailable(state.reason)} Your bank account will show as <strong className="text-text">Not yet verified</strong>. You can keep going.
        </Callout>
      )}
      {state.phase === "rejected" && (
        <Callout tone="bad" icon={<AlertTriangle className="w-4 h-4" />} title="We couldn't verify this account">{state.message}</Callout>
      )}
      {state.phase === "error" && (
        <Callout tone="bad" icon={<AlertTriangle className="w-4 h-4" />} title="Something went wrong">{state.message}</Callout>
      )}
      {state.phase === "skipped" && (
        <Callout tone="info" icon={<Info className="w-4 h-4" />} title="Skipped for now">You can link a bank account later from settings. Until then it shows as not verified.</Callout>
      )}

      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <div className="flex items-center gap-2">
          {!verified && <GhostButton onClick={onSkip}>I&apos;ll do this later</GhostButton>}
          <PrimaryButton id="btn-bank-next" onClick={onNext} disabled={!(verified || state.phase === "unavailable" || state.phase === "skipped")}>Continue</PrimaryButton>
        </div>
      </div>
    </div>
  );
}


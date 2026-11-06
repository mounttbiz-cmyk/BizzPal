"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Building2, Info, MapPin, ShieldCheck, Upload } from "lucide-react";
import { checkGstin, normalizeGstin } from "@/lib/verification/gstin";
import type { GstState } from "./types";
import { Callout, Fact, Pill, PrimaryButton, StepHeader } from "./ui";

interface Props {
  state: GstState;
  gstinInput: string;
  companyName: string;
  logoUrl?: string | null;
  onCompanyNameChange: (name: string) => void;
  onLogoChange?: (logo: string | null) => void;
  onInput: (v: string) => void;
  onVerify: () => void;
  onNext: () => void;
}

export function VerifyBusinessStep({ state, gstinInput, companyName, logoUrl, onCompanyNameChange, onLogoChange, onInput, onVerify, onNext }: Props) {
  const [showWhy, setShowWhy] = useState(false);
  const local = useMemo(() => checkGstin(gstinInput), [gstinInput]);
  const typed = normalizeGstin(gstinInput).length > 0;
  const checking = state.phase === "checking";

  const canContinue = (companyName.trim().length > 0) && (state.phase === "verified" || (state.phase === "unavailable" && local.valid));

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 1 · Business verification" title="Let's verify your business">
        Enter your company name and GSTIN. We confirm your legal standing against official corporate records so your business identity is verified.
      </StepHeader>

      {/* Business Name Input */}
      <div className="space-y-1.5 p-4 rounded-2xl border border-line bg-surface-2/30">
        <label htmlFor="company-name" className="text-xs font-semibold text-text flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brass" /> Company / Business Name
          </span>
          <span className="text-[10px] font-normal text-text-muted">Display name for your dashboard & platform</span>
        </label>
        <input
          id="company-name"
          type="text"
          value={companyName}
          onChange={(e) => onCompanyNameChange(e.target.value)}
          placeholder="e.g. Acme Technologies Private Limited"
          className="w-full px-4 py-3 rounded-xl bg-surface border border-line text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brass transition-all font-medium"
        />
        <p className="text-[10px] text-text-muted">
          This will be the official name shown across your executive dashboard, AI advisors, and team workspace.
        </p>
      </div>

      {/* Business Logo Upload */}
      <div className="space-y-2 p-4 rounded-2xl border border-line bg-surface-2/30">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-text flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-brass" /> Business / Brand Logo
          </label>
          {logoUrl && onLogoChange && (
            <button
              type="button"
              onClick={() => onLogoChange(null)}
              className="text-[11px] text-rust hover:underline cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
        <div className="flex items-center gap-3.5 p-3 rounded-xl border border-dashed border-line bg-surface">
          {logoUrl ? (
            <div className="w-12 h-12 shrink-0 flex items-center justify-center">
              <img src={logoUrl} alt="Company logo preview" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line text-text-muted text-[10px] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-text-muted/50" />
            </div>
          )}
          <div className="flex-1 min-w-0 space-y-1">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-2/80 border border-line text-xs font-semibold text-text cursor-pointer transition-colors shadow-2xs">
              <Upload className="w-3.5 h-3.5 text-brass" />
              <span>{logoUrl ? "Change Logo" : "Upload Logo Image"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || !onLogoChange) return;
                  if (file.size > 2 * 1024 * 1024) {
                    alert("Please select an image under 2MB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const res = ev.target?.result as string;
                    if (res) onLogoChange(res);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <p className="text-[10px] text-text-muted">
              Displayed prominently on your executive dashboard and reports. PNG, SVG, or JPG (max 2MB).
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="gstin" className="text-xs font-semibold text-text flex items-center justify-between">
          <span>GSTIN</span>
          <span className="text-[10px] font-normal text-text-muted">15 characters, on your GST certificate</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            id="gstin"
            value={gstinInput}
            onChange={(e) => onInput(normalizeGstin(e.target.value).slice(0, 15))}
            onKeyDown={(e) => { if (e.key === "Enter" && local.valid && !checking) onVerify(); }}
            placeholder="27AAPFU0939F1ZV"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            inputMode="text"
            disabled={checking}
            aria-invalid={typed && !local.valid && gstinInput.length === 15}
            className={`flex-1 px-4 py-3 rounded-xl bg-surface-2 border text-sm font-mono tracking-[0.18em] text-text placeholder:text-text-muted/50 placeholder:tracking-[0.18em] focus:outline-none focus:ring-2 focus:ring-brass ${
              typed && gstinInput.length === 15 && !local.valid ? "border-rust" : local.valid ? "border-jade/60" : "border-line"
            }`}
          />
          <PrimaryButton onClick={onVerify} disabled={!local.valid} loading={checking}>
            {checking ? "Checking registry…" : state.phase === "verified" ? "Check again" : "Verify with GST registry"}
          </PrimaryButton>
        </div>

        {/* Live, local feedback while typing: structure only, clearly not "verified" */}
        {typed && local.valid && state.phase !== "verified" && (
          <p className="text-[11px] text-text-muted flex flex-wrap items-center gap-x-3 gap-y-1 animate-fade-in">
            <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3 text-brass" />{local.state}</span>
            <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3 text-brass" />{local.entityType}</span>
            <span className="font-mono">PAN {local.pan}</span>
            <Pill tone="info">Format OK · not yet verified</Pill>
          </p>
        )}
        {typed && gstinInput.length >= 15 && !local.valid && (
          <p className="text-[11px] text-rust font-medium flex items-center gap-1.5 animate-fade-in">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {local.reason}
          </p>
        )}
      </div>

      {state.phase === "verified" && (
        <div className="rounded-2xl border border-jade/30 bg-jade/5 p-4 sm:p-5 space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-jade font-bold text-sm">
              <BadgeCheck className="w-5 h-5" />
              Confirmed by the GST registry
            </div>
            <Pill tone="good">{state.record.status || "Active"}</Pill>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
            <Fact label="Legal name" value={state.record.legalName} />
            <Fact label="Trade name" value={state.record.tradeName} />
            <Fact label="GSTIN" value={state.gstin} mono />
            <Fact label="Business type" value={state.record.constitution} />
            <Fact label="Registered since" value={state.record.registrationDate} />
            <Fact label="State" value={state.record.state || (local.valid ? local.state : "")} />
            <div className="sm:col-span-2"><Fact label="Registered address" value={state.record.address} /></div>
          </div>
          <p className="text-[11px] text-text-muted flex items-start gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-jade shrink-0 mt-0.5" />
            These details come from the registry and can&apos;t be edited here. If something looks wrong, it needs correcting with the GST department.
          </p>
        </div>
      )}

      {state.phase === "unavailable" && (
        <Callout tone="warn" icon={<AlertTriangle className="w-4 h-4" />} title="We couldn't confirm this GSTIN with the registry yet">
          {/not configured|GST_API_KEY|credentials/i.test(state.reason) ? "Our connection to the GST registry isn't switched on yet." : state.reason}{" "}
          Your number is correctly formed, so you can keep going. Your business will show as <strong className="text-text">Not yet verified</strong> until the registry check succeeds. We never mark a business verified without it.
        </Callout>
      )}

      {state.phase === "error" && (
        <Callout tone="bad" icon={<AlertTriangle className="w-4 h-4" />} title="This GSTIN could not be verified">
          {state.message}
        </Callout>
      )}

      <button
        type="button"
        onClick={() => setShowWhy((v) => !v)}
        className="text-[11px] text-text-muted hover:text-brass inline-flex items-center gap-1.5 cursor-pointer"
        aria-expanded={showWhy}
      >
        <Info className="w-3.5 h-3.5" />
        What does verification check, and what does it not?
      </button>
      {showWhy && (
        <div className="rounded-xl border border-line bg-surface-2/60 p-4 text-[11px] text-text-muted leading-relaxed space-y-2 animate-fade-in">
          <p><strong className="text-text">Checked:</strong> the GSTIN is correctly formed, exists on the GST registry, and is currently Active. Your legal name, address and registration date are read from that record.</p>
          <p><strong className="text-text">Not yet checked:</strong> that you personally run this business. A GSTIN is public information, so the next step asks you to prove you control the company&apos;s website, and linking a business bank account will complete the picture later.</p>
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
        <span className="text-[11px] text-text-muted">{canContinue ? "" : "Verify your GSTIN to continue"}</span>
        <PrimaryButton id="btn-business-next" onClick={onNext} disabled={!canContinue}>
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
}

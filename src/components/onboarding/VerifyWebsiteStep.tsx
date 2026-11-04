"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Globe, Loader2, Mail } from "lucide-react";
import type { DomainState } from "./types";
import { Callout, CopyBox, GhostButton, PrimaryButton, StepHeader } from "./ui";

interface Props {
  state: DomainState;
  domainInput: string;
  onInput: (v: string) => void;
  onStart: () => void;
  onCheck: () => void;
  onSkip: () => void;
  onReset: () => void;
  onBack: () => void;
  onNext: () => void;
}

type Method = "dns" | "file" | "meta";

const METHODS: { id: Method; label: string; hint: string }[] = [
  { id: "dns", label: "DNS record", hint: "Best if you manage your domain settings" },
  { id: "file", label: "Upload a file", hint: "Best if you can upload files to your site" },
  { id: "meta", label: "Add a tag", hint: "Best if you edit your site's HTML" },
];

export function VerifyWebsiteStep({ state, domainInput, onInput, onStart, onCheck, onSkip, onReset, onBack, onNext }: Props) {
  const [method, setMethod] = useState<Method>("dns");
  const working = state.phase === "working";
  const verified = state.phase === "verified";
  const skipped = state.phase === "skipped";

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 2 · Website verification" title="Prove you control your website">
        Anyone can look up a GSTIN, so we also ask you to show you control the company website. Only the real owner can add the code below.
      </StepHeader>

      {!verified && (state.phase === "idle" || state.phase === "working" || state.phase === "error" || skipped) && (
        <div className="space-y-2">
          <label htmlFor="domain" className="text-xs font-semibold text-text flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-brass" />
            Company website
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="domain"
              value={domainInput}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && domainInput.trim() && !working) onStart(); }}
              placeholder="yourcompany.in"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              disabled={working}
              className="flex-1 px-4 py-3 rounded-xl bg-surface-2 border border-line text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-brass"
            />
            <PrimaryButton onClick={onStart} disabled={!domainInput.trim()} loading={working}>
              Get my verification code
            </PrimaryButton>
          </div>
          {state.phase === "error" && (
            <p className="text-[11px] text-rust font-medium flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {state.message}
            </p>
          )}
        </div>
      )}

      {state.phase === "challenge" && (
        <div className="rounded-2xl border border-line bg-surface-2/40 p-4 sm:p-5 space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-text">
              Add your code to <span className="font-mono text-brass">{state.domain}</span> using any one method
            </div>
            <button type="button" onClick={onReset} className="text-[11px] text-text-muted hover:text-brass underline decoration-dotted cursor-pointer">
              Use a different website
            </button>
          </div>

          <div role="tablist" aria-label="Verification method" className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={method === m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`px-2.5 py-2 rounded-lg border text-left cursor-pointer transition-colors ${
                  method === m.id ? "border-brass bg-brass-soft" : "border-line bg-surface hover:border-line-strong"
                }`}
              >
                <div className={`text-[11px] font-bold ${method === m.id ? "text-text" : "text-text-muted"}`}>{m.label}</div>
                <div className="text-[10px] text-text-muted leading-snug mt-0.5 hidden sm:block">{m.hint}</div>
              </button>
            ))}
          </div>

          <div className="space-y-3" role="tabpanel">
            {method === "dns" && (
              <>
                <p className="text-[11px] text-text-muted leading-relaxed">In your domain provider&apos;s DNS settings, add a new <strong className="text-text">TXT</strong> record:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <CopyBox label="Name / Host" value={state.instructions.dns.host} />
                  <CopyBox label="Value" value={state.instructions.dns.value} />
                </div>
                <p className="text-[10px] text-text-muted">Some providers want only <span className="font-mono">_bizzpal</span> as the name. DNS changes can take a few minutes.</p>
              </>
            )}
            {method === "file" && (
              <>
                <p className="text-[11px] text-text-muted leading-relaxed">Create a plain text file containing only the code, and make it available at this address:</p>
                <CopyBox label="File address" value={state.instructions.file.url} />
                <CopyBox label="File contents" value={state.instructions.file.content} />
              </>
            )}
            {method === "meta" && (
              <>
                <p className="text-[11px] text-text-muted leading-relaxed">Paste this tag inside the <span className="font-mono">&lt;head&gt;</span> of your home page:</p>
                <CopyBox label="Meta tag" value={state.instructions.meta.tag} />
              </>
            )}
          </div>

          {state.tried && state.tried.length > 0 && !state.checking && (
            <Callout tone="warn" icon={<AlertTriangle className="w-4 h-4" />} title="We couldn't find your code yet">
              <ul className="list-disc list-inside space-y-0.5">
                {state.tried.map((t) => <li key={t}>{t}</li>)}
              </ul>
            </Callout>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton onClick={onCheck} loading={state.checking}>
              {state.checking ? "Checking your website…" : "I've added it, check now"}
            </PrimaryButton>
            {state.emailMatches ? (
              <span className="text-[11px] text-jade flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Your sign-in email is on this domain</span>
            ) : (
              <span className="text-[11px] text-text-muted flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />Your sign-in email isn&apos;t on this domain</span>
            )}
          </div>
        </div>
      )}

      {verified && (
        <Callout tone="good" icon={<CheckCircle2 className="w-5 h-5" />} title={`You control ${state.domain}`}>
          Confirmed by {state.method === "dns" ? "a DNS record" : state.method === "file" ? "a verification file" : "a meta tag"}.
          {state.emailMatches ? " Your sign-in email also belongs to this domain." : ""}{" "}
          <button type="button" onClick={onReset} className="underline decoration-dotted hover:text-brass cursor-pointer">Use a different website</button>
        </Callout>
      )}

      {state.phase === "working" && (
        <p className="text-[11px] text-text-muted flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" />Preparing your code…</p>
      )}

      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <div className="flex items-center gap-2">
          {!verified && <GhostButton onClick={onSkip}>My business has no website</GhostButton>}
          <PrimaryButton id="btn-website-next" onClick={onNext} disabled={!verified && !skipped}>
            Continue
          </PrimaryButton>
        </div>
      </div>
      {skipped && (
        <p className="text-[11px] text-text-muted -mt-3">You can add a website later. Your business will show as verified by GST registry only.</p>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { CheckCircle2, Lock, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { TOOLS_OPTIONS } from "@/lib/onboarding/data";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { Callout, GhostButton, Pill, PrimaryButton, StepHeader } from "./ui";

export interface ToolAuth { status: "connected" | "connecting" | "idle"; detail?: string }

interface Props {
  auth: Record<string, ToolAuth>;
  onConnect: (toolId: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function ConnectSourcesStep({ auth, onConnect, onBack, onNext }: Props) {
  // Only tools whose connection we can actually verify are offered. Stripe now lives in the Payments step.
  const LIVE = new Set(["google"]);
  const tools = TOOLS_OPTIONS.filter((t) => t.id !== "stripe");
  const connected = tools.filter((t) => auth[t.id]?.status === "connected").length;

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 6 · Other tools" title="Connect your other tools">
        We only show a tool as connected when we have really verified the connection. Tools marked &quot;Coming soon&quot; aren&apos;t available yet, and nothing is faked in the meantime.
      </StepHeader>

      <div className="space-y-3">
        {tools.map((tool) => {
          const isOn = auth[tool.id]?.status === "connected";
          const isLive = LIVE.has(tool.id);
          return (
            <div
              key={tool.id}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                isOn ? "bg-jade/5 border-jade/30" : isLive ? "bg-surface-2/40 border-line hover:border-line-strong" : "bg-surface-2/20 border-line opacity-70"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2 rounded-xl bg-surface border border-line shrink-0"><ToolLogo toolId={tool.id} size={30} /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-text">{tool.name}</span>
                    {isOn && <Pill tone="good">Connected</Pill>}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed mt-0.5">
                    {isOn && auth[tool.id]?.detail ? <span className="text-jade font-medium">{auth[tool.id].detail}</span> : tool.description}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onConnect(tool.id)}
                disabled={!isLive}
                className={`shrink-0 h-10 px-4 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 btn-tactile transition ${
                  !isLive ? "cursor-not-allowed" : "cursor-pointer"
                } ${
                  isOn
                    ? "bg-surface border border-line text-text hover:border-brass"
                    : isLive
                    ? "bg-brass text-bg hover:brightness-110 shadow-sm"
                    : "bg-surface border border-line text-text-muted"
                }`}
              >
                {isOn ? <><SlidersHorizontal className="w-3.5 h-3.5 text-brass" />Manage</> : isLive ? "Connect" : "Coming soon"}
              </button>
            </div>
          );
        })}
      </div>

      <Callout tone="info" icon={<ShieldCheck className="w-4 h-4 text-jade" />} title="Your data stays yours">
        <span className="inline-flex flex-wrap gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1"><Lock className="w-3 h-3" />Read-only access</span>
          <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Disconnect any time</span>
        </span>
      </Callout>

      <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-muted hidden sm:inline">{connected === 0 ? "You can connect tools later" : `${connected} connected`}</span>
          <PrimaryButton id="btn-sources-next" onClick={onNext}>{connected === 0 ? "Skip for now" : "Continue"}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, BadgeCheck, Loader2, ShieldCheck } from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { Callout } from "@/components/onboarding/ui";

type Info = { ok: true; business: string; role: string; email: string; status: "invited" | "verified" } | { ok: false; error: string };
type Outcome = { decision: string; email: string } | null;

const MESSAGES: Record<string, { tone: "good" | "warn" | "bad"; title: string; body: (email: string, invited: string) => string }> = {
  ok: { tone: "good", title: "You're confirmed", body: () => "Your work email has been verified. You can close this page." },
  already: { tone: "good", title: "Already confirmed", body: () => "You've already confirmed this invite. You're all set." },
  wrong_email: { tone: "warn", title: "That's a different email", body: (email, invited) => `You signed in as ${email}, but this invite was sent to ${invited}. Please sign in with that Google account instead.` },
  email_not_verified: { tone: "bad", title: "Google hasn't verified that email", body: () => "We can only confirm emails that Google has verified. Please use a verified Google account." },
  revoked: { tone: "bad", title: "This invite was cancelled", body: () => "Ask the person who invited you to send a new link." },
  invalid: { tone: "bad", title: "This invite link isn't valid", body: () => "Check you copied the whole link, or ask for a new one." },
};

export default function JoinPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [info, setInfo] = useState<Info | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/team/invites?token=${encodeURIComponent(token)}`);
      setInfo(await res.json());
    } catch {
      setInfo({ ok: false, error: "Couldn't load this invite. Check your connection and try again." });
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin || ev.data?.type !== "BIZZPAL_INVITE_RESULT") return;
      setBusy(false);
      setOutcome({ decision: String(ev.data.decision), email: String(ev.data.email || "") });
      load();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [load]);

  const verify = () => {
    setBusy(true);
    setOutcome(null);
    const w = 540, h = 680;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open(
      `/api/integrations/google/connect?source=invite&invite=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(`/join/${token}`)}`,
      "BizzPalInvite",
      `width=${w},height=${h},left=${left},top=${top}`
    );
    const timer = setInterval(() => { if (!popup || popup.closed) { clearInterval(timer); setBusy(false); } }, 800);
  };

  const invited = info && info.ok ? info.email : "";
  const msg = outcome ? MESSAGES[outcome.decision] || MESSAGES.invalid : null;

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="h-14 border-b border-line bg-surface/60 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center p-1">
            <Image src="/logo.png" alt="BizzPal" width={24} height={24} className="object-contain" />
          </div>
          <span className="font-extrabold text-sm tracking-tight">Bizz<span className="text-brass">Pal</span></span>
        </div>
        <div className="w-32"><ThemeSwitch compact /></div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-line bg-surface shadow-theme space-y-5">
          {!info && <div className="text-xs text-text-muted flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading your invite…</div>}

          {info && !info.ok && (
            <Callout tone="bad" icon={<AlertTriangle className="w-4 h-4" />} title="This invite link isn't valid">
              {info.error}
            </Callout>
          )}

          {info && info.ok && (
            <>
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brass-soft text-brass text-[10px] font-bold uppercase tracking-wider">Team invite</span>
                <h1 className="text-xl font-bold tracking-tight">Join {info.business}</h1>
                <p className="text-xs text-text-muted leading-relaxed">
                  You&apos;ve been invited as <strong className="text-text">{info.role}</strong>. To confirm you really work here, sign in with the Google account for <span className="font-mono text-text">{info.email}</span>.
                </p>
              </div>

              {info.status === "verified" && !msg && (
                <Callout tone="good" icon={<BadgeCheck className="w-5 h-5" />} title="Already confirmed">This invite has been confirmed. You&apos;re all set.</Callout>
              )}

              {msg && (
                <Callout tone={msg.tone} icon={msg.tone === "good" ? <BadgeCheck className="w-5 h-5" /> : <AlertTriangle className="w-4 h-4" />} title={msg.title}>
                  {msg.body(outcome!.email, invited)}
                </Callout>
              )}

              {info.status !== "verified" && outcome?.decision !== "ok" && (
                <button
                  type="button"
                  onClick={verify}
                  disabled={busy}
                  className="w-full h-11 rounded-xl bg-brass text-bg font-bold text-xs hover:brightness-110 btn-tactile inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  {busy ? "Waiting for Google…" : "Verify with Google"}
                </button>
              )}
              <p className="text-[10px] text-text-muted leading-relaxed">We only read your verified email address. We never see your password or Google data.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

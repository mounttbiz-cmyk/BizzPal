"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, BadgeCheck, Check, Clock, Copy, Info, Loader2, MessageCircle, Plus, Users, X } from "lucide-react";
import type { InviteRow } from "./types";
import { Callout, GhostButton, Pill, PrimaryButton, StepHeader } from "./ui";

interface Props {
  email: string;
  businessName: string;
  invites: InviteRow[];
  onUpdate: (invites: InviteRow[]) => void;
  onBack: () => void;
  onNext: () => void;
}

const ROLES = ["Executive", "Manager", "Operator"];

export function TeamStep({ email, businessName, invites, onUpdate, onBack, onNext }: Props) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Operator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [justConfirmed, setJustConfirmed] = useState<string | null>(null);
  const prev = useRef<Record<string, string>>({});

  const confirmed = invites.filter((i) => i.status === "verified").length;
  const waiting = invites.length - confirmed;

  // Live updates: poll while there are invites still waiting, and announce when someone confirms.
  useEffect(() => {
    if (waiting === 0) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/team/invites?email=${encodeURIComponent(email)}`);
        const d = await res.json();
        if (Array.isArray(d.invites)) onUpdate(d.invites);
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [waiting, email, onUpdate]);

  useEffect(() => {
    for (const i of invites) {
      if (prev.current[i.id] === "invited" && i.status === "verified") {
        setJustConfirmed(i.name || i.email);
        setTimeout(() => setJustConfirmed(null), 4500);
      }
      prev.current[i.id] = i.status;
    }
  }, [invites]);

  const add = async () => {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/team/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, inviteEmail, name, role }) });
      const d = await res.json();
      if (res.ok && d.ok) { onUpdate(d.invites); setInviteEmail(""); setName(""); }
      else setError(d.error || "Couldn't create the invite.");
    } catch { setError("Couldn't reach the server. Please try again."); }
    finally { setBusy(false); }
  };

  const revoke = async (id: string) => {
    try {
      const res = await fetch("/api/team/invites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, id }) });
      const d = await res.json();
      if (d.ok) onUpdate(d.invites);
    } catch {}
  };

  const fullLink = (l: string) => `${window.location.origin}${l}`;
  const copy = async (i: InviteRow) => {
    try { await navigator.clipboard.writeText(fullLink(i.link)); setCopied(i.id); setTimeout(() => setCopied(""), 1600); } catch {}
  };
  const whatsapp = (i: InviteRow) =>
    `https://wa.me/?text=${encodeURIComponent(`Hi${i.name ? " " + i.name : ""}, please confirm you're part of ${businessName || "our team"} on BizzPal: ${fullLink(i.link)}`)}`;

  return (
    <div className="space-y-6">
      <StepHeader eyebrow="Step 5 · Your team" title="Add the people who work with you">
        Nobody types a headcount. Each teammate confirms by signing in with their own Google account, so only real, verified people are counted.
      </StepHeader>

      <div className="rounded-2xl border border-line bg-surface-2/40 p-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center"><Users className="w-5 h-5 text-brass" /></div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Teammates confirmed</div>
            <div className="text-xl font-bold text-text leading-tight">{confirmed} <span className="text-xs font-normal text-text-muted">{confirmed === 0 ? "none yet" : "verified by Google"}</span></div>
          </div>
        </div>
        {waiting > 0 && (
          <div className="flex items-center gap-2 text-xs text-text-muted"><Clock className="w-4 h-4 text-amber" />{waiting} waiting for confirmation<Loader2 className="w-3 h-3 animate-spin ml-1" /></div>
        )}
      </div>

      {justConfirmed && (
        <Callout tone="good" icon={<BadgeCheck className="w-5 h-5" />} title={`${justConfirmed} just confirmed`}>They&apos;re now counted in your team.</Callout>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto_auto] gap-2.5 items-end">
        <div className="space-y-1.5 sm:col-span-1">
          <label htmlFor="inv-email" className="text-xs font-semibold text-text">Work email</label>
          <input id="inv-email" type="email" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && inviteEmail.trim() && !busy) add(); }}
            placeholder="priya@yourcompany.in" autoComplete="off"
            className="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="inv-name" className="text-xs font-semibold text-text">Name <span className="font-normal text-text-muted">(optional)</span></label>
          <input id="inv-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && inviteEmail.trim() && !busy) add(); }} placeholder="Priya Sharma"
            className="w-full px-3.5 py-2.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="inv-role" className="text-xs font-semibold text-text">Role</label>
          <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full sm:w-32 px-3 py-2.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:ring-2 focus:ring-brass cursor-pointer">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        <button type="button" onClick={add} disabled={busy || !inviteEmail.trim()}
          className="h-10 px-4 rounded-lg bg-brass text-bg text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}Invite
        </button>
      </div>
      {error && <p role="alert" className="text-[11px] text-rust font-medium flex items-center gap-1.5 -mt-3"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}</p>}

      {invites.length > 0 && (
        <ul className="space-y-2.5" aria-label="Invited teammates">
          {invites.map((i) => (
            <li key={i.id} className={`rounded-xl border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in ${i.status === "verified" ? "border-jade/30 bg-jade/5" : "border-line bg-surface-2/40"}`}>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-text truncate">{i.name || i.email}</span>
                  <Pill tone="info">{i.role}</Pill>
                  {i.status === "verified" ? <Pill tone="good"><Check className="w-3 h-3" />Confirmed</Pill> : <Pill tone="warn"><Clock className="w-3 h-3" />Waiting</Pill>}
                  {i.sameDomain === false && <Pill tone="info">Different domain</Pill>}
                </div>
                {i.name && <div className="text-[11px] text-text-muted mt-0.5">{i.email}</div>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {i.status !== "verified" && (
                  <>
                    <button type="button" onClick={() => copy(i)} className="h-8 px-3 rounded-lg border border-line bg-surface text-[11px] font-semibold hover:border-brass cursor-pointer inline-flex items-center gap-1.5">
                      {copied === i.id ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}{copied === i.id ? "Copied" : "Copy link"}
                    </button>
                    <a href={whatsapp(i)} target="_blank" rel="noopener noreferrer" className="h-8 px-3 rounded-lg border border-line bg-surface text-[11px] font-semibold hover:border-jade cursor-pointer inline-flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-jade" />WhatsApp
                    </a>
                  </>
                )}
                <button type="button" onClick={() => revoke(i.id)} aria-label={`Remove ${i.name || i.email}`} className="h-8 w-8 rounded-lg border border-line bg-surface text-text-muted hover:text-rust hover:border-rust/50 cursor-pointer inline-flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Callout tone="info" icon={<Info className="w-4 h-4" />} title="How confirmation works">
        Send each person their link. They open it and sign in with the Google account for that email. If the email doesn&apos;t match, or Google hasn&apos;t verified it, they&apos;re not counted. You can keep going and they&apos;ll be added as they confirm.
      </Callout>

      <div className="pt-4 border-t border-line flex items-center justify-between gap-3">
        <GhostButton onClick={onBack}>Back</GhostButton>
        <PrimaryButton id="btn-team-next" onClick={onNext}>{invites.length === 0 ? "Just me for now" : "Continue"}</PrimaryButton>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export interface YtContact {
  value: string;
  source: string;
  kind?: "business" | "personal" | "named";
  deliverable?: boolean | null;
  role?: "manager" | "business";
  label?: string;
}

export interface YtChannel {
  channelId: string;
  title: string;
  handle: string | null;
  url: string;
  thumbnail: string | null;
  country: string | null;
  subscribers: number | null;
  videos: number | null;
  description: string;
  keywords: string[];
  topics: string[];
  emails: YtContact[];
  phones: YtContact[];
  links: Array<{ url: string; label: string }>;
  socials: Array<{ platform: string; url: string; handle: string | null }>;
  management: { name: string | null } | null;
  language: string | null;
  activity: {
    lastUploadAt: string | null;
    status: "active" | "recent" | "inactive" | "unknown";
    uploadsPerMonth: number | null;
    avgViews: number | null;
    engagementPct: number | null;
    sponsoredVideos: number;
    sampled: number;
    recent: Array<{ title: string; url: string; views: number | null; publishedAt: string | null }>;
  } | null;
}

export const compact = (n: number | null | undefined) =>
  n === null || n === undefined ? "n/a" : new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export function ago(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days < 1) return "today";
  if (days < 31) return `${days} day${days === 1 ? "" : "s"} ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) === 1 ? "" : "s"} ago`;
  return `${Math.floor(days / 365)} year${Math.floor(days / 365) === 1 ? "" : "s"} ago`;
}

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: "Active", cls: "bg-jade/10 text-jade border-jade/30" },
  recent: { label: "Posted in last 3 months", cls: "bg-caution/10 text-caution border-caution/30" },
  inactive: { label: "Inactive", cls: "bg-rust/10 text-rust border-rust/30" },
};

export const SAVED_STATUSES: Array<{ id: string; label: string }> = [
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "replied", label: "Replied" },
  { id: "deal", label: "Deal done" },
  { id: "not_interested", label: "Not interested" },
];

interface Props {
  channel: YtChannel;
  fit?: { score: number; reason: string } | null;
  fitLoading?: boolean;
  /** When saved: its status and note, with ways to change them */
  saved?: { status: string; note: string } | null;
  onSave?: () => void;
  onRemove?: () => void;
  onStatusChange?: (status: string) => void;
  onNoteSave?: (note: string) => void;
  /** Writes a message with AI. Receives nothing and returns the draft */
  onDraft?: () => Promise<{ subject: string; email: string; whatsapp: string } | string>;
  /** Sends an email to one of the creator's addresses. Returns an error message, or null when it was sent */
  onSendEmail?: (to: string, subject: string, body: string) => Promise<string | null>;
}

export function YouTubeChannelCard({ channel: c, fit, fitLoading, saved, onSave, onRemove, onStatusChange, onNoteSave, onDraft, onSendEmail }: Props) {
  const [copied, setCopied] = useState("");
  const [showVideos, setShowVideos] = useState(false);
  const [draft, setDraft] = useState<{ subject: string; email: string; whatsapp: string } | null>(null);
  const [draftError, setDraftError] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [note, setNote] = useState(saved?.note || "");
  const [composeTo, setComposeTo] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const a = c.activity;

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(""), 1500); } catch {}
  };

  const writeDraft = async () => {
    if (!onDraft) return;
    setDrafting(true);
    setDraftError("");
    try {
      const r = await onDraft();
      if (typeof r === "string") setDraftError(r); else setDraft(r);
    } finally {
      setDrafting(false);
    }
  };

  const openCompose = (to: string) => {
    setComposeTo(to);
    setSendError("");
    setSentTo("");
    if (!subject && draft) setSubject(draft.subject);
    if (!body && draft) setBody(draft.email);
  };

  const send = async () => {
    if (!onSendEmail || !composeTo) return;
    setSending(true);
    setSendError("");
    const error = await onSendEmail(composeTo, subject, body);
    setSending(false);
    if (error) setSendError(error);
    else {
      setSentTo(composeTo);
      setComposeTo(null);
      setConfirmed(false);
    }
  };

  const badge = a ? STATUS_BADGE[a.status] : undefined;
  const hasContact = c.emails.length > 0 || c.phones.length > 0;
  const btn = "text-sm text-text-muted hover:text-text cursor-pointer";
  const link = "text-sm text-brass hover:underline cursor-pointer";
  const input = "w-full px-3 py-2 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass";
  const meta = [
    c.subscribers !== null ? `${compact(c.subscribers)} subscribers` : null,
    a?.avgViews != null ? `${compact(a.avgViews)} avg views` : null,
    a?.engagementPct != null ? `${a.engagementPct}% engagement` : null,
    a?.uploadsPerMonth != null ? `${a.uploadsPerMonth} uploads a month` : null,
    a?.lastUploadAt ? `last upload ${ago(a.lastUploadAt)}` : null,
  ].filter(Boolean);
  const sub = [c.language, c.country, a && a.sponsoredVideos > 0 ? `brand deals in ${a.sponsoredVideos} of last ${a.sampled} videos` : null].filter(Boolean);

  const sourceOf = (m: YtContact) => [m.label, m.source === "Description" ? "channel description" : m.source, m.deliverable === false ? "domain cannot receive email" : null].filter(Boolean).join(" · ");

  return (
    <div className="rounded-xl border border-line bg-surface px-5 py-4 space-y-3.5">
      <div className="flex items-start gap-3.5">
        {c.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumbnail} alt="" className="w-11 h-11 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-11 h-11 rounded-full bg-surface-2 shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-text hover:text-brass">{c.title}</a>
            {c.handle && <span className="text-sm text-text-muted">{c.handle}</span>}
            {badge && <span className={`text-xs ${a?.status === "inactive" ? "text-rust" : a?.status === "active" ? "text-jade" : "text-text-muted"}`}>{a?.status === "recent" ? "Posted recently" : badge.label}</span>}
          </div>
          {meta.length > 0 && <p className="text-sm text-text-muted mt-0.5">{meta.join("  ·  ")}</p>}
          {sub.length > 0 && <p className="text-xs text-text-muted mt-0.5">{sub.join("  ·  ")}</p>}
        </div>
        {(fit || fitLoading) && (
          <div className="shrink-0 text-right">
            {fitLoading && !fit ? (
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
            ) : fit ? (
              <>
                <p className="text-xl font-semibold text-text leading-none">{fit.score}</p>
                <p className="text-xs text-text-muted mt-1">fit score</p>
              </>
            ) : null}
          </div>
        )}
      </div>

      {fit && <p className="text-sm text-text-muted">{fit.reason}</p>}

      {c.management && (
        <p className="text-sm text-text">
          <span className="font-medium">Management{c.management.name ? `: ${c.management.name}` : ""}.</span>{" "}
          <span className="text-text-muted">Only the manager&apos;s contact is shown.</span>
        </p>
      )}

      <div className="border-t border-line pt-3.5 space-y-2.5">
        {hasContact ? (
          <>
            {c.emails.map(m => (
              <div key={m.value} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="w-14 text-xs text-text-muted shrink-0">Email</span>
                <a href={`mailto:${m.value}`} className="text-sm text-text hover:text-brass break-all">{m.value}</a>
                <span className="text-xs text-text-muted">{sourceOf(m)}</span>
                <span className="ml-auto flex items-center gap-3">
                  {onSendEmail && m.deliverable !== false && <button type="button" onClick={() => openCompose(m.value)} className={link}>Send email</button>}
                  <button type="button" onClick={() => copy(m.value)} className="text-xs text-text-muted hover:text-text cursor-pointer">{copied === m.value ? "Copied" : "Copy"}</button>
                </span>
              </div>
            ))}
            {c.phones.map(m => (
              <div key={m.value} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="w-14 text-xs text-text-muted shrink-0">Phone</span>
                <a href={`tel:${m.value.replace(/\s/g, "")}`} className="text-sm text-text hover:text-brass">{m.value}</a>
                <span className="text-xs text-text-muted">{sourceOf(m)}</span>
                <span className="ml-auto flex items-center gap-3">
                  <a href={waLink(m.value)} target="_blank" rel="noopener noreferrer" className={link}>WhatsApp</a>
                  <button type="button" onClick={() => copy(m.value)} className="text-xs text-text-muted hover:text-text cursor-pointer">{copied === m.value ? "Copied" : "Copy"}</button>
                </span>
              </div>
            ))}
          </>
        ) : (
          <p className="text-sm text-text-muted">{c.management ? "The manager's email and phone are not listed." : "No public email or phone found."}</p>
        )}
        {(c.socials.length > 0 || c.links.length > 0) && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <span className="w-14 text-xs text-text-muted shrink-0">Links</span>
            <span className="flex flex-wrap gap-x-4 gap-y-0.5">
              {c.socials.map(x => (
                <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="text-sm text-text hover:text-brass">{x.platform}</a>
              ))}
              {c.links.filter(l => !c.socials.some(x => x.url === l.url)).slice(0, 4).map(l => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="text-sm text-text hover:text-brass">{l.label}</a>
              ))}
            </span>
          </div>
        )}
      </div>

      {sentTo && <p className="text-sm text-jade">Email sent to {sentTo}. Replies come to your own inbox.</p>}

      {composeTo && (
        <div className="rounded-lg border border-line bg-surface-2/50 p-4 space-y-3">
          <p className="text-sm font-medium text-text">Email {composeTo}</p>
          <input type="text" value={subject} onChange={e => setSubject(e.target.value)} maxLength={120} placeholder="Subject" className={input} />
          <textarea rows={7} value={body} onChange={e => setBody(e.target.value)} maxLength={2000} placeholder="Write your message, or use Write message with AI for a starting point." className={input} />
          <p className="text-xs text-text-muted">
            Sent in your name; replies go to your inbox. A sender line and an unsubscribe link are added. Daily limits apply, and an address can be emailed once every two weeks.
          </p>
          <label className="flex items-start gap-2 text-sm text-text cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 accent-[#8a6414]" />
            <span>This is genuine business outreach and I am allowed to contact this person.</span>
          </label>
          {sendError && <p className="text-sm text-rust">{sendError}</p>}
          <div className="flex items-center gap-4">
            <button type="button" onClick={send} disabled={sending || !confirmed || subject.trim().length < 3 || body.trim().length < 20}
              className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2">
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}Send
            </button>
            <button type="button" onClick={() => setComposeTo(null)} className={btn}>Cancel</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
        {saved ? (
          <>
            <select value={saved.status} onChange={e => onStatusChange?.(e.target.value)} aria-label="Status"
              className="px-2.5 py-1 rounded-lg border border-line bg-surface text-sm text-text cursor-pointer focus:outline-hidden focus:border-brass">
              {SAVED_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button type="button" onClick={onRemove} className="text-sm text-text-muted hover:text-rust cursor-pointer">Remove</button>
          </>
        ) : onSave ? (
          <button type="button" onClick={onSave} className={link}>Save</button>
        ) : null}
        {onDraft && (
          <button type="button" onClick={writeDraft} disabled={drafting} className={`${link} disabled:opacity-50 inline-flex items-center gap-1.5`}>
            {drafting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}Write message with AI
          </button>
        )}
        {a && a.recent.length > 0 && (
          <button type="button" onClick={() => setShowVideos(v => !v)} className={btn}>{showVideos ? "Hide videos" : `Latest videos (${a.recent.length})`}</button>
        )}
      </div>
      {draftError && <p className="text-sm text-rust">{draftError}</p>}

      {showVideos && a && (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {a.recent.map(v => (
            <li key={v.url} className="px-3.5 py-2 flex items-center justify-between gap-3 text-sm">
              <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-text hover:text-brass truncate">{v.title}</a>
              <span className="text-xs text-text-muted whitespace-nowrap">{compact(v.views)} views · {ago(v.publishedAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="rounded-lg bg-surface-2/50 p-4 space-y-3 text-sm">
          <p className="text-xs text-text-muted">Suggested message. Read and edit it before you send.</p>
          <div>
            <p className="text-xs text-text-muted mb-1">Email · {draft.subject}</p>
            <p className="whitespace-pre-wrap text-text">{draft.email}</p>
            <button type="button" onClick={() => copy(`Subject: ${draft.subject}\n\n${draft.email}`)} className="mt-1.5 text-xs text-text-muted hover:text-text cursor-pointer">{copied.startsWith("Subject:") ? "Copied" : "Copy email"}</button>
          </div>
          {draft.whatsapp && (
            <div>
              <p className="text-xs text-text-muted mb-1">WhatsApp</p>
              <p className="whitespace-pre-wrap text-text">{draft.whatsapp}</p>
              <button type="button" onClick={() => copy(draft.whatsapp)} className="mt-1.5 text-xs text-text-muted hover:text-text cursor-pointer">{copied === draft.whatsapp ? "Copied" : "Copy message"}</button>
            </div>
          )}
        </div>
      )}

      {saved && onNoteSave && (
        <textarea rows={2} value={note} onChange={e => setNote(e.target.value)} onBlur={() => note !== saved.note && onNoteSave(note)} maxLength={500}
          placeholder="Add a note, for example: asked for rates, call on Monday" className={input} />
      )}
    </div>
  );
}

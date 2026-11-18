"use client";

import { useState, type ReactNode } from "react";
import { Copy, ExternalLink, Loader2, Sparkles } from "lucide-react";

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

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div title={hint}>
      <p className="text-xs text-text-muted">{label}</p>
      <p className="text-sm font-medium text-text">{value}</p>
    </div>
  );
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
  const tags = [...c.keywords, ...c.topics].filter((t, i, all) => all.findIndex(x => x.toLowerCase() === t.toLowerCase()) === i).slice(0, 8);

  return (
    <div className="rounded-2xl border border-line bg-surface p-5 space-y-4">
      <div className="flex items-start gap-4">
        {c.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.thumbnail} alt="" className="w-14 h-14 rounded-full border border-line object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-surface-2 border border-line shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h3 className="text-base font-semibold text-text">{c.title}</h3>
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brass hover:underline inline-flex items-center gap-1">
              {c.handle || "Open channel"} <ExternalLink className="w-3 h-3" />
            </a>
            {badge && <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.cls}`}>{badge.label}</span>}
            {c.language && <span className="text-xs px-2 py-0.5 rounded-full border border-line bg-surface-2 text-text-muted">{c.language}</span>}
            {a && a.sponsoredVideos > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-line bg-surface-2 text-text" title="Some of the latest videos mention sponsors, ads or promo codes">
                Does brand deals ({a.sponsoredVideos} of last {a.sampled})
              </span>
            )}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map(t => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted">{t}</span>)}
            </div>
          )}
        </div>

        {(fit || fitLoading) && (
          <div className="shrink-0 w-28 text-right">
            {fitLoading && !fit ? (
              <p className="text-xs text-text-muted inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Rating…</p>
            ) : fit ? (
              <>
                <p className="text-xs text-text-muted inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-brass" />AI fit</p>
                <p className="text-xl font-semibold text-text leading-tight">{fit.score}<span className="text-xs font-normal text-text-muted">/100</span></p>
                <div className="h-1.5 rounded-full bg-surface-2 mt-1 overflow-hidden"><div className="h-full bg-brass" style={{ width: `${fit.score}%` }} /></div>
              </>
            ) : null}
          </div>
        )}
      </div>

      {fit && <p className="text-sm text-text-muted"><span className="text-xs font-medium text-brass">AI suggestion: </span>{fit.reason}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 rounded-xl bg-surface-2/60 border border-line p-4">
        <Stat label="Subscribers" value={compact(c.subscribers)} />
        <Stat label="Avg views / video" value={compact(a?.avgViews)} hint="Average over the latest videos" />
        <Stat label="Engagement" value={a?.engagementPct === null || a?.engagementPct === undefined ? "n/a" : `${a.engagementPct}%`} hint="Likes and comments as a percentage of views" />
        <Stat label="Uploads / month" value={a?.uploadsPerMonth ?? "n/a"} />
        <Stat label="Last upload" value={ago(a?.lastUploadAt)} />
      </div>

      {c.management && (
        <div className="rounded-xl border border-brass/40 bg-brass/5 px-4 py-3 text-sm text-text">
          <span className="font-medium">Management contact{c.management.name ? `: ${c.management.name}` : ""}.</span>{" "}
          <span className="text-text-muted">This creator lists a manager or agency, so only that contact is shown.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-surface-2/60 border border-line p-4">
          <p className="text-xs font-medium text-text-muted mb-2">{c.management ? "Management email" : "Email"}</p>
          {c.emails.length > 0 ? (
            <ul className="space-y-2.5">
              {c.emails.map(m => (
                <li key={m.value} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <a href={`mailto:${m.value}`} className="text-text hover:text-brass break-all">{m.value}</a>
                    <span className="flex items-center gap-3 shrink-0">
                      {onSendEmail && m.deliverable !== false && (
                        <button type="button" onClick={() => openCompose(m.value)} className="text-xs text-brass hover:underline cursor-pointer">Email</button>
                      )}
                      <button type="button" onClick={() => copy(m.value)} className="text-xs text-text-muted hover:text-text cursor-pointer inline-flex items-center gap-1">
                        <Copy className="w-3 h-3" /> {copied === m.value ? "Copied" : "Copy"}
                      </button>
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">
                    {m.label ? `${m.label} · ` : ""}From {m.source === "Description" ? "the channel description" : m.source}
                    {m.kind === "business" ? " · Role address" : m.kind === "personal" ? " · Personal address" : ""}
                  </p>
                  {m.deliverable === true && <p className="text-xs text-jade">Domain can receive email</p>}
                  {m.deliverable === false && <p className="text-xs text-rust">This domain cannot receive email. Check the spelling.</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">{c.management ? "The manager's email is not listed." : "No email found. Many channels keep it behind YouTube&apos;s “View email address” button, which can&apos;t be read here."}</p>
          )}
        </div>

        <div className="rounded-xl bg-surface-2/60 border border-line p-4">
          <p className="text-xs font-medium text-text-muted mb-2">{c.management ? "Management phone / WhatsApp" : "Phone / WhatsApp"}</p>
          {c.phones.length > 0 ? (
            <ul className="space-y-2.5">
              {c.phones.map(m => (
                <li key={m.value} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <a href={`tel:${m.value.replace(/\s/g, "")}`} className="text-text hover:text-brass">{m.value}</a>
                    <span className="flex items-center gap-3 shrink-0">
                      <a href={waLink(m.value)} target="_blank" rel="noopener noreferrer" className="text-xs text-brass hover:underline">WhatsApp</a>
                      <button type="button" onClick={() => copy(m.value)} className="text-xs text-text-muted hover:text-text cursor-pointer inline-flex items-center gap-1">
                        <Copy className="w-3 h-3" /> {copied === m.value ? "Copied" : "Copy"}
                      </button>
                    </span>
                  </div>
                  <p className="text-xs text-text-muted">{m.label ? `${m.label} · ` : ""}From {m.source === "Description" ? "the channel description" : m.source}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">{c.management ? "The manager's number is not listed." : "No phone number found."}</p>
          )}
        </div>

        <div className="rounded-xl bg-surface-2/60 border border-line p-4">
          <p className="text-xs font-medium text-text-muted mb-2">Links</p>
          {c.links.length > 0 ? (
            <ul className="space-y-1.5">
              {c.links.map(l => (
                <li key={l.url} className="text-sm">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-text hover:text-brass">
                    <span className="text-text-muted">{l.label}: </span>
                    <span className="break-all">{l.url.replace(/^https?:\/\/(www\.)?/, "")}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-muted">No links in the description.</p>
          )}
        </div>
      </div>

      {c.socials.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-text-muted mr-1">Reach them on</span>
          {c.socials.map(x => (
            <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full border border-line bg-surface text-sm text-text hover:border-brass hover:text-brass">
              {x.platform}{x.handle ? ` ${x.handle}` : ""}
            </a>
          ))}
        </div>
      )}

      {sentTo && <p className="text-sm text-jade">Email sent to {sentTo}. Replies will come to your own inbox, and this creator is marked as contacted.</p>}

      {composeTo && (
        <div className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-3">
          <p className="text-sm font-medium text-text">Email {composeTo}</p>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            maxLength={120}
            placeholder="Subject"
            className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass"
          />
          <textarea
            rows={7}
            value={body}
            onChange={e => setBody(e.target.value)}
            maxLength={2000}
            placeholder="Write your message. Use Write a message with AI above to get a starting point, then edit it."
            className="w-full px-3 py-2 rounded-xl border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass"
          />
          <p className="text-xs text-text-muted">
            It is sent in your name. Replies go to your own email. A line saying who sent it and an unsubscribe link are added at the bottom. You can send a limited number of emails a day, and the same address can be emailed once every two weeks.
          </p>
          <label className="flex items-start gap-2 text-sm text-text cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 accent-[#8a6414]" />
            <span>This is genuine business outreach, not spam, and I am allowed to contact this person.</span>
          </label>
          {sendError && <p className="text-sm text-rust">{sendError}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={send}
              disabled={sending || !confirmed || subject.trim().length < 3 || body.trim().length < 20}
              className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2"
            >
              {sending && <Loader2 className="w-4 h-4 animate-spin" />}Send email
            </button>
            <button type="button" onClick={() => setComposeTo(null)} className="text-sm text-text-muted hover:text-text cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {a && a.recent.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowVideos(v => !v)} className="text-sm text-brass hover:underline cursor-pointer">
            {showVideos ? "Hide latest videos" : `Show latest videos (${a.recent.length})`}
          </button>
          {showVideos && (
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {a.recent.map(v => (
                <li key={v.url} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                  <a href={v.url} target="_blank" rel="noopener noreferrer" className="text-text hover:text-brass truncate">{v.title}</a>
                  <span className="text-xs text-text-muted whitespace-nowrap">{compact(v.views)} views · {ago(v.publishedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {saved ? (
          <>
            <select
              value={saved.status}
              onChange={e => onStatusChange?.(e.target.value)}
              aria-label="Status"
              className="px-3 py-2 rounded-xl border border-line bg-surface text-sm text-text cursor-pointer focus:outline-hidden focus:border-brass"
            >
              {SAVED_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <button type="button" onClick={onRemove} className="text-sm text-rust hover:underline cursor-pointer">Remove from saved</button>
          </>
        ) : onSave ? (
          <button type="button" onClick={onSave} className="px-3.5 py-2 rounded-xl border border-line bg-surface text-sm text-text hover:bg-surface-2 cursor-pointer">Save to my list</button>
        ) : null}
        {onDraft && (
          <button type="button" onClick={writeDraft} disabled={drafting} className="px-3.5 py-2 rounded-xl border border-brass/50 text-sm text-brass hover:bg-brass hover:text-white cursor-pointer inline-flex items-center gap-2 disabled:opacity-50">
            {drafting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Write a message with AI
          </button>
        )}
      </div>
      {draftError && <p className="text-sm text-rust">{draftError}</p>}

      {draft && (
        <div className="rounded-xl border border-line bg-surface-2/40 p-4 space-y-3 text-sm">
          <p className="text-xs font-medium text-brass">AI suggestion. Read and edit it before you send.</p>
          <div>
            <p className="text-xs text-text-muted mb-1">Email · Subject: {draft.subject}</p>
            <p className="whitespace-pre-wrap text-text">{draft.email}</p>
            <button type="button" onClick={() => copy(`Subject: ${draft.subject}\n\n${draft.email}`)} className="mt-1.5 text-xs text-text-muted hover:text-text cursor-pointer inline-flex items-center gap-1"><Copy className="w-3 h-3" />{copied.startsWith("Subject:") ? "Copied" : "Copy email"}</button>
          </div>
          {draft.whatsapp && (
            <div>
              <p className="text-xs text-text-muted mb-1">WhatsApp</p>
              <p className="whitespace-pre-wrap text-text">{draft.whatsapp}</p>
              <button type="button" onClick={() => copy(draft.whatsapp)} className="mt-1.5 text-xs text-text-muted hover:text-text cursor-pointer inline-flex items-center gap-1"><Copy className="w-3 h-3" />{copied === draft.whatsapp ? "Copied" : "Copy message"}</button>
            </div>
          )}
        </div>
      )}

      {saved && onNoteSave && (
        <div>
          <label className="text-xs font-medium text-text-muted block mb-1">Your note</label>
          <textarea
            rows={2}
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => note !== saved.note && onNoteSave(note)}
            maxLength={500}
            placeholder="For example: asked for rates, call on Monday"
            className="w-full px-3 py-2 rounded-xl border border-line bg-surface-2 text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass"
          />
        </div>
      )}
    </div>
  );
}

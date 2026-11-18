"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { YouTubeChannelCard, type YtChannel } from "@/components/datapal/YouTubeChannelCard";

interface Props {
  /** Called after a search so the records-left counter updates */
  onCreditsChanged: () => void;
  onNeedCredits: () => void;
}

interface SavedItem {
  channelId: string;
  status: string;
  note: string;
  savedAt: string;
  channel: YtChannel | null;
}

type Fit = { score: number; reason: string };

const csvCell = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
const post = (url: string, body: unknown, method = "POST") => fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const SORTS = [
  { id: "default", label: "Best match" },
  { id: "subs", label: "Most subscribers" },
  { id: "engagement", label: "Highest engagement" },
  { id: "views", label: "Most average views" },
  { id: "recent", label: "Most recently active" },
];
const MIN_SUBS = [
  { id: 0, label: "Any size" },
  { id: 1_000, label: "1K+" },
  { id: 10_000, label: "10K+" },
  { id: 50_000, label: "50K+" },
  { id: 100_000, label: "100K+" },
  { id: 500_000, label: "500K+" },
];

export function YouTubeSearch({ onCreditsChanged, onNeedCredits }: Props) {
  const [tab, setTab] = useState<"find" | "saved">("find");
  const [bulk, setBulk] = useState(false);
  const [query, setQuery] = useState("");
  const [list, setList] = useState("");
  const [offer, setOffer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<YtChannel[]>([]);
  const [fits, setFits] = useState<Record<string, Fit>>({});
  const [fitBusy, setFitBusy] = useState(false);
  const [fitError, setFitError] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [moreBusy, setMoreBusy] = useState(false);
  const [lastKeywords, setLastKeywords] = useState("");
  const [language, setLanguage] = useState("");

  // filters and sorting
  const [needEmail, setNeedEmail] = useState(false);
  const [needPhone, setNeedPhone] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);
  const [country, setCountry] = useState("");
  const [minSubs, setMinSubs] = useState(0);
  const [sort, setSort] = useState("default");

  // saved list
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [savedBusy, setSavedBusy] = useState(false);
  const [savedWarning, setSavedWarning] = useState("");
  const savedIds = useMemo(() => new Set(saved.map(s => s.channelId)), [saved]);

  const loadSaved = useCallback(async () => {
    setSavedBusy(true);
    try {
      const d = await fetch("/api/datapal/youtube/saved", { cache: "no-store" }).then(r => r.json());
      if (d?.success) {
        setSaved(d.items);
        setSavedWarning(d.warning || "");
      }
    } catch {}
    setSavedBusy(false);
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  const rate = async (channels: YtChannel[], what: string) => {
    if (what.trim().length < 3 || channels.length === 0) return;
    setFitBusy(true);
    setFitError("");
    try {
      const res = await post("/api/datapal/youtube/fit", { mode: "score", offer: what, channelIds: channels.map(c => c.channelId).slice(0, 10) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        const next: Record<string, Fit> = {};
        for (const s of d.scores) next[s.channelId] = { score: s.score, reason: s.reason };
        setFits(next);
        setSort("default");
      } else setFitError(d.error || "The AI couldn't rate these right now.");
    } catch {
      setFitError("The AI couldn't rate these right now.");
    }
    setFitBusy(false);
  };

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = list.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (busy || (bulk ? lines.length === 0 : !query.trim())) return;
    setBusy(true);
    setError("");
    setNote("");
    setFits({});
    setFitError("");
    try {
      const res = await post("/api/datapal/youtube", bulk ? { queries: lines } : { query });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        setResults(d.results);
        setNextToken(d.nextPageToken || null);
        setLastKeywords(bulk ? "" : query);
        const notes: string[] = [];
        if (d.message) notes.push(d.message);
        if (d.skipped?.length) notes.push(`${d.skipped.length} line${d.skipped.length === 1 ? " was" : "s were"} skipped: ${d.skipped.map((s: any) => s.text).slice(0, 3).join(", ")}${d.skipped.length > 3 ? "…" : ""}`);
        if (d.limited) notes.push("Some channels were left out because you ran out of records.");
        setNote(notes.join(" "));
        onCreditsChanged();
        if (offer.trim().length >= 3) rate(d.results, offer);
      } else {
        if (d.code === "no_credits") onNeedCredits();
        setError(d.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const loadMore = async () => {
    if (!nextToken || !lastKeywords || moreBusy) return;
    setMoreBusy(true);
    setError("");
    try {
      const res = await post("/api/datapal/youtube", { query: lastKeywords, pageToken: nextToken });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        const fresh: YtChannel[] = d.results.filter((r: YtChannel) => !results.some(x => x.channelId === r.channelId));
        setResults(prev => [...prev, ...fresh]);
        setNextToken(d.nextPageToken || null);
        onCreditsChanged();
        if (offer.trim().length >= 3) rate(fresh, offer);
      } else {
        if (d.code === "no_credits") onNeedCredits();
        setError(d.error || "Couldn't load more. Please try again.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setMoreBusy(false);
  };

  const sendEmail = (c: YtChannel) => async (to: string, subject: string, body: string): Promise<string | null> => {
    try {
      const res = await post("/api/datapal/youtube/outreach", { channelId: c.channelId, to, subject, body, confirm: true });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        loadSaved();
        return null;
      }
      return d.error || "The email could not be sent.";
    } catch {
      return "Couldn't reach the server. Please try again.";
    }
  };

  const draftFor = (c: YtChannel) => async () => {
    if (offer.trim().length < 3) return "Write what you are promoting in the box at the top first.";
    try {
      const res = await post("/api/datapal/youtube/fit", { mode: "draft", offer, channelId: c.channelId });
      const d = await res.json().catch(() => ({}));
      return res.ok && d.success ? (d.draft as { subject: string; email: string; whatsapp: string }) : d.error || "The AI couldn't write a message right now.";
    } catch {
      return "The AI couldn't write a message right now.";
    }
  };

  const save = async (c: YtChannel) => {
    await post("/api/datapal/youtube/saved", { channelId: c.channelId, status: "new", note: "" });
    loadSaved();
  };
  const updateSaved = async (id: string, patch: { status?: string; note?: string }) => {
    const cur = saved.find(s => s.channelId === id);
    if (!cur) return;
    setSaved(prev => prev.map(s => (s.channelId === id ? { ...s, ...patch } : s)));
    await post("/api/datapal/youtube/saved", { channelId: id, status: patch.status ?? cur.status, note: patch.note ?? cur.note });
  };
  const removeSaved = async (id: string) => {
    setSaved(prev => prev.filter(s => s.channelId !== id));
    await post("/api/datapal/youtube/saved", { channelId: id }, "DELETE");
  };

  const languages = useMemo(() => Array.from(new Set(results.map(r => r.language).filter(Boolean))) as string[], [results]);
  const countries = useMemo(() => Array.from(new Set(results.map(r => r.country).filter(Boolean))) as string[], [results]);

  const shown = useMemo(() => {
    const out = results.filter(c =>
      (!needEmail || c.emails.length > 0) &&
      (!needPhone || c.phones.length > 0) &&
      (!onlyActive || c.activity?.status === "active" || c.activity?.status === "recent") &&
      (!country || c.country === country) &&
      (!language || c.language === language) &&
      (minSubs === 0 || (c.subscribers ?? 0) >= minSubs)
    );
    const by: Record<string, (c: YtChannel) => number> = {
      subs: c => c.subscribers ?? -1,
      engagement: c => c.activity?.engagementPct ?? -1,
      views: c => c.activity?.avgViews ?? -1,
      recent: c => (c.activity?.lastUploadAt ? new Date(c.activity.lastUploadAt).getTime() : -1),
    };
    if (sort === "default" && Object.keys(fits).length > 0) return [...out].sort((a, b) => (fits[b.channelId]?.score ?? -1) - (fits[a.channelId]?.score ?? -1));
    return sort in by ? [...out].sort((a, b) => by[sort](b) - by[sort](a)) : out;
  }, [results, needEmail, needPhone, onlyActive, country, language, minSubs, sort, fits]);

  const download = () => {
    const NL = String.fromCharCode(10);
    const rows = [["Channel", "Handle", "Link", "Subscribers", "Country", "Language", "Status", "Avg views", "Engagement %", "Uploads per month", "Last upload", "Brand deals in last videos", "AI fit", "Emails", "Phones", "Social profiles", "Other links"]];
    for (const c of shown) {
      const a = c.activity;
      rows.push([
        c.title, c.handle || "", c.url, c.subscribers === null ? "" : String(c.subscribers), c.country || "",
        c.language || "", a?.status || "", a?.avgViews == null ? "" : String(a.avgViews), a?.engagementPct == null ? "" : String(a.engagementPct),
        a?.uploadsPerMonth == null ? "" : String(a.uploadsPerMonth), a?.lastUploadAt ? a.lastUploadAt.slice(0, 10) : "", a ? String(a.sponsoredVideos) : "",
        fits[c.channelId] ? String(fits[c.channelId].score) : "", c.emails.map(e => e.value).join("; "), c.phones.map(p => p.value).join("; "), c.socials.map(x => x.url).join("; "), c.links.map(l => l.url).join("; "),
      ]);
    }
    const blob = new Blob([rows.map(r => r.map(csvCell).join(",")).join(NL)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "youtube-channels.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const chip = (on: boolean) =>
    `px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${on ? "bg-text text-surface border-text" : "bg-surface text-text border-line hover:bg-surface-2"}`;
  const field = "px-3 py-1.5 rounded-lg border border-line bg-surface text-sm text-text focus:outline-hidden focus:border-brass cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="flex gap-6 text-sm">
        {([["find", "Find creators"], ["saved", `Saved${saved.length ? ` (${saved.length})` : ""}`]] as const).map(([id, label]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`pb-1 cursor-pointer border-b-2 ${tab === id ? "border-brass text-text font-medium" : "border-transparent text-text-muted hover:text-text"}`}>{label}</button>
        ))}
      </div>

      {tab === "find" && (
        <>
          <div className="space-y-3">
            <form onSubmit={search} className="space-y-3">
              {bulk ? (
                <textarea
                  rows={5}
                  value={list}
                  onChange={e => setList(e.target.value)}
                  placeholder={"One per line, up to 20:\nhttps://www.youtube.com/@name\n@anotherhandle\nUCxxxxxxxxxxxxxxxxxxxxxx"}
                  className="w-full px-4 py-3 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass"
                />
              ) : (
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Channel link, @handle, or keywords like “fitness creators India”"
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass"
                />
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={offer}
                  onChange={e => setOffer(e.target.value)}
                  maxLength={300}
                  aria-label="What you are promoting"
                  placeholder="What are you promoting? (optional, used to score fit)"
                  className="flex-1 px-4 py-3 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass"
                />
                <button
                  type="submit"
                  disabled={busy || (bulk ? !list.trim() : !query.trim())}
                  className="px-6 py-3 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  Search
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button type="button" onClick={() => setBulk(b => !b)} className="text-sm text-brass hover:underline cursor-pointer">
                  {bulk ? "Search one channel or keywords" : "Paste a list of channels"}
                </button>
                <p className="text-xs text-text-muted">Each channel found uses one DataPal record.</p>
              </div>
            </form>
            {error && <p className="text-sm text-rust">{error}</p>}
            {note && <p className="text-sm text-text-muted">{note}</p>}
          </div>

          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={chip(needEmail)} onClick={() => setNeedEmail(v => !v)}>Has email</button>
                <button type="button" className={chip(needPhone)} onClick={() => setNeedPhone(v => !v)}>Has phone</button>
                <button type="button" className={chip(onlyActive)} onClick={() => setOnlyActive(v => !v)}>Active lately</button>
                <select value={minSubs} onChange={e => setMinSubs(Number(e.target.value))} aria-label="Minimum subscribers" className={field}>
                  {MIN_SUBS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                {countries.length > 1 && (
                  <select value={country} onChange={e => setCountry(e.target.value)} aria-label="Country" className={field}>
                    <option value="">All countries</option>
                    {countries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
                {languages.length > 1 && (
                  <select value={language} onChange={e => setLanguage(e.target.value)} aria-label="Language" className={field}>
                    <option value="">All languages</option>
                    {languages.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
                <select value={sort} onChange={e => setSort(e.target.value)} aria-label="Sort by" className={`${field} ml-auto`}>
                  {SORTS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-text-muted">
                  {shown.length === results.length ? `${results.length} ${results.length === 1 ? "channel" : "channels"}` : `${shown.length} of ${results.length} channels`}
                  {fitBusy && <span className="ml-2 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />AI is rating them…</span>}
                </p>
                <button type="button" onClick={download} disabled={shown.length === 0} className="text-sm text-brass hover:underline cursor-pointer disabled:opacity-50">
                  Download CSV
                </button>
              </div>
              {fitError && <p className="text-sm text-rust">{fitError}</p>}

              {shown.length === 0 && <p className="p-8 text-center text-sm text-text-muted rounded-xl border border-line">No channel matches these filters. Loosen a filter to see the rest.</p>}

              {shown.map(c => (
                <YouTubeChannelCard
                  key={c.channelId}
                  channel={c}
                  fit={fits[c.channelId] || null}
                  fitLoading={fitBusy}
                  saved={savedIds.has(c.channelId) ? saved.find(s => s.channelId === c.channelId) || null : null}
                  onSave={() => save(c)}
                  onRemove={() => removeSaved(c.channelId)}
                  onStatusChange={s => updateSaved(c.channelId, { status: s })}
                  onNoteSave={n => updateSaved(c.channelId, { note: n })}
                  onDraft={draftFor(c)}
                  onSendEmail={sendEmail(c)}
                />
              ))}

              {nextToken && lastKeywords && (
                <div className="text-center">
                  <button type="button" onClick={loadMore} disabled={moreBusy} className="px-5 py-2 rounded-lg border border-line bg-surface text-sm text-text hover:bg-surface-2 cursor-pointer inline-flex items-center gap-2 disabled:opacity-50">
                    {moreBusy && <Loader2 className="w-4 h-4 animate-spin" />}Load 10 more channels
                  </button>
                </div>
              )}

              <p className="text-xs text-text-muted">
                Details come from public channel pages and the creator&apos;s own website. Fit scores and messages are AI suggestions. Use contact details only for genuine business contact.
              </p>
            </div>
          )}
        </>
      )}

      {tab === "saved" && (
        <div className="space-y-4">
          {savedBusy && saved.length === 0 && <p className="p-8 text-center text-sm text-text-muted">Loading your saved list…</p>}
          {!savedBusy && saved.length === 0 && (
            <p className="p-10 text-center text-sm text-text-muted rounded-xl border border-line">
              Nothing saved yet. Use &ldquo;Save to my list&rdquo; on a creator to keep track of who you contacted and what they said.
            </p>
          )}
          {savedWarning && <p className="text-sm text-rust">{savedWarning}</p>}
          {saved.map(s =>
            s.channel ? (
              <YouTubeChannelCard
                key={s.channelId}
                channel={s.channel}
                saved={{ status: s.status, note: s.note }}
                onRemove={() => removeSaved(s.channelId)}
                onStatusChange={st => updateSaved(s.channelId, { status: st })}
                onNoteSave={n => updateSaved(s.channelId, { note: n })}
                onDraft={draftFor(s.channel)}
                onSendEmail={sendEmail(s.channel)}
              />
            ) : (
              <div key={s.channelId} className="rounded-xl border border-line bg-surface p-5 flex items-center justify-between gap-3 text-sm">
                <span className="text-text-muted">This channel&apos;s details are not available right now. Your status and note are kept.</span>
                <button type="button" onClick={() => removeSaved(s.channelId)} className="text-rust hover:underline cursor-pointer shrink-0">Remove</button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

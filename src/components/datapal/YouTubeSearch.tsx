"use client";

import { useState } from "react";
import { Copy, Download, ExternalLink, Loader2, Search } from "lucide-react";

interface Channel {
  channelId: string;
  title: string;
  handle: string | null;
  url: string;
  thumbnail: string | null;
  country: string | null;
  subscribers: number | null;
  videos: number | null;
  views: number | null;
  description: string;
  emails: string[];
  links: Array<{ url: string; label: string }>;
}

interface Props {
  /** Called after a search so the records-left counter updates */
  onCreditsChanged: () => void;
  onNeedCredits: () => void;
}

const compact = (n: number | null) => (n === null ? "Hidden" : new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(n));

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function YouTubeSearch({ onCreditsChanged, onNeedCredits }: Props) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState<Channel[]>([]);
  const [copied, setCopied] = useState("");

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || busy) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/datapal/youtube", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.success) {
        setResults(d.results);
        setNote(d.message || "");
        onCreditsChanged();
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

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    } catch {}
  };

  const download = () => {
    const NL = String.fromCharCode(10);
    const rows = [["Channel", "Handle", "Link", "Subscribers", "Country", "Emails", "Other links"]];
    for (const c of results) {
      rows.push([c.title, c.handle || "", c.url, c.subscribers === null ? "" : String(c.subscribers), c.country || "", c.emails.join("; "), c.links.map(l => l.url).join("; ")]);
    }
    const blob = new Blob([rows.map(r => r.map(csvCell).join(",")).join(NL)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "youtube-channels.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-text">Find a YouTube channel</h2>
          <p className="text-sm text-text-muted mt-1">
            Paste a channel link, an @handle or a channel ID to get its contact details. Or type keywords, such as &ldquo;fitness creators India&rdquo;, to find channels.
          </p>
        </div>

        <form onSubmit={search} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="youtube.com/@name, @name, UC… or keywords"
              maxLength={200}
              className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-line bg-surface-2 text-sm text-text placeholder:text-text-muted focus:outline-hidden focus:border-brass"
            />
          </div>
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="px-6 py-3 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer inline-flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Search
          </button>
        </form>
        <p className="text-xs text-text-muted">Each channel found uses one DataPal record. Searching the same channel again within a day is still counted.</p>
        {error && <p className="text-sm text-rust">{error}</p>}
        {note && <p className="text-sm text-text-muted">{note}</p>}
      </div>

      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-text-muted">{results.length} {results.length === 1 ? "channel" : "channels"} found</p>
            <button type="button" onClick={download} className="px-3.5 py-2 rounded-xl border border-line bg-surface text-sm text-text hover:bg-surface-2 cursor-pointer inline-flex items-center gap-2">
              <Download className="w-4 h-4" /> Download CSV
            </button>
          </div>

          {results.map(c => (
            <div key={c.channelId} className="rounded-2xl border border-line bg-surface p-5 space-y-4">
              <div className="flex items-start gap-4">
                {c.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnail} alt="" className="w-14 h-14 rounded-full border border-line object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-surface-2 border border-line shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-base font-semibold text-text">{c.title}</h3>
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-xs text-brass hover:underline inline-flex items-center gap-1">
                      {c.handle || "Open channel"} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    {compact(c.subscribers)} subscribers
                    {c.videos !== null ? ` · ${compact(c.videos)} videos` : ""}
                    {c.country ? ` · ${c.country}` : ""}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-surface-2/60 border border-line p-4">
                  <p className="text-xs font-medium text-text-muted mb-2">Email</p>
                  {c.emails.length > 0 ? (
                    <ul className="space-y-1.5">
                      {c.emails.map(m => (
                        <li key={m} className="flex items-center justify-between gap-2 text-sm">
                          <a href={`mailto:${m}`} className="text-text hover:text-brass break-all">{m}</a>
                          <button type="button" onClick={() => copy(m)} className="text-xs text-text-muted hover:text-text cursor-pointer inline-flex items-center gap-1 shrink-0">
                            <Copy className="w-3 h-3" /> {copied === m ? "Copied" : "Copy"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-text-muted">No email in the description. Many channels keep it behind YouTube&apos;s &ldquo;View email address&rdquo; button, which can&apos;t be read here.</p>
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
            </div>
          ))}

          <p className="text-xs text-text-muted">
            These details are taken from each channel&apos;s public description. Use them lawfully and only to make genuine business contact, not for spam.
          </p>
        </div>
      )}
    </div>
  );
}

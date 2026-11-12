"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Copy, MapPin, Phone, Send } from "lucide-react";
import { DataPalBusinessLead, DataPalSearchCampaign } from "@/lib/datapal/types";
import { exportLeadsToCSV, exportLeadsToExcel } from "@/lib/datapal/export";
import { pushLeadsToBizzPalTasks } from "@/lib/datapal/storage";

type Filter = "all" | "phone" | "email" | "nosite" | "top";
type Sort = "original" | "rating" | "reviews" | "name";

interface ResultsViewProps {
  campaign: DataPalSearchCampaign | null;
  creditsLeft: number;
  onOpenCredits: () => void;
  onGoSearch: () => void;
}

// WhatsApp links need the full international number
const waNumber = (phone: string, country?: string): string => {
  let d = phone.replace(/[^0-9]/g, "");
  if (country === "India") {
    if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
    if (d.length === 10) d = "91" + d;
  }
  return d;
};

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

export function ResultsView({ campaign, creditsLeft, onOpenCredits, onGoSearch }: ResultsViewProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("original");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  const results: DataPalBusinessLead[] = campaign?.results || [];

  // A new search starts clean
  useEffect(() => {
    setQuery("");
    setFilter("all");
    setSort("original");
    setSelected(new Set());
    setPage(1);
  }, [campaign?.id]);

  const stats = useMemo(() => {
    const withPhone = results.filter(l => l.phone).length;
    const withEmail = results.filter(l => l.email).length;
    const noSite = results.filter(l => !l.website).length;
    const rated = results.filter(l => typeof l.rating === "number" && l.rating > 0);
    const avg = rated.length ? rated.reduce((sum, l) => sum + (l.rating as number), 0) / rated.length : null;
    return { total: results.length, withPhone, withEmail, noSite, avg, ratedCount: rated.length };
  }, [results]);

  const counts: Record<Filter, number> = useMemo(
    () => ({
      all: results.length,
      phone: results.filter(l => l.phone).length,
      email: results.filter(l => l.email).length,
      nosite: results.filter(l => !l.website).length,
      top: results.filter(l => (l.rating || 0) >= 4.5).length,
    }),
    [results]
  );

  const visible = useMemo(() => {
    let list = results;
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        l =>
          l.name.toLowerCase().includes(q) ||
          l.category.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          (l.phone && l.phone.includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q))
      );
    }
    if (filter === "phone") list = list.filter(l => l.phone);
    else if (filter === "email") list = list.filter(l => l.email);
    else if (filter === "nosite") list = list.filter(l => !l.website);
    else if (filter === "top") list = list.filter(l => (l.rating || 0) >= 4.5);

    if (sort === "rating") list = [...list].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sort === "reviews") list = [...list].sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0));
    else if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [results, query, filter, sort]);

  useEffect(() => setPage(1), [query, filter, sort, pageSize]);

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = visible.slice((safePage - 1) * pageSize, safePage * pageSize);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every(l => selected.has(l.id));

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageRows.forEach(l => next.delete(l.id));
      else pageRows.forEach(l => next.add(l.id));
      return next;
    });

  const copy = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
    } catch {}
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  // What an action applies to: the ticked rows, otherwise everything currently shown
  const target = (): DataPalBusinessLead[] => (selected.size > 0 ? results.filter(l => selected.has(l.id)) : visible);
  const fileBase = `DataPal_${(campaign?.title || "results").replace(/\s+/g, "_")}`;

  const push = async () => {
    const list = target();
    if (list.length === 0) return;
    setPushStatus("Adding to Tasks…");
    const r = await pushLeadsToBizzPalTasks(list);
    setPushStatus(r.success ? `Added ${r.count} outreach tasks.` : "Could not add tasks. Please try again.");
    setTimeout(() => setPushStatus(null), 4000);
  };

  // ---------- empty states ----------
  if (!campaign) {
    return (
      <div className="text-center py-20 bg-surface border border-line rounded-2xl shadow-sm px-6 space-y-3">
        <h3 className="text-lg font-semibold text-text">No results yet</h3>
        <p className="text-sm text-text-muted max-w-md mx-auto">Run a search and your records will appear here.</p>
        <button type="button" onClick={onGoSearch} className="px-5 py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer">
          Start a search
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-20 bg-surface border border-line rounded-2xl shadow-sm px-6 space-y-3">
        <h3 className="text-lg font-semibold text-text">No matching businesses found</h3>
        <p className="text-sm text-text-muted max-w-md mx-auto">
          Nothing matched &ldquo;{campaign.title}&rdquo;. Try a wider area or a different category. You were not charged.
        </p>
        <button type="button" onClick={onGoSearch} className="px-5 py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer">
          Change search
        </button>
      </div>
    );
  }

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "phone", label: "Has phone" },
    { id: "email", label: "Has email" },
    { id: "nosite", label: "No website" },
    { id: "top", label: "Rated 4.5+" },
  ];

  const statCards = [
    { label: "Records", value: String(stats.total), note: campaign.includesPreviousRecords ? "Includes earlier searches" : "All new to you" },
    { label: "With phone", value: String(stats.withPhone), note: `${pct(stats.withPhone, stats.total)}% of records` },
    { label: "With email", value: String(stats.withEmail), note: stats.withEmail ? "Suggested, not verified" : "None listed" },
    { label: "No website", value: String(stats.noSite), note: "Good web design leads" },
    { label: "Average rating", value: stats.avg !== null ? stats.avg.toFixed(1) : "—", note: stats.ratedCount ? `From ${stats.ratedCount} rated` : "No ratings listed" },
  ];

  return (
    <div className="space-y-5">
      {/* Title and actions */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-text">{campaign.title}</h2>
          <p className="text-sm text-text-muted mt-1">
            {campaign.location} · {new Date(campaign.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
            {" · "}
            <button type="button" onClick={onOpenCredits} className="hover:text-text underline decoration-dotted underline-offset-2 cursor-pointer">
              {creditsLeft} records left
            </button>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => exportLeadsToExcel(target(), `${fileBase}.xls`, campaign.title)} className="px-4 py-2.5 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer">
            Export Excel
          </button>
          <button type="button" onClick={() => exportLeadsToCSV(target(), `${fileBase}.csv`)} className="px-4 py-2.5 rounded-xl border border-line text-sm text-text hover:bg-surface-2 cursor-pointer">
            Export CSV
          </button>
          <button type="button" onClick={push} className="px-4 py-2.5 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer">
            Add to tasks
          </button>
        </div>
      </div>

      {pushStatus && (
        <div className="px-4 py-3 rounded-xl border border-line bg-surface-2 text-sm text-text flex items-center justify-between">
          <span>{pushStatus}</span>
          <Link href="/tasks" className="text-brass hover:underline">
            View tasks
          </Link>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map(c => (
          <div key={c.label} className="p-4 rounded-2xl border border-line bg-surface shadow-sm">
            <div className="text-sm text-text-muted">{c.label}</div>
            <div className="text-2xl font-semibold text-text mt-1.5">{c.value}</div>
            <div className="text-xs text-text-muted mt-1">{c.note}</div>
          </div>
        ))}
      </div>

      {/* Search, filters, sort */}
      <div className="rounded-2xl border border-line bg-surface shadow-sm p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, phone, email or area"
            aria-label="Search results"
            className="flex-1 lg:max-w-md px-3.5 py-2.5 rounded-xl border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
          />
          <div className="flex items-center gap-2 lg:ml-auto">
            <label className="text-sm text-text-muted" htmlFor="dp-sort">Sort</label>
            <select id="dp-sort" value={sort} onChange={e => setSort(e.target.value as Sort)} className="px-3 py-2.5 rounded-xl border border-line bg-surface text-sm text-text cursor-pointer">
              <option value="original">Best match</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviewed</option>
              <option value="name">Name A to Z</option>
            </select>
            <label className="text-sm text-text-muted ml-2" htmlFor="dp-size">Show</label>
            <select id="dp-size" value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="px-3 py-2.5 rounded-xl border border-line bg-surface text-sm text-text cursor-pointer">
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm border cursor-pointer ${
                filter === f.id ? "border-brass bg-brass/10 text-text font-medium" : "border-line text-text-muted hover:text-text hover:bg-surface-2"
              }`}
            >
              {f.label} <span className="text-text-muted font-normal">{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="px-4 py-3 rounded-xl bg-surface-2 border border-line text-sm flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-text font-medium">{selected.size} selected</span>
          <button type="button" onClick={push} className="text-brass hover:underline cursor-pointer">Add to tasks</button>
          <button type="button" onClick={() => exportLeadsToCSV(target(), `${fileBase}_selected.csv`)} className="text-brass hover:underline cursor-pointer">Export selected</button>
          <button type="button" onClick={() => setSelected(new Set())} className="text-text-muted hover:text-text cursor-pointer ml-auto">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed text-left border-collapse">
            <thead>
              <tr className="border-b border-line text-sm font-medium text-text-muted">
                <th className="py-3 pl-5 pr-2 w-12">
                  <input type="checkbox" checked={allOnPageSelected} onChange={togglePage} className="dp-check" aria-label="Select all on this page" />
                </th>
                <th className="py-3 px-4 w-[27%]">Business</th>
                <th className="py-3 px-4 w-[25%]">Contact</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 w-28">Rating</th>
                <th className="py-3 pl-4 pr-5 w-36"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-text-muted">
                    No records match these filters.
                  </td>
                </tr>
              ) : (
                pageRows.map(lead => {
                  const isSel = selected.has(lead.id);
                  return (
                    <tr key={lead.id} className={`align-top hover:bg-surface-2/50 ${isSel ? "bg-brass/[0.04]" : ""}`}>
                      <td className="py-4 pl-5 pr-2">
                        <input type="checkbox" checked={isSel} onChange={() => toggle(lead.id)} className="dp-check mt-0.5" aria-label={`Select ${lead.name}`} />
                      </td>

                      <td className="py-4 px-4">
                        <p className="text-sm font-medium text-text leading-snug">{lead.name}</p>
                        <p className="text-sm text-text-muted mt-0.5 truncate">{lead.category}</p>
                        <p className="text-sm mt-1 truncate">
                          {lead.website ? (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-brass hover:underline" title={lead.website}>
                              {hostOf(lead.website)}
                            </a>
                          ) : (
                            <span className="text-text-muted">No website</span>
                          )}
                        </p>
                      </td>

                      <td className="py-4 px-4 text-sm space-y-1.5">
                        {lead.phone ? (
                          <div className="flex items-center gap-1.5">
                            <a href={`tel:${lead.phone}`} className="text-text hover:underline whitespace-nowrap">{lead.phone}</a>
                            <button type="button" onClick={() => copy(lead.phone!, `p_${lead.id}`)} className="p-1 rounded text-text-muted hover:text-text cursor-pointer" title="Copy phone" aria-label="Copy phone">
                              {copied === `p_${lead.id}` ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        ) : (
                          <p className="text-text-muted">No phone listed</p>
                        )}
                        {lead.email ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-text-muted truncate min-w-0" title={lead.email}>{lead.email}</span>
                            <button type="button" onClick={() => copy(lead.email!, `e_${lead.id}`)} className="p-1 rounded text-text-muted hover:text-text cursor-pointer shrink-0" title="Copy email" aria-label="Copy email">
                              {copied === `e_${lead.id}` ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {lead.emailVerified === false && <span className="text-xs text-text-muted shrink-0">suggested</span>}
                          </div>
                        ) : (
                          <p className="text-text-muted">No email</p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-sm">
                        <p className="text-text leading-snug line-clamp-3" title={lead.address}>{lead.address}</p>
                      </td>

                      <td className="py-4 px-4 text-sm">
                        {lead.rating ? (
                          <span className="text-text whitespace-nowrap">
                            {lead.rating.toFixed(1)}
                            <span className="text-text-muted"> ({lead.reviewsCount || 0})</span>
                          </span>
                        ) : (
                          <span className="text-text-muted">No rating</span>
                        )}
                      </td>

                      <td className="py-4 pl-4 pr-5">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.phone && (
                            <a href={`tel:${lead.phone}`} className="inline-flex p-2 rounded-lg border border-line text-text-muted hover:text-brass hover:bg-surface-2" title="Call" aria-label="Call">
                              <Phone className="w-4 h-4" />
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              href={`https://wa.me/${waNumber(lead.phone, lead.country)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-2 rounded-lg border border-line text-text-muted hover:text-brass hover:bg-surface-2"
                              title="Message on WhatsApp"
                              aria-label="Message on WhatsApp"
                            >
                              <Send className="w-4 h-4" />
                            </a>
                          )}
                          {lead.mapsUrl && (
                            <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex p-2 rounded-lg border border-line text-text-muted hover:text-brass hover:bg-surface-2" title="Open in Google Maps" aria-label="Open in Google Maps">
                              <MapPin className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-text-muted">
          <span>
            {visible.length === 0 ? "0 records" : `${(safePage - 1) * pageSize + 1} to ${Math.min(safePage * pageSize, visible.length)} of ${visible.length}`}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="px-3 py-1.5 rounded-lg border border-line text-text hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                Previous
              </button>
              <span>
                Page {safePage} of {totalPages}
              </span>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)} className="px-3 py-1.5 rounded-lg border border-line text-text hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
        Names, phone numbers, addresses and ratings come straight from Google Maps or OpenStreetMap. Google does not list email addresses, so any email marked
        &ldquo;suggested&rdquo; is the common info@ address for the business&apos;s website and has not been checked.
      </p>
    </div>
  );
}

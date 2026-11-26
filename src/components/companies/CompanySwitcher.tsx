"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ChevronsUpDown, LayoutGrid, Loader2, Plus, Search } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { initialsOf, orderedTree, switchCompany, useCompanies, type Company, type GroupData } from "@/lib/hooks/useCompanies";

// Quiet, readable tints for company initials. The same name always gets the same tint.
const TINTS = [
  "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  "bg-orange-500/10 text-orange-700 dark:text-orange-300",
];

function tintFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

const SIZES = {
  xs: { box: "w-5 h-5 rounded", text: "text-[9px]", pad: "p-[2px]" },
  sm: { box: "w-7 h-7 rounded-md", text: "text-[11px]", pad: "p-1" },
  md: { box: "w-9 h-9 rounded-lg", text: "text-xs", pad: "p-1.5" },
  lg: { box: "w-11 h-11 rounded-xl", text: "text-sm", pad: "p-2" },
} as const;

/**
 * A company's mark: its uploaded logo, else the icon from its own website, else its initials on a soft tint.
 * Pass `id` and `website` to let it look up the website icon.
 */
export function CompanyAvatar({
  name,
  logoUrl,
  id,
  website,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  id?: string;
  website?: string;
  size?: keyof typeof SIZES;
}) {
  const src = logoUrl || (id && website ? `/api/companies/icon?id=${encodeURIComponent(id)}` : null);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const s = SIZES[size];

  if (src && !failed) {
    return (
      <span className={`${s.box} ${s.pad} bg-white border border-line shrink-0 flex items-center justify-center overflow-hidden`}>
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="w-full h-full object-contain" />
      </span>
    );
  }
  return (
    <span className={`${s.box} ${s.text} ${tintFor(name)} font-semibold shrink-0 flex items-center justify-center select-none`} aria-hidden>
      {initialsOf(name)}
    </span>
  );
}

interface Props {
  /** "rail": the desktop side menu. "compact": the company name in the phone header. */
  variant?: "rail" | "compact";
  /** Shown until the group has loaded, so the header never flickers empty. */
  fallbackName?: string;
}

export function CompanySwitcher({ variant = "rail", fallbackName = "" }: Props) {
  const { data } = useCompanies();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEscapeKey(() => setOpen(false), open && variant === "rail");

  useEffect(() => {
    if (!open || variant !== "rail") return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, variant]);

  const active = data && data.activeBusinessId !== data.group.id ? data.companies.find(c => c.id === data.activeBusinessId) || null : null;
  const current = active || (data ? { ...data.group } : null);
  const name = current?.name || fallbackName || "Your business";
  const detail = !data
    ? ""
    : active
      ? `in ${data.group.name}`
      : data.companies.length > 0
        ? `Group · ${data.companies.length} ${data.companies.length === 1 ? "company" : "companies"}`
        : data.group.industryLabel || "";

  const avatar = (size: "md" | "sm") => (
    <CompanyAvatar name={name} logoUrl={current?.logoUrl} id={current?.id} website={current?.website} size={size} />
  );

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[11px] text-text-muted leading-tight max-w-[170px] cursor-pointer"
          aria-label={`Switch company. Now in ${name}`}
        >
          <span className="truncate">{name}</span>
          <ChevronsUpDown className="w-3 h-3 shrink-0" />
        </button>
        <PortalModal
          isOpen={open}
          onClose={() => setOpen(false)}
          backdropClassName="fixed inset-0 z-[9999] bg-slate-950/50 dark:bg-black/70 flex items-end justify-center animate-fade-in"
        >
          <div className="w-screen max-h-[85vh] flex flex-col rounded-t-2xl bg-surface border-t border-line pb-[env(safe-area-inset-bottom)]">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" aria-hidden />
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <span className="text-base font-semibold text-text">Switch company</span>
              <button type="button" onClick={() => setOpen(false)} className="text-sm text-text-muted px-2 py-1 cursor-pointer">
                Done
              </button>
            </div>
            {data ? <Panel data={data} onDone={() => setOpen(false)} /> : <PanelLoading />}
          </div>
        </PortalModal>
      </>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={name}
        className={`group w-full h-12 flex items-center gap-2.5 px-2 rounded-lg text-left cursor-pointer transition-colors ${
          open ? "bg-surface-2" : "hover:bg-surface-2"
        }`}
      >
        {avatar("sm")}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-text leading-tight truncate">{name}</span>
          {detail && <span className="block text-xs text-text-muted leading-tight truncate mt-0.5">{detail}</span>}
        </span>
        <ChevronsUpDown className="w-4 h-4 text-text-muted group-hover:text-text shrink-0" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Switch company"
          className="absolute left-0 top-full mt-1.5 z-50 w-[20rem] rounded-xl border border-line bg-surface shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[min(36rem,75vh)]"
        >
          {data ? <Panel data={data} onDone={() => setOpen(false)} /> : <PanelLoading />}
        </div>
      )}
    </div>
  );
}

function PanelLoading() {
  return (
    <div className="px-4 py-8 flex items-center justify-center text-sm text-text-muted gap-2">
      <Loader2 className="w-4 h-4 animate-spin" /> Loading companies…
    </div>
  );
}

/** The list inside the switcher: the group, then each category (folded away when there are many companies). */
function Panel({ data, onDone }: { data: GroupData; onDone: () => void }) {
  const [query, setQuery] = useState("");
  const [switching, setSwitching] = useState<string | null>(null);
  const [error, setError] = useState("");

  const known = useMemo(() => new Set(data.segments.map(s => s.id)), [data.segments]);
  const activeCompany = data.companies.find(c => c.id === data.activeBusinessId);
  const activeSection = activeCompany ? (activeCompany.segmentId && known.has(activeCompany.segmentId) ? activeCompany.segmentId : "none") : null;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(activeSection ? [activeSection] : []));

  const sections = useMemo(() => {
    const list = data.segments
      .map(s => ({ key: s.id, label: s.name, companies: data.companies.filter(c => c.segmentId === s.id) }))
      .filter(s => s.companies.length > 0);
    const rest = data.companies.filter(c => !c.segmentId || !known.has(c.segmentId));
    if (rest.length) list.push({ key: "none", label: list.length ? "Other companies" : "Companies", companies: rest });
    return list;
  }, [data, known]);

  // Few companies: show everything, nothing to fold away
  const alwaysOpen = data.companies.length <= 10 || sections.length <= 1;

  const q = query.trim().toLowerCase();
  const results = q ? data.companies.filter(c => c.name.toLowerCase().includes(q) || c.industryLabel.toLowerCase().includes(q)) : [];
  const segmentName = (c: Company) => data.segments.find(s => s.id === c.segmentId)?.name || "";

  const open = async (id: string) => {
    if (id === data.activeBusinessId) return onDone();
    setError("");
    setSwitching(id);
    const err = await switchCompany(id);
    if (err) {
      setError(err);
      setSwitching(null);
    }
  };

  const toggle = (key: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const item = (
    c: { id: string; name: string; logoUrl?: string | null; website?: string },
    detail: string,
    opts: { depth?: number; badge?: string } = {}
  ) => {
    const depth = opts.depth || 0;
    const isActive = c.id === data.activeBusinessId;
    return (
      <button
        key={c.id}
        type="button"
        disabled={Boolean(switching)}
        onClick={() => open(c.id)}
        style={{ paddingLeft: 8 + depth * 16 }}
        className={`w-full flex items-center gap-2.5 pr-2.5 py-2 rounded-lg text-left cursor-pointer disabled:cursor-wait transition-colors ${
          isActive ? "bg-surface-2" : "hover:bg-surface-2/70"
        }`}
      >
        <CompanyAvatar name={c.name} logoUrl={c.logoUrl} id={c.id} website={c.website} size={depth > 0 ? "xs" : "sm"} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={`text-[13px] leading-snug text-text line-clamp-2 break-words ${isActive ? "font-semibold" : "font-medium"}`}>{c.name}</span>
            {opts.badge && (
              <span className="shrink-0 text-[10px] font-medium px-1.5 py-px rounded border border-line text-text-muted">{opts.badge}</span>
            )}
          </span>
          {detail && <span className="block text-[11px] text-text-muted truncate">{detail}</span>}
        </span>
        {switching === c.id ? (
          <Loader2 className="w-3.5 h-3.5 text-text-muted animate-spin shrink-0" />
        ) : isActive ? (
          <Check className="w-3.5 h-3.5 text-brass shrink-0" />
        ) : null}
      </button>
    );
  };

  const heading = (label: string) => (
    <p className="px-2.5 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-text-muted">{label}</p>
  );

  return (
    <>
      {data.companies.length > 6 && (
        <div className="p-2 border-b border-line">
          <label className="flex items-center gap-2 px-2.5 h-8 rounded-lg bg-surface-2 focus-within:ring-1 focus-within:ring-brass/40">
            <Search className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Search ${data.companies.length} companies`}
              aria-label="Search companies"
              className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
            />
          </label>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-1.5">
        {q ? (
          results.length ? (
            results.map(c => item(c, segmentName(c) || c.industryLabel))
          ) : (
            <p className="px-3 py-6 text-sm text-text-muted text-center">No company matches “{query}”.</p>
          )
        ) : (
          <>
            {item(data.group, data.group.industryLabel, { badge: data.companies.length ? "Group" : undefined })}

            {sections.map(section => {
              const isOpen = alwaysOpen || expanded.has(section.key);
              const rows = orderedTree(data.companies, section.companies);
              return (
                <div key={section.key}>
                  {alwaysOpen ? (
                    heading(section.label)
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(section.key)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center gap-2 px-2.5 py-2 mt-0.5 rounded-lg text-left text-[13px] font-medium text-text hover:bg-surface-2/70 cursor-pointer"
                    >
                      <ChevronRight className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                      <span className="flex-1 truncate">{section.label}</span>
                      <span className="text-[11px] text-text-muted tabular-nums">{section.companies.length}</span>
                    </button>
                  )}
                  {isOpen && (
                    <div className={alwaysOpen ? "" : "pl-2"}>
                      {rows.map(({ company, depth }) => item(company, depth === 0 ? company.industryLabel : "", { depth }))}
                    </div>
                  )}
                </div>
              );
            })}

            {data.companies.length === 0 && (
              <p className="px-2.5 pt-2 pb-1 text-xs text-text-muted leading-relaxed">
                Run more than one company? Add them to see the whole group in one place.
              </p>
            )}
          </>
        )}
      </div>

      {error && <p className="px-3 py-2 text-xs text-rust border-t border-line">{error}</p>}

      <div className="border-t border-line p-1.5 grid grid-cols-2 gap-1">
        <Link
          href="/group"
          onClick={onDone}
          className="flex items-center justify-center gap-2 h-8 rounded-lg text-[13px] text-text hover:bg-surface-2 col-span-1"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-text-muted" />
          {data.companies.length ? "Overview" : "Set up group"}
        </Link>
        {data.canManage ? (
          <Link
            href="/group?add=company"
            onClick={onDone}
            className="flex items-center justify-center gap-2 h-8 rounded-lg text-[13px] text-text hover:bg-surface-2"
          >
            <Plus className="w-3.5 h-3.5 text-text-muted" />
            Add company
          </Link>
        ) : (
          <span />
        )}
      </div>
    </>
  );
}

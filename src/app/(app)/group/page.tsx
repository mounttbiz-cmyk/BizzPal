"use client";

import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Building2, FolderPlus, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { ActionMenu } from "@/components/companies/ActionMenu";
import { CompanyAvatar } from "@/components/companies/CompanySwitcher";
import {
  CompanyFormModal,
  DeleteCompanyModal,
  DeleteSegmentModal,
  SegmentFormModal,
  sendCompanyRequest,
} from "@/components/companies/GroupForms";
import {
  formatAmount,
  notifyCompaniesChanged,
  switchCompany,
  useCompanies,
  type Company,
  type GroupData,
  type Segment,
} from "@/lib/hooks/useCompanies";

type Dialog =
  | { kind: "addCompany"; segmentId?: string | null; parentId?: string | null }
  | { kind: "editCompany"; company: Company }
  | { kind: "deleteCompany"; company: Company }
  | { kind: "addSegment" }
  | { kind: "renameSegment"; segment: Segment }
  | { kind: "deleteSegment"; segment: Segment };

const ALL = "all";
const UNCATEGORISED = "none";

/** The money columns. Each is only shown once at least one company has that figure. */
const FIGURES = [
  { key: "monthlyRevenue", label: "Revenue / mo", total: "Monthly revenue" },
  { key: "monthlyBurn", label: "Spend / mo", total: "Monthly spend" },
  { key: "cashOnHand", label: "Cash", total: "Cash in bank" },
] as const;
type FigureKey = (typeof FIGURES)[number]["key"];

function sum(companies: Company[], key: FigureKey | "teamSize") {
  let total = 0;
  let count = 0;
  for (const c of companies) {
    const v = c[key];
    if (v !== null) {
      total += v;
      count++;
    }
  }
  return { total, count };
}

export default function GroupPage() {
  const { data, loading, refresh } = useCompanies();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [filter, setFilter] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ text: string; openId?: string } | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");

  // "Add a company" in the switcher links here with ?add=company
  useEffect(() => {
    if (!data?.canManage) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("add") === "company") setDialog({ kind: "addCompany" });
    if (params.get("add")) window.history.replaceState(null, "", "/group");
  }, [data?.canManage]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 8000);
    return () => clearTimeout(t);
  }, [notice]);

  const changed = (text?: string, openId?: string) => {
    setDialog(null);
    if (text) setNotice({ text, openId });
    notifyCompaniesChanged();
  };

  const open = async (id: string) => {
    setError("");
    setOpening(id);
    const err = await switchCompany(id);
    if (err) {
      setError(err);
      setOpening(null);
    }
  };

  const moveSegment = async (segment: Segment, move: "up" | "down") => {
    try {
      await sendCompanyRequest("/api/companies/segments", "PATCH", { id: segment.id, move });
      notifyCompaniesChanged();
    } catch (e: any) {
      setError(e.message);
    }
  };

  if (!data) {
    return (
      <div className="py-24 flex items-center justify-center text-sm text-text-muted gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your group…
          </>
        ) : (
          <span>
            We could not load your group.{" "}
            <button type="button" onClick={() => refresh()} className="text-brass hover:underline cursor-pointer">
              Try again
            </button>
          </span>
        )}
      </div>
    );
  }

  const openTasks = data.companies.reduce((n, c) => n + c.openTasks, 0);
  const hasAnything = data.companies.length > 0 || data.segments.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <CompanyAvatar name={data.group.name} logoUrl={data.group.logoUrl} id={data.group.id} website={data.group.website} size="lg" />
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-text truncate leading-tight">{data.group.name}</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {data.companies.length === 0
                ? "Group overview"
                : [
                    `${data.companies.length} ${data.companies.length === 1 ? "company" : "companies"}`,
                    data.segments.length ? `${data.segments.length} ${data.segments.length === 1 ? "category" : "categories"}` : "",
                    openTasks ? `${openTasks} open ${openTasks === 1 ? "task" : "tasks"}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {data.canManage && hasAnything && (
            <>
              <button
                type="button"
                onClick={() => setDialog({ kind: "addSegment" })}
                className="h-9 px-3.5 rounded-lg border border-line bg-surface hover:bg-surface-2 text-sm text-text inline-flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 text-text-muted" /> New category
              </button>
              <button
                type="button"
                onClick={() => setDialog({ kind: "addCompany", segmentId: filter !== ALL && filter !== UNCATEGORISED ? filter : null })}
                className="h-9 px-3.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add company
              </button>
            </>
          )}
        </div>
      </header>

      {notice && (
        <div role="status" className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-line bg-surface text-sm text-text shadow-sm">
          <span>{notice.text}</span>
          <span className="flex items-center gap-4 shrink-0">
            {notice.openId && (
              <button type="button" onClick={() => open(notice.openId!)} className="font-medium text-brass hover:underline cursor-pointer">
                Open
              </button>
            )}
            <button type="button" onClick={() => setNotice(null)} className="text-text-muted hover:text-text cursor-pointer">
              Dismiss
            </button>
          </span>
        </div>
      )}
      {error && <p className="text-sm text-rust">{error}</p>}

      {!hasAnything ? (
        <EmptyGroup data={data} onAddCompany={() => setDialog({ kind: "addCompany" })} onAddSegment={() => setDialog({ kind: "addSegment" })} />
      ) : (
        <>
          <Summary data={data} />
          <div className="grid gap-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] items-start">
            <CategoryNav data={data} filter={filter} setFilter={setFilter} onAdd={data.canManage ? () => setDialog({ kind: "addSegment" }) : undefined} />
            <div className="space-y-4 min-w-0">
              <label className="flex items-center gap-2 h-9 px-3 rounded-lg bg-surface border border-line focus-within:border-brass">
                <Search className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search companies by name, industry or website"
                  aria-label="Search companies"
                  className="w-full bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
                />
              </label>
              <Sections data={data} filter={filter} query={query} opening={opening} onOpen={open} onDialog={setDialog} onMoveSegment={moveSegment} />
            </div>
          </div>
        </>
      )}

      {dialog?.kind === "addCompany" && (
        <CompanyFormModal
          data={data}
          defaults={{ segmentId: dialog.segmentId, parentId: dialog.parentId }}
          onClose={() => setDialog(null)}
          onSaved={r => changed(`${r.name} was added to ${data.group.name}.`, r.id)}
        />
      )}
      {dialog?.kind === "editCompany" && (
        <CompanyFormModal
          data={data}
          company={dialog.company}
          onClose={() => setDialog(null)}
          onSaved={r => {
            // The open company's profile saved in this browser is now out of date
            if (r.id === data.activeBusinessId) {
              try {
                localStorage.removeItem("bizzpal_business_profile");
              } catch {}
              window.dispatchEvent(new Event("bizzpal_profile_updated"));
            }
            changed(`${r.name} was updated.`);
          }}
        />
      )}
      {dialog?.kind === "deleteCompany" && (
        <DeleteCompanyModal
          data={data}
          company={dialog.company}
          onClose={() => setDialog(null)}
          onDeleted={removed => {
            // The company this person had open is gone: back to the group
            if (removed.includes(data.activeBusinessId)) {
              switchCompany(data.group.id, "/group");
              return;
            }
            changed(`${dialog.company.name} was removed.`);
          }}
        />
      )}
      {dialog?.kind === "addSegment" && (
        <SegmentFormModal onClose={() => setDialog(null)} onSaved={name => changed(`Category “${name}” created.`)} />
      )}
      {dialog?.kind === "renameSegment" && (
        <SegmentFormModal segment={dialog.segment} onClose={() => setDialog(null)} onSaved={name => changed(`Renamed to “${name}”.`)} />
      )}
      {dialog?.kind === "deleteSegment" && (
        <DeleteSegmentModal
          segment={dialog.segment}
          companyCount={data.companies.filter(c => c.segmentId === dialog.segment.id).length}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            if (filter === dialog.segment.id) setFilter(ALL);
            changed(`Category “${dialog.segment.name}” deleted.`);
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------ pieces

function EmptyGroup({ data, onAddCompany, onAddSegment }: { data: GroupData; onAddCompany: () => void; onAddSegment: () => void }) {
  if (!data.canManage) {
    return (
      <div className="rounded-xl border border-line bg-surface px-6 py-12 text-center">
        <p className="text-sm text-text-muted">The account owner has not added any companies to {data.group.name} yet.</p>
      </div>
    );
  }
  const steps = [
    { title: "Create categories", text: "One per line of business, such as IT & Digital or Financial Services." },
    { title: "Add your companies", text: "Place each in a category, or under the company it belongs to." },
    { title: "Switch between them", text: "Each keeps its own dashboard, tasks, documents and AI advisors." },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-12 sm:py-16 text-center">
      <div className="mx-auto w-11 h-11 rounded-xl bg-surface-2 flex items-center justify-center text-text-muted">
        <Building2 className="w-5 h-5" />
      </div>
      <h2 className="text-base font-semibold text-text mt-4">Bring your companies together</h2>
      <p className="text-sm text-text-muted mt-1.5 max-w-md mx-auto leading-relaxed">
        If {data.group.name} runs more than one business, add them here to see the whole group in one place.
      </p>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3 max-w-3xl mx-auto text-left">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="w-6 h-6 rounded-full border border-line text-xs text-text-muted flex items-center justify-center shrink-0">{i + 1}</span>
            <span>
              <span className="block text-sm font-medium text-text">{s.title}</span>
              <span className="block text-xs text-text-muted mt-0.5 leading-relaxed">{s.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onAddSegment} className="h-9 px-4 rounded-lg border border-line bg-surface hover:bg-surface-2 text-sm text-text cursor-pointer">
          Create a category
        </button>
        <button type="button" onClick={onAddCompany} className="h-9 px-4 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer">
          Add your first company
        </button>
      </div>
    </div>
  );
}

/** Combined figures. Shown only once companies have them, with how many companies each figure covers. */
function Summary({ data }: { data: GroupData }) {
  const n = data.companies.length;
  const stats: Array<{ label: string; value: string; note: string }> = [];
  const note = (count: number) => (count < n ? `From ${count} of ${n} companies` : `All ${n} companies`);
  for (const f of FIGURES) {
    const s = sum(data.companies, f.key);
    if (s.count) stats.push({ label: f.total, value: formatAmount(s.total), note: note(s.count) });
  }
  const people = sum(data.companies, "teamSize");
  if (people.count) stats.push({ label: "People", value: people.total.toLocaleString("en-IN"), note: note(people.count) });
  if (stats.length === 0) return null;

  return (
    <section aria-label="Group figures" className="grid grid-cols-2 lg:grid-cols-4 rounded-xl border border-line bg-surface divide-x divide-line overflow-hidden">
      {stats.map(s => (
        <div key={s.label} className="px-5 py-4">
          <p className="text-xs text-text-muted">{s.label}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-text tabular-nums">{s.value}</p>
          <p className="mt-0.5 text-[11px] text-text-muted">{s.note}</p>
        </div>
      ))}
    </section>
  );
}

function CategoryNav({ data, filter, setFilter, onAdd }: { data: GroupData; filter: string; setFilter: (v: string) => void; onAdd?: () => void }) {
  const known = new Set(data.segments.map(s => s.id));
  const uncategorised = data.companies.filter(c => !c.segmentId || !known.has(c.segmentId)).length;
  const items = [
    { id: ALL, label: "All companies", count: data.companies.length },
    ...data.segments.map(s => ({ id: s.id, label: s.name, count: data.companies.filter(c => c.segmentId === s.id).length })),
    ...(uncategorised > 0 && data.segments.length > 0 ? [{ id: UNCATEGORISED, label: "Not in a category", count: uncategorised }] : []),
  ];

  return (
    <>
      {/* Phone and tablet: a simple picker */}
      <select
        value={filter}
        onChange={e => setFilter(e.target.value)}
        aria-label="Category"
        className="lg:hidden w-full h-9 px-3 rounded-lg bg-surface border border-line text-sm text-text focus:outline-none focus:border-brass"
      >
        {items.map(i => (
          <option key={i.id} value={i.id}>
            {i.label} ({i.count})
          </option>
        ))}
      </select>

      {/* Desktop: the category list beside the companies */}
      <nav aria-label="Categories" className="hidden lg:block sticky top-6">
        <p className="px-3 pb-2 text-xs font-medium text-text-muted">Categories</p>
        <ul className="space-y-0.5">
          {items.map(i => {
            const on = filter === i.id;
            return (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => setFilter(i.id)}
                  aria-current={on ? "true" : undefined}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-sm text-left cursor-pointer transition-colors ${
                    on ? "bg-surface-2 text-text font-medium" : "text-text-muted hover:text-text hover:bg-surface-2/60"
                  }`}
                >
                  <span className="truncate">{i.label}</span>
                  <span className="text-xs tabular-nums text-text-muted">{i.count}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {onAdd && (
          <button type="button" onClick={onAdd} className="mt-2 w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-text-muted hover:text-text hover:bg-surface-2/60 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> New category
          </button>
        )}
      </nav>
    </>
  );
}

function Sections({
  data,
  filter,
  query,
  opening,
  onOpen,
  onDialog,
  onMoveSegment,
}: {
  data: GroupData;
  filter: string;
  query: string;
  opening: string | null;
  onOpen: (id: string) => void;
  onDialog: (d: Dialog) => void;
  onMoveSegment: (s: Segment, move: "up" | "down") => void;
}) {
  const q = query.trim().toLowerCase();
  const isMatch = (c: Company) =>
    !q || c.name.toLowerCase().includes(q) || c.industryLabel.toLowerCase().includes(q) || c.website.toLowerCase().includes(q);

  const known = new Set(data.segments.map(s => s.id));
  const ids = new Set(data.companies.map(c => c.id));
  const childrenOf = new Map<string, Company[]>();
  for (const c of data.companies) {
    if (c.parentId && ids.has(c.parentId)) childrenOf.set(c.parentId, [...(childrenOf.get(c.parentId) || []), c]);
  }

  /** A card is shown when the company or anything under it matches the search. */
  const subtreeMatches = (c: Company): boolean => isMatch(c) || (childrenOf.get(c.id) || []).some(subtreeMatches);

  const sections = [
    ...data.segments.map((s, i) => ({ segment: s as Segment | null, key: s.id, index: i })),
    { segment: null as Segment | null, key: UNCATEGORISED, index: -1 },
  ]
    .filter(s => filter === ALL || s.key === filter)
    .map(s => {
      const inSection = data.companies.filter(c => (s.segment ? c.segmentId === s.segment.id : !c.segmentId || !known.has(c.segmentId)));
      const top = inSection.filter(c => !c.parentId || !ids.has(c.parentId)).filter(subtreeMatches);
      return { ...s, inSection, top };
    })
    .filter(s => s.top.length > 0 || (s.segment && !q));

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line py-14 text-center text-sm text-text-muted">
        {q ? `No company matches “${query}”.` : "No companies here yet."}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sections.map(section => {
        const seg = section.segment;
        const title = seg ? seg.name : data.segments.length > 0 ? "Not in a category" : "Companies";
        const revenue = sum(section.inSection, "monthlyRevenue");
        return (
          <section key={section.key} aria-label={title}>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="min-w-0 flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold text-text truncate">{title}</h2>
                <span className="text-xs text-text-muted shrink-0 tabular-nums">
                  {section.inSection.length}
                  {revenue.count > 0 && ` · ${formatAmount(revenue.total)}/mo`}
                </span>
              </div>
              {data.canManage && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onDialog({ kind: "addCompany", segmentId: seg?.id || null })}
                    className="h-7 px-2 rounded-md text-xs text-text-muted hover:text-text hover:bg-surface-2 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add company
                  </button>
                  {seg && (
                    <ActionMenu
                      label={`More actions for ${seg.name}`}
                      actions={[
                        { label: "Rename", icon: <Pencil className="w-3.5 h-3.5" />, onSelect: () => onDialog({ kind: "renameSegment", segment: seg }) },
                        { label: "Move up", icon: <ArrowUp className="w-3.5 h-3.5" />, disabled: section.index === 0, onSelect: () => onMoveSegment(seg, "up") },
                        {
                          label: "Move down",
                          icon: <ArrowDown className="w-3.5 h-3.5" />,
                          disabled: section.index === data.segments.length - 1,
                          onSelect: () => onMoveSegment(seg, "down"),
                        },
                        {
                          label: "Delete category",
                          icon: <Trash2 className="w-3.5 h-3.5" />,
                          danger: true,
                          separated: true,
                          onSelect: () => onDialog({ kind: "deleteSegment", segment: seg }),
                        },
                      ]}
                    />
                  )}
                </div>
              )}
            </div>

            {section.top.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line py-8 text-center text-sm text-text-muted">
                No companies in {title} yet.
                {data.canManage && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => onDialog({ kind: "addCompany", segmentId: seg?.id || null })}
                      className="text-brass hover:underline cursor-pointer"
                    >
                      Add one
                    </button>
                  </>
                )}
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {section.top.map(c => (
                  <CompanyCard
                    key={c.id}
                    company={c}
                    childrenOf={childrenOf}
                    activeId={data.activeBusinessId}
                    canManage={data.canManage}
                    opening={opening}
                    onOpen={onOpen}
                    onDialog={onDialog}
                  />
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function companyActions(company: Company, onDialog: (d: Dialog) => void) {
  return [
    { label: "Edit details", icon: <Pencil className="w-3.5 h-3.5" />, onSelect: () => onDialog({ kind: "editCompany", company }) },
    { label: "Add a company under it", icon: <Plus className="w-3.5 h-3.5" />, onSelect: () => onDialog({ kind: "addCompany", parentId: company.id }) },
    { label: "Remove", icon: <Trash2 className="w-3.5 h-3.5" />, danger: true, separated: true, onSelect: () => onDialog({ kind: "deleteCompany", company }) },
  ];
}

function CompanyCard({
  company,
  childrenOf,
  activeId,
  canManage,
  opening,
  onOpen,
  onDialog,
}: {
  company: Company;
  childrenOf: Map<string, Company[]>;
  activeId: string;
  canManage: boolean;
  opening: string | null;
  onOpen: (id: string) => void;
  onDialog: (d: Dialog) => void;
}) {
  const isActive = company.id === activeId;
  const site = company.website.replace(/^https?:\/\/(www\.)?/, "");
  const figures = FIGURES.filter(f => company[f.key] !== null);

  // Everything under this company, one level after another
  const nested: Array<{ company: Company; depth: number }> = [];
  const walk = (list: Company[], depth: number) => {
    for (const c of list) {
      nested.push({ company: c, depth });
      walk(childrenOf.get(c.id) || [], depth + 1);
    }
  };
  walk(childrenOf.get(company.id) || [], 0);

  return (
    <li
      className={`rounded-xl border bg-surface flex flex-col transition-shadow hover:shadow-[0_2px_12px_-4px_rgba(0,0,0,0.12)] ${
        isActive ? "border-brass/50" : "border-line"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => onOpen(company.id)}
          disabled={Boolean(opening) || isActive}
          className="flex items-start gap-3 min-w-0 flex-1 text-left cursor-pointer disabled:cursor-default"
          title={isActive ? "You are working in this company" : `Open ${company.name}`}
        >
          <CompanyAvatar name={company.name} logoUrl={company.logoUrl} id={company.id} website={company.website} size="md" />
          <span className="min-w-0 flex-1 pt-px">
            <span className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text truncate">{company.name}</span>
              {opening === company.id && <Loader2 className="w-3.5 h-3.5 text-text-muted animate-spin shrink-0" />}
              {isActive && <span className="text-[10px] font-medium text-brass shrink-0">Current</span>}
            </span>
            <span className="block text-xs text-text-muted truncate mt-0.5">
              {[company.industryLabel, site].filter(Boolean).join(" · ") || "No details yet"}
            </span>
          </span>
        </button>
        {canManage && (
          <div className="-mr-1.5 -mt-1">
            <ActionMenu label={`More actions for ${company.name}`} actions={companyActions(company, onDialog)} />
          </div>
        )}
      </div>

      {(figures.length > 0 || company.openTasks > 0) && (
        <dl className="mx-4 mb-4 grid grid-cols-3 gap-3">
          {figures.map(f => (
            <div key={f.key} className="min-w-0">
              <dt className="text-[11px] text-text-muted truncate">{f.label}</dt>
              <dd className="text-sm font-medium text-text tabular-nums truncate">{formatAmount(company[f.key])}</dd>
            </div>
          ))}
          {company.openTasks > 0 && (
            <div className="min-w-0">
              <dt className="text-[11px] text-text-muted">Open tasks</dt>
              <dd className="text-sm font-medium text-text tabular-nums">{company.openTasks}</dd>
            </div>
          )}
        </dl>
      )}

      {nested.length > 0 && (
        <div className="mt-auto border-t border-line px-2 py-1.5">
          <p className="px-2 pt-1 pb-0.5 text-[11px] text-text-muted">
            {nested.length} {nested.length === 1 ? "company" : "companies"} under {company.name}
          </p>
          <ul>
            {nested.map(({ company: child, depth }) => {
              const childActive = child.id === activeId;
              return (
                <li key={child.id} className="flex items-center gap-1 rounded-md hover:bg-surface-2/70" style={{ paddingLeft: depth * 16 }}>
                  <button
                    type="button"
                    onClick={() => onOpen(child.id)}
                    disabled={Boolean(opening) || childActive}
                    className="flex items-center gap-2 min-w-0 flex-1 px-2 py-1.5 text-left cursor-pointer disabled:cursor-default"
                    title={childActive ? "You are working in this company" : `Open ${child.name}`}
                  >
                    <CompanyAvatar name={child.name} logoUrl={child.logoUrl} id={child.id} website={child.website} size="xs" />
                    <span className="text-sm text-text truncate">{child.name}</span>
                    {opening === child.id && <Loader2 className="w-3 h-3 text-text-muted animate-spin shrink-0" />}
                    {childActive && <span className="text-[10px] font-medium text-brass shrink-0">Current</span>}
                  </button>
                  {canManage && <ActionMenu label={`More actions for ${child.name}`} actions={companyActions(child, onDialog)} />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </li>
  );
}

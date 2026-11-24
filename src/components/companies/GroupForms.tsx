"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { BUSINESS_TYPES } from "@/lib/onboarding/data";
import { orderedTree, type Company, type GroupData } from "@/lib/hooks/useCompanies";

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass disabled:opacity-60";
const labelClass = "block text-sm font-medium text-text mb-1.5";

async function send(url: string, method: string, body?: any): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Could not reach the server. Please check your connection.");
  }
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.success) throw new Error(d.error || "Something went wrong. Please try again.");
  return d;
}

function ModalFrame({
  title,
  intro,
  onClose,
  onSubmit,
  submitLabel,
  submitting,
  error,
  danger,
  children,
}: {
  title: string;
  intro?: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitting: boolean;
  error?: string;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (!submitting) onSubmit();
      }}
      className="w-[min(32rem,calc(100vw-2rem))] max-h-[calc(100vh-2rem)] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl"
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-text">{title}</h3>
          {intro && <p className="text-sm text-text-muted mt-1 leading-relaxed">{intro}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-text-muted hover:text-text cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      {children && <div className="px-6 pb-5 space-y-4 overflow-y-auto">{children}</div>}
      {error && <p className="px-6 pb-3 text-sm text-rust">{error}</p>}
      <div className="px-6 py-4 border-t border-line bg-surface-2/40 rounded-b-2xl flex items-center justify-end gap-2">
        <button type="button" onClick={onClose} className="px-3.5 py-2 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer">
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 rounded-lg text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-60 ${
            danger ? "bg-rust" : "bg-brass"
          }`}
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ company

const NEW_SEGMENT = "__new__";

/** Ids of a company and the companies under it (they cannot be chosen as its parent). */
function descendants(companies: Company[], id: string): Set<string> {
  const out = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const c of companies) {
      if (c.parentId && out.has(c.parentId) && !out.has(c.id)) {
        out.add(c.id);
        grew = true;
      }
    }
  }
  return out;
}

const asText = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));

export function CompanyFormModal({
  data,
  company,
  defaults,
  onClose,
  onSaved,
}: {
  data: GroupData;
  /** Set when editing */
  company?: Company | null;
  /** Pre-selected placement when adding */
  defaults?: { segmentId?: string | null; parentId?: string | null };
  onClose: () => void;
  onSaved: (result: { id: string; name: string; created: boolean }) => void;
}) {
  const editing = Boolean(company);
  const knownType = BUSINESS_TYPES.find(t => t.id === company?.industry);
  const [name, setName] = useState(company?.name || "");
  const [parentId, setParentId] = useState<string>(company?.parentId || defaults?.parentId || "");
  const [segmentId, setSegmentId] = useState<string>(company?.segmentId || defaults?.segmentId || "");
  const [newSegment, setNewSegment] = useState("");
  const [industry, setIndustry] = useState<string>(company ? knownType?.id || (company.industryLabel ? "other" : "") : "");
  const [customIndustry, setCustomIndustry] = useState(company && !knownType ? company.industryLabel : "");
  const [website, setWebsite] = useState(company?.website || "");
  const [revenue, setRevenue] = useState(asText(company?.monthlyRevenue));
  const [burn, setBurn] = useState(asText(company?.monthlyBurn));
  const [cash, setCash] = useState(asText(company?.cashOnHand));
  const [people, setPeople] = useState(asText(company?.teamSize));
  const [showFigures, setShowFigures] = useState(
    Boolean(company && (company.monthlyRevenue || company.monthlyBurn || company.cashOnHand || company.teamSize))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const blocked = useMemo(() => (company ? descendants(data.companies, company.id) : new Set<string>()), [data.companies, company]);
  const parentOptions = useMemo(() => orderedTree(data.companies).filter(r => !blocked.has(r.company.id) && r.depth < 3), [data.companies, blocked]);
  const parent = data.companies.find(c => c.id === parentId) || null;
  const parentSegment = parent ? data.segments.find(s => s.id === parent.segmentId) : null;

  const submit = async () => {
    setError("");
    if (!name.trim()) return setError("Please enter the company's name.");
    if (industry === "other" && !customIndustry.trim()) return setError("Please say what the company does.");
    setSubmitting(true);
    try {
      let chosenSegment: string | null = parentId ? null : segmentId || null;
      if (!parentId && segmentId === NEW_SEGMENT) {
        if (!newSegment.trim()) throw new Error("Please name the new category.");
        chosenSegment = (await send("/api/companies/segments", "POST", { name: newSegment })).id;
      }
      const type = BUSINESS_TYPES.find(t => t.id === industry);
      const body: any = {
        name,
        parentId: parentId || null,
        industry: industry || "",
        industryLabel: industry === "other" ? customIndustry.trim() : type?.title || "",
        website,
        monthlyRevenue: revenue,
        monthlyBurn: burn,
        cashOnHand: cash,
        teamSize: people,
      };
      if (!parentId) body.segmentId = chosenSegment;
      if (editing && company) {
        await send("/api/companies", "PATCH", { id: company.id, ...body });
        onSaved({ id: company.id, name: name.trim(), created: false });
      } else {
        const d = await send("/api/companies", "POST", body);
        onSaved({ id: d.id, name: name.trim(), created: true });
      }
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <PortalModal isOpen onClose={onClose}>
      <ModalFrame
        title={editing ? `Edit ${company?.name}` : "Add a company"}
        intro={
          editing
            ? undefined
            : `It gets its own dashboard, tasks, documents and AI advisors inside ${data.group.name}. You can switch to it from the menu.`
        }
        onClose={onClose}
        onSubmit={submit}
        submitLabel={editing ? "Save changes" : "Add company"}
        submitting={submitting}
        error={error}
      >
        <div>
          <label className={labelClass} htmlFor="co-name">Company name</label>
          <input id="co-name" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tata Consultancy Services" maxLength={120} className={inputClass} />
        </div>

        <div>
          <label className={labelClass} htmlFor="co-parent">Sits under</label>
          <select id="co-parent" value={parentId} onChange={e => setParentId(e.target.value)} className={inputClass}>
            <option value="">{data.group.name} (directly)</option>
            {parentOptions.map(({ company: c, depth }) => (
              <option key={c.id} value={c.id}>
                {" ".repeat(depth)}
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1.5">Choose a company when this one is part of it, for example a brand under its parent company.</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="co-segment">Category</label>
          {parent ? (
            <p className="text-sm text-text-muted px-3 py-2 rounded-lg bg-surface-2 border border-line">
              {parentSegment ? `${parentSegment.name}, the same as ${parent.name}` : `None, the same as ${parent.name}`}
            </p>
          ) : (
            <>
              <select id="co-segment" value={segmentId} onChange={e => setSegmentId(e.target.value)} className={inputClass}>
                <option value="">No category</option>
                {data.segments.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                <option value={NEW_SEGMENT}>New category…</option>
              </select>
              {segmentId === NEW_SEGMENT && (
                <input
                  value={newSegment}
                  onChange={e => setNewSegment(e.target.value)}
                  placeholder="e.g. IT & Digital"
                  maxLength={80}
                  className={`${inputClass} mt-2`}
                  aria-label="New category name"
                />
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass} htmlFor="co-industry">Industry</label>
            <select id="co-industry" value={industry} onChange={e => setIndustry(e.target.value)} className={inputClass}>
              <option value="">Not set</option>
              {BUSINESS_TYPES.map(t => (
                <option key={t.id} value={t.id}>
                  {t.id === "other" ? "Something else" : t.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="co-web">Website</label>
            <input id="co-web" value={website} onChange={e => setWebsite(e.target.value)} placeholder="company.com" className={inputClass} />
          </div>
        </div>
        {industry === "other" && (
          <input
            value={customIndustry}
            onChange={e => setCustomIndustry(e.target.value)}
            placeholder="What does it do? e.g. Hotels & Hospitality"
            maxLength={80}
            className={inputClass}
            aria-label="What the company does"
          />
        )}

        {showFigures ? (
          <div className="space-y-3 pt-1">
            <div>
              <p className="text-sm font-medium text-text">Key figures</p>
              <p className="text-xs text-text-muted mt-0.5">Optional. Used for the group totals. The company can also update them in its own Settings.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: "rev", label: "Monthly revenue (₹)", value: revenue, set: setRevenue },
                { id: "burn", label: "Monthly spend (₹)", value: burn, set: setBurn },
                { id: "cash", label: "Cash in bank (₹)", value: cash, set: setCash },
                { id: "ppl", label: "People", value: people, set: setPeople },
              ].map(f => (
                <div key={f.id}>
                  <label className="block text-xs text-text-muted mb-1" htmlFor={`co-${f.id}`}>{f.label}</label>
                  <input
                    id={`co-${f.id}`}
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowFigures(true)} className="text-sm text-brass hover:underline cursor-pointer">
            Add key figures (optional)
          </button>
        )}
      </ModalFrame>
    </PortalModal>
  );
}

// ----------------------------------------------------------------- category

export function SegmentFormModal({
  segment,
  onClose,
  onSaved,
}: {
  segment?: { id: string; name: string } | null;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(segment?.name || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (!name.trim()) return setError("Please enter a name for the category.");
    setSubmitting(true);
    try {
      if (segment) await send("/api/companies/segments", "PATCH", { id: segment.id, name });
      else await send("/api/companies/segments", "POST", { name });
      onSaved(name.trim());
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <PortalModal isOpen onClose={onClose}>
      <ModalFrame
        title={segment ? "Rename category" : "New category"}
        intro={segment ? undefined : "Group your companies by line of business, for example IT & Digital, Automobiles or Financial Services."}
        onClose={onClose}
        onSubmit={submit}
        submitLabel={segment ? "Save" : "Create category"}
        submitting={submitting}
        error={error}
      >
        <div>
          <label className={labelClass} htmlFor="seg-name">Name</label>
          <input id="seg-name" autoFocus value={name} onChange={e => setName(e.target.value)} maxLength={80} placeholder="e.g. Consumer & Retail" className={inputClass} />
        </div>
      </ModalFrame>
    </PortalModal>
  );
}

// ------------------------------------------------------------------ removal

export function DeleteCompanyModal({
  data,
  company,
  onClose,
  onDeleted,
}: {
  data: GroupData;
  company: Company;
  onClose: () => void;
  onDeleted: (removedIds: string[]) => void;
}) {
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const removed = useMemo(() => Array.from(descendants(data.companies, company.id)), [data.companies, company.id]);
  const under = removed.length - 1;

  const submit = async () => {
    setError("");
    if (typed.trim().toLowerCase() !== company.name.trim().toLowerCase()) return setError("Type the company's name exactly to confirm.");
    setSubmitting(true);
    try {
      await send(`/api/companies?id=${encodeURIComponent(company.id)}`, "DELETE");
      onDeleted(removed);
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };

  return (
    <PortalModal isOpen onClose={onClose}>
      <ModalFrame
        title={`Remove ${company.name}?`}
        intro={
          <>
            This permanently deletes {under > 0 ? <strong className="text-text">{company.name} and the {under} {under === 1 ? "company" : "companies"} under it</strong> : "the company"}, with
            its tasks, documents, connections and history. This cannot be undone.
          </>
        }
        onClose={onClose}
        onSubmit={submit}
        submitLabel="Remove permanently"
        submitting={submitting}
        error={error}
        danger
      >
        <div>
          <label className={labelClass} htmlFor="del-name">
            Type <span className="font-semibold">{company.name}</span> to confirm
          </label>
          <input id="del-name" autoFocus value={typed} onChange={e => setTyped(e.target.value)} className={inputClass} autoComplete="off" />
        </div>
      </ModalFrame>
    </PortalModal>
  );
}

export function DeleteSegmentModal({
  segment,
  companyCount,
  onClose,
  onDeleted,
}: {
  segment: { id: string; name: string };
  companyCount: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setSubmitting(true);
    try {
      await send(`/api/companies/segments?id=${encodeURIComponent(segment.id)}`, "DELETE");
      onDeleted();
    } catch (e: any) {
      setError(e.message);
      setSubmitting(false);
    }
  };
  return (
    <PortalModal isOpen onClose={onClose}>
      <ModalFrame
        title={`Delete the ${segment.name} category?`}
        intro={
          companyCount > 0
            ? `Its ${companyCount} ${companyCount === 1 ? "company stays" : "companies stay"} in your group, without a category. Nothing else is deleted.`
            : "It has no companies. Nothing else is deleted."
        }
        onClose={onClose}
        onSubmit={submit}
        submitLabel="Delete category"
        submitting={submitting}
        error={error}
        danger
      />
    </PortalModal>
  );
}

export { send as sendCompanyRequest };

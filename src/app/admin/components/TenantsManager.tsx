"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpRight, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  AdminModal,
  Avatar,
  EmptyState,
  Panel,
  PanelToolbar,
  SearchInput,
  StatCard,
  dangerIconButton,
  formatInr,
  formatLoginTime,
  formatWhen,
  iconButton,
  inputClass,
  labelClass,
  primaryButton,
  secondaryButton,
  td,
  th,
} from "./ui";

import { askConfirm } from "@/components/ui/dialogs";
interface Tenant {
  id: string;
  name: string;
  founderName: string;
  industry: string;
  industryLabel: string;
  website: string;
  teamSize: number;
  annualRevenue: number;
  monthlyRevenue: number;
  monthlyBurn: number;
  cashOnHand: number;
  runwayMonths: string;
  connectedTools: string[];
  logoUrl?: string | null;
  lastLoginAt?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
  authProvider?: string | null;
  isRegisteredUser?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TenantsManagerProps {
  tenants: Tenant[];
  stats: any;
  onRefresh: () => Promise<void>;
  notify: (msg: string) => void;
}

const INDUSTRIES: Record<string, string> = {
  saas: "B2B SaaS & Tech",
  it_services: "IT & Technology Services",
  agency: "Digital & Creative Agency",
  ecommerce: "D2C & E-Commerce",
  manufacturing: "Manufacturing & Supply Chain",
  consulting: "Professional Consulting",
};

const EMPTY_FORM = {
  name: "",
  founderName: "",
  industry: "saas",
  industryLabel: INDUSTRIES.saas,
  annualRevenue: 0,
  monthlyRevenue: 0,
  monthlyBurn: 0,
  cashOnHand: 0,
  teamSize: 1,
  website: "",
  logoUrl: "",
};

/** Runway only means something when both cash and monthly spending are known */
function runwayOf(t: Tenant): number | null {
  if (!(t.cashOnHand > 0) || !(t.monthlyBurn > 0)) return null;
  return t.cashOnHand / t.monthlyBurn;
}

const DAY = 24 * 60 * 60 * 1000;

export function TenantsManager({ tenants, onRefresh, notify }: TenantsManagerProps) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [viewing, setViewing] = useState<Tenant | null>(null);

  const openCreateModal = () => {
    setEditingTenant(null);
    setForm({ ...EMPTY_FORM });
    setIsModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setForm({
      name: t.name,
      founderName: t.founderName,
      industry: t.industry,
      industryLabel: t.industryLabel,
      annualRevenue: t.annualRevenue,
      monthlyRevenue: t.monthlyRevenue,
      monthlyBurn: t.monthlyBurn,
      cashOnHand: t.cashOnHand,
      teamSize: t.teamSize,
      website: t.website || "",
      logoUrl: t.logoUrl || "",
    });
    setIsModalOpen(true);
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      setSaving(true);
      const res = await fetch("/api/admin/tenants", {
        method: editingTenant ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(editingTenant ? { ...form, id: editingTenant.id } : form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      notify(editingTenant ? `Saved "${form.name}".` : `Added "${form.name}".`);
      await onRefresh();
      setIsModalOpen(false);
    } catch (err: any) {
      notify(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDashboard = async (t: Tenant) => {
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: t.id, setActive: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      localStorage.setItem("bizzpal_business_profile", JSON.stringify(t));
      window.open("/dashboard", "_blank");
    } catch (err: any) {
      notify(`Could not open the dashboard: ${err.message}`);
    }
  };

  const handleDelete = async (t: Tenant) => {
    if (!(await askConfirm({ title: `Delete ${t.name}?`, message: "The business and all of its data will be removed. This cannot be undone.", confirmLabel: "Delete business", danger: true }))) return;
    try {
      const res = await fetch(`/api/admin/tenants?businessId=${encodeURIComponent(t.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
      notify(`Deleted "${t.name}".`);
      await onRefresh();
    } catch (err: any) {
      notify(`Delete failed: ${err.message}`);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      tenants.filter(
        (t) =>
          !q ||
          [t.name, t.founderName, t.industryLabel, t.ownerEmail || ""].some((v) => String(v).toLowerCase().includes(q)),
      ),
    [tenants, q],
  );

  const kpis = useMemo(() => {
    const now = Date.now();
    const active = tenants.filter((t) => t.lastLoginAt && now - new Date(t.lastLoginAt).getTime() < 7 * DAY).length;
    const newThisMonth = tenants.filter((t) => t.createdAt && now - new Date(t.createdAt).getTime() < 30 * DAY).length;
    const reporting = tenants.filter((t) => t.monthlyRevenue > 0);
    const revenue = reporting.reduce((s, t) => s + t.monthlyRevenue, 0);
    const lowRunway = tenants.filter((t) => {
      const r = runwayOf(t);
      return r !== null && r < 6;
    }).length;
    return { active, newThisMonth, reporting: reporting.length, revenue, lowRunway };
  }, [tenants]);

  const setNum = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: Math.max(0, Number(e.target.value) || 0) });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Businesses"
          value={tenants.length}
          note={kpis.newThisMonth ? `${kpis.newThisMonth} joined in the last 30 days` : "None joined in the last 30 days"}
        />
        <StatCard label="Active this week" value={kpis.active} note="Signed in during the last 7 days" />
        <StatCard
          label="Monthly revenue reported"
          value={formatInr(kpis.revenue)}
          note={`${kpis.reporting} of ${tenants.length} businesses have entered it`}
        />
        <StatCard label="Low on cash" value={kpis.lowRunway} note="Less than 6 months of runway" />
      </div>

      <Panel>
        <PanelToolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by business, founder, email or industry" className="sm:w-96" />
          <div className="flex items-center gap-2 sm:ml-auto">
            <button type="button" onClick={refresh} className={iconButton} title="Refresh" aria-label="Refresh" disabled={refreshing}>
              <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <button type="button" onClick={openCreateModal} className={primaryButton}>
              <Plus className="w-4 h-4" /> Add business
            </button>
          </div>
        </PanelToolbar>

        {filtered.length === 0 ? (
          q ? (
            <EmptyState title={`No businesses match "${search}"`} text="Try a different name, email or industry." />
          ) : (
            <EmptyState title="No businesses yet" text="Businesses appear here as soon as someone signs up." />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className={th}>Business</th>
                  <th className={th}>Industry</th>
                  <th className={th}>Last active</th>
                  <th className={`${th} text-right`}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((t) => {
                  return (
                    <tr
                      key={t.id}
                      onClick={() => setViewing(t)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && e.target === e.currentTarget) setViewing(t);
                      }}
                      tabIndex={0}
                      className="hover:bg-surface-2/40 cursor-pointer focus:outline-none focus-visible:bg-surface-2/60"
                      title="Show all details"
                    >
                      <td className={td}>
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={t.name} src={t.logoUrl} />
                          <div className="min-w-0">
                            <p className="font-medium text-text truncate max-w-[280px]">{t.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${td} text-text-muted`}>
                        <span className="block truncate max-w-[200px]">{t.industryLabel}</span>
                      </td>
                      <td className={`${td} text-text-muted whitespace-nowrap`} title={t.lastLoginAt ? new Date(t.lastLoginAt).toLocaleString("en-IN") : undefined}>
                        {formatLoginTime(t.lastLoginAt)}
                      </td>
                      <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDashboard(t)}
                            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg text-sm text-text hover:bg-surface-2 cursor-pointer whitespace-nowrap"
                            title="Open this business's dashboard in a new tab"
                          >
                            Open <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => openEditModal(t)} className={iconButton} title="Edit" aria-label={`Edit ${t.name}`}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDelete(t)} className={dangerIconButton} title="Delete" aria-label={`Delete ${t.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-line text-xs text-text-muted">
            Showing {filtered.length} of {tenants.length}
          </div>
        )}
      </Panel>

      <AdminModal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.name || ""}
        subtitle={viewing ? viewing.industryLabel : undefined}
        width="max-w-2xl"
        footer={
          viewing && (
            <>
              <button
                type="button"
                onClick={() => {
                  const t = viewing;
                  setViewing(null);
                  handleDelete(t);
                }}
                className="mr-auto inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-sm text-text-muted hover:text-rust hover:bg-rust/10 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = viewing;
                  setViewing(null);
                  openEditModal(t);
                }}
                className={secondaryButton}
              >
                <Pencil className="w-4 h-4" /> Edit
              </button>
              <button type="button" onClick={() => handleOpenDashboard(viewing)} className={primaryButton}>
                Open dashboard <ArrowUpRight className="w-4 h-4" />
              </button>
            </>
          )
        }
      >
        {viewing && <TenantDetails t={viewing} />}
      </AdminModal>

      <AdminModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTenant ? "Edit business" : "Add business"}
        subtitle={editingTenant ? editingTenant.name : "Create a business account by hand."}
        footer={
          <>
            <button type="button" onClick={() => setIsModalOpen(false)} className={secondaryButton}>
              Cancel
            </button>
            <button type="submit" form="tenant-form" disabled={saving || !form.name.trim()} className={primaryButton}>
              {saving ? "Saving…" : editingTenant ? "Save changes" : "Add business"}
            </button>
          </>
        }
      >
        <form id="tenant-form" onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Business name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="e.g. Nexa Systems" />
            </div>
            <div>
              <label className={labelClass}>Founder</label>
              <input value={form.founderName} onChange={(e) => setForm({ ...form, founderName: e.target.value })} className={inputClass} placeholder="Full name" />
            </div>
            <div>
              <label className={labelClass}>Industry</label>
              <select
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value, industryLabel: INDUSTRIES[e.target.value] || form.industryLabel })}
                className={`${inputClass} cursor-pointer`}
              >
                {!INDUSTRIES[form.industry] && <option value={form.industry}>{form.industryLabel}</option>}
                {Object.entries(INDUSTRIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Team size</label>
              <input type="number" min={1} value={form.teamSize} onChange={(e) => setForm({ ...form, teamSize: Math.max(1, Number(e.target.value) || 1) })} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputClass} placeholder="https://company.in" />
            </div>
          </div>

          <div>
            <p className={labelClass}>Logo</p>
            <div className="flex items-center gap-3">
              <Avatar name={form.name} src={form.logoUrl || null} size={44} />
              <label className={`${secondaryButton} h-9`}>
                Upload image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      notify("Please choose an image under 2 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const res = ev.target?.result as string;
                      if (res) setForm((f) => ({ ...f, logoUrl: res }));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              {form.logoUrl && (
                <button type="button" onClick={() => setForm({ ...form, logoUrl: "" })} className="text-sm text-text-muted hover:text-rust cursor-pointer">
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-line">
            <p className="text-sm font-medium text-text">Business numbers</p>
            <p className="text-xs text-text-muted mt-0.5 mb-3">In rupees. Leave at 0 if you don&apos;t know them.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Monthly revenue</label>
                <input type="number" min={0} value={form.monthlyRevenue} onChange={setNum("monthlyRevenue")} className={`${inputClass} tabular-nums`} />
              </div>
              <div>
                <label className={labelClass}>Yearly revenue</label>
                <input type="number" min={0} value={form.annualRevenue} onChange={setNum("annualRevenue")} className={`${inputClass} tabular-nums`} />
              </div>
              <div>
                <label className={labelClass}>Monthly spending</label>
                <input type="number" min={0} value={form.monthlyBurn} onChange={setNum("monthlyBurn")} className={`${inputClass} tabular-nums`} />
              </div>
              <div>
                <label className={labelClass}>Cash in the bank</label>
                <input type="number" min={0} value={form.cashOnHand} onChange={setNum("cashOnHand")} className={`${inputClass} tabular-nums`} />
              </div>
            </div>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

function DetailGroup({ title, rows }: { title: string; rows: [string, React.ReactNode][] }) {
  return (
    <section>
      <h3 className="text-xs font-medium text-text-muted mb-2">{title}</h3>
      <dl className="rounded-xl border border-line divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="px-4 py-2.5 grid grid-cols-[150px_1fr] gap-4 text-sm">
            <dt className="text-text-muted">{k}</dt>
            <dd className="text-text min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const PROVIDER_LABEL: Record<string, string> = { google: "Google", password: "Email and password", email: "Email link" };
const fullDate = (d?: string | null) =>
  d && !isNaN(new Date(d).getTime())
    ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";
const notSet = <span className="text-text-muted">Not added</span>;

function TenantDetails({ t }: { t: Tenant }) {
  const runway = runwayOf(t);
  const money = (n: number) => (n > 0 ? `₹${n.toLocaleString("en-IN")}` : notSet);
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar name={t.name} src={t.logoUrl} size={48} />
        <div className="min-w-0">
          <p className="text-base font-semibold text-text truncate">{t.name}</p>
          <p className="text-sm text-text-muted">
            Joined {formatWhen(t.createdAt)} · last active {formatLoginTime(t.lastLoginAt)}
          </p>
        </div>
      </div>

      <DetailGroup
        title="Owner"
        rows={[
          ["Name", t.ownerName || (t.founderName && t.founderName !== "Founder" ? t.founderName : notSet)],
          [
            "Email",
            t.ownerEmail ? (
              <a href={`mailto:${t.ownerEmail}`} className="text-brass hover:underline">
                {t.ownerEmail}
              </a>
            ) : (
              <span className="text-text-muted">No sign-in account linked</span>
            ),
          ],
          ["Signs in with", t.authProvider ? PROVIDER_LABEL[t.authProvider] || t.authProvider : <span className="text-text-muted">—</span>],
          ["Last active", formatLoginTime(t.lastLoginAt)],
        ]}
      />

      <DetailGroup
        title="Business"
        rows={[
          ["Industry", t.industryLabel || notSet],
          ["Team size", `${t.teamSize} ${t.teamSize === 1 ? "person" : "people"}`],
          [
            "Website",
            t.website && t.website !== "https://" ? (
              <a href={t.website} target="_blank" rel="noreferrer" className="text-brass hover:underline">
                {t.website.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              notSet
            ),
          ],
          ["Connected tools", t.connectedTools?.length ? t.connectedTools.join(", ") : <span className="text-text-muted">None</span>],
          ["Created", fullDate(t.createdAt)],
          ["Last updated", fullDate(t.updatedAt)],
          ["Account ID", <span className="text-text-muted text-xs">{t.id}</span>],
        ]}
      />

      <DetailGroup
        title="Numbers"
        rows={[
          ["Monthly revenue", money(t.monthlyRevenue)],
          ["Yearly revenue", money(t.annualRevenue)],
          ["Monthly spending", money(t.monthlyBurn)],
          ["Cash in the bank", money(t.cashOnHand)],
          [
            "Runway",
            runway === null ? (
              <span className="text-text-muted">Needs cash and monthly spending</span>
            ) : (
              <span className={runway < 6 ? "text-rust font-medium" : ""}>{runway >= 100 ? "99+" : runway.toFixed(1)} months</span>
            ),
          ],
        ]}
      />
    </div>
  );
}

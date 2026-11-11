"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Search,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Clock,
  ShieldCheck,
  X,
  Save,
  RotateCcw,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/Badge";

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

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "Never";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
};

export function TenantsManager({ tenants, stats, onRefresh, notify }: TenantsManagerProps) {
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll and support ESC key to close modal
  useEffect(() => {
    if (!isModalOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

  const [form, setForm] = useState({
    name: "",
    founderName: "",
    industry: "saas",
    industryLabel: "B2B SaaS & Tech",
    annualRevenue: 1200000,
    monthlyRevenue: 100000,
    monthlyBurn: 150000,
    cashOnHand: 1200000,
    teamSize: 5,
    website: "",
    logoUrl: "",
  });

  const openCreateModal = () => {
    setEditingTenant(null);
    setForm({
      name: "",
      founderName: "Founder",
      industry: "saas",
      industryLabel: "B2B SaaS & Tech",
      annualRevenue: 2400000,
      monthlyRevenue: 200000,
      monthlyBurn: 120000,
      cashOnHand: 1800000,
      teamSize: 6,
      website: "https://",
      logoUrl: "",
    });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      setSaving(true);
      if (editingTenant) {
        const res = await fetch("/api/admin/tenants", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ ...form, id: editingTenant.id }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
        }
        const data = await res.json();
        if (data.success) {
          notify(`Enterprise "${form.name}" updated successfully.`);
          await onRefresh();
          setIsModalOpen(false);
        } else {
          notify(`Error: ${data.error}`);
        }
      } else {
        const res = await fetch("/api/admin/tenants", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
        }
        const data = await res.json();
        if (data.success) {
          notify(`New enterprise "${form.name}" created.`);
          await onRefresh();
          setIsModalOpen(false);
        } else {
          notify(`Error: ${data.error}`);
        }
      }
    } catch (err: any) {
      notify(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchActive = async (t: Tenant) => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/tenants", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ id: t.id, setActive: true }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
      }
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("bizzpal_business_profile", JSON.stringify(t));
        notify(`Switched active enterprise to "${t.name}". Opening app...`);
        setTimeout(() => {
          window.open("/dashboard", "_blank");
        }, 400);
      }
    } catch (err: any) {
      notify(`Failed to switch active tenant: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: Tenant) => {
    if (!window.confirm(`Permanently delete enterprise "${t.name}" and all associated data from SQLite?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/tenants?businessId=${encodeURIComponent(t.id)}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 80)}`);
      }
      const data = await res.json();
      if (data.success) {
        notify(`Enterprise "${t.name}" deleted.`);
        await onRefresh();
      } else {
        notify(`Delete failed: ${data.error}`);
      }
    } catch (err: any) {
      notify(`Error: ${err.message}`);
    }
  };

  const filtered = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.founderName.toLowerCase().includes(search.toLowerCase()) ||
      t.industryLabel.toLowerCase().includes(search.toLowerCase()) ||
      (t.ownerEmail && t.ownerEmail.toLowerCase().includes(search.toLowerCase()))
  );

  const lakh = (n: number) => `₹${((n || 0) / 100000).toFixed(1)}L`;
  const kpis = [
    { label: "Registered enterprises", value: String(stats.totalBusinesses || tenants.length), note: "Across the platform", Icon: Building2 },
    { label: "Total annual revenue", value: lakh(stats.totalAnnualRevenue), note: "Reported by enterprises", Icon: DollarSign },
    { label: "Monthly spending", value: lakh(stats.totalMonthlyBurn), note: "Combined monthly costs", Icon: TrendingUp },
    { label: "Cash in the bank", value: lakh(stats.totalCashReserves), note: "Combined cash balance", Icon: ShieldCheck },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="p-5 rounded-2xl bg-surface border border-line shadow-sm">
            <div className="flex items-center justify-between text-sm text-text-muted">
              <span>{k.label}</span>
              <k.Icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-semibold text-text mt-2">{k.value}</div>
            <div className="text-xs text-text-muted mt-1">{k.note}</div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, founder or industry"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 text-sm rounded-xl bg-surface border border-line text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => onRefresh()}
            className="p-2.5 rounded-xl border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
            title="Refresh"
            aria-label="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brass hover:brightness-110 text-white flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New enterprise</span>
          </button>
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-text-muted">No enterprises match &ldquo;{search}&rdquo;.</div>
        ) : (
          filtered.map((t) => {
            const runway = Number(t.runwayMonths);
            const initials = t.name.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "EP";
            return (
              <div key={t.id} className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
                <div className="flex items-start gap-3.5 min-w-0">
                  {t.logoUrl ? (
                    <img src={t.logoUrl} alt={t.name} className="w-10 h-10 rounded-xl object-contain shrink-0 border border-line" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-surface-2 text-text-muted text-xs font-semibold flex items-center justify-center shrink-0 border border-line">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-text">{t.name}</span>
                      <span className="text-xs text-text-muted">{t.isRegisteredUser ? "User account" : "Enterprise"}</span>
                    </div>
                    <p className="text-sm text-text-muted truncate">
                      {t.founderName}
                      {t.ownerEmail ? ` · ${t.ownerEmail}` : ""}
                    </p>
                    <p className="text-sm text-text-muted">
                      {t.industryLabel} · {t.teamSize} {t.teamSize === 1 ? "member" : "members"}
                      {t.authProvider ? ` · Signs in with ${t.authProvider}` : ""}
                    </p>
                    <p className="text-xs text-text-muted">
                      Last login {formatDateTime(t.lastLoginAt || t.updatedAt || t.createdAt)}
                      {t.connectedTools && t.connectedTools.length > 0 ? ` · Connected: ${t.connectedTools.join(", ")}` : ""}
                      {t.website && (
                        <>
                          {" · "}
                          <a href={t.website} target="_blank" rel="noreferrer" className="text-brass hover:underline inline-flex items-center gap-0.5">
                            {t.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4 xl:gap-6 shrink-0">
                  <dl className="grid grid-cols-2 min-[460px]:grid-cols-4 gap-x-6 gap-y-2">
                    {[
                      { k: "Revenue / mo", v: `₹${(t.monthlyRevenue / 1000).toFixed(0)}k`, c: "text-text" },
                      { k: "Spending / mo", v: `₹${(t.monthlyBurn / 1000).toFixed(0)}k`, c: "text-text" },
                      { k: "Cash", v: `₹${(t.cashOnHand / 1000).toFixed(0)}k`, c: "text-text" },
                      { k: "Runway", v: `${t.runwayMonths} mo`, c: runway <= 6 ? "text-rust" : "text-text" },
                    ].map(m => (
                      <div key={m.k}>
                        <dt className="text-xs text-text-muted">{m.k}</dt>
                        <dd className={`text-sm font-semibold mt-0.5 ${m.c}`}>{m.v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => handleSwitchActive(t)}
                      className="px-3.5 py-2 rounded-xl text-sm text-text border border-line hover:bg-surface-2 flex items-center gap-1.5 cursor-pointer"
                      title="Open this business in the dashboard"
                    >
                      <Zap className="w-4 h-4" />
                      <span>Open dashboard</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(t)}
                      className="p-2.5 rounded-xl border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
                      title="Edit"
                      aria-label="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t)}
                      className="p-2.5 rounded-xl border border-line hover:bg-rust/10 text-text-muted hover:text-rust cursor-pointer"
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL: ADD / EDIT TENANT */}
      {mounted && isModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-xl max-h-[88vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">
                    {editingTenant ? `Edit Enterprise: ${editingTenant.name}` : "Create New Enterprise Profile"}
                  </h3>
                  <p className="text-xs text-text-muted">Multi-tenant profile & financial telemetry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="tenant-modal-form" onSubmit={handleSave} className="overflow-y-auto px-6 py-4 space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Company / Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nexa Systems"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-gold font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Founder / CEO Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Founder Name"
                    value={form.founderName}
                    onChange={(e) => setForm({ ...form, founderName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Industry Key</label>
                  <select
                    value={form.industry}
                    onChange={(e) => {
                      const ind = e.target.value;
                      const labels: Record<string, string> = {
                        saas: "B2B SaaS & Tech",
                        it_services: "IT & Technology Services",
                        agency: "Digital & Creative Agency",
                        ecommerce: "D2C & E-Commerce",
                        manufacturing: "Manufacturing & Supply Chain",
                        consulting: "Professional Consulting",
                      };
                      setForm({
                        ...form,
                        industry: ind,
                        industryLabel: labels[ind] || "Enterprise Business",
                      });
                    }}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text"
                  >
                    <option value="saas">B2B SaaS</option>
                    <option value="it_services">IT Services</option>
                    <option value="agency">Agency</option>
                    <option value="ecommerce">E-Commerce</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="consulting">Consulting</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Team Size</label>
                  <input
                    type="number"
                    min="1"
                    value={form.teamSize}
                    onChange={(e) => setForm({ ...form, teamSize: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Website URL</label>
                <input
                  type="text"
                  placeholder="https://company.in"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-xs"
                />
              </div>

              {/* Business Logo Upload & Live Preview */}
              <div className="p-3.5 rounded-xl bg-surface-2/50 border border-line space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text">Enterprise Brand Logo</label>
                  {form.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, logoUrl: "" })}
                      className="text-xs text-rust hover:underline cursor-pointer font-medium"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {form.logoUrl ? (
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                      <img src={form.logoUrl} alt="Logo preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-surface border border-dashed border-line text-text-muted text-xs flex items-center justify-center text-center p-1 shrink-0">
                      No Logo
                    </div>
                  )}
                  <div className="flex-1 space-y-1.5">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-line hover:bg-surface-2 text-xs font-semibold text-text cursor-pointer transition-colors shadow-2xs">
                      <span>Upload Logo File (PNG/JPG/SVG)</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            alert("File is too large. Please select an image under 2MB.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const res = ev.target?.result as string;
                            if (res) setForm({ ...form, logoUrl: res });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    <input
                      type="text"
                      placeholder="Or paste direct image URL (https://...)"
                      value={form.logoUrl}
                      onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs font-mono rounded-lg bg-surface border border-line text-text placeholder:text-text-muted/60"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Inputs */}
              <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-3">
                <span className="text-xs font-bold text-text uppercase tracking-wider block">
                  Financial Baseline & Health Metrics (₹)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Monthly Revenue (₹)</label>
                    <input
                      type="number"
                      step="1000"
                      value={form.monthlyRevenue}
                      onChange={(e) => setForm({ ...form, monthlyRevenue: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-text font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Annual Revenue (₹)</label>
                    <input
                      type="number"
                      step="10000"
                      value={form.annualRevenue}
                      onChange={(e) => setForm({ ...form, annualRevenue: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-text font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Monthly Burn Rate (₹)</label>
                    <input
                      type="number"
                      step="1000"
                      value={form.monthlyBurn}
                      onChange={(e) => setForm({ ...form, monthlyBurn: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-rose-400 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Liquid Cash Reserves (₹)</label>
                    <input
                      type="number"
                      step="10000"
                      value={form.cashOnHand}
                      onChange={(e) => setForm({ ...form, cashOnHand: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Sticky Footer */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-line bg-surface-2/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-line text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="tenant-modal-form"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-[#1a1206] btn-gold-gradient hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all shadow-md shadow-[0_8px_20px_-6px_var(--gold-glow)] flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-[#1a1206] border-t-transparent animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : editingTenant ? (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Enterprise</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

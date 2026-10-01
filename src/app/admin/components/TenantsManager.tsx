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

  return (
    <div className="space-y-6">
      {/* Platform Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-theme">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Registered Enterprises</span>
            <Building2 className="w-4 h-4 text-gold" />
          </div>
          <div className="text-2xl font-extrabold text-text mt-1.5">{stats.totalBusinesses || tenants.length}</div>
          <div className="text-[11px] text-text-muted mt-1 font-mono">Managed in SQLite</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-theme">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Total Annual Revenue</span>
            <DollarSign className="w-4 h-4 text-jade" />
          </div>
          <div className="text-2xl font-extrabold text-text mt-1.5">
            ₹{((stats.totalAnnualRevenue || 0) / 100000).toFixed(1)}L
          </div>
          <div className="text-[11px] text-jade mt-1 font-semibold">Live Enterprise ARR</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-theme">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Monthly Operational Burn</span>
            <TrendingUp className="w-4 h-4 text-rust" />
          </div>
          <div className="text-2xl font-extrabold text-text mt-1.5">
            ₹{((stats.totalMonthlyBurn || 0) / 100000).toFixed(1)}L
          </div>
          <div className="text-[11px] text-text-muted mt-1 font-mono">Aggregated Net Outflow</div>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-theme">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Liquid Cash Reserves</span>
            <ShieldCheck className="w-4 h-4 text-gold" />
          </div>
          <div className="text-2xl font-extrabold text-text mt-1.5">
            ₹{((stats.totalCashReserves || 0) / 100000).toFixed(1)}L
          </div>
          <div className="text-[11px] text-gold mt-1 font-semibold">Aggregate Liquidity</div>
        </div>
      </div>

      {/* Control Bar: Search & Action */}
      <div className="p-4 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row items-center justify-between gap-3 shadow-theme">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search enterprise by name, founder, or industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-surface-2 border border-line text-text placeholder:text-text-muted focus:outline-none focus:border-gold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => onRefresh()}
            className="p-2 rounded-xl border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors"
            title="Refresh tenants"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Enterprise</span>
          </button>
        </div>
      </div>

      {/* Tenants Table / Cards */}
      <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden shadow-theme">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-muted">
            No enterprises found matching "{search}".
          </div>
        ) : (
          filtered.map((t, idx) => (
            <div
              key={t.id}
              className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-surface-2/40 transition-colors"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-extrabold text-sm text-text">{t.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold font-semibold border border-gold/20">
                    {t.industryLabel}
                  </span>
                  {t.isRegisteredUser ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold border border-cyan-500/30">
                      User Account
                    </span>
                  ) : (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-text-muted font-medium border border-line">
                      Enterprise
                    </span>
                  )}
                  {idx === 0 && <StatusBadge label="Active Tenant" tone="live" />}
                </div>

                <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap">
                  <span>
                    Founder: <strong className="text-text font-medium">{t.founderName}</strong>
                    {t.ownerEmail && (
                      <span className="ml-1 text-[11px] text-text-muted font-mono">({t.ownerEmail})</span>
                    )}
                  </span>
                  {t.authProvider && (
                    <>
                      <span>•</span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 bg-surface-2 rounded border border-line">
                        via {t.authProvider}
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>Team: {t.teamSize} members</span>
                  {t.website && (
                    <>
                      <span>•</span>
                      <a
                        href={t.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-gold hover:underline flex items-center gap-0.5"
                      >
                        <span>{t.website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[10px] text-text-muted">Connected Integrations:</span>
                  {t.connectedTools && t.connectedTools.length > 0 ? (
                    t.connectedTools.map((tool: string) => (
                      <span
                        key={tool}
                        className="text-[9px] px-1.5 py-0.2 rounded bg-surface-2 border border-line font-mono text-text uppercase"
                      >
                        {tool}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-text-muted italic">Manual telemetry</span>
                  )}
                </div>
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 min-[460px]:grid-cols-4 gap-2.5 sm:gap-4 bg-surface-2/60 p-3 rounded-xl border border-line w-full lg:w-auto shrink-0">
                <div>
                  <div className="text-[10px] text-text-muted uppercase font-mono">Monthly Rev</div>
                  <div className="text-xs font-bold text-text mt-0.5">₹{(t.monthlyRevenue / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase font-mono">Monthly Burn</div>
                  <div className="text-xs font-bold text-rust mt-0.5">₹{(t.monthlyBurn / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase font-mono">Liquid Cash</div>
                  <div className="text-xs font-bold text-jade mt-0.5">₹{(t.cashOnHand / 1000).toFixed(0)}k</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-muted uppercase font-mono">Runway</div>
                  <div
                    className={`text-xs font-extrabold mt-0.5 ${
                      Number(t.runwayMonths) <= 6 ? "text-rust" : "text-gold"
                    }`}
                  >
                    {t.runwayMonths} mo
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full lg:w-auto justify-end pt-1 lg:pt-0 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSwitchActive(t)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-surface-2 border border-line hover:border-gold/50 text-text hover:text-gold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title="Switch to this business on Dashboard"
                >
                  <Zap className="w-3.5 h-3.5 text-gold" />
                  <span>Launch Dashboard</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(t)}
                  className="p-2 rounded-xl border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors"
                  title="Edit business parameters"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(t)}
                  className="p-2 rounded-xl border border-line hover:bg-rust/10 text-text-muted hover:text-rust cursor-pointer transition-colors"
                  title="Delete business"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
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
                  <p className="text-[11px] text-text-muted">Multi-tenant profile & financial telemetry</p>
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
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-[11px]"
                />
              </div>

              {/* Financial Inputs */}
              <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-3">
                <span className="text-[11px] font-bold text-text uppercase tracking-wider block">
                  Financial Baseline & Health Metrics (₹)
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Monthly Revenue (₹)</label>
                    <input
                      type="number"
                      step="1000"
                      value={form.monthlyRevenue}
                      onChange={(e) => setForm({ ...form, monthlyRevenue: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-text font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Annual Revenue (₹)</label>
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
                    <label className="text-[11px] text-text-muted">Monthly Burn Rate (₹)</label>
                    <input
                      type="number"
                      step="1000"
                      value={form.monthlyBurn}
                      onChange={(e) => setForm({ ...form, monthlyBurn: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface border border-line text-rose-400 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Liquid Cash Reserves (₹)</label>
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

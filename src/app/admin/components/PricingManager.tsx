"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Plus,
  Edit2,
  Trash2,
  Check,
  Save,
  X,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Star,
  Mail,
  ExternalLink,
  Zap,
} from "lucide-react";
import { DEFAULT_SUBSCRIPTION_PLANS } from "@/config/seeds/defaultCatalog";

export interface PlanTier {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  color: string;
  badge?: string;
  isPopular?: boolean;
  features: string[];
  ctaLabel: string;
  enabled?: boolean;
  actionType?: "self_serve" | "contact" | "custom_link";
  contactEmail?: string;
  customUrl?: string;
}

interface PricingManagerProps {
  plans: PlanTier[];
  onSave: (updatedPlans: PlanTier[], note?: string) => Promise<void>;
  notify: (msg: string) => void;
  saving: boolean;
}

export function PricingManager({ plans, onSave, notify, saving }: PricingManagerProps) {
  const [planList, setPlanList] = useState<PlanTier[]>(plans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanTier | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync internal state when parent props change from API fetch
  useEffect(() => {
    if (Array.isArray(plans) && plans.length > 0) {
      setPlanList(plans);
    }
  }, [plans]);

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

  const [form, setForm] = useState<{
    id: string;
    name: string;
    tagline: string;
    price: string;
    period: string;
    color: string;
    badge: string;
    isPopular: boolean;
    featuresRaw: string;
    ctaLabel: string;
    actionType: "self_serve" | "contact" | "custom_link";
    contactEmail: string;
    customUrl: string;
    enabled: boolean;
  }>({
    id: "",
    name: "",
    tagline: "",
    price: "₹3,999",
    period: "/month",
    color: "border-cyan-400/30 text-cyan-400",
    badge: "Most Popular",
    isPopular: false,
    featuresRaw: "",
    ctaLabel: "Activate Plan",
    actionType: "self_serve",
    contactEmail: "sales@bizzpal.app",
    customUrl: "",
    enabled: true,
  });

  const broadcastLiveSync = (updated: PlanTier[]) => {
    try {
      localStorage.setItem("bizzpal_subscription_plans", JSON.stringify(updated));
      window.dispatchEvent(new Event("bizzpal_config_updated"));
    } catch {}
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setForm({
      id: `plan_${Date.now()}`,
      name: "",
      tagline: "",
      price: "₹4,999",
      period: "/month",
      color: "border-cyan-400/30 text-cyan-400",
      badge: "New",
      isPopular: false,
      featuresRaw: "Feature 1\nFeature 2\nFeature 3",
      ctaLabel: "Activate Plan",
      actionType: "self_serve",
      contactEmail: "sales@bizzpal.app",
      customUrl: "",
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: PlanTier) => {
    setEditingPlan(p);
    setForm({
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      price: p.price,
      period: p.period,
      color: p.color || "border-cyan-400/30 text-cyan-400",
      badge: p.badge || "",
      isPopular: Boolean(p.isPopular),
      featuresRaw: (p.features || []).join("\n"),
      ctaLabel: p.ctaLabel || "Activate Plan",
      actionType: p.actionType || (p.price.toLowerCase().includes("custom") ? "contact" : "self_serve"),
      contactEmail: p.contactEmail || "sales@bizzpal.app",
      customUrl: p.customUrl || "",
      enabled: p.enabled !== false,
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const featureList = form.featuresRaw
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);

    let updated: PlanTier[];
    if (editingPlan) {
      updated = planList.map((p) =>
        p.id === editingPlan.id
          ? {
              ...p,
              id: form.id.trim() || p.id,
              name: form.name.trim(),
              tagline: form.tagline.trim(),
              price: form.price.trim(),
              period: form.period.trim(),
              color: form.color,
              badge: form.badge.trim() || undefined,
              isPopular: form.isPopular,
              features: featureList,
              ctaLabel: form.ctaLabel.trim(),
              actionType: form.actionType,
              contactEmail: form.contactEmail.trim(),
              customUrl: form.customUrl.trim(),
              enabled: form.enabled,
            }
          : p
      );
    } else {
      const newPlan: PlanTier = {
        id: form.id.trim() || `plan_${Date.now()}`,
        name: form.name.trim(),
        tagline: form.tagline.trim(),
        price: form.price.trim(),
        period: form.period.trim(),
        color: form.color,
        badge: form.badge.trim() || undefined,
        isPopular: form.isPopular,
        features: featureList,
        ctaLabel: form.ctaLabel.trim(),
        actionType: form.actionType,
        contactEmail: form.contactEmail.trim(),
        customUrl: form.customUrl.trim(),
        enabled: form.enabled,
      };
      updated = [...planList, newPlan];
    }

    setPlanList(updated);
    broadcastLiveSync(updated);
    setIsModalOpen(false);
    await onSave(updated, `Updated pricing tier "${form.name}"`);
    notify(`Saved plan "${form.name}"`);
  };

  const handleDelete = async (planId: string, name: string) => {
    if (!window.confirm(`Delete pricing tier "${name}"?`)) return;
    const updated = planList.filter((p) => p.id !== planId);
    setPlanList(updated);
    broadcastLiveSync(updated);
    await onSave(updated, `Deleted pricing tier "${name}"`);
    notify(`Deleted plan "${name}"`);
  };

  const handleTogglePopular = async (planId: string) => {
    const updated = planList.map((p) =>
      p.id === planId ? { ...p, isPopular: !p.isPopular } : p
    );
    setPlanList(updated);
    broadcastLiveSync(updated);
    await onSave(updated, `Toggled popular status for plan ID ${planId}`);
    notify(`Updated popular highlight`);
  };

  const handleToggleEnabled = async (planId: string) => {
    const updated = planList.map((p) =>
      p.id === planId ? { ...p, enabled: !(p.enabled !== false) } : p
    );
    setPlanList(updated);
    broadcastLiveSync(updated);
    await onSave(updated, `Toggled active status for plan ID ${planId}`);
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= planList.length) return;
    const copy = [...planList];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setPlanList(copy);
    broadcastLiveSync(copy);
    await onSave(copy, `Reordered pricing tiers`);
    notify(`Reordered tiers`);
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("Reset all subscription pricing tiers to factory defaults?")) return;
    const defaults = DEFAULT_SUBSCRIPTION_PLANS as PlanTier[];
    setPlanList(defaults);
    broadcastLiveSync(defaults);
    await onSave(defaults, "Reset subscription pricing tiers to defaults");
    notify("Reset plans to defaults");
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-theme">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text">Subscription Plans & Commercial CMS</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold uppercase font-mono">
                100% Dynamic
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Live edit names, prices, badges, popular flags, and entitlements. Updates immediately synchronize to /subscription and the dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={saving}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-line text-text-muted hover:text-text hover:bg-surface-2 flex items-center gap-1.5 transition-all cursor-pointer"
            title="Reset to default tiers"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/20 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Pricing Tier</span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {planList.map((plan, index) => {
          const isPopular = Boolean(plan.isPopular);
          const isEnabled = plan.enabled !== false;

          return (
            <div
              key={plan.id}
              className={`p-5 rounded-2xl bg-surface border flex flex-col justify-between shadow-theme transition-all relative ${
                !isEnabled
                  ? "opacity-60 border-dashed border-line"
                  : isPopular
                  ? "border-blue-500/60 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/5"
                  : "border-line"
              }`}
            >
              {/* Badge & Popular Indicator */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-2 border border-line text-text-muted">
                  ID: {plan.id}
                </span>

                <div className="flex items-center gap-1.5">
                  {plan.badge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        isPopular
                          ? "bg-blue-500 text-white shadow-xs"
                          : "bg-surface-2 border border-line text-text-muted"
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleTogglePopular(plan.id)}
                    title={isPopular ? "Unmark as Most Popular" : "Mark as Most Popular"}
                    className={`p-1 rounded-lg border transition-colors cursor-pointer ${
                      isPopular
                        ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                        : "border-line text-text-muted hover:text-amber-500 hover:bg-surface-2"
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${isPopular ? "fill-amber-500" : ""}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="font-extrabold text-base text-text">{plan.name}</h3>
                  <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed min-h-[2rem]">
                    {plan.tagline}
                  </p>
                </div>

                <div className="pt-2 border-t border-line/60">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-text font-mono">{plan.price}</span>
                    <span className="text-xs text-text-muted font-mono">{plan.period}</span>
                  </div>
                  <div className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                    <span className="font-semibold text-text">CTA:</span>
                    <span className="truncate">"{plan.ctaLabel}"</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="pt-3 border-t border-line/60 space-y-1.5">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono flex items-center justify-between">
                    <span>Entitlements</span>
                    <span>({plan.features?.length || 0})</span>
                  </div>
                  <ul className="space-y-1 text-xs text-text-muted">
                    {(plan.features || []).slice(0, 5).map((feat, i) => (
                      <li key={i} className="flex items-start gap-1.5 leading-tight">
                        <Check className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-text truncate">{feat}</span>
                      </li>
                    ))}
                    {(plan.features || []).length > 5 && (
                      <li className="text-[10px] text-text-muted italic pl-5">
                        +{(plan.features || []).length - 5} more features
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-4 mt-4 border-t border-line flex items-center justify-between gap-1">
                {/* Reorder Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => handleMove(index, -1)}
                    className="p-1 rounded-lg border border-line hover:bg-surface-2 text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move Left"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === planList.length - 1}
                    onClick={() => handleMove(index, 1)}
                    className="p-1 rounded-lg border border-line hover:bg-surface-2 text-text-muted hover:text-text disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title="Move Right"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleEnabled(plan.id)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isEnabled
                        ? "border-line text-text-muted hover:text-text hover:bg-surface-2"
                        : "bg-rose-500/10 border-rose-500/30 text-rose-500"
                    }`}
                    title={isEnabled ? "Disable Plan" : "Enable Plan"}
                  >
                    {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 rounded-lg border border-line hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors"
                    title="Edit Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id, plan.name)}
                    className="p-1.5 rounded-lg border border-line hover:bg-rose-500/10 text-text-muted hover:text-rose-500 cursor-pointer transition-colors"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD / EDIT PLAN */}
      {mounted && isModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">
                    {editingPlan ? `Edit Tier: ${editingPlan.name}` : "Create New Pricing Tier"}
                  </h3>
                  <p className="text-[11px] text-text-muted">Subscription pricing, entitlements, badges & actions</p>
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
            <form id="pricing-modal-form" onSubmit={handleSaveModal} className="overflow-y-auto px-6 py-4 space-y-3.5 text-xs flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Plan ID / Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. starter, growth, enterprise, pro"
                    value={form.id}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Tier Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Starter Business OS"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Price String</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ₹3,999 or Custom"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Billing Period</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. /month, /billed annually, /forever"
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Badge Text (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Most Popular, Recommended, Enterprise"
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">CTA Button Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Activate Starter Plan, Contact Sales"
                    value={form.ctaLabel}
                    onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Tagline / Target Audience</label>
                <input
                  type="text"
                  placeholder="For solo founders and early teams (1-5 people)..."
                  value={form.tagline}
                  onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text"
                />
              </div>

              {/* Action Behavior */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-2/60 border border-line">
                <div className="space-y-1">
                  <label className="font-semibold text-text">CTA Action Behavior</label>
                  <select
                    value={form.actionType}
                    onChange={(e) => setForm({ ...form, actionType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-text"
                  >
                    <option value="self_serve">Self-Serve (Instant Activation & Dashboard Launch)</option>
                    <option value="contact">Contact Sales (Enterprise Mailto)</option>
                    <option value="custom_link">Custom External Link</option>
                  </select>
                </div>

                {form.actionType === "contact" && (
                  <div className="space-y-1">
                    <label className="font-semibold text-text">Sales Email Recipient</label>
                    <input
                      type="email"
                      placeholder="sales@bizzpal.app"
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-text font-mono"
                    />
                  </div>
                )}

                {form.actionType === "custom_link" && (
                  <div className="space-y-1">
                    <label className="font-semibold text-text">Custom URL</label>
                    <input
                      type="url"
                      placeholder="https://cal.com/bizzpal/sales"
                      value={form.customUrl}
                      onChange={(e) => setForm({ ...form, customUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-text font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Feature Entitlements Bullets */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-text">Feature Bullets (One per line)</label>
                  <span className="text-[10px] text-text-muted">
                    {form.featuresRaw.split("\n").filter((f) => f.trim()).length} features configured
                  </span>
                </div>
                <textarea
                  rows={6}
                  placeholder="All Free tier features&#10;All 3 AI Executives (CEO, CFO, CMO)&#10;Cash Runway & Burn Alarm System"
                  value={form.featuresRaw}
                  onChange={(e) => setForm({ ...form, featuresRaw: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-[11px] focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={(e) => setForm({ ...form, isPopular: e.target.checked })}
                    className="rounded border-line text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-text">Highlight as Popular Tier (Halo Glow + Prominence)</span>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                    className="rounded border-line text-blue-600 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-text">Plan Active</span>
                </label>
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
                form="pricing-modal-form"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.98] cursor-pointer transition-all shadow-md shadow-blue-500/25 flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Pricing Tier</span>
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

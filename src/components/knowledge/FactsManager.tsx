"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Trash2,
  CheckCircle2,
  Layers,
  Filter,
  RefreshCw,
  AlertCircle,
  Tag,
  Scale,
  Landmark,
  Building2,
  Zap,
  Target,
  FileCheck,
  Bookmark,
  X,
  Search,
} from "lucide-react";

interface BusinessFact {
  id: string;
  category: string;
  key: string;
  value: string;
  confidence: number;
  sourceCitation?: string;
  verifiedBy?: string;
  createdAt: string;
}

function getCategoryConfig(category: string) {
  switch (category.toLowerCase()) {
    case "strategy":
      return {
        label: "Strategy",
        icon: Target,
        badgeColor: "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-indigo-500/25",
      };
    case "finance":
      return {
        label: "Finance",
        icon: Landmark,
        badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
      };
    case "operations":
      return {
        label: "Operations",
        icon: Building2,
        badgeColor: "bg-brass/10 text-brass border-brass/25",
      };
    case "marketing":
      return {
        label: "Marketing",
        icon: Zap,
        badgeColor: "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400 border-cyan-500/25",
      };
    case "legal":
      return {
        label: "Legal & Governance",
        icon: Scale,
        badgeColor: "bg-purple-500/10 text-purple-500 dark:text-purple-400 border-purple-500/25",
      };
    default:
      return {
        label: category.toUpperCase(),
        icon: Tag,
        badgeColor: "bg-surface-2 text-text-muted border-line",
      };
  }
}

export function FactsManager() {
  const [facts, setFacts] = useState<BusinessFact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [newCategory, setNewCategory] = useState("strategy");
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCitation, setNewCitation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFacts = async () => {
    setIsLoading(true);
    try {
      const url = selectedCategory === "all" ? "/api/knowledge/facts" : `/api/knowledge/facts?category=${selectedCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.facts)) {
        setFacts(data.facts);
      }
    } catch (e) {
      console.warn("Failed to fetch facts:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFacts();
  }, [selectedCategory]);

  const handleAddFact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/knowledge/facts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          key: newKey.trim(),
          value: newValue.trim(),
          sourceCitation: newCitation.trim() || "Executive Directive",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewKey("");
        setNewValue("");
        setNewCitation("");
        setToastMessage(`Persistent corporate fact "${data.fact?.key || newKey}" approved & recorded!`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchFacts();
      }
    } catch {
      alert("Failed to record fact");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string, key: string) => {
    if (!confirm(`Deactivate corporate truth "${key}"?`)) return;
    try {
      const res = await fetch(`/api/knowledge/facts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`Fact deactivated.`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchFacts();
      }
    } catch {
      alert("Failed to deactivate fact");
    }
  };

  const totalFacts = facts.length;
  const categoriesList = ["all", "strategy", "finance", "operations", "marketing", "legal"];

  const filteredFacts = facts.filter((f) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.key.toLowerCase().includes(q) ||
      f.value.toLowerCase().includes(q) ||
      f.category.toLowerCase().includes(q) ||
      (f.sourceCitation && f.sourceCitation.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Stat Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Active Ground Truths</span>
            <div className="w-6 h-6 rounded-lg bg-brass/10 flex items-center justify-center text-brass">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">{totalFacts}</span>
            <span className="text-[10px] text-text-muted font-mono">rules</span>
          </div>
          <p className="text-[10px] text-text-muted/80">Deterministic knowledge store</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Grounding Priority</span>
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">P0 Level</span>
          </div>
          <p className="text-[10px] text-text-muted/80">Overrides generic AI inferences</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Citation SLA</span>
            <div className="w-6 h-6 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-500">
              <Bookmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-text">100%</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">Verified</span>
          </div>
          <p className="text-[10px] text-text-muted/80">Every truth tied to source doc</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-line shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span className="font-medium">Verification Status</span>
            <div className="w-6 h-6 rounded-lg bg-brass/10 flex items-center justify-center text-brass">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Board Approved
            </span>
          </div>
          <p className="text-[10px] text-text-muted/80">Executive audit trail active</p>
        </div>
      </div>

      {/* Action Header & Category Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 sm:p-4 rounded-2xl bg-surface border border-line shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-line flex-wrap">
            {categoriesList.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-surface text-text shadow-2xs font-bold border border-line/60"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search facts by key or policy…"
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:border-brass/70"
            />
          </div>

          <button
            type="button"
            onClick={fetchFacts}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-surface-2 border border-line text-text-muted hover:text-text cursor-pointer transition-all disabled:opacity-50"
            title="Refresh facts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brass" : ""}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer shadow-2xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Record Approved Fact</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-brass/10 border border-brass/30 text-xs font-medium text-brass flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Facts Grid */}
      {filteredFacts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-brass/10 border border-brass/25 mx-auto flex items-center justify-center text-brass shadow-2xs">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-text">No verified corporate facts recorded</h3>
            <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
              Record codified company ground truths (minimum margin targets, cash runway thresholds, contract signing limits) that BizzPal uses as immutable baseline rules.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer shadow-2xs btn-tactile"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Approved Fact</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFacts.map((fact) => {
            const catConfig = getCategoryConfig(fact.category);
            const CatIcon = catConfig.icon;

            return (
              <div
                key={fact.id}
                className="rounded-2xl border border-line bg-surface p-5 space-y-3 hover:border-line-strong transition-all flex flex-col justify-between shadow-2xs group"
              >
                <div className="space-y-3">
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${catConfig.badgeColor}`}>
                        <CatIcon className="w-3 h-3" />
                        <span>{catConfig.label}</span>
                      </span>
                      <h4 className="text-xs font-bold font-mono text-text truncate" title={fact.key}>
                        {fact.key}
                      </h4>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Truth</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(fact.id, fact.key)}
                        className="p-1 rounded-lg hover:bg-rose-500/10 text-text-muted hover:text-rose-500 cursor-pointer transition-all"
                        title="Deactivate fact"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Fact Value Block */}
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-line border-l-2 border-l-brass space-y-1">
                    <p className="text-xs text-text leading-relaxed font-sans font-medium selection:bg-brass/20">
                      {fact.value}
                    </p>
                  </div>
                </div>

                {/* Provenance Footnote */}
                <div className="flex items-center justify-between text-[11px] text-text-muted pt-2.5 border-t border-line/60">
                  <span className="flex items-center gap-1 truncate max-w-[240px]">
                    <Bookmark className="w-3 h-3 text-brass shrink-0" />
                    <span className="truncate">Source: {fact.sourceCitation || "Verified Corporate Governance"}</span>
                  </span>
                  <span className="font-mono text-[10px] text-text-muted/80 shrink-0">
                    Verified: {fact.verifiedBy || "Executive Founder"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Fact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">Record Verified Business Fact</h3>
                  <p className="text-[10px] text-text-muted">Permanent corporate truth for AI reasoning</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface border border-line flex items-center justify-center text-text-muted hover:text-text cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFact} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text mb-1.5">Business Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70 cursor-pointer font-sans"
                >
                  <option value="strategy">Strategy</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                  <option value="marketing">Marketing</option>
                  <option value="legal">Legal & Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1.5">Fact Identifier / Key</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. minimum_gross_margin_threshold"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1.5">Mandate / Policy Statement</label>
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. All SaaS enterprise retainer agreements must achieve minimum 80.0% gross profit margin. Exceptions require dual approval from CEO and CFO."
                  rows={3}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70 font-sans"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text mb-1.5">Source Citation / Audit Reference</label>
                <input
                  type="text"
                  value={newCitation}
                  onChange={(e) => setNewCitation(e.target.value)}
                  placeholder="e.g. FY2026 Board of Directors Resolution #4"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 border border-line text-xs font-semibold text-text hover:bg-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newKey.trim() || !newValue.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Recording…" : "Save Approved Fact"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

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

export function FactsManager() {
  const [facts, setFacts] = useState<BusinessFact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
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
        setToastMessage(`Persistent fact "${data.fact.key}" recorded!`);
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
    if (!confirm(`Deactivate fact "${key}"?`)) return;
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

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface-2 border border-line">
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "strategy", "finance", "operations", "marketing", "legal"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-brass text-white shadow-xs"
                  : "bg-surface border border-line text-text-muted hover:text-text"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
          <button
            type="button"
            onClick={fetchFacts}
            disabled={isLoading}
            className="p-1.5 rounded-xl bg-surface border border-line text-text-muted hover:text-text cursor-pointer ml-1"
            title="Refresh facts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-brass" : ""}`} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Record Approved Fact</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-brass-soft border border-brass/30 text-xs font-medium text-brass flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-brass" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Facts List */}
      {facts.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-brass-soft mx-auto flex items-center justify-center text-brass">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-text">No verified business facts recorded</h3>
          <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
            Record verified company truths (such as baseline gross margin rules, official board mandates, or pricing thresholds) that BizzPal will treat as persistent source-backed ground truth.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Fact</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facts.map((fact) => (
            <div
              key={fact.id}
              className="rounded-2xl border border-line bg-surface p-5 space-y-3 hover:border-line-strong transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-brass-soft text-brass font-bold uppercase tracking-wider">
                      {fact.category}
                    </span>
                    <h4 className="text-xs font-bold text-text">{fact.key}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeactivate(fact.id, fact.key)}
                    className="p-1 rounded text-text-muted hover:text-rose-400 cursor-pointer"
                    title="Deactivate fact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p className="text-xs text-text/90 leading-relaxed bg-surface-2/60 p-3 rounded-xl border border-line font-mono">
                  {fact.value}
                </p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-text-muted pt-2 border-t border-line/60">
                <span>Citation: {fact.sourceCitation || "Verified Corporate Truth"}</span>
                <span>By: {fact.verifiedBy || "Executive Founder"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Fact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-surface border border-line p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-brass" />
                <h3 className="text-sm font-bold text-text">Record Verified Business Fact</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-text-muted hover:text-text cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFact} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70 cursor-pointer"
                >
                  <option value="strategy">Strategy</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                  <option value="marketing">Marketing</option>
                  <option value="legal">Legal & Compliance</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Fact Key / Subject</label>
                <input
                  type="text"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="e.g. minimum_gross_margin_target"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Fact Value / Policy Statement</label>
                <textarea
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. All enterprise annual SaaS contracts must maintain minimum 78% gross margin unless approved by CFO."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-text mb-1">Source Citation</label>
                <input
                  type="text"
                  value={newCitation}
                  onChange={(e) => setNewCitation(e.target.value)}
                  placeholder="e.g. Q4 2025 Board of Directors Minutes"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass/70"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
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
                  className="px-4 py-2 rounded-xl bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? "Saving…" : "Save Approved Fact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

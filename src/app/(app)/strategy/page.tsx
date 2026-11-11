"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";

export interface GrowthVector {
  id: string;
  title: string;
  category: "Enterprise" | "Product" | "Partnerships" | "Monetization";
  status: "In Flight" | "Active" | "Planned" | "Testing";
  expectedImpact: string;
  timeline: string;
  owner: string;
  description: string;
  milestones: { title: string; done: boolean }[];
  riskTier: "Low" | "Medium" | "High";
}

const DEFAULT_GROWTH_VECTORS: GrowthVector[] = [
  {
    id: "vector-1",
    title: "Enterprise Upmarket Expansion & High-ACV Accounts",
    category: "Enterprise",
    status: "In Flight",
    expectedImpact: "+₹24,00,000 ARR",
    timeline: "Q3 – Q4",
    owner: "Founder & Sales Lead",
    description: "Shift focus toward larger tier-1 enterprise accounts with dedicated solution engineering, custom SLAs, and multi-year contract commitments.",
    riskTier: "Medium",
    milestones: [
      { title: "Define Enterprise ICP & qualification criteria", done: true },
      { title: "Standardize enterprise MSA & security compliance package", done: true },
      { title: "Initiate outreach to top 50 target accounts", done: false },
      { title: "Close first 2 multi-year enterprise contracts (> ₹15L ACV)", done: false },
    ],
  },
  {
    id: "vector-2",
    title: "Value-Tier Repricing & 15% Renewal Expansion",
    category: "Monetization",
    status: "Active",
    expectedImpact: "+22% Gross Margin",
    timeline: "Immediate (Ongoing)",
    owner: "CEO & CFO",
    description: "Introduce modular feature packaging and value tiers. Grandfather legacy clients for 6 months while applying +15% expansion at contract renewals.",
    riskTier: "Low",
    milestones: [
      { title: "Audit feature usage and customer pricing sensitivity", done: true },
      { title: "Publish updated tier rate card with add-on options", done: true },
      { title: "Deploy renewal outreach with quantified ROI deliverables", done: false },
    ],
  },
  {
    id: "vector-3",
    title: "Product-Led Onboarding Loops & Trial Velocity",
    category: "Product",
    status: "Active",
    expectedImpact: "38% Faster Sales Cycle",
    timeline: "Q3",
    owner: "Product & Engineering",
    description: "Compress the time-to-value for new inbound buyers. Enable automated telemetry extraction so clients see live business dashboards in under 3 minutes.",
    riskTier: "Low",
    milestones: [
      { title: "Deploy real website intelligence extraction engine", done: true },
      { title: "Enable multi-format CSV/Excel business data upload", done: true },
      { title: "Add interactive decision and financial calculators", done: true },
      { title: "Implement automated daily check-in loops", done: false },
    ],
  },
  {
    id: "vector-4",
    title: "Channel Reseller & Strategic Agency Partnerships",
    category: "Partnerships",
    status: "Planned",
    expectedImpact: "3.4x Partner Pipeline",
    timeline: "Q4 Launch",
    owner: "Head of Partnerships",
    description: "Partner with regional consulting firms, digital agencies, and system integrators to distribute BizzPal with zero fixed payroll overhead.",
    riskTier: "Medium",
    milestones: [
      { title: "Draft partner revenue share & certification terms", done: false },
      { title: "Sign 3 pilot regional agency partners", done: false },
      { title: "Launch co-branded executive briefing reports", done: false },
    ],
  },
];

export default function GrowthStrategyPage() {
  const [vectors, setVectors] = useState<GrowthVector[]>(DEFAULT_GROWTH_VECTORS);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedVectorId, setSelectedVectorId] = useState<string>("vector-1");
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Dynamic Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVector, setEditingVector] = useState<GrowthVector | null>(null);

  // Modal Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<GrowthVector["category"]>("Enterprise");
  const [formStatus, setFormStatus] = useState<GrowthVector["status"]>("In Flight");
  const [formExpectedImpact, setFormExpectedImpact] = useState("");
  const [formTimeline, setFormTimeline] = useState("");
  const [formOwner, setFormOwner] = useState("");
  const [formRiskTier, setFormRiskTier] = useState<GrowthVector["riskTier"]>("Medium");
  const [formDescription, setFormDescription] = useState("");
  const [formMilestones, setFormMilestones] = useState<string[]>([""]);

  // Loaded Business Profile Context
  const [companyName, setCompanyName] = useState("My Enterprise");
  const [founderName, setFounderName] = useState("Founder");
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyBurn, setMonthlyBurn] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);
  const [ceoName, setCeoName] = useState("CEO");

  useEffect(() => {
    const syncCeo = () => {
      try {
        const raw = localStorage.getItem("bizzpal_custom_advisors");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.ceo?.name && parsed.ceo.name.toLowerCase() !== "astra") setCeoName(parsed.ceo.name);
        }
      } catch {}
    };
    syncCeo();
    window.addEventListener("bizzpal_advisors_updated", syncCeo);
    window.addEventListener("storage", syncCeo);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", syncCeo);
      window.removeEventListener("storage", syncCeo);
    };
  }, []);

  const applyBusinessProfile = (p: any) => {
    if (!p) return;
    if (p.name) setCompanyName(p.name);
    if (p.founder_name || p.founderName) setFounderName(p.founder_name || p.founderName);
    if (p.annual_revenue || p.annualRevenue) setAnnualRevenue(Number(p.annual_revenue || p.annualRevenue));
    if (p.monthly_revenue || p.revenue) setMonthlyRevenue(Number(p.monthly_revenue || p.revenue));
    if (p.monthly_burn || p.burn) setMonthlyBurn(Number(p.monthly_burn || p.burn));
    if (p.cash_on_hand || p.cash) setCashOnHand(Number(p.cash_on_hand || p.cash));
  };

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("bizzpal_business_profile");
      if (savedProfile) {
        applyBusinessProfile(JSON.parse(savedProfile));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) {
              applyBusinessProfile(d.business);
              localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business));
            }
          })
          .catch(() => {});
      }

      const savedVectors = localStorage.getItem("bizzpal_strategy_vectors");
      if (savedVectors) {
        const parsed = JSON.parse(savedVectors);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setVectors(parsed);
          if (!parsed.some(v => v.id === selectedVectorId)) {
            setSelectedVectorId(parsed[0].id);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const runwayMonths =
    monthlyBurn > 0 ? (cashOnHand / monthlyBurn).toFixed(1) : "18+";

  const selectedVector =
    vectors.find(v => v.id === selectedVectorId) || vectors[0] || DEFAULT_GROWTH_VECTORS[0];

  const handleToggleMilestone = (vectorId: string, index: number) => {
    setVectors(prev => {
      const updated = prev.map(v => {
        if (v.id !== vectorId) return v;
        const newM = [...v.milestones];
        newM[index] = { ...newM[index], done: !newM[index].done };
        return { ...v, milestones: newM };
      });
      try {
        localStorage.setItem("bizzpal_strategy_vectors", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const handleOpenAddModal = () => {
    setEditingVector(null);
    setFormTitle("");
    setFormCategory("Enterprise");
    setFormStatus("In Flight");
    setFormExpectedImpact("+₹15,00,000 ARR");
    setFormTimeline("Q3 – Q4");
    setFormOwner(founderName ? `${founderName} (Executive)` : "Founder");
    setFormRiskTier("Medium");
    setFormDescription("");
    setFormMilestones(["Define key deliverables & target ICP", "Deploy operational workflow"]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vector: GrowthVector) => {
    setEditingVector(vector);
    setFormTitle(vector.title);
    setFormCategory(vector.category);
    setFormStatus(vector.status);
    setFormExpectedImpact(vector.expectedImpact);
    setFormTimeline(vector.timeline);
    setFormOwner(vector.owner);
    setFormRiskTier(vector.riskTier);
    setFormDescription(vector.description);
    setFormMilestones(vector.milestones.map(m => m.title));
    setIsModalOpen(true);
  };

  const handleSaveVector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const cleanedMilestones = formMilestones
      .map(m => m.trim())
      .filter(Boolean)
      .map(title => {
        const existing = editingVector?.milestones.find(m => m.title === title);
        return { title, done: existing ? existing.done : false };
      });

    if (cleanedMilestones.length === 0) {
      cleanedMilestones.push({ title: "Initialize initiative milestones", done: false });
    }

    let updatedList: GrowthVector[];
    if (editingVector) {
      updatedList = vectors.map(v =>
        v.id === editingVector.id
          ? {
              ...v,
              title: formTitle.trim(),
              category: formCategory,
              status: formStatus,
              expectedImpact: formExpectedImpact.trim() || "+₹10,00,000 ARR",
              timeline: formTimeline.trim() || "Ongoing",
              owner: formOwner.trim() || "Founder",
              riskTier: formRiskTier,
              description: formDescription.trim(),
              milestones: cleanedMilestones,
            }
          : v
      );
      setToastMessage(`Growth vector '${formTitle}' updated successfully.`);
    } else {
      const newId = `vector-${Date.now()}`;
      const newVector: GrowthVector = {
        id: newId,
        title: formTitle.trim(),
        category: formCategory,
        status: formStatus,
        expectedImpact: formExpectedImpact.trim() || "+₹10,00,000 ARR",
        timeline: formTimeline.trim() || "Q4 2026",
        owner: formOwner.trim() || "Executive",
        riskTier: formRiskTier,
        description: formDescription.trim(),
        milestones: cleanedMilestones,
      };
      updatedList = [newVector, ...vectors];
      setSelectedVectorId(newId);
      setToastMessage(`New strategic vector '${newVector.title}' created!`);
    }

    setVectors(updatedList);
    try {
      localStorage.setItem("bizzpal_strategy_vectors", JSON.stringify(updatedList));
    } catch {}

    setIsModalOpen(false);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeleteVector = (vectorId: string) => {
    if (vectors.length <= 1) {
      alert("At least one strategic vector must remain active.");
      return;
    }
    const target = vectors.find(v => v.id === vectorId);
    if (!confirm(`Are you sure you want to delete strategic vector '${target?.title || ""}'?`)) {
      return;
    }

    const updated = vectors.filter(v => v.id !== vectorId);
    setVectors(updated);
    if (selectedVectorId === vectorId) {
      setSelectedVectorId(updated[0].id);
    }
    try {
      localStorage.setItem("bizzpal_strategy_vectors", JSON.stringify(updated));
    } catch {}
    setToastMessage(`Growth vector deleted.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExecuteInitiative = async (vector: GrowthVector) => {
    setExecutingId(vector.id);

    try {
      for (const m of vector.milestones.filter(m => !m.done)) {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[Strategy] ${m.title}`,
            owner: vector.owner.includes("CFO") ? "CFO" : "Founder",
            gap: "Growth Vector",
            priority: "high",
            category: "Growth Strategy",
            status: "todo",
          }),
        }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }

    setExecutingId(null);
    setToastMessage(`Initiative '${vector.title}' converted to active tasks in /tasks!`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const filteredVectors =
    selectedCategory === "all"
      ? vectors
      : vectors.filter(v => v.category.toLowerCase() === selectedCategory.toLowerCase());

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";
  const labelClass = "block text-sm text-text mb-1.5";

  const stats = [
    { label: "Yearly revenue", value: `₹${annualRevenue.toLocaleString("en-IN")}` },
    { label: "Monthly revenue", value: `₹${monthlyRevenue.toLocaleString("en-IN")}` },
    { label: "Cash in the bank", value: `₹${cashOnHand.toLocaleString("en-IN")}` },
    { label: "Cash runway", value: `${runwayMonths} months` },
  ];

  const completedOf = (v: GrowthVector) => v.milestones.filter(m => m.done).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-text">Growth strategy</h1>
          <p className="text-sm text-text-muted mt-1">
            Plan and track the initiatives that will grow {companyName}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/chat?message=${encodeURIComponent(`${ceoName}, review our current growth strategy for ${companyName}. What are the highest-leverage initiatives to accelerate our revenue growth?`)}`}
            className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2"
          >
            Ask {ceoName}
          </Link>
          <Link href="/simulator" className="px-4 py-2 rounded-xl border border-line text-sm text-text hover:bg-surface-2">
            Test a scenario
          </Link>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
          >
            Add initiative
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="px-4 py-3 rounded-xl bg-surface-2 text-sm text-text flex items-center justify-between gap-3">
          <span>{toastMessage}</span>
          <Link href="/tasks" className="text-brass hover:underline shrink-0">
            View tasks
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface shadow-sm p-5">
            <p className="text-sm text-text-muted">{s.label}</p>
            <p className="text-2xl font-semibold text-text mt-2 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-text">Initiatives</h2>

          <div className="inline-flex items-center p-1 rounded-xl bg-surface-2 overflow-x-auto max-w-full">
            {["all", "Enterprise", "Monetization", "Product", "Partnerships"].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-sm whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
                }`}
              >
                {cat === "all" ? "All" : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 space-y-3">
            {filteredVectors.length === 0 && (
              <p className="text-sm text-text-muted py-6">No initiatives in this category yet.</p>
            )}
            {filteredVectors.map(vec => {
              const isSelected = vec.id === selectedVectorId;
              const done = completedOf(vec);
              const total = vec.milestones.length || 1;
              const pct = Math.round((done / total) * 100);

              return (
                <button
                  key={vec.id}
                  type="button"
                  onClick={() => setSelectedVectorId(vec.id)}
                  className={`w-full text-left p-5 rounded-2xl border cursor-pointer transition-colors ${
                    isSelected ? "bg-surface-2 border-line-strong" : "bg-surface border-line hover:bg-surface-2/60"
                  }`}
                >
                  <p className="text-xs text-text-muted">
                    {vec.category} · {vec.status}
                  </p>
                  <h3 className="text-base font-medium text-text leading-snug mt-1">{vec.title}</h3>
                  <p className="text-sm text-text-muted mt-1.5 line-clamp-2 leading-relaxed">{vec.description}</p>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-text-muted mb-1.5">
                      <span>
                        {done} of {vec.milestones.length} steps done
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-line overflow-hidden">
                      <div className="h-full bg-brass rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-line bg-surface shadow-sm p-6 sm:p-7 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-text-muted">{selectedVector.category}</p>
                <h3 className="text-xl font-semibold text-text mt-0.5 leading-snug">{selectedVector.title}</h3>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedVector)}
                  className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteVector(selectedVector.id)}
                  className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-rust hover:bg-surface-2 cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>

            <p className="text-sm text-text-muted leading-relaxed">{selectedVector.description}</p>

            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <dt className="text-xs text-text-muted">Expected result</dt>
                <dd className="text-sm font-medium text-jade mt-1">{selectedVector.expectedImpact}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Timeline</dt>
                <dd className="text-sm font-medium text-text mt-1">{selectedVector.timeline}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Owner</dt>
                <dd className="text-sm font-medium text-text mt-1">{selectedVector.owner}</dd>
              </div>
              <div>
                <dt className="text-xs text-text-muted">Risk</dt>
                <dd className={`text-sm font-medium mt-1 ${selectedVector.riskTier === "High" ? "text-rust" : "text-text"}`}>
                  {selectedVector.riskTier}
                </dd>
              </div>
            </dl>

            <div>
              <h4 className="text-sm font-medium text-text mb-1">Steps</h4>
              <ul className="divide-y divide-line">
                {selectedVector.milestones.map((m, idx) => (
                  <li key={idx}>
                    <button
                      type="button"
                      onClick={() => handleToggleMilestone(selectedVector.id, idx)}
                      className="w-full flex items-center gap-3 py-3 text-left cursor-pointer"
                    >
                      <span
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                          m.done ? "bg-brass border-brass text-white" : "border-line-strong"
                        }`}
                      >
                        {m.done && (
                          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-sm ${m.done ? "line-through text-text-muted" : "text-text"}`}>{m.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-5 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm text-text-muted">Turn the steps that aren&apos;t done into tasks for your team.</p>
              <button
                type="button"
                onClick={() => handleExecuteInitiative(selectedVector)}
                disabled={Boolean(executingId)}
                className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {executingId ? "Creating tasks…" : "Create tasks"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <PortalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div
          className="w-[36rem] max-w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-line bg-surface shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-lg font-semibold text-text">{editingVector ? "Edit initiative" : "Add initiative"}</h2>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              aria-label="Close"
              className="p-1 text-text-muted hover:text-text cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveVector}>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className={labelClass}>Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. Faster follow-up on new enquiries"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="Enterprise">Enterprise</option>
                    <option value="Monetization">Monetization</option>
                    <option value="Product">Product</option>
                    <option value="Partnerships">Partnerships</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="In Flight">In flight</option>
                    <option value="Active">Active</option>
                    <option value="Planned">Planned</option>
                    <option value="Testing">Testing</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Expected result</label>
                  <input
                    type="text"
                    value={formExpectedImpact}
                    onChange={e => setFormExpectedImpact(e.target.value)}
                    placeholder="e.g. +₹18,00,000 a year"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Timeline</label>
                  <input
                    type="text"
                    value={formTimeline}
                    onChange={e => setFormTimeline(e.target.value)}
                    placeholder="e.g. Q4 2026"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Risk</label>
                  <select
                    value={formRiskTier}
                    onChange={e => setFormRiskTier(e.target.value as any)}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Owner</label>
                <input
                  type="text"
                  value={formOwner}
                  onChange={e => setFormOwner(e.target.value)}
                  placeholder="e.g. Founder and sales lead"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="What will you do and why?"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-text">Steps</label>
                  <button
                    type="button"
                    onClick={() => setFormMilestones([...formMilestones, ""])}
                    className="text-sm text-brass hover:underline cursor-pointer"
                  >
                    Add step
                  </button>
                </div>

                <div className="space-y-2">
                  {formMilestones.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={m}
                        onChange={e => {
                          const copy = [...formMilestones];
                          copy[idx] = e.target.value;
                          setFormMilestones(copy);
                        }}
                        placeholder={`Step ${idx + 1}`}
                        className={`${inputClass} flex-1`}
                      />
                      {formMilestones.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormMilestones(formMilestones.filter((_, i) => i !== idx))}
                          aria-label={`Remove step ${idx + 1}`}
                          className="p-1.5 text-text-muted hover:text-rust cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
              >
                {editingVector ? "Save changes" : "Add initiative"}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>
    </div>
  );
}

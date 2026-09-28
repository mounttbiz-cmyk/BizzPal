"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  TrendingUp,
  Target,
  Zap,
  ArrowRight,
  BrainCircuit,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  FileCheck,
  Plus,
  Trash2,
  Edit3,
  X
} from "lucide-react";
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
    owner: "Astra (CEO AI) & Marcus (CFO)",
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
  const [ceoName, setCeoName] = useState("Astra");

  useEffect(() => {
    const syncCeo = () => {
      try {
        const raw = localStorage.getItem("bizzpal_custom_advisors");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.ceo?.name) setCeoName(parsed.ceo.name);
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
            owner: vector.owner.includes("Marcus") ? "CFO Marcus" : "Founder",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <Compass className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-text">Enterprise Growth Strategy</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-500 dark:text-amber-300 border border-amber-500/30 font-bold uppercase tracking-wider">
              {ceoName} AI Engine
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
              Horizon 2026
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-medium">
            Formulate multi-quarter business expansion plans, defensive moat strategies, and competitive positioning vectors tailored for <span className="text-text font-semibold">{companyName}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-lg btn-gold-gradient text-slate-950 font-bold text-xs shadow-md hover:brightness-110 active:scale-95 btn-tactile inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Strategic Vector</span>
          </button>
          <Link
            href="/simulator"
            className="px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-2 text-xs font-semibold text-text inline-flex items-center gap-1.5 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-brass" />
            <span>Simulate Scenarios</span>
          </Link>
          <Link
            href={`/chat?message=${encodeURIComponent(`${ceoName}, review our current growth strategy for ${companyName}. What are the highest-leverage growth vectors to accelerate ARR past ₹${Math.round(annualRevenue * 1.5).toLocaleString("en-IN")}?`)}`}
            className="px-3.5 py-1.5 rounded-lg bg-brass text-white font-bold text-xs shadow-sm hover:brightness-110 btn-tactile inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Consult {ceoName} (CEO AI)</span>
          </Link>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-jade/10 border border-jade/30 text-xs text-jade flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link href="/tasks" className="underline font-bold text-text hover:text-jade">
            View Tasks & Execution →
          </Link>
        </div>
      )}

      {/* Real Executive Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            Annual Run-Rate (ARR)
          </span>
          <div className="text-xl font-extrabold text-text font-mono">
            ₹{annualRevenue.toLocaleString("en-IN")}
          </div>
          <div className="text-[11px] text-jade font-semibold flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Target: ₹{Math.round(annualRevenue * 1.5).toLocaleString("en-IN")}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            Net Revenue Retention (NRR)
          </span>
          <div className="text-xl font-extrabold text-text font-mono">
            {annualRevenue > 5000000 ? "118.4%" : "109.2%"}
          </div>
          <div className="text-[11px] text-text-muted font-medium">
            Expansion outpacing churn
          </div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            Forward Runway
          </span>
          <div className="text-xl font-extrabold text-cyan-400 font-mono">
            {runwayMonths} Mo
          </div>
          <div className="text-[11px] text-text-muted font-medium truncate">
            ₹{cashOnHand.toLocaleString("en-IN")} liquid reserves
          </div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
            LTV to CAC Ratio
          </span>
          <div className="text-xl font-extrabold text-text font-mono">
            {monthlyRevenue > 300000 ? "4.2x" : "3.1x"}
          </div>
          <div className="text-[11px] text-jade font-semibold">
            High unit economics efficiency
          </div>
        </div>
      </div>

      {/* Astra Strategic Directive */}
      <div className="p-5 rounded-2xl border border-brass/30 bg-brass/5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-brass/20 border border-brass/40 flex items-center justify-center text-brass shrink-0 mt-0.5">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-text uppercase tracking-wider">
                {ceoName} (CEO AI) Strategic Directive
              </span>
              <span className="text-[9px] px-2 py-0.2 rounded-full bg-brass/20 text-brass border border-brass/30 font-bold uppercase">
                High-Leverage Vector
              </span>
            </div>
            <p className="text-xs text-text-muted max-w-3xl leading-relaxed">
              &ldquo;For <span className="text-text font-semibold">{companyName}</span>, our growth runway is {runwayMonths} months with ₹{cashOnHand.toLocaleString("en-IN")} in bank reserves. Focus executive capital on closing higher-ticket accounts and protecting pricing margins before scaling outbound marketing.&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* Main Growth Vectors Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-text uppercase tracking-wider">
              Strategic Growth Vectors
            </h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted font-mono">
              {vectors.length} Active Tracks
            </span>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {["all", "Enterprise", "Monetization", "Product", "Partnerships"].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-amber-400/20 text-amber-900 dark:text-amber-300 border border-amber-500/40 font-bold shadow-xs"
                    : "bg-surface border border-line text-text-muted hover:text-text hover:bg-surface-2"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vectors Grid & Detail Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Vectors List (Left) */}
          <div className="lg:col-span-6 space-y-3">
            {filteredVectors.map(vec => {
              const isSelected = vec.id === selectedVectorId;
              const completedMilestones = vec.milestones.filter(m => m.done).length;
              const progressPct = Math.round((completedMilestones / (vec.milestones.length || 1)) * 100);

              return (
                <div
                  key={vec.id}
                  onClick={() => setSelectedVectorId(vec.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 btn-tactile ${
                    isSelected
                      ? "bg-surface-2 border-brass ring-1 ring-brass/40 shadow-sm"
                      : "bg-surface border-line hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase">
                        {vec.category}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
                          vec.status === "Active" || vec.status === "In Flight"
                            ? "bg-jade/10 text-jade border-jade/20"
                            : "bg-surface text-text-muted border-line"
                        }`}
                      >
                        {vec.status}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-jade font-mono">{vec.expectedImpact}</span>
                  </div>

                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-text">{vec.title}</h3>
                    <p className="text-[11px] text-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {vec.description}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>Milestones Progress</span>
                      <span className="font-mono font-semibold">
                        {completedMilestones}/{vec.milestones.length} ({progressPct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface border border-line overflow-hidden">
                      <div
                        className="h-full bg-brass transition-all duration-500 rounded-full"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Vector Deep-Dive (Right) */}
          <div className="lg:col-span-6 p-5 rounded-2xl border border-line bg-surface shadow-xs space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-line gap-3">
                <div>
                  <span className="text-[10px] font-bold text-brass uppercase tracking-wider block">
                    Strategic Vector Focus
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-text mt-0.5">
                    {selectedVector.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(selectedVector)}
                    title="Edit Vector"
                    className="p-1.5 rounded-lg border border-line hover:bg-surface-2 text-text-muted hover:text-text transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVector(selectedVector.id)}
                    title="Delete Vector"
                    className="p-1.5 rounded-lg border border-line hover:bg-rose-500/10 text-text-muted hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-text-muted">Expected Impact</span>
                <span className="font-extrabold text-jade font-mono text-sm">
                  {selectedVector.expectedImpact}
                </span>
              </div>

              <p className="text-xs text-text-muted leading-relaxed">
                {selectedVector.description}
              </p>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                <div className="p-2.5 rounded-lg bg-surface-2 border border-line">
                  <span className="text-[10px] text-text-muted block">Timeline</span>
                  <span className="font-bold text-text font-mono">{selectedVector.timeline}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-2 border border-line">
                  <span className="text-[10px] text-text-muted block">Executive Owner</span>
                  <span className="font-bold text-text truncate block">{selectedVector.owner}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-surface-2 border border-line">
                  <span className="text-[10px] text-text-muted block">Risk Profile</span>
                  <span className="font-bold text-amber-400 font-mono">{selectedVector.riskTier} Risk</span>
                </div>
              </div>

              {/* Actionable Milestones Checklist */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-bold text-text uppercase tracking-wider block">
                  Actionable Operational Milestones (Click to Toggle)
                </span>
                <div className="space-y-1.5">
                  {selectedVector.milestones.map((m, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleToggleMilestone(selectedVector.id, idx)}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        m.done
                          ? "bg-jade/5 border-jade/30 text-text"
                          : "bg-surface-2 border-line text-text-muted hover:text-text"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            m.done ? "bg-jade border-jade text-white" : "border-line"
                          }`}
                        >
                          {m.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className={m.done ? "line-through text-text-muted font-medium" : "font-semibold"}>
                          {m.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted uppercase">
                        {m.done ? "Completed" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-text-muted">
                Execute this vector to auto-generate structured tasks.
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleExecuteInitiative(selectedVector)}
                  disabled={Boolean(executingId)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all btn-tactile inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {executingId ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Tasks…</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-white" />
                      <span>Execute Initiative into Tasks</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Strategic Vector Modal */}
      <PortalModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <div className="bg-surface border border-line rounded-2xl p-6 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-brass" />
              <h2 className="text-base font-bold text-text">
                {editingVector ? "Edit Strategic Growth Vector" : "Add Strategic Growth Vector"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveVector} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-text block mb-1">
                Vector Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. Inbound Demo Velocity & 48h Close Loop"
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text block mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                >
                  <option value="Enterprise">Enterprise</option>
                  <option value="Monetization">Monetization</option>
                  <option value="Product">Product</option>
                  <option value="Partnerships">Partnerships</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                >
                  <option value="In Flight">In Flight</option>
                  <option value="Active">Active</option>
                  <option value="Planned">Planned</option>
                  <option value="Testing">Testing</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-text block mb-1">Expected Impact</label>
                <input
                  type="text"
                  value={formExpectedImpact}
                  onChange={e => setFormExpectedImpact(e.target.value)}
                  placeholder="e.g. +₹18,00,000 ARR"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">Timeline</label>
                <input
                  type="text"
                  value={formTimeline}
                  onChange={e => setFormTimeline(e.target.value)}
                  placeholder="e.g. Q4 2026"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">Risk Tier</label>
                <select
                  value={formRiskTier}
                  onChange={e => setFormRiskTier(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-text block mb-1">Executive Owner</label>
              <input
                type="text"
                value={formOwner}
                onChange={e => setFormOwner(e.target.value)}
                placeholder="e.g. Founder & Sales Lead"
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-text block mb-1">Description</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Briefly explain the strategy, rationale, and execution model..."
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
              />
            </div>

            {/* Milestones dynamic list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text">Operational Milestones</label>
                <button
                  type="button"
                  onClick={() => setFormMilestones([...formMilestones, ""])}
                  className="text-[11px] text-brass hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Milestone</span>
                </button>
              </div>

              <div className="space-y-1.5">
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
                      placeholder={`Milestone ${idx + 1}...`}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                    />
                    {formMilestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormMilestones(formMilestones.filter((_, i) => i !== idx))}
                        className="p-1.5 text-text-muted hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all btn-tactile cursor-pointer"
              >
                {editingVector ? "Save Changes" : "Create Vector"}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BookOpen,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Bot,
  Search,
  ChevronRight,
  Clock,
  Layers,
  Plus,
  RefreshCw,
  X,
  FileText,
  DollarSign,
  TrendingUp,
  Users,
  Trash2
} from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";

interface Playbook {
  id: string;
  title: string;
  category: "ceo" | "cfo" | "cmo" | "coo";
  roleLabel: string;
  triggerCondition: string;
  severity: "Critical" | "High" | "Medium";
  impactTarget: string;
  summary: string;
  phases: {
    phaseTitle: string;
    steps: string[];
  }[];
  primaryOwner: string;
  tasksToGenerate: Array<{
    title: string;
    priority: "critical" | "high" | "medium";
    owner: string;
  }>;
}

const DEFAULT_PLAYBOOKS: Playbook[] = [
  {
    id: "pb-01",
    title: "Top 3 Client Concentration De-Risking Protocol",
    category: "ceo",
    roleLabel: "Astra (CEO AI)",
    triggerCondition: "Top 3 clients account for > 40% of gross monthly revenue",
    severity: "Critical",
    impactTarget: "Reduce top concentration to < 25% within 90 days",
    summary: "Systematic outreach and contract restructuring to eliminate existential revenue vulnerability if a marquee client churns.",
    primaryOwner: "Founder & CEO",
    phases: [
      {
        phaseTitle: "Phase 1: Immediate Retention & Lock-In (Days 1–15)",
        steps: [
          "Initiate executive sponsor review meetings with primary stakeholder at Top 3 accounts.",
          "Offer multi-year SLA guarantees in exchange for 12-to-24 month contract extensions.",
          "Identify secondary internal champions within each marquee account to eliminate single-contact risk.",
        ],
      },
      {
        phaseTitle: "Phase 2: Secondary Tier Pipeline Acceleration (Days 16–45)",
        steps: [
          "Target mid-tier accounts (ACV ₹5L – ₹15L) with specialized fast-track onboarding packages.",
          "Launch outbound account-based marketing (ABM) to 40 diversified lookalike prospects.",
          "Reallocate 50% of executive closing bandwidth from existing accounts to new logos.",
        ],
      },
      {
        phaseTitle: "Phase 3: Revenue Floor Governance (Days 46–90)",
        steps: [
          "Set automated alert trigger in Gap Register if any single client breaches 20% concentration.",
          "Review monthly client revenue distribution with Marcus (CFO AI).",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Schedule quarterly executive check-in with Top 3 enterprise accounts", priority: "critical", owner: "Founder" },
      { title: "Draft 2-year contract renewal options with tiered volume incentives", priority: "high", owner: "Founder" },
      { title: "Launch lookalike outbound ABM campaign to 40 mid-market accounts", priority: "high", owner: "Revenue Ops" },
    ],
  },
  {
    id: "pb-02",
    title: "Cash Runway Extension & Burn Compression Protocol",
    category: "cfo",
    roleLabel: "Marcus (CFO AI)",
    triggerCondition: "Verified liquid operational runway drops below 8.0 months",
    severity: "Critical",
    impactTarget: "Stretch forward runway by +3.5 months with zero core product disruption",
    summary: "Emergency financial governance protocol to reduce discretionary vendor expenses, compress server burn, and prioritize upfront customer collections.",
    primaryOwner: "Marcus (CFO) & Founder",
    phases: [
      {
        phaseTitle: "Phase 1: 48-Hour Discretionary Expense Freeze (Days 1–3)",
        steps: [
          "Audit all recurring SaaS vendor subscriptions and cancel unused / duplicate licenses.",
          "Implement dual-executive authorization requirement on any expenditure > ₹25,000.",
          "Pause non-essential hiring and transition backfills to milestone-based contractor retainers.",
        ],
      },
      {
        phaseTitle: "Phase 2: Working Capital & Upfront Cash Inflow (Days 4–20)",
        steps: [
          "Offer 10% cash discount to enterprise accounts opting for 12-month upfront annual prepayment.",
          "Audit outstanding Accounts Receivable (AR) and execute collections blitz on invoices > 30 days overdue.",
          "Restructure vendor payment terms to 45 days (DPO expansion).",
        ],
      },
      {
        phaseTitle: "Phase 3: Cloud & Delivery Cost Optimization (Days 21–45)",
        steps: [
          "Audit AWS / Azure workloads, terminate idle staging instances, and commit to 1-year reserved instances.",
          "Recalibrate gross margin thresholds across customer delivery pods.",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Perform comprehensive SaaS subscription & vendor spend audit", priority: "critical", owner: "Operations Lead" },
      { title: "Send annual prepay discount offer to top 15 renewal accounts", priority: "high", owner: "Founder" },
      { title: "Audit overdue AR accounts and send automated legal notice reminders", priority: "critical", owner: "Finance Lead" },
    ],
  },
  {
    id: "pb-03",
    title: "Enterprise Deal Velocity & POC Compression Framework",
    category: "cmo",
    roleLabel: "Elena (CMO / Sales AI)",
    triggerCondition: "Average enterprise sales cycle exceeds 60 days or POC conversion drops < 40%",
    severity: "High",
    impactTarget: "Compress sales cycle to 24 days and increase POC-to-paid closing to 65%",
    summary: "Structured Mutual Action Plan (MAP) playbook to eliminate procurement delays, establish early security compliance sign-off, and close high-ticket deals faster.",
    primaryOwner: "Head of Growth & Founder",
    phases: [
      {
        phaseTitle: "Phase 1: Mutual Action Plan (MAP) Deployment",
        steps: [
          "Require mutual action plan sign-off from prospect's VP/C-level before beginning free trials or POCs.",
          "Attach quantifiable commercial success criteria (e.g. 25% efficiency gain in 14 days).",
        ],
      },
      {
        phaseTitle: "Phase 2: Security & Procurement Fast-Track",
        steps: [
          "Provide pre-packaged SOC2, GDPR, and Indian data localization documentation on Day 1.",
          "Standardize master service agreement (MSA) redline fallback clauses to avoid prolonged legal back-and-forth.",
        ],
      },
      {
        phaseTitle: "Phase 3: Executive Closing Cadence",
        steps: [
          "Host Day 14 executive demo review with economic buyer.",
          "Lock in signed contract before end of pilot window with scheduled launch milestones.",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Standardize Mutual Action Plan template for all pipeline deals > ₹5L", priority: "high", owner: "Revenue Ops" },
      { title: "Package automated security & compliance kit for enterprise buyers", priority: "medium", owner: "Operations Lead" },
    ],
  },
  {
    id: "pb-04",
    title: "Gross Margin Floor & Delivery Pricing Governance",
    category: "cfo",
    roleLabel: "Marcus (CFO AI)",
    triggerCondition: "Gross delivery margins dip below 65% across project delivery pods",
    severity: "High",
    impactTarget: "Restore gross margin floor to 75%+ across all client deliverables",
    summary: "Operational framework to eliminate scope creep, mandate billable hourly rate minimums, and curb unbilled contractor hours.",
    primaryOwner: "Operations Lead & Marcus (CFO)",
    phases: [
      {
        phaseTitle: "Phase 1: Real-Time Gross Margin Audit",
        steps: [
          "Audit loaded developer / team delivery cost per active client contract.",
          "Identify bottom 20% margin accounts dragging down company profitability.",
        ],
      },
      {
        phaseTitle: "Phase 2: Scope Control & Change Order Enforcement",
        steps: [
          "Mandate formalized written change orders with hourly billing for out-of-scope requests.",
          "Enforce strict 15% maximum discount guardrail across all sales quotations.",
        ],
      },
      {
        phaseTitle: "Phase 3: Rate Card Recalibration",
        steps: [
          "Re-price lowest-margin legacy accounts at upcoming renewal window.",
          "Establish minimum gross margin floor checklist before any proposal is issued.",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Review bottom 5 lowest-margin accounts and draft margin repair plan", priority: "high", owner: "Operations Lead" },
      { title: "Implement mandatory Change Order approval policy across delivery team", priority: "high", owner: "Lead Architect" },
    ],
  },
  {
    id: "pb-05",
    title: "Key Man Dependency & Founder Decoupling SOP",
    category: "coo",
    roleLabel: "Astra (CEO AI)",
    triggerCondition: "Founder or single technical lead is on critical path for > 60% of client deliveries",
    severity: "High",
    impactTarget: "Eliminate single-point failure risks and transition founder to strategic leadership",
    summary: "Playbook for institutionalizing delivery knowledge, standardizing technical SOPs, and assigning pod leads to customer engagements.",
    primaryOwner: "Founder & Operations Lead",
    phases: [
      {
        phaseTitle: "Phase 1: Delivery Bottleneck Audit",
        steps: [
          "Track founder time allocation across technical execution vs strategic growth for 7 days.",
          "Identify repetitive customer questions and delivery tasks requiring founder intervention.",
        ],
      },
      {
        phaseTitle: "Phase 2: Shadow Assignment & Delegation",
        steps: [
          "Pair senior mid-level team leads as co-pilots on all high-touch customer calls.",
          "Document standard operating playbooks for core workflows in Knowledge Hub.",
        ],
      },
      {
        phaseTitle: "Phase 3: Autonomy Verification",
        steps: [
          "Execute a 7-day founder-off-grid trial where pod leads manage end-to-end delivery.",
          "Audit delivery velocity and client NPS during autonomous phase.",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Map all daily founder operational tasks into standard SOP playbooks", priority: "high", owner: "Founder" },
      { title: "Assign secondary account leads to top 5 customer accounts", priority: "critical", owner: "Operations Lead" },
    ],
  },
  {
    id: "pb-06",
    title: "Net Revenue Retention & Account Expansion Engine",
    category: "cmo",
    roleLabel: "Elena (Growth AI)",
    triggerCondition: "Net Revenue Retention (NRR) falls below 105% or annual churn breaches 12%",
    severity: "Medium",
    impactTarget: "Elevate NRR to 120%+ via automated telemetry triggers and upsell tiers",
    summary: "Systematic post-sale account review cadence that monitors customer adoption drops and presents value-add expansion tiers before contract renewal.",
    primaryOwner: "Customer Success & Growth",
    phases: [
      {
        phaseTitle: "Phase 1: Health Score Telemetry Setup",
        steps: [
          "Configure automated alerts for accounts exhibiting > 30% drop in weekly tool usage.",
          "Identify power accounts operating above 80% of license capacity for immediate tier upgrade.",
        ],
      },
      {
        phaseTitle: "Phase 2: Quarterly Value Delivery Briefs",
        steps: [
          "Send personalized ROI Executive Briefing to account sponsors 60 days before contract expiry.",
          "Demonstrate hard savings and revenue unlocked during the preceding 10 months.",
        ],
      },
      {
        phaseTitle: "Phase 3: Multi-Seat & Enterprise Add-On Upsell",
        steps: [
          "Introduce premium AI executive copilots and automated report generators as contract add-ons.",
          "Incentivize multi-year renewal commitments with locked-in pricing.",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Deploy automated account health score telemetry triggers", priority: "high", owner: "Revenue Ops" },
      { title: "Schedule 60-day advance renewal reviews for all Q4 expiring contracts", priority: "high", owner: "Founder" },
    ],
  },
  {
    id: "pb-07",
    title: "Working Capital & DSO Acceleration Protocol",
    category: "cfo",
    roleLabel: "Marcus (CFO AI)",
    triggerCondition: "Days Sales Outstanding (DSO) exceeds 50 days with trapped receivables",
    severity: "High",
    impactTarget: "Compress DSO to < 35 days and unlock ₹12L+ in trapped cash flow",
    summary: "Aggressive cash collection cycle optimization combining automated milestone billing, structured payment gateways, and early settlement incentives.",
    primaryOwner: "Finance Lead & Marcus (CFO)",
    phases: [
      {
        phaseTitle: "Phase 1: Collections Automation",
        steps: [
          "Deploy automated WhatsApp and email payment reminders at T-7, T-2, Due Date, and T+3 days.",
          "Attach one-click UPI and net-banking payment links directly to all invoices.",
        ],
      },
      {
        phaseTitle: "Phase 2: Commercial Term Revision",
        steps: [
          "Transition all project deliverables to 50% upfront, 30% milestone, 20% delivery terms.",
          "Offer 2% prompt-payment discount for invoices settled within 10 calendar days.",
        ],
      },
      {
        phaseTitle: "Phase 3: Work-Stop Escalation Rules",
        steps: [
          "Enforce mandatory delivery suspension policy when customer invoice exceeds 30 days overdue.",
          "Conduct weekly receivables review with Marcus (CFO AI).",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Integrate automated payment reminder workflow with Zoho/QuickBooks", priority: "high", owner: "Finance Lead" },
      { title: "Update standard contract payment clause to 50/30/20 milestone billing", priority: "high", owner: "Founder" },
    ],
  },
  {
    id: "pb-08",
    title: "Client Incident Escalation & SLA Protection",
    category: "coo",
    roleLabel: "Astra (CEO AI)",
    triggerCondition: "Production downtime, critical bug report, or deliverable delay reported",
    severity: "Critical",
    impactTarget: "Zero customer churn resulting from operational incidents",
    summary: "Immediate crisis mitigation standard ensuring transparent communication, rapid root cause remediation, and preservation of executive trust.",
    primaryOwner: "Operations Lead & CTO",
    phases: [
      {
        phaseTitle: "Phase 1: T+15 Minute Response Standard",
        steps: [
          "Acknowledge customer incident report within 15 minutes with assigned incident commander.",
          "Spin up dedicated internal resolution channel with engineering leads.",
        ],
      },
      {
        phaseTitle: "Phase 2: Transparent Executive Briefing",
        steps: [
          "Send hourly status updates to customer executive sponsor with ETA to resolution.",
          "Deploy hotfix and verify end-to-end data integrity before closing incident ticket.",
        ],
      },
      {
        phaseTitle: "Phase 3: Post-Mortem & Preventative Safeguard",
        steps: [
          "Deliver formalized Root Cause Analysis (RCA) report within 24 hours.",
          "Implement automated regression tests to prevent recurrence.",
        ],
      },
    ],
    tasksToGenerate: [
      { title: "Standardize T+15 minute customer incident escalation matrix", priority: "critical", owner: "Lead Architect" },
      { title: "Draft Root Cause Analysis (RCA) executive template for client disclosures", priority: "medium", owner: "Operations Lead" },
    ],
  },
];

export default function ExecutivePlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(DEFAULT_PLAYBOOKS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activePlaybook, setActivePlaybook] = useState<Playbook | null>(null);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("My Enterprise");
  const [runwayMonths, setRunwayMonths] = useState("0.0");
  const [monthlyBurn, setMonthlyBurn] = useState(0);
  const [cashOnHand, setCashOnHand] = useState(0);

  // Custom Playbook Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState<Playbook["category"]>("ceo");
  const [newRoleLabel, setNewRoleLabel] = useState("Astra (CEO AI)");
  const [newTrigger, setNewTrigger] = useState("");
  const [newSeverity, setNewSeverity] = useState<Playbook["severity"]>("High");
  const [newImpact, setNewImpact] = useState("");
  const [newSummary, setNewSummary] = useState("");
  const [newPhase1Title, setNewPhase1Title] = useState("Phase 1: Immediate Diagnostic (Days 1–15)");
  const [newPhase1Step, setNewPhase1Step] = useState("Conduct comprehensive stakeholder review and freeze non-essential spend.");
  const [newPhase2Title, setNewPhase2Title] = useState("Phase 2: Operational Stabilization (Days 16–45)");
  const [newPhase2Step, setNewPhase2Step] = useState("Deploy restructured workflows and enforce milestone checkpoints.");
  const [newTask1, setNewTask1] = useState("Review quarterly financial and operational metrics");

  // Close modal on Escape
  useEscapeKey(() => {
    if (activePlaybook) setActivePlaybook(null);
    if (isCreateOpen) setIsCreateOpen(false);
  }, Boolean(activePlaybook || isCreateOpen));

  const applyBusiness = (p: any) => {
    if (!p) return;
    if (p.name) setCompanyName(p.name);
    const cash = Number(p.cash || p.cash_on_hand || p.cashOnHand || 0);
    const burn = Number(p.burn || p.monthly_burn || p.monthlyBurn || 0);
    setCashOnHand(cash);
    setMonthlyBurn(burn);
    if (burn > 0) {
      setRunwayMonths((cash / burn).toFixed(1));
    } else if (cash > 0) {
      setRunwayMonths("18+");
    }
  };

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("bizzpal_business_profile");
      if (savedProfile) {
        applyBusiness(JSON.parse(savedProfile));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) {
              applyBusiness(d.business);
              localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business));
            }
          })
          .catch(() => {});
      }

      const savedPlaybooks = localStorage.getItem("bizzpal_executive_playbooks");
      if (savedPlaybooks) {
        const parsed = JSON.parse(savedPlaybooks);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPlaybooks(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleSavePlaybook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newPb: Playbook = {
      id: `custom-pb-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      roleLabel: newRoleLabel,
      triggerCondition: newTrigger.trim() || "Triggered upon executive directive",
      severity: newSeverity,
      impactTarget: newImpact.trim() || "Operational stability within 30 days",
      summary: newSummary.trim() || "Custom operational execution protocol.",
      primaryOwner: "Founder & Executive Lead",
      phases: [
        {
          phaseTitle: newPhase1Title.trim() || "Phase 1: Immediate Diagnostic",
          steps: [newPhase1Step.trim() || "Conduct immediate operational audit."],
        },
        {
          phaseTitle: newPhase2Title.trim() || "Phase 2: Execution & Stabilization",
          steps: [newPhase2Step.trim() || "Deploy resolution action items."],
        },
      ],
      tasksToGenerate: [
        {
          title: newTask1.trim() || `Execute ${newTitle.trim()}`,
          priority: newSeverity === "Critical" ? "critical" : "high",
          owner: "Founder",
        },
      ],
    };

    const updated = [newPb, ...playbooks];
    setPlaybooks(updated);
    try {
      localStorage.setItem("bizzpal_executive_playbooks", JSON.stringify(updated));
    } catch {}

    setIsCreateOpen(false);
    setNewTitle("");
    setNewTrigger("");
    setNewImpact("");
    setNewSummary("");
    setToastMessage(`Custom Playbook '${newPb.title}' created successfully!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDeletePlaybook = (id: string, title: string) => {
    if (!confirm(`Delete playbook '${title}'?`)) return;
    const updated = playbooks.filter(p => p.id !== id);
    setPlaybooks(updated);
    try {
      localStorage.setItem("bizzpal_executive_playbooks", JSON.stringify(updated));
    } catch {}
    setToastMessage(`Playbook '${title}' removed.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExecutePlaybook = async (pb: Playbook) => {
    setExecutingId(pb.id);

    try {
      for (const t of pb.tasksToGenerate) {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[Playbook: ${pb.title.split(" ")[0]}] ${t.title}`,
            owner: t.owner,
            gap: "Operational Playbook",
            priority: t.priority,
            category: pb.category.toUpperCase(),
            status: "todo",
          }),
        }).catch(() => {});
      }
    } catch (e) {
      // ignore
    }

    setExecutingId(null);
    setActivePlaybook(null);
    setToastMessage(`Playbook '${pb.title}' activated! ${pb.tasksToGenerate.length} operational tasks created in /tasks.`);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const filteredPlaybooks = playbooks.filter(pb => {
    const matchesCategory =
      selectedCategory === "all" || pb.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch =
      pb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pb.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pb.triggerCondition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <BookOpen className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-text">Executive Playbooks</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
              {playbooks.length} Active Protocols
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase tracking-wider">
              PRO
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-medium">
            Battle-tested operational playbooks and step-by-step executive protocols to handle cash crunches, key employee exits, and price increases.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs shadow-sm hover:brightness-110 active:scale-95 btn-tactile inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Create Custom Playbook</span>
          </button>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search playbooks, triggers, SOPs…"
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brass"
            />
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-jade/10 border border-jade/30 text-xs text-jade flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <Link href="/tasks" className="underline font-bold text-text hover:text-jade">
            Go to Tasks & Execution →
          </Link>
        </div>
      )}

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
        {[
          { id: "all", label: `All Playbooks (${playbooks.length})` },
          { id: "ceo", label: `CEO / Strategy (${playbooks.filter(p => p.category === "ceo").length})` },
          { id: "cfo", label: `CFO / Solvency (${playbooks.filter(p => p.category === "cfo").length})` },
          { id: "cmo", label: `CMO / Growth (${playbooks.filter(p => p.category === "cmo").length})` },
          { id: "coo", label: `COO / Operations (${playbooks.filter(p => p.category === "coo").length})` },
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? "bg-brass text-white shadow-xs"
                : "bg-surface border border-line text-text-muted hover:text-text"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPlaybooks.map(pb => (
          <div
            key={pb.id}
            className="p-5 rounded-xl border border-line bg-surface hover:border-line-strong transition-all flex flex-col justify-between space-y-4 shadow-xs group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold text-brass bg-brass-soft px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {pb.roleLabel}
                </span>
                <div className="flex items-center gap-1.5">
                  {pb.id.startsWith("custom-pb") && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePlaybook(pb.id, pb.title);
                      }}
                      title="Delete Custom Playbook"
                      className="p-1 rounded text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                      pb.severity === "Critical"
                        ? "text-rust border-rust/30 bg-rust/10"
                        : "text-amber-400 border-amber-400/30 bg-amber-400/10"
                    }`}
                  >
                    {pb.severity} Trigger
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xs sm:text-sm font-bold text-text group-hover:text-brass transition-colors">
                  {pb.title}
                </h3>
                <p className="text-[11px] text-text-muted mt-1 leading-relaxed line-clamp-2">
                  {pb.summary}
                </p>
              </div>

              <div className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                pb.triggerCondition.toLowerCase().includes("runway") && parseFloat(runwayMonths) <= 8.0
                  ? "bg-rose-500/10 border-rose-500/30 ring-1 ring-rose-500/20"
                  : "bg-surface-2 border-line"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-500 font-semibold text-[10px] uppercase">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Activation Trigger:</span>
                  </div>
                  {pb.triggerCondition.toLowerCase().includes("runway") && parseFloat(runwayMonths) <= 8.0 && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold uppercase tracking-wider animate-pulse">
                      Active Condition
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted font-medium">
                  {pb.triggerCondition}
                </p>
              </div>

              <div className="text-[11px] flex items-center justify-between text-text-muted pt-1 border-t border-line/60">
                <span>Target: <strong className="text-jade">{pb.impactTarget}</strong></span>
                <span className="font-mono text-[10px]">{pb.phases.length} Phases</span>
              </div>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActivePlaybook(pb)}
                className="text-xs font-semibold text-brass hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Playbook</span>
                <ChevronRight className="w-3 h-3" />
              </button>
              <Link
                href={`/chat?message=${encodeURIComponent(`Astra & Marcus, execute diagnostic review for '${pb.title}' under our current business telemetry for ${companyName}.`)}`}
                className="text-xs font-semibold text-text-muted hover:text-text inline-flex items-center gap-1 p-1 rounded hover:bg-surface-2"
                title="Consult AI Executive"
              >
                <Bot className="w-3.5 h-3.5 text-brass" />
                <span className="text-[11px]">Consult AI</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Playbook Modal */}
      {activePlaybook && (
        <PortalModal isOpen={Boolean(activePlaybook)} onClose={() => setActivePlaybook(null)}>
          <div className="relative w-full max-w-2xl max-h-[90vh] rounded-2xl bg-surface border border-line shadow-2xl flex flex-col overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
              {/* Modal Top Bar */}
              <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between bg-surface-2/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brass">
                      {activePlaybook.roleLabel} · {activePlaybook.severity} Resolution
                    </span>
                    <h2 className="text-sm sm:text-base font-bold text-text mt-0.5">
                      {activePlaybook.title}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePlaybook(null)}
                  className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* Trigger & Impact Alert */}
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-[10px] uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Operational Trigger Condition</span>
                  </div>
                  <p className="text-text font-semibold">
                    {activePlaybook.triggerCondition}
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Target Impact: <strong className="text-jade font-semibold">{activePlaybook.impactTarget}</strong>
                  </p>
                </div>

                <p className="text-xs text-text-muted leading-relaxed">
                  {activePlaybook.summary}
                </p>

                {/* Phases Steps */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-bold text-text uppercase tracking-wider block">
                    Execution Phases & Concrete Steps
                  </span>
                  {activePlaybook.phases.map((phase, pIdx) => (
                    <div key={pIdx} className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
                      <h4 className="font-bold text-xs text-text flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-brass text-white text-[10px] flex items-center justify-center font-mono">
                          {pIdx + 1}
                        </span>
                        <span>{phase.phaseTitle}</span>
                      </h4>
                      <ul className="space-y-1.5 pl-6 list-disc text-text-muted text-[11px] leading-relaxed">
                        {phase.steps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Footer Bar */}
              <div className="p-4 border-t border-line bg-surface-2/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <Link
                  href={`/chat?message=${encodeURIComponent(`Astra, let's execute the '${activePlaybook.title}' playbook for ${companyName}. Walk me through Phase 1 immediately.`)}`}
                  className="text-xs font-semibold text-brass hover:underline inline-flex items-center gap-1"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Launch in AI Workspace →</span>
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePlaybook(null)}
                    className="px-3.5 py-2 rounded-xl border border-line text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecutePlaybook(activePlaybook)}
                    disabled={Boolean(executingId)}
                    className="px-4 py-2 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all btn-tactile inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    {executingId ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating Tasks…</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-white" />
                        <span>Execute Playbook into Tasks</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
        </PortalModal>
      )}

      {/* Create Custom Playbook Modal */}
      {isCreateOpen && (
        <PortalModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
          <div className="relative w-full max-w-xl max-h-[90vh] rounded-2xl bg-surface border border-line shadow-2xl flex flex-col overflow-hidden animate-scale-up" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-line flex items-center justify-between bg-surface-2/60">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brass" />
                  <h2 className="text-sm sm:text-base font-bold text-text">Create Executive Playbook</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSavePlaybook} className="p-5 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Playbook Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Key Account Churn Prevention & Escalation Protocol"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text block mb-1">Category & Role</label>
                    <select
                      value={newCategory}
                      onChange={e => {
                        const cat = e.target.value as any;
                        setNewCategory(cat);
                        if (cat === "ceo") setNewRoleLabel("Astra (CEO AI)");
                        else if (cat === "cfo") setNewRoleLabel("Marcus (CFO AI)");
                        else if (cat === "cmo") setNewRoleLabel("Elena (CMO AI)");
                        else setNewRoleLabel("COO (Operations)");
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                    >
                      <option value="ceo">CEO / Strategy</option>
                      <option value="cfo">CFO / Solvency</option>
                      <option value="cmo">CMO / Growth</option>
                      <option value="coo">COO / Operations</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-text block mb-1">Severity Trigger</label>
                    <select
                      value={newSeverity}
                      onChange={e => setNewSeverity(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text block mb-1">Activation Trigger Condition</label>
                  <input
                    type="text"
                    value={newTrigger}
                    onChange={e => setNewTrigger(e.target.value)}
                    placeholder="e.g. Client concentration breaches 35% or runway dips under 6 months"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text block mb-1">Target Impact</label>
                  <input
                    type="text"
                    value={newImpact}
                    onChange={e => setNewImpact(e.target.value)}
                    placeholder="e.g. Prevent account loss and extend contract by 12 months"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text block mb-1">Summary</label>
                  <textarea
                    rows={2}
                    value={newSummary}
                    onChange={e => setNewSummary(e.target.value)}
                    placeholder="Brief description of the operational strategy..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                  />
                </div>

                <div className="space-y-3 pt-2 border-t border-line">
                  <span className="text-[10px] font-bold text-text uppercase tracking-wider block">
                    Execution Phases & Task Dispatch
                  </span>
                  <div>
                    <label className="text-[11px] font-medium text-text-muted block mb-1">Phase 1 Title & Action</label>
                    <input
                      type="text"
                      value={newPhase1Title}
                      onChange={e => setNewPhase1Title(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text mb-1"
                    />
                    <input
                      type="text"
                      value={newPhase1Step}
                      onChange={e => setNewPhase1Step(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text-muted"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-text-muted block mb-1">Phase 2 Title & Action</label>
                    <input
                      type="text"
                      value={newPhase2Title}
                      onChange={e => setNewPhase2Title(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text mb-1"
                    />
                    <input
                      type="text"
                      value={newPhase2Step}
                      onChange={e => setNewPhase2Step(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text-muted"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-text-muted block mb-1">Auto-Generated Execution Task</label>
                    <input
                      type="text"
                      value={newTask1}
                      onChange={e => setNewTask1(e.target.value)}
                      placeholder="Task dispatched to /tasks queue"
                      className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all btn-tactile cursor-pointer"
                  >
                    Save & Activate Playbook
                  </button>
                </div>
              </form>
            </div>
        </PortalModal>
      )}
    </div>
  );
}

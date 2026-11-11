"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";
import { useCustomAdvisors } from "@/lib/advisors";

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
    roleLabel: "CEO",
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
          "Review monthly client revenue distribution with CFO.",
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
    roleLabel: "CFO",
    triggerCondition: "Verified liquid operational runway drops below 8.0 months",
    severity: "Critical",
    impactTarget: "Stretch forward runway by +3.5 months with zero core product disruption",
    summary: "Emergency financial governance protocol to reduce discretionary vendor expenses, compress server burn, and prioritize upfront customer collections.",
    primaryOwner: "CFO & Founder",
    phases: [
      {
        phaseTitle: "Phase 1: 48-Hour Discretionary Expense Freeze (Days 1–3)",
        steps: [
          "Audit all recurring SaaS vendor subscriptions and cancel unused / duplicate licenses.",
          "Implement dual-executive authorization requirement on any expenditure > ₹25,00,000.",
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
    roleLabel: "Marketing",
    triggerCondition: "Average enterprise sales cycle exceeds 60 days or POC conversion drops < 40%",
    severity: "High",
    impactTarget: "Compress sales cycle to 24 days and increase POC-to-paid closing to 65%",
    summary: "Structured Mutual Action Plan (MAP) playbook to eliminate procurement delays, establish early security compliance sign-off, and close high-ticket deals faster.",
    primaryOwner: "Head of Marketing & Founder",
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
    roleLabel: "CFO",
    triggerCondition: "Gross delivery margins dip below 65% across project delivery pods",
    severity: "High",
    impactTarget: "Restore gross margin floor to 75%+ across all client deliverables",
    summary: "Operational framework to eliminate scope creep, mandate billable hourly rate minimums, and curb unbilled contractor hours.",
    primaryOwner: "Operations & CFO",
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
    roleLabel: "Operations",
    triggerCondition: "Founder or single technical lead is on critical path for > 60% of client deliveries",
    severity: "High",
    impactTarget: "Eliminate single-point failure risks and transition founder to strategic leadership",
    summary: "Playbook for institutionalizing delivery knowledge, standardizing technical SOPs, and assigning pod leads to customer engagements.",
    primaryOwner: "Founder & Operations",
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
    roleLabel: "Marketing",
    triggerCondition: "Net Revenue Retention (NRR) falls below 105% or annual churn breaches 12%",
    severity: "Medium",
    impactTarget: "Elevate NRR to 120%+ via automated telemetry triggers and upsell tiers",
    summary: "Systematic post-sale account review cadence that monitors customer adoption drops and presents value-add expansion tiers before contract renewal.",
    primaryOwner: "Customer Success & Marketing",
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
    roleLabel: "CFO",
    triggerCondition: "Days Sales Outstanding (DSO) exceeds 50 days with trapped receivables",
    severity: "High",
    impactTarget: "Compress DSO to < 35 days and unlock ₹12L+ in trapped cash flow",
    summary: "Aggressive cash collection cycle optimization combining automated milestone billing, structured payment gateways, and early settlement incentives.",
    primaryOwner: "Finance & CFO",
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
          "Conduct weekly receivables review with CFO.",
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
    roleLabel: "Operations",
    triggerCondition: "Production downtime, critical bug report, or deliverable delay reported",
    severity: "Critical",
    impactTarget: "Zero customer churn resulting from operational incidents",
    summary: "Immediate crisis mitigation standard ensuring transparent communication, rapid root cause remediation, and preservation of executive trust.",
    primaryOwner: "Operations & CTO",
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

const sanitizePlaybook = (p: Playbook): Playbook => {
  let cleanRole = p.roleLabel;
  if (cleanRole.includes("Astra") || cleanRole.includes("CEO AI") || cleanRole.includes("CEO")) cleanRole = "CEO";
  else if (cleanRole.includes("Marcus") || cleanRole.includes("CFO AI") || cleanRole.includes("CFO")) cleanRole = "CFO";
  else if (cleanRole.includes("Elena") || cleanRole.includes("CMO") || cleanRole.includes("Growth AI") || cleanRole.includes("Sales AI") || cleanRole.includes("Marketing")) cleanRole = "Marketing";
  else if (cleanRole.includes("COO") || cleanRole.includes("Operations")) cleanRole = "Operations";

  let cleanOwner = (p.primaryOwner || "")
    .replace(/Astra\s*\(CEO\s*AI\)/gi, "CEO")
    .replace(/Marcus\s*\(CFO\s*AI\)/gi, "CFO")
    .replace(/Marcus\s*\(CFO\)/gi, "CFO")
    .replace(/Elena\s*\(CMO\s*\/\s*Sales\s*AI\)/gi, "Marketing")
    .replace(/Elena/gi, "Marketing");

  return {
    ...p,
    roleLabel: cleanRole,
    primaryOwner: cleanOwner,
  };
};

export default function ExecutivePlaybooksPage() {
  const { ceoName, cfoName, marketingName, opsName } = useCustomAdvisors();
  const [playbooks, setPlaybooks] = useState<Playbook[]>(() => DEFAULT_PLAYBOOKS.map(sanitizePlaybook));
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
  const [newRoleLabel, setNewRoleLabel] = useState("CEO");
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
          const sanitized = parsed.map(sanitizePlaybook);
          setPlaybooks(sanitized);
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

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";
  const labelClass = "block text-sm text-text mb-1.5";

  const displayRoleFor = (pb: Playbook) =>
    pb.category === "ceo"
      ? ceoName
      : pb.category === "cfo"
      ? cfoName
      : pb.category === "cmo"
      ? marketingName
      : pb.category === "coo"
      ? opsName
      : pb.roleLabel;

  const tabs = [
    { id: "all", label: "All playbooks" },
    { id: "ceo", label: ceoName },
    { id: "cfo", label: cfoName },
    { id: "cmo", label: marketingName },
    { id: "coo", label: opsName },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold text-text">Executive playbooks</h1>
          <p className="text-sm text-text-muted mt-1 leading-relaxed">
            Step-by-step guides for common business problems, like running low on cash or relying too much on one client.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search playbooks"
            aria-label="Search playbooks"
            className="w-full lg:w-64 px-4 py-2 rounded-xl bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
          />
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer whitespace-nowrap shrink-0"
          >
            New playbook
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

      <div className="inline-flex items-center p-1 rounded-xl bg-surface-2 overflow-x-auto max-w-full">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-sm whitespace-nowrap cursor-pointer transition-colors ${
              selectedCategory === tab.id ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filteredPlaybooks.length === 0 && (
        <p className="text-sm text-text-muted py-8">No playbooks match your search.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPlaybooks.map(pb => {
          const isApplying = pb.triggerCondition.toLowerCase().includes("runway") && parseFloat(runwayMonths) <= 8.0;

          return (
            <div key={pb.id} className="rounded-2xl border border-line bg-surface shadow-sm p-6 flex flex-col">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-text-muted">{displayRoleFor(pb)}</span>
                <span className={pb.severity === "Critical" ? "text-rust" : "text-text-muted"}>{pb.severity}</span>
              </div>

              <h3 className="text-lg font-semibold text-text leading-snug mt-2">{pb.title}</h3>
              <p className="text-sm text-text-muted mt-2 leading-relaxed line-clamp-2">{pb.summary}</p>

              <div className="mt-5 space-y-3 flex-1">
                <div>
                  <p className={`text-xs ${isApplying ? "text-rust font-medium" : "text-text-muted"}`}>
                    {isApplying ? "Applies to you right now" : "Use this when"}
                  </p>
                  <p className="text-sm text-text mt-0.5">{pb.triggerCondition}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Goal</p>
                  <p className="text-sm text-text mt-0.5">{pb.impactTarget}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-line flex items-center justify-between gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => setActivePlaybook(pb)}
                  className="text-brass hover:underline cursor-pointer"
                >
                  View playbook ({pb.phases.length} phases)
                </button>
                <div className="flex items-center gap-4">
                  {pb.id.startsWith("custom-pb") && (
                    <button
                      type="button"
                      onClick={() => handleDeletePlaybook(pb.id, pb.title)}
                      className="text-text-muted hover:text-rust cursor-pointer"
                    >
                      Delete
                    </button>
                  )}
                  <Link
                    href={`/chat?message=${encodeURIComponent(`Review our diagnostic protocol for '${pb.title}' under our current business telemetry for ${companyName}.`)}`}
                    className="text-text-muted hover:text-text"
                  >
                    Ask AI
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {activePlaybook && (
        <PortalModal isOpen={Boolean(activePlaybook)} onClose={() => setActivePlaybook(null)}>
          <div
            className="w-[40rem] max-w-[calc(100vw-2rem)] max-h-[90vh] rounded-2xl bg-surface border border-line shadow-lg flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-text-muted">
                  {displayRoleFor(activePlaybook)} · {activePlaybook.severity}
                </p>
                <h2 className="text-xl font-semibold text-text mt-0.5 leading-snug">{activePlaybook.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setActivePlaybook(null)}
                aria-label="Close"
                className="p-1 text-text-muted hover:text-text cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pb-6 overflow-y-auto space-y-6">
              <p className="text-sm text-text-muted leading-relaxed">{activePlaybook.summary}</p>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-xs text-text-muted">Use this when</dt>
                  <dd className="text-sm text-text mt-1">{activePlaybook.triggerCondition}</dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Goal</dt>
                  <dd className="text-sm text-jade mt-1">{activePlaybook.impactTarget}</dd>
                </div>
              </dl>

              <div className="space-y-5">
                {activePlaybook.phases.map((phase, pIdx) => (
                  <div key={pIdx}>
                    <h4 className="text-sm font-medium text-text">{phase.phaseTitle}</h4>
                    <ul className="mt-2 space-y-1.5 pl-5 list-disc text-sm text-text-muted leading-relaxed">
                      {phase.steps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Link
                href={`/chat?message=${encodeURIComponent(`Let's execute the '${activePlaybook.title}' playbook for ${companyName}. Walk me through Phase 1 immediately.`)}`}
                className="text-sm text-brass hover:underline"
              >
                Work through it with AI
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePlaybook(null)}
                  className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleExecutePlaybook(activePlaybook)}
                  disabled={Boolean(executingId)}
                  className="px-4 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {executingId ? "Creating tasks…" : "Create tasks"}
                </button>
              </div>
            </div>
          </div>
        </PortalModal>
      )}

      {isCreateOpen && (
        <PortalModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
          <div
            className="w-[36rem] max-w-[calc(100vw-2rem)] max-h-[90vh] rounded-2xl bg-surface border border-line shadow-lg flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">New playbook</h2>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Close"
                className="p-1 text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlaybook} className="flex flex-col min-h-0">
              <div className="px-6 pb-6 overflow-y-auto space-y-4">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. What to do when a key client wants to leave"
                    className={inputClass}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Who owns it</label>
                    <select
                      value={newCategory}
                      onChange={e => {
                        const cat = e.target.value as any;
                        setNewCategory(cat);
                        if (cat === "ceo") setNewRoleLabel("CEO");
                        else if (cat === "cfo") setNewRoleLabel("CFO");
                        else if (cat === "cmo") setNewRoleLabel("Marketing");
                        else setNewRoleLabel("Operations");
                      }}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="ceo">{ceoName}</option>
                      <option value="cfo">{cfoName}</option>
                      <option value="cmo">{marketingName}</option>
                      <option value="coo">{opsName}</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>How urgent</label>
                    <select
                      value={newSeverity}
                      onChange={e => setNewSeverity(e.target.value as any)}
                      className={`${inputClass} cursor-pointer`}
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Use this when</label>
                  <input
                    type="text"
                    value={newTrigger}
                    onChange={e => setNewTrigger(e.target.value)}
                    placeholder="e.g. One client is more than 35% of revenue"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Goal</label>
                  <input
                    type="text"
                    value={newImpact}
                    onChange={e => setNewImpact(e.target.value)}
                    placeholder="e.g. Keep the client and extend the contract by 12 months"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Summary</label>
                  <textarea
                    rows={2}
                    value={newSummary}
                    onChange={e => setNewSummary(e.target.value)}
                    placeholder="A short description of the approach"
                    className={inputClass}
                  />
                </div>

                <div className="pt-4 border-t border-line space-y-4">
                  <div>
                    <label className={labelClass}>Phase 1</label>
                    <input
                      type="text"
                      value={newPhase1Title}
                      onChange={e => setNewPhase1Title(e.target.value)}
                      className={`${inputClass} mb-2`}
                    />
                    <input type="text" value={newPhase1Step} onChange={e => setNewPhase1Step(e.target.value)} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Phase 2</label>
                    <input
                      type="text"
                      value={newPhase2Title}
                      onChange={e => setNewPhase2Title(e.target.value)}
                      className={`${inputClass} mb-2`}
                    />
                    <input type="text" value={newPhase2Step} onChange={e => setNewPhase2Step(e.target.value)} className={inputClass} />
                  </div>

                  <div>
                    <label className={labelClass}>Task to create</label>
                    <input
                      type="text"
                      value={newTask1}
                      onChange={e => setNewTask1(e.target.value)}
                      placeholder="This will be added to your tasks"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
                >
                  Save playbook
                </button>
              </div>
            </form>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Trash2, X } from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";

interface LeadershipDecision {
  id: string;
  title: string;
  category: "finance" | "sales" | "operations" | "talent";
  impact: string;
  recommendation: string;
  aiConfidence: number;
  status: "pending" | "approved" | "delegated" | "declined";
  actionTakenAt?: string;
  delegatedTo?: string;
}

const INITIAL_DECISIONS: LeadershipDecision[] = [
  {
    id: "dec-1",
    title: "Approve ₹65,000 Discretionary SaaS Vendor Consolidation",
    category: "finance",
    impact: "+1.2 months runway extension (₹7.8L annualized savings)",
    recommendation: "Deprecate 3 redundant analytics seats and migrate tracking pipelines to internal telemetry.",
    aiConfidence: 96,
    status: "pending",
  },
  {
    id: "dec-2",
    title: "Authorize Immediate Senior AE Hire for Mid-Market Expansion",
    category: "sales",
    impact: "+₹24,00,000 ARR capacity with projected payback in 4.5 months",
    recommendation: "Elena (Marketing AI) reports 42% qualified inbound surplus currently uncontacted within 24h SLA.",
    aiConfidence: 92,
    status: "pending",
  },
  {
    id: "dec-3",
    title: "Trigger Autonomous Client Onboarding Flow for Tier-2 Accounts",
    category: "operations",
    impact: "Reduces onboarding latency from 9.4 days to 1.8 days",
    recommendation: "Free 14 hours/week of founder & PM bandwidth by shifting standard setup to automated playbook.",
    aiConfidence: 94,
    status: "pending",
  },
  {
    id: "dec-4",
    title: "Enforce Upfront Annual Pre-payment Incentive (15% Margin Protected)",
    category: "finance",
    impact: "Injects ₹18,00,000 upfront non-dilutive liquidity into reserves",
    recommendation: "Offer custom annual agreements to top 8 renewal accounts closing this month.",
    aiConfidence: 89,
    status: "approved",
    actionTakenAt: "Today, 10:30 AM",
  },
];

interface BriefingEdition {
  id: string;
  title: string;
  cadence: string;
  periodLabel: string;
  sentiment: string;
  status: string;
  healthScore: number;
  healthLabel: string;
  annualRev: number;
  revDelta: string;
  burn: number;
  cash: number;
  runway: string;
  fteEfficiency: string;
  operationalSignals: { title: string; desc: string }[];
  risks: { title: string; severity: "High" | "Medium" | "Low"; desc: string }[];
  opportunities: { title: string; badge: string; desc: string }[];
  decisions: LeadershipDecision[];
}

const BRIEFING_EDITIONS: Record<string, BriefingEdition> = {
  "briefing-current": {
    id: "briefing-current",
    title: "Week 37 Executive Intelligence Briefing",
    cadence: "Current · Trailing 7 Days",
    periodLabel: "Telemetry Period: Trailing 7 Days · Synced Live",
    sentiment: "Bullish Control",
    status: "Live Active",
    healthScore: 89,
    healthLabel: "Robust Solvency",
    annualRev: 6000000,
    revDelta: "+14.2% MoM",
    burn: 250000,
    cash: 3800000,
    runway: "15.2 Months",
    fteEfficiency: "₹4,28,571 / FTE",
    operationalSignals: [
      {
        title: "Gross Margin Expansion (83.8%)",
        desc: "Margin widened by 240 bps due to automated cloud provisioning rules implemented in CFO automation workflow.",
      },
      {
        title: "Enterprise Conversion SLA 98.9%",
        desc: "Mid-market sales response time compressed to under 4 hours, driving an 18% improvement in outbound meeting hold rates.",
      },
    ],
    risks: [
      {
        title: "Founder Deal-Closing Concentration",
        severity: "High",
        desc: "62% of deals >₹3,00,000 required founder intervention. Sales playbook delegation required.",
      },
      {
        title: "Unused SaaS Tool Subscriptions",
        severity: "Medium",
        desc: "₹65,000 monthly burn tied to software with zero user sessions logged in trailing 30 days.",
      },
    ],
    opportunities: [
      {
        title: "Annual Contract Pre-Payment Cash Surge",
        badge: "+₹18L Liquid",
        desc: "Offering 15% incentive on annual contracts unlocks immediate non-dilutive liquidity for 8 pending renewals.",
      },
      {
        title: "Mid-Market Tier Lead Expansion",
        badge: "+₹24L ARR",
        desc: "Surplus qualified enterprise leads can be converted immediately with one dedicated account executive.",
      },
    ],
    decisions: INITIAL_DECISIONS,
  },
  "briefing-monthly": {
    id: "briefing-monthly",
    title: "Monthly Board Operations Synthesis",
    cadence: "September Cycle",
    periodLabel: "Telemetry Period: Trailing 30 Days · Board Review Cycle",
    sentiment: "Stable Runway",
    status: "Archived",
    healthScore: 85,
    healthLabel: "Capital Disciplined",
    annualRev: 5800000,
    revDelta: "+11.8% MoM",
    burn: 270000,
    cash: 4050000,
    runway: "15.0 Months",
    fteEfficiency: "₹4,14,285 / FTE",
    operationalSignals: [
      {
        title: "Customer Churn Suppressed to 0.8%",
        desc: "Automated NPS check-ins and pro-active retention triggers from Maya (COO AI) reduced monthly logo churn to historic low.",
      },
      {
        title: "Billing Automation Coverage Reached 94%",
        desc: "E-invoicing and recurring INR mandates integrated via RazorpayX ledger feed, shrinking receivables cycle by 6 days.",
      },
    ],
    risks: [
      {
        title: "Lead Response Latency on Inbound Tier 2",
        severity: "Medium",
        desc: "Inbound tier-2 leads experienced an average lag of 18 hours before initial demo confirmation.",
      },
      {
        title: "Annual Cloud Hosting Overcommit",
        severity: "Low",
        desc: "Database storage reserved capacity currently sitting at 41% utilization headroom.",
      },
    ],
    opportunities: [
      {
        title: "Multi-Seat Expansion in Financial Tech Accounts",
        badge: "+₹12L ARR",
        desc: "3 existing accounts requested bulk licenses for operations teams ahead of Q4 audits.",
      },
      {
        title: "Vendor Rate Renegotiation",
        badge: "+₹4.2L Savings",
        desc: "Consolidating 4 auxiliary APIs into internal unified telemetry endpoint.",
      },
    ],
    decisions: [
      {
        id: "dec-m-1",
        title: "Ratify Q4 Revised Operating Budget & Headcount Plan",
        category: "finance",
        impact: "Cap net monthly burn at ₹2.8L while scaling engineering capacity",
        recommendation: "Approved by finance committee with quarterly review checkpoints.",
        aiConfidence: 95,
        status: "approved",
        actionTakenAt: "Sep 1, 2026",
      },
      {
        id: "dec-m-2",
        title: "Deploy Automated Customer Health Scorecard to CS Team",
        category: "operations",
        impact: "Flags churn risk 30 days prior to contract renewal dates",
        recommendation: "Integrated into morning executive briefing feeds.",
        aiConfidence: 91,
        status: "approved",
        actionTakenAt: "Sep 3, 2026",
      },
    ],
  },
  "briefing-prev": {
    id: "briefing-prev",
    title: "Week 36 Solvency & Burn Health Review",
    cadence: "7 days ago",
    periodLabel: "Telemetry Period: Week 36 Review Cycle",
    sentiment: "Target Met",
    status: "Archived",
    healthScore: 82,
    healthLabel: "Conservative Runway",
    annualRev: 5500000,
    revDelta: "+8.5% MoM",
    burn: 285000,
    cash: 3950000,
    runway: "13.8 Months",
    fteEfficiency: "₹3,92,857 / FTE",
    operationalSignals: [
      {
        title: "Target Sales Quota Reached 4 Days Early",
        desc: "Sprint team closed two mid-market accounts in retail logistics sector totaling ₹8.4L in contract value.",
      },
      {
        title: "Infrastructure Costs Trimmed by 8%",
        desc: "Off-peak compute auto-scaling rule reduced server hosting spend without impacting SLA latency.",
      },
    ],
    risks: [
      {
        title: "Sales Rep Onboarding Velocity Lag",
        severity: "Medium",
        desc: "New SDR ramp time taking 22 days against the 14-day target playbook SLA.",
      },
    ],
    opportunities: [
      {
        title: "Upselling Self-Serve Analytics Package",
        badge: "+₹6L ARR",
        desc: "14 legacy accounts express interest in autonomous metric drill-downs.",
      },
    ],
    decisions: [
      {
        id: "dec-w36-1",
        title: "Reallocate ₹40,000 Marketing Spend to Search Intent High-Intent Channels",
        category: "sales",
        impact: "Generated 19 additional SQLs at lower blended CAC",
        recommendation: "Elena CMO validated channel performance metrics.",
        aiConfidence: 93,
        status: "approved",
        actionTakenAt: "Aug 29, 2026",
      },
    ],
  },
  "briefing-q3": {
    id: "briefing-q3",
    title: "Quarterly Comprehensive Operating Review",
    cadence: "Q3 Strategic Audit",
    periodLabel: "Telemetry Period: Q3 Full Quarter Audit",
    sentiment: "Expansion Ready",
    status: "Archived",
    healthScore: 91,
    healthLabel: "Optimal Solvency",
    annualRev: 6200000,
    revDelta: "+21.4% YoY",
    burn: 240000,
    cash: 4200000,
    runway: "17.5 Months",
    fteEfficiency: "₹4,42,857 / FTE",
    operationalSignals: [
      {
        title: "Operating Cash Flow Turned Net Positive for Quarter",
        desc: "Collections efficiency hit 96.2% following auto-reconciliation rollout.",
      },
      {
        title: "Customer Expansion Rate Grew to 118%",
        desc: "Existing accounts added an average of 2.3 additional department seats.",
      },
    ],
    risks: [
      {
        title: "Key Person Dependency on Architecture Decisions",
        severity: "Medium",
        desc: "Technical documentation needed to ensure decentralized PR review throughput.",
      },
    ],
    opportunities: [
      {
        title: "Series A / Growth Capital Readiness",
        badge: "+₹5Cr Target",
        desc: "Operating metrics place business in top quartile of Indian B2B SaaS benchmarks.",
      },
    ],
    decisions: [
      {
        id: "dec-q3-1",
        title: "Formalize Strategic Expansion Playbook for FY2026-27",
        category: "talent",
        impact: "Clear departmental milestones tied to board-level ARR targets",
        recommendation: "Approved unanimously by leadership core.",
        aiConfidence: 98,
        status: "approved",
        actionTakenAt: "Aug 15, 2026",
      },
    ],
  },
};

export default function ReportsPage() {
    const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedBriefingId, setSelectedBriefingId] = useState("briefing-current");
  const [companyName, setCompanyName] = useState("My Enterprise");
  const [founderName, setFounderName] = useState("Founder");
  const [industryName, setIndustryName] = useState("Technology & Enterprise Services");
  const [annualRevenue, setAnnualRevenue] = useState(0);
  const [teamSize, setTeamSize] = useState(1);
  const [burn, setBurn] = useState(0);
  const [cash, setCash] = useState(0);

  const [decisions, setDecisions] = useState<LeadershipDecision[]>(INITIAL_DECISIONS);
  const [activeNotification, setActiveNotification] = useState<string | null>(null);

  // Custom Decision Modal
  const [isAddDecisionOpen, setIsAddDecisionOpen] = useState(false);
  const [newDecTitle, setNewDecTitle] = useState("");
  const [newDecCategory, setNewDecCategory] = useState<LeadershipDecision["category"]>("finance");
  const [newDecImpact, setNewDecImpact] = useState("");
  const [newDecRecommendation, setNewDecRecommendation] = useState("");
  const [newDecConfidence, setNewDecConfidence] = useState(94);

  const applyProfile = (p: any) => {
    if (!p) return;
    if (p.name) setCompanyName(p.name);
    if (p.founder_name || p.founderName) setFounderName(p.founder_name || p.founderName);
    if (p.industry_label || p.industryLabel) setIndustryName(p.industry_label || p.industryLabel);
    else if (p.industry) setIndustryName(p.industry);
    if (p.annual_revenue || p.annualRevenue) setAnnualRevenue(Number(p.annual_revenue || p.annualRevenue));
    if (p.team_size || p.teamSize) setTeamSize(Number(p.team_size || p.teamSize));
    if (p.monthly_burn || p.burn) setBurn(Number(p.monthly_burn || p.burn));
    if (p.cash_on_hand || p.cash) setCash(Number(p.cash_on_hand || p.cash));
  };

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("bizzpal_business_profile");
      if (savedProfile) {
        applyProfile(JSON.parse(savedProfile));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) {
              applyProfile(d.business);
              localStorage.setItem("bizzpal_business_profile", JSON.stringify(d.business));
            }
          })
          .catch(() => {});
      }

      const savedDecisions = localStorage.getItem("bizzpal_briefing_decisions");
      if (savedDecisions) {
        const parsed = JSON.parse(savedDecisions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDecisions(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const activeEdition = BRIEFING_EDITIONS[selectedBriefingId] || BRIEFING_EDITIONS["briefing-current"];
  const displayDecisions = selectedBriefingId === "briefing-current" ? decisions : activeEdition.decisions;

  const monthlyRev = Math.round(annualRevenue / 12);
  const runwayMonths = burn > 0 ? (cash / burn).toFixed(1) : "18+";
  const healthScore = Math.min(94, Math.max(72, Math.round(75 + (cash / (burn || 1)) * 1.5)));

  const handleDecisionAction = (
    id: string,
    action: "pending" | "approved" | "delegated" | "declined",
    delegatedTo?: string
  ) => {
    const targetDec = (selectedBriefingId === "briefing-current" ? decisions : activeEdition.decisions).find(d => d.id === id);

    // If approved, create real task in /tasks
    if (action === "approved" && targetDec) {
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Directive] ${targetDec.title}`,
          owner: targetDec.category === "finance" ? "CFO" : "Founder",
          gap: "Executive Briefing",
          priority: "high",
          category: targetDec.category.toUpperCase(),
          status: "todo",
        }),
      }).catch(() => {});
    }

    const updated = (selectedBriefingId === "briefing-current" ? decisions : activeEdition.decisions).map(d => {
      if (d.id === id) {
        return {
          ...d,
          status: action,
          actionTakenAt: action === "pending" ? undefined : "Just now",
          delegatedTo: delegatedTo || (action === "delegated" ? "CEO" : undefined),
        };
      }
      return d;
    });

    if (selectedBriefingId === "briefing-current") {
      setDecisions(updated);
      try {
        localStorage.setItem("bizzpal_briefing_decisions", JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
    } else {
      activeEdition.decisions = updated;
      setDecisions([...decisions]); // re-render trigger
    }

    const actionText =
      action === "approved"
        ? "Directive Approved & Converted into Actionable Tasks in /tasks"
        : action === "delegated"
        ? `Directive Delegated to ${delegatedTo || "Autonomous AI"}`
        : action === "declined"
        ? "Directive Declined & Archived"
        : "Directive reset to pending";

    setActiveNotification(actionText);
    setTimeout(() => setActiveNotification(null), 3500);
  };

  const handleSaveCustomDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecTitle.trim()) return;

    const newDec: LeadershipDecision = {
      id: `dec-${Date.now()}`,
      title: newDecTitle.trim(),
      category: newDecCategory,
      impact: newDecImpact.trim() || "+15% operational efficiency",
      recommendation: newDecRecommendation.trim() || "Approved by leadership directive.",
      aiConfidence: newDecConfidence,
      status: "pending",
    };

    const updated = [newDec, ...decisions];
    setDecisions(updated);
    try {
      localStorage.setItem("bizzpal_briefing_decisions", JSON.stringify(updated));
    } catch {}

    setIsAddDecisionOpen(false);
    setNewDecTitle("");
    setNewDecImpact("");
    setNewDecRecommendation("");
    setActiveNotification(`Directive '${newDec.title}' proposed successfully!`);
    setTimeout(() => setActiveNotification(null), 3500);
  };

  const handleDeleteDecision = (id: string, title: string) => {
    if (!confirm(`Delete leadership directive '${title}'?`)) return;
    const updated = decisions.filter(d => d.id !== id);
    setDecisions(updated);
    try {
      localStorage.setItem("bizzpal_briefing_decisions", JSON.stringify(updated));
    } catch {}
    setActiveNotification(`Directive removed.`);
    setTimeout(() => setActiveNotification(null), 2500);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setActiveNotification("Fresh Executive Briefing synthesized across telemetry feeds.");
      setTimeout(() => setActiveNotification(null), 4000);
    }, 1600);
  };

  const handleCopy = () => {
    const text = `Executive Intelligence Briefing for ${companyName}\nHealth Index: ${healthScore}/100 | Runway: ${runwayMonths} Mo | Cash: ₹${cash.toLocaleString()}\nKey Decisions Required: ${
      decisions.filter(d => d.status === "pending").length
    } Pending Action.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isCurrent = selectedBriefingId === "briefing-current";
  const pendingCount = displayDecisions.filter(d => d.status === "pending").length;

  const editions = [
    { id: "briefing-current", title: "Week 37 briefing", cadence: "Current · last 7 days", note: pendingCount > 0 ? `${decisions.filter(d => d.status === "pending").length} decisions due` : "Up to date" },
    { id: "briefing-monthly", title: "Monthly board synthesis", cadence: "September", note: "Archived" },
    { id: "briefing-prev", title: "Week 36 review", cadence: "7 days ago", note: "Archived" },
    { id: "briefing-q3", title: "Quarterly operating review", cadence: "Q3", note: "Archived" },
  ];

  const metrics = [
    {
      label: "Annual run-rate",
      value: `₹${(isCurrent ? annualRevenue : activeEdition.annualRev).toLocaleString("en-IN")}`,
      note: activeEdition.revDelta,
    },
    {
      label: "Cash reserves",
      value: `₹${(isCurrent ? cash : activeEdition.cash).toLocaleString("en-IN")}`,
      note: "Liquid accounts",
    },
    {
      label: "Runway",
      value: isCurrent ? `${runwayMonths} months` : activeEdition.runway,
      note: `Burn ₹${(isCurrent ? burn : activeEdition.burn).toLocaleString("en-IN")} / month`,
    },
    {
      label: "Revenue per head",
      value: isCurrent
        ? `₹${Math.round(annualRevenue / (teamSize || 1)).toLocaleString("en-IN")}`
        : activeEdition.fteEfficiency.replace(" / FTE", ""),
      note: isCurrent ? `${teamSize} team ${teamSize === 1 ? "member" : "members"}` : "per team member",
    },
  ];

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Executive Briefing</h1>
          <p className="text-sm text-text-muted mt-1">
            Health, risks and decisions for {companyName}, prepared for {founderName}.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
          >
            {copied ? "Copied" : "Copy summary"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg border border-line bg-surface text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
          >
            Print / PDF
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? "Generating…" : "Generate new briefing"}
          </button>
        </div>
      </div>

      {activeNotification && (
        <p className="p-3 rounded-lg border border-line bg-surface-2 text-sm text-text">{activeNotification}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editions */}
        <aside className="lg:col-span-3 lg:sticky lg:top-6 self-start rounded-xl border border-line bg-surface p-2">
          <h2 className="text-sm font-medium text-text px-3 pt-2 pb-2">Briefings</h2>
          <ul className="space-y-0.5">
            {editions.map(item => {
              const selected = selectedBriefingId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedBriefingId(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border-l-2 cursor-pointer ${
                      selected ? "bg-surface-2 border-brass" : "border-transparent hover:bg-surface-2/60"
                    }`}
                  >
                    <p className={`text-sm ${selected ? "font-medium text-text" : "text-text"}`}>{item.title}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {item.cadence} · {item.note}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Document */}
        <article className="lg:col-span-9 p-6 sm:p-8 rounded-xl border border-line bg-surface space-y-10">
          <header className="space-y-1.5 pb-6 border-b border-line">
            <p className="text-xs text-text-muted">{activeEdition.periodLabel}</p>
            <h2 className="text-2xl font-bold text-text">{activeEdition.title}</h2>
            <p className="text-sm text-text-muted">
              {industryName} · Prepared for {founderName}
            </p>
          </header>

          {/* Health */}
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <h3 className="text-base font-semibold text-text">Financial health</h3>
              <p className="text-sm text-text-muted">
                Score{" "}
                <span className="text-text font-medium">{isCurrent ? healthScore : activeEdition.healthScore}/100</span>
                {" · "}
                {activeEdition.healthLabel}
              </p>
            </div>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {metrics.map(m => (
                <div key={m.label} className="p-4 rounded-lg border border-line bg-surface-2/50">
                  <dt className="text-xs text-text-muted">{m.label}</dt>
                  <dd className="text-lg text-text mt-1.5">{m.value}</dd>
                  <p className="text-xs text-text-muted mt-0.5">{m.note}</p>
                </div>
              ))}
            </dl>
          </section>

          {/* Signals */}
          <section className="space-y-3">
            <h3 className="text-base font-semibold text-text">What happened</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeEdition.operationalSignals.map((signal, idx) => (
                <li key={idx} className="p-4 rounded-lg border border-line">
                  <p className="text-sm font-medium text-text">{signal.title}</p>
                  <p className="text-sm text-text-muted leading-relaxed mt-0.5">{signal.desc}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Risks and opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="space-y-3">
              <h3 className="text-base font-semibold text-text">Risks</h3>
              <ul className="space-y-3">
                {activeEdition.risks.map((risk, idx) => (
                  <li key={idx} className="p-4 rounded-lg border border-line">
                    <p className="text-sm font-medium text-text">
                      {risk.title}{" "}
                      <span className={`text-xs font-normal ${risk.severity === "High" ? "text-rust" : "text-text-muted"}`}>
                        · {risk.severity.toLowerCase()}
                      </span>
                    </p>
                    <p className="text-sm text-text-muted leading-relaxed mt-0.5">{risk.desc}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-3">
              <h3 className="text-base font-semibold text-text">Opportunities</h3>
              <ul className="space-y-3">
                {activeEdition.opportunities.map((opp, idx) => (
                  <li key={idx} className="p-4 rounded-lg border border-line">
                    <p className="text-sm font-medium text-text">
                      {opp.title} <span className="text-xs font-normal text-text-muted">· {opp.badge}</span>
                    </p>
                    <p className="text-sm text-text-muted leading-relaxed mt-0.5">{opp.desc}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Decisions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-semibold text-text">Decisions</h3>
                <p className="text-sm text-text-muted mt-0.5">
                  {pendingCount === 0 ? "Nothing waiting on you." : `${pendingCount} waiting for your decision.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDecisionOpen(true)}
                className="px-3.5 py-2 rounded-lg border border-line text-sm font-medium text-text hover:bg-surface-2 cursor-pointer"
              >
                Add decision
              </button>
            </div>

            <ul className="space-y-3">
              {displayDecisions.map(dec => {
                const isPending = dec.status === "pending";
                const isCustom = dec.id.startsWith("dec-") && !["dec-1", "dec-2", "dec-3", "dec-4"].includes(dec.id);
                return (
                  <li key={dec.id} className={`p-5 rounded-lg border border-line flex flex-col lg:flex-row lg:items-start justify-between gap-4 ${dec.status === "declined" ? "opacity-60" : ""}`}>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <p className="text-sm font-medium text-text">{dec.title}</p>
                      <p className="text-xs text-text-muted capitalize">
                        {dec.category} · {dec.aiConfidence}% confidence
                      </p>
                      <p className="text-sm text-text-muted leading-relaxed">{dec.recommendation}</p>
                      <p className="text-sm text-text pt-1">Impact: {dec.impact}</p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isPending ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDecisionAction(dec.id, "approved")}
                            className="px-3.5 py-1.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecisionAction(dec.id, "delegated", "CEO")}
                            className="px-3.5 py-1.5 rounded-lg border border-line text-sm text-text hover:bg-surface-2 cursor-pointer"
                          >
                            Delegate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDecisionAction(dec.id, "declined")}
                            className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text cursor-pointer"
                          >
                            Decline
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-text-muted">
                          {dec.status === "approved" && "Approved"}
                          {dec.status === "delegated" && `Delegated to ${dec.delegatedTo}`}
                          {dec.status === "declined" && "Declined"}
                          {" · "}
                          <button
                            type="button"
                            onClick={() => handleDecisionAction(dec.id, "pending")}
                            className="underline hover:text-text cursor-pointer"
                          >
                            Undo
                          </button>
                        </p>
                      )}
                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDecision(dec.id, dec.title)}
                          title="Delete"
                          aria-label="Delete decision"
                          className="p-1 rounded text-text-muted hover:text-rust cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </article>
      </div>

      {isAddDecisionOpen && (
        <PortalModal isOpen={isAddDecisionOpen} onClose={() => setIsAddDecisionOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-surface border border-line shadow-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-text">Add decision</h3>
              <button
                type="button"
                onClick={() => setIsAddDecisionOpen(false)}
                aria-label="Close"
                className="p-1 rounded-lg text-text-muted hover:text-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomDecision} className="space-y-4 text-sm">
              <div>
                <label className="font-medium text-text block mb-1">Decision</label>
                <input
                  type="text"
                  required
                  value={newDecTitle}
                  onChange={e => setNewDecTitle(e.target.value)}
                  placeholder="e.g. Approve Q4 sales hiring"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-text block mb-1">Category</label>
                  <select
                    value={newDecCategory}
                    onChange={e => setNewDecCategory(e.target.value as LeadershipDecision["category"])}
                    className={inputClass}
                  >
                    <option value="finance">Finance</option>
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                    <option value="talent">Talent</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-text block mb-1">Confidence (%)</label>
                  <input
                    type="number"
                    min={70}
                    max={99}
                    value={newDecConfidence}
                    onChange={e => setNewDecConfidence(Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-text block mb-1">Expected impact</label>
                <input
                  type="text"
                  value={newDecImpact}
                  onChange={e => setNewDecImpact(e.target.value)}
                  placeholder="e.g. +₹12,00,000 pipeline in 60 days"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="font-medium text-text block mb-1">Rationale</label>
                <textarea
                  rows={2}
                  value={newDecRecommendation}
                  onChange={e => setNewDecRecommendation(e.target.value)}
                  placeholder="Why this decision?"
                  className={inputClass}
                />
              </div>

              <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDecisionOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-text-muted hover:text-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-brass text-white font-medium hover:brightness-110 cursor-pointer"
                >
                  Add decision
                </button>
              </div>
            </form>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

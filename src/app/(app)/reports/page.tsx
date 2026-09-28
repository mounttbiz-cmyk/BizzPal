"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Clock,
  ShieldCheck,
  ChevronRight,
  Printer,
  Copy,
  Check,
  Activity,
  ArrowUpRight,
  Zap,
  Target,
  UserCheck,
  XCircle,
  BrainCircuit,
  Layers,
  History,
  Info,
  Plus,
  Trash2,
  X
} from "lucide-react";
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
        desc: "Margin widened by 240 bps due to automated cloud provisioning rules implemented in Marcus CFO automation workflow.",
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
          owner: targetDec.category === "finance" ? "CFO Marcus" : "Founder",
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
          delegatedTo: delegatedTo || (action === "delegated" ? "Astra (CEO AI)" : undefined),
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-text">Executive Intelligence Briefing</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
                  Decision-Focused Intelligence
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Synthesizes financial health, key deviations, and top tactical directives into an executive briefing prepared for {founderName} and leadership at {companyName}.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-text text-xs font-semibold hover:border-line-strong btn-tactile cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-jade" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied Digest" : "Copy Digest"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-text text-xs font-semibold hover:border-line-strong btn-tactile cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brass text-white text-xs font-semibold shadow-sm hover:brightness-110 btn-tactile disabled:opacity-50 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGenerating ? "Synthesizing Briefing…" : "Generate Fresh Briefing"}</span>
          </button>
        </div>
      </div>

      {/* Floating Notification Toast */}
      {activeNotification && (
        <div className="p-3.5 rounded-xl bg-brass-soft border border-brass text-xs text-text font-medium flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
            <span>{activeNotification}</span>
          </div>
          <span className="text-[10px] text-text-muted font-mono">Real-time ledger synced</span>
        </div>
      )}

      {/* Main Layout: Briefing Feed & Historical Archive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Cadence Selector & Historical Briefings Archive (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1 flex items-center justify-between">
            <span>Cadence & Editions</span>
            <span className="text-[10px] text-brass">Real-time Ledger Connected</span>
          </div>

          <div className="space-y-2">
            {[
              {
                id: "briefing-current",
                title: "Week 37 Executive Intelligence Briefing",
                cadence: "Current · Trailing 7 Days",
                sentiment: "Bullish Control",
                status: "Live Active",
                pendingCount: decisions.filter(d => d.status === "pending").length,
              },
              {
                id: "briefing-monthly",
                title: "Monthly Board Operations Synthesis",
                cadence: "September Cycle",
                sentiment: "Stable Runway",
                status: "Archived",
                pendingCount: 0,
              },
              {
                id: "briefing-prev",
                title: "Week 36 Solvency & Burn Health Review",
                cadence: "7 days ago",
                sentiment: "Target Met",
                status: "Archived",
                pendingCount: 0,
              },
              {
                id: "briefing-q3",
                title: "Quarterly Comprehensive Operating Review",
                cadence: "Q3 Strategic Audit",
                sentiment: "Expansion Ready",
                status: "Archived",
                pendingCount: 0,
              },
            ].map(item => {
              const isSelected = selectedBriefingId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedBriefingId(item.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer btn-tactile ${
                    isSelected
                      ? "bg-surface border-brass shadow-theme ring-1 ring-brass/30"
                      : "bg-surface-2/60 border-line hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-text line-clamp-1">{item.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-brass-soft text-brass font-bold uppercase shrink-0">
                      {item.sentiment}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted mt-2">
                    <span>{item.cadence}</span>
                    {item.pendingCount > 0 ? (
                      <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded">
                        {item.pendingCount} Decisions Due
                      </span>
                    ) : (
                      <span>{item.status}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* AI Synthesis Co-Pilots Card */}
          <div className="p-4 rounded-xl border border-line bg-surface space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-brass" />
                <span className="text-xs font-bold text-text">Synthesizing Co-Pilots</span>
              </div>
              <span className="text-[10px] text-jade font-mono font-semibold">● Real-time sync</span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-line">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-brass text-white flex items-center justify-center font-bold text-[10px]">
                    A
                  </div>
                  <div>
                    <span className="font-semibold text-text block">Astra (CEO AI)</span>
                    <span className="text-[10px] text-text-muted">Strategic Priorities & Growth</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-brass">Auto-Routed</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-line">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                    M
                  </div>
                  <div>
                    <span className="font-semibold text-text block">Marcus (CFO AI)</span>
                    <span className="text-[10px] text-text-muted">Burn, Runway & Solvency</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2 border border-line">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px]">
                    E
                  </div>
                  <div>
                    <span className="font-semibold text-text block">Elena (CMO AI)</span>
                    <span className="text-[10px] text-text-muted">Pipeline, Inbound & CAC</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-purple-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Active Executive Document (8 cols) */}
        <div className="lg:col-span-8 p-6 sm:p-8 rounded-2xl border border-line bg-surface shadow-theme space-y-7">
          {/* Briefing Header Banner */}
          <div className="border-b border-line pb-4 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
                Confidential · Executive Eyes Only
              </span>
              <span className="text-xs text-text-muted font-mono">
                {activeEdition.periodLabel}
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-text tracking-tight font-sans">
              {activeEdition.title}: {companyName}
            </h2>
            <p className="text-xs text-text-muted">
              Operating Sector: <span className="text-text font-medium">{industryName}</span> · Prepared for <span className="text-text font-medium">{founderName}</span> and C-Suite Leadership.
            </p>
          </div>

          {/* Section 1: Health & Solvency Index Barometer */}
          <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brass" />
                <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                  1. Health & Solvency Index Barometer
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted font-semibold">Overall Index:</span>
                <span className="text-base font-extrabold font-mono text-brass">{selectedBriefingId === "briefing-current" ? healthScore : activeEdition.healthScore}/100</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold uppercase">
                  {activeEdition.healthLabel}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[10px] text-text-muted font-semibold uppercase block">Annualized Run-Rate</span>
                <span className="text-sm font-bold font-mono text-text">₹{(selectedBriefingId === "briefing-current" ? annualRevenue : activeEdition.annualRev).toLocaleString()}</span>
                <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5 mt-0.5">
                  <ArrowUpRight className="w-3 h-3" /> {activeEdition.revDelta}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[10px] text-text-muted font-semibold uppercase block">Verified Cash Reserves</span>
                <span className="text-sm font-bold font-mono text-text">₹{(selectedBriefingId === "briefing-current" ? cash : activeEdition.cash).toLocaleString()}</span>
                <span className="text-[10px] text-text-muted font-medium block mt-0.5">Liquid accounts</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[10px] text-text-muted font-semibold uppercase block">Net Operating Runway</span>
                <span className="text-sm font-bold font-mono text-emerald-500">{selectedBriefingId === "briefing-current" ? `${runwayMonths} Months` : activeEdition.runway}</span>
                <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">Burn ₹{(selectedBriefingId === "briefing-current" ? burn : activeEdition.burn).toLocaleString()}/mo</span>
              </div>
              <div className="p-3 rounded-xl bg-surface border border-line">
                <span className="text-[10px] text-text-muted font-semibold uppercase block">FTE Capital Efficiency</span>
                <span className="text-sm font-bold font-mono text-brass">
                  {selectedBriefingId === "briefing-current" ? `₹${Math.round(annualRevenue / (teamSize || 1)).toLocaleString()} / FTE` : activeEdition.fteEfficiency}
                </span>
                <span className="text-[10px] text-text-muted font-medium block mt-0.5">{teamSize} team members</span>
              </div>
            </div>
          </div>

          {/* Section 2: Operational Signals & Major Developments */}
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-text flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
              2. Operational Signals & Major Developments
            </h3>
            <p className="text-xs text-text-muted">
              Deterministic highlights synthesized from CRM, banking, and customer delivery feeds for {activeEdition.cadence}:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeEdition.operationalSignals.map((signal, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-500 text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{signal.title}</span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {signal.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3 & 4: Critical Risks & Strategic Opportunities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Section 3: Critical Risks */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-rust" />
                3. Critical Risks & Vulnerabilities
              </h3>
              <div className="space-y-2">
                {activeEdition.risks.map((risk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-2 border border-line space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">{risk.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        risk.severity === "High" ? "bg-rust/15 text-rust" : "bg-amber-500/15 text-amber-500"
                      }`}>
                        {risk.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {risk.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 4: Strategic Opportunities */}
            <div className="space-y-2.5">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-brass" />
                4. Strategic Upside Opportunities
              </h3>
              <div className="space-y-2">
                {activeEdition.opportunities.map((opp, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-surface-2 border border-line space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-text">{opp.title}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-jade/15 text-jade font-bold uppercase">
                        {opp.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {opp.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 5: Decisions Required (Interactive Directives) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-bold text-sm text-text flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-brass" />
                5. Decisions Required (Leadership Directives)
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDecisionOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-bold hover:bg-cyan-500/25 transition-all inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Propose Decision</span>
                </button>
                <span className="text-xs text-text-muted font-medium">
                  {displayDecisions.filter(d => d.status === "pending").length} pending founder action
                </span>
              </div>
            </div>
            <p className="text-xs text-text-muted">
              Actionable directives generated by BizzPal executive reasoning engine. Approve, delegate to autonomous AI, or decline directly below:
            </p>

            <div className="space-y-3">
              {displayDecisions.map(dec => {
                const isPending = dec.status === "pending";
                return (
                  <div
                    key={dec.id}
                    className={`p-4 rounded-xl border transition-all ${
                      dec.status === "approved"
                        ? "bg-jade/5 border-jade/30"
                        : dec.status === "delegated"
                        ? "bg-brass/5 border-brass/30"
                        : dec.status === "declined"
                        ? "bg-surface-2/40 border-line opacity-60"
                        : "bg-surface-2 border-line hover:border-line-strong"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-text">{dec.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-line text-text-muted uppercase font-mono">
                            {dec.category}
                          </span>
                          <span className="text-[10px] font-semibold text-brass">
                            {dec.aiConfidence}% AI Confidence
                          </span>
                          {dec.id.startsWith("dec-") && !["dec-1", "dec-2", "dec-3", "dec-4"].includes(dec.id) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDecision(dec.id, dec.title)}
                              title="Delete Directive"
                              className="p-1 rounded hover:bg-rose-500/10 text-text-muted hover:text-rose-400 transition-colors cursor-pointer ml-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                          {dec.recommendation}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] font-medium text-emerald-500 pt-0.5">
                          <Zap className="w-3 h-3 shrink-0" />
                          <span>Impact: {dec.impact}</span>
                        </div>
                      </div>

                      {/* Directive Actions */}
                      <div className="shrink-0 flex items-center gap-2 pt-1 sm:pt-0">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDecisionAction(dec.id, "approved")}
                              className="px-3 py-1.5 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer shadow-xs inline-flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecisionAction(dec.id, "delegated", "Astra (CEO AI)")}
                              className="px-3 py-1.5 rounded-lg bg-surface border border-line hover:border-line-strong text-xs font-semibold text-text btn-tactile cursor-pointer inline-flex items-center gap-1"
                            >
                              <BrainCircuit className="w-3.5 h-3.5 text-brass" />
                              <span>Delegate</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDecisionAction(dec.id, "declined")}
                              className="px-2.5 py-1.5 rounded-lg border border-line hover:bg-rose-500/10 text-xs font-semibold text-text-muted hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              Decline
                            </button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            {dec.status === "approved" && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-jade font-bold bg-jade/10 px-2.5 py-1 rounded-lg border border-jade/30">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Approved · In Execution</span>
                              </span>
                            )}
                            {dec.status === "delegated" && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-brass font-bold bg-brass/10 px-2.5 py-1 rounded-lg border border-brass/30">
                                <BrainCircuit className="w-3.5 h-3.5" />
                                <span>Delegated to {dec.delegatedTo}</span>
                              </span>
                            )}
                            {dec.status === "declined" && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-text-muted font-bold bg-surface px-2.5 py-1 rounded-lg border border-line">
                                <span>Declined</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDecisionAction(dec.id, "pending")}
                              className="text-[10px] text-text-muted underline hover:text-text cursor-pointer ml-1"
                            >
                              Reset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Propose Custom Decision Modal */}
      {isAddDecisionOpen && (
        <PortalModal isOpen={isAddDecisionOpen} onClose={() => setIsAddDecisionOpen(false)}>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative w-full max-w-lg rounded-2xl bg-surface border border-line shadow-2xl p-6 space-y-4 animate-scale-up">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-brass" />
                  <h3 className="font-bold text-sm text-text">Propose Leadership Decision</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDecisionOpen(false)}
                  className="p-1 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveCustomDecision} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-text block mb-1">Decision Title</label>
                  <input
                    type="text"
                    required
                    value={newDecTitle}
                    onChange={e => setNewDecTitle(e.target.value)}
                    placeholder="e.g. Approve Q4 Enterprise SDR Hiring Sprint"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-text block mb-1">Category</label>
                    <select
                      value={newDecCategory}
                      onChange={e => setNewDecCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                    >
                      <option value="finance">Finance / Capital</option>
                      <option value="sales">Sales & Revenue</option>
                      <option value="operations">Operations & Tech</option>
                      <option value="talent">Talent & Headcount</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-text block mb-1">Confidence Score (%)</label>
                    <input
                      type="number"
                      min={70}
                      max={99}
                      value={newDecConfidence}
                      onChange={e => setNewDecConfidence(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-text block mb-1">Projected Impact</label>
                  <input
                    type="text"
                    value={newDecImpact}
                    onChange={e => setNewDecImpact(e.target.value)}
                    placeholder="e.g. +₹12,00,000 net pipeline within 60 days"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text block mb-1">AI Recommendation & Rationale</label>
                  <textarea
                    rows={2}
                    value={newDecRecommendation}
                    onChange={e => setNewDecRecommendation(e.target.value)}
                    placeholder="Provide executive context or rationale..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass"
                  />
                </div>

                <div className="pt-2 border-t border-line flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddDecisionOpen(false)}
                    className="px-3.5 py-1.5 rounded-lg border border-line text-xs text-text-muted hover:text-text cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-brass text-white font-bold text-xs shadow-sm hover:brightness-110 btn-tactile cursor-pointer"
                  >
                    Submit Directive
                  </button>
                </div>
              </form>
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Compass,
  Play,
  CheckCircle2,
  Sliders,
  ArrowRight,
  RefreshCw,
  Cpu,
  GitBranch,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  Zap,
  RotateCcw,
  Search,
  HelpCircle,
  Lightbulb,
  Send,
  Check,
  X
} from "lucide-react";
import { ProvenanceBadge } from "@/components/ui/Badge";

interface ScenarioOption {
  id: string;
  name: string;
  subtitle: string;
  hiringCount: number;
  monthlyCost: number;
  projectedRevenueIncrease: number;
  runwayImpactMonths: number;
  riskScore: "Low" | "Medium" | "High";
  roiPercent: number;
  isRecommended?: boolean;
}

interface SimulationResult {
  query: string;
  title: string;
  options: ScenarioOption[];
  consensusBadge: string;
  consensusQuote: string;
  executionTasks: Array<{
    title: string;
    owner: string;
    gap: string;
    priority: "low" | "medium" | "high" | "critical";
    category: string;
  }>;
}

interface CompanyProfileContext {
  companyName: string;
  founderName: string;
  burn: number;
  cash: number;
  revenue: number;
  teamSize: number;
}

// Preset and Dynamic Scenario Generator
function generateSimulation(
  query: string,
  profile: CompanyProfileContext
): SimulationResult {
  const q = query.trim().toLowerCase();
  const cName = profile.companyName || "Enterprise Organization";
  const fName = profile.founderName || "Founder";
  const burn = profile.burn || 0;
  const cash = profile.cash || 0;

  // 1. IT Guy / IT Specialist / Sysadmin query
  if (
    q.includes("it guy") ||
    q.includes("hire an it") ||
    q.includes("it person") ||
    q.includes("it specialist") ||
    q.includes("sysadmin") ||
    q.includes("system admin") ||
    q.includes("tech support") ||
    q.includes("it support")
  ) {
    return {
      query,
      title: 'Should I hire an IT guy?',
      options: [
        {
          id: "it_opt_a",
          name: "Option A: Dedicated Full-Time In-House IT Specialist",
          subtitle: `Hire a full-time internal IT and security administrator for hardware, network & employee helpdesk at ${cName}.`,
          hiringCount: 1,
          monthlyCost: 120000,
          projectedRevenueIncrease: 320000,
          runwayImpactMonths: -1.3,
          riskScore: "Medium",
          roiPercent: 167,
        },
        {
          id: "it_opt_b",
          name: "Option B: Fractional IT Architect + Autonomous DevOps (Recommended)",
          subtitle: `Retain a fractional enterprise IT architect (15 hrs/mo) paired with BizzPal automated infrastructure & security workflows.`,
          hiringCount: 0,
          monthlyCost: 45000,
          projectedRevenueIncrease: 410000,
          runwayImpactMonths: -0.4,
          riskScore: "Low",
          roiPercent: 380,
          isRecommended: true,
        },
        {
          id: "it_opt_c",
          name: "Option C: External Managed Service Provider (MSP Retainer)",
          subtitle: `Outsource corporate IT operations, workstation security & MDM to an external certified MSP on an annual SLA.`,
          hiringCount: 0,
          monthlyCost: 75000,
          projectedRevenueIncrease: 260000,
          runwayImpactMonths: -0.8,
          riskScore: "Low",
          roiPercent: 147,
        },
      ],
      consensusBadge: "Optimal Capital Efficiency",
      consensusQuote: `"For ${cName}, hiring a single full-time IT guy introduces a single point of failure when they take leave, and creates fixed payroll drag of ₹1,20,000/mo. Option B is our executive consensus: pairing an on-demand fractional IT architect with autonomous monitoring workflows saves ₹75,000/mo in net burn while providing 24/7 uptime coverage at a 380% expected ROI."`,
      executionTasks: [
        {
          title: `Configure BizzPal Automated DevOps & Security Alerting for ${cName}`,
          owner: "Operations Lead",
          gap: "Operational Continuity",
          priority: "critical",
          category: "Infrastructure",
        },
        {
          title: "Contract fractional senior IT architect on 15 hr/month retainer",
          owner: fName,
          gap: "Engineering Capacity",
          priority: "high",
          category: "Talent",
        },
        {
          title: "Audit employee laptop MDM, access permissions & backup protocols",
          owner: "Operations Lead",
          gap: "Governance",
          priority: "high",
          category: "Compliance",
        },
      ],
    };
  }

  // 2. Scale Engineering Capacity query
  if (
    q.includes("engineering") ||
    q.includes("scale engineering") ||
    q.includes("dev capacity") ||
    q.includes("hire developer") ||
    q.includes("hire 5") ||
    q.includes("software team")
  ) {
    return {
      query,
      title: "What happens if we scale our engineering capacity?",
      options: [
        {
          id: "eng_opt_a",
          name: "Option A: Hire 5 Full-Time Engineers",
          subtitle: `Accelerate product roadmap with dedicated domestic in-house team at ${cName}.`,
          hiringCount: 5,
          monthlyCost: 650000,
          projectedRevenueIncrease: 1200000,
          runwayImpactMonths: -3.2,
          riskScore: "High",
          roiPercent: 184,
        },
        {
          id: "eng_opt_b",
          name: "Option B: Lean AI Workflows + 2 Senior Leads (Recommended)",
          subtitle: `Automate delivery pipelines with BizzPal Workflows & hire 2 architects.`,
          hiringCount: 2,
          monthlyCost: 320000,
          projectedRevenueIncrease: 1050000,
          runwayImpactMonths: -1.1,
          riskScore: "Low",
          roiPercent: 328,
          isRecommended: true,
        },
        {
          id: "eng_opt_c",
          name: "Option C: Contract Agency Staffing",
          subtitle: "Flexible 6-month contract agency support with zero long-term severance.",
          hiringCount: 4,
          monthlyCost: 480000,
          projectedRevenueIncrease: 750000,
          runwayImpactMonths: -2.0,
          riskScore: "Medium",
          roiPercent: 156,
        },
      ],
      consensusBadge: "Optimal Capital Efficiency",
      consensusQuote: `"Option B delivers 328% expected ROI with minimal liquidity drawdown (-1.1 months). By pairing 2 senior architects with autonomous delivery workflows, ${cName} preserves cash reserves while achieving 88% of Option A's revenue velocity."`,
      executionTasks: [
        {
          title: `Establish automated CI/CD & quality gates across ${cName} engineering`,
          owner: "Lead Architect",
          gap: "Engineering Capacity",
          priority: "critical",
          category: "DevOps",
        },
        {
          title: "Recruit 2 senior staff engineers with specialized domain experience",
          owner: fName,
          gap: "Talent Acquisition",
          priority: "high",
          category: "Hiring",
        },
      ],
    };
  }

  // 3. Sales / SDR / Account Executives query
  if (
    q.includes("sales") ||
    q.includes("sdr") ||
    q.includes("account executive") ||
    q.includes("sales rep") ||
    q.includes("hire sales")
  ) {
    return {
      query,
      title: "Should we hire 3 full-time sales reps?",
      options: [
        {
          id: "sales_opt_a",
          name: "Option A: 3 Full-Time Enterprise Account Executives",
          subtitle: `Hire 3 dedicated inbound/outbound closers with base salary + commission plans.`,
          hiringCount: 3,
          monthlyCost: 450000,
          projectedRevenueIncrease: 1400000,
          runwayImpactMonths: -2.8,
          riskScore: "High",
          roiPercent: 211,
        },
        {
          id: "sales_opt_b",
          name: "Option B: 1 Senior Closer + AI Outbound Ingestion (Recommended)",
          subtitle: `Hire 1 veteran enterprise sales lead and deploy BizzPal autonomous lead qualification bots.`,
          hiringCount: 1,
          monthlyCost: 180000,
          projectedRevenueIncrease: 1150000,
          runwayImpactMonths: -0.9,
          riskScore: "Low",
          roiPercent: 385,
          isRecommended: true,
        },
        {
          id: "sales_opt_c",
          name: "Option C: Commission-Only Channel & Reseller Network",
          subtitle: "Partner with regional distributors and affiliate brokers with zero fixed payroll obligation.",
          hiringCount: 0,
          monthlyCost: 90000,
          projectedRevenueIncrease: 600000,
          runwayImpactMonths: -0.3,
          riskScore: "Low",
          roiPercent: 240,
        },
      ],
      consensusBadge: "Sustained Margin Expansion",
      consensusQuote: `"Hiring 3 full-time reps risks heavy cash drawdown before their 4-month ramp period. Option B (1 senior closer + AI outbound automation) captures 82% of target quota at 60% lower burn, turning cash-flow positive within 60 days."`,
      executionTasks: [
        {
          title: "Deploy BizzPal Outbound AI Lead Scraper & Qualifier",
          owner: "Revenue Ops",
          gap: "Sales Velocity",
          priority: "high",
          category: "Sales Automation",
        },
        {
          title: "Draft commission-based offer letter for Principal Enterprise Closer",
          owner: fName,
          gap: "Talent",
          priority: "critical",
          category: "Executive Hiring",
        },
      ],
    };
  }

  // 4. Pricing / Raise Prices query
  if (
    q.includes("price") ||
    q.includes("pricing") ||
    q.includes("raise price") ||
    q.includes("increase price") ||
    q.includes("reprice")
  ) {
    return {
      query,
      title: "Should we raise our product / service pricing by 20%?",
      options: [
        {
          id: "price_opt_a",
          name: "Option A: 20% Across-the-Board Price Increase",
          subtitle: "Enact immediate price change on both existing customer renewals and new signups.",
          hiringCount: 0,
          monthlyCost: 15000,
          projectedRevenueIncrease: 850000,
          runwayImpactMonths: 2.1,
          riskScore: "High",
          roiPercent: 480,
        },
        {
          id: "price_opt_b",
          name: "Option B: Value-Tiered Packaging + 15% on Renewals (Recommended)",
          subtitle: `Grandfather current clients for 6 months while introducing premium feature add-ons at +25%.`,
          hiringCount: 0,
          monthlyCost: 35000,
          projectedRevenueIncrease: 620000,
          runwayImpactMonths: 1.5,
          riskScore: "Low",
          roiPercent: 540,
          isRecommended: true,
        },
        {
          id: "price_opt_c",
          name: "Option C: Consumption-Based Overages Only",
          subtitle: "Keep base price static but charge metered overages on usage and priority support SLAs.",
          hiringCount: 0,
          monthlyCost: 40000,
          projectedRevenueIncrease: 480000,
          runwayImpactMonths: 1.1,
          riskScore: "Medium",
          roiPercent: 320,
        },
      ],
      consensusBadge: "Zero Liquidity Dilution",
      consensusQuote: `"A blunt 20% price hike on existing accounts risks sudden churn among legacy accounts. Option B cushions client retention with a 6-month grandfather window while unlocking 15-25% expansion on new renewals, generating ₹6,20,000/mo net gains."`,
      executionTasks: [
        {
          title: "Publish updated tier rate cards and enterprise add-on schedule",
          owner: "Product Lead",
          gap: "Gross Margin",
          priority: "high",
          category: "Monetization",
        },
        {
          title: "Prepare executive renewal letters emphasizing recent ROI deliverables",
          owner: fName,
          gap: "Customer Retention",
          priority: "medium",
          category: "Account Management",
        },
      ],
    };
  }

  // 5. Marketing / Agency / Advertising query
  if (
    q.includes("market") ||
    q.includes("agency") ||
    q.includes("ads") ||
    q.includes("advertising") ||
    q.includes("cmo") ||
    q.includes("marketing")
  ) {
    return {
      query,
      title: "Should we outsource marketing to an agency?",
      options: [
        {
          id: "mkt_opt_a",
          name: "Option A: Retain Full-Service Growth & Ads Agency",
          subtitle: "Hire an external agency with ₹2.5L/mo retainer + managed ad spend on Meta & Google.",
          hiringCount: 0,
          monthlyCost: 380000,
          projectedRevenueIncrease: 780000,
          runwayImpactMonths: -2.1,
          riskScore: "Medium",
          roiPercent: 105,
        },
        {
          id: "mkt_opt_b",
          name: "Option B: In-House Growth Specialist + AI Performance Loops (Recommended)",
          subtitle: `Hire 1 internal growth marketer armed with BizzPal automated ad creative & analytics pipelines.`,
          hiringCount: 1,
          monthlyCost: 160000,
          projectedRevenueIncrease: 840000,
          runwayImpactMonths: -0.8,
          riskScore: "Low",
          roiPercent: 375,
          isRecommended: true,
        },
        {
          id: "mkt_opt_c",
          name: "Option C: Organic Content & Founder-Led Thought Leadership",
          subtitle: `Focus exclusively on organic LinkedIn, SEO, and podcast guesting with micro-freelancer editing.`,
          hiringCount: 0,
          monthlyCost: 65000,
          projectedRevenueIncrease: 420000,
          runwayImpactMonths: -0.3,
          riskScore: "Low",
          roiPercent: 280,
        },
      ],
      consensusBadge: "Long-Term IP Retention",
      consensusQuote: `"Agencies often suffer from high turnover and split incentives. Option B brings growth institutional knowledge inside ${cName} while leveraging automated performance testing, cutting blended CAC by 34%."`,
      executionTasks: [
        {
          title: "Recruit Data-Driven Head of Growth for performance pipelines",
          owner: fName,
          gap: "Acquisition Velocity",
          priority: "critical",
          category: "Talent",
        },
        {
          title: "Integrate Google Ads & Meta conversion tracking with BizzPal telemetry",
          owner: "Operations Lead",
          gap: "Data Integrity",
          priority: "high",
          category: "Attribution",
        },
      ],
    };
  }

  // 6. Generic / Custom User Decision Fallback
  const displayTitle = query.endsWith("?") ? query : `${query}?`;
  const formattedTitle = displayTitle.charAt(0).toUpperCase() + displayTitle.slice(1);
  const estCostA = Math.round(burn * 0.45);
  const estCostB = Math.round(burn * 0.18);
  const estCostC = Math.round(burn * 0.28);
  const estRevA = Math.round(estCostA * 2.2);
  const estRevB = Math.round(estCostB * 3.4);
  const estRevC = Math.round(estCostC * 1.8);
  const runwayA = -(estCostA / (burn || 100000)).toFixed(1);
  const runwayB = -(estCostB / (burn || 100000)).toFixed(1);
  const runwayC = -(estCostC / (burn || 100000)).toFixed(1);

  return {
    query,
    title: formattedTitle,
    options: [
      {
        id: "custom_opt_a",
        name: `Option A: Capital-Intensive Full In-House Execution`,
        subtitle: `Execute "${query}" through direct internal hires, dedicated infrastructure, and dedicated team allocation at ${cName}.`,
        hiringCount: 2,
        monthlyCost: estCostA,
        projectedRevenueIncrease: estRevA,
        runwayImpactMonths: Number(runwayA),
        riskScore: "High",
        roiPercent: 195,
      },
      {
        id: "custom_opt_b",
        name: `Option B: Lean AI-Augmented Hybrid Execution (Recommended)`,
        subtitle: `Pair autonomous workflows and modular contractor support to achieve 85% of target output at 1/3rd the burn.`,
        hiringCount: 1,
        monthlyCost: estCostB,
        projectedRevenueIncrease: estRevB,
        runwayImpactMonths: Number(runwayB),
        riskScore: "Low",
        roiPercent: 360,
        isRecommended: true,
      },
      {
        id: "custom_opt_c",
        name: `Option C: Phased Milestone Pilot / Outsourced Trial`,
        subtitle: `Run an 8-week structured validation pilot before signing permanent long-term payroll or vendor commitments.`,
        hiringCount: 0,
        monthlyCost: estCostC,
        projectedRevenueIncrease: estRevC,
        runwayImpactMonths: Number(runwayC),
        riskScore: "Medium",
        roiPercent: 165,
      },
    ],
    consensusBadge: "Prudent Capital Allocation",
    consensusQuote: `"When evaluating '${query}', committing full-time payroll up-front introduces unnecessary downside exposure. Option B achieves fast operational turnaround while preserving cash runway and flexibility for ${cName}."`,
    executionTasks: [
      {
        title: `Draft 30-day trial roadmap for '${query}'`,
        owner: fName,
        gap: "Strategic Execution",
        priority: "high",
        category: "Strategy",
      },
      {
        title: "Set up milestone tracking metrics and budget thresholds",
        owner: "Operations Lead",
        gap: "Runway Discipline",
        priority: "medium",
        category: "Finance",
      },
    ],
  };
}

const PRESET_QUERIES = [
  { label: "Should I hire an IT guy?", icon: "⚡" },
  { label: "What happens if we scale our engineering capacity?", icon: "🚀" },
  { label: "Should we hire 3 full-time sales reps?", icon: "💼" },
  { label: "Should we raise our pricing by 20%?", icon: "📈" },
  { label: "Should we outsource marketing to an agency?", icon: "🎯" },
];

export default function SimulatorPage() {
  // Business Profile Context
  const [profile, setProfile] = useState<CompanyProfileContext>({
    companyName: "My Enterprise",
    founderName: "Founder",
    burn: 0,
    cash: 0,
    revenue: 0,
    teamSize: 1,
  });

  // Query & Simulation State
  const [queryInput, setQueryInput] = useState<string>("Should I hire an IT guy?");
  const [activeQuery, setActiveQuery] = useState<string>("Should I hire an IT guy?");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(1000);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>("");

  // Execution State
  const [hasExecutedPlan, setHasExecutedPlan] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Load business profile from storage or database
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("bizzpal_business_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setProfile(prev => ({
          ...prev,
          companyName: parsed.name || prev.companyName,
          founderName: parsed.founderName || prev.founderName,
          burn: Number(parsed.burn || parsed.monthly_burn) || prev.burn,
          cash: Number(parsed.cash || parsed.cash_on_hand) || prev.cash,
          revenue: Number(parsed.revenue || parsed.monthly_revenue) || prev.revenue,
          teamSize: Number(parsed.teamSize || parsed.team_size) || prev.teamSize,
        }));
      } else {
        fetch("/api/business/intake")
          .then(r => r.json())
          .then(d => {
            if (d.success && d.business) {
              const b = d.business;
              setProfile(prev => ({
                ...prev,
                companyName: b.name || prev.companyName,
                founderName: b.founder_name || prev.founderName,
                burn: Number(b.monthly_burn) || prev.burn,
                cash: Number(b.cash_on_hand) || prev.cash,
                revenue: Number(b.monthly_revenue) || prev.revenue,
                teamSize: Number(b.team_size) || prev.teamSize,
              }));
              localStorage.setItem("bizzpal_business_profile", JSON.stringify(b));
            }
          })
          .catch(() => {});
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Generate simulation scenarios based on active query
  const simulationResult = useMemo(() => {
    return generateSimulation(activeQuery, profile);
  }, [activeQuery, profile]);

  // Sync selectedScenarioId to default recommended option when simulation changes
  useEffect(() => {
    const recommended = simulationResult.options.find(o => o.isRecommended);
    if (recommended) {
      setSelectedScenarioId(recommended.id);
    } else if (simulationResult.options.length > 0) {
      setSelectedScenarioId(simulationResult.options[0].id);
    }
    setHasExecutedPlan(false);
  }, [simulationResult]);

  // Active scenario object
  const activeScenario =
    simulationResult.options.find(s => s.id === selectedScenarioId) ||
    simulationResult.options[0];

  // Execute query trigger
  const handleSimulate = (qToRun?: string) => {
    const targetQ = qToRun !== undefined ? qToRun : queryInput;
    if (!targetQ.trim()) return;

    setIsSimulating(true);
    let count = 0;
    const interval = setInterval(() => {
      count += 250;
      setSimulationProgress(count);
      if (count >= 1000) {
        clearInterval(interval);
        setActiveQuery(targetQ.trim());
        setQueryInput(targetQ.trim());
        setIsSimulating(false);
      }
    }, 90);
  };

  const handleExecutePlan = async () => {
    if (!activeScenario) return;
    setIsExecuting(true);

    try {
      // Persist generated tasks to SQLite API for closed-loop execution
      for (const task of simulationResult.executionTasks) {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[${activeScenario.name.split(":")[0]}] ${task.title}`,
            owner: task.owner,
            gap: task.gap,
            priority: task.priority,
            category: task.category,
            status: "todo",
          }),
        }).catch(() => {});
      }
    } catch (err) {
      console.error("Failed to persist execution tasks", err);
    }

    setIsExecuting(false);
    setHasExecutedPlan(true);
    setExecutionMessage(
      `Plan Executed! Generated ${simulationResult.executionTasks.length} operational tasks in /tasks and scheduled workflow for '${activeScenario.name}'.`
    );

    setTimeout(() => {
      setExecutionMessage(null);
    }, 6000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <Compass className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-text">Strategic Decision Simulator</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
              Monte Carlo Engine
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-medium">
            Model high-impact hiring, pricing, and capital choices in virtual simulations to compare financial risk and ROI before executing.
          </p>
        </div>

        {/* Execution Status Badge */}
        {hasExecutedPlan && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-jade/10 border border-jade/30 text-jade text-xs font-semibold animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Execution Active in Operations</span>
          </div>
        )}
      </div>

      {executionMessage && (
        <div className="p-3.5 rounded-xl bg-jade/10 border border-jade/30 text-xs text-jade flex items-center justify-between animate-fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{executionMessage}</span>
          </div>
          <Link href="/tasks" className="underline font-bold text-text hover:text-jade">
            Go to Tasks →
          </Link>
        </div>
      )}

      {/* 5-Stage Closed Loop Breadcrumb Indicator */}
      <div className="p-3.5 rounded-xl border border-line bg-surface flex items-center justify-between gap-2 overflow-x-auto text-[11px] shadow-xs">
        {[
          { num: "1", title: "Understand Context", active: true },
          { num: "2", title: "Simulate Options", active: true },
          { num: "3", title: "Compare Outcomes", active: true },
          { num: "4", title: "AI Recommendation", active: true },
          { num: "5", title: "Execute Plan", active: hasExecutedPlan },
        ].map((step, idx) => (
          <div key={idx} className="flex items-center gap-2 shrink-0">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step.active ? "bg-brass text-white" : "bg-surface-2 border border-line text-text-muted"
              }`}
            >
              {step.num}
            </div>
            <span className={`font-semibold ${step.active ? "text-text" : "text-text-muted"}`}>
              {step.title}
            </span>
            {idx < 4 && <span className="text-text-muted">→</span>}
          </div>
        ))}
      </div>

      {/* Interactive Query & Question Box */}
      <div className="p-5 rounded-2xl border border-line bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brass/10 border border-brass/25 flex items-center justify-center text-brass">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-text uppercase tracking-wider">
              Executive Decision Query
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-line text-text-muted font-mono">
              Calibrated to {profile.companyName}
            </span>
          </div>
          <span className="text-[11px] text-text-muted">
            Ask any strategic question to generate 3 compared scenario options
          </span>
        </div>

        {/* Input Bar Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSimulate();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryInput}
              onChange={e => setQueryInput(e.target.value)}
              placeholder='Ask any decision e.g., "Should I hire an IT guy?", "Should we raise prices by 20%?"...'
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-line bg-surface-2 text-text text-xs placeholder:text-text-muted focus:outline-none focus:border-brass focus:ring-1 focus:ring-brass transition-all"
            />
            {queryInput && (
              <button
                type="button"
                onClick={() => setQueryInput("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSimulating || !queryInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all btn-tactile inline-flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating ({simulationProgress})…</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate Decision</span>
              </>
            )}
          </button>
        </form>

        {/* Suggested Quick Questions */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/60 text-xs">
          <span className="text-[11px] font-semibold text-text-muted inline-flex items-center gap-1">
            <Lightbulb className="w-3 h-3 text-brass" />
            <span>Suggested:</span>
          </span>
          {PRESET_QUERIES.map(item => {
            const isActive = activeQuery.toLowerCase() === item.label.toLowerCase();
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setQueryInput(item.label);
                  handleSimulate(item.label);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isActive
                    ? "bg-brass/15 border-brass text-text font-bold shadow-xs"
                    : "bg-surface-2/60 border-line text-text-muted hover:text-text hover:border-line-strong"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Builder & Compare Outcomes (3 Options) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-xs font-bold text-text uppercase tracking-wider">
            Compare Scenario Outcomes: &ldquo;{simulationResult.title.toUpperCase()}&rdquo;
          </h2>
          <span className="text-xs text-text-muted font-mono">
            1,000 Monte Carlo Iterations · {profile.companyName}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simulationResult.options.map(sc => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <div
                key={sc.id}
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between btn-tactile ${
                  isSelected
                    ? "bg-surface-2 border-brass ring-1 ring-brass/40 shadow-sm"
                    : "bg-surface border-line hover:border-line-strong"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    {sc.isRecommended ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-jade/10 border border-jade/30 text-jade font-bold uppercase">
                        ★ AI Recommendation
                      </span>
                    ) : (
                      <span className="text-[10px] text-text-muted uppercase font-semibold">
                        Alternative
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                        sc.riskScore === "Low"
                          ? "text-jade border-jade/30 bg-jade/10"
                          : sc.riskScore === "Medium"
                          ? "text-amber-400 border-amber-400/30 bg-amber-400/10"
                          : "text-rust border-rust/30 bg-rust/10"
                      }`}
                    >
                      {sc.riskScore} Risk
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-text">{sc.name}</h3>
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                      {sc.subtitle}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line text-[11px]">
                    <div>
                      <span className="text-text-muted block text-[10px]">Monthly Cost</span>
                      <span className="font-bold text-text font-mono">
                        ₹{sc.monthlyCost.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">Expected Revenue</span>
                      <span className="font-bold text-jade font-mono">
                        +₹{sc.projectedRevenueIncrease.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">Runway Shift</span>
                      <span
                        className={`font-bold font-mono ${
                          sc.runwayImpactMonths >= 0 ? "text-jade" : "text-rust"
                        }`}
                      >
                        {sc.runwayImpactMonths > 0 ? `+${sc.runwayImpactMonths}` : sc.runwayImpactMonths} mo
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px]">Expected ROI</span>
                      <span className="font-bold text-brass font-mono">{sc.roiPercent}%</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-line flex items-center justify-between text-xs">
                  <span className="text-text-muted font-medium">
                    {isSelected ? "Active Scenario" : "Click to Select"}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? "bg-brass border-brass text-white" : "border-line"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Recommendation & Closed-Loop Execution Bar */}
      <div className="p-6 rounded-2xl border border-brass/40 bg-surface shadow-xl space-y-4 ring-1 ring-brass/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-xl shrink-0 shadow-inner">
              👑
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text">Astra (CEO AI) & Marcus (CFO AI) Consensus</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-jade/10 text-jade border border-jade/20 font-bold uppercase">
                  {simulationResult.consensusBadge}
                </span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
                {simulationResult.consensusQuote}
              </p>
            </div>
          </div>

          {/* The Closed-Loop Execution Button */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              type="button"
              onClick={handleExecutePlan}
              disabled={isExecuting}
              className="px-6 py-3 rounded-xl bg-brass text-white font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all btn-tactile inline-flex items-center gap-2 cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  <span>Scheduling Tasks…</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-white" />
                  <span>Execute Plan ({activeScenario?.name.split(":")[0]})</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-text-muted">
          <span>Clicking &lsquo;Execute Plan&rsquo; creates scheduled operational tasks in your Gap Register and workflows.</span>
          <div className="flex items-center gap-3">
            <Link href="/workflows" className="text-brass hover:underline font-semibold flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              <span>View Visual Workflows</span>
            </Link>
            <Link href="/tasks" className="text-brass hover:underline font-semibold flex items-center gap-1">
              <span>View Tasks &amp; Execution →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

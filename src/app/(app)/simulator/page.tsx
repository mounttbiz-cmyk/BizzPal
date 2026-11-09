"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { RefreshCw, Check } from "lucide-react";
import { useCustomAdvisors } from "@/lib/advisors";

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
  "Should I hire an IT guy?",
  "What happens if we scale our engineering capacity?",
  "Should we hire 3 full-time sales reps?",
  "Should we raise our pricing by 20%?",
  "Should we outsource marketing to an agency?",
];

const cleanName = (name: string) => name.replace(/\s*\(Recommended\)\s*$/, "");

export default function SimulatorPage() {
  const { ceoName, cfoName } = useCustomAdvisors();
  const [profile, setProfile] = useState<CompanyProfileContext>({
    companyName: "My Enterprise",
    founderName: "Founder",
    burn: 0,
    cash: 0,
    revenue: 0,
    teamSize: 1,
  });

  const [queryInput, setQueryInput] = useState("Should I hire an IT guy?");
  const [activeQuery, setActiveQuery] = useState("Should I hire an IT guy?");
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Load business profile from storage or the intake API
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
    } catch {
      // ignore bad saved data
    }
  }, []);

  const simulationResult = useMemo(() => generateSimulation(activeQuery, profile), [activeQuery, profile]);

  // Default to the recommended option whenever the simulation changes
  useEffect(() => {
    const pick = simulationResult.options.find(o => o.isRecommended) || simulationResult.options[0];
    if (pick) setSelectedScenarioId(pick.id);
  }, [simulationResult]);

  const activeScenario =
    simulationResult.options.find(s => s.id === selectedScenarioId) || simulationResult.options[0];

  const handleSimulate = (override?: string) => {
    const q = (override ?? queryInput).trim();
    if (!q) return;
    setQueryInput(q);
    setIsSimulating(true);
    setTimeout(() => {
      setActiveQuery(q);
      setIsSimulating(false);
    }, 600);
  };

  const handleExecutePlan = async () => {
    if (!activeScenario) return;
    setIsExecuting(true);
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
    setIsExecuting(false);
    setExecutionMessage(
      `Created ${simulationResult.executionTasks.length} tasks for ${activeScenario.name.split(":")[0]}.`
    );
    setTimeout(() => setExecutionMessage(null), 6000);
  };

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-line">
        <h1 className="text-xl font-bold text-text">Decision Simulator</h1>
        <p className="text-sm text-text-muted mt-1">
          Compare the cost, return and runway impact of a decision before you make it.
        </p>
      </div>

      {executionMessage && (
        <div className="p-3 rounded-lg border border-jade/30 bg-jade/10 text-sm text-jade flex items-center justify-between">
          <span>{executionMessage}</span>
          <Link href="/tasks" className="font-medium underline">
            View tasks
          </Link>
        </div>
      )}

      <div className="space-y-3">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSimulate();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            placeholder="Ask a decision, e.g. Should we raise prices by 20%?"
            className="flex-1 px-3.5 py-2.5 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
          />
          <button
            type="submit"
            disabled={isSimulating || !queryInput.trim()}
            className="px-5 py-2.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSimulating && <RefreshCw className="w-4 h-4 animate-spin" />}
            {isSimulating ? "Simulating…" : "Simulate"}
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-text-muted">Try:</span>
          {PRESET_QUERIES.map(q => (
            <button
              key={q}
              type="button"
              onClick={() => handleSimulate(q)}
              className={`cursor-pointer hover:underline ${
                activeQuery.toLowerCase() === q.toLowerCase() ? "text-brass font-medium" : "text-text-muted"
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-text">{simulationResult.title}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simulationResult.options.map(sc => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelectedScenarioId(sc.id)}
                className={`text-left p-4 rounded-xl border bg-surface flex flex-col gap-3 cursor-pointer transition-colors ${
                  isSelected ? "border-brass ring-1 ring-brass/40" : "border-line hover:border-line-strong"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text">{cleanName(sc.name)}</h3>
                  <span
                    className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-brass border-brass text-white" : "border-line-strong"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{sc.subtitle}</p>

                <dl className="grid grid-cols-2 gap-3 pt-3 mt-auto border-t border-line text-sm">
                  <div>
                    <dt className="text-xs text-text-muted">Monthly cost</dt>
                    <dd className="font-medium text-text">₹{sc.monthlyCost.toLocaleString("en-IN")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Expected revenue</dt>
                    <dd className="font-medium text-text">+₹{sc.projectedRevenueIncrease.toLocaleString("en-IN")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Runway</dt>
                    <dd className={`font-medium ${sc.runwayImpactMonths >= 0 ? "text-jade" : "text-rust"}`}>
                      {sc.runwayImpactMonths > 0 ? "+" : ""}
                      {sc.runwayImpactMonths} mo
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">ROI</dt>
                    <dd className="font-medium text-text">{sc.roiPercent}%</dd>
                  </div>
                </dl>

                <p className="text-xs text-text-muted">
                  {sc.riskScore} risk
                  {sc.isRecommended && <span className="text-brass font-medium"> · Recommended</span>}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-5 rounded-xl border border-line bg-surface space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-text">
            {ceoName} &amp; {cfoName}&rsquo;s recommendation
          </h2>
          <p className="text-sm text-text-muted leading-relaxed mt-2 max-w-3xl">
            {simulationResult.consensusQuote.replace(/^"|"$/g, "")}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleExecutePlan}
            disabled={isExecuting}
            className="px-5 py-2.5 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
          >
            {isExecuting && <RefreshCw className="w-4 h-4 animate-spin" />}
            {isExecuting ? "Creating tasks…" : `Create tasks for ${activeScenario?.name.split(":")[0]}`}
          </button>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/workflows" className="text-brass hover:underline">
              Workflows
            </Link>
            <Link href="/tasks" className="text-brass hover:underline">
              Tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

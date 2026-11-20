"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bot, ArrowRight, Lock, Activity, X } from "lucide-react";
import { Suspense } from "react";
import { createPortal } from "react-dom";
import { useCustomAdvisors } from "@/lib/advisors";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { usePlanAccess } from "@/lib/hooks/usePlanAccess";
import { UpgradeModal } from "@/components/shell/UpgradeModal";

// Format numbers using Indian comma numbering (e.g. 12,00,000 / 3,00,000)
const formatINR = (val: string | number): string => {
  if (val === "" || val === null || val === undefined) return "";
  const clean = String(val).replace(/[^\d]/g, "");
  if (!clean) return "";
  const num = Number(clean);
  if (isNaN(num)) return "";
  return num.toLocaleString("en-IN");
};

const parseINR = (val: string): string => {
  return val.replace(/[^\d]/g, "");
};

interface BusinessTool {
  id: string;
  name: string;
  category: "finance" | "sales" | "marketing" | "operations" | "strategy";
  description: string;
  requiredPlan: "free" | "starter" | "growth" | "enterprise";
  badge: string;
  hasInteractiveCalculator?: boolean;
}

const TOOLS_CATALOG: BusinessTool[] = [
  // Finance Tools
  {
    id: "profit",
    name: "Profit Calculator",
    category: "finance",
    description: "Calculate gross, operating, and net margins with loaded Indian payroll & overheads.",
    requiredPlan: "starter",
    badge: "Unit Economics",
    hasInteractiveCalculator: true,
  },
  {
    id: "cashflow",
    name: "Cash Flow Forecast",
    category: "finance",
    description: "Multi-month forward cash projections incorporating collections, net burn, and tax outlays.",
    requiredPlan: "growth",
    badge: "Runway Guard",
    hasInteractiveCalculator: true,
  },
  {
    id: "breakeven",
    name: "Break-Even Calculator",
    category: "finance",
    description: "Determine exact monthly transaction volume and revenue required to reach zero net burn.",
    requiredPlan: "starter",
    badge: "Solvency",
    hasInteractiveCalculator: true,
  },
  {
    id: "pricing",
    name: "Pricing Simulator",
    category: "finance",
    description: "Model tiered packaging, discounting thresholds, and margin impacts on Indian buyers.",
    requiredPlan: "growth",
    badge: "Revenue Ops",
  },
  {
    id: "roi",
    name: "ROI Calculator",
    category: "finance",
    description: "Evaluate software licenses, capital expenditure, and vendor investments payback periods.",
    requiredPlan: "starter",
    badge: "Capital Efficiency",
    hasInteractiveCalculator: true,
  },
  {
    id: "budget",
    name: "Budget Planner",
    category: "finance",
    description: "Departmental allocation limits across engineering, marketing, sales, and administration.",
    requiredPlan: "growth",
    badge: "Allocation",
  },
  {
    id: "emi",
    name: "Business Loan & Equipment EMI Calculator",
    category: "finance",
    description: "Calculate commercial loan EMIs, interest outlays, amortization schedules, and monthly debt-burn impact.",
    requiredPlan: "starter",
    badge: "Debt & Financing",
    hasInteractiveCalculator: true,
  },
  {
    id: "gst",
    name: "GST & Tax Offset Calculator",
    category: "finance",
    description: "Calculate forward/reverse GST amounts, CGST+SGST vs IGST split, and net Input Tax Credit (ITC) balance.",
    requiredPlan: "starter",
    badge: "Tax Compliance",
    hasInteractiveCalculator: true,
  },
  {
    id: "working_capital",
    name: "Working Capital & Cash Cycle (CCC) Calculator",
    category: "finance",
    description: "Measure Days Sales Outstanding (DSO), Inventory (DIO), and Payables (DPO) to unlock trapped cash.",
    requiredPlan: "growth",
    badge: "Liquidity Velocity",
    hasInteractiveCalculator: true,
  },

  // Sales Tools
  {
    id: "sales_forecast",
    name: "Sales Forecast",
    category: "sales",
    description: "Weighted pipeline forecasting by deal stage, historical velocity, and deal probabilities.",
    requiredPlan: "starter",
    badge: "Pipeline",
  },
  {
    id: "lead_scoring",
    name: "Lead Scoring Matrix",
    category: "sales",
    description: "Algorithmic ICP fit and engagement scoring to prioritize high-value inbound prospects.",
    requiredPlan: "growth",
    badge: "Conversion",
    hasInteractiveCalculator: true,
  },
  {
    id: "pipeline",
    name: "Pipeline Analyzer",
    category: "sales",
    description: "Detect deal slippage, stage bottlenecks, and sales cycle deceleration across reps.",
    requiredPlan: "starter",
    badge: "Velocity",
  },
  {
    id: "deal_simulator",
    name: "Deal Simulator",
    category: "sales",
    description: "Simulate multi-year enterprise contracts, SLA guarantees, and payment milestones.",
    requiredPlan: "growth",
    badge: "Enterprise",
  },
  {
    id: "ltv",
    name: "Customer Lifetime Value (LTV)",
    category: "sales",
    description: "Cohort retention modeling, expansion revenue, and gross margin-adjusted customer value.",
    requiredPlan: "starter",
    badge: "Retention",
    hasInteractiveCalculator: true,
  },
  {
    id: "discount_margin",
    name: "Discount & Margin Sensitivity Calculator",
    category: "sales",
    description: "Analyze how contract discounting erodes gross profit and calculate the extra volume required to break even.",
    requiredPlan: "starter",
    badge: "Margin Defense",
    hasInteractiveCalculator: true,
  },
  {
    id: "nrr",
    name: "Net Revenue Retention (NRR) & Churn Calculator",
    category: "sales",
    description: "Model gross vs net revenue retention, logo vs expansion churn, and forward ARR impact.",
    requiredPlan: "growth",
    badge: "Retention Ops",
    hasInteractiveCalculator: true,
  },

  // Marketing Tools
  {
    id: "campaign",
    name: "Campaign Analyzer",
    category: "marketing",
    description: "Performance diagnostics across Google, LinkedIn, Meta, and organic content pipelines.",
    requiredPlan: "starter",
    badge: "Attribution",
  },
  {
    id: "cac",
    name: "CAC Calculator",
    category: "marketing",
    description: "Calculate fully loaded Customer Acquisition Cost including team salaries and tools.",
    requiredPlan: "starter",
    badge: "Acquisition",
    hasInteractiveCalculator: true,
  },
  {
    id: "roas",
    name: "ROAS Calculator",
    category: "marketing",
    description: "Direct return on ad spend versus organic pipeline contribution and payback cycles.",
    requiredPlan: "starter",
    badge: "Ad Efficiency",
    hasInteractiveCalculator: true,
  },
  {
    id: "marketing_forecast",
    name: "Marketing Forecast",
    category: "marketing",
    description: "Predict MQL and SQL generation curves based on current budget allocation scenarios.",
    requiredPlan: "growth",
    badge: "Demand Gen",
  },
  {
    id: "competitor",
    name: "Competitor Analyzer",
    category: "marketing",
    description: "Evaluate competitor positioning, feature parity, pricing gaps, and keyword capture.",
    requiredPlan: "growth",
    badge: "Market Intel",
  },

  // Operations Tools
  {
    id: "capacity",
    name: "Capacity Planner",
    category: "operations",
    description: "Evaluate team bandwidth, billable utilization rates, and operational strain thresholds.",
    requiredPlan: "growth",
    badge: "Fulfillment",
    hasInteractiveCalculator: true,
  },
  {
    id: "inventory",
    name: "Inventory Simulator",
    category: "operations",
    description: "Holding cost, re-order trigger levels, and working capital cash lockup simulations.",
    requiredPlan: "growth",
    badge: "Supply Chain",
  },
  {
    id: "workforce",
    name: "Workforce Planner",
    category: "operations",
    description: "FTE capacity modeling against annual growth targets and onboarding ramp lags.",
    requiredPlan: "growth",
    badge: "Staffing",
  },
  {
    id: "process",
    name: "Process Analyzer",
    category: "operations",
    description: "Map end-to-end client delivery workflows to pinpoint handoff friction and delays.",
    requiredPlan: "enterprise",
    badge: "SLA Guard",
  },
  {
    id: "loaded_cost",
    name: "Employee Fully-Loaded Cost Calculator",
    category: "operations",
    description: "Calculate true cost per hire including PF, health benefits, equipment, SaaS, and minimum billable rate.",
    requiredPlan: "starter",
    badge: "Talent Economics",
    hasInteractiveCalculator: true,
  },

  // Strategy Tools
  {
    id: "swot",
    name: "SWOT Analyzer",
    category: "strategy",
    description: "Interactive Strengths, Weaknesses, Opportunities, and Threats strategic mapping matrix.",
    requiredPlan: "starter",
    badge: "Strategic Matrix",
    hasInteractiveCalculator: true,
  },
  {
    id: "market_entry",
    name: "Market Entry Simulator",
    category: "strategy",
    description: "Simulate entry costs, localized competition, and payback for new domestic or global markets.",
    requiredPlan: "growth",
    badge: "Expansion",
  },
  {
    id: "scenario_planner",
    name: "Scenario Planner",
    category: "strategy",
    description: "Macro stress-testing: inflation, demand contraction, and competitor price wars.",
    requiredPlan: "growth",
    badge: "Risk Defense",
  },
  {
    id: "hiring",
    name: "Hiring Simulator",
    category: "strategy",
    description: "Fully loaded Indian payroll simulation including provident fund, benefits, and revenue lag.",
    requiredPlan: "growth",
    badge: "Talent Ops",
    hasInteractiveCalculator: true,
  },
  {
    id: "expansion",
    name: "Expansion Simulator",
    category: "strategy",
    description: "Capital requirements and projected ROI for opening new branch offices or enterprise teams.",
    requiredPlan: "enterprise",
    badge: "Scale Vector",
  },
];

function getInitialToolsList(): BusinessTool[] {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("bizzpal_tools_catalog");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }
  return TOOLS_CATALOG;
}

function ToolsContent() {
  const { ceoName, cfoName, marketingName } = useCustomAdvisors();
  const searchParams = useSearchParams();
  const [toolsList, setToolsList] = useState<BusinessTool[]>(getInitialToolsList);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [lockedTool, setLockedTool] = useState<BusinessTool | null>(null);
  const { hasPlanLevel } = usePlanAccess();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is active to prevent scroll leakage
  useEffect(() => {
    if (activeToolId) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [activeToolId]);

  // Close active tool calculator on Escape
  useEscapeKey(() => setActiveToolId(null), Boolean(activeToolId));

  const getAdvisorUrl = (tool: BusinessTool, customPrompt?: string, advisorOverride?: string) => {
    const advisor = advisorOverride || (
      tool.category === "marketing" ? "marketing" :
      tool.category === "sales" ? "sales" :
      tool.category === "operations" ? "operations" :
      tool.category === "strategy" ? "strategy" : "cfo"
    );
    const prompt = customPrompt || `I want to work through the ${tool.name} for my business. ${tool.description} Based on our company financials and telemetry, please analyze our numbers and guide me step-by-step with recommendations.`;
    const params = new URLSearchParams({
      advisor,
      tool: tool.name,
      toolId: tool.id,
      category: tool.category,
      badge: tool.badge || "",
      prompt,
      autoSend: "1",
    });
    return `/chat?${params.toString()}`;
  };

  // Fetch dynamic tools catalog with live updates from Superadmin
  useEffect(() => {
    let active = true;
    const fetchTools = () => {
      // 1. Instant hydration from localStorage
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("bizzpal_tools_catalog");
          if (saved) {
            const parsed = JSON.parse(saved);
            if (active && Array.isArray(parsed) && parsed.length > 0) {
              setToolsList(parsed);
            }
          }
        } catch {}
      }

      // 2. Fetch from public config API
      fetch("/api/public/config", { cache: "no-store", headers: { "Cache-Control": "no-cache" } })
        .then(r => r.json())
        .then(d => {
          if (active && d.success && Array.isArray(d.tools) && d.tools.length > 0) {
            setToolsList(d.tools);
            try {
              localStorage.setItem("bizzpal_tools_catalog", JSON.stringify(d.tools));
            } catch {}
          }
        })
        .catch(() => {});
    };

    fetchTools();

    window.addEventListener("bizzpal_config_updated", fetchTools);
    window.addEventListener("storage", fetchTools);
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("bizzpal_channel");
      bc.onmessage = () => fetchTools();
    } catch {}

    return () => {
      active = false;
      window.removeEventListener("bizzpal_config_updated", fetchTools);
      window.removeEventListener("storage", fetchTools);
      if (bc) bc.close();
    };
  }, []);

  // Read URL query parameter if launched from an AI Agent
  useEffect(() => {
    const toolParam = searchParams.get("tool");
    if (toolParam) {
      const tool = toolsList.find(t => t.id === toolParam);
      if (tool && (tool as any).enabled !== false) {
        if (hasPlanLevel(tool.requiredPlan)) {
          setActiveToolId(toolParam);
          setSelectedCategory(tool.category);
        } else {
          setLockedTool(tool);
          setSelectedCategory(tool.category);
        }
      }
    }
  }, [searchParams, toolsList, hasPlanLevel]);

  // Interactive Calculator State (Profit & Margin) - dynamically hydrated
  const [calcRevenue, setCalcRevenue] = useState(0);
  const [calcCogs, setCalcCogs] = useState(0);
  const [calcOpex, setCalcOpex] = useState(0);

  // Break-even State
  const [fixedCosts, setFixedCosts] = useState(0);
  const [pricePerUnit, setPricePerUnit] = useState(0);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState(0);

  // CAC / LTV State
  const [marketingSpend, setMarketingSpend] = useState(0);
  const [acquiredCustomers, setAcquiredCustomers] = useState(0);
  const [avgRevenuePerAccount, setAvgRevenuePerAccount] = useState(0);
  const [avgRetentionMonths, setAvgRetentionMonths] = useState(0);
  const [ltvMarginPct, setLtvMarginPct] = useState(0);

  // Cash Flow State
  const [cashReserve, setCashReserve] = useState(0);
  const [monthlyInflow, setMonthlyInflow] = useState(0);
  const [monthlyBurn, setMonthlyBurn] = useState(0);

  // ROI State
  const [roiCost, setRoiCost] = useState(0);
  const [roiBenefit, setRoiBenefit] = useState(0);

  // EMI Calculator State
  const [emiPrincipal, setEmiPrincipal] = useState(0);
  const [emiRateAnnual, setEmiRateAnnual] = useState(0);
  const [emiTenureMonths, setEmiTenureMonths] = useState(0);

  // GST State
  const [gstAmount, setGstAmount] = useState(0);
  const [gstRate, setGstRate] = useState(18);
  const [gstIsInterState, setGstIsInterState] = useState(false);
  const [gstItc, setGstItc] = useState(0);

  // Working Capital State
  const [wcRevenue, setWcRevenue] = useState(0);
  const [wcReceivables, setWcReceivables] = useState(0);
  const [wcCogs, setWcCogs] = useState(0);
  const [wcInventory, setWcInventory] = useState(0);
  const [wcPayables, setWcPayables] = useState(0);

  // Discount & Margin Sensitivity State
  const [discDealPrice, setDiscDealPrice] = useState(0);
  const [discBaseMargin, setDiscBaseMargin] = useState(0);
  const [discPercent, setDiscPercent] = useState(0);

  // NRR State
  const [nrrStartingMrr, setNrrStartingMrr] = useState(0);
  const [nrrChurnMrr, setNrrChurnMrr] = useState(0);
  const [nrrExpansionMrr, setNrrExpansionMrr] = useState(0);
  const [nrrNewMrr, setNrrNewMrr] = useState(0);

  // Fully Loaded Employee Cost State
  const [empBaseCtc, setEmpBaseCtc] = useState(0);
  const [empBenefitsPct, setEmpBenefitsPct] = useState(0);
  const [empToolsAnnual, setEmpToolsAnnual] = useState(0);
  const [empBillableHours, setEmpBillableHours] = useState(0);

  // Start from the business's own numbers, when BizzPal has them
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("bizzpal_business_profile") || "null");
      if (!p) return;
      const rev = Number(p.revenue ?? p.monthlyRevenue ?? 0);
      const burn = Number(p.burn ?? p.monthlyBurn ?? 0);
      const cash = Number(p.cash ?? p.cashOnHand ?? 0);
      if (rev > 0) {
        setCalcRevenue(rev);
        setMonthlyInflow(rev);
        setNrrStartingMrr(rev);
        setWcRevenue(rev * 12);
      }
      if (burn > 0) setMonthlyBurn(burn);
      if (cash > 0) setCashReserve(cash);
    } catch {}
  }, []);

  // Dynamically hydrate calculators with live company financial data
  useEffect(() => {
    fetch("/api/analytics")
      .then(r => r.json())
      .then(data => {
        if (data.success && data.metrics) {
          const m = data.metrics;
          if (m.monthlyRevenue > 0) {
            setCalcRevenue(m.monthlyRevenue);
            setMonthlyInflow(m.monthlyRevenue);
            setWcRevenue(m.annualRevenue || m.monthlyRevenue * 12);
            setNrrStartingMrr(m.monthlyRevenue);
          }
          if (m.monthlyBurn > 0) {
            setMonthlyBurn(m.monthlyBurn);
          }
          if (m.cashReserve > 0) {
            setCashReserve(m.cashReserve);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Only consider tools that are not disabled by admin
  const enabledTools = toolsList.filter(tool => (tool as any).enabled !== false);

  const filteredTools = enabledTools.filter(tool => {
    const matchesCategory = selectedCategory === "all" || tool.category === selectedCategory;
    const matchesSearch =
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.badge.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeTool = enabledTools.find(t => t.id === activeToolId);

  // Calculations
  const grossProfit = calcRevenue - calcCogs;
  const grossMargin = calcRevenue > 0 ? ((grossProfit / calcRevenue) * 100).toFixed(1) : "0";
  const netProfit = grossProfit - calcOpex;
  const netMargin = calcRevenue > 0 ? ((netProfit / calcRevenue) * 100).toFixed(1) : "0";

  const contributionMarginPerUnit = pricePerUnit - variableCostPerUnit;
  const breakevenUnits = contributionMarginPerUnit > 0 ? Math.ceil(fixedCosts / contributionMarginPerUnit) : 0;
  const breakevenRevenue = breakevenUnits * pricePerUnit;

  const calculatedCAC = acquiredCustomers > 0 ? Math.round(marketingSpend / acquiredCustomers) : 0;
  const calculatedLTV = Math.round(avgRevenuePerAccount * (avgRetentionMonths / 12) * (ltvMarginPct / 100));
  const ltvToCacRatio = calculatedCAC > 0 ? (calculatedLTV / calculatedCAC).toFixed(1) : "0";

  const netCashFlow = monthlyInflow - monthlyBurn;
  const runwayMonths = netCashFlow < 0 ? (cashReserve / Math.abs(netCashFlow)).toFixed(1) : "Profitable";

  const netBenefit = roiBenefit - roiCost;
  const roiPercentage = roiCost > 0 ? Math.round((netBenefit / roiCost) * 100) : 0;
  const paybackMonths = roiBenefit > 0 ? (roiCost / (roiBenefit / 12)).toFixed(1) : "0";

  // EMI Calculations
  const emiMonthlyRate = emiRateAnnual > 0 ? emiRateAnnual / (12 * 100) : 0;
  const emiMonthlyAmount =
    emiPrincipal > 0 && emiTenureMonths > 0
      ? emiMonthlyRate > 0
        ? Math.round(
            (emiPrincipal *
              emiMonthlyRate *
              Math.pow(1 + emiMonthlyRate, emiTenureMonths)) /
              (Math.pow(1 + emiMonthlyRate, emiTenureMonths) - 1)
          )
        : Math.round(emiPrincipal / emiTenureMonths)
      : 0;
  const emiTotalPayment = emiMonthlyAmount * emiTenureMonths;
  const emiTotalInterest = Math.max(0, emiTotalPayment - emiPrincipal);
  const emiBurnImpact = monthlyBurn > 0 ? ((emiMonthlyAmount / monthlyBurn) * 100).toFixed(1) : "0";

  // GST Calculations
  const calculatedGST = Math.round(gstAmount * (gstRate / 100));
  const gstGrossTotal = gstAmount + calculatedGST;
  const gstCgst = gstIsInterState ? 0 : Math.round(calculatedGST / 2);
  const gstSgst = gstIsInterState ? 0 : Math.round(calculatedGST / 2);
  const gstIgst = gstIsInterState ? calculatedGST : 0;
  const gstNetPayable = Math.max(0, calculatedGST - gstItc);

  // Working Capital Calculations
  const wcDso = wcRevenue > 0 ? Math.round((wcReceivables / wcRevenue) * 365) : 0;
  const wcDio = wcCogs > 0 ? Math.round((wcInventory / wcCogs) * 365) : 0;
  const wcDpo = wcCogs > 0 ? Math.round((wcPayables / wcCogs) * 365) : 0;
  const wcCcc = wcDso + wcDio - wcDpo;
  const wcTrappedCash = wcReceivables + wcInventory - wcPayables;

  // Discount Sensitivity Calculations
  const discDiscountedPrice = Math.round(discDealPrice * (1 - discPercent / 100));
  const discBaseProfit = Math.round(discDealPrice * (discBaseMargin / 100));
  const discBaseCost = discDealPrice - discBaseProfit;
  const discNewProfit = Math.max(0, discDiscountedPrice - discBaseCost);
  const discNewMargin = discDiscountedPrice > 0 ? ((discNewProfit / discDiscountedPrice) * 100).toFixed(1) : "0";
  const discExtraVolumeNeeded =
    discNewProfit > 0 ? (((discBaseProfit / discNewProfit) - 1) * 100).toFixed(1) : "100+";

  // NRR Calculations
  const nrrGrr = nrrStartingMrr > 0 ? (((nrrStartingMrr - nrrChurnMrr) / nrrStartingMrr) * 100).toFixed(1) : "0";
  const nrrPercentage =
    nrrStartingMrr > 0
      ? (((nrrStartingMrr - nrrChurnMrr + nrrExpansionMrr) / nrrStartingMrr) * 100).toFixed(1)
      : "0";
  const nrrEndingMrr = nrrStartingMrr - nrrChurnMrr + nrrExpansionMrr + nrrNewMrr;
  const nrrNetGain = nrrEndingMrr - nrrStartingMrr;

  // Fully-Loaded Employee Cost Calculations
  const empLoadedAnnual = Math.round(empBaseCtc * (1 + empBenefitsPct / 100) + empToolsAnnual);
  const empLoadedMonthly = Math.round(empLoadedAnnual / 12);
  const empHourlyCost = empBillableHours > 0 ? Math.round(empLoadedAnnual / empBillableHours) : 0;
  const empBillingRate = Math.round(empHourlyCost / 0.60);

  const categories = [
    { id: "all", label: "All" },
    { id: "finance", label: "Finance" },
    { id: "sales", label: "Sales" },
    { id: "marketing", label: "Marketing" },
    { id: "operations", label: "Operations" },
    { id: "strategy", label: "Strategy" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Tools</h1>
          <p className="text-sm text-text-muted mt-1">
            Calculators for costs, runway, pricing and sales planning.
          </p>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search tools…"
          className="w-full sm:w-64 px-3.5 py-2 rounded-lg border border-line bg-surface text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
        />
      </div>

      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-line bg-surface">
        <div>
          <h2 className="text-sm font-semibold text-text">DataPal</h2>
          <p className="text-sm text-text-muted mt-0.5">
            Find and verify business contacts across India, then export to Excel.
          </p>
        </div>
        <Link
          href="/datapal"
          className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 shrink-0"
        >
          Open DataPal
        </Link>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto overflow-y-hidden border-b border-line">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 pb-2.5 -mb-px text-sm whitespace-nowrap border-b-2 cursor-pointer ${
              selectedCategory === cat.id
                ? "border-brass text-text font-semibold"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Interactive Tool Pop-Up Modal */}
      {mounted && activeTool && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 m-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          onClick={() => setActiveToolId(null)}
        >
          <div
            className="max-w-3xl w-full bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Pop-Up Header */}
            <div className="px-6 pt-6 pb-4 border-b border-line flex items-start justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-text">
                      {activeTool.name}
                    </h2>
                  </div>
                  <p className="text-sm text-text-muted mt-1">
                    {activeTool.description}
                  </p>
                </div>
              </div>

              <button type="button" onClick={() => setActiveToolId(null)} aria-label="Close" title="Close (Esc)" className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer shrink-0"><X className="w-5 h-5" /></button>
            </div>
            {/* Scrollable Pop-Up Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {!activeTool.hasInteractiveCalculator ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-surface-2/50 border border-line text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass mx-auto">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-2 text-text-muted border border-line">
                      Calculator not available
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-text">
                      Use the AI advisor for this one
                    </h3>
                    <p className="text-xs text-text-muted leading-relaxed">
                      There is no quick calculator for <strong className="text-text">{activeTool.name}</strong> yet. Your AI advisor can work it through with your business details.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-surface border border-line text-left text-xs space-y-2 max-w-lg mx-auto">
                    <div className="flex items-center justify-between text-xs font-semibold text-text">
                      <span>About this tool</span>
                      <span className="tabular-nums text-brass">{activeTool.badge}</span>
                    </div>
                    <p className="text-xs text-text-muted">
                      {activeTool.description}
                    </p>
                    <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-text-muted">
                      <span>Category: <strong className="uppercase text-text">{activeTool.category}</strong></span>
                      <span>Required Plan: <strong className="text-text">{activeTool.requiredPlan.charAt(0).toUpperCase() + activeTool.requiredPlan.slice(1)}+</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={getAdvisorUrl(activeTool)}
                      className="px-4 py-2.5 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Ask your advisor</span>
                    </Link>
                    <Link
                      href="/simulator"
                      className="px-4 py-2.5 rounded-xl bg-surface border border-line hover:border-line-strong text-text font-medium text-sm inline-flex items-center gap-2 transition-colors"
                    >
                      <span>Decision Simulator</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  {/* Profit Calculator */}
                  {activeTool.id === "profit" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Monthly Gross Revenue (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={calcRevenue ? formatINR(calcRevenue) : ""}
                            onChange={e => setCalcRevenue(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 12,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Cost of Goods Sold / Delivery (COGS) (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={calcCogs ? formatINR(calcCogs) : ""}
                            onChange={e => setCalcCogs(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 3,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Operating Expenses (Payroll + Rent + Cloud) (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={calcOpex ? formatINR(calcOpex) : ""}
                            onChange={e => setCalcOpex(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 4,50,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                      </div>

                      {!(calcRevenue > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-4 ${(calcRevenue > 0) ? "" : "hidden"}`}>
                        <div className="space-y-3">
                          <span className="text-xs font-medium text-text-muted block">
                            Result
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Gross Margin</div>
                              <div className="text-base font-semibold text-brass tabular-nums">
                                {grossMargin}%
                              </div>
                              <div className="text-xs text-text-muted tabular-nums mt-0.5">
                                ₹{grossProfit.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Net Margin</div>
                              <div
                                className={`text-base font-semibold tabular-nums ${
                                  netProfit >= 0 ? "text-jade" : "text-negative"
                                }`}
                              >
                                {netMargin}%
                              </div>
                              <div className="text-xs text-text-muted tabular-nums mt-0.5">
                                ₹{netProfit.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, analyze our current net margin of ${netMargin}% on ₹${calcRevenue.toLocaleString("en-IN")} monthly revenue. What are the best cost levers to improve operating cash?`, "cfo")}
                            className="w-full block py-2.5 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Consult {cfoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Break-Even Calculator */}
                  {activeTool.id === "breakeven" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Monthly Total Fixed Overheads (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={fixedCosts ? formatINR(fixedCosts) : ""}
                            onChange={e => setFixedCosts(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 2,50,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Average Selling Price Per Contract (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={pricePerUnit ? formatINR(pricePerUnit) : ""}
                            onChange={e => setPricePerUnit(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 25,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Direct Variable Cost Per Contract (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={variableCostPerUnit ? formatINR(variableCostPerUnit) : ""}
                            onChange={e => setVariableCostPerUnit(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 5,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                      </div>

                      {!(fixedCosts > 0 && pricePerUnit > variableCostPerUnit) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-4 ${(fixedCosts > 0 && pricePerUnit > variableCostPerUnit) ? "" : "hidden"}`}>
                        <div className="space-y-3">
                          <span className="text-xs font-medium text-text-muted block">
                            Break-Even Solvency Requirement
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Target Deals / Units</div>
                              <div className="text-base font-semibold text-brass tabular-nums">
                                {breakevenUnits} contracts
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">per month</div>
                            </div>
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Required Revenue</div>
                              <div className="text-base font-semibold text-jade tabular-nums">
                                ₹{breakevenRevenue.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">at break-even</div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, our break-even target is ₹${breakevenRevenue.toLocaleString("en-IN")} across ${breakevenUnits} contracts/mo. What's our quickest path to achieving this?`, "cfo")}
                            className="w-full block py-2.5 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Analyze with {cfoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* CAC / LTV Calculator */}
                  {(activeTool.id === "cac" || activeTool.id === "ltv") && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Total Monthly Sales & Marketing Outlay (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={marketingSpend ? formatINR(marketingSpend) : ""}
                            onChange={e => setMarketingSpend(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 2,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            New Customers Signed This Month
                          </label>
                          <input
                            type="number"
                            value={acquiredCustomers}
                            onChange={e => setAcquiredCustomers(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Annual Revenue Per Customer (ACV) (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={avgRevenuePerAccount ? formatINR(avgRevenuePerAccount) : ""}
                            onChange={e => setAvgRevenuePerAccount(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 60,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            How many months a customer stays
                          </label>
                          <input
                            type="number"
                            value={avgRetentionMonths || ""}
                            onChange={e => setAvgRetentionMonths(Number(e.target.value) || 0)}
                            placeholder="Your own figure"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Gross margin on that revenue (%)
                          </label>
                          <input
                            type="number"
                            value={ltvMarginPct || ""}
                            onChange={e => setLtvMarginPct(Number(e.target.value) || 0)}
                            placeholder="Your own figure"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass"
                          />
                        </div>
                      </div>

                      {!(marketingSpend > 0 && acquiredCustomers > 0 && avgRetentionMonths > 0 && ltvMarginPct > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-4 ${(marketingSpend > 0 && acquiredCustomers > 0 && avgRetentionMonths > 0 && ltvMarginPct > 0) ? "" : "hidden"}`}>
                        <div className="space-y-3">
                          <span className="text-xs font-medium text-text-muted block">
                            Unit Acquisition & Lifetime Value
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Blended CAC</div>
                              <div className="text-xs sm:text-sm font-semibold text-negative tabular-nums">
                                ₹{calculatedCAC.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Customer LTV</div>
                              <div className="text-xs sm:text-sm font-semibold text-jade tabular-nums">
                                ₹{calculatedLTV.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">LTV / CAC</div>
                              <div className="text-xs sm:text-sm font-semibold text-brass tabular-nums">
                                {ltvToCacRatio}x
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${marketingName}, evaluate our LTV to CAC ratio of ${ltvToCacRatio}x (CAC: ₹${calculatedCAC.toLocaleString("en-IN")}, LTV: ₹${calculatedLTV.toLocaleString("en-IN")}). How should we optimize our demand funnel?`, "marketing")}
                            className="w-full block py-2.5 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Consult {marketingName} on CAC →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cash Flow Forecast Calculator */}
                  {activeTool.id === "cashflow" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Current Bank Balance / Cash Reserve (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cashReserve ? formatINR(cashReserve) : ""}
                            onChange={e => setCashReserve(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 50,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Monthly Inflow / Collections (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={monthlyInflow ? formatINR(monthlyInflow) : ""}
                            onChange={e => setMonthlyInflow(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 15,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Monthly Outflow / Net Burn (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={monthlyBurn ? formatINR(monthlyBurn) : ""}
                            onChange={e => setMonthlyBurn(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 20,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                      </div>

                      {!(cashReserve > 0 && (monthlyInflow > 0 || monthlyBurn > 0)) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-4 ${(cashReserve > 0 && (monthlyInflow > 0 || monthlyBurn > 0)) ? "" : "hidden"}`}>
                        <div className="space-y-3">
                          <span className="text-xs font-medium text-text-muted block">
                            Runway & Liquidity Telemetry
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Net Monthly Cash Flow</div>
                              <div className={`text-base font-semibold tabular-nums ${netCashFlow >= 0 ? "text-jade" : "text-negative"}`}>
                                {netCashFlow >= 0 ? `+₹${netCashFlow.toLocaleString("en-IN")}` : `-₹${Math.abs(netCashFlow).toLocaleString("en-IN")}`}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">per month</div>
                            </div>
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Projected Runway</div>
                              <div className="text-base font-semibold text-brass tabular-nums">
                                {runwayMonths === "Profitable" ? "Infinite" : `${runwayMonths} Mo`}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">at current burn</div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, our cash runway is ${runwayMonths} months with net monthly outflow of ₹${Math.abs(netCashFlow).toLocaleString("en-IN")}. What cash stabilization steps do you advise?`, "cfo")}
                            className="w-full block py-2.5 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Plan Cash Runway with {cfoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ROI Calculator */}
                  {activeTool.id === "roi" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Total Investment / Capital Outlay (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={roiCost ? formatINR(roiCost) : ""}
                            onChange={e => setRoiCost(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 6,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Expected Annual Returns / Cost Savings (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={roiBenefit ? formatINR(roiBenefit) : ""}
                            onChange={e => setRoiBenefit(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 18,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                      </div>

                      {!(roiCost > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-4 ${(roiCost > 0) ? "" : "hidden"}`}>
                        <div className="space-y-3">
                          <span className="text-xs font-medium text-text-muted block">
                            Return on Investment Dynamics
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Net Annual ROI</div>
                              <div className="text-base font-semibold text-jade tabular-nums">
                                {roiPercentage}%
                              </div>
                              <div className="text-xs text-text-muted tabular-nums mt-0.5">
                                +₹{netBenefit.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-3 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Payback Period</div>
                              <div className="text-base font-semibold text-brass tabular-nums">
                                {paybackMonths} Mo
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">to break-even</div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `Evaluate capital allocation for ${activeTool.name} with expected ${roiPercentage}% ROI and ${paybackMonths} months payback.`, "cfo")}
                            className="w-full block py-2.5 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Verify Payback with CFO AI →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EMI Calculator */}
                  {activeTool.id === "emi" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Loan / Equipment Financing Amount (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={emiPrincipal ? formatINR(emiPrincipal) : ""}
                            onChange={e => setEmiPrincipal(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 25,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Annual Interest Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={emiRateAnnual}
                              onChange={e => setEmiRateAnnual(Number(e.target.value) || 0)}
                              placeholder="e.g. 11.5"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                            />
                          </div>
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Tenure (Months)
                            </label>
                            <input
                              type="number"
                              value={emiTenureMonths}
                              onChange={e => setEmiTenureMonths(Number(e.target.value) || 0)}
                              placeholder="e.g. 36"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                            />
                          </div>
                        </div>
                      </div>

                      {!(emiPrincipal > 0 && emiTenureMonths > 0 && emiRateAnnual > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-4 ${(emiPrincipal > 0 && emiTenureMonths > 0 && emiRateAnnual > 0) ? "" : "hidden"}`}>
                        <div className="space-y-3">
                          <span className="text-xs font-medium text-text-muted block">
                            Amortization & Debt Service Telemetry
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Monthly EMI</div>
                              <div className="text-sm sm:text-base font-semibold text-brass tabular-nums">
                                ₹{emiMonthlyAmount.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-text-muted tabular-nums mt-0.5">
                                {emiTenureMonths} installments
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Total Interest</div>
                              <div className="text-sm sm:text-base font-semibold text-negative tabular-nums">
                                ₹{emiTotalInterest.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-text-muted tabular-nums mt-0.5">
                                Total: ₹{emiTotalPayment.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-surface border border-line text-xs flex items-center justify-between">
                            <span className="text-text-muted text-xs">Monthly Burn Impact:</span>
                            <span className="font-bold text-caution tabular-nums text-xs">{emiBurnImpact}% of OPEX</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, evaluate a business loan EMI of ₹${emiMonthlyAmount.toLocaleString("en-IN")}/mo on ₹${emiPrincipal.toLocaleString("en-IN")} borrowing. What is our optimal debt-to-cash strategy?`, "cfo")}
                            className="w-full block py-2.5 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Consult {cfoName} on Loan Amortization →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* GST & Tax Offset Calculator */}
                  {activeTool.id === "gst" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Base Transaction Value / Invoice Amount (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={gstAmount ? formatINR(gstAmount) : ""}
                            onChange={e => setGstAmount(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 1,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            GST Slab Rate
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[5, 12, 18, 28].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setGstRate(r)}
                                className={`py-1.5 rounded-xl border text-xs font-bold transition-all ${
                                  gstRate === r
                                    ? "bg-brass text-white border-brass"
                                    : "bg-surface-2 border-line text-text hover:border-line-strong"
                                }`}
                              >
                                {r}%
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setGstIsInterState(false)}
                            className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                              !gstIsInterState
                                ? "bg-brass text-white border-brass"
                                : "bg-surface-2 border-line text-text-muted dark:text-text-muted"
                            }`}
                          >
                            Intra-State (CGST+SGST)
                          </button>
                          <button
                            type="button"
                            onClick={() => setGstIsInterState(true)}
                            className={`py-1.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                              gstIsInterState
                                ? "bg-brass text-white border-brass"
                                : "bg-surface-2 border-line text-text-muted dark:text-text-muted"
                            }`}
                          >
                            Inter-State (IGST)
                          </button>
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Eligible Input Tax Credit (ITC) Available (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={gstItc ? formatINR(gstItc) : ""}
                            onChange={e => setGstItc(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 8,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass focus:ring-0"
                          />
                        </div>
                      </div>

                      {!(gstAmount > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-4 ${(gstAmount > 0) ? "" : "hidden"}`}>
                        <div className="space-y-3">
                          <span className="text-xs font-medium text-text-muted block">
                            Tax Assessment & Compliance
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Total GST</div>
                              <div className="text-sm sm:text-base font-semibold text-brass tabular-nums">
                                ₹{calculatedGST.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">
                                {!gstIsInterState ? `CGST ₹${gstCgst.toLocaleString("en-IN")} + SGST ₹${gstSgst.toLocaleString("en-IN")}` : `IGST ₹${gstIgst.toLocaleString("en-IN")}`}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Net Tax Payable (after ITC)</div>
                              <div className="text-sm sm:text-base font-semibold text-jade tabular-nums">
                                ₹{gstNetPayable.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5 tabular-nums">
                                Invoice Gross: ₹{gstGrossTotal.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, analyze our GST cash outflow of ₹${gstNetPayable.toLocaleString("en-IN")} after ₹${gstItc.toLocaleString("en-IN")} ITC offset. How should we optimize working capital around GST filing deadlines?`, "cfo")}
                            className="w-full block py-2.5 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Verify GST Filing with {cfoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Working Capital & Cash Conversion Cycle */}
                  {activeTool.id === "working_capital" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-2.5 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Annual Revenue (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcRevenue ? formatINR(wcRevenue) : ""}
                              onChange={e => setWcRevenue(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm"
                            />
                          </div>
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Accounts Receivable (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcReceivables ? formatINR(wcReceivables) : ""}
                              onChange={e => setWcReceivables(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Annual COGS / Direct (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcCogs ? formatINR(wcCogs) : ""}
                              onChange={e => setWcCogs(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm"
                            />
                          </div>
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Inventory Value (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcInventory ? formatINR(wcInventory) : ""}
                              onChange={e => setWcInventory(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Accounts Payable to Vendors (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={wcPayables ? formatINR(wcPayables) : ""}
                            onChange={e => setWcPayables(Number(parseINR(e.target.value)) || 0)}
                            className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm"
                          />
                        </div>
                      </div>

                      {!(wcRevenue > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-3 ${(wcRevenue > 0) ? "" : "hidden"}`}>
                        <div className="space-y-2.5">
                          <span className="text-xs font-medium text-text-muted block">
                            Working Capital & Cash Velocity
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 rounded-xl bg-surface border border-line text-center">
                              <div className="text-[9px] text-text-muted">DSO (Receivables)</div>
                              <div className="text-xs sm:text-sm font-semibold text-brass tabular-nums">{wcDso} d</div>
                            </div>
                            <div className="p-2 rounded-xl bg-surface border border-line text-center">
                              <div className="text-[9px] text-text-muted">DIO (Inventory)</div>
                              <div className="text-xs sm:text-sm font-semibold text-caution tabular-nums">{wcDio} d</div>
                            </div>
                            <div className="p-2 rounded-xl bg-surface border border-line text-center">
                              <div className="text-[9px] text-text-muted">DPO (Payables)</div>
                              <div className="text-xs sm:text-sm font-semibold text-jade tabular-nums">{wcDpo} d</div>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-surface border border-line flex items-center justify-between text-xs">
                            <span className="text-text-muted text-xs">Cash Conversion Cycle (CCC):</span>
                            <span className="font-semibold text-brass tabular-nums">{wcCcc} Days</span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-surface border border-line flex items-center justify-between text-xs">
                            <span className="text-text-muted text-xs">Trapped Working Capital:</span>
                            <span className="font-semibold text-text tabular-nums">₹{wcTrappedCash.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, our cash conversion cycle is ${wcCcc} days with ₹${wcTrappedCash.toLocaleString("en-IN")} trapped in working capital. How do we compress DSO from ${wcDso} days?`, "cfo")}
                            className="w-full block py-2 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Optimize Cash Conversion with {cfoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Discount & Margin Sensitivity Calculator */}
                  {activeTool.id === "discount_margin" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-3 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Standard Deal / Contract Price (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={discDealPrice ? formatINR(discDealPrice) : ""}
                            onChange={e => setDiscDealPrice(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 5,00,000"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm focus:outline-none focus:border-brass"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Standard Gross Margin (%)
                            </label>
                            <input
                              type="number"
                              value={discBaseMargin}
                              onChange={e => setDiscBaseMargin(Number(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm"
                            />
                          </div>
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Proposed Discount (%)
                            </label>
                            <input
                              type="number"
                              value={discPercent}
                              onChange={e => setDiscPercent(Number(e.target.value) || 0)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-line text-text tabular-nums text-sm"
                            />
                          </div>
                        </div>
                      </div>

                      {!(discDealPrice > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-3 ${(discDealPrice > 0) ? "" : "hidden"}`}>
                        <div className="space-y-2.5">
                          <span className="text-xs font-medium text-text-muted block">
                            Margin Erosion Diagnostics
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Discounted Price</div>
                              <div className="text-sm font-semibold text-text tabular-nums">
                                ₹{discDiscountedPrice.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-negative mt-0.5">
                                Margin: {discNewMargin}% (was {discBaseMargin}%)
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Extra Volume Needed</div>
                              <div className="text-sm font-semibold text-caution tabular-nums">
                                +{discExtraVolumeNeeded}%
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">
                                to match base profit
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, our sales rep wants to offer a ${discPercent}% discount on a ₹${discDealPrice.toLocaleString("en-IN")} deal. This drops our gross margin from ${discBaseMargin}% to ${discNewMargin}% and requires ${discExtraVolumeNeeded}% more volume. Should we approve this discount?`, "cfo")}
                            className="w-full block py-2 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Analyze Discount Risk with {cfoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Net Revenue Retention (NRR) Calculator */}
                  {activeTool.id === "nrr" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-2.5 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Starting Month MRR (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={nrrStartingMrr ? formatINR(nrrStartingMrr) : ""}
                            onChange={e => setNrrStartingMrr(Number(parseINR(e.target.value)) || 0)}
                            className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Churned / Lost MRR (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={nrrChurnMrr ? formatINR(nrrChurnMrr) : ""}
                              onChange={e => setNrrChurnMrr(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs text-negative"
                            />
                          </div>
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Expansion / Upsell MRR (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={nrrExpansionMrr ? formatINR(nrrExpansionMrr) : ""}
                              onChange={e => setNrrExpansionMrr(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs text-jade"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            New Signups / Inbound MRR (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={nrrNewMrr ? formatINR(nrrNewMrr) : ""}
                            onChange={e => setNrrNewMrr(Number(parseINR(e.target.value)) || 0)}
                            className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs"
                          />
                        </div>
                      </div>

                      {!(nrrStartingMrr > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-3 ${(nrrStartingMrr > 0) ? "" : "hidden"}`}>
                        <div className="space-y-2.5">
                          <span className="text-xs font-medium text-text-muted block">
                            Retention & Expansion Benchmarks
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Net Revenue Retention</div>
                              <div className={`text-base font-semibold tabular-nums ${Number(nrrPercentage) >= 100 ? "text-jade" : "text-caution"}`}>
                                {nrrPercentage}%
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">GRR: {nrrGrr}%</div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Ending MRR</div>
                              <div className="text-base font-semibold text-brass tabular-nums">
                                ₹{nrrEndingMrr.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-jade mt-0.5 tabular-nums">
                                +₹{nrrNetGain.toLocaleString("en-IN")}/mo
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${ceoName} & ${cfoName}, our current Net Revenue Retention is ${nrrPercentage}% with ₹${nrrChurnMrr.toLocaleString("en-IN")} monthly churn. What accounts are at risk and how do we drive account expansion?`, "cfo")}
                            className="w-full block py-2 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Review Retention Playbook with {ceoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Employee Fully-Loaded Cost Calculator */}
                  {activeTool.id === "loaded_cost" && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                      <div className="md:col-span-6 space-y-2.5 text-xs">
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Annual Base CTC / Salary (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={empBaseCtc ? formatINR(empBaseCtc) : ""}
                            onChange={e => setEmpBaseCtc(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 12,00,000"
                            className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              Statutory & Benefits (%)
                            </label>
                            <input
                              type="number"
                              value={empBenefitsPct}
                              onChange={e => setEmpBenefitsPct(Number(e.target.value) || 0)}
                              placeholder="e.g. 18 (PF, Health)"
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-medium text-text block mb-1.5 text-sm">
                              SaaS Tools & Hardware / yr (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={empToolsAnnual ? formatINR(empToolsAnnual) : ""}
                              onChange={e => setEmpToolsAnnual(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-medium text-text block mb-1.5 text-sm">
                            Target Billable Hours / Year
                          </label>
                          <input
                            type="number"
                            value={empBillableHours}
                            onChange={e => setEmpBillableHours(Number(e.target.value) || 0)}
                            placeholder="e.g. 1,500 hrs"
                            className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line tabular-nums text-xs"
                          />
                        </div>
                      </div>

                      {!(empBaseCtc > 0) && (
                      <div className="md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex items-center justify-center text-center text-sm text-text-muted">Fill in the boxes on the left to see the result.</div>
                      )}
                      <div className={`md:col-span-6 p-4 rounded-xl bg-surface-2/50 border border-line flex flex-col justify-between space-y-3 ${(empBaseCtc > 0) ? "" : "hidden"}`}>
                        <div className="space-y-2.5">
                          <span className="text-xs font-medium text-text-muted block">
                            True Headcount Economics
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Total Loaded Annual Cost</div>
                              <div className="text-sm font-semibold text-text tabular-nums">
                                ₹{empLoadedAnnual.toLocaleString("en-IN")}
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">
                                ₹{empLoadedMonthly.toLocaleString("en-IN")}/mo burn
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl bg-surface border border-line">
                              <div className="text-xs text-text-muted">Min Client Billing Rate</div>
                              <div className="text-sm font-semibold text-jade tabular-nums">
                                ₹{empBillingRate}/hr
                              </div>
                              <div className="text-xs text-text-muted mt-0.5">
                                (Cost: ₹{empHourlyCost}/hr @ 40% margin)
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-line">
                          <Link
                            href={getAdvisorUrl(activeTool, `${cfoName}, an employee with ₹${empBaseCtc.toLocaleString("en-IN")} base CTC costs us ₹${empLoadedAnnual.toLocaleString("en-IN")} fully loaded. How should we price their services to maintain 40% gross margins?`, "cfo")}
                            className="w-full block py-2 px-3 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm text-center transition-colors cursor-pointer"
                          >
                            Evaluate Hiring Economics with {cfoName} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback interactive sandbox for any other tool with calculator enabled */}
                  {!["profit", "breakeven", "cac", "ltv", "cashflow", "roi", "emi", "gst", "working_capital", "discount_margin", "nrr", "loaded_cost"].includes(activeTool.id) && (
                    <div className="p-6 rounded-xl bg-surface-2/50 border border-line text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass mx-auto">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-text">
                          {activeTool.name}
                        </h3>
                        <p className="text-xs text-text-muted max-w-md mx-auto">
                          Work this through with your advisor, or test a scenario in the Decision Simulator.
                        </p>
                      </div>
                      <div className="pt-3 flex items-center justify-center gap-3">
                        <Link
                          href={getAdvisorUrl(activeTool)}
                          className="px-4 py-2.5 rounded-xl bg-brass hover:opacity-90 text-white font-medium text-sm inline-flex items-center gap-2 transition-colors cursor-pointer"
                        >
                          <Bot className="w-4 h-4" />
                          <span>Ask your advisor</span>
                        </Link>
                        <Link
                          href="/simulator"
                          className="px-4 py-2.5 rounded-xl bg-surface border border-line hover:border-line-strong text-text font-medium text-sm inline-flex items-center gap-2 transition-colors"
                        >
                          <span>Decision Simulator</span>
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map(tool => {
          const locked = !hasPlanLevel(tool.requiredPlan);
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => (locked ? setLockedTool(tool) : setActiveToolId(tool.id))}
              className={`group text-left p-4 rounded-xl border border-line bg-surface hover:border-line-strong flex flex-col gap-2 cursor-pointer ${
                locked ? "opacity-60" : ""
              }`}
            >
              <p className="text-xs text-text-muted flex items-center justify-between">
                <span>{tool.badge}</span>
                {locked && (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {tool.requiredPlan.charAt(0).toUpperCase() + tool.requiredPlan.slice(1)}
                  </span>
                )}
              </p>
              <h3 className="text-sm font-semibold text-text">{tool.name}</h3>
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{tool.description}</p>
              <span
                className={`mt-2 self-start px-3.5 py-1.5 rounded-lg border text-sm font-medium inline-flex items-center gap-1.5 ${
                  locked
                    ? "border-line text-text-muted"
                    : "border-brass/50 text-brass group-hover:bg-brass group-hover:text-white"
                }`}
              >
                {locked ? <Lock className="w-3.5 h-3.5" /> : null}
                {locked ? "Unlock" : tool.hasInteractiveCalculator ? "Open calculator" : "Open tool"}
                {!locked && <ArrowRight className="w-3.5 h-3.5" />}
              </span>
            </button>
          );
        })}
      </div>

      {lockedTool && (
        <UpgradeModal
          featureLabel={lockedTool.name}
          requiredPlan={lockedTool.requiredPlan}
          onClose={() => setLockedTool(null)}
        />
      )}
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-text-muted">Loading BizzPal Tools…</div>}>
      <ToolsContent />
    </Suspense>
  );
}

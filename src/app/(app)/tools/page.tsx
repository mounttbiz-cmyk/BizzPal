"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Wrench,
  DollarSign,
  TrendingUp,
  Target,
  Users,
  Compass,
  Calculator,
  Sliders,
  Database,
  Bot,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Lock,
  Layers,
  Search,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Activity,
  X
} from "lucide-react";
import { Suspense } from "react";
import { createPortal } from "react-dom";
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
  const [calcRevenue, setCalcRevenue] = useState(1200000);
  const [calcCogs, setCalcCogs] = useState(300000);
  const [calcOpex, setCalcOpex] = useState(450000);

  // Break-even State
  const [fixedCosts, setFixedCosts] = useState(250000);
  const [pricePerUnit, setPricePerUnit] = useState(25000);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState(5000);

  // CAC / LTV State
  const [marketingSpend, setMarketingSpend] = useState(200000);
  const [acquiredCustomers, setAcquiredCustomers] = useState(20);
  const [avgRevenuePerAccount, setAvgRevenuePerAccount] = useState(60000);
  const [avgRetentionMonths, setAvgRetentionMonths] = useState(18);

  // Cash Flow State
  const [cashReserve, setCashReserve] = useState(5000000);
  const [monthlyInflow, setMonthlyInflow] = useState(1500000);
  const [monthlyBurn, setMonthlyBurn] = useState(2000000);

  // ROI State
  const [roiCost, setRoiCost] = useState(600000);
  const [roiBenefit, setRoiBenefit] = useState(1800000);

  // EMI Calculator State
  const [emiPrincipal, setEmiPrincipal] = useState(2500000);
  const [emiRateAnnual, setEmiRateAnnual] = useState(11.5);
  const [emiTenureMonths, setEmiTenureMonths] = useState(36);

  // GST State
  const [gstAmount, setGstAmount] = useState(100000);
  const [gstRate, setGstRate] = useState(18);
  const [gstIsInterState, setGstIsInterState] = useState(false);
  const [gstItc, setGstItc] = useState(8000);

  // Working Capital State
  const [wcRevenue, setWcRevenue] = useState(12000000);
  const [wcReceivables, setWcReceivables] = useState(1800000);
  const [wcCogs, setWcCogs] = useState(4500000);
  const [wcInventory, setWcInventory] = useState(750000);
  const [wcPayables, setWcPayables] = useState(600000);

  // Discount & Margin Sensitivity State
  const [discDealPrice, setDiscDealPrice] = useState(500000);
  const [discBaseMargin, setDiscBaseMargin] = useState(55);
  const [discPercent, setDiscPercent] = useState(15);

  // NRR State
  const [nrrStartingMrr, setNrrStartingMrr] = useState(1000000);
  const [nrrChurnMrr, setNrrChurnMrr] = useState(40000);
  const [nrrExpansionMrr, setNrrExpansionMrr] = useState(120000);
  const [nrrNewMrr, setNrrNewMrr] = useState(150000);

  // Fully Loaded Employee Cost State
  const [empBaseCtc, setEmpBaseCtc] = useState(1200000);
  const [empBenefitsPct, setEmpBenefitsPct] = useState(18);
  const [empToolsAnnual, setEmpToolsAnnual] = useState(120000);
  const [empBillableHours, setEmpBillableHours] = useState(1500);

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
            setGstAmount(Math.round(m.monthlyRevenue * 0.25));
          }
          if (m.monthlyBurn > 0) {
            setMonthlyBurn(m.monthlyBurn);
            setCalcOpex(Math.round(m.monthlyBurn * 0.65));
            setCalcCogs(Math.round(m.monthlyBurn * 0.35));
            setFixedCosts(Math.round(m.monthlyBurn * 0.55));
            setMarketingSpend(Math.round(m.monthlyBurn * 0.15));
            setWcCogs(Math.round(m.monthlyBurn * 0.35 * 12));
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
  const calculatedLTV = Math.round(avgRevenuePerAccount * (avgRetentionMonths / 12) * 0.7);
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
    { id: "all", label: `All Tools (${enabledTools.length})` },
    { id: "finance", label: `Finance (${enabledTools.filter(t => t.category === "finance").length})` },
    { id: "sales", label: `Sales (${enabledTools.filter(t => t.category === "sales").length})` },
    { id: "marketing", label: `Marketing (${enabledTools.filter(t => t.category === "marketing").length})` },
    { id: "operations", label: `Operations (${enabledTools.filter(t => t.category === "operations").length})` },
    { id: "strategy", label: `Strategy (${enabledTools.filter(t => t.category === "strategy").length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <Wrench className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-text">Executive Intelligence Tools</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
              {enabledTools.length} Specialist Tools Active
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-medium">
            Access modular calculators and analytical utilities to evaluate customer acquisition cost, runway extensions, pricing matrices, and sales capacity.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tools or calculators…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
      </div>

      {/* DataPal Featured Spotlight Banner */}
      <div className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-brass/[0.08] via-surface to-brass/[0.03] dark:from-brass/[0.08] dark:via-surface dark:to-surface border border-brass/30 dark:border-brass/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-brass/50 transition-all group">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-brass/[0.05] rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-brass/10 dark:bg-brass/15 border border-brass/30 flex items-center justify-center text-brass shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Database className="w-5 h-5 text-brass" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-text">DataPal™ Business Data Extraction</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brass/15 text-brass border border-brass/30">
                New Integration
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Extract, verify, and filter business contacts across India with AI pitch analysis & direct Excel export.
            </p>
          </div>
        </div>

        <Link
          href="/datapal"
          className="relative z-10 flex items-center gap-2 px-4 py-2 rounded-xl btn-gold-gradient font-bold text-xs shadow-md transition-all hover:brightness-105 active:scale-[0.98] shrink-0 cursor-pointer"
        >
          <span>Launch DataPal Studio</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {categories.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all btn-tactile cursor-pointer ${
              selectedCategory === cat.id
                ? "bg-brass text-white shadow-xs"
                : "bg-surface border border-line text-text-muted hover:text-text"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Interactive Tool Pop-Up Modal */}
      {mounted && activeTool && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 m-0 z-[9999] bg-slate-950/75 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
          onClick={() => setActiveToolId(null)}
        >
          <div
            className="max-w-2xl w-full bg-white dark:bg-[#121016] border border-slate-200 dark:border-[#2D2722] rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            {/* Pop-Up Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#2D2722] flex items-center justify-between bg-slate-50/80 dark:bg-[#18161D] shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 dark:bg-[#122128] dark:border-[rgba(14,156,174,0.30)] flex items-center justify-center text-cyan-600 dark:text-[#0E9CAE] shrink-0">
                  {activeTool.hasInteractiveCalculator ? (
                    <Calculator className="w-5 h-5" />
                  ) : (
                    <Wrench className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#EBE7DF] truncate">
                      {activeTool.name}
                    </h2>
                    {activeTool.badge && (
                      <span className="text-[9px] px-2 py-0.5 rounded-md font-mono font-semibold uppercase bg-slate-100 dark:bg-[#18161D] border border-slate-200 dark:border-[#2D2722] text-cyan-700 dark:text-[#0E9CAE] shrink-0">
                        {activeTool.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-[#97928E] truncate mt-0.5">
                    {activeTool.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveToolId(null)}
                className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 dark:text-[#726C66] dark:hover:text-[#EBE7DF] dark:hover:bg-[#1C1A22] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0 ml-2"
                title="Close calculator (Esc)"
              >
                <span className="hidden sm:inline">Close</span>
                <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded bg-white dark:bg-[#18161D] border border-slate-200 dark:border-[#2D2722] font-mono text-slate-500 dark:text-[#97928E]">
                  ESC
                </kbd>
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Scrollable Pop-Up Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 bg-white dark:bg-[#121016]">
              {!activeTool.hasInteractiveCalculator ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Pop-Up Calculator Disabled
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Interactive Calculator Mode Disabled
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      The interactive calculator engine for <strong className="text-slate-800 dark:text-slate-200">{activeTool.name}</strong> has been toggled off by the platform administrator in Super Admin.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 text-left text-xs space-y-2 max-w-lg mx-auto">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      <span>Tool Specifications</span>
                      <span className="font-mono text-cyan-600 dark:text-cyan-400">{activeTool.badge}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {activeTool.description}
                    </p>
                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Category: <strong className="uppercase text-slate-600 dark:text-slate-300">{activeTool.category}</strong></span>
                      <span>Required Plan: <strong className="text-slate-600 dark:text-slate-300">{activeTool.requiredPlan.charAt(0).toUpperCase() + activeTool.requiredPlan.slice(1)}+</strong></span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                    <Link
                      href={`/chat?message=${encodeURIComponent(`Run comprehensive diagnostic simulation on ${activeTool.name} with current enterprise benchmarks.`)}`}
                      className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs btn-tactile inline-flex items-center gap-2 shadow-xs transition-colors"
                    >
                      <Bot className="w-4 h-4" />
                      <span>Execute in AI Workspace</span>
                    </Link>
                    <Link
                      href="/simulator"
                      className="px-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-800 dark:text-white font-bold text-xs btn-tactile inline-flex items-center gap-2 transition-colors shadow-xs"
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Monthly Gross Revenue (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={calcRevenue ? formatINR(calcRevenue) : ""}
                            onChange={e => setCalcRevenue(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 12,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Cost of Goods Sold / Delivery (COGS) (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={calcCogs ? formatINR(calcCogs) : ""}
                            onChange={e => setCalcCogs(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 3,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Operating Expenses (Payroll + Rent + Cloud) (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={calcOpex ? formatINR(calcOpex) : ""}
                            onChange={e => setCalcOpex(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 4,50,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Real-Time Profitability Output
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Gross Margin</div>
                              <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                {grossMargin}%
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                ₹{grossProfit.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Net Margin</div>
                              <div
                                className={`text-base font-extrabold font-mono ${
                                  netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                {netMargin}%
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                ₹{netProfit.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, analyze our current net margin of ${netMargin}% on ₹${calcRevenue.toLocaleString("en-IN")} monthly revenue. What are the best cost levers to improve operating cash?`)}`}
                            className="w-full block py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Consult Marcus (CFO AI) →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Monthly Total Fixed Overheads (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={fixedCosts ? formatINR(fixedCosts) : ""}
                            onChange={e => setFixedCosts(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 2,50,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Average Selling Price Per Contract (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={pricePerUnit ? formatINR(pricePerUnit) : ""}
                            onChange={e => setPricePerUnit(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 25,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Direct Variable Cost Per Contract (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={variableCostPerUnit ? formatINR(variableCostPerUnit) : ""}
                            onChange={e => setVariableCostPerUnit(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 5,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Break-Even Solvency Requirement
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Target Deals / Units</div>
                              <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                {breakevenUnits} contracts
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">per month</div>
                            </div>
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Required Revenue</div>
                              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                ₹{breakevenRevenue.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">at break-even</div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, our break-even target is ₹${breakevenRevenue.toLocaleString("en-IN")} across ${breakevenUnits} contracts/mo. What's our quickest path to achieving this?`)}`}
                            className="w-full block py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Analyze with CFO AI →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Total Monthly Sales & Marketing Outlay (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={marketingSpend ? formatINR(marketingSpend) : ""}
                            onChange={e => setMarketingSpend(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 2,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            New Customers Signed This Month
                          </label>
                          <input
                            type="number"
                            value={acquiredCustomers}
                            onChange={e => setAcquiredCustomers(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Annual Revenue Per Customer (ACV) (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={avgRevenuePerAccount ? formatINR(avgRevenuePerAccount) : ""}
                            onChange={e => setAvgRevenuePerAccount(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 60,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Unit Acquisition & Lifetime Value
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Blended CAC</div>
                              <div className="text-xs sm:text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                                ₹{calculatedCAC.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Customer LTV</div>
                              <div className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                ₹{calculatedLTV.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">LTV / CAC</div>
                              <div className="text-xs sm:text-sm font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                {ltvToCacRatio}x
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Elena, evaluate our LTV to CAC ratio of ${ltvToCacRatio}x (CAC: ₹${calculatedCAC.toLocaleString("en-IN")}, LTV: ₹${calculatedLTV.toLocaleString("en-IN")}). How should we optimize our demand funnel?`)}`}
                            className="w-full block py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Consult Elena (Marketing AI) on CAC →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Current Bank Balance / Cash Reserve (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={cashReserve ? formatINR(cashReserve) : ""}
                            onChange={e => setCashReserve(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 50,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Monthly Inflow / Collections (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={monthlyInflow ? formatINR(monthlyInflow) : ""}
                            onChange={e => setMonthlyInflow(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 15,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Monthly Outflow / Net Burn (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={monthlyBurn ? formatINR(monthlyBurn) : ""}
                            onChange={e => setMonthlyBurn(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 20,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Runway & Liquidity Telemetry
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Net Monthly Cash Flow</div>
                              <div className={`text-base font-extrabold font-mono ${netCashFlow >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                {netCashFlow >= 0 ? `+₹${netCashFlow.toLocaleString("en-IN")}` : `-₹${Math.abs(netCashFlow).toLocaleString("en-IN")}`}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">per month</div>
                            </div>
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Projected Runway</div>
                              <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                {runwayMonths === "Profitable" ? "Infinite" : `${runwayMonths} Mo`}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">at current burn</div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, our cash runway is ${runwayMonths} months with net monthly outflow of ₹${Math.abs(netCashFlow).toLocaleString("en-IN")}. What cash stabilization steps do you advise?`)}`}
                            className="w-full block py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Plan Cash Runway with Marcus →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Total Investment / Capital Outlay (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={roiCost ? formatINR(roiCost) : ""}
                            onChange={e => setRoiCost(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 6,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Expected Annual Returns / Cost Savings (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={roiBenefit ? formatINR(roiBenefit) : ""}
                            onChange={e => setRoiBenefit(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 18,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Return on Investment Dynamics
                          </span>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Net Annual ROI</div>
                              <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                {roiPercentage}%
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                +₹{netBenefit.toLocaleString("en-IN")}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Payback Period</div>
                              <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                {paybackMonths} Mo
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">to break-even</div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Evaluate capital allocation for ${activeTool.name} with expected ${roiPercentage}% ROI and ${paybackMonths} months payback.`)}`}
                            className="w-full block py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Loan / Equipment Financing Amount (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={emiPrincipal ? formatINR(emiPrincipal) : ""}
                            onChange={e => setEmiPrincipal(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 25,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Annual Interest Rate (%)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={emiRateAnnual}
                              onChange={e => setEmiRateAnnual(Number(e.target.value) || 0)}
                              placeholder="e.g. 11.5"
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Tenure (Months)
                            </label>
                            <input
                              type="number"
                              value={emiTenureMonths}
                              onChange={e => setEmiTenureMonths(Number(e.target.value) || 0)}
                              placeholder="e.g. 36"
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Amortization & Debt Service Telemetry
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Monthly EMI</div>
                              <div className="text-sm sm:text-base font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                ₹{emiMonthlyAmount.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {emiTenureMonths} installments
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Interest</div>
                              <div className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                                ₹{emiTotalInterest.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Total: ₹{emiTotalPayment.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 text-xs flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 text-[11px]">Monthly Burn Impact:</span>
                            <span className="font-bold text-amber-500 font-mono text-[11px]">{emiBurnImpact}% of OPEX</span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, evaluate a business loan EMI of ₹${emiMonthlyAmount.toLocaleString("en-IN")}/mo on ₹${emiPrincipal.toLocaleString("en-IN")} borrowing. What is our optimal debt-to-cash strategy?`)}`}
                            className="w-full block py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Consult Marcus (CFO AI) on Loan Amortization →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Base Transaction Value / Invoice Amount (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={gstAmount ? formatINR(gstAmount) : ""}
                            onChange={e => setGstAmount(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 1,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            GST Slab Rate
                          </label>
                          <div className="grid grid-cols-4 gap-1.5">
                            {[5, 12, 18, 28].map(r => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setGstRate(r)}
                                className={`py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                  gstRate === r
                                    ? "bg-cyan-600 text-white border-cyan-600 shadow-xs"
                                    : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300"
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
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              !gstIsInterState
                                ? "bg-cyan-600 text-white border-cyan-600"
                                : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            Intra-State (CGST+SGST)
                          </button>
                          <button
                            type="button"
                            onClick={() => setGstIsInterState(true)}
                            className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all ${
                              gstIsInterState
                                ? "bg-cyan-600 text-white border-cyan-600"
                                : "bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            Inter-State (IGST)
                          </button>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Eligible Input Tax Credit (ITC) Available (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={gstItc ? formatINR(gstItc) : ""}
                            onChange={e => setGstItc(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 8,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Tax Assessment & Compliance
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Total GST</div>
                              <div className="text-sm sm:text-base font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                ₹{calculatedGST.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {!gstIsInterState ? `CGST ₹${gstCgst.toLocaleString("en-IN")} + SGST ₹${gstSgst.toLocaleString("en-IN")}` : `IGST ₹${gstIgst.toLocaleString("en-IN")}`}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-500 dark:text-slate-400">Net Tax Payable (after ITC)</div>
                              <div className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                                ₹{gstNetPayable.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                Invoice Gross: ₹{gstGrossTotal.toLocaleString("en-IN")}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, analyze our GST cash outflow of ₹${gstNetPayable.toLocaleString("en-IN")} after ₹${gstItc.toLocaleString("en-IN")} ITC offset. How should we optimize working capital around GST filing deadlines?`)}`}
                            className="w-full block py-2.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Verify GST Filing with CFO AI →
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
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Annual Revenue (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcRevenue ? formatINR(wcRevenue) : ""}
                              onChange={e => setWcRevenue(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Accounts Receivable (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcReceivables ? formatINR(wcReceivables) : ""}
                              onChange={e => setWcReceivables(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Annual COGS / Direct (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcCogs ? formatINR(wcCogs) : ""}
                              onChange={e => setWcCogs(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Inventory Value (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={wcInventory ? formatINR(wcInventory) : ""}
                              onChange={e => setWcInventory(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Accounts Payable to Vendors (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={wcPayables ? formatINR(wcPayables) : ""}
                            onChange={e => setWcPayables(Number(parseINR(e.target.value)) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Working Capital & Cash Velocity
                          </span>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="p-2 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 text-center">
                              <div className="text-[9px] text-slate-400">DSO (Receivables)</div>
                              <div className="text-xs sm:text-sm font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">{wcDso} d</div>
                            </div>
                            <div className="p-2 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 text-center">
                              <div className="text-[9px] text-slate-400">DIO (Inventory)</div>
                              <div className="text-xs sm:text-sm font-extrabold text-amber-500 font-mono">{wcDio} d</div>
                            </div>
                            <div className="p-2 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 text-center">
                              <div className="text-[9px] text-slate-400">DPO (Payables)</div>
                              <div className="text-xs sm:text-sm font-extrabold text-emerald-500 font-mono">{wcDpo} d</div>
                            </div>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">Cash Conversion Cycle (CCC):</span>
                            <span className="font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">{wcCcc} Days</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 flex items-center justify-between text-xs">
                            <span className="text-slate-500 text-[11px]">Trapped Working Capital:</span>
                            <span className="font-extrabold text-slate-900 dark:text-white font-mono">₹{wcTrappedCash.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, our cash conversion cycle is ${wcCcc} days with ₹${wcTrappedCash.toLocaleString("en-IN")} trapped in working capital. How do we compress DSO from ${wcDso} days?`)}`}
                            className="w-full block py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Optimize Cash Conversion with Marcus →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Standard Deal / Contract Price (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={discDealPrice ? formatINR(discDealPrice) : ""}
                            onChange={e => setDiscDealPrice(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 5,00,000"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Standard Gross Margin (%)
                            </label>
                            <input
                              type="number"
                              value={discBaseMargin}
                              onChange={e => setDiscBaseMargin(Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Proposed Discount (%)
                            </label>
                            <input
                              type="number"
                              value={discPercent}
                              onChange={e => setDiscPercent(Number(e.target.value) || 0)}
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Margin Erosion Diagnostics
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-400">Discounted Price</div>
                              <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                                ₹{discDiscountedPrice.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-rose-500 mt-0.5">
                                Margin: {discNewMargin}% (was {discBaseMargin}%)
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-400">Extra Volume Needed</div>
                              <div className="text-sm font-extrabold text-amber-500 font-mono">
                                +{discExtraVolumeNeeded}%
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                to match base profit
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, our sales rep wants to offer a ${discPercent}% discount on a ₹${discDealPrice.toLocaleString("en-IN")} deal. This drops our gross margin from ${discBaseMargin}% to ${discNewMargin}% and requires ${discExtraVolumeNeeded}% more volume. Should we approve this discount?`)}`}
                            className="w-full block py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Analyze Discount Risk with Marcus →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Starting Month MRR (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={nrrStartingMrr ? formatINR(nrrStartingMrr) : ""}
                            onChange={e => setNrrStartingMrr(Number(parseINR(e.target.value)) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Churned / Lost MRR (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={nrrChurnMrr ? formatINR(nrrChurnMrr) : ""}
                              onChange={e => setNrrChurnMrr(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs text-rose-500"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Expansion / Upsell MRR (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={nrrExpansionMrr ? formatINR(nrrExpansionMrr) : ""}
                              onChange={e => setNrrExpansionMrr(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs text-emerald-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            New Signups / Inbound MRR (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={nrrNewMrr ? formatINR(nrrNewMrr) : ""}
                            onChange={e => setNrrNewMrr(Number(parseINR(e.target.value)) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            Retention & Expansion Benchmarks
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-400">Net Revenue Retention</div>
                              <div className={`text-base font-extrabold font-mono ${Number(nrrPercentage) >= 100 ? "text-emerald-500" : "text-amber-500"}`}>
                                {nrrPercentage}%
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">GRR: {nrrGrr}%</div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-400">Ending MRR</div>
                              <div className="text-base font-extrabold text-cyan-600 dark:text-cyan-400 font-mono">
                                ₹{nrrEndingMrr.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-emerald-500 mt-0.5 font-mono">
                                +₹{nrrNetGain.toLocaleString("en-IN")}/mo
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Astra & Marcus, our current Net Revenue Retention is ${nrrPercentage}% with ₹${nrrChurnMrr.toLocaleString("en-IN")} monthly churn. What accounts are at risk and how do we drive account expansion?`)}`}
                            className="w-full block py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Review Retention Playbook with Astra →
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
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Annual Base CTC / Salary (₹)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={empBaseCtc ? formatINR(empBaseCtc) : ""}
                            onChange={e => setEmpBaseCtc(Number(parseINR(e.target.value)) || 0)}
                            placeholder="e.g. 12,00,000"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              Statutory & Benefits (%)
                            </label>
                            <input
                              type="number"
                              value={empBenefitsPct}
                              onChange={e => setEmpBenefitsPct(Number(e.target.value) || 0)}
                              placeholder="e.g. 18 (PF, Health)"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs"
                            />
                          </div>
                          <div>
                            <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                              SaaS Tools & Hardware / yr (₹)
                            </label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={empToolsAnnual ? formatINR(empToolsAnnual) : ""}
                              onChange={e => setEmpToolsAnnual(Number(parseINR(e.target.value)) || 0)}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="font-semibold text-slate-700 dark:text-slate-200 block mb-1">
                            Target Billable Hours / Year
                          </label>
                          <input
                            type="number"
                            value={empBillableHours}
                            onChange={e => setEmpBillableHours(Number(e.target.value) || 0)}
                            placeholder="e.g. 1,500 hrs"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-6 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 flex flex-col justify-between space-y-3">
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                            True Headcount Economics
                          </span>
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-400">Total Loaded Annual Cost</div>
                              <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                                ₹{empLoadedAnnual.toLocaleString("en-IN")}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                ₹{empLoadedMonthly.toLocaleString("en-IN")}/mo burn
                              </div>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white dark:bg-[#18161D] dark:border-[#2D2722] border border-slate-200 dark:border-white/10 shadow-xs">
                              <div className="text-[10px] text-slate-400">Min Client Billing Rate</div>
                              <div className="text-sm font-extrabold text-emerald-500 font-mono">
                                ₹{empBillingRate}/hr
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                (Cost: ₹{empHourlyCost}/hr @ 40% margin)
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                          <Link
                            href={`/chat?message=${encodeURIComponent(`Marcus, an employee with ₹${empBaseCtc.toLocaleString("en-IN")} base CTC costs us ₹${empLoadedAnnual.toLocaleString("en-IN")} fully loaded. How should we price their services to maintain 40% gross margins?`)}`}
                            className="w-full block py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs text-center btn-tactile transition-colors shadow-xs"
                          >
                            Evaluate Hiring Economics with Marcus →
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Fallback interactive sandbox for any other tool with calculator enabled */}
                  {!["profit", "breakeven", "cac", "ltv", "cashflow", "roi", "emi", "gst", "working_capital", "discount_margin", "nrr", "loaded_cost"].includes(activeTool.id) && (
                    <div className="p-6 rounded-xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-center space-y-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mx-auto">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {activeTool.name} Interactive Engine
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                          Configured with active ledger parameters for {activeTool.name}. You can calibrate assumptions or execute a full simulation in AI Workspace.
                        </p>
                      </div>
                      <div className="pt-3 flex items-center justify-center gap-3">
                        <Link
                          href={`/chat?message=${encodeURIComponent(`Open ${activeTool.name} analysis with relevant operational telemetry.`)}`}
                          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-500 dark:hover:bg-cyan-600 text-white font-bold text-xs btn-tactile inline-flex items-center gap-2 shadow-xs transition-colors"
                        >
                          <Bot className="w-4 h-4" />
                          <span>Launch in AI Workspace</span>
                        </Link>
                        <Link
                          href="/simulator"
                          className="px-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 hover:border-slate-300 text-slate-800 dark:text-white font-bold text-xs btn-tactile inline-flex items-center gap-2 transition-colors shadow-xs"
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

      {/* Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map(tool => {
          const locked = !hasPlanLevel(tool.requiredPlan);
          return (
          <div
            key={tool.id}
            className={`p-4 rounded-xl border border-line bg-surface hover:border-line-strong transition-all flex flex-col justify-between shadow-xs group ${
              locked ? "opacity-60" : ""
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-brass bg-brass-soft px-2 py-0.5 rounded-full">
                  {tool.badge}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border inline-flex items-center gap-1 ${
                    tool.requiredPlan === "starter"
                      ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
                      : tool.requiredPlan === "growth"
                      ? "text-purple-400 bg-purple-400/10 border-purple-400/20"
                      : tool.requiredPlan === "enterprise"
                      ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
                      : "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
                  }`}
                >
                  {locked && <Lock className="w-2.5 h-2.5" />}
                  {tool.requiredPlan.charAt(0).toUpperCase() + tool.requiredPlan.slice(1)}+
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-text group-hover:text-brass transition-colors">
                  {tool.name}
                </h3>
                <p className="text-[11px] text-text-muted mt-1 leading-relaxed line-clamp-2">
                  {tool.description}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-3 border-t border-line flex items-center justify-between">
              <button
                type="button"
                onClick={() => (locked ? setLockedTool(tool) : setActiveToolId(tool.id))}
                className={`text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  locked ? "text-text-muted hover:text-text" : "text-brass hover:underline"
                }`}
              >
                {locked ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Unlock Tool</span>
                  </>
                ) : (
                  <>
                    <span>{tool.hasInteractiveCalculator ? "Launch Calculator" : "Inspect Tool"}</span>
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
              </button>
              <Link
                href={`/chat?message=${encodeURIComponent(`Evaluate our ${tool.name} benchmarks and recommend optimizations.`)}`}
                className="text-[10px] text-text-muted hover:text-text p-1.5 rounded hover:bg-surface-2 transition-colors"
                title="Consult AI Agent"
              >
                <Bot className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
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

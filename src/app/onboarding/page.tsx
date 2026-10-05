"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  Database,
  Layers,
  Target,
  Users,
  TrendingUp,
  AlertTriangle,
  Zap,
  HelpCircle,
  Laptop,
  ShoppingBag,
  Cloud,
  Briefcase,
  Stethoscope,
  Factory,
  Landmark,
  Globe,
  RefreshCw,
  Check,
  CreditCard,
  MessageSquare,
  Calendar,
  LifeBuoy,
  Phone,
  Radio,
  FileSpreadsheet,
  KeyRound,
  Edit3,
  SlidersHorizontal,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";
import { RealToolAuthModal } from "@/components/tools/RealToolAuthModal";

// Proper Indian Numbering System formatting (e.g. 12,00,000 / 1,50,000)
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

// Industry & Business-specific dynamic question schema
interface DynamicQuestion {
  id: string;
  question: string;
  hint: string;
  options: string[];
}

interface DynamicQuestionParams {
  businessType: string;
  businessTypesList?: string[];
  customBusinessType?: string;
  companyName?: string;
  founderName?: string;
  teamSize?: string | number;
  annualRevenue?: string | number;
  monthlyRevenue?: string | number;
  monthlyBurn?: string | number;
  cashOnHand?: string | number;
  website?: string;
  extractedData?: {
    positioning?: string;
    offerings?: string;
    icp?: string;
    metricsNote?: string;
    verifiedDomain?: string;
  };
}

function getQuestionsForType(bType: string, params: DynamicQuestionParams): DynamicQuestion[] {
  const cName = params.companyName?.trim() || "Your Company";
  const fName = params.founderName?.trim() || "Founder";
  const teamNum = Number(params.teamSize) || 1;
  const teamLabel = `${teamNum} team member${teamNum === 1 ? "" : "s"}`;
  const annRevNum = Number(params.annualRevenue) || 0;
  const monthlyRevNum = Number(params.monthlyRevenue) || (annRevNum > 0 ? Math.round(annRevNum / 12) : 0);
  const revLabel = monthlyRevNum > 0 ? `₹${monthlyRevNum.toLocaleString("en-IN")}/mo` : "Pre-revenue / Setting up";
  const burnNum = Number(params.monthlyBurn) || 0;
  const cashNum = Number(params.cashOnHand) || 0;
  const runwayMonths = burnNum > 0 ? (cashNum / burnNum).toFixed(1) : "0.0";

  switch (bType) {
    case "it":
      return [
        {
          id: "it_service_delivery",
          question: `What is the primary scope of ${cName}'s technology delivery?`,
          hint: `Calibrates engineering gross margins, bench idle cost, and cloud pass-throughs for ${cName}'s ${teamLabel}.`,
          options: [
            `Custom Enterprise Software & Web Platforms (${cName} Core)`,
            `Cloud Infrastructure, Managed DevOps & Site Reliability (AWS/Azure)`,
            teamNum > 20
              ? `Dedicated Engineering Squads & Staff Augmentation (${teamLabel})`
              : `Agile Boutique Development Pods (${fName}-Led)`,
            `Cybersecurity, System Audits & Compliance Engineering`,
          ],
        },
        {
          id: "it_contract_duration",
          question: `What is the typical tenure of client engagements for ${cName}?`,
          hint: `Projects forward cash runway (${runwayMonths} mo verified) and pipeline velocity needed to sustain ${revLabel}.`,
          options: [
            `Multi-Year Enterprise Managed Services (2 – 3+ yrs contracts)`,
            `Annual Service Level Agreements & Retainers (12 months)`,
            `6-Month Project Sprints with Milestone Gates`,
            `Ad-Hoc Short Engagements & Proof-of-Concepts (1 – 3 months)`,
          ],
        },
        {
          id: "it_bench_rate",
          question: `What percentage of billable engineers or developers at ${cName} are unallocated on bench?`,
          hint: `Informs CFO Marcus's gross margin protection rules and recruitment triggers across your ${teamLabel}.`,
          options: [
            `Near-Zero Bench / Immediate Hiring Backfill Needed for Pipeline`,
            `Optimal Buffer (< 8% of ${teamLabel} on Bench)`,
            `8% – 18% Bench Reserve Available for Immediate Onboarding`,
            `Over 18% Bench / Operational Utilization Optimization Needed`,
          ],
        },
      ];

    case "saas":
      return [
        {
          id: "saas_pricing_model",
          question: `What is ${cName}'s primary software packaging & pricing model?`,
          hint: `Helps Astra calibrate recurring MRR predictability and expansion revenue models for ${cName}.`,
          options: [
            `Per-Seat / User License Subscriptions (Monthly & Annual)`,
            `Usage-Based / Consumption-Metered Billing`,
            `Tiered Flat-Rate Subscriptions (Starter, Growth, Enterprise)`,
            `High-ACV Custom Enterprise Contracts with Multi-Year Commitments`,
          ],
        },
        {
          id: "saas_sales_motion",
          question: `How do enterprise customers primarily discover and buy from ${cName}?`,
          hint: `Calibrates sales velocity and rep quota benchmarks across your ${teamLabel}.`,
          options: [
            `Product-Led Growth (Self-Serve Trial to Paid Conversion)`,
            `Inbound Inquiries, Demo Requests & Inside Sales Reps`,
            `Outbound Account-Based Enterprise Sales (${fName} / Direct Closing)`,
            `Partner Ecosystem, App Marketplaces & Reseller Network`,
          ],
        },
        {
          id: "saas_annual_churn",
          question: `What is ${cName}'s estimated annual net revenue churn rate?`,
          hint: `Informs CFO Marcus's LTV-to-CAC payback formulas calibrated against ${revLabel} run-rate.`,
          options: [
            `Net Expansion > 110% (Negative Churn / High Account Expansion)`,
            `Under 5% Annual Logo Churn (Top-Tier SaaS Benchmark)`,
            `5% – 12% Annual Churn (Healthy Industry Standard)`,
            `Over 12% Churn / Churn Defense Playbook Active`,
          ],
        },
      ];

    case "d2c":
      return [
        {
          id: "d2c_fulfillment_model",
          question: `How does ${cName} store, fulfill, and dispatch inventory to buyers?`,
          hint: `Used by Operations AI to track stockout exposure and shipping margins across ${teamLabel}.`,
          options: [
            `In-House Dedicated Central Warehouse (${teamLabel} Operations)`,
            `Distributed 3PL Network (Shiprocket, Delhivery, Bluedart)`,
            `Marketplace Fulfillment (Amazon FBA, Flipkart Assured)`,
            `On-Demand Contract Manufacturing Direct Dispatch`,
          ],
        },
        {
          id: "d2c_sku_count",
          question: `How many active product SKUs does ${cName} actively manage?`,
          hint: `Determines working capital lockup and inventory holding costs for your ${revLabel} volume.`,
          options: [
            `Focused Hero Catalog (1 – 15 Core SKUs)`,
            `Expanding Lineup (16 – 75 SKUs)`,
            `Broad Multi-Category Lineup (75 – 250 SKUs)`,
            `High-Volume Enterprise Catalog (250+ SKUs)`,
          ],
        },
        {
          id: "d2c_primary_channel",
          question: `Where does ${cName} acquire the highest order volume and revenue?`,
          hint: `Informs CMO Elena's blended ROAS and repeat purchase modeling.`,
          options: [
            `Direct Brand Website (Shopify, Custom D2C Storefront)`,
            `Marketplaces (Amazon, Flipkart, Myntra)`,
            `Quick-Commerce Platforms (Blinkit, Zepto, Instamart)`,
            `Omnichannel & Offline Retail Stores`,
          ],
        },
      ];

    case "agency":
      return [
        {
          id: "agency_billing_structure",
          question: `What is ${cName}'s standard client agreement structure?`,
          hint: `Directly calculates utilization rates, revenue realization, and margin buffers for ${teamLabel}.`,
          options: [
            `Monthly Rolling Strategic Retainers (Recurring MRR)`,
            `Fixed-Price SOW Milestones with Delivery Gates`,
            `Blended Hourly / Time & Materials Billing`,
            `Performance-Linked / Revenue-Share Model`,
          ],
        },
        {
          id: "agency_client_concentration",
          question: `How many core client accounts represent >60% of ${cName}'s revenue?`,
          hint: `Flags account concentration vulnerabilities against ${revLabel} monthly operations.`,
          options: [
            `1 – 2 Whale Accounts (High Concentration Vulnerability)`,
            `3 – 6 Anchor Accounts (Balanced Core Baseline)`,
            `7 – 15 Diversified Retainer Accounts`,
            `Highly Distributed (No single client represents >10% of revenue)`,
          ],
        },
        {
          id: "agency_team_utilization",
          question: `What is the target billable utilization rate across ${cName}'s ${teamLabel}?`,
          hint: `Used to model capacity triggers before ${fName} takes on new client mandates.`,
          options: [
            `Over 85% (High Billable Load / Near Capacity)`,
            `70% – 85% (Optimal Creative & Execution Balance)`,
            `50% – 70% (Capacity Available for Immediate Scaling)`,
            `Under 50% / Service Repositioning Underway`,
          ],
        },
      ];

    case "real_estate":
      return [
        {
          id: "re_portfolio_scope",
          question: `What is the primary asset mix in ${cName}'s portfolio?`,
          hint: `Calibrates capital depreciation, rental yield spreads, and asset valuation models.`,
          options: [
            `Commercial Grade-A Office & Tech Park Leasing`,
            `Residential Multi-Family Developments & Communities`,
            `Industrial Logistics, Warehousing & Cold Storage`,
            `Land Parcels & Mixed-Use Masterplans`,
          ],
        },
        {
          id: "re_revenue_engine",
          question: `What drives the primary cash collection rhythm for ${cName}?`,
          hint: `Shapes forward liquidity horizons and debt-service coverage against ${revLabel}.`,
          options: [
            `Predictable Monthly Long-Term Commercial Leases`,
            `Brokerage, Transaction & Syndication Commissions`,
            `Property Asset Management & Maintenance Retainers`,
            `Project Construction Milestone Drawdowns`,
          ],
        },
        {
          id: "re_average_occupancy",
          question: `What is the current average occupancy or leasing rate across ${cName}'s portfolio?`,
          hint: `Sets yield compression alarms across your ${teamLabel} asset management.`,
          options: [
            `Over 92% (Near Full Capacity / Prime Occupancy)`,
            `80% – 92% (Healthy Operational Baseline)`,
            `65% – 80% (Active Tenant Leasing Drive Underway)`,
            `Under 65% / Renovation & Repositioning Phase`,
          ],
        },
      ];

    case "healthcare":
      return [
        {
          id: "hc_practice_model",
          question: `What is the primary operational structure of ${cName}?`,
          hint: `Calibrates equipment amortization, practitioner payout ratios, and patient throughput.`,
          options: [
            `Multi-Specialty Hospital or Day-Surgery Center`,
            `Outpatient Specialty Clinic Chain / Diagnostic Network`,
            `Digital Tele-Health & Remote Patient Monitoring`,
            `Dental, Aesthetic & Preventive Wellness Center`,
          ],
        },
        {
          id: "hc_acquisition",
          question: `How does ${cName} primarily acquire and schedule patient consultations?`,
          hint: `Informs patient lifetime value and clinic expansion thresholds for ${teamLabel}.`,
          options: [
            `Direct Walk-Ins & Community Practitioner Referrals`,
            `Digital Marketing, Website & Online Tele-Consult Portals`,
            `Corporate Health Checkups & Insurer Empanelments`,
            `Recurring Chronic Care / Patient Subscription Memberships`,
          ],
        },
        {
          id: "hc_turnaround",
          question: `What is the typical appointment or diagnostic turnaround time at ${cName}?`,
          hint: `Identifies clinical throughput bottlenecks and staff scheduling efficiency for ${teamLabel}.`,
          options: [
            `Same-Day Walk-In Consultations & Rapid Diagnostics`,
            `Scheduled Within 24 – 48 Hours`,
            `Advance Multi-Week Procedure Scheduling`,
            `Custom Multi-Stage Treatment Protocol Care Plans`,
          ],
        },
      ];

    case "manufacturing":
      return [
        {
          id: "mfg_production_model",
          question: `What is ${cName}'s primary manufacturing and production model?`,
          hint: `Calibrates plant capacity utilization, machine maintenance, and raw material cycles.`,
          options: [
            `In-House Dedicated Manufacturing Facility (${teamLabel})`,
            `Contract / OEM Third-Party Manufacturing Partners`,
            `Custom Make-to-Order (MTO) Engineering Fabrication`,
            `High-Volume Continuous Batch Processing`,
          ],
        },
        {
          id: "mfg_lead_time",
          question: `What is the average lead time from customer purchase order to dispatch at ${cName}?`,
          hint: `Informs working capital cycles and inventory holding buffers for ${revLabel} volume.`,
          options: [
            `Under 48 Hours (Ready Stock / Fast-Moving Goods)`,
            `1 – 3 Weeks (Standard Production Batch Cycle)`,
            `1 – 3 Months (Custom Engineered / High-Value Equipment)`,
            `Project-Based Multi-Month Staged Deliveries`,
          ],
        },
        {
          id: "mfg_distribution",
          question: `How does ${cName} primarily distribute products to end buyers?`,
          hint: `Maps channel partner margins, dealer incentives, and receivables aging.`,
          options: [
            `Direct Enterprise B2B Supply Contracts`,
            `Authorized Dealer & Distributor Network Across India`,
            `OEM Tier-1/Tier-2 Supplier to Industrial Brands`,
            `D2C & Direct Commercial Procurement Channels`,
          ],
        },
      ];

    case "finance":
      return [
        {
          id: "fin_revenue_mech",
          question: `What is ${cName}'s primary revenue generation mechanism?`,
          hint: `Determines fee collection schedules and liquidity models for ${cName}.`,
          options: [
            `Asset-Based AUM % Retainer Fee`,
            `Transaction Success Fees & Syndicate Placement Spreads`,
            `Fixed Advisory Retainers & Corporate Mandates`,
            `Net Interest Margin (NIM) on Loan & Credit Portfolios`,
          ],
        },
        {
          id: "fin_client_segment",
          question: `What is the primary client segment serviced by ${cName}?`,
          hint: `Calibrates regulatory compliance, KYC depth, and onboarding friction.`,
          options: [
            `High Net Worth Individuals (HNIs) & Family Offices`,
            `Mid-Market Corporations & Growing Enterprises`,
            `Retail Investors & Direct Retail Borrowers`,
            `Institutional Funds & Sovereign Portfolios`,
          ],
        },
        {
          id: "fin_compliance",
          question: `What is the governance and regulatory compliance reporting framework at ${cName}?`,
          hint: `Monitors audit readiness and risk management protocols for your ${teamLabel}.`,
          options: [
            `SEBI / RBI Licensed & Regulated Entity`,
            `Standard Corporate Advisory / Non-Custodial Intermediary`,
            `AMFI Registered Distributor / Advisory Firm`,
            `Fintech / Tech Platform Partnered with Regulated NBFC/Bank`,
          ],
        },
      ];

    default: {
      // Custom Industry / Others
      const customLabel = params.customBusinessType?.trim() || "Custom Business";
      return [
        {
          id: "custom_operating_model",
          question: `What is the core revenue engine and delivery model for ${cName} in ${customLabel}?`,
          hint: `Calibrates operating rhythm, pricing structure, and margin buffers for ${cName}'s ${teamLabel}.`,
          options: [
            `B2B Long-Term Contracts & Managed Deliverables in ${customLabel}`,
            `Direct High-Volume Transactions & Fulfillment`,
            `Recurring Retainers & Membership Subscriptions`,
            `Specialized Project Execution & Advisory Mandates`,
          ],
        },
        {
          id: "custom_sales_cycle",
          question: `What is the typical sales cycle and client contract tenure for ${cName}?`,
          hint: `Projects forward cash runway (${runwayMonths} mo) and pipeline replenishment needed to sustain ${revLabel}.`,
          options: [
            `Multi-Year Strategic Engagements (2 – 3+ yrs)`,
            `Annual Contracts with Scheduled Milestones (12 months)`,
            `3 – 6 Month Project Deployments`,
            `Short-Cycle / Rapid Transactions (< 30 days)`,
          ],
        },
        {
          id: "custom_core_bottleneck",
          question: `Where is the largest operational constraint or bottleneck across ${cName}'s ${teamLabel} today?`,
          hint: `Directly primes Astra and Marcus's initial Gap Register and task delegation for ${fName}.`,
          options: [
            `Founder (${fName}) Being the Single Point of Contact & Sale`,
            `Working Capital Lockup & Delayed Customer Collections`,
            `Sales Pipeline Inconsistency & Conversion Deceleration`,
            `Talent Quality, Project Handover & Mid-Management Friction`,
          ],
        },
      ];
    }
  }
}

function getDynamicQuestions(params: DynamicQuestionParams): DynamicQuestion[] {
  const types = params.businessTypesList && params.businessTypesList.length > 0
    ? params.businessTypesList
    : [params.businessType || "it"];

  if (types.length === 1) {
    return getQuestionsForType(types[0], params);
  }

  // When multiple business types/categories are selected, gather questions across sectors
  const collected: DynamicQuestion[] = [];
  const seenIds = new Set<string>();

  // Take top 2 questions from each selected type up to a max of 6 questions
  const questionsPerType = types.length <= 2 ? 2 : 1;

  for (const t of types) {
    const questions = getQuestionsForType(t, params);
    let added = 0;
    for (const q of questions) {
      if (!seenIds.has(q.id) && added < questionsPerType) {
        seenIds.add(q.id);
        collected.push(q);
        added++;
      }
    }
  }

  return collected.length > 0 ? collected : getQuestionsForType(types[0], params);
}

const TOOLS_OPTIONS = [
  {
    id: "google",
    name: "Google Account & Workspace",
    category: "Email, Calendar & Live OAuth",
    description: "Connect your Google account to sync your calendar, Gmail briefings, Drive files and Docs, so BizzPal always works from your real schedule and documents.",
  },
  {
    id: "microsoft",
    name: "Microsoft 365 & Teams",
    category: "Enterprise Cloud & SSO",
    description: "Connect Microsoft 365 to bring in Outlook email and calendar, OneDrive files and Teams alerts, with single sign-on for your whole team.",
  },
  {
    id: "linkedin",
    name: "LinkedIn Company & Ads",
    category: "B2B Social & Lead Generation",
    description: "Connect your LinkedIn page to track follower growth, ad campaign returns, B2B lead generation and executive posts in one place.",
  },
  {
    id: "meta",
    name: "Meta Business & Instagram",
    category: "Ad Spends, Instagram & WhatsApp",
    description: "Connect Meta Business to track Facebook and Instagram ad performance, acquisition cost and return on spend, Pixel events and WhatsApp conversations.",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments & Revenue",
    description: "Connect Stripe to automatically sync invoices, subscription revenue, refunds and daily cash inflow, so your numbers are always current.",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Team Communication",
    description: "Connect Slack to receive executive channel alerts and cash-runway warnings, and to ask the BizzPal assistant questions right where your team works.",
  },
  {
    id: "zoho_books",
    name: "Zoho Books / QuickBooks",
    category: "Accounting & Ledgers",
    description: "Connect Zoho Books to sync your profit and loss, vendor expenses and GST reconciliation, and to track your monthly burn automatically.",
  },
  {
    id: "help_desk",
    name: "Help Desk (Zendesk / Freshdesk)",
    category: "Support & Customer Health",
    description: "Connect your help desk to monitor escalated tickets, response times and early signs of customer churn.",
  },
];

const INDUSTRY_PRIORITIES: Record<string, { id: string; title: string; detail: string; category: string; recommended?: boolean }[]> = {
  saas: [
    {
      id: "saas_churn",
      title: "Reduce Churn & Expand Net Revenue Retention (NRR)",
      detail: "Set automated alert triggers on usage drops and account friction prior to contract renewals.",
      category: "Retention",
      recommended: true,
    },
    {
      id: "saas_cac",
      title: "Shorten CAC Payback Period Below 12 Months",
      detail: "Audit paid acquisition channel saturation and optimize conversion to sales demo.",
      category: "Growth",
      recommended: true,
    },
    {
      id: "extend_runway",
      title: "Extend Cash Runway & Control Cloud Server Burn",
      detail: "Audit AWS/GCP workloads and discretionary vendor subscriptions to stretch runway.",
      category: "Financial",
    },
    {
      id: "saas_pricing",
      title: "Reprice Tiers & Seat-Based Monetization",
      detail: "Simulate pricing tier elasticities and annual contract upfront advances.",
      category: "Pricing",
    },
    {
      id: "founder_bottleneck",
      title: "Remove Founder Bottleneck from Enterprise Closing",
      detail: "Codify closing playbook so sales team can demo and close independently.",
      category: "Operations",
    },
    {
      id: "board_intelligence",
      title: "Automate Board-Ready ARR Reporting & Telemetry",
      detail: "Instrument real-time ARR waterfall, cohort telemetry, and gap diagnostics.",
      category: "Strategy",
    },
  ],
  it: [
    {
      id: "it_util",
      title: "Elevate Billable Engineering Utilisation (>82%)",
      detail: "Maximize client realization hours and minimize bench idle burn.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "it_concentration",
      title: "Eliminate Single-Client Account Concentration Risk",
      detail: "De-risk primary client representing >25% of company revenues.",
      category: "Risk",
      recommended: true,
    },
    {
      id: "it_retainers",
      title: "Transition from T&M to High-Margin Managed Retainers",
      detail: "Productize recurring SLAs with upfront quarterly billing cycles.",
      category: "Pricing",
    },
    {
      id: "it_bench",
      title: "Optimize Developer Bench & Accelerate Sourcing",
      detail: "Reduce recruitment cycles and align talent bench to forward project pipeline.",
      category: "Talent",
    },
    {
      id: "founder_bottleneck",
      title: "Standardize Delivery Playbooks & Eliminate Founder Reviews",
      detail: "Empower project leads to run client scrums and milestone sign-offs independently.",
      category: "Operations",
    },
    {
      id: "it_collections",
      title: "Accelerate Milestone Cash Collections & Reduce DSO",
      detail: "Enforce payment milestones before staging release to protect cash flow.",
      category: "Financial",
    },
  ],
  d2c: [
    {
      id: "d2c_roas",
      title: "Improve Blended ROAS & Lower First-Order CAC",
      detail: "Audit Meta/Google ad efficiency, creative fatigue, and landing page dropoffs.",
      category: "Acquisition",
      recommended: true,
    },
    {
      id: "d2c_inventory",
      title: "Prevent Stockouts & Shorten Cash Conversion Cycle",
      detail: "Synchronize inventory reorder lead times with working capital availability.",
      category: "Supply Chain",
      recommended: true,
    },
    {
      id: "d2c_rto",
      title: "Reduce Courier Return-to-Origin (RTO) Losses",
      detail: "Implement OTP address verification and COD-to-prepaid customer conversion.",
      category: "Logistics",
    },
    {
      id: "d2c_ltv",
      title: "Elevate Repeat Purchase Frequency & 90-Day LTV",
      detail: "Automate post-purchase WhatsApp and email re-engagement flows.",
      category: "Retention",
    },
    {
      id: "d2c_margins",
      title: "Protect Contribution Margin After Packaging & Shipping",
      detail: "Model unit economics elasticity against carrier courier rate increases.",
      category: "Pricing",
    },
  ],
  real_estate: [
    {
      id: "re_occupancy",
      title: "Elevate Portfolio Occupancy & Commercial Yields",
      detail: "Accelerate tenant acquisition pipeline and optimize long-term lease spreads.",
      category: "Revenue",
      recommended: true,
    },
    {
      id: "re_closing",
      title: "Shorten High-Ticket Deal Closing & Syndication Velocity",
      detail: "Standardize investor diligence data room and automate buyer follow-ups.",
      category: "Sales",
      recommended: true,
    },
    {
      id: "re_collections",
      title: "Automate Rent Invoicing & Overdue Escalations",
      detail: "Eliminate overdue tenant arrears with automated GST reconciliation.",
      category: "Cash Flow",
    },
    {
      id: "re_dscr",
      title: "De-risk Debt-Service Coverage Ratio (DSCR)",
      detail: "Stress-test debt amortization obligations against fluctuating tenant vacancy.",
      category: "Financial",
    },
    {
      id: "re_pipeline",
      title: "Centralize Broker Partner Network & Commission Tracking",
      detail: "Instrument channel partner visibility and prevent broker leakages.",
      category: "Operations",
    },
  ],
  agency: [
    {
      id: "agency_founder",
      title: "Break Past Founder-Led Sales & Deal Dependency",
      detail: "Systematize inbound pitch decks and enable Account Executives to close.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "agency_margins",
      title: "Eliminate Project Scope Creep & Margin Erosion",
      detail: "Track client revisions and automate change-request billings.",
      category: "Profitability",
      recommended: true,
    },
    {
      id: "agency_retainers",
      title: "Convert One-Off Projects into Recurring Monthly Retainers",
      detail: "Package ongoing strategic advisory and maintenance retainers.",
      category: "Revenue",
    },
    {
      id: "agency_dso",
      title: "Accelerate Client Receivable Collections (DSO < 30 Days)",
      detail: "Automate milestone invoicing and require retainer payments at month start.",
      category: "Cash Flow",
    },
    {
      id: "agency_churn",
      title: "Standardize Client Onboarding & Account Retention",
      detail: "Set up 30-60-90 day milestone review cadences to prevent account churn.",
      category: "Retention",
    },
  ],
  healthcare: [
    {
      id: "health_throughput",
      title: "Maximize Doctor & Procedure Room Utilisation",
      detail: "Balance clinical appointment scheduling and reduce idle room hours.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "health_noshow",
      title: "Lower Patient Appointment No-Show Rate Below 5%",
      detail: "Automate WhatsApp appointment confirmations and 24-hour reminders.",
      category: "Retention",
      recommended: true,
    },
    {
      id: "health_equipment",
      title: "Accelerate High-Value Diagnostic Equipment Payback",
      detail: "Monitor scanning volume and drive referral partnership volume.",
      category: "Capital",
    },
    {
      id: "health_recurring",
      title: "Launch Recurring Preventive Care & Wellness Memberships",
      detail: "Create steady predictable cash inflow through annual wellness care subscriptions.",
      category: "Revenue",
    },
  ],
  manufacturing: [
    {
      id: "mfg_capacity",
      title: "Elevate Plant Capacity Utilisation Above 80%",
      detail: "Minimize machine idle downtime and optimize batch changeover schedules.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "mfg_materials",
      title: "Mitigate Raw Material Price Volatility & Supply Lead Times",
      detail: "Diversify vendor contracts and optimize safety stock thresholds.",
      category: "Supply Chain",
      recommended: true,
    },
    {
      id: "mfg_scrap",
      title: "Reduce Quality Rejections & Production Scrap Below 1.5%",
      detail: "Implement automated stage-gate QA audits across assembly lines.",
      category: "Quality",
    },
    {
      id: "mfg_dealers",
      title: "Expand Dealer/Distributor Network & Improve Turnaround",
      detail: "Accelerate distributor dispatch cycles and track regional dealer quotas.",
      category: "Distribution",
    },
  ],
  finance: [
    {
      id: "fin_aum",
      title: "Accelerate High-Net-Worth Client Acquisition & AUM",
      detail: "Streamline wealth advisory pipeline and client portfolio proposals.",
      category: "Growth",
      recommended: true,
    },
    {
      id: "fin_compliance",
      title: "Automate Regulatory Audits & Compliance Documentation",
      detail: "Maintain continuous audit trails and KYC compliance checks.",
      category: "Compliance",
      recommended: true,
    },
    {
      id: "fin_fees",
      title: "Protect Advisory Fee Realisation & Transparency",
      detail: "Automate management fee billing and portfolio performance attribution.",
      category: "Operations",
    },
  ],
  other: [
    {
      id: "other_runway",
      title: "Extend Working Capital Runway & Optimize Cash Flow",
      detail: "Audit operational burn and forecast forward liquidity reserves.",
      category: "Financial",
      recommended: true,
    },
    {
      id: "other_sales",
      title: "Systematize Sales Pipeline & Reduce Founder Closing Burden",
      detail: "Enable team to qualify, quote, and close deals independently.",
      category: "Operations",
      recommended: true,
    },
    {
      id: "other_vendor",
      title: "Eliminate Vendor Cost Creep & Protect Gross Margins",
      detail: "Audit monthly supplier invoices and re-negotiate high-spend contracts.",
      category: "Profitability",
    },
    {
      id: "other_retention",
      title: "Elevate Client Retention & Repeat Business",
      detail: "Implement structured post-delivery check-ins and satisfaction telemetry.",
      category: "Retention",
    },
  ],
};

export default function OnboardingPage() {
  const router = useRouter();

  // If a returning user already has a configured business profile for THEIR account, send them to dashboard.
  // BUT if this is a new signup (mode=new_signup or new registration), ALWAYS present the onboarding questionnaire!
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const isNewSignup = params.get("mode") === "new_signup" || params.get("signup") === "true";
      if (isNewSignup) {
        // User explicitly signed up as a new user: clear previous cached business profile and run onboarding!
        localStorage.removeItem("bizzpal_business_profile");
        return;
      }

      // Check current user's session
      const rawSession = localStorage.getItem("bizzpal_user_session");
      let currentUserEmail = "";
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        currentUserEmail = (sess.email || "").trim().toLowerCase();
      }

      // Only skip onboarding if this SPECIFIC user already has their business profile completed
      if (currentUserEmail) {
        const userSpecificProfile = localStorage.getItem(`bizzpal_user_business_${currentUserEmail}`);
        if (userSpecificProfile) {
          const p = JSON.parse(userSpecificProfile);
          if (p.completedAt || (p.name && p.revenue !== undefined)) {
            router.replace("/dashboard");
            return;
          }
        }
      }

      const existingProfileStr = localStorage.getItem("bizzpal_business_profile");
      if (existingProfileStr) {
        const p = JSON.parse(existingProfileStr);
        // If current session exists and emails match, skip onboarding
        if (p.completedAt && p.email && currentUserEmail && p.email.toLowerCase() === currentUserEmail) {
          router.replace("/dashboard");
          return;
        }
      }
    } catch (e) {}
  }, [router]);

  // Steps: 1 (Industry), 2 (Scale & Numbers), 2.5 (Website Extraction), 2.7 (Dynamic Business Intake), 2.9 (Connect Tools), 3 (Priorities)
  const [step, setStep] = useState<number>(1);
  const [isAssembling, setIsAssembling] = useState(false);
  const [assemblyProgress, setAssemblyProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Analyzing business shape…");

  // User session state
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [activeAuthToolId, setActiveAuthToolId] = useState<string | null>(null);

  React.useEffect(() => {
    try {
      const rawSession = localStorage.getItem("bizzpal_user_session");
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        if (sess.email) setCurrentUserEmail(sess.email);
        if (sess.name && !founderName) setFounderName(sess.name);
      }
    } catch (e) {}
  }, []);

  // Form State
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["saas"]);
  const businessType = selectedCategories[0] || "saas";
  const [customBusinessType, setCustomBusinessType] = useState<string>("");
  const [businessModel, setBusinessModel] = useState<string>("subscription");
  const [companyName, setCompanyName] = useState<string>("");
  const [founderName, setFounderName] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [teamSize, setTeamSize] = useState<string>("");
  const [annualRevenue, setAnnualRevenue] = useState<string>("");
  const [monthlyRevenue, setMonthlyRevenue] = useState<string>("");
  const [monthlyBurn, setMonthlyBurn] = useState<string>("");
  const [cashOnHand, setCashOnHand] = useState<string>("");

  // Automated Website Intelligence Extraction State
  const [autoExtractWebsite, setAutoExtractWebsite] = useState<boolean>(true);
  const [isExtractingWebsite, setIsExtractingWebsite] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<number>(0);
  const [extractionStage, setExtractionStage] = useState<string>("Connecting to domain SSL…");
  const [extractedData, setExtractedData] = useState<{
    positioning: string;
    offerings: string;
    icp: string;
    metricsNote: string;
    verifiedDomain: string;
  }>({
    positioning: "",
    offerings: "",
    icp: "",
    metricsNote: "",
    verifiedDomain: "",
  });

  // Dynamic Business Intake State
  const [dynamicAnswers, setDynamicAnswers] = useState<Record<string, string>>({});
  const [customOtherAnswers, setCustomOtherAnswers] = useState<Record<string, string>>({});

  // Tool Intake State
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [noIntegrations, setNoIntegrations] = useState<boolean>(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(true);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-sync monthly revenue when annual revenue changes
  const handleAnnualRevenueChange = (rawVal: string) => {
    const rawClean = parseINR(rawVal);
    setAnnualRevenue(rawClean);
    const num = Number(rawClean);
    if (!isNaN(num) && num > 0) {
      setMonthlyRevenue(Math.round(num / 12).toString());
    } else {
      setMonthlyRevenue("");
    }
    if (errors.annualRevenue) {
      setErrors(prev => ({ ...prev, annualRevenue: "" }));
    }
  };

  // What they need right now (multi-select goals and pain points)
  const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);

  const businessTypes = [
    {
      id: "it",
      title: "IT & Technology Services",
      desc: "Custom development, IT infrastructure, cloud engineering, and tech consultancy.",
      icon: "laptop",
    },
    {
      id: "real_estate",
      title: "Real Estate & Property",
      desc: "Property portfolios, commercial leasing, brokerage, asset yields, and tenancy.",
      icon: "building",
    },
    {
      id: "d2c",
      title: "E-Commerce & Retail",
      desc: "AOV, ROAS, SKU margins, repeat purchase frequency, and inventory cash cycle.",
      icon: "shopping",
    },
    {
      id: "saas",
      title: "B2B SaaS & Cloud Platforms",
      desc: "Recurring ARR/MRR subscriptions, CAC payback, NRR, and churn telemetry.",
      icon: "cloud",
    },
    {
      id: "agency",
      title: "Agency & Professional Services",
      desc: "Team billable utilisation, project margins, retainer pipeline, and realization.",
      icon: "briefcase",
    },
    {
      id: "healthcare",
      title: "Healthcare & Clinics",
      desc: "Patient volume, practitioner utilisation, recurring care, and clinic margins.",
      icon: "stethoscope",
    },
    {
      id: "manufacturing",
      title: "Manufacturing & Physical Goods",
      desc: "Capacity utilisation, unit economics, supply lead time, and distributor cycles.",
      icon: "factory",
    },
    {
      id: "finance",
      title: "Financial Services & Wealth",
      desc: "AUM, advisory fees, portfolio performance, compliance, and asset management.",
      icon: "landmark",
    },
    {
      id: "other",
      title: "Others (Custom Business)",
      desc: "Specify your exact established business type (e.g. Hospitality, Logistics, etc.)",
      icon: "layers",
    },
  ];

  const getCategoryIcon = (id: string) => {
    switch (id) {
      case "it":
        return <Laptop className="w-5 h-5 text-brass" />;
      case "real_estate":
        return <Building2 className="w-5 h-5 text-brass" />;
      case "d2c":
        return <ShoppingBag className="w-5 h-5 text-brass" />;
      case "saas":
        return <Cloud className="w-5 h-5 text-brass" />;
      case "agency":
        return <Briefcase className="w-5 h-5 text-brass" />;
      case "healthcare":
        return <Stethoscope className="w-5 h-5 text-brass" />;
      case "manufacturing":
        return <Factory className="w-5 h-5 text-brass" />;
      case "finance":
        return <Landmark className="w-5 h-5 text-brass" />;
      default:
        return <Layers className="w-5 h-5 text-brass" />;
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => {
      const exists = prev.includes(id);
      let updated: string[];
      if (exists) {
        updated = prev.filter(c => c !== id);
      } else {
        updated = [...prev, id];
      }

      if (!updated.includes("other")) {
        setErrors(err => ({ ...err, customBusinessType: "" }));
      }
      if (updated.length > 0) {
        setErrors(err => ({ ...err, categories: "" }));
      }
      return updated;
    });
  };

  const getResolvedCategoriesLabel = () => {
    const active = selectedCategories.length > 0 ? selectedCategories : [businessType];
    const titles = active.map(catId => {
      if (catId === "other") {
        return customBusinessType.trim() || "Custom Business";
      }
      return businessTypes.find(b => b.id === catId)?.title || catId;
    });
    if (titles.length === 0) return "Business";
    if (titles.length === 1) return titles[0];
    if (titles.length === 2) return `${titles[0]} & ${titles[1]}`;
    return `${titles.slice(0, -1).join(", ")} & ${titles[titles.length - 1]}`;
  };

  const [customNeedInput, setCustomNeedInput] = useState("");
  const [customNeedsList, setCustomNeedsList] = useState<{ id: string; title: string; detail: string; category: string; recommended?: boolean }[]>([]);

  // Dynamically resolve industry priorities across all selected categories
  const currentNeedsOptions = useMemo(() => {
    const seen = new Set<string>();
    const combined: { id: string; title: string; detail: string; category: string; recommended?: boolean }[] = [];
    const activeCategories = selectedCategories.length > 0 ? selectedCategories : [businessType];
    for (const cat of activeCategories) {
      const items = INDUSTRY_PRIORITIES[cat] || INDUSTRY_PRIORITIES.other;
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          combined.push(item);
        }
      }
    }
    for (const item of customNeedsList) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        combined.push(item);
      }
    }
    return combined.length > 0 ? combined : INDUSTRY_PRIORITIES.other;
  }, [selectedCategories, businessType, customNeedsList]);

  const handleAddCustomNeed = () => {
    if (!customNeedInput.trim()) return;
    const newId = `custom_need_${Date.now()}`;
    const newNeed = {
      id: newId,
      title: customNeedInput.trim(),
      detail: "Custom operational bottleneck specified by leadership.",
      category: "Custom Directive",
    };
    setCustomNeedsList(prev => [...prev, newNeed]);
    setSelectedNeeds(prev => [...prev, newId]);
    setCustomNeedInput("");
  };

  const toggleNeed = (id: string) => {
    setSelectedNeeds(prev =>
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  // Tool Selection Handler: Multi-select, with "none" mutually exclusive
  const toggleTool = (toolId: string) => {
    if (toolId === "none") {
      setNoIntegrations(prev => !prev);
      setSelectedTools([]);
      return;
    }

    setNoIntegrations(false);
    setSelectedTools(prev => {
      let updated: string[];
      if (prev.includes(toolId)) {
        updated = prev.filter(t => t !== toolId);
      } else {
        updated = [...prev, toolId];
      }
      const priorityOrder = ["google", "microsoft", "linkedin", "meta"];
      return updated.sort((a, b) => {
        const pA = priorityOrder.indexOf(a);
        const pB = priorityOrder.indexOf(b);
        if (pA !== -1 && pB !== -1) return pA - pB;
        if (pA !== -1) return -1;
        if (pB !== -1) return 1;
        const idxA = TOOLS_OPTIONS.findIndex(t => t.id === a);
        const idxB = TOOLS_OPTIONS.findIndex(t => t.id === b);
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
      });
    });
  };

  // Step 2.95 Tool Authorization State & Handlers
  const [toolAuthStates, setToolAuthStates] = useState<Record<string, { status: "connected" | "connecting" | "idle"; detail?: string; config?: any }>>({});

  // Load existing saved integrations from SQLite on mount
  React.useEffect(() => {
    async function loadSavedIntegrations() {
      try {
        const res = await fetch("/api/integrations");
        if (res.ok) {
          const data = await res.json();
          if (data.integrations && Array.isArray(data.integrations)) {
            const map: Record<string, any> = {};
            for (const item of data.integrations) {
              if (item.status === "connected") {
                let detail = item.config?.accountDetail || `Connected · Live Telemetry Active`;
                if (item.id === "google" || item.id === "google_workspace") {
                  detail = item.config?.accountDetail || `Connected · Live Google Account: ${item.config?.connectedEmail || item.config?.accountEmail || "Synced"}`;
                } else if (item.id === "microsoft" || item.id === "microsoft_365") {
                  detail = item.config?.accountDetail || `Connected · Microsoft 365: ${item.config?.accountEmail || "Enterprise Suite Synced"}`;
                } else if (item.id === "linkedin" || item.id === "linkedin_company") {
                  detail = item.config?.accountDetail || `Connected · LinkedIn Company Page & Ads`;
                } else if (item.id === "meta" || item.id === "meta_business") {
                  detail = item.config?.accountDetail || `Connected · Meta Business & Instagram Ads`;
                } else if (item.id === "google_calendar" && item.config?.accountEmail) {
                  detail = `Connected · Real Account: ${item.config.accountEmail} (Live Calendar Synced)`;
                } else if (item.id === "stripe" && (item.config?.accountId || item.config?.apiKey)) {
                  detail = `Connected · Real Stripe ID: ${item.config.accountId || "Live Key"} (${item.config.mode === "live" ? "Live Production" : "Test Mode"})`;
                } else if (item.id === "slack" && item.config?.workspace) {
                  detail = `Connected · Workspace: ${item.config.workspace} · ${item.config.channel || "#executive-briefings"}`;
                } else if (item.id === "zoho_books" && item.config?.organizationId) {
                  detail = `Connected · Zoho Org ID: ${item.config.organizationId} (P&L Live)`;
                } else if (item.id === "help_desk" && item.config?.domain) {
                  detail = `Connected · Help Desk: ${item.config.domain} (SLA Active)`;
                }
                map[item.id] = {
                  status: "connected",
                  detail,
                  config: item.config,
                };
              }
            }
            if (Object.keys(map).length > 0) {
              setToolAuthStates(prev => ({ ...prev, ...map }));
            }
          }
        }
      } catch (e) {}
    }
    loadSavedIntegrations();
  }, []);

  const handleOpenRealAuth = (toolId: string) => {
    setActiveAuthToolId(toolId);
  };

  const handleDirectGoogleOAuth = () => {
    const width = 540;
    const height = 680;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const connectUrl = `/api/integrations/google/connect?returnTo=${encodeURIComponent(
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/onboarding"
    )}`;

    const popup = window.open(
      connectUrl,
      "BizzPalGoogleOAuth",
      `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0`
    );

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "BIZZPAL_GOOGLE_AUTH_SUCCESS") {
        window.removeEventListener("message", handleMessage);
        const data = event.data.data;
        const detail = data?.detail || `Connected · Live Google Account: ${data?.email || "Synced"}`;
        handleRealConnectSuccess(
          "google",
          detail,
          data?.config || { accountEmail: data?.email, liveOAuth: true }
        );
      }
    };

    window.addEventListener("message", handleMessage);
  };

  const handleRealConnectSuccess = (toolId: string, detail: string, config: any) => {
    setToolAuthStates(prev => ({
      ...prev,
      [toolId]: { status: "connected", detail, config },
    }));
  };

  const handleRealDisconnect = (toolId: string) => {
    setToolAuthStates(prev => {
      const next = { ...prev };
      delete next[toolId];
      return next;
    });
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    if (selectedCategories.length === 0) {
      newErrors.categories = "Please select at least one business industry & category";
    }
    if (selectedCategories.includes("other") && !customBusinessType.trim()) {
      newErrors.customBusinessType = "Please type your business category / industry";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    if (!companyName.trim()) {
      newErrors.companyName = "Company Name is required";
    }
    if (!founderName.trim()) {
      newErrors.founderName = "Founder Name is required";
    }
    if (!teamSize.trim() || Number(teamSize) <= 0) {
      newErrors.teamSize = "Valid Team Size is required";
    }
    if (!annualRevenue.trim() || Number(annualRevenue) <= 0) {
      newErrors.annualRevenue = "Company Annual Income / Revenue is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStep1Next = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const startWebsiteExtraction = async () => {
    setStep(2.5);
    setIsExtractingWebsite(true);
    setExtractionProgress(15);

    const cleanDomain = website.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const resolvedIndustryLabel = getResolvedCategoriesLabel();

    setExtractionStage(`Connecting to ${cleanDomain} and extracting metadata…`);

    try {
      const response = await fetch('/api/extract-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: website.trim() })
      });

      const result = await response.json();
      
      setExtractionProgress(100);
      setIsExtractingWebsite(false);

      if (result.success) {
        const { title, description, verifiedDomain } = result.data;
        setExtractedData({
          verifiedDomain: verifiedDomain || cleanDomain,
          positioning: `${companyName || "Your Company"} positioning: ${title}.`,
          offerings: `Metadata: ${description.slice(0, 150)}${description.length > 150 ? '...' : ''}`,
          icp: `Targeting based on ${resolvedIndustryLabel.toLowerCase()} market trends.`,
          metricsNote: `Live extraction successful. Indian INR (₹) commercial model aligned.`,
        });
      } else {
        // Fallback on error
        setExtractedData({
          verifiedDomain: cleanDomain,
          positioning: `${companyName || "Your Company"} is an established ${resolvedIndustryLabel.toLowerCase()} operation.`,
          offerings: `Custom ${resolvedIndustryLabel} solutions and operational telemetry.`,
          icp: `Mid-market to enterprise leaders in the ${resolvedIndustryLabel.toLowerCase()} sector.`,
          metricsNote: `Basic extraction fallback used. Indian INR (₹) commercial model aligned.`,
        });
      }
    } catch (e) {
      console.error(e);
      setExtractionProgress(100);
      setIsExtractingWebsite(false);
      // Fallback
      setExtractedData({
        verifiedDomain: cleanDomain,
        positioning: `${companyName || "Your Company"} is an established ${resolvedIndustryLabel.toLowerCase()} operation.`,
        offerings: `Custom ${resolvedIndustryLabel} solutions.`,
        icp: `Enterprise leaders.`,
        metricsNote: `Extraction failed. Using defaults.`,
      });
    }
  };

  const handleStep2Next = () => {
    if (validateStep2()) {
      if (website.trim() && autoExtractWebsite) {
        startWebsiteExtraction();
      } else {
        setStep(2.7); // Jump straight to Dynamic Business Intake
      }
    }
  };

  const handleCompleteSetup = async () => {
    setIsAssembling(true);
    const resolvedIndustryLabel = getResolvedCategoriesLabel();

    const statuses = [
      `Persisting company profile for ${companyName}…`,
      `Calibrating Indian benchmarks (INR ₹) for established ${resolvedIndustryLabel.toUpperCase()} business…`,
      `Configuring Astra (CEO) and Marcus (CFO) executive agents for ${founderName}…`,
      "Synthesizing your connected tool sync adapters and daily check-in protocols…",
      "Running deterministic Layer 1 gap analysis & synthesizing your executive briefing…",
    ];

    let current = 0;
    const interval = setInterval(async () => {
      current += 1;
      if (current < statuses.length) {
        setStatusMessage(statuses[current]);
        setAssemblyProgress(Math.round((current / statuses.length) * 100));
      } else {
        clearInterval(interval);
        setAssemblyProgress(100);

        // Compile dynamic answers merging options & custom "other" inputs
        const finalizedDynamicAnswers: Record<string, string> = {};
        for (const [k, v] of Object.entries(dynamicAnswers)) {
          if (v === "__other__") {
            finalizedDynamicAnswers[k] = customOtherAnswers[k] || "Custom Specification";
          } else {
            finalizedDynamicAnswers[k] = v;
          }
        }

        // Save completed profile locally
        const profile = {
          name: companyName.trim() || "My Company",
          founderName: founderName.trim() || "Founder",
          website: website.trim(),
          industry: selectedCategories.includes("other") && customBusinessType.trim()
            ? customBusinessType.trim()
            : (selectedCategories.map(c => businessTypes.find(b => b.id === c)?.title || c).join(", ") || businessType),
          industryLabel: resolvedIndustryLabel,
          industryKey: selectedCategories[0] || businessType,
          selectedCategories: selectedCategories,
          categoriesLabels: selectedCategories.map(c => c === "other" && customBusinessType.trim() ? customBusinessType.trim() : (businessTypes.find(b => b.id === c)?.title || c)),
          customBusinessType: selectedCategories.includes("other") ? customBusinessType.trim() : "",
          businessModel,
          currency: "INR",
          teamSize: Number(teamSize) || 1,
          annualRevenue: Number(annualRevenue) || 0,
          revenue: Number(monthlyRevenue) || (Number(annualRevenue) ? Math.round(Number(annualRevenue) / 12) : 0),
          burn: Number(monthlyBurn) || 0,
          cash: Number(cashOnHand) || 0,
          needs: selectedNeeds.length > 0 ? selectedNeeds : ["extend_runway"],
          connectedTools: noIntegrations ? [] : selectedTools,
          noIntegrations,
          whatsappOptIn,
          whatsappNumber: whatsappNumber.trim(),
          dynamicAnswers: finalizedDynamicAnswers,
          extractedWebsiteData: website.trim() ? extractedData : null,
          completedAt: new Date().toISOString(),
        };
        localStorage.setItem("bizzpal_business_profile", JSON.stringify(profile));

        // Save to user-specific account cache and server-side SQLite ledger
        try {
          const sessionStr = localStorage.getItem("bizzpal_user_session");
          if (sessionStr) {
            const sess = JSON.parse(sessionStr);
            if (sess.email) {
              const uEmail = sess.email.trim().toLowerCase();
              localStorage.setItem(`bizzpal_user_business_${uEmail}`, JSON.stringify(profile));
              fetch("/api/auth/account-status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: uEmail, businessProfile: profile }),
              }).catch(() => {});
            }
          }
        } catch (e) {}

        // Persist to persistent SQLite database via API
        try {
          await fetch("/api/business/intake", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: profile.name,
              industry: profile.industryKey,
              industryLabel: profile.industryLabel,
              customIndustry: profile.customBusinessType,
              founderName: profile.founderName,
              website: profile.website,
              teamSize: profile.teamSize,
              annualRevenue: profile.annualRevenue,
              monthlyRevenue: profile.revenue,
              monthlyBurn: profile.burn,
              cashOnHand: profile.cash,
              connectedTools: profile.connectedTools,
              noIntegrations: profile.noIntegrations,
              whatsappOptIn: profile.whatsappOptIn,
              whatsappNumber: profile.whatsappNumber,
              dynamicAnswers: profile.dynamicAnswers,
            }),
          });
        } catch (e) {
          console.error("Failed to persist intake to SQLite API:", e);
        }

        // Guarantee user session is active
        try {
          const existingSession = localStorage.getItem("bizzpal_user_session");
          if (!existingSession) {
            const userSession = {
              id: `usr_${Date.now()}`,
              email: website.trim() ? `founder@${website.trim().replace(/^https?:\/\//, '')}` : "founder@mycompany.in",
              name: founderName.trim() || "Founder",
              role: "owner",
              provider: "email",
              authenticatedAt: new Date().toISOString(),
            };
            localStorage.setItem("bizzpal_user_session", JSON.stringify(userSession));
          }
        } catch (e) {
          // ignore
        }

        setTimeout(() => {
          router.push("/subscription");
        }, 800);
      }
    }, 650);
  };

  const currentQuestions = useMemo(() => {
    return getDynamicQuestions({
      businessType,
      businessTypesList: selectedCategories,
      customBusinessType,
      companyName,
      founderName,
      teamSize,
      annualRevenue,
      monthlyRevenue,
      monthlyBurn,
      cashOnHand,
      website,
      extractedData,
    });
  }, [
    businessType,
    selectedCategories,
    customBusinessType,
    companyName,
    founderName,
    teamSize,
    annualRevenue,
    monthlyRevenue,
    monthlyBurn,
    cashOnHand,
    website,
    extractedData,
  ]);

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Bar */}
      <div className="flex items-center justify-between max-w-4xl w-full mx-auto pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface border border-line flex items-center justify-center p-1 shadow-sm">
            <Image
              src="/logo.png"
              alt="BizzPal Logo"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-tight text-text font-sans">BizzPal</span>
            <span className="text-[10px] ml-2 px-1.5 py-0.2 rounded bg-brass-soft text-brass font-bold uppercase">
              Business Intake
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-text-muted">
            {step === 1 && "Step 1 of 5 · Industry"}
            {step === 2 && "Step 2 of 5 · Financials"}
            {step === 2.5 && "Step 2.5 · AI Extraction"}
            {step === 2.7 && "Step 3 of 5 · Operations"}
            {step === 2.9 && "Step 4 of 5 · Connected Tools"}
            {step === 2.95 && "Step 4.5 · Authorize & Sign In"}
            {step === 3 && "Step 5 of 5 · Priorities"}
          </span>
          <div className="w-32">
            <ThemeSwitch compact />
          </div>
        </div>
      </div>

      {/* Main Questionnaire Container */}
      <div className="max-w-3xl w-full mx-auto my-auto py-6">
        {!isAssembling ? (
          <div className="p-6 sm:p-8 rounded-2xl border border-line bg-surface shadow-theme space-y-6">
            {/* Step 1: Business Industry & Category */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brass-soft text-brass text-[10px] font-bold uppercase tracking-wider">
                      Established Business Profile
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-2 border border-line text-[10px] font-semibold text-text-muted">
                      Select One or Multiple
                    </span>
                    {selectedCategories.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brass/10 border border-brass/30 text-[10px] font-bold text-brass">
                        {selectedCategories.length} selected
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight font-sans">
                    Select your business industry & category
                  </h1>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    BizzPal adapts to your established company operations. You can select one sector or multiple sectors that describe your business to derive tailored benchmark models, executive metrics, and specialist AI agents.
                  </p>
                </div>

                {errors.categories && (
                  <div className="p-3 rounded-xl bg-rust/10 border border-rust/30 flex items-center gap-2 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-rust shrink-0" />
                    <p className="text-xs font-semibold text-rust">{errors.categories}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {businessTypes.map(type => {
                    const isSelected = selectedCategories.includes(type.id);
                    return (
                      <div
                        key={type.id}
                        id={`category-card-${type.id}`}
                        onClick={() => toggleCategory(type.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer btn-tactile flex items-start gap-3 relative ${
                          isSelected
                            ? "bg-surface-2 border-brass ring-1 ring-brass/40 shadow-sm"
                            : "bg-surface-2/50 border-line hover:border-line-strong hover:bg-surface-2/80"
                        }`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          {getCategoryIcon(type.id)}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="text-xs font-bold text-text block mb-1">{type.title}</span>
                          <p className="text-[11px] text-text-muted leading-relaxed">
                            {type.desc}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all mt-0.5 ${
                            isSelected
                              ? "bg-brass border-brass text-white shadow-xs"
                              : "border-line bg-surface/70 text-transparent"
                          }`}
                        >
                          <Check className={`w-3.5 h-3.5 stroke-[3] transition-all ${isSelected ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Category Input for 'Others' */}
                {selectedCategories.includes("other") && (
                  <div className="p-4 rounded-xl bg-brass-soft/40 border border-brass/40 space-y-2 animate-fade-in">
                    <label className="text-xs font-bold text-text flex items-center">
                      <span>Specify Your Business Industry / Type</span>
                      <span className="text-rust font-bold ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={customBusinessType}
                      onChange={e => {
                        setCustomBusinessType(e.target.value);
                        if (errors.customBusinessType) {
                          setErrors(prev => ({ ...prev, customBusinessType: "" }));
                        }
                      }}
                      placeholder="e.g. Hospitality & Hotels, Logistics & Freight, Construction, EdTech, Agriculture..."
                      className={`w-full px-3.5 py-2.5 rounded-lg bg-surface border text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brass ${
                        errors.customBusinessType ? "border-rust ring-1 ring-rust/50" : "border-line"
                      }`}
                      autoFocus
                    />
                    {errors.customBusinessType && (
                      <p className="text-[11px] font-medium text-rust flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {errors.customBusinessType}
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <span className="text-xs text-text-muted font-medium">
                    {selectedCategories.length === 0
                      ? "Select at least 1 industry"
                      : `${selectedCategories.length} categor${selectedCategories.length === 1 ? "y" : "ies"} selected`}
                  </span>
                  <button
                    id="btn-continue-step-1"
                    type="button"
                    onClick={handleStep1Next}
                    className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Scale & Fundamentals</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Scale & Numbers */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight font-sans">
                    Company Fundamentals & Scale
                  </h1>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Used to calculate your real cash runway, revenue per head, and detect early solvency gaps.
                  </p>
                </div>

                {Object.keys(errors).length > 0 && (
                  <div className="p-3 rounded-lg bg-rust/10 border border-rust/30 flex items-start gap-2.5 text-xs text-rust">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold">Please complete required fields to proceed:</span>
                      <ul className="list-disc list-inside text-[11px] opacity-90">
                        {Object.values(errors).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Company Name */}
                  <div>
                    <label className="font-semibold text-text mb-1 flex items-center">
                      <span>Company Name</span>
                      <span className="text-rust font-bold ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={e => {
                        setCompanyName(e.target.value);
                        if (errors.companyName) setErrors(prev => ({ ...prev, companyName: "" }));
                      }}
                      placeholder="e.g. Apex Global Pvt Ltd"
                      className={`w-full px-3 py-2 rounded-lg bg-surface-2 border text-text focus:ring-1 focus:ring-brass ${
                        errors.companyName ? "border-rust ring-1 ring-rust/50" : "border-line"
                      }`}
                    />
                    {errors.companyName && (
                      <p className="text-[10px] text-rust font-medium mt-1">{errors.companyName}</p>
                    )}
                  </div>

                  {/* Founder Name */}
                  <div>
                    <label className="font-semibold text-text mb-1 flex items-center">
                      <span>Founder Name</span>
                      <span className="text-rust font-bold ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      value={founderName}
                      onChange={e => {
                        setFounderName(e.target.value);
                        if (errors.founderName) setErrors(prev => ({ ...prev, founderName: "" }));
                      }}
                      placeholder="e.g. Founder Name"
                      className={`w-full px-3 py-2 rounded-lg bg-surface-2 border text-text focus:ring-1 focus:ring-brass ${
                        errors.founderName ? "border-rust ring-1 ring-rust/50" : "border-line"
                      }`}
                    />
                    {errors.founderName && (
                      <p className="text-[10px] text-rust font-medium mt-1">{errors.founderName}</p>
                    )}
                  </div>

                  {/* Team Size */}
                  <div>
                    <label className="font-semibold text-text mb-1 flex items-center">
                      <span>Team Size (FTEs)</span>
                      <span className="text-rust font-bold ml-1">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={teamSize}
                      onChange={e => {
                        setTeamSize(e.target.value);
                        if (errors.teamSize) setErrors(prev => ({ ...prev, teamSize: "" }));
                      }}
                      placeholder="e.g. 15"
                      className={`w-full px-3 py-2 rounded-lg bg-surface-2 border text-text focus:ring-1 focus:ring-brass ${
                        errors.teamSize ? "border-rust ring-1 ring-rust/50" : "border-line"
                      }`}
                    />
                    {errors.teamSize && (
                      <p className="text-[10px] text-rust font-medium mt-1">{errors.teamSize}</p>
                    )}
                  </div>

                  {/* Annual Revenue (INR ₹) */}
                  <div>
                    <label className="font-semibold text-text mb-1 flex items-center">
                      <span>Company Annual Income / Revenue (₹)</span>
                      <span className="text-rust font-bold ml-1">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={annualRevenue ? formatINR(annualRevenue) : ""}
                      onChange={e => handleAnnualRevenueChange(e.target.value)}
                      placeholder="e.g. 60,00,000"
                      className={`w-full px-3 py-2 rounded-lg bg-surface-2 border text-text focus:ring-1 focus:ring-brass font-mono ${
                        errors.annualRevenue ? "border-rust ring-1 ring-rust/50" : "border-line"
                      }`}
                    />
                    {errors.annualRevenue ? (
                      <p className="text-[10px] text-rust font-medium mt-1">{errors.annualRevenue}</p>
                    ) : (
                      annualRevenue && Number(annualRevenue) > 0 && (
                        <p className="text-[10px] text-text-muted mt-1 font-mono">
                          ≈ ₹{formatINR(Math.round(Number(annualRevenue) / 12))} / month
                        </p>
                      )
                    )}
                  </div>

                  {/* Monthly Net Burn (INR ₹) */}
                  <div>
                    <label className="font-semibold text-text block mb-1">
                      Monthly Net Burn (₹)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={monthlyBurn ? formatINR(monthlyBurn) : ""}
                      onChange={e => setMonthlyBurn(parseINR(e.target.value))}
                      placeholder="e.g. 1,50,000"
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass font-mono"
                    />
                  </div>

                  {/* Cash on Hand (INR ₹) */}
                  <div>
                    <label className="font-semibold text-text block mb-1">
                      Cash on Hand / Reserves (₹)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cashOnHand ? formatINR(cashOnHand) : ""}
                      onChange={e => setCashOnHand(parseINR(e.target.value))}
                      placeholder="e.g. 12,00,000"
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass font-mono"
                    />
                  </div>

                  {/* Website URL */}
                  <div className="sm:col-span-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-text flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <span>Company Website URL</span>
                      </label>
                      <span className="text-[10px] text-text-muted">Optional</span>
                    </div>
                    <input
                      type="text"
                      value={website}
                      onChange={e => setWebsite(e.target.value)}
                      placeholder="e.g. apexglobal.in"
                      className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass"
                    />
                    <div className="p-3 rounded-lg bg-brass-soft/30 border border-brass/20 flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        id="auto-extract-toggle"
                        checked={autoExtractWebsite}
                        onChange={e => setAutoExtractWebsite(e.target.checked)}
                        className="mt-0.5 rounded border-line text-brass focus:ring-brass cursor-pointer"
                      />
                      <label htmlFor="auto-extract-toggle" className="text-[11px] text-text leading-relaxed cursor-pointer select-none">
                        <span className="font-bold text-brass block">Automated Business Intelligence Extraction</span>
                        <span>If provided, BizzPal AI will crawl your website to automatically extract positioning, products, customer segments, and market telemetry in the next step.</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setStep(1);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    id="btn-continue-step-2"
                    type="button"
                    onClick={handleStep2Next}
                    className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>{website.trim() && autoExtractWebsite ? "Continue to Website Extraction" : "Continue to Operational Details"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2.5: Automated Website Intelligence Extraction */}
            {step === 2.5 && (
              <div className="space-y-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brass-soft border border-brass/30 text-brass text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>AI Website Intelligence Extraction</span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight font-sans">
                    Extracted Business Intelligence
                  </h1>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    BizzPal AI has crawled <span className="font-mono text-text font-semibold">{website}</span> to automatically extract and structure your company positioning, offerings, and commercial model.
                  </p>
                </div>

                {isExtractingWebsite ? (
                  <div className="p-8 rounded-xl border border-brass/30 bg-surface-2/60 space-y-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-brass/10 border border-brass/30 text-brass flex items-center justify-center mx-auto animate-spin">
                      <RefreshCw className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-text">{extractionStage}</div>
                      <p className="text-[11px] text-text-muted font-mono">Parsing sitemap & telemetry heuristics…</p>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2 overflow-hidden border border-line">
                      <div
                        className="bg-brass h-full transition-all duration-300 rounded-full"
                        style={{ width: `${extractionProgress}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl bg-jade/10 border border-jade/30 flex items-center justify-between text-xs text-jade">
                      <div className="flex items-center gap-2 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-jade shrink-0" />
                        <span>Domain verified: {extractedData.verifiedDomain} · 4 telemetry vectors synthesized</span>
                      </div>
                      <button
                        type="button"
                        onClick={startWebsiteExtraction}
                        className="text-[11px] underline hover:opacity-80 flex items-center gap-1 text-text-muted cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Re-crawl</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="font-semibold text-text flex items-center justify-between">
                        <span>Extracted Value Proposition & Positioning</span>
                        <span className="text-[10px] text-brass font-bold uppercase">Editable</span>
                      </label>
                      <textarea
                        rows={2}
                        value={extractedData.positioning}
                        onChange={e => setExtractedData(prev => ({ ...prev, positioning: e.target.value }))}
                        className="w-full p-2.5 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass text-xs leading-relaxed"
                      />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="font-semibold text-text flex items-center justify-between">
                        <span>Extracted Core Offerings & Services</span>
                        <span className="text-[10px] text-brass font-bold uppercase">Editable</span>
                      </label>
                      <textarea
                        rows={2}
                        value={extractedData.offerings}
                        onChange={e => setExtractedData(prev => ({ ...prev, offerings: e.target.value }))}
                        className="w-full p-2.5 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass text-xs leading-relaxed"
                      />
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="font-semibold text-text flex items-center justify-between">
                        <span>Identified Target Customer Persona (ICP)</span>
                        <span className="text-[10px] text-brass font-bold uppercase">Editable</span>
                      </label>
                      <input
                        type="text"
                        value={extractedData.icp}
                        onChange={e => setExtractedData(prev => ({ ...prev, icp: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass text-xs"
                      />
                    </div>

                    <div className="p-3 rounded-lg bg-surface-2 border border-line text-[11px] text-text-muted flex items-start gap-2.5">
                      <Building2 className="w-4 h-4 text-brass shrink-0 mt-0.5" />
                      <span>{extractedData.metricsNote}</span>
                    </div>

                    <div className="pt-3 border-t border-line flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                      >
                        Back to Financials
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep(2.7)}
                        className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer"
                      >
                        <span>Confirm & Continue to Operational Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2.7: Dynamic Business Intake Questions (Tailored by Industry) */}
            {step === 2.7 && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                      Tailored Business Telemetry · {companyName.trim() || "Your Business"}
                    </div>
                    <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight font-sans">
                      Operational Anatomy & Mechanics
                    </h1>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      Calibrated specifically for <span className="font-semibold text-text">{companyName.trim() || "your company"}</span> ({getResolvedCategoriesLabel()}{teamSize ? ` · ${teamSize} team members` : ""}{annualRevenue ? ` · ₹${Number(annualRevenue).toLocaleString("en-IN")}/yr` : ""}). Answer or customize these questions, or skip to continue anytime.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep(2.9)}
                    className="self-start sm:self-auto text-xs text-text-muted hover:text-brass underline decoration-dotted font-semibold cursor-pointer px-2 py-1"
                  >
                    Skip this section →
                  </button>
                </div>

                {/* Dynamic Questions List */}
                <div className="space-y-5 pt-1">
                  {currentQuestions.map((q, qIndex) => {
                    const selectedVal = dynamicAnswers[q.id] || "";
                    const isOther = selectedVal === "__other__";

                    return (
                      <div key={q.id} className="p-4 rounded-xl border border-line bg-surface-2/40 space-y-3">
                        <div>
                          <span className="text-[10px] font-bold text-brass uppercase tracking-wider block">
                            Question {qIndex + 1} of {currentQuestions.length}
                          </span>
                          <h2 className="text-xs sm:text-sm font-bold text-text mt-0.5">{q.question}</h2>
                          <p className="text-[11px] text-text-muted mt-0.5">{q.hint}</p>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map(opt => {
                            const isOptSelected = selectedVal === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setDynamicAnswers(prev => ({
                                    ...prev,
                                    [q.id]: isOptSelected ? "" : opt,
                                  }));
                                }}
                                className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer flex items-center justify-between btn-tactile ${
                                  isOptSelected
                                    ? "bg-brass-soft border-brass text-text font-bold shadow-xs"
                                    : "bg-surface border-line text-text-muted hover:text-text hover:border-line-strong"
                                }`}
                              >
                                <span>{opt}</span>
                                {isOptSelected && <Check className="w-3.5 h-3.5 text-brass shrink-0" />}
                              </button>
                            );
                          })}

                          {/* "Other (manual input)" option */}
                          <button
                            type="button"
                            onClick={() => {
                              setDynamicAnswers(prev => ({
                                ...prev,
                                [q.id]: isOther ? "" : "__other__",
                              }));
                            }}
                            className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer flex items-center justify-between btn-tactile ${
                              isOther
                                ? "bg-brass-soft border-brass text-text font-bold shadow-xs"
                                : "bg-surface border-line text-text-muted hover:text-text hover:border-line-strong"
                            }`}
                          >
                            <span>Other (write manually)</span>
                            {isOther && <Check className="w-3.5 h-3.5 text-brass shrink-0" />}
                          </button>
                        </div>

                        {/* Manual write-in box if "Other" is selected */}
                        {isOther && (
                          <div className="pt-2">
                            <input
                              type="text"
                              value={customOtherAnswers[q.id] || ""}
                              onChange={e => {
                                const val = e.target.value;
                                setCustomOtherAnswers(prev => ({ ...prev, [q.id]: val }));
                              }}
                              placeholder="Type your specific answer here..."
                              className="w-full px-3 py-2 rounded-lg bg-surface border border-brass text-xs text-text focus:outline-none focus:ring-1 focus:ring-brass"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(website.trim() && autoExtractWebsite ? 2.5 : 2)}
                    className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(2.9)}
                    className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>Continue to Business Tools</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2.9: Connect Your Business Tools */}
            {step === 2.9 && (
              <div className="space-y-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brass-soft text-brass text-[10px] font-bold uppercase tracking-wider mb-2">
                    Integration & Collection Mode
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight font-sans">
                    Connect your business tools
                  </h1>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Select the platforms and systems your company already uses. You can select multiple tools, or proceed to continue setup.
                  </p>
                </div>

                {/* Multi-Select Tools Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {TOOLS_OPTIONS.map(tool => {
                    const isSelected = selectedTools.includes(tool.id);

                    return (
                      <div
                        key={tool.id}
                        onClick={() => toggleTool(tool.id)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 btn-tactile ${
                          isSelected
                            ? "bg-surface-2 border-brass ring-1 ring-brass/40 shadow-sm"
                            : "bg-surface-2/40 border-line hover:border-line-strong"
                        }`}
                      >
                        <ToolLogo toolId={tool.id} size={36} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-text">{tool.name}</span>
                            <div
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isSelected ? "bg-brass border-brass text-white" : "border-line-strong bg-surface"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-brass block mt-0.5">{tool.category}</span>
                          <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Visible Explanation Under the Grid */}
                <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-text space-y-1">
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>How BizzPal Collects Your Daily Data</span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Selected tools sync your data automatically. For anything not connected, we&apos;ll ask you for a quick daily update instead — no manual dashboard work required.
                  </p>
                </div>

                <div className="pt-3 border-t border-line flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2.7)}
                    className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    id="btn-continue-step-tools"
                    type="button"
                    onClick={() => {
                      if (!noIntegrations && selectedTools.length > 0) {
                        setStep(2.95);
                      } else {
                        setStep(3);
                        if (selectedNeeds.length === 0) {
                          const recs = currentNeedsOptions
                            .filter(o => o.recommended)
                            .map(o => o.id);
                          setSelectedNeeds(recs);
                        }
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer"
                  >
                    <span>
                      {!noIntegrations && selectedTools.length > 0
                        ? `Continue to Sign In & Connect (${selectedTools.length})`
                        : "Continue to Priorities & Bottlenecks"}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2.95: Sign In & Authorize Connected Tools */}
            {step === 2.95 && (() => {
              const connectedCount = selectedTools.filter(t => toolAuthStates[t]?.status === "connected").length;

              const getToolSignLabel = (id: string, name: string) => {
                if (id === "google") return "Sign in with Google";
                if (id === "microsoft") return "Sign in with Microsoft 365";
                if (id === "linkedin") return "Sign in with LinkedIn";
                if (id === "meta") return "Sign in with Meta";
                if (id === "stripe") return "Sign in with Stripe";
                if (id === "slack") return "Sign in with Slack";
                if (id === "zoho_books") return "Sign in with Zoho Books";
                if (id === "help_desk") return "Sign in with Help Desk";
                return `Sign in with ${name.split(" ")[0]}`;
              };

              return (
                <div className="space-y-6">
                  {/* Executive Header with Telemetry Progress */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-line">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <Lock className="w-3 h-3 text-emerald-500" />
                        <span>OAuth 2.0 & Encrypted Telemetry Handshake</span>
                      </div>
                      <h1 className="text-xl sm:text-2xl font-bold text-text tracking-tight font-sans">
                        Sign in & authorize your connected tools
                      </h1>
                      <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
                        Authenticate your enterprise platforms so BizzPal's Autonomous AI C-Suite can ingest real-time KPIs, run continuous simulations, and eliminate manual reporting.
                      </p>
                    </div>

                    {/* Live Progress Meter */}
                    <div className="shrink-0 bg-surface-2/70 border border-line p-3 rounded-xl min-w-[170px] shadow-2xs">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted">
                        <span>Telemetry Sync</span>
                        <span className="text-emerald-500 font-bold">{Math.round(selectedTools.length > 0 ? (connectedCount / selectedTools.length) * 100 : 0)}%</span>
                      </div>
                      <div className="text-sm font-bold text-text mt-1 flex items-baseline gap-1.5">
                        <span className="text-emerald-500 font-mono text-base">{connectedCount}</span>
                        <span className="text-text-muted font-normal text-xs">of</span>
                        <span className="font-mono text-base">{selectedTools.length}</span>
                        <span className="text-xs font-medium text-text-muted ml-0.5">Connected</span>
                      </div>
                      <div className="w-full bg-line/80 rounded-full h-1.5 mt-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${selectedTools.length > 0 ? (connectedCount / selectedTools.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Individual Tool Sign-In Cards */}
                  <div className="space-y-3.5">
                    {[...selectedTools]
                      .sort((a, b) => {
                        const priority = ["google", "microsoft", "linkedin", "meta"];
                        const pA = priority.indexOf(a);
                        const pB = priority.indexOf(b);
                        if (pA !== -1 && pB !== -1) return pA - pB;
                        if (pA !== -1) return -1;
                        if (pB !== -1) return 1;
                        const idxA = TOOLS_OPTIONS.findIndex(t => t.id === a);
                        const idxB = TOOLS_OPTIONS.findIndex(t => t.id === b);
                        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
                      })
                      .map(toolId => {
                      const toolObj = TOOLS_OPTIONS.find(t => t.id === toolId);
                      if (!toolObj) return null;
                      const authState = toolAuthStates[toolId] || { status: "idle" };
                      const isConnected = authState.status === "connected";
                      const isConnecting = authState.status === "connecting";

                      return (
                        <div
                          key={toolId}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                            isConnected
                              ? "bg-emerald-500/5 border-emerald-500/30 shadow-xs"
                              : "bg-surface-2/40 border-line hover:border-line-strong hover:bg-surface-2/60"
                          }`}
                        >
                          <div className="flex items-start gap-4 min-w-0">
                            <div className="p-2.5 rounded-xl bg-surface border border-line shrink-0 shadow-2xs flex items-center justify-center">
                              <ToolLogo toolId={toolId} size={32} />
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-text">{toolObj.name}</span>
                                {isConnected && (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-mono font-bold uppercase flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Live Stream Active</span>
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-text-muted leading-relaxed">
                                {isConnected && authState.detail ? (
                                  <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono text-[11px] block">
                                    {authState.detail}
                                  </span>
                                ) : (
                                  toolObj.description
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Branded CTA Button Actions */}
                          <div className="shrink-0 flex items-center gap-2.5 sm:self-center">
                            {isConnected ? (
                              <>
                                <div className="px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  <span>Authorized</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleOpenRealAuth(toolId)}
                                  className="px-3.5 py-2 rounded-xl bg-surface border border-line text-xs font-semibold text-text hover:border-brass hover:bg-surface-2 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                  title="Edit credentials or verify scopes"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5 text-brass" />
                                  <span className="hidden sm:inline">Configure</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={toolId === "google" ? handleDirectGoogleOAuth : () => handleOpenRealAuth(toolId)}
                                className="w-full sm:w-[235px] h-10 px-3.5 rounded-xl bg-[#0A66C2] text-white hover:bg-[#004182] font-semibold text-xs shadow-xs hover:shadow transition-all flex items-center justify-between cursor-pointer shrink-0 whitespace-nowrap active:scale-[0.98]"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-2xs">
                                    <ToolLogo toolId={toolId} size={15} glyphOnly={true} />
                                  </div>
                                  <span className="font-semibold text-xs text-white truncate">
                                    {getToolSignLabel(toolId, toolObj.name)}
                                  </span>
                                </div>
                                <ArrowRight className="w-3.5 h-3.5 opacity-60 shrink-0 ml-1.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Security & Telemetry Guarantee Footer */}
                  <div className="p-3.5 rounded-xl bg-surface-2/40 border border-line flex flex-wrap items-center justify-between gap-3 text-[11px] text-text-muted">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span className="font-semibold text-text">Enterprise Data Shield</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> 256-Bit TLS Handshake
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Read-Only Telemetry Scopes
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Zero Raw Passwords Stored
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Revoke Anytime
                      </span>
                    </div>
                  </div>

                  {/* Navigation Actions */}
                  <div className="pt-3 border-t border-line flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setStep(2.9)}
                      className="px-4 py-2 rounded-xl border border-line text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer transition-colors"
                    >
                      Back to Tools Selection
                    </button>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(3);
                          if (selectedNeeds.length === 0) {
                            const recs = currentNeedsOptions
                              .filter(o => o.recommended)
                              .map(o => o.id);
                            setSelectedNeeds(recs);
                          }
                        }}
                        className="text-xs text-text-muted hover:text-text cursor-pointer px-3 py-2 transition-colors"
                      >
                        Skip for now
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep(3);
                          if (selectedNeeds.length === 0) {
                            const recs = currentNeedsOptions
                              .filter(o => o.recommended)
                              .map(o => o.id);
                            setSelectedNeeds(recs);
                          }
                        }}
                        className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer"
                      >
                        <span>Continue to Priorities & Bottlenecks</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Step 3: What do you need right now? (Priorities & Bottlenecks) */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold uppercase tracking-wider mb-2">
                    Dynamic Strategic Calibration
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold text-text tracking-tight font-sans">
                    What are your biggest priorities & bottlenecks?
                  </h1>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Tailored for your established <strong className="text-text font-bold">{getResolvedCategoriesLabel()}</strong>. Recommended items are pre-selected to seed your gap register, AI executives, and execution queue.
                  </p>
                </div>

                <div className="space-y-2.5">
                  {currentNeedsOptions.map(need => {
                    const isChecked = selectedNeeds.includes(need.id);
                    return (
                      <div
                        key={need.id}
                        onClick={() => toggleNeed(need.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 btn-tactile ${
                          isChecked
                            ? "bg-surface-2 border-brass ring-1 ring-brass/30 shadow-sm"
                            : "bg-surface-2/40 border-line hover:border-line-strong"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isChecked ? "bg-brass border-brass text-white" : "border-line-strong bg-surface"
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <span className="text-xs font-bold text-text">{need.title}</span>
                            <div className="flex items-center gap-1.5">
                              {need.recommended && (
                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold uppercase font-mono tracking-wide">
                                  Recommended
                                </span>
                              )}
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-surface border border-line text-brass font-semibold uppercase">
                                {need.category}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                            {need.detail}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Custom Bottleneck / Priority Write-in Option */}
                <div className="p-3.5 rounded-xl border border-line bg-surface-2/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text">Add Custom Priority or Bottleneck</span>
                    <span className="text-[10px] text-text-muted">Type and press Enter or click + Add</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customNeedInput}
                      onChange={e => setCustomNeedInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomNeed();
                        }
                      }}
                      placeholder="e.g. Reduce customer onboarding drop-off rate, negotiate supplier credit terms..."
                      className="flex-1 px-3 py-2 rounded-lg bg-surface border border-line text-xs text-text focus:outline-none focus:ring-1 focus:ring-brass"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomNeed}
                      className="px-3.5 py-2 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 btn-tactile cursor-pointer shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(2.9)}
                    className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
                  >
                    Back to Business Tools
                  </button>
                  <button
                    id="btn-assemble-os"
                    type="button"
                    onClick={handleCompleteSetup}
                    className="px-6 py-3 rounded-xl bg-brass text-white font-bold text-xs shadow-lg hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ArrowRight className="w-4 h-4" />
                    <span>Assemble My Custom Business OS</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Live AI Assembly Sequence */
          <div className="p-8 sm:p-12 rounded-2xl border border-line bg-surface shadow-2xl text-center space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-line flex items-center justify-center mx-auto p-2.5 shadow-md">
              <Image
                src="/logo.png"
                alt="BizzPal Logo"
                width={48}
                height={48}
                className="object-contain animate-pulse"
              />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-text">Assembling Your Business OS</h2>
              <p className="text-xs text-brass font-medium min-h-[1.5rem] animate-fade-in">
                {statusMessage}
              </p>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden border border-line">
              <div
                className="h-full bg-brass transition-all duration-300 rounded-full"
                style={{ width: `${assemblyProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-text-muted">
              Generating tailored dashboard, specialist AI executive prompts, and gap playbooks…
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-text-muted">
        BizzPal OS · Enterprise Setup Wizard
      </div>

      {/* Real Tool Authorization & Credential Modal */}
      <RealToolAuthModal
        isOpen={Boolean(activeAuthToolId)}
        onClose={() => setActiveAuthToolId(null)}
        toolId={activeAuthToolId}
        toolName={TOOLS_OPTIONS.find(t => t.id === activeAuthToolId)?.name || "Tool"}
        currentUserEmail={currentUserEmail}
        companyName={companyName}
        currentAuthState={activeAuthToolId ? toolAuthStates[activeAuthToolId] : undefined}
        onConnectSuccess={handleRealConnectSuccess}
        onDisconnect={handleRealDisconnect}
      />
    </div>
  );
}


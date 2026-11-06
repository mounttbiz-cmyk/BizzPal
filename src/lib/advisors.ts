import { useEffect, useState } from "react";

export interface AgentMeta {
  id: string;
  name: string;
  role: string;
  avatar: string;
  badge: string;
  color: string;
  summary: string;
  quickTools: { name: string; href: string }[];
  promptSuggestions: string[];
  kpis: string[];
  telemetryFeeds: string[];
}

export const DEFAULT_EXECUTIVE_AGENTS: AgentMeta[] = [
  {
    id: "ceo",
    name: "CEO",
    role: "Chief Executive Officer",
    avatar: "Briefcase",
    badge: "Company Direction",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
    summary: "Company direction, capital allocation, executive priorities, and board-level directives.",
    quickTools: [
      { name: "Scenario Planner", href: "/simulator" },
      { name: "Gap Register", href: "/gaps" },
      { name: "Executive Briefings", href: "/reports" },
    ],
    promptSuggestions: [
      "Audit our cash runway and recommend a 90-day capital preservation plan.",
      "Evaluate whether we should hire senior sales or double paid acquisition.",
      "Review client concentration risk under our current revenue structure.",
    ],
    kpis: ["Liquid Runway", "Corporate Health", "Executive Priorities"],
    telemetryFeeds: ["Executive Ledger", "Daily Check-Ins", "Gap Register"],
  },
  {
    id: "cfo",
    name: "CFO",
    role: "Chief Financial Officer",
    avatar: "Landmark",
    badge: "Cash & Budget",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
    summary: "Cash flow underwriting, burn rate compression, unit economics, and solvency governance.",
    quickTools: [
      { name: "Cash Flow Forecast", href: "/tools?tool=cashflow" },
      { name: "Profit Calculator", href: "/tools?tool=profit" },
      { name: "Break-Even Calculator", href: "/tools?tool=breakeven" },
      { name: "ROI Calculator", href: "/tools?tool=roi" },
    ],
    promptSuggestions: [
      "Analyze our net burn against current liquid cash reserves.",
      "What is our exact CAC payback period based on our last 3 months data?",
      "What is our break-even revenue requirement if operating costs increase 15%?",
    ],
    kpis: ["Operating Margin", "CAC Payback", "Net Cash Burn"],
    telemetryFeeds: ["Stripe Invoicing", "Razorpay Ledger", "Expense Logs"],
  },
  {
    id: "marketing",
    name: "Marketing",
    role: "Head of Marketing",
    avatar: "Megaphone",
    badge: "Growth & Leads",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
    summary: "Inbound funnel economics, organic CAC reduction, brand positioning, and conversion velocity.",
    quickTools: [
      { name: "CAC Calculator", href: "/tools?tool=cac" },
      { name: "Pricing Simulator", href: "/tools?tool=pricing" },
      { name: "Knowledge Hub", href: "/knowledge" },
    ],
    promptSuggestions: [
      "Where is the highest-leverage dropoff in our primary conversion funnel?",
      "How do we decrease blended CAC while sustaining lead volume?",
      "Suggest high-converting inbound positioning angles for our market.",
    ],
    kpis: ["Blended CAC", "MQL-to-SQL Velocity", "Organic Share of Voice"],
    telemetryFeeds: ["Google Analytics 4", "Meta Ads Manager", "HubSpot CRM"],
  },
  {
    id: "sales",
    name: "Sales",
    role: "Head of Sales",
    avatar: "Handshake",
    badge: "Deals & Revenue",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
    summary: "Deal qualification, pipeline velocity, pricing power resistance, and contract expansion.",
    quickTools: [
      { name: "Decision Simulator", href: "/simulator" },
      { name: "Playbooks Library", href: "/playbooks" },
      { name: "Knowledge Hub", href: "/knowledge" },
    ],
    promptSuggestions: [
      "Which stalled pipeline opportunities have the highest probability of closing this month?",
      "Analyze buyer objections around our mid-tier enterprise contract.",
      "How can we introduce usage-based expansion tiers into our current proposals?",
    ],
    kpis: ["Win Rate %", "Pipeline Cycle Days", "ACV Expansion Rate"],
    telemetryFeeds: ["Salesforce", "Email Engagement", "DocuSign Closes"],
  },
  {
    id: "hr",
    name: "HR & Talent",
    role: "Head of People & HR",
    avatar: "Users",
    badge: "Hiring & Team",
    color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
    summary: "Headcount capacity modeling, key-person dependency risks, retention, and compensation benchmarks.",
    quickTools: [
      { name: "Hiring Simulator", href: "/tools?tool=hiring" },
      { name: "Team Governance", href: "/team" },
      { name: "Hiring Playbooks", href: "/playbooks" },
    ],
    promptSuggestions: [
      "Do we have sufficient engineering capacity to support our Q3 product roadmap?",
      "Quantify the key-person delivery risk across our core client accounts.",
      "Benchmark our developer salary structure against enterprise tier averages.",
    ],
    kpis: ["Revenue Per FTE", "Key-Person Risk Factor", "Quarterly Retention %"],
    telemetryFeeds: ["BambooHR", "Slack Telemetry", "Payroll Ledger"],
  },
  {
    id: "operations",
    name: "Operations",
    role: "Head of Operations",
    avatar: "Settings2",
    badge: "Daily Operations",
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
    summary: "Fulfillment bottlenecks, delivery SLAs, cross-team handoffs, and vendor cost optimization.",
    quickTools: [
      { name: "Workflows Builder", href: "/workflows" },
      { name: "Automations Engine", href: "/automations" },
      { name: "Tasks Queue", href: "/tasks" },
    ],
    promptSuggestions: [
      "Where are the biggest operational bottlenecks in our delivery cycle?",
      "How can we automate client onboarding handoffs?",
      "Review our vendor software subscriptions for redundancy.",
    ],
    kpis: ["Delivery SLA Rate", "Cycle Time to Close", "Unbilled Scope Creep"],
    telemetryFeeds: ["Help Desk (Zendesk)", "Slack Ops", "Execution Queue"],
  },
  {
    id: "strategy",
    name: "Strategy",
    role: "Chief Strategy Officer",
    avatar: "Compass",
    badge: "Market Strategy",
    color: "text-orange-500 bg-orange-500/10 border-orange-500/30",
    summary: "Defensibility analysis, competitive moats, market expansion playbooks, and strategic partnerships.",
    quickTools: [
      { name: "Market Entry Simulator", href: "/tools?tool=market_entry" },
      { name: "Scenario Planner", href: "/tools?tool=scenario_planner" },
      { name: "Expansion Simulator", href: "/tools?tool=expansion" },
    ],
    promptSuggestions: [
      "Evaluate our competitive moat against legacy enterprise players.",
      "What are the highest-margin expansion vectors for next year?",
      "Structure a defensibility framework for our proprietary data.",
    ],
    kpis: ["Gross Margin Defensibility", "Expansion Payback", "Partner Retention"],
    telemetryFeeds: ["Market Telemetry", "Competitive Intel", "Platform Data"],
  },
];

export type CustomAdvisorStore = Record<string, { name?: string; avatar?: string }>;

export function getStoredCustomAdvisors(): CustomAdvisorStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem("bizzpal_custom_advisors");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveStoredCustomAdvisors(data: CustomAdvisorStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("bizzpal_custom_advisors", JSON.stringify(data));
    window.dispatchEvent(new Event("bizzpal_advisors_updated"));
  } catch (e) {
    console.error("Failed to save custom advisors:", e);
  }
}

export const LEGACY_NAMES = new Set(["astra", "marcus", "elena", "vikram", "sarah", "david", "rohan"]);
const LEGACY_AVATARS = new Set(["crown", "zap", "workflow", "target", "trendingup"]);

export function resolveEffectiveAgents(custom: CustomAdvisorStore = {}): AgentMeta[] {
  return DEFAULT_EXECUTIVE_AGENTS.map(agent => {
    const customData = custom[agent.id];
    if (!customData) return agent;

    const storedName = customData.name?.trim();
    const storedAvatar = customData.avatar?.trim();

    // Auto-upgrade legacy character names or deprecated default avatars
    const effectiveName =
      storedName && !LEGACY_NAMES.has(storedName.toLowerCase())
        ? storedName
        : agent.name;

    const effectiveAvatar =
      storedAvatar && !LEGACY_AVATARS.has(storedAvatar.toLowerCase())
        ? storedAvatar
        : agent.avatar;

    return {
      ...agent,
      name: effectiveName,
      avatar: effectiveAvatar,
    };
  });
}

export function useCustomAdvisors() {
  const [store, setStore] = useState<CustomAdvisorStore>(() => getStoredCustomAdvisors());

  useEffect(() => {
    const handleSync = () => {
      setStore(getStoredCustomAdvisors());
    };
    handleSync();
    window.addEventListener("bizzpal_advisors_updated", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const getAdvisorName = (id: string, fallback?: string): string => {
    const key = id === "coo" ? "operations" : id === "cmo" ? "marketing" : id;
    const item = store[key] || store[id];
    const val = item?.name?.trim();
    if (val && !LEGACY_NAMES.has(val.toLowerCase())) {
      return val;
    }
    if (fallback) return fallback;
    const def = DEFAULT_EXECUTIVE_AGENTS.find(a => a.id === key || a.id === id);
    return def ? def.name : "Advisor";
  };

  const ceoName = getAdvisorName("ceo", "CEO");
  const cfoName = getAdvisorName("cfo", "CFO");
  const marketingName = getAdvisorName("marketing", "Marketing");
  const salesName = getAdvisorName("sales", "Sales");
  const hrName = getAdvisorName("hr", "HR & Talent");
  const opsName = getAdvisorName("operations", "Operations");
  const strategyName = getAdvisorName("strategy", "Strategy");

  const effectiveAgents = resolveEffectiveAgents(store);

  const updateAdvisor = (id: string, name: string, avatar?: string) => {
    const key = id === "coo" ? "operations" : id === "cmo" ? "marketing" : id;
    const current = getStoredCustomAdvisors();
    const updated: CustomAdvisorStore = {
      ...current,
      [key]: {
        name: name.trim() || undefined,
        avatar: avatar || current[key]?.avatar || current[id]?.avatar,
      },
    };
    saveStoredCustomAdvisors(updated);
    setStore(updated);
  };

  const saveAllAdvisors = (nextStore: CustomAdvisorStore) => {
    saveStoredCustomAdvisors(nextStore);
    setStore(nextStore);
  };

  const resetAdvisor = (id: string) => {
    const key = id === "coo" ? "operations" : id === "cmo" ? "marketing" : id;
    const current = getStoredCustomAdvisors();
    const next = { ...current };
    delete next[key];
    delete next[id];
    saveStoredCustomAdvisors(next);
    setStore(next);
  };

  const resetAllAdvisors = () => {
    saveStoredCustomAdvisors({});
    setStore({});
  };

  return {
    store,
    getAdvisorName,
    ceoName,
    cfoName,
    marketingName,
    salesName,
    hrName,
    opsName,
    strategyName,
    effectiveAgents,
    updateAdvisor,
    saveAllAdvisors,
    resetAdvisor,
    resetAllAdvisors,
  };
}

export function getAdvisorGreeting(agent: AgentMeta, companyProfile?: any): string {
  const cName = companyProfile?.name || "your enterprise";
  const founder = companyProfile?.founderName ? `, ${companyProfile.founderName}` : "";

  switch (agent.id) {
    case "ceo":
      return `Good day${founder}. Welcome to your CEO Advisory desk.

Here is what I can do for you and ${cName}:
• Oversee company direction, capital allocation, and top execution priorities.
• Evaluate high-stakes strategic trade-offs, scenario models, and board-level decisions.
• Safeguard your cash runway and align quarterly growth objectives across your entire leadership team.

What strategic challenge or priority shall we tackle today?`;

    case "cfo":
      return `Hello${founder}. Welcome to your CFO Financial Governance desk.

Here is what I can do for you and ${cName}:
• Underwrite financial solvency, track net cash burn, and model real-time liquid runway.
• Audit unit economics including CAC payback, gross margins, and customer lifetime value (LTV).
• Calculate break-even milestones, identify margin leakages, and optimize capital expenditure.

What financial model, budget, or runway forecast should we analyze?`;

    case "marketing":
      return `Hello${founder}. Welcome to your Marketing & Demand Generation desk.

Here is what I can do for you and ${cName}:
• Accelerate customer acquisition and drive high-converting inbound and outbound funnels.
• Lower blended customer acquisition cost (CAC) and sharpen product positioning against competitors.
• Design organic content engines, evaluate ad channel efficiency (ROAS), and scale market reach.

How can we accelerate your market growth and lead volume today?`;

    case "sales":
      return `Hello${founder}. Welcome to your Sales & Revenue Growth desk.

Here is what I can do for you and ${cName}:
• Accelerate pipeline velocity, qualify high-value enterprise leads, and close stalled opportunities.
• Overcome pricing resistance, structure multi-tier annual contracts, and drive account expansion.
• Optimize sales conversion rates, proposal win percentages, and rep quotas.

Which pipeline deal or revenue milestone shall we close today?`;

    case "hr":
      return `Hello${founder}. Welcome to your People, HR & Talent Governance desk.

Here is what I can do for you and ${cName}:
• Model headcount capacity to ensure your team can deliver on company roadmaps.
• Benchmark executive and technical compensation packages against current industry averages.
• Diagnose key-person dependencies, mitigate operational turnover risk, and build a high-retention culture.

What hiring, compensation, or team capacity decision can I help you evaluate?`;

    case "operations":
      return `Hello${founder}. Welcome to your Operations & Process Optimization desk.

Here is what I can do for you and ${cName}:
• Eliminate bottlenecks in your delivery cycles and ensure customer fulfillment SLAs stay on target.
• Automate cross-department handoffs, client onboarding protocols, and routine workflows.
• Audit software licenses, vendor contracts, and recurring operating overhead for cost waste.

Where are you feeling operational friction, or which workflow should we streamline?`;

    case "strategy":
      return `Hello${founder}. Welcome to your Strategic Moats & Market Expansion desk.

Here is what I can do for you and ${cName}:
• Analyze competitive moats, pricing power defensibility, and long-term positioning barriers.
• Identify high-margin market expansion vectors, new product tiers, and partnership opportunities.
• Stress-test your business model against legacy competitors and macroeconomic disruptions.

What market opportunity or strategic advantage would you like to explore?`;

    default:
      return `Hello${founder}. I am your ${agent.name} advisor for ${cName}. I am here to help you analyze business telemetry, solve operational hurdles, and scale efficiently. What shall we work on today?`;
  }
}

/**
 * React hook to reactively track customized executive advisors across any component.
 */
export function useEffectiveAdvisors() {
  const [customAdvisors, setCustomAdvisors] = useState<CustomAdvisorStore>(() => getStoredCustomAdvisors());

  useEffect(() => {
    const handleUpdate = () => {
      setCustomAdvisors(getStoredCustomAdvisors());
    };

    handleUpdate();
    window.addEventListener("bizzpal_advisors_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const agents = resolveEffectiveAgents(customAdvisors);
  const ceo = agents.find(a => a.id === "ceo") || agents[0];
  const cfo = agents.find(a => a.id === "cfo") || agents[1];
  const cmo = agents.find(a => a.id === "marketing") || agents[2];
  const sales = agents.find(a => a.id === "sales") || agents[3];

  return {
    agents,
    customAdvisors,
    ceo,
    cfo,
    cmo,
    sales,
    getAgent: (id: string) => agents.find(a => a.id === id) || agents[0],
    updateAgent: (id: string, data: { name: string; avatar: string }) => {
      const updated = {
        ...customAdvisors,
        [id]: {
          name: data.name.trim() || undefined,
          avatar: data.avatar || undefined,
        },
      };
      saveStoredCustomAdvisors(updated);
    },
    resetAgent: (id: string) => {
      const updated = { ...customAdvisors };
      delete updated[id];
      saveStoredCustomAdvisors(updated);
    },
  };
}

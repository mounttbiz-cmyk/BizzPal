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
    name: "Astra",
    role: "CEO AI",
    avatar: "Crown",
    badge: "Strategic Vision",
    color: "text-brass bg-brass/10 border-brass/30",
    summary: "Capital allocation, strategic decisions, board directives, and enterprise-level risk posture.",
    quickTools: [
      { name: "Scenario Planner", href: "/tools?tool=scenario_planner" },
      { name: "Gap Register", href: "/gaps" },
      { name: "Executive Briefings", href: "/reports" },
    ],
    promptSuggestions: [
      "Audit our cash runway and recommend a 90-day capital preservation plan.",
      "Evaluate whether we should hire senior sales or double paid acquisition.",
      "Review client concentration risk under our current revenue structure.",
    ],
    kpis: ["Net Runway Months", "Gross Burn Rate", "Customer Concentration"],
    telemetryFeeds: ["QuickBooks (Live)", "Stripe Payments", "Bank Reserve Feeds"],
  },
  {
    id: "cfo",
    name: "Marcus",
    role: "CFO AI",
    avatar: "TrendingUp",
    badge: "Capital & Runway",
    color: "text-jade bg-jade/10 border-jade/30",
    summary: "Cash flow underwriting, burn rate compression, unit economics, and solvency governance.",
    quickTools: [
      { name: "Unit Economics Calculator", href: "/tools?tool=unit_economics" },
      { name: "Break-Even Engine", href: "/tools?tool=break_even" },
      { name: "Cash Forecast", href: "/analytics" },
    ],
    promptSuggestions: [
      "Calculate our exact CAC payback period based on our last 3 months data.",
      "What is our break-even revenue requirement if operating costs increase 15%?",
      "Audit our current cloud and SaaS expenditure for margin leakage.",
    ],
    kpis: ["Operating Margin", "CAC Payback", "Net Cash Burn"],
    telemetryFeeds: ["Stripe Invoicing", "Razorpay Ledger", "Expense Logs"],
  },
  {
    id: "marketing",
    name: "Elena",
    role: "Marketing AI",
    avatar: "Target",
    badge: "Demand & Growth",
    color: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    summary: "Inbound funnel economics, organic CAC reduction, positioning, and conversion velocity.",
    quickTools: [
      { name: "Audience Profiler", href: "/tools?tool=audience_profiler" },
      { name: "Competitor Intel", href: "/tools?tool=competitor_intel" },
      { name: "Playbooks Hub", href: "/playbooks" },
    ],
    promptSuggestions: [
      "Where is the highest-leverage dropoff in our primary conversion funnel?",
      "How do we decrease blended CAC while sustaining lead volume?",
      "Design an enterprise positioning angle that out-converts commoditized competitors.",
    ],
    kpis: ["Blended CAC", "MQL-to-SQL Velocity", "Organic Share of Voice"],
    telemetryFeeds: ["Google Analytics 4", "Meta Ads Manager", "HubSpot CRM"],
  },
  {
    id: "sales",
    name: "Vikram",
    role: "Sales AI",
    avatar: "Zap",
    badge: "Deal Velocity",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
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
    name: "Sarah",
    role: "HR & Talent AI",
    avatar: "Users",
    badge: "Talent & Culture",
    color: "text-rose-400 bg-rose-400/10 border-rose-400/30",
    summary: "Headcount capacity modeling, key-person dependency risks, retention, and compensation benchmarks.",
    quickTools: [
      { name: "Capacity Modeler", href: "/tools?tool=capacity" },
      { name: "Team Governance", href: "/team" },
      { name: "Hiring Playbooks", href: "/playbooks" },
    ],
    promptSuggestions: [
      "Do we have sufficient engineering capacity to support our Q3 product roadmap?",
      "Quantify the key-person delivery risk across our core client accounts.",
      "Benchmark our developer base salary structure against Indian enterprise tier averages.",
    ],
    kpis: ["Revenue Per FTE", "Key-Person Risk Factor", "Quarterly Retention %"],
    telemetryFeeds: ["BambooHR", "Slack Telemetry", "Payroll Ledger"],
  },
  {
    id: "operations",
    name: "David",
    role: "Operations AI",
    avatar: "Workflow",
    badge: "Efficiency & SLAs",
    color: "text-cyan-400 bg-cyan-400/10 border-cyan-500/30",
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
    name: "Rohan",
    role: "Strategy AI",
    avatar: "Compass",
    badge: "Moats & Expansion",
    color: "text-orange-400 bg-orange-400/10 border-orange-400/30",
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

export function resolveEffectiveAgents(custom: CustomAdvisorStore = {}): AgentMeta[] {
  return DEFAULT_EXECUTIVE_AGENTS.map(agent => {
    const customData = custom[agent.id];
    if (!customData) return agent;
    return {
      ...agent,
      name: customData.name?.trim() || agent.name,
      avatar: customData.avatar || agent.avatar,
    };
  });
}

export function getAdvisorGreeting(agent: AgentMeta, companyProfile?: any): string {
  const cName = companyProfile?.name || "your enterprise";
  const runway = companyProfile?.burn && companyProfile?.cash
    ? (companyProfile.cash / companyProfile.burn).toFixed(1)
    : (companyProfile?.cash ? "18+" : "7.2");

  switch (agent.id) {
    case "ceo":
      return `Good day. I am ${agent.name}, your ${agent.role}. I monitor company runway, capital allocation, and top-tier execution priorities for ${cName}. What strategic directive shall we review today?`;
    case "cfo":
      return `${agent.name} online. Cash burn, working capital, and unit economics are under surveillance. Your current liquid runway stands at ${runway} months. What financial model should we analyze?`;
    case "marketing":
      return `${agent.name} ready. I'm tracking your inbound channel distribution, CAC payback velocity, and positioning resonance. How can we accelerate demand today?`;
    case "sales":
      return `${agent.name} ready. Let's look at pipeline velocity, deal size qualification, proposal win rates, and enterprise client expansions. What pipeline are we closing?`;
    case "hr":
      return `Hi there, ${agent.name} here. I specialize in headcount planning, talent retention benchmarks, compensation parity, and operational hiring velocity.`;
    case "operations":
      return `${agent.name} active. I optimize your day-to-day workflow pipelines, eliminate manual friction, and ensure customer delivery SLAs remain in the top quartile.`;
    case "strategy":
      return `${agent.name} here. I analyze competitive defensibility, market expansion opportunities, pricing power moats, and strategic alliances.`;
    default:
      return `Good day. I am ${agent.name}, your ${agent.role}. How can I assist you with ${cName} today?`;
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

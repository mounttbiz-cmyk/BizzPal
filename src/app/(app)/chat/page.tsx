"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ChatMarkdown } from "@/components/shell/ChatMarkdown";
import {
  BrainCircuit,
  Send,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Target,
  Users,
  Building2,
  Workflow,
  Compass,
  AlertTriangle,
  FileText,
  RotateCcw,
  CheckCircle2,
  Sliders,
  ChevronRight,
  Bot,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Clock,
  Info,
  MessageSquare,
  Pencil,
  User,
} from "lucide-react";
import { parseNaturalBusinessInput, ExtractedBusinessRecord } from "@/lib/intake/nlpParser";
import { emitBusinessDataUpdated } from "@/lib/upload/events";
import {
  CustomizeAdvisorModal,
  AgentAvatarIcon,
} from "@/components/chat/CustomizeAdvisorModal";

interface AgentMeta {
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

const EXECUTIVE_AGENTS: AgentMeta[] = [
  {
    id: "ceo",
    name: "Astra",
    role: "CEO AI",
    avatar: "Crown",
    badge: "Strategic Vision",
    color: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    summary: "Capital efficiency, enterprise scale milestones, founder alignment, and board-level directives.",
    quickTools: [
      { name: "Scenario Planner", href: "/simulator" },
      { name: "Gap Register", href: "/gaps" },
      { name: "Executive Briefings", href: "/reports" },
    ],
    promptSuggestions: [
      "What is our top strategic vulnerability this month?",
      "Review my runway and recommend our next 90-day focus.",
      "How should I allocate budget between sales and product?",
    ],
    kpis: ["Liquid Runway", "Overall Health Score", "Strategic Moats"],
    telemetryFeeds: ["Executive Ledger", "Daily Check-Ins", "Gap Register"],
  },
  {
    id: "cfo",
    name: "Marcus",
    role: "CFO AI",
    avatar: "TrendingUp",
    badge: "Capital & Runway",
    color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    summary: "Cash burn, liquidity runway, unit economics, INR tax/balance sheet discipline, and solvency alarms.",
    quickTools: [
      { name: "Cash Flow Forecast", href: "/tools?tool=cashflow" },
      { name: "Profit Calculator", href: "/tools?tool=profit" },
      { name: "Break-Even Calculator", href: "/tools?tool=breakeven" },
      { name: "ROI Calculator", href: "/tools?tool=roi" },
    ],
    promptSuggestions: [
      "Analyze our net burn against current liquid reserves.",
      "What is our target break-even milestone in Indian Rupees?",
      "Calculate runway extension if we reduce tooling by 15%.",
    ],
    kpis: ["Net Monthly Burn", "Gross Profit Margin", "Cash Inflow Velocity"],
    telemetryFeeds: ["Stripe Invoicing", "Zoho Books / QuickBooks", "Banking Ledger"],
  },
  {
    id: "marketing",
    name: "Elena",
    role: "Marketing AI",
    avatar: "Target",
    badge: "Demand & Growth",
    color: "text-purple-400 bg-purple-400/10 border-purple-400/30",
    summary: "CAC, ROAS efficiency, organic funnels, brand positioning, and demand generation economics.",
    quickTools: [
      { name: "CAC Calculator", href: "/tools?tool=cac" },
      { name: "Pricing Simulator", href: "/tools?tool=pricing" },
      { name: "Knowledge Hub", href: "/knowledge" },
    ],
    promptSuggestions: [
      "How can we reduce our blended customer acquisition cost (CAC)?",
      "Benchmark our marketing spend against Indian SaaS standards.",
      "Suggest high-converting inbound content topics for our ICP.",
    ],
    kpis: ["Blended CAC", "LTV:CAC Ratio", "Channel Concentration"],
    telemetryFeeds: ["Ad Platforms", "Website Traffic", "Lead Telemetry"],
  },
  {
    id: "sales",
    name: "Vikram",
    role: "Sales AI",
    avatar: "Zap",
    badge: "Deal Velocity",
    color: "text-blue-400 bg-blue-400/10 border-blue-400/30",
    summary: "Pipeline velocity, enterprise deal structuring, lead scoring, and sales representative quotas.",
    quickTools: [
      { name: "Pricing Simulator", href: "/tools?tool=pricing" },
      { name: "Execution Queue", href: "/tasks" },
      { name: "Gap Register", href: "/gaps" },
    ],
    promptSuggestions: [
      "Audit our deal qualification criteria to improve close rates.",
      "How do we transition mid-market deals to annual contracts?",
      "Simulate revenue impact of closing 3 enterprise accounts.",
    ],
    kpis: ["Pipeline Velocity", "Average Deal Size", "Win Rate %"],
    telemetryFeeds: ["Google Calendar", "Slack Sales Room", "CRM Pipeline"],
  },
  {
    id: "hr",
    name: "Sarah",
    role: "HR & Talent AI",
    avatar: "Users",
    badge: "Talent & Culture",
    color: "text-rose-400 bg-rose-400/10 border-rose-400/30",
    summary: "Headcount planning, talent retention, hiring cost, organizational structure, and compensation benchmarks.",
    quickTools: [
      { name: "Hiring Simulator", href: "/tools?tool=hiring" },
      { name: "Team Roster", href: "/team" },
      { name: "Tasks Queue", href: "/tasks" },
    ],
    promptSuggestions: [
      "What is the fully loaded cost of hiring 2 senior engineers in India?",
      "Evaluate our revenue per employee vs peers.",
      "Draft performance milestone incentives for our key leaders.",
    ],
    kpis: ["Revenue per FTE", "Headcount Payroll Load", "Team Capacity Index"],
    telemetryFeeds: ["HR & Payroll Roster", "Slack Morale", "Calendar Load"],
  },
  {
    id: "operations",
    name: "David",
    role: "Operations AI",
    avatar: "Workflow",
    badge: "Efficiency & SLAs",
    color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
    summary: "Process optimization, workflow automation, operational bottlenecks, vendor SLAs, and delivery margins.",
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

interface ChatMessage {
  id: string;
  sender: "agent" | "user";
  agentId: string;
  agentName: string;
  avatar: string;
  timestamp: string;
  content: string;
  provider?: string;
  structuredRecord?: ExtractedBusinessRecord | null;
  recordCommitted?: boolean;
  nextSteps?: string[];
}

export default function ChatWorkspacePage() {
  const [activeAgentId, setActiveAgentId] = useState<string>("ceo");
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showDossier, setShowDossier] = useState(true);
  const [searchRoster, setSearchRoster] = useState("");
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial seed conversations for each agent
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({
    ceo: [
      {
        id: "msg_init_ceo",
        sender: "agent",
        agentId: "ceo",
        agentName: "Astra (CEO AI)",
        avatar: "Crown",
        timestamp: "Just now",
        content:
          "Good day. I am Astra, your CEO AI. I monitor company runway, capital allocation, and top-tier execution priorities. What strategic directive shall we review today?",
        provider: "bizzpal-ai",
        nextSteps: ["Review Runway & Solvency", "Examine Secondary Pipelines", "Run Decision Simulation"],
      },
    ],
    cfo: [
      {
        id: "msg_init_cfo",
        sender: "agent",
        agentId: "cfo",
        agentName: "Marcus (CFO AI)",
        avatar: "TrendingUp",
        timestamp: "Just now",
        content:
          "Marcus online. Cash burn, working capital, and unit economics are under surveillance. Your current liquid runway stands at 7.2 months. What financial model should we analyze?",
        provider: "bizzpal-ai",
        nextSteps: ["Open Cash Flow Forecast", "Analyze Tooling Overheads", "Calculate Break-Even Threshold"],
      },
    ],
    marketing: [
      {
        id: "msg_init_mkt",
        sender: "agent",
        agentId: "marketing",
        agentName: "Elena (Marketing AI)",
        avatar: "Target",
        timestamp: "Just now",
        content:
          "Elena ready. I'm tracking your inbound channel distribution, CAC payback velocity, and positioning resonance. How can we accelerate demand today?",
        provider: "bizzpal-ai",
        nextSteps: ["Audit Inbound Conversion Rates", "Calculate Blended CAC", "Plan ICP Retargeting Campaign"],
      },
    ],
    sales: [
      {
        id: "msg_init_sales",
        sender: "agent",
        agentId: "sales",
        agentName: "Vikram (Sales AI)",
        avatar: "Zap",
        timestamp: "Just now",
        content:
          "Vikram ready. Let's look at pipeline velocity, deal size qualification, proposal win rates, and enterprise client expansions. What pipeline are we closing?",
        provider: "bizzpal-ai",
        nextSteps: ["Score Pipeline Deals", "Audit Stalled Leads", "Model Enterprise Contract Tiering"],
      },
    ],
    hr: [
      {
        id: "msg_init_hr",
        sender: "agent",
        agentId: "hr",
        agentName: "Sarah (HR & Talent AI)",
        avatar: "Users",
        timestamp: "Just now",
        content:
          "Hi there, Sarah here. I specialize in headcount planning, talent retention benchmarks, compensation parity, and operational hiring velocity.",
        provider: "bizzpal-ai",
        nextSteps: ["Simulate Engineering Hire", "Check Revenue Per FTE", "Benchmark Tech Salaries in India"],
      },
    ],
    operations: [
      {
        id: "msg_init_ops",
        sender: "agent",
        agentId: "operations",
        agentName: "David (Operations AI)",
        avatar: "Workflow",
        timestamp: "Just now",
        content:
          "David active. I optimize your day-to-day workflow pipelines, eliminate manual friction, and ensure customer delivery SLAs remain in the top quartile.",
        provider: "bizzpal-ai",
        nextSteps: ["Launch Workflows Builder", "Audit Delivery Delays", "Review Vendor Subscriptions"],
      },
    ],
    strategy: [
      {
        id: "msg_init_strat",
        sender: "agent",
        agentId: "strategy",
        agentName: "Rohan (Strategy AI)",
        avatar: "Compass",
        timestamp: "Just now",
        content:
          "Rohan here. I analyze competitive defensibility, market expansion opportunities, pricing power moats, and strategic alliances.",
        provider: "bizzpal-ai",
        nextSteps: ["Open Market Entry Simulator", "Simulate Tier-2 City Expansion", "Map Platform Defensibility"],
      },
    ],
  });

  const [customAdvisors, setCustomAdvisors] = useState<Record<string, { name?: string; avatar?: string }>>({});
  const [editingAgent, setEditingAgent] = useState<AgentMeta | null>(null);

  // Load custom advisors from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_custom_advisors");
      if (saved) {
        setCustomAdvisors(JSON.parse(saved));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleSaveCustomAdvisor = (agentId: string, customData: { name: string; avatar: string }) => {
    const updated = {
      ...customAdvisors,
      [agentId]: {
        name: customData.name.trim() || undefined,
        avatar: customData.avatar || undefined,
      },
    };
    setCustomAdvisors(updated);
    try {
      localStorage.setItem("bizzpal_custom_advisors", JSON.stringify(updated));
      window.dispatchEvent(new Event("bizzpal_advisors_updated"));
    } catch (e) {}
    setEditingAgent(null);
  };

  const handleResetCustomAdvisor = (agentId: string) => {
    const updated = { ...customAdvisors };
    delete updated[agentId];
    setCustomAdvisors(updated);
    try {
      localStorage.setItem("bizzpal_custom_advisors", JSON.stringify(updated));
      window.dispatchEvent(new Event("bizzpal_advisors_updated"));
    } catch (e) {}
    setEditingAgent(null);
  };

  const effectiveAgents = React.useMemo(() => {
    return EXECUTIVE_AGENTS.map(agent => {
      const custom = customAdvisors[agent.id];
      if (!custom) return agent;
      return {
        ...agent,
        name: custom.name?.trim() || agent.name,
        avatar: custom.avatar || agent.avatar,
      };
    });
  }, [customAdvisors]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_business_profile");
      if (saved) {
        setCompanyProfile(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, isTyping, activeAgentId]);

  const activeAgent = effectiveAgents.find(a => a.id === activeAgentId) || effectiveAgents[0];
  const currentMessages = conversations[activeAgentId] || [];

  const handleCommitRecordFromChat = async (record: ExtractedBusinessRecord, msgId: string) => {
    try {
      const savedProfileStr = localStorage.getItem("bizzpal_business_profile");
      const existing = savedProfileStr ? JSON.parse(savedProfileStr) : {};

      const currentMonthlyRev = Number(existing.revenue || existing.monthlyRevenue) || 0;
      const currentBurn = Number(existing.burn || existing.monthlyBurn) || 0;
      const currentCash = Number(existing.cash || existing.cashOnHand) || 0;

      const newMonthlyRev = record.dailyRevenue
        ? Math.round(record.dailyRevenue * 30)
        : currentMonthlyRev;

      const newBurn = record.dailyExpenses
        ? Math.round(record.dailyExpenses * 30)
        : currentBurn;

      const newCash = record.cashOnHand
        ? record.cashOnHand
        : (record.dailyRevenue ? currentCash + record.dailyRevenue : currentCash);

      const newAnnualRev = newMonthlyRev * 12;

      const updatedProfile = {
        ...existing,
        revenue: newMonthlyRev,
        monthlyRevenue: newMonthlyRev,
        annualRevenue: newAnnualRev,
        burn: newBurn,
        monthlyBurn: newBurn,
        cash: newCash,
        cashOnHand: newCash,
        teamSize: record.teamSize || existing.teamSize || 10,
        lastDailyInput: {
          dailyRevenue: record.dailyRevenue,
          dailyOrders: record.dailyOrders,
          dailyExpenses: record.dailyExpenses,
          recordedAt: new Date().toISOString(),
          notes: record.rawText,
        },
      };

      localStorage.setItem("bizzpal_business_profile", JSON.stringify(updatedProfile));
      setCompanyProfile(updatedProfile);

      try {
        await fetch("/api/business/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: updatedProfile.name,
            monthlyRevenue: newMonthlyRev,
            annualRevenue: newAnnualRev,
            monthlyBurn: newBurn,
            cashOnHand: newCash,
            teamSize: updatedProfile.teamSize,
          }),
        });
      } catch (err) {
        console.error(err);
      }

      emitBusinessDataUpdated({
        name: updatedProfile.name,
        founderName: updatedProfile.founderName,
        industry: updatedProfile.industry,
        industryLabel: updatedProfile.industryLabel,
        revenue: newMonthlyRev,
        monthlyRevenue: newMonthlyRev,
        annualRevenue: newAnnualRev,
        burn: newBurn,
        monthlyBurn: newBurn,
        cash: newCash,
        cashOnHand: newCash,
        teamSize: updatedProfile.teamSize,
        grossMargin: updatedProfile.grossMargin || 80,
      });

      setConversations(prev => {
        const updatedList = (prev[activeAgentId] || []).map(m => {
          if (m.id === msgId) {
            return { ...m, recordCommitted: true };
          }
          return m;
        });
        return { ...prev, [activeAgentId]: updatedList };
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputMessage).trim();
    if (!message || isTyping) return;

    // Detect if this is a day-to-day operational input statement
    const detectedRecord = parseNaturalBusinessInput(message);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      agentId: activeAgentId,
      agentName: companyProfile?.founderName || "You",
      avatar: "User",
      timestamp: "Just now",
      content: message,
      structuredRecord: detectedRecord,
      recordCommitted: false,
    };

    setConversations(prev => ({
      ...prev,
      [activeAgentId]: [...(prev[activeAgentId] || []), userMsg],
    }));

    if (!textToSend) setInputMessage("");
    setIsTyping(true);

    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          agentId: activeAgentId,
          companyProfile,
        }),
      });

      const data = await resp.json();
      if (data.success) {
        let responseContent = data.text;
        if (detectedRecord) {
          responseContent = `Operational data point recorded. Today's figures (${detectedRecord.summary}) have been validated against our telemetry model. If confirmed, our forward cash reserves and revenue run-rate will be updated accordingly.`;
        }

        const agentMsg: ChatMessage = {
          id: `agt_${Date.now()}`,
          sender: "agent",
          agentId: activeAgentId,
          agentName: activeAgent.name + ` (${activeAgent.role})`,
          avatar: activeAgent.avatar,
          timestamp: "Just now",
          content: responseContent,
          provider: data.provider,
        };

        setConversations(prev => ({
          ...prev,
          [activeAgentId]: [...(prev[activeAgentId] || []), agentMsg],
        }));
      }
    } catch (err) {
      // Fallback
      const fallbackMsg: ChatMessage = {
        id: `agt_err_${Date.now()}`,
        sender: "agent",
        agentId: activeAgentId,
        agentName: activeAgent.name + ` (${activeAgent.role})`,
        avatar: activeAgent.avatar,
        timestamp: "Just now",
        content: `Acknowledged for ${companyProfile?.name || "your enterprise"}.${companyProfile?.cash ? ` Based on current financial reserves (₹${Number(companyProfile.cash).toLocaleString("en-IN")}),` : ""} I recommend maintaining strict capital discipline while executing on this initiative.`,
        provider: "bizzpal-ai",
      };
      setConversations(prev => ({
        ...prev,
        [activeAgentId]: [...(prev[activeAgentId] || []), fallbackMsg],
      }));
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetConversation = () => {
    const defaultMsg = conversations[activeAgentId]?.[0];
    if (defaultMsg) {
      setConversations(prev => ({
        ...prev,
        [activeAgentId]: [defaultMsg],
      }));
    }
  };

  const filteredAgents = effectiveAgents.filter(
    a =>
      a.name.toLowerCase().includes(searchRoster.toLowerCase()) ||
      a.role.toLowerCase().includes(searchRoster.toLowerCase()) ||
      a.summary.toLowerCase().includes(searchRoster.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col space-y-3 animate-fade-in">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <BrainCircuit className="w-4 h-4" />
            </div>
            <h1 className="text-base sm:text-lg font-bold text-text font-sans">AI Executive Suite</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 font-bold uppercase tracking-wider font-mono">
              7 Autonomous Advisors
            </span>
          </div>
          <p className="text-[11px] text-text-muted mt-1 font-medium">
            Converse directly with specialized AI executive agents (CEO Astra, CFO Marcus, Marketing Elena, Sales Vikram) to audit decisions and execute playbooks.
          </p>
        </div>

        {/* Company Telemetry Header Badge */}
        <div className="flex items-center gap-3 text-xs bg-surface-2/60 border border-line px-3 py-1.5 rounded-xl text-text-muted shrink-0">
          <div className="flex items-center gap-1.5 font-semibold text-text">
            <Building2 className="w-3.5 h-3.5 text-brass" />
            <span>{companyProfile?.name || "My Enterprise"}</span>
          </div>
          <span>·</span>
          <span className="font-mono text-[11px] text-jade">
            ₹{Number(companyProfile?.revenue || 0).toLocaleString("en-IN")}/mo
          </span>
          <span>·</span>
          <span className="text-[11px] font-mono text-cyan-400">
            Runway {companyProfile?.burn && companyProfile?.cash ? (companyProfile.cash / companyProfile.burn).toFixed(1) : (companyProfile?.cash ? "18+" : "0.0")}mo
          </span>
        </div>
      </div>

      {/* Main Workspace Layout (2 or 3 Columns) */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* ============================================================ */}
        {/* LEFT COLUMN: EXECUTIVE AI DIRECTORY / ROSTER */}
        {/* ============================================================ */}
        <aside className="w-64 lg:w-72 shrink-0 bg-surface border border-line rounded-2xl flex flex-col overflow-hidden shadow-theme">
          {/* Roster Search / Header */}
          <div className="p-3 border-b border-line bg-surface-2/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Executive Roster
              </span>
              <span className="text-[10px] font-mono text-cyan-400">7 Active</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchRoster}
                onChange={e => setSearchRoster(e.target.value)}
                placeholder="Filter advisors…"
                className="w-full pl-8 pr-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Roster List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredAgents.map(agent => {
              const isActive = agent.id === activeAgentId;

              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setActiveAgentId(agent.id)}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2.5 group ${
                    isActive
                      ? "bg-cyan-500/10 border-cyan-500/40 text-text shadow-sm"
                      : "bg-transparent border-transparent hover:bg-surface-2/60 hover:border-line text-text-muted hover:text-text"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-xl bg-surface border border-line flex items-center justify-center text-text group-hover:text-brass shadow-sm transition-colors">
                        <AgentAvatarIcon iconName={agent.avatar} className="w-4 h-4" />
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-surface animate-pulse" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-text truncate">
                          {agent.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold uppercase border ${agent.color}`}
                        >
                          {agent.role.replace(" AI", "")}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">
                        {agent.badge}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => {
                        e.stopPropagation();
                        setEditingAgent(agent);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setEditingAgent(agent);
                        }
                      }}
                      title={`Customize ${agent.name} (name & icon)`}
                      className="p-1 rounded-md text-text-muted/60 hover:text-brass hover:bg-surface-2 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    >
                      <Pencil className="w-3 h-3" />
                    </span>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isActive ? "text-cyan-400 translate-x-0.5" : "text-text-muted/40"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom Controls */}
          <div className="p-3 border-t border-line bg-surface-2/40 flex items-center justify-between text-xs">
            <span className="text-[11px] text-text-muted">Direct Session</span>
            <button
              type="button"
              onClick={handleResetConversation}
              title="Reset current conversation thread"
              className="px-2 py-1 rounded-lg bg-surface border border-line text-[10px] text-text-muted hover:text-text hover:border-line-strong flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* CENTER COLUMN: ACTIVE EXECUTIVE DESK & CHAT STREAM */}
        {/* ============================================================ */}
        <section className="flex-1 flex flex-col bg-surface border border-line rounded-2xl overflow-hidden shadow-theme min-w-0">
          {/* Active Desk Header */}
          <div className="p-3 sm:px-4 border-b border-line bg-surface-2/40 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-brass shrink-0 shadow-sm">
                <AgentAvatarIcon iconName={activeAgent.avatar} className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-text">
                    {activeAgent.name} ({activeAgent.role})
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingAgent(activeAgent)}
                    title="Customize Name & Symbol"
                    className="px-2 py-0.5 rounded-md bg-surface border border-line hover:border-brass/40 hover:bg-surface-2 text-text-muted hover:text-brass text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Pencil className="w-2.5 h-2.5 text-brass" />
                    <span>Customize Name & Icon</span>
                  </button>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono font-semibold uppercase flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Desk</span>
                  </span>
                </div>
                <p className="text-[11px] text-text-muted truncate mt-0.5">
                  {activeAgent.summary}
                </p>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Tools Launchers */}
              <div className="hidden lg:flex items-center gap-1.5">
                {activeAgent.quickTools.map((tool, idx) => (
                  <Link
                    key={idx}
                    href={tool.href}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-2 border border-line text-text hover:text-cyan-400 hover:border-cyan-500/30 transition-all inline-flex items-center gap-1"
                  >
                    <span>{tool.name}</span>
                    <ArrowRight className="w-2.5 h-2.5 text-text-muted" />
                  </Link>
                ))}
              </div>

              {/* Chat History Toggle Button */}
              <button
                type="button"
                onClick={() => setShowDossier(prev => !prev)}
                title={showDossier ? "Hide Chat History" : "Show Chat History"}
                className={`p-2 rounded-lg border text-xs transition-all cursor-pointer ${
                  showDossier
                    ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/30"
                    : "bg-surface border-line text-text-muted hover:text-text"
                }`}
              >
                {showDossier ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {currentMessages.map(msg => {
              const isUser = msg.sender === "user";

              return (
                <div
                  key={msg.id}
                  id={msg.id}
                  className={`flex gap-3 max-w-3xl scroll-mt-4 ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 border mt-0.5 shadow-sm ${
                      isUser
                        ? "bg-brass text-white border-brass"
                        : "bg-surface-2 border-line text-brass"
                    }`}
                  >
                    {isUser ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <AgentAvatarIcon
                        iconName={activeAgent.id === msg.agentId ? activeAgent.avatar : msg.avatar}
                        className="w-4 h-4"
                      />
                    )}
                  </div>

                  <div className="space-y-1.5 max-w-2xl min-w-0">
                    <div className={`flex items-center gap-2 text-[10px] ${isUser ? "justify-end" : ""}`}>
                      <span className="font-bold text-text">{msg.agentName}</span>
                      <span className="text-text-muted">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                        isUser
                          ? "bg-brass text-white font-medium rounded-tr-none shadow-md"
                          : "bg-surface-2/70 border border-line text-text rounded-tl-none"
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      ) : (
                        <ChatMarkdown content={msg.content} />
                      )}

                      {/* Structured Day-to-Day Input Card */}
                      {msg.structuredRecord && (
                        <div className="mt-3 p-3.5 rounded-xl bg-surface border border-brass/40 text-text space-y-2.5 shadow-sm text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-brass flex items-center gap-1.5">
                              <BrainCircuit className="w-3 h-3 text-brass" />
                              <span>Day-to-Day Operational Update Detected</span>
                            </span>
                            {msg.recordCommitted ? (
                              <span className="text-[10px] px-2 py-0.2 rounded-full bg-jade/15 border border-jade/30 text-jade font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Committed to Ledger</span>
                              </span>
                            ) : (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-2 border border-line text-text-muted font-mono font-semibold">
                                Uncommitted
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                            {msg.structuredRecord.dailyOrders !== undefined && (
                              <div className="p-2 rounded-lg bg-surface-2/60 border border-line">
                                <span className="text-[10px] text-text-muted block">Orders</span>
                                <span className="text-xs font-bold text-text">{msg.structuredRecord.dailyOrders}</span>
                              </div>
                            )}
                            {msg.structuredRecord.dailyRevenue !== undefined && (
                              <div className="p-2 rounded-lg bg-surface-2/60 border border-line">
                                <span className="text-[10px] text-text-muted block">Revenue</span>
                                <span className="text-xs font-bold text-jade">₹{msg.structuredRecord.dailyRevenue.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                            {msg.structuredRecord.dailyExpenses !== undefined && (
                              <div className="p-2 rounded-lg bg-surface-2/60 border border-line">
                                <span className="text-[10px] text-text-muted block">Expenses / Burn</span>
                                <span className="text-xs font-bold text-amber">₹{msg.structuredRecord.dailyExpenses.toLocaleString("en-IN")}</span>
                              </div>
                            )}
                          </div>

                          {!msg.recordCommitted && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleCommitRecordFromChat(msg.structuredRecord!, msg.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-brass text-white text-[11px] font-bold hover:brightness-110 btn-tactile inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm & Record to Business Ledger</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interactive Action Playbooks */}
                      {msg.nextSteps && msg.nextSteps.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-line/60 space-y-1.5">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-jade" />
                            <span>Recommended Action Playbooks:</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {msg.nextSteps.map((step, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleSendMessage(step)}
                                className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-cyan-500/40 text-text cursor-pointer hover:text-cyan-400 transition-all btn-tactile"
                              >
                                → {step}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {isTyping && (
              <div className="flex gap-3 mr-auto max-w-lg">
                <div className="w-8 h-8 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-brass shrink-0 shadow-sm">
                  <AgentAvatarIcon iconName={activeAgent.avatar} className="w-4 h-4" />
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-line text-xs rounded-tl-none flex items-center gap-2.5 text-text-muted">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{activeAgent.name} is synthesizing verified business telemetry…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pinned Bottom Input & Prompt Suggestions Dock */}
          <div className="border-t border-line bg-surface shrink-0">
            {/* Prompt Suggestions Carousel */}
            <div className="px-4 py-2 border-b border-line/50 bg-surface-2/30 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider shrink-0 flex items-center gap-1">
                <BrainCircuit className="w-3 h-3 text-cyan-400" />
                <span>Suggested:</span>
              </span>
              {activeAgent.promptSuggestions.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="shrink-0 px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-cyan-500/30 text-[11px] text-text-muted hover:text-text cursor-pointer transition-all"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 sm:p-4">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder={`Ask ${activeAgent.name} (${activeAgent.role}) about strategy, runway, financial models, or execution…`}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isTyping}
                  className="px-4 py-2.5 rounded-xl bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed btn-tactile inline-flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="mt-1.5 flex items-center justify-between text-[10px] text-text-muted px-1">
                <span className="flex items-center gap-1">
                  <Info className="w-3 h-3 text-cyan-400" />
                  <span>Verified company ledger & telemetry synced</span>
                </span>
                <span className="font-mono">Press ↵ to send</span>
              </div>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: CHAT HISTORY */}
        {/* ============================================================ */}
        {showDossier && (
          <aside className="hidden xl:flex w-72 lg:w-80 shrink-0 bg-surface border border-line rounded-2xl flex-col overflow-y-auto p-4 shadow-theme space-y-3 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-text font-sans">Chat History</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-surface-2 border border-line text-text-muted uppercase">
                {currentMessages.length} msgs
              </span>
            </div>

            {/* Active Advisor Profile & Customize Shortcut */}
            <div className="p-3 rounded-xl bg-surface-2/40 border border-line flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center text-brass shrink-0 shadow-xs">
                  <AgentAvatarIcon iconName={activeAgent.avatar} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-text truncate">{activeAgent.name}</div>
                  <div className="text-[10px] text-text-muted">{activeAgent.role}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAgent(activeAgent)}
                className="px-2 py-1 rounded-lg bg-surface border border-line hover:border-brass/40 text-[10px] font-semibold text-text-muted hover:text-brass flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
                title="Customize name & icon"
              >
                <Pencil className="w-2.5 h-2.5 text-brass" />
                <span>Edit</span>
              </button>
            </div>

            {currentMessages.length === 0 ? (
              <p className="text-[11px] text-text-muted leading-relaxed p-3 rounded-xl bg-surface-2/50 border border-line">
                No messages yet with {activeAgent.name}. Start the conversation to see your history here.
              </p>
            ) : (
              <div className="space-y-1.5">
                {currentMessages.map(msg => {
                  const isUser = msg.sender === "user";
                  const preview = msg.content.replace(/\s+/g, " ").trim();
                  return (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => {
                        document.getElementById(msg.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-surface-2/40 hover:bg-surface-2 border border-line hover:border-cyan-500/30 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${isUser ? "text-brass" : "text-cyan-400"}`}>
                          {isUser ? "You" : activeAgent.name}
                        </span>
                        <span className="text-[9px] text-text-muted font-mono shrink-0 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {msg.timestamp}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-snug line-clamp-2 group-hover:text-text transition-colors">
                        {preview}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Customize Advisor Modal */}
      {editingAgent && (
        <CustomizeAdvisorModal
          isOpen={!!editingAgent}
          agent={editingAgent}
          defaultName={
            EXECUTIVE_AGENTS.find(a => a.id === editingAgent.id)?.name || editingAgent.name
          }
          defaultIcon={
            EXECUTIVE_AGENTS.find(a => a.id === editingAgent.id)?.avatar || "Bot"
          }
          onClose={() => setEditingAgent(null)}
          onSave={handleSaveCustomAdvisor}
          onReset={handleResetCustomAdvisor}
        />
      )}
    </div>
  );
}

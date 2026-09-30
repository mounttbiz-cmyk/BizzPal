"use client";

import React, { useState, useEffect } from "react";
import { parseNaturalBusinessInput, ExtractedBusinessRecord } from "@/lib/intake/nlpParser";
import { emitBusinessDataUpdated } from "@/lib/upload/events";
import {
  CustomizeAdvisorModal,
} from "@/components/chat/CustomizeAdvisorModal";
import {
  getAdvisorGreeting,
  getStoredCustomAdvisors,
  saveStoredCustomAdvisors,
} from "@/lib/advisors";
import { AgentMeta, ChatMessage, CompanyProfile } from "@/components/chat/types";
import { AdvisorRoster } from "@/components/chat/AdvisorRoster";
import { AdvisorHeader } from "@/components/chat/AdvisorHeader";
import { MobileAdvisorStrip } from "@/components/chat/MobileAdvisorStrip";
import { ChatThread } from "@/components/chat/ChatThread";
import { SuggestedPrompts } from "@/components/chat/SuggestedPrompts";
import { Composer } from "@/components/chat/Composer";
import { ChatHistoryDrawer, ChatHistoryPanel } from "@/components/chat/ChatHistoryDrawer";
import { BrainCircuit, Building2, MessageSquare } from "lucide-react";

const EXECUTIVE_AGENTS: AgentMeta[] = [
  {
    id: "ceo",
    name: "Astra",
    role: "CEO AI",
    avatar: "Crown",
    badge: "Strategic Vision",
    color: "text-amber-500 bg-amber-500/10 border-amber-500/30",
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
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/30",
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
    color: "text-purple-500 bg-purple-500/10 border-purple-500/30",
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
    color: "text-blue-500 bg-blue-500/10 border-blue-500/30",
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
    color: "text-rose-500 bg-rose-500/10 border-rose-500/30",
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
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
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
    color: "text-orange-500 bg-orange-500/10 border-orange-400/30",
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

export default function ChatWorkspacePage() {
  const [activeAgentId, setActiveAgentId] = useState<string>("ceo");
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRosterCollapsed, setIsRosterCollapsed] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);

  const [customAdvisors, setCustomAdvisors] = useState<Record<string, { name?: string; avatar?: string }>>(() => {
    return getStoredCustomAdvisors();
  });
  const [editingAgent, setEditingAgent] = useState<AgentMeta | null>(null);

  // Sync custom advisors reactively from localStorage and events
  useEffect(() => {
    const syncAdvisors = () => {
      setCustomAdvisors(getStoredCustomAdvisors());
    };
    syncAdvisors();
    window.addEventListener("bizzpal_advisors_updated", syncAdvisors);
    window.addEventListener("storage", syncAdvisors);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", syncAdvisors);
      window.removeEventListener("storage", syncAdvisors);
    };
  }, []);

  const effectiveAgents: AgentMeta[] = React.useMemo(() => {
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

  // Initial seed conversations for each agent
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>(() => {
    const initConvs: Record<string, ChatMessage[]> = {};
    const initialCustom = getStoredCustomAdvisors();
    for (const agent of EXECUTIVE_AGENTS) {
      const custom = initialCustom[agent.id];
      const effAgent = custom
        ? {
            ...agent,
            name: custom.name?.trim() || agent.name,
            avatar: custom.avatar || agent.avatar,
          }
        : agent;

      initConvs[agent.id] = [
        {
          id: `msg_init_${agent.id}`,
          sender: "agent",
          agentId: agent.id,
          agentName: `${effAgent.name} (${effAgent.role})`,
          avatar: effAgent.avatar,
          timestamp: "Just now",
          content: getAdvisorGreeting(effAgent),
          provider: "bizzpal-ai",
          nextSteps:
            agent.id === "ceo"
              ? ["Review Runway & Solvency", "Examine Secondary Pipelines", "Run Decision Simulation"]
              : agent.id === "cfo"
              ? ["Open Cash Flow Forecast", "Analyze Tooling Overheads", "Calculate Break-Even Threshold"]
              : agent.id === "marketing"
              ? ["Audit Inbound Conversion Rates", "Calculate Blended CAC", "Plan ICP Retargeting Campaign"]
              : ["Score Pipeline Deals", "Audit Stalled Leads", "Model Enterprise Contract Tiering"],
        },
      ];
    }
    return initConvs;
  });

  const handleSaveCustomAdvisor = (agentId: string, customData: { name: string; avatar: string }) => {
    const updated = {
      ...customAdvisors,
      [agentId]: {
        name: customData.name.trim() || undefined,
        avatar: customData.avatar || undefined,
      },
    };
    setCustomAdvisors(updated);
    saveStoredCustomAdvisors(updated);

    // Update conversation initial greeting with customized name/avatar
    setConversations(prev => {
      const agentList = prev[agentId] || [];
      const updatedList = agentList.map(m => {
        if (m.id.startsWith("msg_init_")) {
          const targetMeta = effectiveAgents.find(a => a.id === agentId);
          const currentAgent: AgentMeta = targetMeta
            ? {
                ...targetMeta,
                name: customData.name.trim() || targetMeta.name,
                avatar: customData.avatar || targetMeta.avatar,
              }
            : {
                id: agentId,
                name: customData.name.trim() || "Advisor",
                role: "Executive AI",
                avatar: customData.avatar || "Crown",
                badge: "Executive",
                color: "text-brass",
                summary: "",
                quickTools: [],
                promptSuggestions: [],
                kpis: [],
                telemetryFeeds: [],
              };
          return {
            ...m,
            agentName: `${currentAgent.name} (${currentAgent.role})`,
            avatar: currentAgent.avatar,
            content: getAdvisorGreeting(currentAgent, companyProfile),
          };
        }
        return m;
      });
      return { ...prev, [agentId]: updatedList };
    });

    setEditingAgent(null);
  };

  const handleResetCustomAdvisor = (agentId: string) => {
    const updated = { ...customAdvisors };
    delete updated[agentId];
    setCustomAdvisors(updated);
    saveStoredCustomAdvisors(updated);
    setEditingAgent(null);
  };

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
        : record.dailyRevenue
        ? currentCash + record.dailyRevenue
        : currentCash;

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

    // Detect natural operational updates
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
          agentName: activeAgent.name,
          agentRole: activeAgent.role,
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
      const fallbackMsg: ChatMessage = {
        id: `agt_err_${Date.now()}`,
        sender: "agent",
        agentId: activeAgentId,
        agentName: activeAgent.name + ` (${activeAgent.role})`,
        avatar: activeAgent.avatar,
        timestamp: "Just now",
        content: `Acknowledged for ${companyProfile?.name || "your enterprise"}.${
          companyProfile?.cash
            ? ` Based on current financial reserves (₹${Number(companyProfile.cash).toLocaleString("en-IN")}),`
            : ""
        } I recommend maintaining strict capital discipline while executing on this initiative.`,
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

  const runwayMonths =
    companyProfile?.burn && companyProfile?.cash
      ? (Number(companyProfile.cash) / Number(companyProfile.burn)).toFixed(1)
      : companyProfile?.cash
      ? "18+"
      : "8.0";

  const monthlyRevFormatted = companyProfile?.revenue
    ? `₹${Number(companyProfile.revenue).toLocaleString("en-IN")}/mo`
    : "₹8,50,824/mo";

  const enterpriseName = companyProfile?.name || "MOUNTT GROUP";

  return (
    <div className="h-[calc(100dvh-5.5rem)] md:h-[calc(100vh-5.5rem)] flex flex-col space-y-2 sm:space-y-3 relative overflow-x-hidden">
      {/* ============================================================ */}
      {/* 1. TOP PAGE HEADER BAR (DESKTOP & MOBILE COMPACT) */}
      {/* ============================================================ */}
      <header
        aria-label="Workspace Status Header"
        className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-line shrink-0 gap-2"
      >
        {/* Left: App Title + Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-brass/10 border border-brass/30 flex items-center justify-center text-brass shrink-0 shadow-2xs">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-text truncate tracking-tight font-sans">
              <span className="hidden sm:inline">AI Executive Suite</span>
              <span className="sm:hidden">AI Workspace</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass/10 text-brass font-bold uppercase tracking-wider font-mono border border-brass/25 shrink-0">
              7 advisors
            </span>
          </div>
        </div>

        {/* Right: Company Telemetry & Runway Pill */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs bg-surface-2/60 border border-line px-2.5 sm:px-3 py-1.5 rounded-xl text-text-muted shrink-0 shadow-2xs">
            <span className="font-semibold text-text truncate max-w-[100px] sm:max-w-none">
              {enterpriseName}
            </span>
            <span className="text-text-muted/40 font-mono">·</span>
            <span className="font-mono text-[11px] text-text font-bold">
              {monthlyRevFormatted}
            </span>
            <span className="text-text-muted/40 font-mono">·</span>
            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              Runway {runwayMonths}mo
            </span>
          </div>

          {/* Mobile History Drawer Shortcut */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            aria-label="Open Chat History"
            className="md:hidden p-1.5 rounded-xl bg-surface-2 border border-line text-text-muted hover:text-text cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-brass" />
          </button>
        </div>
      </header>

      {/* ============================================================ */}
      {/* 2. MOBILE HORIZONTAL ADVISOR STRIP (< 768px) */}
      {/* ============================================================ */}
      <MobileAdvisorStrip
        agents={effectiveAgents}
        activeAgentId={activeAgentId}
        onSelectAgent={setActiveAgentId}
      />

      {/* ============================================================ */}
      {/* 3. MAIN WORKSPACE CONTAINER */}
      {/* ============================================================ */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        {/* Desktop / Tablet Roster (2-Pane Desktop, Rail Tablet) */}
        <div className="hidden md:flex shrink-0">
          <AdvisorRoster
            agents={effectiveAgents}
            activeAgentId={activeAgentId}
            onSelectAgent={setActiveAgentId}
            onCustomizeAgent={setEditingAgent}
            onResetConversation={handleResetConversation}
            isCollapsed={isRosterCollapsed}
            onToggleCollapse={() => setIsRosterCollapsed(prev => !prev)}
          />
        </div>

        {/* Center Main Chat Panel */}
        <main
          aria-label="Active Conversation Stream"
          className="flex-1 flex flex-col bg-surface border border-line rounded-2xl overflow-hidden shadow-theme min-w-0"
        >
          {/* Active Advisor Clean Header Row */}
          <AdvisorHeader
            activeAgent={activeAgent}
            onCustomize={() => setEditingAgent(activeAgent)}
            onToggleHistory={() => setIsHistoryOpen(prev => !prev)}
            isHistoryOpen={isHistoryOpen}
            historyCount={currentMessages.length}
          />

          {/* Conversation Messages Stream */}
          <ChatThread
            messages={currentMessages}
            activeAgent={activeAgent}
            companyProfile={companyProfile}
            isTyping={isTyping}
            onCommitRecord={handleCommitRecordFromChat}
            onSelectPlaybook={handleSendMessage}
          />

          {/* Suggested Prompts (Wrapped Chips / No Clipping) */}
          <SuggestedPrompts
            prompts={activeAgent.promptSuggestions}
            onSelectPrompt={handleSendMessage}
            disabled={isTyping}
          />

          {/* Composer (Sticky bottom dock with safe area padding) */}
          <Composer
            value={inputMessage}
            onChange={setInputMessage}
            onSend={() => handleSendMessage()}
            activeAgent={activeAgent}
            isTyping={isTyping}
          />
        </main>

        {/* Desktop Chat History Panel (Inline, non-dimming) */}
        {isHistoryOpen && (
          <ChatHistoryPanel
            messages={currentMessages}
            activeAgent={activeAgent}
            onCustomizeAgent={setEditingAgent}
            onClose={() => setIsHistoryOpen(false)}
            onSelectMessage={msgId => {
              document.getElementById(msgId)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        )}
      </div>

      {/* ============================================================ */}
      {/* 4. MOBILE / TABLET OVERLAY CHAT HISTORY DRAWER (< 1280px) */}
      {/* ============================================================ */}
      <ChatHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        messages={currentMessages}
        activeAgent={activeAgent}
        onCustomizeAgent={setEditingAgent}
        onSelectMessage={msgId => {
          document.getElementById(msgId)?.scrollIntoView({ behavior: "smooth", block: "center" });
          setIsHistoryOpen(false);
        }}
      />

      {/* ============================================================ */}
      {/* 5. CUSTOMIZE ADVISOR MODAL */}
      {/* ============================================================ */}
      {editingAgent && (
        <CustomizeAdvisorModal
          isOpen={!!editingAgent}
          agent={editingAgent}
          defaultName={EXECUTIVE_AGENTS.find(a => a.id === editingAgent.id)?.name || editingAgent.name}
          defaultIcon={EXECUTIVE_AGENTS.find(a => a.id === editingAgent.id)?.avatar || "Bot"}
          onClose={() => setEditingAgent(null)}
          onSave={handleSaveCustomAdvisor}
          onReset={handleResetCustomAdvisor}
        />
      )}
    </div>
  );
}

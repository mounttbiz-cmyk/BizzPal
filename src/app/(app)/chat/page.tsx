"use client";

import React, { useState, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Wrench, X } from "lucide-react";
import { parseNaturalBusinessInput, ExtractedBusinessRecord } from "@/lib/intake/nlpParser";
import { emitBusinessDataUpdated } from "@/lib/upload/events";
import { CustomizeAdvisorModal } from "@/components/chat/CustomizeAdvisorModal";
import { getStoredCustomAdvisors, saveStoredCustomAdvisors } from "@/lib/advisors";
import { AgentMeta, ChatMessage, CompanyProfile, ChatAttachment } from "@/components/chat/types";
import { ChatHistoryPanel, type ConversationSummary } from "@/components/chat/ChatHistoryPanel";
import { AdvisorHeader } from "@/components/chat/AdvisorHeader";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatEmptyState } from "@/components/chat/ChatEmptyState";
import { Composer } from "@/components/chat/Composer";
import { askConfirm, showNotice } from "@/components/ui/dialogs";

interface ActiveToolContext {
  id?: string;
  name: string;
  category?: string;
  badge?: string;
}

const EXECUTIVE_AGENTS: AgentMeta[] = [
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
      "What is our top strategic vulnerability this month?",
      "Review my runway and recommend our next 90-day focus.",
      "How should I allocate budget between sales and product?",
    ],
    kpis: ["Liquid Runway", "Overall Health Score", "Strategic Moats"],
    telemetryFeeds: ["Executive Ledger", "Daily Check-Ins", "Gap Register"],
  },
  {
    id: "cfo",
    name: "CFO",
    role: "Chief Financial Officer",
    avatar: "Landmark",
    badge: "Cash & Budget",
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
    name: "Marketing",
    role: "Head of Marketing",
    avatar: "Megaphone",
    badge: "Growth & Leads",
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
    name: "Sales",
    role: "Head of Sales",
    avatar: "Handshake",
    badge: "Deals & Revenue",
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
    name: "HR & Talent",
    role: "Head of People & HR",
    avatar: "Users",
    badge: "Hiring & Team",
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
    name: "Operations",
    role: "Head of Operations",
    avatar: "Settings2",
    badge: "Daily Operations",
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/30",
    summary: "Process optimization, workflow automation, operational bottlenecks, vendor SLAs, and delivery margins.",
    quickTools: [
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
  return (
    <Suspense
      fallback={
        <div className="h-[calc(100vh-5.5rem)] flex items-center justify-center text-text-muted text-sm">
          Loading advisor workspace…
        </div>
      }
    >
      <ChatWorkspaceContent />
    </Suspense>
  );
}

/** A good first thing to ask each advisor, shown with its suggestions on a new chat. */
const STARTERS: Record<string, string> = {
  ceo: "Summarise how the business is doing this month in five points.",
  cfo: "Open a cash flow forecast for the next six months.",
  marketing: "Plan a campaign to win back customers who went quiet.",
  sales: "Which stalled deals should I chase this week, and how?",
  hr: "Who should our next hire be, and what will it cost?",
  operations: "Where are we losing the most time every week?",
  strategy: "Which new market or segment should we look at next?",
};

const nowIso = () => new Date().toISOString();

function ChatWorkspaceContent() {
  const searchParams = useSearchParams();
  const [activeToolContext, setActiveToolContext] = useState<ActiveToolContext | null>(null);
  const [activeAgentId, setActiveAgentId] = useState<string>("ceo");
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoSentRef = useRef(false);

  // The open chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatTitle, setChatTitle] = useState<string | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const conversationRef = useRef<string | null>(null);
  // Changes whenever another chat is opened, so a late answer is saved to its own chat and never shown in another
  const chatKeyRef = useRef(0);
  const [chats, setChats] = useState<ConversationSummary[] | null>(null);

  const showMessages = (list: ChatMessage[]) => {
    messagesRef.current = list;
    setMessages(list);
  };

  const [customAdvisors, setCustomAdvisors] = useState<Record<string, { name?: string; avatar?: string }>>(() => getStoredCustomAdvisors());
  const [editingAgent, setEditingAgent] = useState<AgentMeta | null>(null);

  useEffect(() => {
    const syncAdvisors = () => setCustomAdvisors(getStoredCustomAdvisors());
    syncAdvisors();
    window.addEventListener("bizzpal_advisors_updated", syncAdvisors);
    window.addEventListener("storage", syncAdvisors);
    return () => {
      window.removeEventListener("bizzpal_advisors_updated", syncAdvisors);
      window.removeEventListener("storage", syncAdvisors);
    };
  }, []);

  const effectiveAgents: AgentMeta[] = React.useMemo(
    () =>
      EXECUTIVE_AGENTS.map(agent => {
        const custom = customAdvisors[agent.id];
        if (!custom) return agent;
        return { ...agent, name: custom.name?.trim() || agent.name, avatar: custom.avatar || agent.avatar };
      }),
    [customAdvisors]
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bizzpal_business_profile");
      if (saved) setCompanyProfile(JSON.parse(saved));
    } catch {}
  }, []);

  const activeAgent = effectiveAgents.find(a => a.id === activeAgentId) || effectiveAgents[0];

  // ------------------------------------------------------------------ saved chats

  const loadChats = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/conversations", { cache: "no-store" });
      const d = await r.json();
      setChats(d.success ? d.conversations : []);
    } catch {
      setChats([]);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  /** Saves the chat: creates it on the first answer, then keeps it up to date. Returns its id. */
  const persist = async (agentId: string, list: ChatMessage[], existingId: string | null, key: number): Promise<string | null> => {
    try {
      const clean = list.map(m => ({ ...m, attachments: m.attachments?.map(a => ({ name: a.name, size: a.size, type: a.type })) }));
      const res = existingId
        ? await fetch(`/api/chat/conversations/${existingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: clean }) })
        : await fetch("/api/chat/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agentId, messages: clean }) });
      const d = await res.json().catch(() => ({}));
      if (!d.success) return existingId;
      const id = d.conversation.id as string;
      if (chatKeyRef.current === key) {
        conversationRef.current = id;
        setConversationId(id);
        setChatTitle(d.conversation.title);
      }
      loadChats();
      return id;
    } catch {
      return existingId;
    }
  };

  const activeAgentIdRef = useRef(activeAgentId);
  useEffect(() => {
    activeAgentIdRef.current = activeAgentId;
  }, [activeAgentId]);

  const stopGenerating = () => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsTyping(false);
  };

  /** A fresh, empty chat with the current (or given) advisor. */
  const startNewChat = (agentId?: string) => {
    stopGenerating();
    chatKeyRef.current++;
    conversationRef.current = null;
    setConversationId(null);
    setChatTitle(null);
    showMessages([]);
    if (agentId && agentId !== activeAgentIdRef.current) {
      activeAgentIdRef.current = agentId;
      setActiveAgentId(agentId);
    }
  };

  const openConversation = async (id: string) => {
    if (id === conversationRef.current) {
      if (!window.matchMedia("(min-width: 768px)").matches) setHistoryOpen(false);
      return;
    }
    stopGenerating();
    const key = ++chatKeyRef.current;
    try {
      const r = await fetch(`/api/chat/conversations/${id}`, { cache: "no-store" });
      const d = await r.json();
      if (!d.success || chatKeyRef.current !== key) return;
      conversationRef.current = id;
      setConversationId(id);
      setChatTitle(d.conversation.title);
      if (d.conversation.agentId && d.conversation.agentId !== activeAgentIdRef.current) {
        activeAgentIdRef.current = d.conversation.agentId;
        setActiveAgentId(d.conversation.agentId);
      }
      showMessages(d.conversation.messages || []);
      if (!window.matchMedia("(min-width: 768px)").matches) setHistoryOpen(false);
    } catch {
      showNotice("Could not open that chat. Please try again.", "error");
    }
  };

  const renameConversation = async (id: string, title: string) => {
    const r = await fetch(`/api/chat/conversations/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (!d.success) {
      showNotice(d.error || "Could not rename the chat.", "error");
      return;
    }
    if (id === conversationRef.current) setChatTitle(d.conversation.title);
    loadChats();
  };

  const deleteConversation = async (id: string) => {
    if (!(await askConfirm({ title: "Delete this chat?", message: "The conversation will be removed for good.", confirmLabel: "Delete", danger: true }))) return;
    const r = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) {
      showNotice("Could not delete the chat.", "error");
      return;
    }
    if (id === conversationRef.current) startNewChat();
    loadChats();
  };

  // ------------------------------------------------------------------ links from other pages

  // e.g. /chat?advisor=cfo&tool=Pricing+Simulator&prompt=...&autoSend=1
  useEffect(() => {
    if (!searchParams) return;
    const advisorParam = searchParams.get("advisor") || searchParams.get("agent");
    const toolParam = searchParams.get("tool") || searchParams.get("toolName");
    const toolIdParam = searchParams.get("toolId");
    const categoryParam = searchParams.get("category");
    const badgeParam = searchParams.get("badge");
    const promptParam = searchParams.get("prompt") || searchParams.get("message") || searchParams.get("query");
    const autoSendParam = searchParams.get("autoSend");

    let targetAdvisor = activeAgentIdRef.current;
    if (advisorParam && EXECUTIVE_AGENTS.some(a => a.id === advisorParam.toLowerCase())) {
      targetAdvisor = advisorParam.toLowerCase();
    } else if (categoryParam) {
      const cat = categoryParam.toLowerCase();
      if (cat === "finance") targetAdvisor = "cfo";
      else if (["marketing", "sales", "operations", "strategy"].includes(cat)) targetAdvisor = cat;
    }
    if (targetAdvisor !== activeAgentIdRef.current) startNewChat(targetAdvisor);

    if (toolParam) {
      setActiveToolContext({ name: toolParam, id: toolIdParam || undefined, category: categoryParam || undefined, badge: badgeParam || undefined });
    }
    if (promptParam) {
      setInputMessage(promptParam);
      if ((autoSendParam === "1" || autoSendParam === "true") && !hasAutoSentRef.current) {
        hasAutoSentRef.current = true;
        const timer = setTimeout(() => handleSendMessage(promptParam, undefined, targetAdvisor), 300);
        return () => clearTimeout(timer);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ------------------------------------------------------------------ sending

  const handleCommitRecordFromChat = async (record: ExtractedBusinessRecord, msgId: string) => {
    try {
      const savedProfileStr = localStorage.getItem("bizzpal_business_profile");
      const existing = savedProfileStr ? JSON.parse(savedProfileStr) : {};
      const currentMonthlyRev = Number(existing.revenue || existing.monthlyRevenue) || 0;
      const currentBurn = Number(existing.burn || existing.monthlyBurn) || 0;
      const currentCash = Number(existing.cash || existing.cashOnHand) || 0;
      const newMonthlyRev = record.dailyRevenue ? Math.round(record.dailyRevenue * 30) : currentMonthlyRev;
      const newBurn = record.dailyExpenses ? Math.round(record.dailyExpenses * 30) : currentBurn;
      const newCash = record.cashOnHand ? record.cashOnHand : record.dailyRevenue ? currentCash + record.dailyRevenue : currentCash;
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
        teamSize: record.teamSize || existing.teamSize,
        lastDailyInput: {
          dailyRevenue: record.dailyRevenue,
          dailyOrders: record.dailyOrders,
          dailyExpenses: record.dailyExpenses,
          recordedAt: nowIso(),
          notes: record.rawText,
        },
      };
      localStorage.setItem("bizzpal_business_profile", JSON.stringify(updatedProfile));
      setCompanyProfile(updatedProfile);
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
      }).catch(() => {});
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
        grossMargin: updatedProfile.grossMargin,
      });
      const next = messagesRef.current.map(m => (m.id === msgId ? { ...m, recordCommitted: true } : m));
      showMessages(next);
      if (conversationRef.current) persist(activeAgentIdRef.current, next, conversationRef.current, chatKeyRef.current);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (textToSend?: string, attachmentsToSend?: ChatAttachment[], agentIdOverride?: string) => {
    const targetAgentId = agentIdOverride || activeAgentIdRef.current;
    const targetAgent = effectiveAgents.find(a => a.id === targetAgentId) || activeAgent;
    const rawMessage = (textToSend ?? inputMessage).trim();
    if ((!rawMessage && (!attachmentsToSend || attachmentsToSend.length === 0)) || isTyping) return;

    // Asking another advisor starts a chat with them
    if (targetAgentId !== activeAgentIdRef.current) startNewChat(targetAgentId);

    const message = rawMessage || `[Attached ${attachmentsToSend!.length} file${attachmentsToSend!.length === 1 ? "" : "s"}]`;
    const detectedRecord = parseNaturalBusinessInput(message);
    const base = messagesRef.current;
    const key = chatKeyRef.current;
    const existingId = conversationRef.current;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: "user",
      agentId: targetAgentId,
      agentName: companyProfile?.founderName || "You",
      avatar: "User",
      timestamp: "",
      sentAt: nowIso(),
      content: message,
      structuredRecord: detectedRecord,
      recordCommitted: false,
      attachments: attachmentsToSend,
    };
    const withUser = [...base, userMsg];
    showMessages(withUser);
    if (textToSend === undefined) setInputMessage("");
    setIsTyping(true);
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // The last turns of this chat, so the advisor can follow it
    const history = base
      .filter(m => !m.isError && m.content)
      .slice(-12)
      .map(m => ({ role: m.sender === "user" ? "user" : "assistant", text: m.content }));
    const attachmentContext =
      attachmentsToSend && attachmentsToSend.length > 0
        ? `\n\n[User attached ${attachmentsToSend.length} file(s): ${attachmentsToSend.map(a => `${a.name} (${a.type})`).join(", ")}]`
        : "";

    let reply: ChatMessage;
    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${message}${attachmentContext}`,
          agentId: targetAgentId,
          agentName: targetAgent.name,
          agentRole: targetAgent.role,
          history,
          toolContext: activeToolContext ? { ...activeToolContext } : undefined,
        }),
      });
      const data = await resp.json();
      reply = data.success
        ? {
            id: `agt_${Date.now()}`,
            sender: "agent",
            agentId: targetAgentId,
            agentName: targetAgent.name,
            avatar: targetAgent.avatar,
            timestamp: "",
            sentAt: nowIso(),
            content: detectedRecord
              ? `I found these figures in your message: ${detectedRecord.summary}. Check them below and save them to your records if they are right.`
              : data.text,
            provider: data.provider,
            handoff: data.handoff ? { agentId: String(data.handoff), question: message } : null,
            briefSuggestion: data.briefSuggestion || null,
          }
        : {
            id: `agt_err_${Date.now()}`,
            sender: "agent",
            agentId: targetAgentId,
            agentName: targetAgent.name,
            avatar: targetAgent.avatar,
            timestamp: "",
            sentAt: nowIso(),
            content: data.error || "The advisor couldn't answer right now. Please try again in a moment.",
            isError: true,
          };
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.message?.includes("aborted")) {
        // Stopped on purpose: keep the question, add nothing
        if (chatKeyRef.current === key) setIsTyping(false);
        persist(targetAgentId, withUser, existingId, key);
        return;
      }
      reply = {
        id: `agt_err_${Date.now()}`,
        sender: "agent",
        agentId: targetAgentId,
        agentName: targetAgent.name,
        avatar: targetAgent.avatar,
        timestamp: "",
        sentAt: nowIso(),
        content: "The advisor didn't answer in time. Check your connection and try again.",
        isError: true,
      };
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
    }

    const finalList = [...withUser, reply];
    if (chatKeyRef.current === key) {
      showMessages(finalList);
      setIsTyping(false);
    }
    await persist(targetAgentId, finalList, existingId, key);
  };

  /** Asks the last question again, replacing the last answer. */
  const handleRetry = () => {
    const list = messagesRef.current;
    let i = list.length - 1;
    while (i >= 0 && list[i].sender !== "user") i--;
    if (i < 0) return;
    const question = list[i];
    showMessages(list.slice(0, i));
    handleSendMessage(question.content, question.attachments);
  };

  // Never show the same idea twice
  const suggestions = Array.from(new Set([...(activeAgent.promptSuggestions || []), STARTERS[activeAgent.id]].filter(Boolean))).slice(0, 4);

  const composer = (
    <Composer
      value={inputMessage}
      onChange={setInputMessage}
      onSend={attachments => handleSendMessage(undefined, attachments)}
      onStop={stopGenerating}
      activeAgent={activeAgent}
      isTyping={isTyping}
      className={messages.length === 0 ? "!px-0 !pb-0" : ""}
      showNote={messages.length > 0}
      roomy={messages.length === 0}
    />
  );

  return (
    // Full-height workspace: it fills the page edge to edge so the conversation gets the room, like a chat app
    <div className="-m-3 sm:-m-6 lg:-m-8 h-[calc(100dvh-3.5rem-4.5rem-env(safe-area-inset-bottom,0px))] md:h-[100dvh] flex bg-surface overflow-hidden min-[1824px]:border-x min-[1824px]:border-line">
      <div className="flex-1 min-w-0 flex flex-col">
      <AdvisorHeader
        agents={effectiveAgents}
        activeAgent={activeAgent}
        chatTitle={chatTitle}
        onSelectAgent={id => (id === activeAgentIdRef.current ? undefined : startNewChat(id))}
        onRenameAgent={setEditingAgent}
        onNewChat={() => startNewChat()}
        onOpenHistory={() => {
          if (!historyOpen) loadChats();
          setHistoryOpen(o => !o);
        }}
        historyOpen={historyOpen}
        hasMessages={messages.length > 0}
      />

      {activeToolContext && (
        <div className="px-4 sm:px-6 py-2 border-b border-line shrink-0">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 min-w-0 text-text-muted">
              <Wrench className="w-4 h-4 text-brass shrink-0" />
              <span className="truncate">
                Working with <span className="text-text font-medium">{activeToolContext.name}</span>
              </span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Link href="/tools" className="h-8 px-2.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 inline-flex items-center">
                All tools
              </Link>
              <button
                type="button"
                onClick={() => setActiveToolContext(null)}
                aria-label="Stop using this tool"
                className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </span>
          </div>
        </div>
      )}

      <main aria-label="Conversation" className="flex-1 flex flex-col min-h-0">
        {messages.length === 0 ? (
          <ChatEmptyState
            agents={effectiveAgents}
            agent={activeAgent}
            customNamed={Boolean(customAdvisors[activeAgent.id]?.name?.trim())}
            onSelectAgent={id => id !== activeAgentIdRef.current && startNewChat(id)}
            founderName={companyProfile?.founderName}
            companyName={companyProfile?.name}
            suggestions={suggestions}
            onPick={text => handleSendMessage(text)}
            disabled={isTyping}
          >
            {composer}
          </ChatEmptyState>
        ) : (
          <>
            <ChatThread
              messages={messages}
              activeAgent={activeAgent}
              companyProfile={companyProfile}
              isTyping={isTyping}
              onCommitRecord={handleCommitRecordFromChat}
              agents={effectiveAgents}
              onHandoff={(agentId, question) => handleSendMessage(question, undefined, agentId)}
              onRetry={handleRetry}
            />
            {composer}
          </>
        )}
      </main>
      </div>

      <ChatHistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        conversations={chats}
        agents={effectiveAgents}
        activeId={conversationId}
        onOpen={openConversation}
        onRename={renameConversation}
        onDelete={deleteConversation}
      />

      {editingAgent && (
        <CustomizeAdvisorModal
          isOpen={!!editingAgent}
          agent={editingAgent}
          defaultName={EXECUTIVE_AGENTS.find(a => a.id === editingAgent.id)?.name || editingAgent.name}
          defaultIcon={EXECUTIVE_AGENTS.find(a => a.id === editingAgent.id)?.avatar || "Bot"}
          onClose={() => setEditingAgent(null)}
          onSave={(agentId, customData) => {
            const updated = { ...customAdvisors, [agentId]: { name: customData.name.trim() || undefined, avatar: customData.avatar || undefined } };
            setCustomAdvisors(updated);
            saveStoredCustomAdvisors(updated);
            setEditingAgent(null);
          }}
          onReset={agentId => {
            const updated = { ...customAdvisors };
            delete updated[agentId];
            setCustomAdvisors(updated);
            saveStoredCustomAdvisors(updated);
            setEditingAgent(null);
          }}
        />
      )}
    </div>
  );
}

import { ExtractedBusinessRecord } from "@/lib/intake/nlpParser";

export interface AgentQuickTool {
  name: string;
  href: string;
}

export interface AgentMeta {
  id: string;
  name: string;
  role: string;
  avatar: string;
  badge: string;
  color: string;
  summary: string;
  quickTools: AgentQuickTool[];
  promptSuggestions: string[];
  kpis: string[];
  telemetryFeeds: string[];
}

export interface ChatAttachment {
  name: string;
  size: number;
  type: string;
  previewUrl?: string;
}

export interface ChatMessage {
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
  attachments?: ChatAttachment[];
  /** Set when this advisor passed the question to a colleague */
  handoff?: { agentId: string; question: string } | null;
  /** Something the founder said that the advisor offers to save in the business brief */
  briefSuggestion?: { key: string; label: string; value: string } | null;
}

export interface CompanyProfile {
  name?: string;
  founderName?: string;
  industry?: string;
  industryLabel?: string;
  revenue?: number | string;
  monthlyRevenue?: number | string;
  annualRevenue?: number | string;
  burn?: number | string;
  monthlyBurn?: number | string;
  cash?: number | string;
  cashOnHand?: number | string;
  teamSize?: number;
  grossMargin?: number;
  lastDailyInput?: {
    dailyRevenue?: number;
    dailyOrders?: number;
    dailyExpenses?: number;
    recordedAt?: string;
    notes?: string;
  };
}

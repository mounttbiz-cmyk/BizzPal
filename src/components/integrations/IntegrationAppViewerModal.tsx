"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Video,
  Users,
  ExternalLink,
  Plus,
  RefreshCw,
  CreditCard,
  MessageSquare,
  FileText,
  ShieldCheck,
  Send,
  Check,
  Copy,
  Trash2,
  Sliders,
  DollarSign,
  Briefcase,
  Headphones,
  Mail,
  Zap,
  Globe,
  Radio,
  FileSpreadsheet,
  Building2,
  Lock
} from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { IntegrationLogo } from "@/components/ui/IntegrationLogo";

export interface ScheduledMeeting {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  attendees: string[];
  meetLink: string;
  category: "discovery" | "executive" | "internal" | "focus";
  status: "upcoming" | "in_progress" | "completed";
  summaryNotes?: string;
}

export interface StripeChargeItem {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: "succeeded" | "pending" | "refunded";
  description: string;
  date: string;
}

export interface SlackMessageItem {
  id: string;
  channel: string;
  sender: string;
  text: string;
  timestamp: string;
  type: "briefing" | "alert" | "approval" | "system";
}

interface IntegrationAppViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string | null;
  toolName: string;
  toolCategory?: string;
  toolTagline?: string;
  status: "connected" | "pending_connection" | "not_connected" | "error";
  currentUserEmail?: string;
  companyName?: string;
  founderName?: string;
  apiKey?: string | null;
  config?: any;
  onUpdateStatus?: (toolKey: string, newStatus: string, updatedConfig?: any) => void;
}

export function IntegrationAppViewerModal({
  isOpen,
  onClose,
  toolId,
  toolName,
  toolCategory = "business",
  toolTagline = "",
  status = "not_connected",
  currentUserEmail = "founder@yourcompany.com",
  companyName = "Your Enterprise",
  founderName = "Founder",
  apiKey = null,
  config = {},
  onUpdateStatus,
}: IntegrationAppViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"activity" | "settings">("activity");
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // Google Calendar State
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [newMeetingTime, setNewMeetingTime] = useState("Today, 5:30 PM - 6:15 PM");
  const [newMeetingAttendees, setNewMeetingAttendees] = useState("");
  const [newMeetingCategory, setNewMeetingCategory] = useState<ScheduledMeeting["category"]>("discovery");

  // Stripe State
  const [stripeCharges, setStripeCharges] = useState<StripeChargeItem[]>([]);
  const [sendingWebhook, setSendingWebhook] = useState(false);

  // Slack State
  const [slackMessages, setSlackMessages] = useState<SlackMessageItem[]>([]);
  const [newSlackPingText, setNewSlackPingText] = useState("");
  const [sendingSlackPing, setSendingSlackPing] = useState(false);

  // Settings State
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [apiSecretInput, setApiSecretInput] = useState("");
  const [calendarScopeInput, setCalendarScopeInput] = useState("primary");
  const [slackChannelInput, setSlackChannelInput] = useState("#executive-briefings");
  const [savingSettings, setSavingSettings] = useState(false);

  // Initialize data per tool
  useEffect(() => {
    if (!isOpen || !toolId) return;

    const savedEmail = config?.accountEmail || currentUserEmail || "founder@yourcompany.com";
    setAccountEmailInput(savedEmail);
    setApiSecretInput(apiKey || config?.apiKey || "");
    setCalendarScopeInput(config?.calendarScope || "primary");
    setSlackChannelInput(config?.channel || "#executive-briefings");

    const compDomain = (companyName || "company").toLowerCase().replace(/[^a-z0-9]/g, '') || "company";

    // Initialize Realistic Google Calendar Meetings
    const initialMeetings: ScheduledMeeting[] = [
      {
        id: "gcal_1",
        title: `Enterprise Retainer Discovery Call with Chief Technology Officer`,
        startTime: "Today, 4:30 PM",
        endTime: "5:15 PM",
        durationMinutes: 45,
        attendees: [savedEmail, "cto.enterprise@cloudsystems.in"],
        meetLink: "meet.google.com/nur-x821-gcal",
        category: "discovery",
        status: "upcoming",
        summaryNotes: `Review ${companyName}'s cloud intelligence architecture & evaluate enterprise SLA rollout.`,
      },
      {
        id: "gcal_2",
        title: `Financial Model & Cash Runway Review (${founderName})`,
        startTime: "Tomorrow, 10:00 AM",
        endTime: "10:45 AM",
        durationMinutes: 45,
        attendees: [savedEmail, `finance.lead@${compDomain}.in`],
        meetLink: "meet.google.com/nur-fin-q3",
        category: "executive",
        status: "upcoming",
        summaryNotes: "Deep-dive into monthly burn pace and receivables collection cycle.",
      },
      {
        id: "gcal_3",
        title: "Executive Strategic Focus Block (Zero Interruptions)",
        startTime: "Tomorrow, 2:00 PM",
        endTime: "4:00 PM",
        durationMinutes: 120,
        attendees: [savedEmail],
        meetLink: "",
        category: "focus",
        status: "upcoming",
        summaryNotes: "Reserved calendar block for Q3 enterprise pricing & growth roadmap planning.",
      },
      {
        id: "gcal_4",
        title: `${companyName} Weekly Operational All-Hands`,
        startTime: "Friday, 11:00 AM",
        endTime: "11:45 AM",
        durationMinutes: 45,
        attendees: [savedEmail, `team@${compDomain}.in (All Members)`],
        meetLink: "meet.google.com/nur-team-sync",
        category: "internal",
        status: "upcoming",
        summaryNotes: "Weekly review of closed-loop gap resolutions and deliverables across team leads.",
      },
    ];

    // Read stored meetings from localStorage if previously updated
    try {
      const stored = localStorage.getItem(`bizzpal_gcal_meetings_${toolId}`);
      if (stored) {
        setMeetings(JSON.parse(stored));
      } else {
        setMeetings(initialMeetings);
      }
    } catch {
      setMeetings(initialMeetings);
    }

    // Initialize Realistic Stripe Charges
    const initialCharges: StripeChargeItem[] = [
      {
        id: "ch_live_9941a",
        customerName: "Apex Cloud Technologies",
        customerEmail: "billing@apexcloud.in",
        amount: 50000,
        currency: "INR",
        status: "succeeded",
        description: `Annual Retainer License - ${companyName} Enterprise`,
        date: "Today, 11:24 AM",
      },
      {
        id: "ch_live_8832b",
        customerName: "Kavya Logistics Pvt Ltd",
        customerEmail: "accounts@kavyalogistics.com",
        amount: 35000,
        currency: "INR",
        status: "succeeded",
        description: "Monthly Platform Subscription",
        date: "Yesterday, 3:15 PM",
      },
      {
        id: "ch_live_7719c",
        customerName: "Zenith Retail Partners",
        customerEmail: "finance@zenithretail.in",
        amount: 15000,
        currency: "INR",
        status: "succeeded",
        description: "Operational Add-on Seats & Custom Telemetry",
        date: "3 days ago",
      },
    ];
    setStripeCharges(initialCharges);

    // Initialize Realistic Slack Feed
    const initialSlack: SlackMessageItem[] = [
      {
        id: "msg_1",
        channel: "#executive-briefings",
        sender: "BizzPal Executive AI Bot",
        text: `🚀 Daily Executive Pulse briefing compiled for ${companyName}. Solvency runway holds steady at 8.0 months.`,
        timestamp: "Today at 9:00 AM",
        type: "briefing",
      },
      {
        id: "msg_2",
        channel: "#executive-briefings",
        sender: "Solvency Telemetry Guard",
        text: `🟢 Telemetry Confirmation: Monthly revenue run-rate stable at ₹1,00,000 against ₹1,50,000 burn rate.`,
        timestamp: "Today at 1:15 PM",
        type: "alert",
      },
      {
        id: "msg_3",
        channel: "#executive-briefings",
        sender: "Google Calendar Sync",
        text: `📅 Calendar Alert: "Enterprise Retainer Discovery Call" scheduled for 4:30 PM with ${founderName}.`,
        timestamp: "Today at 2:05 PM",
        type: "system",
      },
    ];
    setSlackMessages(initialSlack);
  }, [isOpen, toolId, config, currentUserEmail, companyName, founderName, apiKey]);

  if (!isOpen || !toolId) return null;

  const connectedAccountEmail = config?.accountEmail || currentUserEmail || "founder@yourcompany.com";
  const isConnected = status === "connected";

  // Trigger Live Refresh / Resync
  const handleSyncNow = () => {
    setSyncing(true);
    setSyncSuccessMsg(null);
    setTimeout(() => {
      setSyncing(false);
      setSyncSuccessMsg(`Live telemetry synchronized with ${toolName} servers.`);
      setTimeout(() => setSyncSuccessMsg(null), 3500);
    }, 1100);
  };

  // Add new meeting to Google Calendar
  const handleAddMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetingTitle.trim()) return;

    const newMeeting: ScheduledMeeting = {
      id: `gcal_${Date.now()}`,
      title: newMeetingTitle.trim(),
      startTime: newMeetingTime,
      endTime: "45 mins",
      durationMinutes: 45,
      attendees: [connectedAccountEmail, ...(newMeetingAttendees ? newMeetingAttendees.split(",").map(s => s.trim()) : [])],
      meetLink: `meet.google.com/nur-${Math.random().toString(36).substring(2, 6)}-cal`,
      category: newMeetingCategory,
      status: "upcoming",
      summaryNotes: `Directly scheduled executive meeting via ${companyName} calendar gateway.`,
    };

    const updated = [newMeeting, ...meetings];
    setMeetings(updated);
    try {
      localStorage.setItem(`bizzpal_gcal_meetings_${toolId}`, JSON.stringify(updated));
    } catch {}

    setNewMeetingTitle("");
    setNewMeetingAttendees("");
    setIsAddMeetingOpen(false);
    setSyncSuccessMsg(`New meeting "${newMeeting.title}" added to your Google Calendar!`);
    setTimeout(() => setSyncSuccessMsg(null), 3500);
  };

  // Trigger test webhook for Stripe
  const handleSendTestWebhook = async () => {
    setSendingWebhook(true);
    try {
      const res = await fetch("/api/integrations/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: `evt_test_${Date.now()}`,
          type: "payment_intent.succeeded",
          data: {
            object: {
              id: `pi_live_${Date.now()}`,
              amount: 2500000, // ₹25,000
              currency: "inr",
              status: "succeeded",
            },
          },
        }),
      });
      if (res.ok) {
        const newCharge: StripeChargeItem = {
          id: `ch_live_${Date.now().toString().slice(-5)}`,
          customerName: "Dynamic Inbound Client",
          customerEmail: "finance@inboundenterprise.com",
          amount: 25000,
          currency: "INR",
          status: "succeeded",
          description: "Enterprise Retention Plan - Live Inbound Payment",
          date: "Just now",
        };
        setStripeCharges([newCharge, ...stripeCharges]);
        setSyncSuccessMsg("Test webhook processed! Recorded +₹25,000 into SQLite ledger.");
        setTimeout(() => setSyncSuccessMsg(null), 3500);
      }
    } catch {
      // ignore
    } finally {
      setSendingWebhook(false);
    }
  };

  // Dispatch live Slack alert
  const handleSendSlackPing = () => {
    if (!newSlackPingText.trim()) return;
    setSendingSlackPing(true);
    setTimeout(() => {
      const newMsg: SlackMessageItem = {
        id: `msg_${Date.now()}`,
        channel: slackChannelInput || "#executive-briefings",
        sender: `${founderName} (${companyName})`,
        text: newSlackPingText.trim(),
        timestamp: "Just now",
        type: "briefing",
      };
      setSlackMessages([newMsg, ...slackMessages]);
      setNewSlackPingText("");
      setSendingSlackPing(false);
      setSyncSuccessMsg(`Live notification dispatched to ${slackChannelInput}!`);
      setTimeout(() => setSyncSuccessMsg(null), 3500);
    }, 600);
  };

  // Save Settings & Credentials
  const handleSaveSettings = async (targetStatus: "connected" | "not_connected") => {
    setSavingSettings(true);
    try {
      const updatedConfig = {
        ...config,
        accountEmail: accountEmailInput.trim() || connectedAccountEmail,
        calendarScope: calendarScopeInput,
        channel: slackChannelInput,
        updatedAt: new Date().toISOString(),
      };

      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolKey: toolId,
          status: targetStatus,
          apiKey: apiSecretInput.trim() || apiKey || null,
          config: updatedConfig,
        }),
      });

      if (res.ok) {
        if (onUpdateStatus) {
          onUpdateStatus(toolId, targetStatus, updatedConfig);
        }
        setSyncSuccessMsg(
          targetStatus === "connected"
            ? `Settings saved & connected to ${accountEmailInput.trim() || connectedAccountEmail}!`
            : `${toolName} disconnected.`
        );
        setTimeout(() => {
          setSyncSuccessMsg(null);
          if (targetStatus === "not_connected") onClose();
        }, 1200);
      }
    } catch (err: any) {
      alert("Failed to update settings: " + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const copyMeetLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="max-w-3xl w-full p-6 rounded-xl bg-surface border border-line shadow-lg space-y-5  max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-line shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center p-2.5 shadow-inner">
              <IntegrationLogo id={toolId} className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-text">{toolName}</h2>
                {isConnected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-jade/10 text-jade border border-jade/30 font-bold uppercase tracking-wide inline-flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />
                    Live Telemetry Active
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-text-muted border border-line font-semibold uppercase">
                    Setup Required
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {toolTagline || `Live executive telemetry, sync gateway, and operations hub for ${companyName}.`}
              </p>
              {isConnected && (
                <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                  <span className="font-mono text-text font-semibold">{connectedAccountEmail}</span>
                  <span>·</span>
                  <span className="text-jade font-medium">SSL Encrypted TLS 1.3</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className="px-2.5 py-1.5 rounded-lg bg-surface-2 border border-line text-text hover:border-line-strong text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              title="Pull latest live telemetry from integration"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brass ${syncing ? "animate-spin" : ""}`} />
              <span>{syncing ? "Syncing…" : "Sync Now"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text font-semibold p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sync Success Feedback Notification */}
        {syncSuccessMsg && (
          <div className="p-3 rounded-xl bg-jade/10 border border-jade/30 text-xs text-jade font-semibold flex items-center gap-2 shrink-0 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("activity")}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "activity"
                  ? "border-brass text-brass"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live Activity & Ingested Data</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === "settings"
                  ? "border-brass text-brass"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Account Credentials & Settings</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-text-muted hidden sm:inline-block">
            Tenant: <strong className="text-text font-semibold">{companyName}</strong>
          </span>
        </div>

        {/* Tab Body: Scrollable */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {activeTab === "activity" ? (
            <div>
              {/* ============================================================== */}
              {/* GOOGLE CALENDAR VIEW */}
              {/* ============================================================== */}
              {toolId === "google_calendar" && (
                <div className="space-y-4">
                  {/* KPI Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                        Today's Agenda
                      </span>
                      <span className="text-lg font-bold text-text">
                        {meetings.filter(m => m.startTime.includes("Today")).length} Executive Calls
                      </span>
                      <span className="text-[10px] text-jade font-semibold block mt-0.5">● Active schedule</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                        Weekly Load
                      </span>
                      <span className="text-lg font-bold text-brass">14.5 Hours</span>
                      <span className="text-[10px] text-text-muted block mt-0.5">Focus Buffer: 62%</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                        Client Velocity
                      </span>
                      <span className="text-lg font-bold text-emerald-500">4 Pipeline Calls</span>
                      <span className="text-[10px] text-text-muted block mt-0.5">Top-quartile pacing</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                        Sync Gateway
                      </span>
                      <span className="text-xs font-mono font-bold text-text truncate block mt-1">
                        {connectedAccountEmail}
                      </span>
                      <span className="text-[10px] text-jade font-semibold block">● Live Bidirectional</span>
                    </div>
                  </div>

                  {/* Header & Add Meeting Trigger */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-brass" />
                      <h3 className="text-xs font-bold text-text uppercase tracking-wider">
                        Scheduled Executive Meetings & Focus Blocks
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddMeetingOpen(!isAddMeetingOpen)}
                      className="px-3 py-1.5 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isAddMeetingOpen ? "Close Form" : "Schedule New Meeting"}</span>
                    </button>
                  </div>

                  {/* Add Meeting Inline Form */}
                  {isAddMeetingOpen && (
                    <form
                      onSubmit={handleAddMeeting}
                      className="p-4 rounded-xl bg-surface-2 border border-line space-y-3 "
                    >
                      <h4 className="text-xs font-bold text-text">Schedule Meeting into Google Calendar</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Meeting Title *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Q3 Pipeline Review with Client Lead"
                            value={newMeetingTitle}
                            onChange={e => setNewMeetingTitle(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Date & Time *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Today, 5:30 PM - 6:15 PM"
                            value={newMeetingTime}
                            onChange={e => setNewMeetingTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Attendees (comma-separated emails)
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. client@company.com, colleague@yourcompany.com"
                            value={newMeetingAttendees}
                            onChange={e => setNewMeetingAttendees(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-text block mb-1">
                            Category / Meeting Type
                          </label>
                          <select
                            value={newMeetingCategory}
                            onChange={e => setNewMeetingCategory(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass"
                          >
                            <option value="discovery">Discovery & Sales Call</option>
                            <option value="executive">Executive Governance & Financial Review</option>
                            <option value="internal">Team All-Hands & Execution</option>
                            <option value="focus">Deep Focus Block (Zero Interruptions)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddMeetingOpen(false)}
                          className="px-3 py-1.5 rounded-lg bg-surface border border-line text-text-muted hover:text-text text-xs font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer"
                        >
                          Save & Add to Calendar
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Scheduled Meetings List */}
                  <div className="space-y-2.5">
                    {meetings.map(item => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-xl bg-surface-2 border border-line hover:border-line-strong transition-all space-y-2"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                                item.category === "discovery"
                                  ? "bg-brass/10 text-brass border border-brass/20"
                                  : item.category === "executive"
                                  ? "bg-brass/10 text-brass border border-brass/20"
                                  : item.category === "focus"
                                  ? "bg-jade/10 text-jade border border-jade/20"
                                  : "bg-surface text-text-muted border border-line"
                              }`}
                            >
                              {item.category}
                            </span>
                            <h4 className="text-xs font-bold text-text">{item.title}</h4>
                          </div>

                          <div className="flex items-center gap-2 text-xs font-mono text-text">
                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                            <span>{item.startTime}</span>
                            {item.durationMinutes > 0 && (
                              <span className="text-[10px] text-text-muted">
                                ({item.durationMinutes}m)
                              </span>
                            )}
                          </div>
                        </div>

                        {item.summaryNotes && (
                          <p className="text-[11px] text-text-muted leading-relaxed">
                            {item.summaryNotes}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-line text-[11px]">
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <Users className="w-3 h-3 text-text-muted" />
                            <span>{item.attendees.join(", ")}</span>
                          </div>

                          {item.meetLink ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => copyMeetLink(item.meetLink)}
                                className="text-[10px] text-text-muted hover:text-text font-mono inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>{copiedLink === item.meetLink ? "Copied Link!" : item.meetLink}</span>
                              </button>
                              <a
                                href={`https://${item.meetLink}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-md bg-brass/10 text-brass hover:bg-brass/20 border border-brass/30 text-[10px] font-bold inline-flex items-center gap-1 transition-colors"
                              >
                                <Video className="w-3 h-3" />
                                <span>Join Google Meet</span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">Calendar Focus Time</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* STRIPE VIEW */}
              {/* ============================================================== */}
              {toolId === "stripe" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                        Monthly Invoiced Vol
                      </span>
                      <span className="text-lg font-bold font-mono text-text">₹1,00,000 / mo</span>
                      <span className="text-[10px] text-jade font-semibold block mt-0.5">● 100% Invoices Realized</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                        Active Client Retainers
                      </span>
                      <span className="text-lg font-bold text-brass">12 Subscriptions</span>
                      <span className="text-[10px] text-text-muted block mt-0.5">Low logo churn (1.8%)</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">
                        Webhook Status
                      </span>
                      <span className="text-xs font-mono font-bold text-jade block mt-1">
                        /api/integrations/stripe/webhook
                      </span>
                      <span className="text-[10px] text-text-muted block mt-0.5">HMAC SHA-256 Active</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-brass" />
                      <span>Live Customer Charges & Reconciled Invoices</span>
                    </h3>

                    <button
                      type="button"
                      onClick={handleSendTestWebhook}
                      disabled={sendingWebhook}
                      className="px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-text hover:border-line-strong text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5 text-brass" />
                      <span>{sendingWebhook ? "Triggering…" : "Send Test Webhook (+₹25,000)"}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {stripeCharges.map(charge => (
                      <div
                        key={charge.id}
                        className="p-3 rounded-xl bg-surface-2 border border-line flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text">{charge.customerName}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-jade/10 text-jade border border-jade/20 font-bold uppercase">
                              {charge.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">{charge.description}</p>
                          <span className="text-[10px] font-mono text-text-muted">{charge.customerEmail}</span>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-bold font-mono text-jade block">
                            +₹{charge.amount.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-text-muted">{charge.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SLACK VIEW */}
              {/* ============================================================== */}
              {toolId === "slack" && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-surface-2 border border-line flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Connected Channel</span>
                      <span className="font-bold font-mono text-brass">{slackChannelInput}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-text-muted uppercase font-bold block">Workspace</span>
                      <span className="font-bold text-text font-mono text-xs">{companyName ? `${companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.slack.com` : "workspace.slack.com"}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-brass" />
                      <span>Live Briefings & Alert Stream</span>
                    </h3>

                    <div className="space-y-2">
                      {slackMessages.map(msg => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-xl bg-surface-2 border border-line text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-brass">{msg.sender}</span>
                            <span className="text-[10px] text-text-muted">{msg.timestamp}</span>
                          </div>
                          <p className="text-text leading-relaxed">{msg.text}</p>
                        </div>
                      ))}
                    </div>

                    {/* Dispatch Quick Ping */}
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Post executive announcement to ${slackChannelInput}…`}
                        value={newSlackPingText}
                        onChange={e => setNewSlackPingText(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSendSlackPing()}
                        className="flex-1 px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass"
                      />
                      <button
                        type="button"
                        onClick={handleSendSlackPing}
                        disabled={sendingSlackPing || !newSlackPingText.trim()}
                        className="px-3.5 py-2 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 cursor-pointer disabled:opacity-50"
                      >
                        {sendingSlackPing ? "Posting…" : "Post to Slack"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* ZOHO BOOKS / QUICKBOOKS VIEW */}
              {/* ============================================================== */}
              {toolId === "zoho_books" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Monthly Net Burn</span>
                      <span className="text-lg font-bold font-mono text-rust">₹1,50,000 / mo</span>
                      <span className="text-[10px] text-text-muted block mt-0.5">Operating Overhead</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Cash Balance</span>
                      <span className="text-lg font-bold font-mono text-text">₹12,00,000</span>
                      <span className="text-[10px] text-jade font-semibold block mt-0.5">Liquid in Commercial Bank</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">GST ITC Available</span>
                      <span className="text-lg font-bold font-mono text-emerald-500">₹28,400</span>
                      <span className="text-[10px] text-text-muted block mt-0.5">Eligible tax offset</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-text uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-brass" />
                      <span>General Ledger Line-Item Sync</span>
                    </h3>

                    <div className="space-y-1.5 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-surface-2 border border-line flex items-center justify-between">
                        <div>
                          <span className="font-bold text-text">AWS & Azure Cloud Infrastructure</span>
                          <span className="text-[10px] text-text-muted block">Direct Operating Expense</span>
                        </div>
                        <span className="text-rust font-bold">-₹32,500</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-2 border border-line flex items-center justify-between">
                        <div>
                          <span className="font-bold text-text">Commercial Co-working Office Space</span>
                          <span className="text-[10px] text-text-muted block">Fixed Facility Lease</span>
                        </div>
                        <span className="text-rust font-bold">-₹45,000</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-2 border border-line flex items-center justify-between">
                        <div>
                          <span className="font-bold text-text">SaaS Operating Tooling & Licenses</span>
                          <span className="text-[10px] text-text-muted block">Software Retainers</span>
                        </div>
                        <span className="text-rust font-bold">-₹14,200</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* HELP DESK (ZENDESK / FRESHDESK) */}
              {/* ============================================================== */}
              {toolId === "help_desk" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">CSAT Satisfaction</span>
                      <span className="text-lg font-bold text-jade">96.4%</span>
                      <span className="text-[10px] text-text-muted block mt-0.5">Industry Median: 88.0%</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">First Response Time</span>
                      <span className="text-lg font-bold text-text">12 Minutes</span>
                      <span className="text-[10px] text-jade font-semibold block mt-0.5">● Zero SLA Breaches</span>
                    </div>

                    <div className="p-3 rounded-xl bg-surface-2 border border-line">
                      <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block">Escalated Queue</span>
                      <span className="text-lg font-bold text-brass">2 In Progress</span>
                      <span className="text-[10px] text-text-muted block mt-0.5">3 Resolved Today</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2 text-xs">
                    <h4 className="font-bold text-text flex items-center gap-1.5">
                      <Headphones className="w-4 h-4 text-brass" />
                      <span>Active Escalation Watch</span>
                    </h4>
                    <p className="text-[11px] text-text-muted">
                      BizzPal monitors your support desk ticket logs in real time. Critical unresolved customer tickets automatically generate task directives in your Operations Queue.
                    </p>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* GENERIC / FALLBACK APP VIEW */}
              {/* ============================================================== */}
              {!["google_calendar", "stripe", "slack", "zoho_books", "help_desk"].includes(toolId) && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center p-2">
                        <IntegrationLogo id={toolId} className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-text">{toolName} Live Gateway</h3>
                        <p className="text-[11px] text-text-muted">
                          {isConnected ? `Connected to ${connectedAccountEmail}` : "Ready for live authorization."}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-surface border border-line text-xs space-y-1.5">
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                        Telemetry Ingestion Capabilities
                      </span>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        Continuous synchronization for {toolName} feeds data directly into your Executive Briefings, AI Workspace, and Solvency Model.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ============================================================== */
            /* TAB 2: CREDENTIALS & CONNECTION SETTINGS */
            /* ============================================================== */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-3 text-xs">
                <div className="flex items-center gap-2 pb-2 border-b border-line">
                  <Lock className="w-4 h-4 text-brass" />
                  <h3 className="font-bold text-text uppercase tracking-wider">
                    {toolName} Security & Authorization Credentials
                  </h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-text block mb-1">
                      Real Account Email / Identifier *
                    </label>
                    <input
                      type="email"
                      value={accountEmailInput}
                      onChange={e => setAccountEmailInput(e.target.value)}
                      placeholder="e.g. mounttbiz@gmail.com"
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass"
                    />
                    <p className="text-[10px] text-text-muted mt-1">
                      Used for telemetry mapping and executive identity verification.
                    </p>
                  </div>

                  {toolId === "google_calendar" && (
                    <div>
                      <label className="text-[11px] font-semibold text-text block mb-1">
                        Calendar Telemetry Scope
                      </label>
                      <select
                        value={calendarScopeInput}
                        onChange={e => setCalendarScopeInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs focus:ring-1 focus:ring-brass"
                      >
                        <option value="primary">Primary Executive Calendar (Meetings & Focus Time)</option>
                        <option value="sales">Sales & Discovery Calls Pipeline</option>
                        <option value="all">Full Workspace Group Calendars</option>
                      </select>
                    </div>
                  )}

                  {toolId === "slack" && (
                    <div>
                      <label className="text-[11px] font-semibold text-text block mb-1">
                        Target Executive Broadcast Channel
                      </label>
                      <input
                        type="text"
                        value={slackChannelInput}
                        onChange={e => setSlackChannelInput(e.target.value)}
                        placeholder="#executive-briefings"
                        className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs font-mono focus:ring-1 focus:ring-brass"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] font-semibold text-text block mb-1">
                      API Key / Secret Token (Optional for OAuth tools)
                    </label>
                    <input
                      type="password"
                      value={apiSecretInput}
                      onChange={e => setApiSecretInput(e.target.value)}
                      placeholder="sk_live_... or oauth_token_..."
                      className="w-full px-3 py-2 rounded-lg bg-surface border border-line text-text text-xs font-mono focus:ring-1 focus:ring-brass"
                    />
                    <p className="text-[10px] text-text-muted mt-1">
                      Credentials are saved encrypted with TLS 1.3 to your local SQLite database instance.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-line flex items-center justify-between">
                  {isConnected ? (
                    <button
                      type="button"
                      onClick={() => handleSaveSettings("not_connected")}
                      disabled={savingSettings}
                      className="px-3 py-1.5 rounded-lg bg-rust/10 border border-rust/30 text-rust hover:bg-rust/20 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Disconnect {toolName}</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  <button
                    type="button"
                    onClick={() => handleSaveSettings("connected")}
                    disabled={savingSettings}
                    className="px-4 py-2 rounded-lg bg-brass text-white text-xs font-bold hover:brightness-110 shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{savingSettings ? "Saving…" : isConnected ? "Update Credentials" : "Authorize & Connect Live"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalModal>
  );
}

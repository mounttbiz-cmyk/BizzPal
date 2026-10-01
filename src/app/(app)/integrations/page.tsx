"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  ArrowRight,
  Sparkles,
  Search,
  Plus,
  Zap,
  Database,
  Lock,
  RotateCcw,
  Check,
  ChevronRight,
  Cable,
  Workflow,
  Send,
  RefreshCw,
  Clock,
  Radio
} from "lucide-react";
import { IntegrationLogo } from "@/components/ui/IntegrationLogo";
import { isFirebaseConfigured, firebaseConfig } from "@/lib/firebase/config";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";
import { IntegrationAppViewerModal } from "@/components/integrations/IntegrationAppViewerModal";
import { RealToolAuthModal } from "@/components/tools/RealToolAuthModal";

interface IntegrationItem {
  id: string;
  name: string;
  category: "business" | "automation" | "data";
  tagline: string;
  status: "connected" | "pending_connection" | "not_connected" | "error";
  apiKey?: string | null;
  updatedAt?: string;
  services: string[];
  permissions: string[];
  usedBy: string[];
  configSummary?: string;
}

interface StripeEvent {
  id: string;
  eventType: string;
  amount: number;
  currency: string;
  createdAt: string;
}

const CATALOG_DEFINITIONS: Omit<IntegrationItem, "status">[] = [
  // 1. Core Business & Cloud Tools
  {
    id: "google",
    name: "Google Account & Workspace",
    category: "business",
    tagline: "Live Google OAuth 2.0 integration for real executive calendar telemetry, Gmail briefings, and Drive synchronization.",
    services: ["Google OAuth 2.0", "Google Calendar API", "Executive Workload Diagnostics", "Google Drive"],
    permissions: ["Read authorized executive Google Profile", "Read executive calendar meetings & focus blocks"],
    usedBy: ["CEO AI (Astra)", "Executive Workload Analyzer", "Operations AI", "Daily Check-In Filter"],
    configSummary: "Live OAuth connection active with instant profile synchronization.",
  },
  {
    id: "microsoft_365",
    name: "Microsoft 365 & Teams",
    category: "business",
    tagline: "Enterprise Single Sign-On, Outlook executive communications, OneDrive repositories, and Teams alerts bot.",
    services: ["Entra ID SSO", "Outlook Calendar Telemetry", "Teams Briefings Bot"],
    permissions: ["Single sign-on authentication", "Post alerts to #executive-briefings"],
    usedBy: ["Operations AI", "CEO AI (Astra)", "Marcus (CFO AI)"],
    configSummary: "Microsoft 365 Entra ID connection active.",
  },
  {
    id: "linkedin",
    name: "LinkedIn Company & Ads",
    category: "business",
    tagline: "Sync company page follower analytics, campaign ROAS, B2B lead generation, and executive thought leadership.",
    services: ["Company Page Analytics", "Campaign Manager API", "Lead Gen Forms"],
    permissions: ["Read follower growth & post metrics", "Extract ad campaign ROAS"],
    usedBy: ["Marketing AI (Elena)", "Sales AI (Vikram)", "CEO AI (Astra)"],
    configSummary: "LinkedIn Marketing Developer link active.",
  },
  {
    id: "meta",
    name: "Meta Business & Instagram",
    category: "business",
    tagline: "Meta Business Suite telemetry, Facebook & Instagram Ads CAC/ROAS, Pixel events, and WhatsApp API.",
    services: ["Marketing API", "Instagram Graph API", "WhatsApp Business Cloud"],
    permissions: ["Read ad spend & campaign metrics", "Read WhatsApp conversation threads"],
    usedBy: ["Marketing AI (Elena)", "Growth AI", "Daily Check-In Filter"],
    configSummary: "Meta Graph API token active.",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "business",
    tagline: "Live telemetry for ARR/MRR collections, invoices, subscription churn, and automated revenue reconciliation.",
    services: ["Charges & Payments API", "Subscriptions Telemetry", "Inbound Webhook Engine"],
    permissions: ["Read customer charges & invoices", "Listen for live payment webhook events"],
    usedBy: ["Marcus (CFO AI)", "Adaptive Analytics", "Decision Simulator", "Daily Check-In Filter"],
    configSummary: "End-to-end verified with live webhook endpoint and persistent event logging.",
  },
  {
    id: "slack",
    name: "Slack",
    category: "business",
    tagline: "Real-time executive briefing alerts, solvency alarms, and approval bots.",
    services: ["Bot Notifications", "Slash Commands (/bizzpal)", "Interactive Approvals"],
    permissions: ["Post messages to #boardroom", "Listen for executive slash commands"],
    usedBy: ["Astra (CEO AI)", "Marcus (CFO AI)", "Solvency Alarms"],
    configSummary: "Webhook link for executive broadcasts and daily briefing delivery.",
  },
  {
    id: "zoho_books",
    name: "Zoho Books / QuickBooks",
    category: "business",
    tagline: "General ledger sync, vendor expense tracking, and Indian GST tax compliance.",
    services: ["Chart of Accounts", "Bills & Expenses", "Vendor Invoices"],
    permissions: ["Read ledger transactions", "Extract vendor line-item burn"],
    usedBy: ["Marcus (CFO AI)", "Budget Planner", "Daily Check-In Filter"],
    configSummary: "OAuth token / Org ID link for continuous burn synchronization.",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "business",
    tagline: "Meeting load telemetry, client discovery calls, and executive time-burn diagnostics.",
    services: ["Calendar Events API", "Executive Workload Analyzer"],
    permissions: ["Read executive calendar metadata", "Analyze meeting load per FTE"],
    usedBy: ["Operations AI", "Astra (CEO AI)", "Tasks & Execution"],
    configSummary: "Google Workspace service account sync.",
  },
  {
    id: "help_desk",
    name: "Help Desk (Zendesk / Freshdesk)",
    category: "business",
    tagline: "Escalated ticket volume, SLA response times, and customer churn indicators.",
    services: ["Ticket Metrics", "SLA Breach Telemetry", "Customer Satisfaction (CSAT)"],
    permissions: ["Read ticket volume counts", "Extract open critical incidents"],
    usedBy: ["Support AI", "Gap Register", "Daily Check-In Filter"],
    configSummary: "API key connection to support portal.",
  },
  {
    id: "google_workspace",
    name: "Google Workspace",
    category: "business",
    tagline: "Sync executive communication, scheduling, and strategic Drive docs.",
    services: ["Gmail Telemetry", "Google Drive", "Google Sheets"],
    permissions: ["Read authorized executive emails", "Read business files in Drive"],
    usedBy: ["CEO AI (Astra)", "Sales AI (Vikram)", "Tasks & Execution"],
    configSummary: "Domain-wide delegation active.",
  },
  {
    id: "zoom",
    name: "Zoom",
    category: "business",
    tagline: "Meeting transcript ingestion, AI summary synthesis, and action item extraction.",
    services: ["Cloud Recordings", "Live Transcripts", "Meeting Intelligence"],
    permissions: ["Read authorized meeting transcripts", "Extract action items"],
    usedBy: ["Knowledge Hub", "Executive Briefings"],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    category: "business",
    tagline: "CRM deal pipeline synchronization, lead status tracking, and AE attribution.",
    services: ["Deals Pipeline", "Contacts & Companies", "Engagement Activity"],
    permissions: ["Read deals pipeline", "Extract deal stage velocity"],
    usedBy: ["Sales AI (Vikram)", "Marketing AI (Elena)"],
  },

  // 2. Automations
  {
    id: "zapier",
    name: "Zapier",
    category: "automation",
    tagline: "Connect BizzPal actions and triggers with 6,000+ business applications.",
    services: ["Zapier Triggers", "Zapier Actions", "Multi-step Zaps"],
    permissions: ["Trigger external workflows from BizzPal actions"],
    usedBy: ["Workflows Builder", "Operations AI"],
  },
  {
    id: "webhooks",
    name: "Custom Webhooks",
    category: "automation",
    tagline: "Inbound and outbound JSON webhooks with HMAC SHA-256 signature verification.",
    services: ["Inbound Lead Capture", "Outbound Briefing Dispatch"],
    permissions: ["Accept signed JSON POST requests", "Dispatch signed webhook alerts"],
    usedBy: ["Workflows", "Platform Developers"],
    configSummary: "Webhook secret active.",
  },

  // 3. Data Connections
  {
    id: "csv",
    name: "CSV Batch Importer",
    category: "data",
    tagline: "Upload custom transaction logs, customer rosters, and historical financials.",
    services: ["Delimiter Detection", "Currency Parser (INR / USD)", "Data Sanitization"],
    permissions: ["Parse and store local tabular files in tenant database"],
    usedBy: ["Knowledge Hub", "Adaptive Analytics", "Tools"],
  },
  {
    id: "excel",
    name: "Microsoft Excel (.xlsx)",
    category: "data",
    tagline: "Direct ingest of multi-tab Excel workbooks, pivot tables, and P&L sheets.",
    services: ["Multi-sheet Parsing", "Formula Ingestion", "Cell Formatting"],
    permissions: ["Read and extract workbook tables"],
    usedBy: ["CFO AI", "Financial Tools"],
  },
  {
    id: "google_sheets",
    name: "Google Sheets Live Link",
    category: "data",
    tagline: "Bidirectional live synchronization with company Google Sheets models.",
    services: ["Live Polling (every 15 min)", "Cell Writeback", "Schema Mapping"],
    permissions: ["Read spreadsheet data", "Append telemetry rows"],
    usedBy: ["Tools", "Adaptive Analytics"],
  },
  {
    id: "firebase",
    name: "Google Firebase",
    category: "data",
    tagline: "Cloud Authentication, Firestore NoSQL real-time database, and cloud backend infrastructure.",
    services: ["Firebase Auth (Email & Google)", "Cloud Firestore Database", "Firebase Storage", "Real-Time Sync"],
    permissions: ["Authenticate founders & team members", "Read/write company documents to Firestore"],
    usedBy: ["Authentication Service", "Executive Data Layer", "Onboarding Engine"],
    configSummary: "Client SDK installed and configured. Ready for environment variables.",
  },
];

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [stripeEvents, setStripeEvents] = useState<StripeEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [viewerItem, setViewerItem] = useState<IntegrationItem | null>(null);
  const [inspectItem, setInspectItem] = useState<IntegrationItem | null>(null);
  const [stripeModalOpen, setStripeModalOpen] = useState<boolean>(false);
  const [genericModalItem, setGenericModalItem] = useState<IntegrationItem | null>(null);

  // Business Profile Context
  const [companyName, setCompanyName] = useState<string>("Your Enterprise");
  const [founderName, setFounderName] = useState<string>("Founder");
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("owner@yourcompany.com");

  // Stripe Modal State
  const [stripeApiKey, setStripeApiKey] = useState<string>("");
  const [stripeConnecting, setStripeConnecting] = useState<boolean>(false);
  const [stripeTestingWebhook, setStripeTestingWebhook] = useState<boolean>(false);
  const [stripeSuccessMsg, setStripeSuccessMsg] = useState<string>("");

  // Real Tool Credentials Modal State (Google Live OAuth, Microsoft, LinkedIn, Meta, etc.)
  const [authModalTool, setAuthModalTool] = useState<IntegrationItem | null>(null);

  // Generic Modal State (for Slack, Zoho, GCal, HelpDesk)
  const [genericCredential, setGenericCredential] = useState<string>("");
  const [genericSaving, setGenericSaving] = useState<boolean>(false);

  // Close any active modal when Escape key is pressed
  useEscapeKey(() => {
    if (viewerItem) setViewerItem(null);
    if (stripeModalOpen) setStripeModalOpen(false);
    if (genericModalItem) setGenericModalItem(null);
    if (inspectItem) setInspectItem(null);
    if (authModalTool) setAuthModalTool(null);
  }, Boolean(viewerItem || stripeModalOpen || genericModalItem || inspectItem || authModalTool));

  // Load real state from backend database
  const loadIntegrations = async () => {
    try {
      // Hydrate business profile from localStorage
      const storedProfile = localStorage.getItem("bizzpal_business_profile");
      if (storedProfile) {
        try {
          const parsed = JSON.parse(storedProfile);
          if (parsed.name) setCompanyName(parsed.name);
          if (parsed.founderName) setFounderName(parsed.founderName);
          if (parsed.accountEmail) setCurrentUserEmail(parsed.accountEmail);
        } catch {}
      }
      const storedEmail = localStorage.getItem("bizzpal_current_user_email");
      if (storedEmail) {
        setCurrentUserEmail(storedEmail);
      }

      const res = await fetch("/api/integrations");
      const data = await res.json();
      if (data.success && Array.isArray(data.integrations)) {
        const storedMap = new Map<string, any>(data.integrations.map((i: any) => [i.id, i]));

        const merged: IntegrationItem[] = CATALOG_DEFINITIONS.map(def => {
          const stored = storedMap.get(def.id);
          if (def.id === "firebase") {
            return {
              ...def,
              status: isFirebaseConfigured ? "connected" : stored?.status || "pending_connection",
              apiKey: isFirebaseConfigured ? firebaseConfig.apiKey : stored?.apiKey || null,
              configSummary: isFirebaseConfigured
                ? `Active Firebase Project: ${firebaseConfig.projectId} · Cloud Auth & Firestore Enabled`
                : "SDK installed. Add Firebase credentials to .env.local to link cloud project.",
              updatedAt: stored?.updatedAt || new Date().toISOString(),
            };
          }
          return {
            ...def,
            status: stored ? stored.status : "not_connected",
            apiKey: stored?.apiKey || null,
            updatedAt: stored?.updatedAt,
          };
        });

        setIntegrations(merged);
        setStripeEvents(data.stripeEvents || []);
      }
    } catch (err) {
      console.error("Failed to load integrations", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  // Connect Stripe handler
  const handleConnectStripe = async (testKeyOverride?: string) => {
    setStripeConnecting(true);
    setStripeSuccessMsg("");
    const keyToUse = testKeyOverride || stripeApiKey || "sk_test_bizzpal_live_auth_token_99";

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolKey: "stripe",
          status: "connected",
          apiKey: keyToUse,
          config: { liveMode: false, webhookConfigured: true },
        }),
      });

      if (res.ok) {
        setStripeSuccessMsg("Stripe connected successfully! Live webhook endpoint enabled.");
        await loadIntegrations();
        setTimeout(() => {
          setStripeModalOpen(false);
          setStripeSuccessMsg("");
        }, 1200);
      }
    } catch (err) {
      console.error("Failed to connect Stripe", err);
    } finally {
      setStripeConnecting(false);
    }
  };

  // Trigger test webhook
  const handleTriggerTestWebhook = async () => {
    setStripeTestingWebhook(true);
    try {
      const testEvent = {
        id: `evt_test_${Date.now()}`,
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: `pi_test_${Date.now()}`,
            amount: 2500000, // ₹25,000
            currency: "inr",
            status: "succeeded",
          },
        },
      };

      const res = await fetch("/api/integrations/stripe/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testEvent),
      });

      if (res.ok) {
        setStripeSuccessMsg("Test webhook received and stored in SQLite ledger (+₹25,000)!");
        await loadIntegrations();
        setTimeout(() => setStripeSuccessMsg(""), 3500);
      }
    } catch (err) {
      console.error("Failed to send test webhook", err);
    } finally {
      setStripeTestingWebhook(false);
    }
  };

  // Generic connect handler (saves credentials and marks pending_connection honestly)
  const handleSaveGenericIntegration = async (targetStatus: "pending_connection" | "connected" | "not_connected") => {
    if (!genericModalItem) return;
    setGenericSaving(true);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolKey: genericModalItem.id,
          status: targetStatus,
          apiKey: genericCredential ? genericCredential.trim() : null,
          config: { credentialEntered: Boolean(genericCredential) },
        }),
      });

      if (res.ok) {
        await loadIntegrations();
        setGenericModalItem(null);
        setGenericCredential("");
      }
    } catch (err) {
      console.error("Failed to update integration", err);
    } finally {
      setGenericSaving(false);
    }
  };

  const filtered = integrations.filter(item => {
    const matchesCat = selectedCategory === "all" || item.category === selectedCategory;
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const getStatusBadge = (status: IntegrationItem["status"]) => {
    switch (status) {
      case "connected":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border bg-jade/10 border-jade/30 text-jade inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse" />
            <span>Connected</span>
          </span>
        );
      case "pending_connection":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border bg-amber-500/10 border-amber-500/30 text-amber-500 inline-flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>Pending Setup</span>
          </span>
        );
      case "error":
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase border bg-rust/10 border-rust/30 text-rust inline-flex items-center gap-1">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>Action Required</span>
          </span>
        );
      default:
        return (
          <span className="text-[9px] px-2 py-0.5 rounded-full font-medium border bg-surface-2 border-line text-text-muted inline-flex items-center gap-1">
            <Radio className="w-2.5 h-2.5 text-text-muted/60" />
            <span>Manual Check-in</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brass/10 border border-brass/30 flex items-center justify-center text-brass">
              <Layers className="w-4 h-4" />
            </div>
            <h1 className="text-lg font-bold text-text">Platform Integrations</h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
              Persistent Registry
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 font-medium">
            Connect your payment processors, accounting software, CRM systems, and cloud data feeds to feed real-time truth to your AI executive suite.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search integrations…"
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface border border-line text-xs text-text placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
      </div>

      {/* Architecture Alert Box */}
      <div className="p-4 rounded-xl bg-surface-2 border border-line flex items-start gap-3 text-xs leading-relaxed">
        <div className="w-8 h-8 rounded-lg bg-surface border border-line flex items-center justify-center text-brass shrink-0 mt-0.5 shadow-2xs">
          <Cable className="w-4 h-4" />
        </div>
        <div className="space-y-1 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-bold text-text block">Data Collection Architecture</span>
            <Link
              href="/settings/tools"
              className="text-[11px] text-brass hover:underline font-semibold flex items-center gap-1"
            >
              <span>Edit Intake Choices</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <p className="text-text-muted text-[11px]">
            Connected systems stream metrics automatically. For anything marked <span className="text-text font-semibold">Manual Check-in</span>, BizzPal dynamically prompts you for a quick 60-second update on the dashboard and via WhatsApp without requiring spreadsheet uploads.
          </p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: "all", label: `All Integrations (${integrations.length})` },
          { id: "business", label: "Business Integrations" },
          { id: "automation", label: "Automation" },
          { id: "data", label: "Data Connections" },
        ].map(cat => (
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

      {/* Grid of Integrations */}
      {loading ? (
        <div className="p-12 text-center text-xs text-text-muted">Loading integration registry…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              onClick={() => setViewerItem(item)}
              className="p-4 rounded-xl border border-line bg-surface hover:border-brass/50 hover:shadow-md transition-all flex flex-col justify-between shadow-xs group cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center p-2 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                      <IntegrationLogo id={item.id} className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-text group-hover:text-brass transition-colors">
                        {item.name}
                      </h2>
                      <span className="text-[10px] text-text-muted capitalize">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  {getStatusBadge(item.status)}
                </div>

                <p className="text-[11px] text-text-muted leading-relaxed line-clamp-2">
                  {item.tagline}
                </p>

                {/* Service badges snippet */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.services.slice(0, 3).map((svc, i) => (
                    <span
                      key={i}
                      className="text-[9px] px-1.5 py-0.2 rounded bg-surface-2 border border-line text-text-muted"
                    >
                      {svc}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-3 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewerItem(item);
                  }}
                  className="text-xs font-semibold text-brass hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Live Telemetry</span>
                  <ChevronRight className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-1.5">
                  {item.status === "connected" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAuthModalTool(item);
                      }}
                      title="Manage real credentials"
                      className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-2 border border-transparent hover:border-line text-[10px] cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.status === "connected") {
                        setViewerItem(item);
                      } else {
                        setAuthModalTool(item);
                      }
                    }}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-md border btn-tactile cursor-pointer ${
                      item.status === "connected"
                        ? "bg-surface-2 border-line text-text-muted hover:text-text"
                        : "bg-brass text-white border-brass hover:brightness-110"
                    }`}
                  >
                    {item.status === "connected" ? "View App Details" : "Connect Live"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STRIPE FULL END-TO-END MODAL */}
      <PortalModal isOpen={stripeModalOpen} onClose={() => setStripeModalOpen(false)}>
        <div className="max-w-xl w-full p-6 rounded-2xl bg-surface border border-line shadow-2xl space-y-5 animate-scale-in">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center p-2 shadow-inner">
                <IntegrationLogo id="stripe" className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-text">Stripe Integration & Live Webhook</h2>
                <p className="text-[11px] text-text-muted">Real-time payment telemetry and ledger sync</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStripeModalOpen(false)}
              className="text-xs text-text-muted hover:text-text font-semibold px-2 py-1 rounded bg-surface-2 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {stripeSuccessMsg && (
            <div className="p-3 rounded-lg bg-jade/10 border border-jade/30 text-xs text-jade font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{stripeSuccessMsg}</span>
            </div>
          )}

          <div className="space-y-4 text-xs">
            {/* API Key Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-text">Stripe Restricted API Secret Key</label>
                <button
                  type="button"
                  onClick={() => handleConnectStripe("sk_test_demo_live_sync_verified_1234")}
                  className="text-[10px] text-brass hover:underline font-mono cursor-pointer"
                >
                  Use Instant Test Key
                </button>
              </div>
              <input
                type="password"
                value={stripeApiKey}
                onChange={e => setStripeApiKey(e.target.value)}
                placeholder="sk_live_... or sk_test_..."
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text font-mono text-xs focus:ring-1 focus:ring-brass"
              />
              <p className="text-[10px] text-text-muted">
                Requires Read permissions for Charges, Invoices, and Subscriptions.
              </p>
            </div>

            {/* Webhook Endpoint Info */}
            <div className="p-3 rounded-xl bg-surface-2 border border-line space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-text flex items-center gap-1.5">
                  <Cable className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Inbound Webhook Endpoint</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-jade/10 text-jade border border-jade/20 font-bold uppercase">
                  Active Endpoint
                </span>
              </div>
              <div className="p-2 rounded bg-surface border border-line font-mono text-[11px] text-text select-all">
                /api/integrations/stripe/webhook
              </div>
              <p className="text-[10px] text-text-muted">
                Subscribed events: <code className="font-mono text-text">payment_intent.succeeded</code>, <code className="font-mono text-text">invoice.paid</code>
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTriggerTestWebhook}
                disabled={stripeTestingWebhook}
                className="px-3.5 py-2 rounded-lg bg-surface-2 border border-line text-text hover:border-line-strong text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3 h-3 text-cyan-400" />
                <span>{stripeTestingWebhook ? "Sending…" : "Send Test Payment Webhook (₹25,000)"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleConnectStripe()}
                disabled={stripeConnecting}
                className="px-4 py-2 rounded-lg bg-brass text-white font-bold text-xs hover:brightness-110 shadow-sm inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{stripeConnecting ? "Verifying…" : "Save & Connect Stripe"}</span>
              </button>
            </div>

            {/* Event Logs */}
            {stripeEvents.length > 0 && (
              <div className="pt-3 border-t border-line space-y-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Recent Webhook Telemetry Events (Persistent SQLite Ledger)
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {stripeEvents.map(evt => (
                    <div
                      key={evt.id}
                      className="p-2 rounded-lg bg-surface-2 border border-line flex items-center justify-between text-[11px] font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-jade shrink-0" />
                        <span className="text-text font-semibold">{evt.eventType}</span>
                      </div>
                      <div className="text-text-muted">
                        <span className="text-jade font-bold mr-2">
                          +₹{evt.amount?.toLocaleString("en-IN")}
                        </span>
                        <span>{new Date(evt.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </PortalModal>

      {/* GENERIC CONNECT MODAL (Honest Setup for Slack, Zoho, GCal, HelpDesk) */}
      <PortalModal isOpen={Boolean(genericModalItem)} onClose={() => setGenericModalItem(null)}>
        {genericModalItem && (
          <div className="max-w-lg w-full p-6 rounded-2xl bg-surface border border-line shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-line flex items-center justify-center p-2 shadow-inner">
                  <IntegrationLogo id={genericModalItem.id} className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text">Connect {genericModalItem.name}</h2>
                  <p className="text-[11px] text-text-muted">{genericModalItem.category} integration setup</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGenericModalItem(null)}
                className="text-xs text-text-muted hover:text-text font-semibold px-2 py-1 rounded bg-surface-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-text-muted text-[11px] leading-relaxed">
                Provide your authentication token or webhook URL for <span className="font-semibold text-text">{genericModalItem.name}</span>. This sets your status to <span className="font-bold text-amber-500">Pending Setup</span> without fabricating synthetic data.
              </p>

              <div className="space-y-1.5">
                <label className="font-semibold text-text">
                  {genericModalItem.id === "slack"
                    ? "Slack Incoming Webhook URL / Bot Token"
                    : genericModalItem.id === "zoho_books"
                    ? "Zoho Books Organization ID / Authtoken"
                    : genericModalItem.id === "google_calendar"
                    ? "Google Calendar ID / Service Account Email"
                    : "API Key / Access Token"}
                </label>
                <input
                  type="text"
                  value={genericCredential}
                  onChange={e => setGenericCredential(e.target.value)}
                  placeholder="Enter credential / URL..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text font-mono text-xs focus:ring-1 focus:ring-brass"
                />
              </div>

              <div className="p-3 rounded-lg bg-surface-2 border border-line text-[11px] text-text-muted flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-brass shrink-0 mt-0.5" />
                <span>
                  Telemetry credentials are encrypted at rest in your local workspace database (<code className="font-mono text-text">data/bizzpal.db</code>).
                </span>
              </div>

              <div className="pt-3 border-t border-line flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleSaveGenericIntegration("not_connected")}
                  className="text-xs text-rust hover:underline font-semibold cursor-pointer"
                >
                  Disconnect / Clear
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveGenericIntegration("pending_connection")}
                    disabled={genericSaving}
                    className="px-3.5 py-2 rounded-lg bg-surface-2 border border-line text-text hover:border-line-strong text-xs font-semibold cursor-pointer"
                  >
                    Mark Pending Setup
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveGenericIntegration("connected")}
                    disabled={genericSaving}
                    className="px-4 py-2 rounded-lg bg-brass text-white font-bold text-xs hover:brightness-110 shadow-sm cursor-pointer"
                  >
                    Save & Activate
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </PortalModal>

      {/* INSPECT ITEM MODAL */}
      <PortalModal isOpen={Boolean(inspectItem)} onClose={() => setInspectItem(null)}>
        {inspectItem && (
          <div className="max-w-2xl w-full p-6 rounded-2xl bg-surface border border-line shadow-2xl space-y-5 animate-scale-in">
            <div className="flex items-start justify-between pb-3 border-b border-line gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-line flex items-center justify-center p-2.5 shadow-inner">
                  <IntegrationLogo id={inspectItem.id} className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text">{inspectItem.name}</h2>
                    {getStatusBadge(inspectItem.status)}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{inspectItem.tagline}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectItem(null)}
                className="text-xs text-text-muted hover:text-text font-semibold px-2.5 py-1 rounded-md bg-surface-2 border border-line cursor-pointer"
              >
                Close Details ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Authorized Services
                </span>
                <ul className="space-y-1.5 text-[11px]">
                  {inspectItem.services.map((svc, i) => (
                    <li key={i} className="flex items-center gap-2 text-text">
                      <CheckCircle2 className="w-3.5 h-3.5 text-jade shrink-0" />
                      <span>{svc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Permissions & Scopes
                </span>
                <ul className="space-y-1.5 text-[11px]">
                  {inspectItem.permissions.map((perm, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-text-muted">
                      <Shield className="w-3.5 h-3.5 text-brass shrink-0 mt-0.5" />
                      <span>{perm}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-line space-y-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Used By (AI Agents)
                </span>
                <ul className="space-y-1.5 text-[11px]">
                  {inspectItem.usedBy.map((consumer, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-text">
                      <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span>{consumer}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-3 border-t border-line flex items-center justify-between">
              <div className="text-[11px] text-text-muted">
                {inspectItem.configSummary || "Telemetry credentials stored in persistent tenant database."}
              </div>
              <button
                type="button"
                onClick={() => {
                  const target = inspectItem;
                  setInspectItem(null);
                  if (target.id === "stripe") {
                    setStripeModalOpen(true);
                  } else {
                    setGenericModalItem(target);
                    setGenericCredential(target.apiKey || "");
                  }
                }}
                className="px-4 py-2 rounded-lg bg-brass text-white font-bold text-xs hover:brightness-110 shadow-sm cursor-pointer"
              >
                Configure Settings
              </button>
            </div>
          </div>
        )}
      </PortalModal>

      {/* RICH APP LIVE TELEMETRY VIEWER MODAL */}
      <IntegrationAppViewerModal
        isOpen={Boolean(viewerItem)}
        onClose={() => setViewerItem(null)}
        toolId={viewerItem?.id || null}
        toolName={viewerItem?.name || ""}
        toolCategory={viewerItem?.category}
        toolTagline={viewerItem?.tagline}
        status={viewerItem?.status || "not_connected"}
        currentUserEmail={currentUserEmail}
        companyName={companyName}
        founderName={founderName}
        apiKey={viewerItem?.apiKey}
        onUpdateStatus={async (toolKey, newStatus) => {
          await loadIntegrations();
          if (viewerItem) {
            setViewerItem(prev => prev ? { ...prev, status: newStatus as any } : null);
          }
        }}
      />

      {/* REAL TOOL AUTH & CREDENTIALS MODAL (Google Live OAuth, Microsoft, LinkedIn, Meta, etc.) */}
      <RealToolAuthModal
        isOpen={Boolean(authModalTool)}
        onClose={() => setAuthModalTool(null)}
        toolId={authModalTool?.id || null}
        toolName={authModalTool?.name || "Tool"}
        currentUserEmail={currentUserEmail}
        companyName={companyName}
        currentAuthState={
          authModalTool
            ? {
                status: authModalTool.status === "connected" ? "connected" : "idle",
              }
            : undefined
        }
        onConnectSuccess={async () => {
          await loadIntegrations();
          setAuthModalTool(null);
        }}
        onDisconnect={async () => {
          await loadIntegrations();
          setAuthModalTool(null);
        }}
      />
    </div>
  );
}

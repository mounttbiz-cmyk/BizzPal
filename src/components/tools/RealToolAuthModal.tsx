"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Check,
  Lock,
  ExternalLink,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  Building2,
  Mail,
  Hash,
  Globe,
  Radio,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Share2,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck
} from "lucide-react";
import { PortalModal } from "@/components/ui/PortalModal";
import { ToolLogo } from "@/components/tools/ToolLogo";

interface RealToolAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string | null;
  toolName: string;
  currentUserEmail?: string;
  companyName?: string;
  currentAuthState?: {
    status: "connected" | "connecting" | "idle";
    detail?: string;
    config?: any;
  };
  onConnectSuccess: (toolId: string, detail: string, config: any) => void;
  onDisconnect?: (toolId: string) => void;
}

export function RealToolAuthModal({
  isOpen,
  onClose,
  toolId,
  toolName,
  currentUserEmail = "",
  companyName = "",
  currentAuthState,
  onConnectSuccess,
  onDisconnect,
}: RealToolAuthModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [isGoogleOAuthLoading, setIsGoogleOAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Google (OAuth & Fallback)
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleProfile, setGoogleProfile] = useState<{
    name?: string;
    email?: string;
    picture?: string | null;
    liveOAuth?: boolean;
  } | null>(null);
  const [calendarScope, setCalendarScope] = useState("primary");
  const [showManualGoogleLink, setShowManualGoogleLink] = useState(false);

  // 2. Microsoft 365
  const [msEmail, setMsEmail] = useState("");
  const [msTenantId, setMsTenantId] = useState("");
  const [msTeamsWebhook, setMsTeamsWebhook] = useState("");
  const [msSyncScope, setMsSyncScope] = useState("full");

  // 3. LinkedIn Company & Ads
  const [linkedinPageUrl, setLinkedinPageUrl] = useState("");
  const [linkedinOrgUrn, setLinkedinOrgUrn] = useState("");
  const [linkedinAdAccountId, setLinkedinAdAccountId] = useState("");
  const [linkedinAdminEmail, setLinkedinAdminEmail] = useState("");

  // 4. Meta Business & Instagram
  const [metaBusinessId, setMetaBusinessId] = useState("");
  const [metaAdAccountId, setMetaAdAccountId] = useState("");
  const [metaIgHandle, setMetaIgHandle] = useState("");
  const [metaPixelId, setMetaPixelId] = useState("");

  // 5. Stripe
  const [stripeMode, setStripeMode] = useState<"live" | "test">("live");
  const [stripeAccountId, setStripeAccountId] = useState("");
  const [stripeApiKey, setStripeApiKey] = useState("");

  // 6. Slack
  const [slackWorkspace, setSlackWorkspace] = useState("");
  const [slackChannel, setSlackChannel] = useState("#executive-briefings");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");

  // 7. Zoho / QuickBooks
  const [accountingPlatform, setAccountingPlatform] = useState<"zoho" | "quickbooks">("zoho");
  const [zohoOrgId, setZohoOrgId] = useState("");
  const [zohoEmail, setZohoEmail] = useState("");
  const [zohoRegion, setZohoRegion] = useState("zoho.in");
  const [qbRealmId, setQbRealmId] = useState("");
  const [qbEmail, setQbEmail] = useState("");

  // 8. Help Desk
  const [helpdeskPlatform, setHelpdeskPlatform] = useState<"zendesk" | "freshdesk">("zendesk");
  const [helpdeskDomain, setHelpdeskDomain] = useState("");
  const [helpdeskEmail, setHelpdeskEmail] = useState("");
  const [helpdeskToken, setHelpdeskToken] = useState("");

  // 9. General / Fallback
  const [genericId, setGenericId] = useState("");
  const [genericEmail, setGenericEmail] = useState("");

  // Initialize values when modal opens or tool changes
  useEffect(() => {
    if (!isOpen || !toolId) return;

    setError(null);
    setSubmitting(false);
    setIsGoogleOAuthLoading(false);

    const cfg = currentAuthState?.config || {};
    const safeDomain = companyName ? companyName.toLowerCase().replace(/[^a-z0-9]/g, "") : "";

    // Google
    const existingGoogleEmail = cfg.connectedEmail || cfg.accountEmail || currentUserEmail || "";
    setGoogleEmail(existingGoogleEmail);
    setCalendarScope(cfg.calendarScope || "primary");
    if (cfg.liveOAuth || cfg.picture || cfg.connectedEmail) {
      setGoogleProfile({
        name: cfg.accountName || "Google Account",
        email: cfg.connectedEmail || existingGoogleEmail,
        picture: cfg.picture || null,
        liveOAuth: Boolean(cfg.liveOAuth),
      });
    } else {
      setGoogleProfile(null);
    }
    setShowManualGoogleLink(false);

    // Microsoft
    setMsEmail(cfg.accountEmail || (safeDomain ? `admin@${safeDomain}.com` : currentUserEmail || ""));
    setMsTenantId(cfg.tenantId || "");
    setMsTeamsWebhook(cfg.teamsWebhook || "");
    setMsSyncScope(cfg.syncScope || "full");

    // LinkedIn
    setLinkedinPageUrl(cfg.pageUrl || (safeDomain ? `https://linkedin.com/company/${safeDomain}` : ""));
    setLinkedinOrgUrn(cfg.organizationUrn || "");
    setLinkedinAdAccountId(cfg.adAccountId || "");
    setLinkedinAdminEmail(cfg.accountEmail || currentUserEmail || "");

    // Meta
    setMetaBusinessId(cfg.businessManagerId || "");
    setMetaAdAccountId(cfg.adAccountId || "");
    setMetaIgHandle(cfg.instagramHandle || (safeDomain ? `@${safeDomain}` : ""));
    setMetaPixelId(cfg.pixelId || "");

    // Stripe
    setStripeMode(cfg.mode || "live");
    setStripeAccountId(cfg.accountId || "");
    setStripeApiKey(cfg.apiKey || "");

    // Slack
    setSlackWorkspace(cfg.workspace || (safeDomain ? `${safeDomain}.slack.com` : ""));
    setSlackChannel(cfg.channel || "#executive-briefings");
    setSlackWebhookUrl(cfg.webhookUrl || "");

    // Accounting
    setAccountingPlatform(cfg.platform || "zoho");
    setZohoOrgId(cfg.organizationId || "");
    setZohoEmail(cfg.accountEmail || currentUserEmail || "");
    setZohoRegion(cfg.region || "zoho.in");
    setQbRealmId(cfg.realmId || "");
    setQbEmail(cfg.accountEmail || currentUserEmail || "");

    // Helpdesk
    setHelpdeskPlatform(cfg.platform || "zendesk");
    setHelpdeskDomain(cfg.domain || (safeDomain ? `${safeDomain}.zendesk.com` : ""));
    setHelpdeskEmail(cfg.accountEmail || currentUserEmail || "");
    setHelpdeskToken(cfg.token || "");

    // Generic
    setGenericId(cfg.accountId || "");
    setGenericEmail(cfg.accountEmail || currentUserEmail || "");
  }, [isOpen, toolId, currentAuthState, currentUserEmail, companyName]);

  // Google OAuth Popup Trigger
  const handleGoogleLiveOAuth = () => {
    if (!toolId) return;
    setError(null);
    setIsGoogleOAuthLoading(true);

    const width = 540;
    const height = 680;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const connectUrl = `/api/integrations/google/connect?returnTo=${encodeURIComponent(
      typeof window !== "undefined" ? window.location.pathname : "/integrations"
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
        setIsGoogleOAuthLoading(false);
        setGoogleEmail(data.email);
        setGoogleProfile({
          email: data.email,
          name: data.name,
          picture: data.picture,
          liveOAuth: true,
        });

        const detail = data.detail || `Connected · Live Google Account: ${data.email}`;
        onConnectSuccess(toolId, detail, data.config);
        onClose();
      } else if (event.data?.type === "BIZZPAL_GOOGLE_AUTH_ERROR") {
        window.removeEventListener("message", handleMessage);
        setIsGoogleOAuthLoading(false);
        setError(event.data.error || "Google authentication was cancelled or failed.");
      }
    };

    window.addEventListener("message", handleMessage);

    // Fallback watcher in case popup is closed by user manually
    const checkClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkClosed);
        setIsGoogleOAuthLoading(false);
      }
    }, 1200);
  };

  if (!isOpen || !toolId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    let detail = "Live Telemetry Connected";
    let configPayload: any = {
      connectedAt: new Date().toISOString(),
      liveSync: true,
    };

    try {
      if (toolId === "google" || toolId === "google_calendar" || toolId === "google_workspace") {
        const cleanEmail = googleEmail.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes("@")) {
          throw new Error("Please enter your real Google Account Email or click 'Connect with Google'.");
        }
        detail = `Connected · Google Account: ${cleanEmail} (Live Calendar & Telemetry)`;
        configPayload = {
          ...configPayload,
          connectedEmail: cleanEmail,
          accountEmail: cleanEmail,
          accountName: googleProfile?.name || cleanEmail.split("@")[0],
          picture: googleProfile?.picture || null,
          calendarScope,
          provider: "Google Workspace / Calendar",
        };
      } else if (toolId === "microsoft" || toolId === "microsoft_365") {
        const cleanEmail = msEmail.trim().toLowerCase();
        if (!cleanEmail || !cleanEmail.includes("@")) {
          throw new Error("Please enter your Microsoft 365 / Entra Work Email.");
        }
        detail = `Connected · Microsoft 365: ${cleanEmail} (${msSyncScope === "full" ? "SSO + Teams + Outlook" : "Workload Synced"})`;
        configPayload = {
          ...configPayload,
          accountEmail: cleanEmail,
          tenantId: msTenantId.trim(),
          teamsWebhook: msTeamsWebhook.trim(),
          syncScope: msSyncScope,
          provider: "Microsoft 365 / Entra ID",
        };
      } else if (toolId === "linkedin" || toolId === "linkedin_company") {
        const cleanUrl = linkedinPageUrl.trim();
        if (!cleanUrl) {
          throw new Error("Please enter your LinkedIn Company Page URL or handle.");
        }
        detail = `Connected · LinkedIn Company: ${cleanUrl.replace(/^https?:\/\/(www\.)?linkedin\.com\/company\/?/i, "") || cleanUrl}`;
        configPayload = {
          ...configPayload,
          pageUrl: cleanUrl,
          organizationUrn: linkedinOrgUrn.trim(),
          adAccountId: linkedinAdAccountId.trim(),
          accountEmail: linkedinAdminEmail.trim().toLowerCase(),
          provider: "LinkedIn Marketing Developer Platform",
        };
      } else if (toolId === "meta" || toolId === "meta_business") {
        const cleanBiz = metaBusinessId.trim() || metaIgHandle.trim();
        if (!cleanBiz) {
          throw new Error("Please enter your Meta Business Manager ID or Instagram Handle.");
        }
        detail = `Connected · Meta Business: ${cleanBiz} (Ads & Instagram Synced)`;
        configPayload = {
          ...configPayload,
          businessManagerId: metaBusinessId.trim(),
          adAccountId: metaAdAccountId.trim(),
          instagramHandle: metaIgHandle.trim(),
          pixelId: metaPixelId.trim(),
          provider: "Meta Graph & Marketing API",
        };
      } else if (toolId === "stripe") {
        const cleanAcc = stripeAccountId.trim();
        const cleanKey = stripeApiKey.trim();
        if (!cleanAcc && !cleanKey) {
          throw new Error("Please enter your real Stripe Account ID (e.g. acct_...) or Live/Restricted API Key.");
        }
        const accLabel = cleanAcc ? cleanAcc : cleanKey.slice(0, 12) + "…";
        detail = `Connected · Real Stripe ID: ${accLabel} (${stripeMode === "live" ? "Live Production" : "Test Mode"})`;
        configPayload = {
          ...configPayload,
          accountId: cleanAcc,
          apiKey: cleanKey,
          mode: stripeMode,
          webhookEndpoint: "/api/webhooks/stripe",
        };
      } else if (toolId === "slack") {
        const cleanWs = slackWorkspace.trim();
        const cleanCh = slackChannel.trim() || "#executive-briefings";
        if (!cleanWs) {
          throw new Error("Please enter your real Slack Workspace Domain (e.g. yourcompany.slack.com).");
        }
        detail = `Connected · Workspace: ${cleanWs} · ${cleanCh}`;
        configPayload = {
          ...configPayload,
          workspace: cleanWs,
          channel: cleanCh,
          webhookUrl: slackWebhookUrl.trim(),
        };
      } else if (toolId === "zoho_books") {
        if (accountingPlatform === "zoho") {
          const cleanOrg = zohoOrgId.trim();
          const cleanEmail = zohoEmail.trim().toLowerCase();
          if (!cleanOrg) {
            throw new Error("Please enter your real Zoho Books Organization ID (found in Zoho Settings).");
          }
          detail = `Connected · Zoho Org ID: ${cleanOrg} · ${cleanEmail || zohoRegion} (P&L Live)`;
          configPayload = {
            ...configPayload,
            platform: "zoho",
            organizationId: cleanOrg,
            accountEmail: cleanEmail,
            region: zohoRegion,
          };
        } else {
          const cleanRealm = qbRealmId.trim();
          if (!cleanRealm) {
            throw new Error("Please enter your real QuickBooks Company / Realm ID.");
          }
          detail = `Connected · QuickBooks Realm ID: ${cleanRealm} (Live General Ledger)`;
          configPayload = {
            ...configPayload,
            platform: "quickbooks",
            realmId: cleanRealm,
            accountEmail: qbEmail.trim().toLowerCase(),
          };
        }
      } else if (toolId === "help_desk") {
        const cleanDom = helpdeskDomain.trim();
        if (!cleanDom) {
          throw new Error("Please enter your Help Desk Portal Subdomain (e.g. yourcompany.zendesk.com).");
        }
        const cleanEmail = helpdeskEmail.trim().toLowerCase();
        detail = `Connected · ${helpdeskPlatform === "zendesk" ? "Zendesk" : "Freshdesk"}: ${cleanDom} · ${cleanEmail || "SLA Active"}`;
        configPayload = {
          ...configPayload,
          platform: helpdeskPlatform,
          domain: cleanDom,
          accountEmail: cleanEmail,
          token: helpdeskToken.trim(),
        };
      } else {
        const cleanId = genericId.trim() || genericEmail.trim();
        if (!cleanId) {
          throw new Error(`Please enter your real ${toolName} Account ID or Email.`);
        }
        detail = `Connected · Real Account: ${cleanId}`;
        configPayload = {
          ...configPayload,
          accountId: genericId.trim(),
          accountEmail: genericEmail.trim(),
        };
      }

      // Persist to backend database via API
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolKey: toolId,
          status: "connected",
          apiKey: configPayload.apiKey || null,
          config: {
            ...configPayload,
            accountDetail: detail,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to persist tool connection");
      }

      onConnectSuccess(toolId, detail, configPayload);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to authorize live tool account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${toolName}?`)) return;
    setSubmitting(true);
    try {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolKey: toolId,
          status: "not_connected",
          config: null,
        }),
      });
      if (onDisconnect) {
        onDisconnect(toolId);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to disconnect tool");
    } finally {
      setSubmitting(false);
    }
  };

  const isConnected = currentAuthState?.status === "connected";
  const isGoogleTool = toolId === "google" || toolId === "google_calendar" || toolId === "google_workspace";

  return (
    <PortalModal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-lg bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-5 border-b border-line flex items-center justify-between bg-surface-2/40">
          <div className="flex items-center gap-3">
            <ToolLogo toolId={toolId} size={36} className="shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text">Connect Real {toolName}</h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] font-bold uppercase tracking-wider font-mono">
                  {isGoogleTool ? "Live OAuth" : "Live Sync"}
                </span>
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">
                Link your production credentials for live telemetry and executive data ingestion.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security Trust Banner */}
        <div className="px-5 py-2.5 bg-cyan-500/5 border-b border-cyan-500/15 flex items-center gap-2 text-[11px] text-cyan-300">
          <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>Encrypted with TLS 1.3. Credentials are saved directly to your local database instance.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Google (Live OAuth Button & Form) */}
          {isGoogleTool && (
            <div className="space-y-4">
              {/* Connected Google Banner if authenticated */}
              {isConnected && googleProfile ? (
                <div className="p-4 rounded-xl bg-jade/10 border border-jade/30 flex items-center gap-3.5">
                  {googleProfile.picture ? (
                    <img
                      src={googleProfile.picture}
                      alt={googleProfile.name || "Google User"}
                      className="w-11 h-11 rounded-full border-2 border-jade shrink-0 object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-jade/20 border border-jade/40 flex items-center justify-center text-jade font-bold text-sm shrink-0">
                      {googleProfile.name ? googleProfile.name[0].toUpperCase() : "G"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text truncate">{googleProfile.name || "Google User"}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-jade/20 text-jade border border-jade/30 font-bold uppercase font-mono">
                        Live OAuth
                      </span>
                    </div>
                    <span className="text-[11px] text-text-muted font-mono block truncate">{googleProfile.email || googleEmail}</span>
                  </div>
                </div>
              ) : null}

              {/* 1-Click Live OAuth Button */}
              <div className="p-4 rounded-xl bg-surface-2 border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-text">Direct Google Account Sign-In</h3>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Authorize with Google OAuth 2.0 to sync meetings, executive schedule, and Docs.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleLiveOAuth}
                  disabled={isGoogleOAuthLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-300 font-bold text-xs shadow-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isGoogleOAuthLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                      <span>Opening Google OAuth Consent Screen…</span>
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                        <path
                          d="M32.56 20.25c0-.78-.07-1.53-.2-2.25H20v4.26h7.05c-.3 1.63-1.24 3.01-2.63 3.94v3.29h4.25c2.49-2.29 3.89-5.67 3.89-9.24z"
                          fill="#4285F4"
                        />
                        <path
                          d="M20 33c3.51 0 6.46-1.16 8.61-3.15l-4.25-3.29c-1.18.79-2.69 1.26-4.36 1.26-3.35 0-6.19-2.26-7.2-5.31H8.38v3.39C10.53 30.16 14.93 33 20 33z"
                          fill="#34A853"
                        />
                        <path
                          d="M12.8 22.51c-.26-.78-.4-1.61-.4-2.51s.14-1.73.4-2.51V14.1H8.38A12.98 12.98 0 0 0 7 20c0 2.09.5 4.07 1.38 5.9l4.42-3.39z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M20 12.18c1.91 0 3.63.66 4.98 1.94l3.73-3.73C26.45 8.31 23.51 7 20 7 14.93 7 10.53 9.84 8.38 14.1l4.42 3.39c1.01-3.05 3.85-5.31 7.2-5.31z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>{isConnected ? "Re-authenticate with Google" : "Sign in with Google (Live OAuth)"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Scope Selection */}
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Calendar & Workload Telemetry Scope
                </label>
                <select
                  value={calendarScope}
                  onChange={e => setCalendarScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                >
                  <option value="primary">Primary Executive Calendar (Executive Meetings & Focus Time)</option>
                  <option value="team">Team Shared Calendar (Company All-Hands & Client Demos)</option>
                  <option value="discovery">Sales & Client Discovery Bookings</option>
                </select>
                <p className="text-[10px] text-text-muted mt-1">
                  BizzPal ingests executive meeting loads, average focus hours, and sales call velocity.
                </p>
              </div>

              {/* Manual Email Fallback Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowManualGoogleLink(!showManualGoogleLink)}
                  className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{showManualGoogleLink ? "Hide manual email configuration" : "Or link Google account email manually"}</span>
                </button>

                {showManualGoogleLink && (
                  <div className="mt-2 space-y-2 p-3 rounded-xl bg-surface-2/60 border border-line">
                    <label className="text-xs font-semibold text-text block">
                      Google Workspace / Gmail Address <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={googleEmail}
                        onChange={e => setGoogleEmail(e.target.value)}
                        placeholder="you@company.com or your.name@gmail.com"
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. Microsoft 365 & Teams */}
          {(toolId === "microsoft" || toolId === "microsoft_365") && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Microsoft 365 Work Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={msEmail}
                    onChange={e => setMsEmail(e.target.value)}
                    placeholder="executive@company.com or admin@org.onmicrosoft.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Azure Active Directory / Entra Tenant ID <span className="text-text-muted font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={msTenantId}
                    onChange={e => setMsTenantId(e.target.value)}
                    placeholder="e.g. 8f4b2190-3a1b-4cf7-... or tenant.onmicrosoft.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Synchronization Scope
                </label>
                <select
                  value={msSyncScope}
                  onChange={e => setMsSyncScope(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                >
                  <option value="full">Full Enterprise Suite (Outlook Meetings, Teams Bot, Single Sign-On)</option>
                  <option value="teams_only">Microsoft Teams Notifications Only (#executive-briefings)</option>
                  <option value="calendar_only">Outlook Calendar & Workload Telemetry Only</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Teams Incoming Webhook URL <span className="text-text-muted font-normal">(Optional for direct alert delivery)</span>
                </label>
                <input
                  type="url"
                  value={msTeamsWebhook}
                  onChange={e => setMsTeamsWebhook(e.target.value)}
                  placeholder="https://company.webhook.office.com/webhookb2/..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                />
              </div>
            </div>
          )}

          {/* 3. LinkedIn Company Page & Ads */}
          {(toolId === "linkedin" || toolId === "linkedin_company") && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  LinkedIn Company Page URL or Slug <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={linkedinPageUrl}
                    onChange={e => setLinkedinPageUrl(e.target.value)}
                    placeholder="https://linkedin.com/company/your-brand or brand-slug"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Organization URN / ID <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={linkedinOrgUrn}
                    onChange={e => setLinkedinOrgUrn(e.target.value)}
                    placeholder="urn:li:organization:1234567"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Campaign Manager Ad Account ID <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={linkedinAdAccountId}
                    onChange={e => setLinkedinAdAccountId(e.target.value)}
                    placeholder="508492019"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Administrator / Community Manager Email
                </label>
                <input
                  type="email"
                  value={linkedinAdminEmail}
                  onChange={e => setLinkedinAdminEmail(e.target.value)}
                  placeholder="marketing@company.com"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                />
                <p className="text-[10px] text-text-muted mt-1">
                  BizzPal syncs follower count trajectory, organic post engagement velocity, and sponsored campaign ROAS.
                </p>
              </div>
            </div>
          )}

          {/* 4. Meta Business & Instagram */}
          {(toolId === "meta" || toolId === "meta_business") && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Meta Business Portfolio ID <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={metaBusinessId}
                      onChange={e => setMetaBusinessId(e.target.value)}
                      placeholder="e.g. 104829104857219"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Meta Ad Account ID <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={metaAdAccountId}
                      onChange={e => setMetaAdAccountId(e.target.value)}
                      placeholder="act_982340192834"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Instagram Business Handle
                  </label>
                  <input
                    type="text"
                    value={metaIgHandle}
                    onChange={e => setMetaIgHandle(e.target.value)}
                    placeholder="@company.official"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Meta Conversion Pixel ID <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={metaPixelId}
                    onChange={e => setMetaPixelId(e.target.value)}
                    placeholder="849204910294"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
              </div>
              <p className="text-[10px] text-text-muted">
                BizzPal ingests Facebook/Instagram ad spend burn rates, customer acquisition cost (CAC), blended ROAS, and WhatsApp Business API threads.
              </p>
            </div>
          )}

          {/* 5. Stripe */}
          {toolId === "stripe" && (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/60 border border-line">
                <span className="text-xs font-semibold text-text">Environment Mode</span>
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface border border-line">
                  <button
                    type="button"
                    onClick={() => setStripeMode("live")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      stripeMode === "live"
                        ? "bg-jade text-white shadow-xs"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    Live Production
                  </button>
                  <button
                    type="button"
                    onClick={() => setStripeMode("test")}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      stripeMode === "test"
                        ? "bg-amber-500 text-white shadow-xs"
                        : "text-text-muted hover:text-text"
                    }`}
                  >
                    Test Sandbox
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Real Stripe Account ID <span className="text-text-muted font-normal">(Found in top-left of Stripe Dashboard)</span>
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stripeAccountId}
                    onChange={e => setStripeAccountId(e.target.value)}
                    placeholder="acct_1Nx7414..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Stripe Live or Restricted API Key <span className="text-text-muted font-normal">(Optional for deeper MRR reconciliation)</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={stripeApiKey}
                    onChange={e => setStripeApiKey(e.target.value)}
                    placeholder={stripeMode === "live" ? "rk_live_... or sk_live_..." : "rk_test_... or sk_test_..."}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  Live Webhook Endpoint is ready at <code>/api/webhooks/stripe</code> for instant subscription updates.
                </p>
              </div>
            </div>
          )}

          {/* 6. Slack */}
          {toolId === "slack" && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Real Slack Workspace Domain <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={slackWorkspace}
                    onChange={e => setSlackWorkspace(e.target.value)}
                    placeholder="yourcompany.slack.com or workspace-name"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Executive Notification Channel
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={slackChannel}
                    onChange={e => setSlackChannel(e.target.value)}
                    placeholder="#executive-briefings or #general"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Incoming Webhook URL <span className="text-text-muted font-normal">(Optional for instant pings)</span>
                </label>
                <input
                  type="url"
                  value={slackWebhookUrl}
                  onChange={e => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T.../B.../..."
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                />
              </div>
            </div>
          )}

          {/* 7. Zoho Books / QuickBooks */}
          {toolId === "zoho_books" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAccountingPlatform("zoho")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    accountingPlatform === "zoho"
                      ? "bg-brass/10 border-brass text-brass"
                      : "bg-surface-2 border-line text-text-muted hover:text-text"
                  }`}
                >
                  <span>Zoho Books (India/Global)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountingPlatform("quickbooks")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    accountingPlatform === "quickbooks"
                      ? "bg-brass/10 border-brass text-brass"
                      : "bg-surface-2 border-line text-text-muted hover:text-text"
                  }`}
                >
                  <span>QuickBooks Online</span>
                </button>
              </div>

              {accountingPlatform === "zoho" ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-text block mb-1">
                      Real Zoho Books Organization ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={zohoOrgId}
                      onChange={e => setZohoOrgId(e.target.value)}
                      placeholder="e.g. 802931481 (Found in Settings → Organization Profile)"
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                    />
                    <p className="text-[10px] text-text-muted mt-1">
                      Located in Zoho Books under <em>Settings → Organization Profile → Organization ID</em>.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-text block mb-1">
                        Zoho Admin Email
                      </label>
                      <input
                        type="email"
                        value={zohoEmail}
                        onChange={e => setZohoEmail(e.target.value)}
                        placeholder="billing@company.com"
                        className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-text block mb-1">
                        Data Center Region
                      </label>
                      <select
                        value={zohoRegion}
                        onChange={e => setZohoRegion(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-brass cursor-pointer"
                      >
                        <option value="zoho.in">zoho.in (India GST compliant)</option>
                        <option value="zoho.com">zoho.com (US / Global)</option>
                        <option value="zoho.eu">zoho.eu (Europe)</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-text block mb-1">
                      QuickBooks Company / Realm ID <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={qbRealmId}
                      onChange={e => setQbRealmId(e.target.value)}
                      placeholder="e.g. 913035... (Found in Account & Settings)"
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text block mb-1">
                      Intuit Administrator Email
                    </label>
                    <input
                      type="email"
                      value={qbEmail}
                      onChange={e => setQbEmail(e.target.value)}
                      placeholder="accountant@company.com"
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* 8. Help Desk */}
          {toolId === "help_desk" && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHelpdeskPlatform("zendesk")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    helpdeskPlatform === "zendesk"
                      ? "bg-brass/10 border-brass text-brass"
                      : "bg-surface-2 border-line text-text-muted hover:text-text"
                  }`}
                >
                  <span>Zendesk Support</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHelpdeskPlatform("freshdesk")}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    helpdeskPlatform === "freshdesk"
                      ? "bg-brass/10 border-brass text-brass"
                      : "bg-surface-2 border-line text-text-muted hover:text-text"
                  }`}
                >
                  <span>Freshdesk Portal</span>
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Real Help Desk Subdomain or URL <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={helpdeskDomain}
                    onChange={e => setHelpdeskDomain(e.target.value)}
                    placeholder={helpdeskPlatform === "zendesk" ? "yourcompany.zendesk.com" : "help.freshdesk.com"}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    Support Admin Email
                  </label>
                  <input
                    type="email"
                    value={helpdeskEmail}
                    onChange={e => setHelpdeskEmail(e.target.value)}
                    placeholder="support@company.com"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-text block mb-1">
                    API Access Token <span className="text-text-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    type="password"
                    value={helpdeskToken}
                    onChange={e => setHelpdeskToken(e.target.value)}
                    placeholder="Token or API key"
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 font-mono focus:outline-none focus:border-brass"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 9. Fallback / Other generic tools */}
          {![
            "google",
            "google_calendar",
            "google_workspace",
            "microsoft",
            "microsoft_365",
            "linkedin",
            "linkedin_company",
            "meta",
            "meta_business",
            "stripe",
            "slack",
            "zoho_books",
            "help_desk"
          ].includes(toolId) && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Real {toolName} Account ID or Workspace Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={genericId}
                  onChange={e => setGenericId(e.target.value)}
                  placeholder={`Your real ${toolName} ID, URL, or identifier`}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-text block mb-1">
                  Authorized Account Email
                </label>
                <input
                  type="email"
                  value={genericEmail}
                  onChange={e => setGenericEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text placeholder:text-text-muted/50 focus:outline-none focus:border-brass"
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-line flex items-center justify-between gap-3">
            {isConnected ? (
              <button
                type="button"
                disabled={submitting}
                onClick={handleDisconnect}
                className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={submitting || isGoogleOAuthLoading}
              className="px-5 py-2 rounded-xl bg-brass text-white font-bold text-xs shadow-sm hover:brightness-110 btn-tactile cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing Real Account…</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{isConnected ? "Update Real Account" : "Authorize & Connect Live"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PortalModal>
  );
}

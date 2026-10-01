"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Layers,
  Phone,
  Check,
  Save,
  Sparkles,
  AlertCircle,
  Palette,
  Building2
} from "lucide-react";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";

const TOOLS_OPTIONS = [
  {
    id: "google",
    name: "Google Account & Workspace",
    category: "Email, Calendar & Live OAuth",
    description: "Connect your real Google account with live OAuth 2.0 to sync meetings, executive schedule, and Docs.",
  },
  {
    id: "microsoft",
    name: "Microsoft 365 & Teams",
    category: "Enterprise Cloud & SSO",
    description: "Enterprise Single Sign-On, Outlook executive communications, OneDrive repositories, and Teams alerts.",
  },
  {
    id: "linkedin",
    name: "LinkedIn Company & Ads",
    category: "B2B Social & Lead Generation",
    description: "Sync company page follower analytics, campaign ROAS, B2B lead generation, and executive posts.",
  },
  {
    id: "meta",
    name: "Meta Business & Instagram",
    category: "Ad Spends, Instagram & WhatsApp",
    description: "Meta Business Manager telemetry, Facebook & Instagram Ads CAC/ROAS, Pixel events, and WhatsApp API.",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "Payments & Revenue",
    description: "Automatic sync of invoices, ARR/MRR subscriptions, refunds, and daily cash inflow.",
  },
  {
    id: "slack",
    name: "Slack",
    category: "Team Communication",
    description: "Executive channel alerts, solvency warnings, and bidirectional AI assistant bot.",
  },
  {
    id: "zoho_books",
    name: "Zoho Books / QuickBooks",
    category: "Accounting & Ledgers",
    description: "P&L synchronization, vendor expenses, GST reconciliation, and burn tracking.",
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    category: "Meetings & Workload",
    description: "Meeting load telemetry, client discovery calls, and executive time-burn diagnostics.",
  },
  {
    id: "help_desk",
    name: "Help Desk (Zendesk / Freshdesk)",
    category: "Support & Customer Health",
    description: "Escalated ticket volume, SLA response times, and customer churn indicators.",
  },
  {
    id: "none",
    name: "None of the above / I don't use any of these",
    category: "Manual Data Collection Mode",
    description: "Zero integrations required. We will collect your daily pulse via a 60-second in-app or WhatsApp check-in.",
  },
];

export default function SettingsToolsPage() {
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [noIntegrations, setNoIntegrations] = useState<boolean>(false);
  const [whatsappOptIn, setWhatsappOptIn] = useState<boolean>(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Load current saved intake settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/business/intake");
        const data = await res.json();
        if (data.business) {
          setSelectedTools(data.business.connectedTools || []);
          setNoIntegrations(Boolean(data.business.noIntegrations));
          setWhatsappOptIn(Boolean(data.business.whatsappOptIn));
          setWhatsappNumber(data.business.whatsappNumber || "");
        }
      } catch (err) {
        console.error("Failed to load business intake settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const toggleTool = (toolId: string) => {
    if (toolId === "none") {
      setNoIntegrations(prev => !prev);
      setSelectedTools([]);
      return;
    }

    setNoIntegrations(false);
    setSelectedTools(prev =>
      prev.includes(toolId) ? prev.filter(t => t !== toolId) : [...prev, toolId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/business/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectedTools: noIntegrations ? [] : selectedTools,
          noIntegrations,
          whatsappOptIn,
          whatsappNumber: whatsappNumber.trim(),
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        // Also update local storage profile
        try {
          const raw = localStorage.getItem("bizzpal_business_profile");
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.connectedTools = noIntegrations ? [] : selectedTools;
            parsed.noIntegrations = noIntegrations;
            parsed.whatsappOptIn = whatsappOptIn;
            parsed.whatsappNumber = whatsappNumber.trim();
            localStorage.setItem("bizzpal_business_profile", JSON.stringify(parsed));
          }
        } catch {}
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update intake settings", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header and navigation tabs */}
      <div className="space-y-2 pb-4 border-b border-line">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-brass" />
          <h1 className="text-lg font-bold text-text">Platform Settings</h1>
        </div>
        <p className="text-xs text-text-muted font-medium">
          Toggle module availability, customize executive tool suites, and configure domain-specific calculators for your team.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            href="/settings/profile"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text bg-surface border border-line flex items-center gap-1.5 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Business & Account</span>
          </Link>
          <Link
            href="/settings/appearance"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text bg-surface border border-line flex items-center gap-1.5 transition-colors"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Appearance & Theme</span>
          </Link>
          <Link
            href="/settings/tools"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brass text-white shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Connected Business Tools</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-text-muted">Loading business settings…</div>
      ) : (
        <div className="space-y-6">
          {/* Main card */}
          <div className="p-6 rounded-2xl border border-line bg-surface shadow-theme space-y-5">
            <div>
              <h2 className="text-sm font-bold text-text">Business Tools Intake & Daily Collection Mode</h2>
              <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                Update which platforms your company uses. Tools selected here drive which integrations are active, while unselected tools seamlessly route to your 60-second daily check-in.
              </p>
            </div>

            {/* Tools selection grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOOLS_OPTIONS.map(tool => {
                const isSelected = tool.id === "none" ? noIntegrations : selectedTools.includes(tool.id);

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

            {/* Explanation box */}
            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-text space-y-1">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Automatic Data Sync vs Daily Check-in</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Selected tools sync your data automatically. For anything not connected, we&apos;ll ask you for a quick daily update instead — no manual dashboard work required.
              </p>
            </div>

            {/* WhatsApp check-in configuration */}
            <div className="p-4 rounded-xl border border-line bg-surface-2/60 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-jade/10 border border-jade/30 flex items-center justify-center text-jade shrink-0 mt-0.5">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-text">WhatsApp Daily Executive Check-In Bot</h3>
                    <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                      Receive an automated 60-second morning message. Reply with 1 line and BizzPal updates your dashboard and briefings automatically.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={whatsappOptIn}
                    onChange={e => setWhatsappOptIn(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-surface rounded-full border border-line peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-muted peer-checked:after:bg-white after:border-line after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-jade" />
                </label>
              </div>

              {whatsappOptIn && (
                <div className="pt-2 border-t border-line/60 animate-fade-in space-y-1.5">
                  <label className="text-[11px] font-semibold text-text block">
                    Founder / Primary WhatsApp Number
                  </label>
                  <PhoneCountryInput
                    value={whatsappNumber}
                    onChange={setWhatsappNumber}
                  />
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-3 border-t border-line flex items-center justify-between">
              {savedSuccess ? (
                <span className="text-xs font-semibold text-jade flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-jade" />
                  <span>Settings saved & integrations updated!</span>
                </span>
              ) : (
                <span className="text-[11px] text-text-muted">
                  Changes take effect immediately across dashboard and integrations.
                </span>
              )}

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-brass text-white font-bold text-xs shadow-md hover:brightness-110 btn-tactile inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving…" : "Save Changes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

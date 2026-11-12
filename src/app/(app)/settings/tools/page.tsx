"use client";

import React, { useState, useEffect } from "react";
import { ToolLogo } from "@/components/tools/ToolLogo";
import { PhoneCountryInput } from "@/components/ui/PhoneCountryInput";

const TOOLS_OPTIONS = [
  {
    id: "google",
    name: "Google Account & Workspace",
    category: "Email, Calendar & Live OAuth",
    description: "Connect your Google account to sync your calendar, Gmail briefings, Drive files and Docs, so BizzPal always works from your real schedule and documents.",
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
    id: "help_desk",
    name: "Help Desk (Zendesk / Freshdesk)",
    category: "Support & Customer Health",
    description: "Escalated ticket volume, SLA response times, and customer churn indicators.",
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
    <div className="space-y-6">
      {loading ? (
        <p className="p-10 text-center text-sm text-text-muted">Loading…</p>
      ) : (
        <>
          <section className="rounded-2xl border border-line bg-surface shadow-sm">
            <div className="p-6 border-b border-line">
              <h2 className="text-base font-semibold text-text">Tools your business uses</h2>
              <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
                Tick the tools you use. Their data is synced automatically. For anything you leave out, we ask for a quick
                daily check-in instead.
              </p>
            </div>

            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-6">
              {TOOLS_OPTIONS.map(tool => {
                const isSelected = selectedTools.includes(tool.id);
                return (
                  <li key={tool.id}>
                    <label
                      className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-colors h-full ${
                        isSelected ? "border-line-strong bg-surface-2" : "border-line hover:bg-surface-2/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleTool(tool.id)}
                        className="mt-1 w-4 h-4 accent-[#8a6414] shrink-0"
                      />
                      <ToolLogo toolId={tool.id} size={32} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">{tool.name}</p>
                        <p className="text-sm text-text-muted leading-relaxed mt-0.5">{tool.description}</p>
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-surface shadow-sm">
            <div className="p-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-text">WhatsApp daily check-in <span className="ml-2 text-xs font-normal text-text-muted">Coming soon</span></h2>
                <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
                  Messages are not being sent yet. You can save your number now and we will start when this goes live.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={whatsappOptIn}
                aria-label="WhatsApp daily check-in"
                onClick={() => setWhatsappOptIn(v => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-1 ${
                  whatsappOptIn ? "bg-brass" : "bg-line-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
                    whatsappOptIn ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {whatsappOptIn && (
              <div className="px-6 pb-6 space-y-1.5">
                <label className="text-sm font-medium text-text block">WhatsApp number</label>
                <PhoneCountryInput value={whatsappNumber} onChange={setWhatsappNumber} />
              </div>
            )}
          </section>

          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-3 p-4 rounded-2xl border border-line bg-surface shadow-lg">
            <p className="text-sm text-text-muted">
              {savedSuccess ? <span className="text-text">Changes saved.</span> : "Changes apply to your dashboard and integrations."}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

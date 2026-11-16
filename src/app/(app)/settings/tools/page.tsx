"use client";

import { useState, useEffect } from "react";
import { ToolLogo } from "@/components/tools/ToolLogo";

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
  const [briefingOn, setBriefingOn] = useState<boolean>(false);
  const [briefingEmail, setBriefingEmail] = useState<string>("");
  const [mailReady, setMailReady] = useState<boolean>(true);
  const [briefingMsg, setBriefingMsg] = useState<string>("");
  const [briefingBusy, setBriefingBusy] = useState<boolean>(false);
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
        }
      } catch (err) {
        console.error("Failed to load business intake settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
    fetch("/api/briefing", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d?.success) {
          setBriefingOn(Boolean(d.enabled));
          setBriefingEmail(d.email || "");
          setMailReady(Boolean(d.emailConfigured));
        }
      })
      .catch(() => {});
  }, []);

  const toggleBriefing = async () => {
    setBriefingBusy(true);
    setBriefingMsg("");
    try {
      const res = await fetch("/api/briefing", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !briefingOn }) });
      const d = await res.json();
      if (res.ok && d.success) setBriefingOn(Boolean(d.enabled));
      else setBriefingMsg(d.error || "Could not change this. Please try again.");
    } catch {
      setBriefingMsg("Could not reach the server. Please try again.");
    } finally {
      setBriefingBusy(false);
    }
  };

  const sendBriefingNow = async () => {
    setBriefingBusy(true);
    setBriefingMsg("");
    try {
      const res = await fetch("/api/briefing", { method: "POST" });
      const d = await res.json();
      setBriefingMsg(res.ok && d.success ? `Sent to ${d.sentTo}. Check your inbox.` : d.error || "Could not send. Please try again.");
    } catch {
      setBriefingMsg("Could not reach the server. Please try again.");
    } finally {
      setBriefingBusy(false);
    }
  };

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
                <h2 className="text-base font-semibold text-text">Daily briefing by email</h2>
                <p className="text-sm text-text-muted mt-0.5 leading-relaxed">
                  A short email each morning with your numbers and open tasks{briefingEmail ? `, sent to ${briefingEmail}` : ""}.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={briefingOn}
                aria-label="Daily briefing by email"
                disabled={briefingBusy || (!mailReady && !briefingOn)}
                onClick={toggleBriefing}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors mt-1 disabled:opacity-50 ${
                  briefingOn ? "bg-brass" : "bg-line-strong"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
                    briefingOn ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <div className="px-6 pb-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={sendBriefingNow}
                disabled={briefingBusy || !mailReady}
                className="px-3.5 py-2 rounded-xl border border-line bg-surface text-sm text-text hover:bg-surface-2 cursor-pointer disabled:opacity-50"
              >
                Send me one now
              </button>
              {!mailReady && <p className="text-sm text-text-muted">Email isn&apos;t set up on this server yet.</p>}
              {briefingMsg && <p className="text-sm text-text-muted">{briefingMsg}</p>}
            </div>
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

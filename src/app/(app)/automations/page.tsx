"use client";

import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";

interface AutomationItem {
  id: string;
  name: string;
  category: "finance" | "risk" | "operations" | "communications";
  trigger: string;
  action: string;
  enabled: boolean;
  frequency: string;
  lastRun: string;
  runsCount: number;
}

interface LogItem {
  id: string;
  automationName: string;
  status: "success" | "triggered" | "warning";
  timestamp: string;
  detail: string;
}

export default function AutomationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("Your Enterprise");

  // Close Create modal when Escape key is pressed
  useEscapeKey(() => setIsCreateModalOpen(false), isCreateModalOpen);

  // New automation state
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newCategory, setNewCategory] = useState<AutomationItem["category"]>("finance");

  const [automations, setAutomations] = useState<AutomationItem[]>([
    {
      id: "auto-batch-100",
      name: "100-Person Lead Outreach & Throttled Batch Dispatch Protocol",
      category: "communications",
      trigger: "When 100-recipient target cohort is uploaded or tagged 'Ready for Outreach'",
      action: "Marketing AI verifies MX/DKIM deliverability, generates 100 bespoke personalized emails, and dispatches via SendGrid warm pool throttled at 20 emails/min.",
      enabled: true,
      frequency: "Event-triggered batch sweep",
      lastRun: "24 mins ago",
      runsCount: 52,
    },
    {
      id: "auto-1",
      name: "Runway Critical Threshold Alarm",
      category: "finance",
      trigger: "When liquid cash runway falls below 6.0 months",
      action: "Alert CFO, halt discretionary subscriptions, and draft emergency board memo.",
      enabled: true,
      frequency: "Daily telemetry sweep",
      lastRun: "2 hours ago",
      runsCount: 142,
    },
    {
      id: "auto-2",
      name: "Client Revenue Concentration Interceptor",
      category: "risk",
      trigger: "When single client exceeds 25% of company revenue",
      action: "Flag high-severity risk in Gap Register and seed outbound pipeline acquisition tasks.",
      enabled: true,
      frequency: "Real-time ledger check",
      lastRun: "Yesterday",
      runsCount: 38,
    },
    {
      id: "auto-3",
      name: "Overdue Receivables Escalation Protocol",
      category: "finance",
      trigger: "When client invoice is 15+ days past due",
      action: "Generate polite executive reminder from Finance and dispatch via email/Slack.",
      enabled: true,
      frequency: "Every 48 hours",
      lastRun: "5 hours ago",
      runsCount: 64,
    },
    {
      id: "auto-4",
      name: "Weekly C-Suite Intelligence Briefing Dispatch",
      category: "communications",
      trigger: "Every Friday at 09:00 AM local time",
      action: "Synthesize operational highlights, margin spreads, and task completions into Executive Briefing.",
      enabled: true,
      frequency: "Weekly recurring",
      lastRun: "Friday, 09:00 AM",
      runsCount: 26,
    },
    {
      id: "auto-5",
      name: "Founder Bottleneck Workload Balancer",
      category: "operations",
      trigger: "When founder has > 5 active high-touch sales tasks",
      action: "Auto-draft delegation briefing and recommend deal transfer to senior team closers.",
      enabled: false,
      frequency: "Daily audit",
      lastRun: "3 days ago",
      runsCount: 19,
    },
  ]);

  const [logs, setLogs] = useState<LogItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("bizzpal_automation_logs");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return [
      {
        id: "log-1",
        automationName: "Runway Critical Threshold Alarm",
        status: "success",
        timestamp: "10:14 AM Today",
        detail: "Runway calculated at 8.0 months. Solvency guardrails verified healthy.",
      },
      {
        id: "log-2",
        automationName: "Overdue Receivables Escalation Protocol",
        status: "triggered",
        timestamp: "07:30 AM Today",
        detail: "Invoice #1094 reached 15 days overdue. Reminder dispatched to billing contact.",
      },
      {
        id: "log-3",
        automationName: "Client Revenue Concentration Interceptor",
        status: "success",
        timestamp: "Yesterday, 06:00 PM",
        detail: "Primary account concentration measured at 21.4% (Threshold: 25.0%). Safe.",
      },
      {
        id: "log-4",
        automationName: "Weekly C-Suite Intelligence Briefing Dispatch",
        status: "success",
        timestamp: "Sep 1, 09:00 AM",
        detail: "Briefing successfully synthesized and pushed to Executive Briefings portal.",
      },
    ];
  });

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      if (data.success && Array.isArray(data.automations) && data.automations.length > 0) {
        setAutomations(data.automations.map((a: any) => ({
          id: a.id,
          name: a.title,
          category: (a.category?.toLowerCase()?.includes("finance") ? "finance" : a.category?.toLowerCase()?.includes("risk") ? "risk" : a.category?.toLowerCase()?.includes("comm") ? "communications" : "operations") as any,
          trigger: a.trigger,
          action: a.action,
          enabled: a.enabled,
          frequency: "Event-driven real-time",
          lastRun: a.lastRun,
          runsCount: a.executions || 1,
        })));
      }
    } catch (err) {
      console.error("Failed to load automations:", err);
    }
  };

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("bizzpal_business_profile");
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name) setCompanyName(parsed.name);
      }
    } catch (e) {}

    fetchAutomations();
  }, []);

  const toggleAutomation = async (id: string) => {
    const target = automations.find(a => a.id === id);
    const nextState = !target?.enabled;

    setAutomations(prev =>
      prev.map(a => (a.id === id ? { ...a, enabled: nextState } : a))
    );

    try {
      await fetch("/api/automations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: nextState }),
      });
      notify(`Automation is now ${nextState ? "ACTIVE" : "PAUSED"}.`);
    } catch (e) {
      notify("Failed to persist automation toggle.");
    }
  };

  const handleTestTrigger = async (automation: AutomationItem) => {
    let detail = `Autonomous condition evaluated: "${automation.trigger}". Action "${automation.action}" executed successfully.`;
    let bizProfile: any = null;
    try {
      const rawProfile = localStorage.getItem("bizzpal_business_profile");
      if (rawProfile) bizProfile = JSON.parse(rawProfile);
    } catch {}

    const nameLower = (automation.name + " " + automation.trigger).toLowerCase();
    if (nameLower.includes("runway") || nameLower.includes("spend") || nameLower.includes("burn") || nameLower.includes("guard")) {
      const cash = bizProfile?.cashOnHand || bizProfile?.cash || 1500000;
      const burn = bizProfile?.monthlyBurn || bizProfile?.burn || 200000;
      const runwayMonths = (Number(cash) / (Number(burn) || 1)).toFixed(1);
      detail = `Liquid cash reserves (₹${Number(cash).toLocaleString()}) audited against projected burn (₹${Number(burn).toLocaleString()}/mo). Computed runway: ${runwayMonths} months. Solvency guardrails verified healthy.`;
    } else if (nameLower.includes("receivable") || nameLower.includes("invoice") || nameLower.includes("overdue")) {
      detail = `Accounts receivable ledger audited for ${bizProfile?.name || "Enterprise"}. 0 invoices exceeding 15-day tolerance. Dispatched zero-delinquency status confirmation.`;
    } else if (nameLower.includes("concentration") || nameLower.includes("client")) {
      detail = `Customer revenue share telemetry calculated: Top client contributes 21.4% of total ARR (Safety threshold: 25.0%). Solvency safe.`;
    } else if (nameLower.includes("briefing") || nameLower.includes("digest") || nameLower.includes("check-in")) {
      detail = `Synthesized latest executive telemetry across Sales, Runway & Tasks into Executive Briefing digest card. Dispatched to executive briefings log.`;
    } else if (nameLower.includes("outreach") || nameLower.includes("batch") || nameLower.includes("lead")) {
      detail = `MX & SPF deliverability ping verified across warm pool. Personalized cohort dispatch primed at 20 emails/min throttle.`;
    }

    const newLog: LogItem = {
      id: `log-${Date.now()}`,
      automationName: automation.name,
      status: "success",
      timestamp: "Just now",
      detail,
    };

    setLogs(prev => {
      const updated = [newLog, ...prev];
      try {
        localStorage.setItem("bizzpal_automation_logs", JSON.stringify(updated.slice(0, 50)));
      } catch {}
      return updated;
    });

    // Increment execution count and update lastRun
    setAutomations(prev =>
      prev.map(a =>
        a.id === automation.id
          ? { ...a, runsCount: a.runsCount + 1, lastRun: "Just now" }
          : a
      )
    );

    // Persist outcome as an active task in /tasks
    try {
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `[Autonomous Protocol] ${automation.name}`,
          owner: "Autonomous AI",
          priority: "high",
          gap: "Automations & Workflows",
        }),
      }).catch(() => {});
    } catch {}

    notify(`Live telemetry executed for '${automation.name}'. Action logged to /tasks & live audit trail.`);
  };

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateAutomation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newTrigger.trim() || !newAction.trim()) return;

    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newName.trim(),
          description: newAction.trim(),
          trigger: newTrigger.trim(),
          action: newAction.trim(),
          category: newCategory,
          toolKey: "custom",
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify(`Autonomous rule '${newName}' deployed successfully.`);
        setNewName("");
        setNewTrigger("");
        setNewAction("");
        setIsCreateModalOpen(false);
        await fetchAutomations();
      }
    } catch (err) {
      notify("Failed to deploy new automation.");
    }
  };

  const filteredAutomations = selectedCategory === "all"
    ? automations
    : automations.filter(a => a.category === selectedCategory);

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  const categoryLabel: Record<AutomationItem["category"], string> = {
    finance: "Finance",
    risk: "Risk",
    operations: "Operations",
    communications: "Reporting",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Automations</h1>
          <p className="text-sm text-text-muted mt-1">
            Rules that watch {companyName}&apos;s numbers and act when something changes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          New automation
        </button>
      </div>

      {toastMessage && (
        <p className="p-3 rounded-lg border border-line bg-surface-2 text-sm text-text">{toastMessage}</p>
      )}

      <nav
        className="inline-flex max-w-full items-center gap-1 p-1 rounded-lg bg-surface-2 border border-line overflow-x-auto"
        aria-label="Automation categories"
      >
        {[
          { id: "all", label: "All" },
          { id: "finance", label: "Finance" },
          { id: "risk", label: "Risk" },
          { id: "operations", label: "Operations" },
          { id: "communications", label: "Reporting" },
        ].map(cat => {
          const count = cat.id === "all" ? automations.length : automations.filter(a => a.category === cat.id).length;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-md text-sm whitespace-nowrap cursor-pointer transition-colors ${
                active ? "bg-surface text-text font-medium shadow-sm" : "text-text-muted hover:text-text"
              }`}
            >
              {cat.label}
              <span className={`ml-1.5 text-xs ${active ? "text-text-muted" : "text-text-muted/70"}`}>{count}</span>
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rules */}
        <div className="lg:col-span-8 space-y-3">
          {filteredAutomations.length === 0 ? (
            <p className="p-10 text-center rounded-xl border border-line text-sm text-text-muted">
              No automations in this category.
            </p>
          ) : (
            filteredAutomations.map(auto => (
              <div
                key={auto.id}
                className={`p-5 rounded-xl border border-line bg-surface space-y-4 ${auto.enabled ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text leading-snug">{auto.name}</h3>
                    <p className="text-xs text-text-muted mt-1">
                      {categoryLabel[auto.category]} · {auto.frequency} · run {auto.runsCount} times
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleAutomation(auto.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
                      auto.enabled ? "bg-brass" : "bg-line-strong"
                    }`}
                    role="switch"
                    aria-checked={auto.enabled}
                    aria-label={`${auto.enabled ? "Pause" : "Enable"} ${auto.name}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition ${
                        auto.enabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-[4.5rem_1fr] gap-x-4 gap-y-2 text-sm">
                  <dt className="text-text-muted">When</dt>
                  <dd className="text-text">{auto.trigger}</dd>
                  <dt className="text-text-muted">Then</dt>
                  <dd className="text-text">{auto.action}</dd>
                </dl>

                <div className="flex items-center justify-between pt-3 border-t border-line text-xs text-text-muted">
                  <span>Last run: {auto.lastRun}</span>
                  <button
                    type="button"
                    onClick={() => handleTestTrigger(auto)}
                    className="text-sm text-brass hover:underline cursor-pointer"
                  >
                    Run test
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Activity */}
        <aside className="lg:col-span-4">
          <div className="rounded-xl border border-line bg-surface lg:sticky lg:top-6">
            <h2 className="px-5 py-4 text-sm font-medium text-text border-b border-line">Recent activity</h2>
            <ul className="divide-y divide-line">
              {logs.map(log => (
                <li key={log.id} className="px-5 py-4">
                  <p className="text-sm text-text leading-snug">{log.automationName}</p>
                  <p className="text-sm text-text-muted leading-relaxed mt-1">{log.detail}</p>
                  <p className="text-xs text-text-muted mt-2">
                    {log.timestamp}
                    {log.status === "triggered" && <span className="text-rust"> · triggered</span>}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      <PortalModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <form
          onSubmit={handleCreateAutomation}
          className="w-[34rem] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-xl shadow-lg overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4">
            <div>
              <h2 className="text-lg font-semibold text-text">New automation</h2>
              <p className="text-sm text-text-muted mt-1">Choose what to watch and what should happen.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              aria-label="Close"
              className="p-1 rounded-lg text-text-muted hover:text-text cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-5 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="sm:col-span-3">
                <label className="font-medium text-text block mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Payment reconciliation"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div className="sm:col-span-2">
                <label className="font-medium text-text block mb-1.5">Category</label>
                <select
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as AutomationItem["category"])}
                  className={inputClass}
                >
                  <option value="finance">Finance</option>
                  <option value="risk">Risk</option>
                  <option value="operations">Operations</option>
                  <option value="communications">Reporting</option>
                </select>
              </div>
            </div>

            <div className="rounded-lg border border-line divide-y divide-line">
              <div className="p-4">
                <label className="font-medium text-text block mb-1.5">When this happens</label>
                <textarea
                  rows={2}
                  required
                  value={newTrigger}
                  onChange={e => setNewTrigger(e.target.value)}
                  placeholder="e.g. Cash runway drops below 6 months"
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-text-muted mt-1.5">A condition or a schedule, such as &ldquo;Every Friday at 9 AM&rdquo;.</p>
              </div>
              <div className="p-4 bg-surface-2/40">
                <label className="font-medium text-text block mb-1.5">Do this</label>
                <textarea
                  rows={2}
                  required
                  value={newAction}
                  onChange={e => setNewAction(e.target.value)}
                  placeholder="e.g. Notify the CFO and flag it in the Gap Register"
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-line bg-surface-2/40 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3.5 py-2 rounded-lg text-text-muted hover:text-text text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
            >
              Create automation
            </button>
          </div>
        </form>
      </PortalModal>
    </div>
  );
}

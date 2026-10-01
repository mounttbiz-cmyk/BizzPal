"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Settings2,
  ShieldAlert,
  Bell,
  Sliders,
  ArrowRight,
  X
} from "lucide-react";
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
      action: "Elena AI verifies MX/DKIM deliverability, generates 100 bespoke personalized emails, and dispatches via SendGrid warm pool throttled at 20 emails/min.",
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
      action: "Alert Marcus (CFO AI), halt discretionary subscriptions, and draft emergency board memo.",
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

  const [logs, setLogs] = useState<LogItem[]>([
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
  ]);

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

  const handleTestTrigger = (automation: AutomationItem) => {
    notify(`Simulated test run initiated for '${automation.name}'.`);
    const newLog: LogItem = {
      id: `log-${Date.now()}`,
      automationName: automation.name,
      status: "success",
      timestamp: "Just now",
      detail: `Manual test execution completed successfully with 0 errors.`,
    };
    setLogs(prev => [newLog, ...prev]);
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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brass-soft flex items-center justify-center text-brass">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-text">Automations & Workflows</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass-soft text-brass font-bold uppercase tracking-wider">
                  Autonomous Engine
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1 font-medium">
                Continuous autonomous rules and event monitors that execute real-time interventions, emails, and financial guardrails for {companyName}.
              </p>
            </div>
          </div>
        </div>

        {/* Create Workflow Button */}
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brass text-white text-xs font-semibold shadow-sm hover:brightness-110 btn-tactile cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Automation Protocol</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-xl bg-brass-soft border border-brass/30 text-xs font-medium text-brass flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-brass" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: "all", label: "All Protocols" },
          { id: "finance", label: "Financial Solvency" },
          { id: "risk", label: "Risk & Governance" },
          { id: "operations", label: "Team Operations" },
          { id: "communications", label: "Executive Reporting" },
        ].map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all btn-tactile ${
              selectedCategory === cat.id
                ? "bg-brass text-white border-brass font-semibold"
                : "bg-surface-2 border-line text-text-muted hover:text-text"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Two-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Automation Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
            Active Automation Rules ({filteredAutomations.length})
          </div>

          <div className="space-y-3">
            {filteredAutomations.map(auto => (
              <div
                key={auto.id}
                className={`p-4 rounded-xl border transition-all bg-surface shadow-theme space-y-3 ${
                  auto.enabled ? "border-line hover:border-line-strong" : "border-line/50 opacity-70"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-text">{auto.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface-2 border border-line text-brass font-bold uppercase">
                        {auto.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted flex items-center gap-2 font-mono">
                      <span>Cadence: {auto.frequency}</span>
                      <span>·</span>
                      <span>Executed {auto.runsCount} times</span>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleAutomation(auto.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        auto.enabled ? "bg-brass" : "bg-surface-2 border-line"
                      }`}
                      role="switch"
                      aria-checked={auto.enabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          auto.enabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Trigger & Action Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-line/60">
                  <div className="p-2.5 rounded-lg bg-surface-2 border border-line">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block mb-1">
                      Trigger Condition
                    </span>
                    <p className="text-text text-[11px] leading-relaxed">{auto.trigger}</p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-2 border border-line">
                    <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider block mb-1">
                      Autonomous Action
                    </span>
                    <p className="text-text text-[11px] leading-relaxed">{auto.action}</p>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-text-muted">
                  <span>Last run: {auto.lastRun}</span>
                  <button
                    type="button"
                    onClick={() => handleTestTrigger(auto)}
                    className="flex items-center gap-1 text-brass hover:underline font-semibold cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>Test Run Simulation</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Real-time Execution Audit Log (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
            Execution Log & Audit Trail
          </div>

          <div className="p-4 rounded-xl border border-line bg-surface shadow-theme space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-line">
              <span className="font-bold text-text">Autonomous Trigger Log</span>
              <span className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Monitoring
              </span>
            </div>

            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="p-2.5 rounded-lg bg-surface-2 border border-line space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-text line-clamp-1">{log.automationName}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase shrink-0 ${
                        log.status === "triggered"
                          ? "bg-amber/15 text-amber"
                          : "bg-emerald-500/15 text-emerald-500"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">{log.detail}</p>
                  <span className="text-[10px] text-text-muted/80 font-mono block pt-0.5">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Automation Modal */}
      <PortalModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <form
          onSubmit={handleCreateAutomation}
          className="max-w-lg w-full bg-surface border border-line rounded-2xl shadow-2xl p-6 space-y-4 animate-scale-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-brass" />
              <h2 className="text-sm font-bold text-text">Create Automation Protocol</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="p-1 rounded-lg border border-line bg-surface-2 text-text-muted hover:text-text"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-text block mb-1">Protocol Name *</label>
              <input
                type="text"
                required
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Stripe Webhook Reconciliation"
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass"
              />
            </div>

            <div>
              <label className="font-semibold text-text block mb-1">Operational Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass"
              >
                <option value="finance">Finance & Treasury</option>
                <option value="risk">Risk & Defensibility</option>
                <option value="operations">Operations & Talent</option>
                <option value="communications">Communications & Stakeholders</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-text block mb-1">Trigger Event</label>
              <input
                type="text"
                value={newTrigger}
                onChange={e => setNewTrigger(e.target.value)}
                placeholder="e.g. Daily at 08:00 AM IST or When runway drops below 6 months"
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass"
              />
            </div>

            <div>
              <label className="font-semibold text-text block mb-1">Automated Action Execution</label>
              <input
                type="text"
                value={newAction}
                onChange={e => setNewAction(e.target.value)}
                placeholder="e.g. Notify CFO AI & alert founder on high-priority gap"
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line text-text focus:ring-1 focus:ring-brass"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-line flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-line text-xs font-semibold text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-brass text-white text-xs font-bold shadow-md hover:brightness-110 btn-tactile cursor-pointer"
            >
              Deploy Protocol
            </button>
          </div>
        </form>
      </PortalModal>
    </div>
  );
}

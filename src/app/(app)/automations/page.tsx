"use client";

import React, { useState, useEffect } from "react";
import { Plus, X, Mail, AlertTriangle, Send, Bell, Sparkles, CheckCircle2 } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";
import { timeAgo, RunLog } from "@/lib/automations/engine";

interface AutomationItem {
  id: string;
  name: string;
  category: "finance" | "risk" | "operations" | "communications";
  trigger: string;
  action: string;
  enabled: boolean;
}

const QUICK_TEMPLATES = [
  {
    name: "Weekly Team Performance Digest",
    category: "communications" as const,
    trigger: "Every Monday at 9:00 AM",
    action: "Email digest with monthly revenue, runway, and open tasks to all team members",
    description: "Compiles telemetry and sends weekly executive digest to all team members.",
    icon: Mail,
  },
  {
    name: "Cash Runway Alert & Team Email",
    category: "finance" as const,
    trigger: "Cash runway drops below 6 months",
    action: "Email team financial alert and create priority mitigation task",
    description: "Triggers emergency alert to all team members when runway drops.",
    icon: AlertTriangle,
  },
  {
    name: "Broadcast to 100+ Team Members",
    category: "communications" as const,
    trigger: "When triggered or on demand",
    action: "Email strategic priorities and team announcements to all 100+ team members",
    description: "Broadcasts an instant company update to all workspace members.",
    icon: Send,
  },
  {
    name: "Workload Bottleneck Warning",
    category: "operations" as const,
    trigger: "Open tasks exceed 5",
    action: "Email team workload warning and assign triage task",
    description: "Monitors backlog and alerts team when operational load peaks.",
    icon: Bell,
  },
];

export default function AutomationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [companyName, setCompanyName] = useState("your business");

  // Close Create modal when Escape key is pressed
  useEscapeKey(() => setIsCreateModalOpen(false), isCreateModalOpen);

  // New automation state
  const [newName, setNewName] = useState("");
  const [newTrigger, setNewTrigger] = useState("");
  const [newAction, setNewAction] = useState("");
  const [newCategory, setNewCategory] = useState<AutomationItem["category"]>("finance");

  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState<RunLog[]>([]);

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
      if (data.success && Array.isArray(data.runs)) {
        setLogs(data.runs.map((r: any) => ({ id: r.id, automationId: r.automationId, automationName: r.automationName, status: r.status, at: r.at, detail: r.detail })));
      }
      if (data.success && Array.isArray(data.automations)) {
        setAutomations(
          data.automations.map((a: any) => ({
            id: a.id,
            name: a.title,
            category: (a.category?.toLowerCase()?.includes("finance")
              ? "finance"
              : a.category?.toLowerCase()?.includes("risk")
              ? "risk"
              : a.category?.toLowerCase()?.includes("comm") || a.category?.toLowerCase()?.includes("report")
              ? "communications"
              : "operations") as any,
            trigger: a.trigger,
            action: a.action,
            enabled: a.enabled,
          }))
        );
      }
      setLoaded(true);
    } catch (err) {
      console.error("Failed to load automations:", err);
      setLoaded(true);
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
    try {
      const res = await fetch("/api/automations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: automation.id }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        notify(result.error || "Could not run this automation.");
        return;
      }
      await fetchAutomations();
      notify(
        result.status === "triggered"
          ? result.taskAdded
            ? "Triggered: Task created & automation executed."
            : "Triggered: Condition met & automation executed."
          : result.status === "success"
          ? "Checked: Normal metrics, no action required."
          : "Executed: Check run history for details."
      );
    } catch {
      notify("Could not run this automation.");
    }
  };

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
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

  const deployTemplate = async (template: typeof QUICK_TEMPLATES[0]) => {
    try {
      const res = await fetch("/api/automations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: template.name,
          description: template.description,
          trigger: template.trigger,
          action: template.action,
          category: template.category,
          toolKey: "custom",
        }),
      });
      const data = await res.json();
      if (data.success) {
        notify(`Template '${template.name}' deployed successfully.`);
        await fetchAutomations();
      }
    } catch (e) {
      notify("Failed to deploy template.");
    }
  };

  const applyTemplateToModal = (template: typeof QUICK_TEMPLATES[0]) => {
    setNewName(template.name);
    setNewCategory(template.category);
    setNewTrigger(template.trigger);
    setNewAction(template.action);
  };

  const runsFor = (id: string) => logs.filter(l => l.automationId === id);

  const filteredAutomations = selectedCategory === "all"
    ? automations
    : automations.filter(a => a.category === selectedCategory);

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

  const categoryLabel: Record<AutomationItem["category"], string> = {
    finance: "Finance",
    risk: "Risk",
    operations: "Operations",
    communications: "Email & Comms",
  };

  const isEmailRule = (rule: AutomationItem) => {
    return /email|mail|notify team|alert team|broadcast|message team/i.test(`${rule.name} ${rule.trigger} ${rule.action}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Automations</h1>
          <p className="text-sm text-text-muted mt-1">
            Rules that continuously monitor {companyName}&apos;s metrics and dispatch team emails or tasks.
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
        <div className="p-3 rounded-lg border border-brass/20 bg-brass/10 text-sm text-text flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-brass shrink-0" />
          <span>{toastMessage}</span>
        </div>
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
          { id: "communications", label: "Email & Comms" },
        ].map(cat => {
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
            </button>
          );
        })}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Rules */}
        <div className="lg:col-span-8 space-y-4">
          {!loaded ? (
            <div className="p-8 rounded-2xl border border-line bg-surface text-center">
              <p className="text-sm text-text-muted">Loading automations…</p>
            </div>
          ) : filteredAutomations.length === 0 ? (
            <div className="p-8 rounded-2xl border border-line bg-surface text-center space-y-6">
              <div className="max-w-md mx-auto space-y-2">
                <Sparkles className="w-8 h-8 text-brass mx-auto mb-2 opacity-80" />
                <h3 className="text-base font-semibold text-text">No automations in this category</h3>
                <p className="text-xs text-text-muted">
                  Deploy a pre-configured automation template below with 1 click to start monitoring and emailing your team automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                {QUICK_TEMPLATES.map((tmpl, idx) => {
                  const Icon = tmpl.icon;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-line bg-surface-2/40 hover:bg-surface-2/80 transition-colors flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-brass shrink-0" />
                          <h4 className="text-sm font-semibold text-text">{tmpl.name}</h4>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">{tmpl.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deployTemplate(tmpl)}
                        className="self-start text-xs font-medium text-brass hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        + Add this automation
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            filteredAutomations.map(auto => {
              const hasEmail = isEmailRule(auto);
              return (
                <div
                  key={auto.id}
                  className={`p-6 rounded-2xl border border-line bg-surface shadow-sm space-y-4 ${auto.enabled ? "" : "opacity-60"}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-text leading-snug">{auto.name}</h3>
                        {hasEmail && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brass/10 text-brass font-medium">
                            <Mail className="w-3 h-3" /> Team Email Dispatch
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted">
                        {categoryLabel[auto.category]} · {runsFor(auto.id).length === 0 ? "Not run yet" : `Run ${runsFor(auto.id).length} ${runsFor(auto.id).length === 1 ? "time" : "times"}`}
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
                    <dt className="text-text-muted font-medium">When</dt>
                    <dd className="text-text">{auto.trigger}</dd>
                    <dt className="text-text-muted font-medium">Then</dt>
                    <dd className="text-text">{auto.action}</dd>
                  </dl>

                  <div className="flex items-center justify-between pt-3 border-t border-line text-xs text-text-muted">
                    <span>Last run: {runsFor(auto.id).length ? timeAgo(runsFor(auto.id)[0].at) : "Never"}</span>
                    <button
                      type="button"
                      onClick={() => handleTestTrigger(auto)}
                      className="text-sm font-medium text-brass hover:underline cursor-pointer"
                    >
                      Run test
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Activity */}
        <aside className="lg:col-span-4">
          <div className="rounded-2xl border border-line bg-surface shadow-sm lg:sticky lg:top-6 overflow-hidden">
            <h2 className="px-5 py-4 text-sm font-medium text-text border-b border-line flex items-center justify-between">
              <span>Recent activity</span>
              <span className="text-xs text-text-muted font-normal">{logs.length} runs</span>
            </h2>
            {logs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-text-muted leading-relaxed">
                Nothing has run yet. Press &ldquo;Run test&rdquo; on any rule to check telemetry and dispatch live team updates.
              </p>
            ) : (
              <ul className="divide-y divide-line max-h-[32rem] overflow-y-auto">
                {logs.map(log => {
                  const isEmail = /email|recipient|mail/i.test(log.detail);
                  return (
                    <li key={log.id} className="px-5 py-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-text leading-snug">{log.automationName}</p>
                        {isEmail && <Mail className="w-3.5 h-3.5 text-brass shrink-0" />}
                      </div>
                      <p className="text-xs text-text-muted leading-relaxed">{log.detail}</p>
                      <p className="text-[11px] text-text-muted flex items-center gap-1.5 pt-0.5">
                        <span>{timeAgo(log.at)}</span>
                        {log.status === "triggered" && <span className="text-rust font-medium">· condition met</span>}
                        {log.status === "success" && <span className="text-forest font-medium">· executed</span>}
                        {log.status === "warning" && <span className="text-gold font-medium">· info</span>}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <PortalModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <form
          onSubmit={handleCreateAutomation}
          className="w-[36rem] max-w-[calc(100vw-2rem)] bg-surface border border-line rounded-xl shadow-lg overflow-hidden"
        >
          <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-line">
            <div>
              <h2 className="text-lg font-semibold text-text">New automation</h2>
              <p className="text-xs text-text-muted mt-1">Configure automated telemetry monitoring, task generation, or team emails.</p>
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

          <div className="px-6 py-4 space-y-4 text-sm max-h-[75vh] overflow-y-auto">
            {/* Quick Template Chips */}
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-text-muted flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-brass" /> 1-Click Templates:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {QUICK_TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplateToModal(tmpl)}
                    className="text-xs px-2.5 py-1 rounded-full border border-line bg-surface-2 hover:border-brass hover:text-brass transition-colors cursor-pointer"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
              <div className="sm:col-span-3">
                <label className="font-medium text-text block mb-1.5">Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Weekly Team Performance Digest"
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
                  <option value="communications">Email & Comms</option>
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
                  placeholder="e.g. Every Monday at 9:00 AM, or Cash runway drops below 6 months"
                  className={`${inputClass} resize-none`}
                />
                <p className="text-xs text-text-muted mt-1.5">
                  A condition or schedule, e.g. &ldquo;Every Monday at 9 AM&rdquo;, &ldquo;Runway drops below 6 months&rdquo;, or &ldquo;Open tasks exceed 5&rdquo;.
                </p>
              </div>
              <div className="p-4 bg-surface-2/40">
                <label className="font-medium text-text block mb-1.5">Do this</label>
                <textarea
                  rows={2}
                  required
                  value={newAction}
                  onChange={e => setNewAction(e.target.value)}
                  placeholder="e.g. Email weekly performance digest to all team members"
                  className={`${inputClass} resize-none`}
                />
                <div className="mt-2 p-2.5 rounded-lg bg-brass/10 border border-brass/20 text-xs text-text space-y-1">
                  <div className="flex items-center gap-1.5 font-medium text-brass">
                    <Mail className="w-3.5 h-3.5" /> Team Email Automation
                  </div>
                  <p className="text-text-muted leading-relaxed">
                    Type <strong>&ldquo;email team&rdquo;</strong>, <strong>&ldquo;notify team&rdquo;</strong>, or specify email addresses (e.g. <code>team@company.com</code>) to automatically deliver emails to all workspace members when triggered.
                  </p>
                </div>
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

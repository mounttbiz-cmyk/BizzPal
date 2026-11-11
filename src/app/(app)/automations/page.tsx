"use client";

import React, { useState, useEffect } from "react";
import { Plus, X } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";
import { runAutomation, timeAgo, RunLog } from "@/lib/automations/engine";

interface AutomationItem {
  id: string;
  name: string;
  category: "finance" | "risk" | "operations" | "communications";
  trigger: string;
  action: string;
  enabled: boolean;
}

const LOG_KEY = "bizzpal_automation_runs";

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

  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [logs, setLogs] = useState<RunLog[]>([]);

  // Real run history for this browser's workspace
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOG_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) setLogs(parsed);
      }
    } catch {}
  }, []);

  const fetchAutomations = async () => {
    try {
      const res = await fetch("/api/automations");
      const data = await res.json();
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
    let profile: any = null;
    try {
      const raw = localStorage.getItem("bizzpal_business_profile");
      if (raw) profile = JSON.parse(raw);
    } catch {}

    let openTasks: number | null = null;
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        openTasks = data.tasks.filter((t: any) => t.status !== "done").length;
      }
    } catch {}

    const result = runAutomation(automation, { profile, openTasks });

    const entry: RunLog = {
      id: `run-${Date.now()}`,
      automationId: automation.id,
      automationName: automation.name,
      status: result.status,
      at: new Date().toISOString(),
      detail: result.detail,
    };
    setLogs(prev => {
      const updated = [entry, ...prev].slice(0, 100);
      try {
        localStorage.setItem(LOG_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Only create a real task when the rule's condition was actually met
    if (result.task) {
      try {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[Automation] ${result.task.title}`,
            owner: "Founder",
            priority: result.task.priority,
            gap: result.task.gap,
          }),
        });
      } catch {}
    }

    notify(
      result.status === "triggered"
        ? "Condition met. A task was added to your task list."
        : result.status === "success"
        ? "Checked. Nothing needs attention."
        : "Run finished, but nothing could be measured. See the note on the right."
    );
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
        <div className="lg:col-span-8 space-y-3">
          {filteredAutomations.length === 0 ? (
            <p className="p-10 text-center rounded-xl border border-line text-sm text-text-muted">
              {loaded ? "No automations in this category." : "Loading…"}
            </p>
          ) : (
            filteredAutomations.map(auto => (
              <div
                key={auto.id}
                className={`p-6 rounded-2xl border border-line bg-surface shadow-sm space-y-4 ${auto.enabled ? "" : "opacity-60"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-text leading-snug">{auto.name}</h3>
                    <p className="text-xs text-text-muted mt-1">
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
                  <dt className="text-text-muted">When</dt>
                  <dd className="text-text">{auto.trigger}</dd>
                  <dt className="text-text-muted">Then</dt>
                  <dd className="text-text">{auto.action}</dd>
                </dl>

                <div className="flex items-center justify-between pt-3 border-t border-line text-xs text-text-muted">
                  <span>Last run: {runsFor(auto.id).length ? timeAgo(runsFor(auto.id)[0].at) : "Never"}</span>
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
          <div className="rounded-2xl border border-line bg-surface shadow-sm lg:sticky lg:top-6">
            <h2 className="px-5 py-4 text-sm font-medium text-text border-b border-line">Recent activity</h2>
            {logs.length === 0 ? (
              <p className="px-5 py-6 text-sm text-text-muted leading-relaxed">
                Nothing has run yet. Press &ldquo;Run test&rdquo; on a rule to check it against your real numbers.
              </p>
            ) : (
              <ul className="divide-y divide-line max-h-[32rem] overflow-y-auto">
                {logs.map(log => (
                  <li key={log.id} className="px-5 py-4">
                    <p className="text-sm text-text leading-snug">{log.automationName}</p>
                    <p className="text-sm text-text-muted leading-relaxed mt-1">{log.detail}</p>
                    <p className="text-xs text-text-muted mt-2">
                      {timeAgo(log.at)}
                      {log.status === "triggered" && <span className="text-rust"> · condition met</span>}
                      {log.status === "warning" && <span> · not checked</span>}
                    </p>
                  </li>
                ))}
              </ul>
            )}
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

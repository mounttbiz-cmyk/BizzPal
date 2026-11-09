"use client";

import React, { useState, useEffect } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { PortalModal } from "@/components/ui/PortalModal";

interface TaskItem {
  id: string;
  title: string;
  owner: string;
  gap?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "done";
  category?: string;
  createdAt?: string;
}

const COLUMNS = [
  { key: "todo" as const, label: "To do" },
  { key: "in_progress" as const, label: "In progress" },
  { key: "done" as const, label: "Done" },
];

const inputClass =
  "w-full px-3 py-2 rounded-lg bg-surface border border-line text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brass";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [founderName, setFounderName] = useState("Founder");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newOwner, setNewOwner] = useState("Founder / Executive");
  const [newGap, setNewGap] = useState("");
  const [newPriority, setNewPriority] = useState<TaskItem["priority"]>("high");
  const [newStatus, setNewStatus] = useState<TaskItem["status"]>("todo");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEscapeKey(() => setIsAddModalOpen(false), isAddModalOpen);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTasks = async () => {
    try {
      const stored = localStorage.getItem("bizzpal_business_profile");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.founderName) {
            setFounderName(parsed.founderName);
            setNewOwner(`${parsed.founderName} (Founder)`);
          }
        } catch {}
      }

      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleUpdateStatus = async (taskId: string, targetStatus: TaskItem["status"]) => {
    setTasks(prev => prev.map(t => (t.id === taskId ? { ...t, status: targetStatus } : t)));
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: targetStatus }),
      });
    } catch (err) {
      console.error("Failed to save task status", err);
    }
  };

  // todo -> in progress -> done -> todo
  const cycleTaskStatus = (task: TaskItem) => {
    const next: TaskItem["status"] =
      task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";
    handleUpdateStatus(task.id, next);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Delete this task?")) return;
    setTasks(prev => prev.filter(t => t.id !== taskId));
    try {
      await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" });
      notify("Task deleted");
    } catch (err) {
      console.error("Failed to delete task", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;

    setIsSubmitting(true);
    const tempId = `task_${Date.now()}`;
    const gap = newGap.trim() || "General";

    setTasks(prev => [
      {
        id: tempId,
        title,
        owner: newOwner,
        gap,
        priority: newPriority,
        status: newStatus,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setIsAddModalOpen(false);
    setNewTitle("");
    setNewGap("");
    notify("Task added");

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, owner: newOwner, gap, priority: newPriority, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok && data.task) {
        setTasks(prev => prev.map(t => (t.id === tempId ? data.task : t)));
      }
    } catch (err) {
      console.error("Failed to save task", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg bg-surface border border-line shadow-lg text-sm text-text">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h1 className="text-xl font-bold text-text">Tasks</h1>
          <p className="text-sm text-text-muted mt-1">Track what needs to get done and who owns it.</p>
        </div>
        <button
          id="btn-add-custom-task"
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add task
        </button>
      </div>

      {!loading && tasks.length === 0 ? (
        <div className="py-20 text-center space-y-3 rounded-xl border border-line bg-surface">
          <h2 className="text-base font-semibold text-text">No tasks yet</h2>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            Add a task, or create them from the Decision Simulator and Gap Register.
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-brass text-white text-sm font-medium hover:brightness-110 cursor-pointer"
          >
            Add task
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {COLUMNS.map(col => {
            const items = tasks.filter(t => t.status === col.key);
            return (
              <section key={col.key} className="space-y-3">
                <h2 className="text-sm font-medium text-text">
                  {col.label} <span className="text-text-muted font-normal ml-1">{items.length}</span>
                </h2>

                <div className="space-y-3">
                  {items.length === 0 ? (
                    <p className="p-5 rounded-lg border border-dashed border-line text-center text-sm text-text-muted">
                      Nothing here
                    </p>
                  ) : (
                    items.map(task => (
                      <div key={task.id} className="group p-4 rounded-lg border border-line bg-surface">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => cycleTaskStatus(task)}
                            className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center cursor-pointer ${
                              task.status === "done"
                                ? "bg-jade border-jade text-white"
                                : task.status === "in_progress"
                                ? "border-brass bg-brass/20"
                                : "border-line-strong hover:border-brass"
                            }`}
                            title="Move to the next stage"
                            aria-label="Move to the next stage"
                          >
                            {task.status === "done" && <Check className="w-3 h-3 stroke-[3]" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm leading-snug ${
                                task.status === "done" ? "line-through text-text-muted" : "text-text"
                              }`}
                            >
                              {task.title}
                            </p>
                            <p className="text-xs text-text-muted mt-2">
                              {task.owner}
                              {task.gap ? ` · ${task.gap}` : ""}
                              {task.priority === "critical" || task.priority === "high" ? (
                                <span className={task.priority === "critical" ? "text-rust" : ""}>
                                  {" "}
                                  · {task.priority}
                                </span>
                              ) : null}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1 rounded text-text-muted hover:text-rust opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Delete task"
                            aria-label="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <PortalModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)}>
        <div className="w-full max-w-md p-6 rounded-xl bg-surface border border-line shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-text">Add task</h2>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="text-text-muted hover:text-text px-2 cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4 text-sm">
            <div>
              <label className="font-medium text-text block mb-1">Task</label>
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="e.g. Review software subscriptions"
                className={inputClass}
                autoFocus
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-text block mb-1">Owner</label>
                <select value={newOwner} onChange={e => setNewOwner(e.target.value)} className={inputClass}>
                  <option value={`${founderName} (Founder)`}>{founderName} (Founder)</option>
                  <option value="Finance & Runway Lead">Finance & Runway Lead</option>
                  <option value="Growth & Marketing Lead">Growth & Marketing Lead</option>
                  <option value="Operations Lead">Operations Lead</option>
                  <option value="Technical Lead">Technical Lead</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-text block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as TaskItem["priority"])}
                  className={inputClass}
                >
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-text block mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={e => setNewStatus(e.target.value as TaskItem["status"])}
                  className={inputClass}
                >
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-text block mb-1">
                  Area <span className="text-text-muted font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newGap}
                  onChange={e => setNewGap(e.target.value)}
                  placeholder="e.g. Cash runway"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-line flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-text-muted hover:text-text cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="px-4 py-2 rounded-lg bg-brass text-white font-medium hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Adding…" : "Add task"}
              </button>
            </div>
          </form>
        </div>
      </PortalModal>
    </div>
  );
}

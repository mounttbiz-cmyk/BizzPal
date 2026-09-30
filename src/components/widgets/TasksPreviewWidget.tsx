"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { CheckSquare, CheckCircle2, Circle, ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

interface TaskItem {
  id: string;
  title: string;
  owner: string;
  due: string;
  completed: boolean;
  source: string;
}

export function TasksPreviewWidget() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const fetchTasks = () => {
    fetch("/api/tasks")
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.tasks)) {
          setTasks(
            d.tasks.slice(0, 4).map((t: any) => ({
              id: t.id,
              title: t.title,
              owner: t.owner || "Founder",
              due: t.priority === "high" ? "Today" : "This Week",
              completed: t.status === "done",
              source: t.gap || "General",
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          owner: "Founder",
          priority: "high",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewTaskTitle("");
        setIsAdding(false);
        fetchTasks();
      }
    } catch {}
  };

  const toggleTask = async (id: string) => {
    const current = tasks.find(t => t.id === id);
    if (!current) return;
    const nextCompleted = !current.completed;

    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, completed: nextCompleted } : t))
    );

    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: nextCompleted ? "done" : "todo",
        }),
      });
    } catch {}
  };

  return (
    <ContainerTile span={2} id="widget_priority_tasks">
      <div className="flex flex-col h-full justify-between space-y-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-jade/15 border border-jade/30 flex items-center justify-center text-jade">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-sans">
                  Autonomous Execution Queue
                </h2>
                <span className="text-[10px] text-text-muted">
                  Assigned across AI executives and founder
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 hover:bg-surface border border-line text-text font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Task</span>
              </button>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold font-mono border border-cyan-500/30">
                {tasks.filter(t => !t.completed).length} Pending
              </span>
            </div>
          </div>

          {isAdding && (
            <form onSubmit={handleCreateTask} className="pt-3 flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Enter task description..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-surface-2 border border-line text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-brass text-white hover:brightness-110"
              >
                Save
              </button>
            </form>
          )}

          <div className="space-y-2.5 pt-3">
            {tasks.length === 0 ? (
              <div className="py-6 text-center space-y-1.5 bg-surface-2/20 rounded-xl border border-dashed border-line">
                <div className="w-8 h-8 mx-auto rounded-full bg-jade/10 flex items-center justify-center text-jade">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-text">Execution Queue Clear</div>
                <p className="text-[11px] text-text-muted max-w-xs mx-auto">
                  No pending bottleneck tasks. Assign action items directly to Astra or Marcus.
                </p>
              </div>
            ) : (
              tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-all ${
                    task.completed
                      ? "bg-surface-2/20 border-line/40 opacity-60"
                      : "bg-surface-2/40 border-line hover:border-line-strong hover:bg-surface-2/70"
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 text-text-muted group-hover:text-cyan-500 transition-colors"
                    aria-label={task.completed ? "Mark incomplete" : "Mark completed"}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-jade" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-muted hover:text-cyan-500" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-semibold leading-snug transition-colors ${
                        task.completed ? "line-through text-text-muted/60" : "text-text"
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted mt-1.5 font-mono">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/25 font-sans font-medium">
                        {task.owner}
                      </span>
                      <span className="text-line-strong">·</span>
                      <span className="text-amber-600 dark:text-amber-400 font-medium font-sans">{task.due}</span>
                      <span className="text-line-strong">·</span>
                      <span className="truncate text-text-muted/80">{task.source}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08]">
          <Link
            href="/tasks"
            className="flex items-center justify-between text-xs text-cyan-400 hover:text-cyan-300 font-semibold btn-tactile group"
          >
            <span>View Kanban Board & Action Plans</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

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
          <div className="flex items-center justify-between pb-3 border-b border-line dark:border-b-[#2D2722]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-jade/15 border border-jade/30 dark:bg-[#172220] dark:border-[#2D2722] flex items-center justify-center text-jade dark:text-[#3FA96A]">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-[#EBE7DF] uppercase tracking-wider font-sans">
                  Autonomous Execution Queue
                </h2>
                <span className="text-[10px] text-text-muted dark:text-[#97928E]">
                  Assigned across AI executives and founder
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(!isAdding)}
                className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 hover:bg-surface border border-line text-text dark:bg-[#18161D] dark:border-[#2D2722] dark:text-[#EBE7DF] dark:hover:border-[rgba(217,180,74,0.45)] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3 text-text-muted dark:text-[#D9B44A]" />
                <span>Add Task</span>
              </button>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600 dark:bg-[#122128] dark:text-[#0E9CAE] dark:border-[rgba(14,156,174,0.30)] font-semibold font-mono border border-cyan-500/30">
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
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-surface-2 dark:bg-[#18161D] border border-line dark:border-[#2D2722] text-text dark:text-[#EBE7DF] placeholder:text-text-muted dark:placeholder:text-[#726C66] focus:outline-none focus:border-brass dark:focus:border-[rgba(217,180,74,0.45)]"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-bold rounded-xl btn-gold-gradient cursor-pointer"
              >
                Save
              </button>
            </form>
          )}

          <div className="space-y-2.5 pt-3">
            {tasks.length === 0 ? (
              <div className="py-6 text-center space-y-1.5 bg-surface-2/20 dark:bg-[#18161D] rounded-xl border border-dashed border-line dark:border-[#2D2722]">
                <div className="w-8 h-8 mx-auto rounded-full bg-jade/10 dark:bg-[#172220] flex items-center justify-center text-jade dark:text-[#3FA96A]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs font-semibold text-text dark:text-[#EBE7DF]">Execution Queue Clear</div>
                <p className="text-[11px] text-text-muted dark:text-[#97928E] max-w-xs mx-auto">
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
                      ? "bg-surface-2/20 border-line/40 dark:bg-[#18161D]/50 dark:border-[#2D2722]/50 opacity-60"
                      : "bg-surface-2/40 border-line hover:border-line-strong hover:bg-surface-2/70 dark:bg-[#18161D] dark:border-[#2D2722] dark:hover:border-[#41372A] dark:hover:bg-[#1C1A22]"
                  }`}
                >
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 transition-colors"
                    aria-label={task.completed ? "Mark incomplete" : "Mark completed"}
                  >
                    {task.completed ? (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center bg-jade dark:bg-[#3FA96A] text-white dark:text-[#08070A]">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-text-muted/60 dark:border-[1.5px] dark:border-[#41372A] dark:hover:border-[#D9B44A] transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-xs font-semibold leading-snug transition-colors ${
                        task.completed ? "line-through text-text-muted/60 dark:text-[#726C66]" : "text-text dark:text-[#EBE7DF]"
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-text-muted dark:text-[#726C66] mt-1.5 font-mono">
                      <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-700 dark:bg-[#122128] dark:border-[rgba(14,156,174,0.30)] dark:text-[#0E9CAE] border border-cyan-500/25 font-sans font-medium">
                        {task.owner}
                      </span>
                      <span className="text-line-strong dark:text-[#2D2722]">·</span>
                      <span className="text-amber-600 dark:text-[#E2701F] font-medium font-sans">{task.due}</span>
                      <span className="text-line-strong dark:text-[#2D2722]">·</span>
                      <span className="truncate text-text-muted/80 dark:text-[#726C66]">{task.source}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08] dark:border-t-[#2D2722]">
          <Link
            href="/tasks"
            className="flex items-center justify-between text-xs text-cyan-400 dark:text-[#0E9CAE] hover:text-cyan-300 dark:hover:text-[#0E9CAE]/80 font-semibold btn-tactile group"
          >
            <span>View Kanban Board & Action Plans</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

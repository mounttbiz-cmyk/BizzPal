"use client";

import React, { useState, useEffect } from "react";
import { ContainerTile } from "../ui/ContainerTile";
import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useCustomAdvisors } from "@/lib/advisors";

interface TaskItem {
  id: string;
  title: string;
  owner: string;
  due: string;
  completed: boolean;
  source: string;
}

export function TasksPreviewWidget() {
  const { ceoName, cfoName } = useCustomAdvisors();
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
      <div className="flex flex-col h-full justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-text">Tasks</h2>
              <p className="text-sm text-text-muted mt-0.5">{tasks.filter(t => !t.completed).length} still to do</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="px-3.5 py-2 rounded-xl text-sm border border-line text-text hover:bg-surface-2 cursor-pointer shrink-0"
            >
              Add task
            </button>
          </div>

          {isAdding && (
            <form onSubmit={handleCreateTask} className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="What needs doing?"
                className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-surface border border-line text-text placeholder:text-text-muted focus:outline-none focus:border-brass"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium rounded-xl bg-brass text-white hover:brightness-110 cursor-pointer"
              >
                Save
              </button>
            </form>
          )}

          {tasks.length === 0 ? (
            <p className="text-sm text-text-muted leading-relaxed py-4">
              No tasks yet. Add one above, or ask {ceoName} or {cfoName} to suggest some.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {tasks.map(task => (
                <li key={task.id} className="py-3 first:pt-0">
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    aria-label={task.completed ? "Mark as not done" : "Mark as done"}
                    className="w-full flex items-start gap-3 text-left cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-jade" />
                    ) : (
                      <Circle className="w-4 h-4 mt-0.5 shrink-0 text-text-muted" />
                    )}
                    <span className="min-w-0">
                      <span className={`block text-sm leading-snug ${task.completed ? "line-through text-text-muted" : "text-text"}`}>
                        {task.title}
                      </span>
                      <span className="block text-xs text-text-muted mt-0.5">
                        {task.owner} · {task.due}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pt-4 border-t border-line">
          <Link href="/tasks" className="text-sm text-brass hover:underline">
            See all tasks
          </Link>
        </div>
      </div>
    </ContainerTile>
  );
}

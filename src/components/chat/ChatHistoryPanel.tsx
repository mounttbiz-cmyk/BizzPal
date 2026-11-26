"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Search, Trash2, X } from "lucide-react";
import { AgentMeta } from "./types";
import { AgentAvatarIcon } from "./CustomizeAdvisorModal";

export interface ConversationSummary {
  id: string;
  agentId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

function groupByDate(items: ConversationSummary[]) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const t = start.getTime();
  const groups: Array<{ label: string; items: ConversationSummary[] }> = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ];
  for (const c of items) {
    const at = new Date(c.updatedAt).getTime();
    if (at >= t) groups[0].items.push(c);
    else if (at >= t - 864e5) groups[1].items.push(c);
    else if (at >= t - 7 * 864e5) groups[2].items.push(c);
    else if (at >= t - 30 * 864e5) groups[3].items.push(c);
    else groups[4].items.push(c);
  }
  return groups.filter(g => g.items.length > 0);
}

/**
 * Every saved chat, with every advisor, in a panel that slides in from the right. Search, reopen, rename or delete.
 */
export function ChatHistoryPanel({
  open,
  onClose,
  conversations,
  agents,
  activeId,
  onOpen,
  onRename,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  conversations: ConversationSummary[] | null;
  agents: AgentMeta[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !renaming && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, renaming]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (conversations || []).filter(c => !s || c.title.toLowerCase().includes(s));
  }, [conversations, q]);

  if (!open) return null;
  const agentOf = (id: string) => agents.find(a => a.id === id);
  const save = (id: string) => {
    if (draft.trim()) onRename(id, draft.trim());
    setRenaming(null);
  };

  return (
    // Desktop: a column beside the conversation (nothing is covered or dimmed). Phones: a panel over the page.
    <div className="fixed inset-0 z-[1000] flex justify-end md:static md:inset-auto md:z-auto md:shrink-0" aria-label="Chat history">
      <button type="button" aria-label="Close" onClick={onClose} className="md:hidden absolute inset-0 bg-slate-950/30 cursor-default" />
      <aside className="relative w-full max-w-sm md:w-80 h-full bg-surface border-l border-line shadow-2xl md:shadow-none flex flex-col">
        <div className="h-14 pl-5 pr-3 border-b border-line flex items-center justify-between shrink-0">
          <h2 className="text-[15px] font-semibold text-text">History</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 flex items-center justify-center cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search your chats"
              aria-label="Search your chats"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-2/70 border border-transparent text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-line focus:bg-surface [&::-webkit-search-cancel-button]:hidden"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 px-2 pb-3">
          {conversations === null ? (
            <p className="px-3 py-6 text-sm text-text-muted">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-text-muted">
              {q ? `No chats match "${q}".` : "No saved chats yet. Every conversation you have is kept here."}
            </p>
          ) : (
            groupByDate(filtered).map(group => (
              <div key={group.label} className="mb-3">
                <p className="px-3 pt-3 pb-1 text-xs font-medium text-text-muted">{group.label}</p>
                {group.items.map(c => {
                  const a = agentOf(c.agentId);
                  const on = c.id === activeId;
                  if (renaming === c.id) {
                    return (
                      <div key={c.id} className="px-1 py-0.5">
                        <input
                          autoFocus
                          value={draft}
                          maxLength={80}
                          onChange={e => setDraft(e.target.value)}
                          onBlur={() => save(c.id)}
                          onKeyDown={e => {
                            if (e.key === "Enter") save(c.id);
                            if (e.key === "Escape") setRenaming(null);
                          }}
                          aria-label="Chat name"
                          className="w-full h-10 px-3 rounded-lg border border-brass bg-surface text-sm text-text focus:outline-none"
                        />
                      </div>
                    );
                  }
                  return (
                    <div key={c.id} className={`group relative rounded-lg ${on ? "bg-surface-2" : "hover:bg-surface-2/60"}`}>
                      <button type="button" onClick={() => onOpen(c.id)} className="w-full pl-3 pr-16 py-2 text-left flex items-start gap-3 cursor-pointer" title={c.title}>
                        <span className={`w-4 mt-0.5 shrink-0 ${on ? "text-brass" : "text-text-muted"}`}>
                          <AgentAvatarIcon iconName={a?.avatar || "Bot"} className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm text-text truncate">{c.title}</span>
                          <span className="block text-xs text-text-muted truncate">
                            {a?.name || "Advisor"} · {new Date(c.updatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </span>
                      </button>
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setDraft(c.title);
                            setRenaming(c.id);
                          }}
                          aria-label={`Rename "${c.title}"`}
                          title="Rename"
                          className="w-7 h-7 rounded-md text-text-muted hover:text-text hover:bg-surface flex items-center justify-center cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(c.id)}
                          aria-label={`Delete "${c.title}"`}
                          title="Delete"
                          className="w-7 h-7 rounded-md text-text-muted hover:text-rust hover:bg-surface flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}

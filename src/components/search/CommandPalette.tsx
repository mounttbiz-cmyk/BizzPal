"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { NavItem } from "@/config/schemas/nav";
import { DynamicIcon } from "@/components/shell/DynamicIcon";

type Group = "Pages" | "Tools" | "Tasks" | "Settings";

interface Result {
  id: string;
  title: string;
  group: Group;
  /** A few plain words shown on the right */
  hint?: string;
  href: string;
  icon: string;
  keywords?: string[];
}

// What each page is for, in plain words (shown as the hint and used for matching)
const PAGE_HINTS: Record<string, { hint: string; keywords: string[] }> = {
  "/dashboard": { hint: "Your numbers at a glance", keywords: ["home", "overview", "health", "runway"] },
  "/money": { hint: "Bank statements and Tally", keywords: ["bank", "statement", "tally", "transactions", "money", "cash", "expenses", "spending"] },
  "/leads": { hint: "New leads and enquiries", keywords: ["leads", "enquiries", "inquiries", "sheet", "inbox", "customers"] },
  "/chat": { hint: "Ask your AI advisors", keywords: ["ai", "advisor", "ceo", "cfo", "ask", "chat"] },
  "/strategy": { hint: "Plan growth initiatives", keywords: ["initiatives", "growth", "plan"] },
  "/playbooks": { hint: "Step-by-step plans", keywords: ["playbook", "plan", "steps"] },
  "/xray": { hint: "Find what is holding you back", keywords: ["xray", "x-ray", "website", "analysis", "problems"] },
  "/gaps": { hint: "Problems to fix", keywords: ["gaps", "problems", "risks", "bottlenecks"] },
  "/simulator": { hint: "Test a decision first", keywords: ["scenario", "what if", "decision", "simulate"] },
  "/analytics": { hint: "Charts and trends", keywords: ["charts", "metrics", "kpi", "revenue", "trends"] },
  "/knowledge": { hint: "Your documents", keywords: ["documents", "files", "knowledge", "docs"] },
  "/tools": { hint: "Calculators", keywords: ["calculator", "tools"] },
  "/datapal": { hint: "Find business leads", keywords: ["leads", "contacts", "data", "datapal"] },
  "/tasks": { hint: "Your to-do list", keywords: ["tasks", "todo", "work"] },
  "/reports": { hint: "Briefings and reports", keywords: ["reports", "briefing", "summary"] },
  "/automations": { hint: "Things that run by themselves", keywords: ["automation", "rules", "alerts"] },
  "/agents": { hint: "AI agents that do work", keywords: ["agents", "ai", "automation", "jobs"] },
  "/approvals": { hint: "Waiting for your decision", keywords: ["approve", "approvals", "agent", "email"] },
  "/team": { hint: "People and access", keywords: ["team", "people", "users", "invite"] },
  "/integrations": { hint: "Connect your tools", keywords: ["integrations", "connect", "email", "slack", "drive", "razorpay"] },
  "/group": { hint: "Your companies", keywords: ["group", "companies", "subsidiaries"] },
  "/help": { hint: "Help and support", keywords: ["help", "support", "faq"] },
};

const TOOLS: Result[] = [
  { id: "tool_profit", title: "Profit calculator", group: "Tools", hint: "Margins after all costs", href: "/tools?tool=profit", icon: "Calculator", keywords: ["profit", "margin", "gross", "net", "cost"] },
  { id: "tool_breakeven", title: "Break-even calculator", group: "Tools", hint: "Sales needed to cover costs", href: "/tools?tool=breakeven", icon: "Target", keywords: ["breakeven", "break even", "fixed cost"] },
  { id: "tool_cashflow", title: "Cash flow forecast", group: "Tools", hint: "Cash for the next months", href: "/tools?tool=cashflow", icon: "LineChart", keywords: ["cash", "cash flow", "runway", "forecast", "burn"] },
  { id: "tool_cac", title: "CAC and LTV calculator", group: "Tools", hint: "Cost to win a customer", href: "/tools?tool=cac", icon: "TrendingUp", keywords: ["cac", "ltv", "acquisition", "payback", "marketing"] },
  { id: "tool_roi", title: "ROI calculator", group: "Tools", hint: "Is an investment worth it", href: "/tools?tool=roi", icon: "BarChart3", keywords: ["roi", "return", "investment", "payback"] },
  { id: "tool_pricing", title: "Pricing simulator", group: "Tools", hint: "Try prices and plans", href: "/tools?tool=pricing", icon: "Sliders", keywords: ["pricing", "price", "plans", "discount"] },
  { id: "tool_hiring", title: "Hiring cost calculator", group: "Tools", hint: "Full cost of a new hire", href: "/tools?tool=hiring", icon: "Users", keywords: ["hiring", "salary", "payroll", "pf", "headcount"] },
  { id: "tool_scenario", title: "Scenario planner", group: "Tools", hint: "Plan for good and bad times", href: "/tools?tool=scenario_planner", icon: "Compass", keywords: ["scenario", "risk", "stress test", "downturn"] },
];

const SETTINGS: Result[] = [
  { id: "set_profile", title: "Business profile", group: "Settings", hint: "Name, logo and numbers", href: "/settings/profile", icon: "Briefcase", keywords: ["profile", "business", "logo", "revenue", "settings"] },
  { id: "set_brief", title: "Business brief", group: "Settings", hint: "What the AI knows about you", href: "/settings/brief", icon: "FileText", keywords: ["brief", "about", "ai", "context"] },
  { id: "set_advisors", title: "AI advisors", group: "Settings", hint: "Rename your advisors", href: "/settings/advisors", icon: "Bot", keywords: ["advisors", "rename", "names"] },
  { id: "set_credits", title: "Credits", group: "Settings", hint: "Agent credits and usage", href: "/settings/credits", icon: "CreditCard", keywords: ["credits", "wallet", "usage", "buy"] },
  { id: "set_appearance", title: "Appearance", group: "Settings", hint: "Light or dark theme", href: "/settings/appearance", icon: "Sliders", keywords: ["theme", "dark", "light", "appearance"] },
  { id: "set_audit", title: "Activity log", group: "Settings", hint: "Everything that happened", href: "/settings/audit", icon: "FileText", keywords: ["audit", "log", "history", "activity"] },
];

const GROUP_ORDER: Group[] = ["Pages", "Tools", "Tasks", "Settings"];

function score(r: Result, q: string): number {
  const t = r.title.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.split(/\s+/).some(w => w.startsWith(q))) return 60;
  if (t.includes(q)) return 50;
  if (r.keywords?.some(k => k.startsWith(q))) return 40;
  if (r.keywords?.some(k => k.includes(q))) return 30;
  if (r.hint?.toLowerCase().includes(q)) return 20;
  return 0;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  /** The pages in the sidebar this person can open */
  navItems?: NavItem[];
}

/**
 * Quick search (Ctrl K): jump to any page, tool, task or setting. Pages come from the sidebar, so search always
 * matches what the person can open; tasks are their real tasks.
 */
export function CommandPalette({ isOpen, onClose, navItems = [] }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [tasks, setTasks] = useState<Result[]>([]);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // The person's open tasks
  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setIndex(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    fetch("/api/tasks", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (!d?.success || !Array.isArray(d.tasks)) return;
        setTasks(
          d.tasks
            .filter((t: any) => t.status !== "done")
            .slice(0, 30)
            .map((t: any) => ({
              id: `task_${t.id}`,
              title: String(t.title || "Task"),
              group: "Tasks" as const,
              hint: t.status === "in_progress" ? "In progress" : "To do",
              href: "/tasks",
              icon: "CheckSquare",
              keywords: [String(t.owner || "").toLowerCase(), "task"],
            }))
        );
      })
      .catch(() => {});
  }, [isOpen]);

  const pages: Result[] = useMemo(
    () =>
      navItems
        .filter(n => n.enabled !== false && n.href && !n.href.startsWith("http"))
        .map(n => ({
          id: `page_${n.id}`,
          title: n.href === "/datapal" ? "DataPal" : n.label,
          group: "Pages" as const,
          hint: PAGE_HINTS[n.href]?.hint,
          href: n.href,
          icon: n.icon || "LayoutDashboard",
          keywords: PAGE_HINTS[n.href]?.keywords,
        })),
    [navItems]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Before typing: the main pages and the most used tools
      return [...pages.slice(0, 6), ...TOOLS.slice(0, 4)];
    }
    return [...pages, ...TOOLS, ...tasks, ...SETTINGS]
      .map(r => ({ r, s: score(r, q) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map(x => x.r);
  }, [query, pages, tasks]);

  // Grouped for display, in a fixed group order, best matches first inside each group
  const grouped = useMemo(() => {
    return GROUP_ORDER.map(g => ({ group: g, items: results.filter(r => r.group === g).slice(0, query ? 8 : 6) })).filter(g => g.items.length > 0);
  }, [results, query]);
  const flat = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${index}"]`)?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const open = (r: Result) => {
    onClose();
    router.push(r.href);
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex(i => (flat.length ? (i + 1) % flat.length : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex(i => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flat[index]) open(flat[index]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, flat, index]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  let running = -1;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Search">
      <button type="button" aria-label="Close search" onClick={onClose} className="absolute inset-0 bg-slate-950/40 cursor-default" />

      <div className="relative w-full max-w-xl rounded-xl border border-line bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
        {/* Search field */}
        <div className="h-14 px-4 flex items-center gap-3 border-b border-line shrink-0">
          <Search className="w-[18px] h-[18px] text-text-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, tools and tasks…"
            aria-label="Search"
            spellCheck={false}
            className="flex-1 bg-transparent text-[15px] text-text placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-6 px-1.5 items-center rounded-md border border-line text-[11px] text-text-muted font-sans">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2" role="listbox" aria-label="Results">
          {flat.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-sm text-text">No results for &ldquo;{query}&rdquo;</p>
              <p className="mt-1 text-sm text-text-muted">Try a page name, a tool like &ldquo;profit&rdquo;, or one of your tasks.</p>
            </div>
          ) : (
            grouped.map(g => (
              <div key={g.group} className="mb-1 last:mb-0">
                <p className="px-3 pt-2.5 pb-1.5 text-xs font-medium text-text-muted">{!query && g.group === "Tools" ? "Popular tools" : g.group}</p>
                {g.items.map(r => {
                  running++;
                  const i = running;
                  const on = i === index;
                  return (
                    <div
                      key={r.id}
                      role="option"
                      aria-selected={on}
                      data-index={i}
                      onClick={() => open(r)}
                      onMouseMove={() => index !== i && setIndex(i)}
                      className={`h-10 px-3 rounded-lg flex items-center gap-3 cursor-pointer ${on ? "bg-surface-2" : ""}`}
                    >
                      <span className={`shrink-0 ${on ? "text-brass" : "text-text-muted"}`}>
                        <DynamicIcon name={r.icon} className="w-4 h-4" />
                      </span>
                      <span className="text-sm text-text truncate">{r.title}</span>
                      {r.hint && <span className="ml-auto pl-3 text-xs text-text-muted truncate shrink-0 max-w-[45%]">{r.hint}</span>}
                      {on && <CornerDownLeft className={`w-3.5 h-3.5 text-text-muted shrink-0 ${r.hint ? "" : "ml-auto"}`} />}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Keys */}
        <div className="h-10 px-4 border-t border-line flex items-center gap-4 text-xs text-text-muted shrink-0">
          <span className="inline-flex items-center gap-1.5">
            <kbd className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded border border-line font-sans">↑</kbd>
            <kbd className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded border border-line font-sans">↓</kbd>
            to move
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className="min-w-5 h-5 px-1 inline-flex items-center justify-center rounded border border-line font-sans">↵</kbd>
            to open
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 ml-auto">
            <kbd className="h-5 px-1.5 inline-flex items-center rounded border border-line font-sans">Ctrl K</kbd>
            anywhere
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

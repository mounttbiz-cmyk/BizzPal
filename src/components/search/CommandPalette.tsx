"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  Calculator,
  TrendingUp,
  DollarSign,
  Target,
  ShieldAlert,
  Layers,
  Compass,
  Wrench,
  CheckSquare,
  FileText,
  Zap,
  GitFork,
  Plug,
  BookOpen,
  Settings,
  Users,
  CreditCard,
  Bot,
  ArrowRight,
  CornerDownLeft,
  X,
  Clock,
  Sparkles,
  ChevronRight,
  Database
} from "lucide-react";

export interface SearchItem {
  id: string;
  title: string;
  category: "Tools & Calculators" | "Pages & Navigation" | "Execution Tasks" | "Bottlenecks & Gaps";
  description?: string;
  badge?: string;
  href: string;
  icon: React.ReactNode;
  keywords?: string[];
}

const STATIC_SEARCH_ITEMS: SearchItem[] = [
  // ==========================================
  // TOOLS & CALCULATORS
  // ==========================================
  {
    id: "tool_profit",
    title: "Profit Calculator",
    category: "Tools & Calculators",
    description: "Calculate gross, operating, and net margins with loaded Indian payroll & overheads.",
    badge: "Calculator",
    href: "/tools?tool=profit",
    icon: <Calculator className="w-4 h-4 text-emerald-400" />,
    keywords: ["profit", "margin", "gross", "net", "cogs", "opex", "calculator", "finance", "money"],
  },
  {
    id: "tool_breakeven",
    title: "Break-Even Calculator",
    category: "Tools & Calculators",
    description: "Determine exact monthly transaction volume and revenue required to reach zero net burn.",
    badge: "Calculator",
    href: "/tools?tool=breakeven",
    icon: <Target className="w-4 h-4 text-cyan-400" />,
    keywords: ["breakeven", "break even", "zero burn", "fixed cost", "unit economics", "calculator"],
  },
  {
    id: "tool_cashflow",
    title: "Cash Flow Forecast",
    category: "Tools & Calculators",
    description: "Multi-month forward cash projections incorporating collections, net burn, and tax outlays.",
    badge: "Calculator",
    href: "/tools?tool=cashflow",
    icon: <DollarSign className="w-4 h-4 text-amber-400" />,
    keywords: ["cash flow", "cashflow", "runway", "forecast", "burn", "inflow", "outflow", "treasury"],
  },
  {
    id: "tool_cac",
    title: "CAC / LTV Calculator",
    category: "Tools & Calculators",
    description: "Model customer acquisition cost vs lifetime value, payback velocity, and retention.",
    badge: "Calculator",
    href: "/tools?tool=cac",
    icon: <TrendingUp className="w-4 h-4 text-purple-400" />,
    keywords: ["cac", "ltv", "customer acquisition", "payback", "marketing", "sales", "churn"],
  },
  {
    id: "tool_roi",
    title: "ROI Calculator",
    category: "Tools & Calculators",
    description: "Evaluate software licenses, capital expenditure, and vendor investment payback periods.",
    badge: "Calculator",
    href: "/tools?tool=roi",
    icon: <DollarSign className="w-4 h-4 text-emerald-400" />,
    keywords: ["roi", "return on investment", "capex", "payback", "software spend"],
  },
  {
    id: "tool_pricing",
    title: "Pricing Simulator",
    category: "Tools & Calculators",
    description: "Model tiered packaging, discounting thresholds, and margin impacts on buyers.",
    badge: "Simulator",
    href: "/tools?tool=pricing",
    icon: <Layers className="w-4 h-4 text-cyan-400" />,
    keywords: ["pricing", "tiers", "packages", "discounts", "rate card", "revenue ops"],
  },
  {
    id: "tool_hiring",
    title: "Hiring Simulator",
    category: "Tools & Calculators",
    description: "Fully loaded Indian payroll simulation including provident fund, benefits, and revenue lag.",
    badge: "Simulator",
    href: "/tools?tool=hiring",
    icon: <Users className="w-4 h-4 text-blue-400" />,
    keywords: ["hiring", "headcount", "salary", "payroll", "provident fund", "pf", "recruiting"],
  },
  {
    id: "tool_scenario",
    title: "Scenario Planner",
    category: "Tools & Calculators",
    description: "Macro stress-testing: inflation, demand contraction, and competitor price wars.",
    badge: "Simulator",
    href: "/tools?tool=scenario_planner",
    icon: <Compass className="w-4 h-4 text-violet-400" />,
    keywords: ["scenario", "macro", "stress test", "downside", "inflation", "risk"],
  },
  {
    id: "tool_simulator",
    title: "Runway & Decision Simulator",
    category: "Tools & Calculators",
    description: "Forward-looking scenario engine for burn shocks, hiring expansions, and solvency.",
    badge: "Simulator",
    href: "/simulator",
    icon: <Compass className="w-4 h-4 text-cyan-400" />,
    keywords: ["simulator", "runway", "burn shock", "solvency", "decision"],
  },

  // ==========================================
  // PAGES & NAVIGATION
  // ==========================================
  {
    id: "nav_dashboard",
    title: "Dashboard",
    category: "Pages & Navigation",
    description: "Executive mission control with live health score, runway, and daily briefing.",
    badge: "Page",
    href: "/dashboard",
    icon: <Layers className="w-4 h-4 text-cyan-400" />,
    keywords: ["dashboard", "home", "main", "overview", "health", "briefing"],
  },
  {
    id: "nav_gaps",
    title: "Gap Register & Playbooks",
    category: "Pages & Navigation",
    description: "Deterministic detection of operational bottlenecks with step-by-step resolution playbooks.",
    badge: "Page",
    href: "/gaps",
    icon: <ShieldAlert className="w-4 h-4 text-rust" />,
    keywords: ["gaps", "bottlenecks", "register", "playbooks", "problems", "solutions", "risk"],
  },
  {
    id: "nav_analytics",
    title: "Adaptive Analytics",
    category: "Pages & Navigation",
    description: "Deep unit economics telemetry, revenue breakdowns, and financial runway metrics.",
    badge: "Page",
    href: "/analytics",
    icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    keywords: ["analytics", "charts", "metrics", "kpi", "telemetry", "graphs", "revenue", "trends"],
  },
  {
    id: "nav_tasks",
    title: "Tasks & Execution Queue",
    category: "Pages & Navigation",
    description: "High-impact tactical initiatives, custom task creation, and team milestone tracking.",
    badge: "Page",
    href: "/tasks",
    icon: <CheckSquare className="w-4 h-4 text-purple-400" />,
    keywords: ["tasks", "execution", "todo", "in progress", "done", "milestones", "queue", "work"],
  },
  {
    id: "nav_tools",
    title: "Tools Catalog & Simulators",
    category: "Pages & Navigation",
    description: "Comprehensive repository of financial calculators, hiring models, and business tools.",
    badge: "Page",
    href: "/tools",
    icon: <Wrench className="w-4 h-4 text-amber-400" />,
    keywords: ["tools", "calculators", "catalog", "utilities", "all tools"],
  },
  {
    id: "nav_datapal",
    title: "DataPal™ Extraction Engine",
    category: "Pages & Navigation",
    description: "Extract verified business contacts, directories, phone numbers, and digital gap leads across India.",
    badge: "New",
    href: "/datapal",
    icon: <Database className="w-4 h-4 text-indigo-400" />,
    keywords: ["datapal", "data", "scraper", "leads", "contacts", "phone", "email", "extract", "directories", "b2b", "outreach"],
  },
  {
    id: "nav_reports",
    title: "Executive Briefings & Reports",
    category: "Pages & Navigation",
    description: "Automated daily, weekly, and monthly intelligence syntheses from AI executive team.",
    badge: "Page",
    href: "/reports",
    icon: <FileText className="w-4 h-4 text-cyan-400" />,
    keywords: ["reports", "briefings", "executive summary", "daily brief", "weekly digest"],
  },
  {
    id: "nav_automations",
    title: "Automations Engine",
    category: "Pages & Navigation",
    description: "Autonomous rule triggers, webhook responders, and anomaly notification engines.",
    badge: "Page",
    href: "/automations",
    icon: <Zap className="w-4 h-4 text-amber-400" />,
    keywords: ["automations", "triggers", "alerts", "rules", "bots"],
  },
  {
    id: "nav_workflows",
    title: "Workflows & SOPs",
    category: "Pages & Navigation",
    description: "Multi-stage cross-functional process pipelines and operational standardizations.",
    badge: "Page",
    href: "/workflows",
    icon: <GitFork className="w-4 h-4 text-blue-400" />,
    keywords: ["workflows", "sops", "pipeline", "process", "standard operating procedures"],
  },
  {
    id: "nav_integrations",
    title: "Integrations & Tools Setup",
    category: "Pages & Navigation",
    description: "Manage live connectors for Stripe, Slack, Zoho Books, Google Calendar, and Help Desk.",
    badge: "Page",
    href: "/integrations",
    icon: <Plug className="w-4 h-4 text-emerald-400" />,
    keywords: ["integrations", "stripe", "slack", "zoho", "google calendar", "zendesk", "connectors"],
  },
  {
    id: "nav_knowledge",
    title: "Knowledge Hub",
    category: "Pages & Navigation",
    description: "Institutional repository for company playbooks, market intelligence, and documents.",
    badge: "Page",
    href: "/knowledge",
    icon: <BookOpen className="w-4 h-4 text-purple-400" />,
    keywords: ["knowledge", "docs", "hub", "wiki", "playbooks", "library"],
  },
  {
    id: "nav_settings_tools",
    title: "Settings: Connected Tools & Daily Intake",
    category: "Pages & Navigation",
    description: "Modify connected business tools, manual data preferences, and WhatsApp daily check-in bot.",
    badge: "Settings",
    href: "/settings/tools",
    icon: <Settings className="w-4 h-4 text-text-muted" />,
    keywords: ["settings", "tools settings", "whatsapp", "phone", "preferences"],
  },
  {
    id: "nav_settings_appearance",
    title: "Settings: Appearance & Theme",
    category: "Pages & Navigation",
    description: "Configure dark, light, and system theme preferences.",
    badge: "Settings",
    href: "/settings/appearance",
    icon: <Settings className="w-4 h-4 text-text-muted" />,
    keywords: ["appearance", "theme", "dark mode", "light mode", "display"],
  },
  {
    id: "nav_team",
    title: "Team & Permissions",
    category: "Pages & Navigation",
    description: "Manage leadership team members, departmental responsibilities, and access levels.",
    badge: "Page",
    href: "/team",
    icon: <Users className="w-4 h-4 text-blue-400" />,
    keywords: ["team", "users", "roles", "permissions", "founder", "cfo", "cmo"],
  },
  {
    id: "nav_subscription",
    title: "Subscription & Billing",
    category: "Pages & Navigation",
    description: "View plan limits, enterprise license tiers, and invoicing receipts.",
    badge: "Page",
    href: "/subscription",
    icon: <CreditCard className="w-4 h-4 text-emerald-400" />,
    keywords: ["subscription", "plan", "billing", "pricing", "upgrade", "invoice"],
  },
  {
    id: "nav_chat",
    title: "AI Workspace & Copilot",
    category: "Pages & Navigation",
    description: "Chat with Astra (CEO), Marcus (CFO), and Elena (CMO) for strategic advisory.",
    badge: "AI Copilot",
    href: "/chat",
    icon: <Bot className="w-4 h-4 text-cyan-400" />,
    keywords: ["chat", "copilot", "ai", "astra", "marcus", "elena", "advisor"],
  },

  // ==========================================
  // BOTTLENECKS & GAPS
  // ==========================================
  {
    id: "gap_founder",
    title: "Founder Dependency & Key-Person Risk",
    category: "Bottlenecks & Gaps",
    description: "Over-reliance on founder for commercial deals, client deliveries, and firefighting.",
    badge: "Critical Gap",
    href: "/gaps",
    icon: <ShieldAlert className="w-4 h-4 text-rust" />,
    keywords: ["founder dependency", "key person", "bottleneck", "delegation", "firefighting"],
  },
  {
    id: "gap_runway",
    title: "Cash Runway Under 6 Months",
    category: "Bottlenecks & Gaps",
    description: "Current cash reserve vs net monthly burn puts company below 6-month safety threshold.",
    badge: "Critical Gap",
    href: "/gaps",
    icon: <ShieldAlert className="w-4 h-4 text-rust" />,
    keywords: ["cash runway", "solvency", "burn", "runway under 6 months", "capital"],
  },
  {
    id: "gap_client_concentration",
    title: "High Customer Concentration (>25%)",
    category: "Bottlenecks & Gaps",
    description: "Largest single account accounts for >25% of company revenue, risking insolvency if lost.",
    badge: "High Risk",
    href: "/gaps",
    icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
    keywords: ["concentration", "client concentration", "top customer", "revenue risk"],
  },
  {
    id: "gap_channel_concentration",
    title: "Single Channel Acquisition Risk (>60%)",
    category: "Bottlenecks & Gaps",
    description: "Over 60% of customer acquisition relies on a single ad platform or inbound source.",
    badge: "High Risk",
    href: "/gaps",
    icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
    keywords: ["channel concentration", "ad risk", "single channel", "acquisition"],
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTasks, setActiveTasks] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load tasks dynamically from SQLite
  useEffect(() => {
    if (isOpen) {
      fetch("/api/tasks")
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.tasks)) {
            const taskItems: SearchItem[] = data.tasks.slice(0, 10).map((t: any) => ({
              id: `task_${t.id}`,
              title: t.title,
              category: "Execution Tasks",
              description: `Owner: ${t.owner || "Team"} · Gap: ${t.gap || "General"} · Priority: ${(t.priority || "high").toUpperCase()}`,
              badge: t.status === "done" ? "Completed" : t.status === "in_progress" ? "In Progress" : "To Do",
              href: "/tasks",
              icon: <CheckSquare className={`w-4 h-4 ${t.status === "done" ? "text-emerald-400" : "text-purple-400"}`} />,
              keywords: [t.title.toLowerCase(), (t.owner || "").toLowerCase(), (t.gap || "").toLowerCase(), "task", t.status],
            }));
            setActiveTasks(taskItems);
          }
        })
        .catch(() => {
          // fallback silently
        });
    }
  }, [isOpen]);

  // Combine static and dynamic items
  const allItems = useMemo(() => {
    return [...STATIC_SEARCH_ITEMS, ...activeTasks];
  }, [activeTasks]);

  // Filter items based on query
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Return curated recommendations when query is empty
      return allItems.filter(item =>
        [
          "tool_profit",
          "tool_breakeven",
          "tool_cashflow",
          "tool_cac",
          "tool_simulator",
          "nav_dashboard",
          "nav_gaps",
          "nav_tasks",
          "nav_analytics",
          "nav_tools",
          "nav_integrations",
        ].includes(item.id)
      );
    }

    return allItems.filter(item => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.description && item.description.toLowerCase().includes(q)) return true;
      if (item.category.toLowerCase().includes(q)) return true;
      if (item.badge && item.badge.toLowerCase().includes(q)) return true;
      if (item.keywords && item.keywords.some(k => k.includes(q))) return true;
      return false;
    });
  }, [allItems, query]);

  // Group filtered items by category
  const groupedItems = useMemo(() => {
    const groups: { category: string; items: SearchItem[] }[] = [];
    const categoryOrder: SearchItem["category"][] = [
      "Tools & Calculators",
      "Pages & Navigation",
      "Execution Tasks",
      "Bottlenecks & Gaps",
    ];

    categoryOrder.forEach(cat => {
      const itemsInCat = filteredItems.filter(item => item.category === cat);
      if (itemsInCat.length > 0) {
        groups.push({ category: cat, items: itemsInCat });
      }
    });

    return groups;
  }, [filteredItems]);

  // Flatten items for keyboard index selection
  const flatItems = useMemo(() => {
    return groupedItems.flatMap(g => g.items);
  }, [groupedItems]);

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % (flatItems.length || 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + flatItems.length) % (flatItems.length || 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flatItems[selectedIndex]) {
          handleSelect(flatItems[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, flatItems, selectedIndex]);

  const handleSelect = (item: SearchItem) => {
    onClose();
    router.push(item.href);
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || typeof document === "undefined") return null;

  let runningIndex = -1;

  return createPortal(
    <div
      className="fixed inset-0 m-0 z-[9999] bg-slate-900/60 dark:bg-black/85 backdrop-blur-md flex items-start justify-center p-4 sm:pt-20 animate-fade-in"
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0 }}
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full bg-white dark:bg-[#0C1222] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl dark:shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh] animate-scale-in text-slate-900 dark:text-slate-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Search Input Box */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center gap-3 bg-slate-50/80 dark:bg-white/[0.02]">
          <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tools, calculators, tasks, pages, metrics… (e.g. 'profit', 'breakeven')"
            className="flex-1 bg-transparent border-0 text-slate-900 dark:text-white text-sm focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10 text-xs transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-mono font-semibold shadow-xs">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-4 bg-white dark:bg-[#0C1222]">
          {flatItems.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-900 dark:text-white">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Try searching for &ldquo;profit&rdquo;, &ldquo;breakeven&rdquo;, &ldquo;runway&rdquo;, &ldquo;tasks&rdquo;, or &ldquo;gaps&rdquo;.</p>
            </div>
          ) : (
            groupedItems.map(group => (
              <div key={group.category} className="space-y-1.5">
                <div className="px-3 text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-400 flex items-center justify-between">
                  <span>{group.category}</span>
                  <span className="font-mono text-[9px] font-medium lowercase text-slate-400 dark:text-slate-400">
                    {group.items.length} {group.items.length === 1 ? "result" : "results"}
                  </span>
                </div>

                <div className="space-y-1">
                  {group.items.map(item => {
                    runningIndex++;
                    const itemIndex = runningIndex;
                    const isSelected = itemIndex === selectedIndex;

                    return (
                      <div
                        key={item.id}
                        data-index={itemIndex}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(itemIndex)}
                        className={`px-3 py-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "bg-cyan-50/90 dark:bg-cyan-500/15 border-cyan-300 dark:border-cyan-500/40 shadow-xs"
                            : "bg-slate-50/70 dark:bg-white/[0.03] border-slate-200/60 dark:border-transparent hover:border-slate-300 dark:hover:border-white/10 hover:bg-slate-100/90 dark:hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-cyan-100 dark:bg-cyan-500/25 border-cyan-300 dark:border-cyan-500/50 text-cyan-700 dark:text-cyan-300"
                                : "bg-white dark:bg-white/[0.05] border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 shadow-xs"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold truncate ${isSelected ? "text-cyan-950 dark:text-white" : "text-slate-900 dark:text-slate-100"}`}>
                                {item.title}
                              </span>
                              {item.badge && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold uppercase bg-slate-100 dark:bg-white/[0.08] border border-slate-200 dark:border-white/10 text-cyan-700 dark:text-cyan-400">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 max-w-md">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {isSelected && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-medium">
                              Press <CornerDownLeft className="w-3 h-3" /> to open
                            </span>
                          )}
                          <ChevronRight
                            className={`w-4 h-4 transition-transform ${
                              isSelected ? "text-cyan-600 dark:text-cyan-400 translate-x-0.5" : "text-slate-300 dark:text-slate-600"
                            }`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bottom Keyboard Hint Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-white/[0.02] text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 font-mono text-[9px] text-slate-600 dark:text-slate-300 shadow-xs">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 font-mono text-[9px] text-slate-600 dark:text-slate-300 shadow-xs">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 font-mono text-[9px] text-slate-600 dark:text-slate-300 shadow-xs">↵</kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-white/[0.06] border border-slate-200 dark:border-white/10 font-mono text-[9px] text-slate-600 dark:text-slate-300 shadow-xs">esc</kbd>
              <span>to close</span>
            </span>
          </div>

          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
            {query ? `Filter active` : `Search across all tools & pages`}
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

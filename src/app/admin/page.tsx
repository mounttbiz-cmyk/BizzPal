"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  Globe,
  Compass,
  Sliders,
  Layers,
  Wrench,
  History,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  RotateCcw,
  ExternalLink,
  Check,
  X,
  Film,
  Type,
  Eye,
  EyeOff,
  ShieldCheck,
  MessageSquare,
  Search,
  DollarSign,
  ChevronRight,
  Menu,
  ArrowLeft,
  LogOut,
  Building2,
  Users,
  CreditCard,
  Megaphone,
} from "lucide-react";
import { NavItem } from "@/config/schemas/nav";
import { WidgetDef } from "@/config/schemas/widget";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { StatusBadge } from "@/components/ui/Badge";
import { DataPalFeatureFlagsSection } from "@/components/admin/DataPalFeatureFlagsSection";
import { TenantsManager } from "./components/TenantsManager";
import { UsersManager } from "./components/UsersManager";
import { PricingManager } from "./components/PricingManager";
import { WebsiteCmsExtra } from "./components/WebsiteCmsExtra";
import { defaultNavItems } from "@/config/seeds/defaultNav";
import { defaultWidgets } from "@/config/seeds/defaultWidgets";
import {
  DEFAULT_TOOLS_CATALOG,
  DEFAULT_SUBSCRIPTION_PLANS,
  DEFAULT_DASHBOARD_FEATURES,
} from "@/config/seeds/defaultCatalog";
import { DEFAULT_WEBSITE_STATE } from "@/website/hooks/useWebsiteConfig";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "website" | "navigation" | "features" | "widgets" | "tools" | "tenants" | "users" | "plans" | "audit"
  >("tenants");
  const [subWebTab, setSubWebTab] = useState<
    "sections" | "hero" | "scenes" | "about_solutions" | "contact" | "nav_brand" | "vision_words" | "announcement"
  >("sections");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState(1);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Platform dynamic configs with resilient seed fallbacks
  const [websiteConfig, setWebsiteConfig] = useState<any>(DEFAULT_WEBSITE_STATE);
  const [featuresConfig, setFeaturesConfig] = useState<any>(DEFAULT_DASHBOARD_FEATURES);
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);
  const [widgets, setWidgets] = useState<WidgetDef[]>(defaultWidgets);
  const [tools, setTools] = useState<any[]>(DEFAULT_TOOLS_CATALOG);
  const [plans, setPlans] = useState<any[]>(DEFAULT_SUBSCRIPTION_PLANS);

  // Multi-tenant & user state
  const [tenants, setTenants] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [platformStats, setPlatformStats] = useState<any>({
    totalBusinesses: 0,
    totalUsers: 0,
    totalAnnualRevenue: 0,
    totalMonthlyRevenue: 0,
    totalCashReserves: 0,
    totalMonthlyBurn: 0,
  });

  // Navigation Modal State
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [editingNavItem, setEditingNavItem] = useState<NavItem | null>(null);
  const [navForm, setNavForm] = useState<{
    id: string;
    label: string;
    href: string;
    icon: string;
    order: number;
    badge: string;
    group: "core" | "intelligence" | "management" | "system";
    enabled: boolean;
  }>({
    id: "",
    label: "",
    href: "",
    icon: "LayoutDashboard",
    order: 1,
    badge: "",
    group: "core",
    enabled: true,
  });

  // Widget Modal State
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<WidgetDef | null>(null);
  const [widgetForm, setWidgetForm] = useState<{
    id: string;
    title: string;
    component: string;
    defaultSpan: 1 | 2 | 3 | 4;
    priority: number;
    enabled: boolean;
  }>({
    id: "",
    title: "",
    component: "KpiGridWidget",
    defaultSpan: 2,
    priority: 85,
    enabled: true,
  });

  // Tool Modal State
  const [isToolModalOpen, setIsToolModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<any | null>(null);
  const [toolForm, setToolForm] = useState<{
    id: string;
    name: string;
    category: "finance" | "sales" | "marketing" | "operations" | "strategy";
    description: string;
    requiredPlan: "free" | "starter" | "growth" | "enterprise";
    badge: string;
    hasInteractiveCalculator: boolean;
    enabled: boolean;
  }>({
    id: "",
    name: "",
    category: "finance",
    description: "",
    requiredPlan: "starter",
    badge: "Core",
    hasInteractiveCalculator: false,
    enabled: true,
  });

  // Close any open modal on Escape key
  const isAnyModalOpen = Boolean(isNavModalOpen || isWidgetModalOpen || isToolModalOpen);
  useEscapeKey(() => {
    setIsNavModalOpen(false);
    setIsWidgetModalOpen(false);
    setIsToolModalOpen(false);
  }, isAnyModalOpen);

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyModalOpen]);

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch tenants and registered users
  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/admin/tenants", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data) {
        setTenants(data.data.businesses || []);
        setUsersList(data.data.users || []);
        if (data.data.stats) setPlatformStats(data.data.stats);
      }
    } catch (err) {
      console.error("Failed to load tenants", err);
    }
  };

  // Fetch full configuration on mount with instant localStorage hydration
  const fetchAllConfig = async () => {
    try {
      setLoading(true);
      if (typeof window !== "undefined") {
        try {
          const sw = localStorage.getItem("bizzpal_website_config");
          if (sw) setWebsiteConfig(JSON.parse(sw));
          const st = localStorage.getItem("bizzpal_tools_catalog");
          if (st) setTools(JSON.parse(st));
          const sn = localStorage.getItem("bizzpal_dashboard_nav");
          if (sn) setNavItems(JSON.parse(sn));
          const swi = localStorage.getItem("bizzpal_dashboard_widgets");
          if (swi) setWidgets(JSON.parse(swi));
          const sf = localStorage.getItem("bizzpal_dashboard_features");
          if (sf) setFeaturesConfig(JSON.parse(sf));
          const sp = localStorage.getItem("bizzpal_subscription_plans");
          if (sp) setPlans(JSON.parse(sp));
        } catch {}
      }

      const res = await fetch("/api/admin/config", {
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.data) {
          if (data.data.website) {
            setWebsiteConfig(data.data.website);
            try { localStorage.setItem("bizzpal_website_config", JSON.stringify(data.data.website)); } catch {}
          }
          if (data.data.features) {
            setFeaturesConfig(data.data.features);
            try { localStorage.setItem("bizzpal_dashboard_features", JSON.stringify(data.data.features)); } catch {}
          }
          if (Array.isArray(data.data.nav) && data.data.nav.length > 0) {
            setNavItems(data.data.nav);
            try { localStorage.setItem("bizzpal_dashboard_nav", JSON.stringify(data.data.nav)); } catch {}
          }
          if (Array.isArray(data.data.widgets) && data.data.widgets.length > 0) {
            setWidgets(data.data.widgets);
            try { localStorage.setItem("bizzpal_dashboard_widgets", JSON.stringify(data.data.widgets)); } catch {}
          }
          if (Array.isArray(data.data.tools) && data.data.tools.length > 0) {
            setTools(data.data.tools);
            try { localStorage.setItem("bizzpal_tools_catalog", JSON.stringify(data.data.tools)); } catch {}
          }
          if (Array.isArray(data.data.plans) && data.data.plans.length > 0) {
            setPlans(data.data.plans);
            try { localStorage.setItem("bizzpal_subscription_plans", JSON.stringify(data.data.plans)); } catch {}
          }
          if (Array.isArray(data.data.auditLogs)) setAuditLogs(data.data.auditLogs);
          if (data.data.version) setVersion(data.data.version);
        }
      }
      await fetchTenants();
    } catch (err: any) {
      console.error("Failed to load admin config", err);
      // Ensure seed defaults remain active so counters and CMS never display as blank or (0)
      setWebsiteConfig((prev: any) => prev || DEFAULT_WEBSITE_STATE);
      setNavItems((prev) => (prev && prev.length > 0 ? prev : defaultNavItems));
      setWidgets((prev) => (prev && prev.length > 0 ? prev : defaultWidgets));
      setTools((prev) => (prev && prev.length > 0 ? prev : DEFAULT_TOOLS_CATALOG));
      setPlans((prev) => (prev && prev.length > 0 ? prev : DEFAULT_SUBSCRIPTION_PLANS));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllConfig();
  }, []);

  // Save specific section to database & mirror to localStorage for instant website and dashboard sync
  const saveSection = async (sectionName: string, payload: any, note?: string) => {
    try {
      setSaving(true);
      // 1. Immediately mirror to localStorage so website and dashboard reflect instantly on same domain
      if (typeof window !== "undefined") {
        try {
          if (sectionName === "website") localStorage.setItem("bizzpal_website_config", JSON.stringify(payload));
          if (sectionName === "tools") localStorage.setItem("bizzpal_tools_catalog", JSON.stringify(payload));
          if (sectionName === "nav") localStorage.setItem("bizzpal_dashboard_nav", JSON.stringify(payload));
          if (sectionName === "widgets") localStorage.setItem("bizzpal_dashboard_widgets", JSON.stringify(payload));
          if (sectionName === "features") localStorage.setItem("bizzpal_dashboard_features", JSON.stringify(payload));
          if (sectionName === "plans") localStorage.setItem("bizzpal_subscription_plans", JSON.stringify(payload));
          localStorage.setItem("bizzpal_config_timestamp", String(Date.now()));
          window.dispatchEvent(new CustomEvent("bizzpal_config_updated", { detail: { section: sectionName } }));
          try {
            const bc = new BroadcastChannel("bizzpal_channel");
            bc.postMessage({ type: "bizzpal_config_updated", section: sectionName });
            bc.close();
          } catch {}
        } catch {}
      }

      // 2. Persist to server
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          section: sectionName,
          payload,
          note: note || `Updated ${sectionName} settings`,
          actor: "Superadmin",
        }),
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        const isHtml = text.includes("<html") || text.includes("<!DOCTYPE");
        throw new Error(isHtml ? "The server was temporarily busy or recompiling. Please retry in a moment." : (text.slice(0, 100) || `HTTP ${res.status}`));
      }
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Server returned HTTP ${res.status}`);
      }
      if (data.version) setVersion(data.version);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      notify("Changes saved successfully");
    } catch (err: any) {
      notify(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Factory Reset
  const handleFactoryReset = async () => {
    const ok = window.confirm(
      "Are you sure you want to restore all website and dashboard settings to default factory values? This cannot be undone."
    );
    if (!ok) return;

    try {
      setSaving(true);
      const res = await fetch("/api/admin/config", {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        const isHtml = text.includes("<html") || text.includes("<!DOCTYPE");
        throw new Error(isHtml ? "The server was temporarily busy or recompiling. Please retry in a moment." : (text.slice(0, 100) || `HTTP ${res.status}`));
      }
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Server returned HTTP ${res.status}`);
      }
      if (data.data) {
        if (data.data.website) setWebsiteConfig(data.data.website);
        if (data.data.features) setFeaturesConfig(data.data.features);
        setNavItems(data.data.nav || defaultNavItems);
        setWidgets(data.data.widgets || defaultWidgets);
        setTools(data.data.tools || DEFAULT_TOOLS_CATALOG);
        setPlans(data.data.plans || DEFAULT_SUBSCRIPTION_PLANS);
        if (data.data.auditLogs) setAuditLogs(data.data.auditLogs);
        if (data.data.version) setVersion(data.data.version);
      } else {
        setNavItems(defaultNavItems);
        setWidgets(defaultWidgets);
        setTools(DEFAULT_TOOLS_CATALOG);
        setPlans(DEFAULT_SUBSCRIPTION_PLANS);
      }
      notify("Platform restored to default factory settings");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("bizzpal_config_updated", { detail: { section: "all", reset: true } }));
        try {
          localStorage.setItem("bizzpal_config_timestamp", String(Date.now()));
        } catch {}
        try {
          const bc = new BroadcastChannel("bizzpal_channel");
          bc.postMessage({ type: "bizzpal_config_updated", section: "all", reset: true });
          bc.close();
        } catch {}
      }

      fetchAllConfig();
    } catch (err: any) {
      notify(`Reset failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // -------------------------------------------------------------
  // Navigation CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenNavModal = (item?: NavItem) => {
    if (item) {
      setEditingNavItem(item);
      setNavForm({
        id: item.id,
        label: item.label,
        href: item.href,
        icon: item.icon,
        order: item.order,
        badge: item.badge || "",
        group: item.group || "core",
        enabled: item.enabled !== false,
      });
    } else {
      setEditingNavItem(null);
      setNavForm({
        id: `nav_custom_${Date.now()}`,
        label: "",
        href: "/new-feature",
        icon: "Compass",
        order: navItems.length + 1,
        badge: "NEW",
        group: "core",
        enabled: true,
      });
    }
    setIsNavModalOpen(true);
  };

  const handleSaveNavItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navForm.label.trim() || !navForm.href.trim()) return;

    let updatedList: NavItem[];
    if (editingNavItem) {
      updatedList = navItems.map((n) =>
        n.id === editingNavItem.id
          ? { ...n, ...navForm, order: Number(navForm.order) }
          : n
      );
    } else {
      const newItem: NavItem = {
        id: navForm.id,
        label: navForm.label,
        href: navForm.href,
        icon: navForm.icon,
        order: Number(navForm.order),
        badge: navForm.badge || undefined,
        group: navForm.group,
        enabled: navForm.enabled,
        mobileTab: false,
      };
      updatedList = [...navItems, newItem];
    }

    setNavItems(updatedList);
    setIsNavModalOpen(false);
    await saveSection(
      "nav",
      updatedList,
      editingNavItem ? `Updated nav item "${navForm.label}"` : `Added nav button "${navForm.label}"`
    );
  };

  const handleDeleteNavItem = async (id: string, label: string) => {
    if (!window.confirm(`Delete navigation button "${label}"?`)) return;
    const updatedList = navItems.filter((n) => n.id !== id);
    setNavItems(updatedList);
    await saveSection("nav", updatedList, `Removed nav button "${label}"`);
  };

  const handleToggleNavItem = async (item: NavItem) => {
    const updatedList = navItems.map((n) =>
      n.id === item.id ? { ...n, enabled: !n.enabled } : n
    );
    setNavItems(updatedList);
    await saveSection(
      "nav",
      updatedList,
      `Toggled nav "${item.label}" (${!item.enabled ? "enabled" : "disabled"})`
    );
  };

  // -------------------------------------------------------------
  // Feature Flags Toggle Handlers
  // -------------------------------------------------------------
  const handleToggleFeature = async (featureKey: string) => {
    if (!featuresConfig) return;
    const updated = {
      ...featuresConfig,
      [featureKey]: !featuresConfig[featureKey],
    };
    setFeaturesConfig(updated);
    await saveSection("features", updated, `Toggled feature flag "${featureKey}"`);
  };

  // -------------------------------------------------------------
  // Widget CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenWidgetModal = (w?: WidgetDef) => {
    if (w) {
      setEditingWidget(w);
      setWidgetForm({
        id: w.id,
        title: w.title,
        component: w.component,
        defaultSpan: w.defaultSpan,
        priority: w.priority,
        enabled: w.enabled !== false,
      });
    } else {
      setEditingWidget(null);
      setWidgetForm({
        id: `widget_${Date.now()}`,
        title: "",
        component: "KpiGridWidget",
        defaultSpan: 2,
        priority: 85,
        enabled: true,
      });
    }
    setIsWidgetModalOpen(true);
  };

  const handleSaveWidget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!widgetForm.title.trim()) return;

    let updatedList: WidgetDef[];
    if (editingWidget) {
      updatedList = widgets.map((w) =>
        w.id === editingWidget.id
          ? { ...w, ...widgetForm, defaultSpan: Number(widgetForm.defaultSpan) as any, priority: Number(widgetForm.priority) }
          : w
      );
    } else {
      const newW: WidgetDef = {
        id: widgetForm.id,
        title: widgetForm.title,
        component: widgetForm.component,
        defaultSpan: Number(widgetForm.defaultSpan) as any,
        priority: Number(widgetForm.priority),
        enabled: widgetForm.enabled,
        minContainerWidth: 300,
        requires: {},
      };
      updatedList = [...widgets, newW];
    }

    setWidgets(updatedList);
    setIsWidgetModalOpen(false);
    await saveSection(
      "widgets",
      updatedList,
      editingWidget ? `Updated widget "${widgetForm.title}"` : `Added custom widget "${widgetForm.title}"`
    );
  };

  const handleDeleteWidget = async (id: string, title: string) => {
    if (!window.confirm(`Delete widget "${title}"?`)) return;
    const updatedList = widgets.filter((w) => w.id !== id);
    setWidgets(updatedList);
    await saveSection("widgets", updatedList, `Removed widget "${title}"`);
  };

  const handleToggleWidget = async (widget: WidgetDef) => {
    const updatedList = widgets.map((w) =>
      w.id === widget.id ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(updatedList);
    await saveSection(
      "widgets",
      updatedList,
      `Toggled widget "${widget.title}" (${!widget.enabled ? "enabled" : "disabled"})`
    );
  };

  // -------------------------------------------------------------
  // Tool CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenToolModal = (t?: any) => {
    if (t) {
      setEditingTool(t);
      setToolForm({
        id: t.id,
        name: t.name,
        category: t.category,
        description: t.description,
        requiredPlan: t.requiredPlan || "starter",
        badge: t.badge || "Core",
        hasInteractiveCalculator: Boolean(t.hasInteractiveCalculator),
        enabled: t.enabled !== false,
      });
    } else {
      setEditingTool(null);
      setToolForm({
        id: `tool_${Date.now()}`,
        name: "",
        category: "finance",
        description: "",
        requiredPlan: "starter",
        badge: "New",
        hasInteractiveCalculator: false,
        enabled: true,
      });
    }
    setIsToolModalOpen(true);
  };

  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolForm.name.trim()) return;

    let updatedList: any[];
    if (editingTool) {
      updatedList = tools.map((t) =>
        t.id === editingTool.id ? { ...t, ...toolForm } : t
      );
    } else {
      updatedList = [...tools, { ...toolForm }];
    }

    setTools(updatedList);
    setIsToolModalOpen(false);
    await saveSection(
      "tools",
      updatedList,
      editingTool ? `Updated tool "${toolForm.name}"` : `Added tool "${toolForm.name}"`
    );
  };

  const handleDeleteTool = async (id: string, name: string) => {
    if (!window.confirm(`Delete tool "${name}"?`)) return;
    const updatedList = tools.filter((t) => t.id !== id);
    setTools(updatedList);
    await saveSection("tools", updatedList, `Removed tool "${name}"`);
  };

  const handleToggleTool = async (t: any) => {
    const isCurrentlyEnabled = t.enabled !== false;
    const toolName = t.name || t.id || "Tool";
    const updatedList = tools.map((item) =>
      item.id === t.id ? { ...item, enabled: !isCurrentlyEnabled } : item
    );
    setTools(updatedList);
    await saveSection(
      "tools",
      updatedList,
      `Toggled tool "${toolName}" (${isCurrentlyEnabled ? "disabled" : "enabled"})`
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
        <p className="text-xs font-semibold text-text-muted font-mono">
          Loading Superadmin...
        </p>
      </div>
    );
  }

  const breadcrumb = (() => {
    switch (activeTab) {
      case "website":
        return {
          group: "Marketing & CMS",
          current:
            subWebTab === "sections"
              ? "Section Visibility & Toggles"
              : subWebTab === "hero"
              ? "Hero Copy & Primary Buttons"
              : subWebTab === "scenes"
              ? "Story Scenes (01 - 07)"
              : subWebTab === "about_solutions"
              ? "About & Solutions Cards"
              : subWebTab === "contact"
              ? "Contact Info & Channels"
              : subWebTab === "nav_brand"
              ? "Navbar Links & Brand"
              : subWebTab === "vision_words"
              ? "Vision Rotating Words"
              : "Announcement Banner",
        };
      case "tenants":
        return { group: "Multi-Tenant Platform", current: "Registered Enterprises & Businesses" };
      case "users":
        return { group: "Multi-Tenant Platform", current: "User Accounts Ledger" };
      case "plans":
        return { group: "Monetization & Commercial", current: "Pricing & Subscription Tiers" };
      case "navigation":
        return { group: "Executive Dashboard", current: "Navigation Buttons" };
      case "features":
        return { group: "Executive Dashboard", current: "Platform Feature Toggles" };
      case "widgets":
        return { group: "Executive Dashboard", current: "Dashboard Widgets" };
      case "tools":
        return { group: "Specialist Engines", current: "Tools Catalog & Calculators" };
      case "audit":
        return { group: "Governance & Security", current: "Audit Ledger & Version History" };
      default:
        return { group: "Superadmin", current: "Overview" };
    }
  })();

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {}
    localStorage.removeItem("bizzpal_admin_session");
    window.location.href = "/admin/login";
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col lg:flex-row relative selection:bg-gold/30 selection:text-gold overflow-x-hidden">
      {/* Ambient background radiant aura mesh matching 3D Gold Logo */}
      <div className="fixed top-[-10%] left-[20%] w-[650px] h-[350px] bg-gradient-to-br from-gold/10 via-gold/5 to-transparent blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-10%] right-[15%] w-[550px] h-[350px] bg-gradient-to-tl from-gold/10 via-gold/5 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[1000] px-4 py-3 rounded-xl bg-surface/95 text-text border border-gold/30 shadow-2xl shadow-[0_16px_40px_-10px_var(--gold-glow)] flex items-center gap-2.5 text-xs font-semibold animate-fade-in backdrop-blur-md">
          {toastMessage.toLowerCase().includes("error") || toastMessage.toLowerCase().includes("failed") ? (
            <AlertCircle className="w-4 h-4 text-rust shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-jade shrink-0" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* PERSISTENT MODERN LEFT SIDEBAR                                            */}
      {/* ========================================================================= */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-surface/80 backdrop-blur-xl border-r border-line/60 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 shrink-0 shadow-2xl lg:shadow-none ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Brand & Status Header */}
        <div className="p-4 border-b border-line/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <Image
                  src="/logo-icon.png"
                  alt="BizzPal Logo"
                  width={28}
                  height={28}
                  className="object-contain drop-shadow"
                />
              </div>
              <div>
                <h1 className="text-sm font-bold text-text tracking-tight flex items-center gap-1.5">
                  <span className="font-black text-base flex items-center leading-none">
                    <span>Bizz</span>
                    <span
                      className="font-black ml-0.5"
                      style={{
                        background: "linear-gradient(135deg, #F7ECD1 0%, #DFBA73 50%, #A37C2C 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        color: "#DFBA73",
                        display: "inline-block",
                      }}
                    >
                      Pal
                    </span>
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold font-mono font-bold border border-gold/30">PRO</span>
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-text-muted font-mono tracking-wider uppercase">Superadmin Engine</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sidebar Categorized Navigation */}
        <div className="p-3 flex-1 overflow-y-auto space-y-5 text-xs">
          {/* GROUP 0: MULTI-TENANT PLATFORM */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Multi-Tenant Platform
            </div>
            {[
              { id: "tenants", tab: "tenants", label: "Registered Enterprises", icon: Building2, badge: `${tenants.length}` },
              { id: "users", tab: "users", label: "User Accounts Ledger", icon: Users, badge: `${usersList.length}` },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.tab as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
                    isActive
                      ? "bg-gold/[0.12] text-gold border border-gold/30 font-bold"
                      : "text-text-muted hover:text-text hover:bg-surface-2/80 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-line font-mono text-text-muted">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* GROUP 1: MONETIZATION & COMMERCIAL */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Commercial & Pricing
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab("plans");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
                activeTab === "plans"
                  ? "bg-gold/[0.12] text-gold border border-gold/30 font-bold"
                  : "text-text-muted hover:text-text hover:bg-surface-2/80 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4" />
                <span>Subscription Plans</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-line font-mono text-text-muted">
                {plans.length}
              </span>
            </button>
          </div>

          {/* GROUP 2: MARKETING & CMS */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Marketing & Website CMS
            </div>
            {[
              { id: "website_sections", tab: "website", sub: "sections", label: "Section Visibility", icon: Eye, badge: "14" },
              { id: "website_hero", tab: "website", sub: "hero", label: "Hero Copy & CTAs", icon: Globe },
              { id: "website_scenes", tab: "website", sub: "scenes", label: "Story Scenes (01-07)", icon: Film, badge: "7" },
              { id: "website_about", tab: "website", sub: "about_solutions", label: "About & Solutions", icon: Layers },
              { id: "website_contact", tab: "website", sub: "contact", label: "Contact & Channels", icon: MessageSquare },
              { id: "website_nav", tab: "website", sub: "nav_brand", label: "Navbar Links & Brand", icon: Globe },
              { id: "website_vision", tab: "website", sub: "vision_words", label: "Vision Kinetic Words", icon: Type },
              { id: "website_announcement", tab: "website", sub: "announcement", label: "Announcement Bar", icon: Megaphone },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab && subWebTab === item.sub;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.tab as any);
                    setSubWebTab(item.sub as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
                    isActive
                      ? "bg-gold/[0.12] text-gold border border-gold/30 font-bold"
                      : "text-text-muted hover:text-text hover:bg-surface-2/80 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-line font-mono text-text-muted">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* GROUP 2: EXECUTIVE DASHBOARD */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Executive Dashboard
            </div>
            {[
              { id: "navigation", tab: "navigation", label: "Navigation Buttons", icon: Compass, badge: `${navItems.length}` },
              { id: "widgets", tab: "widgets", label: "Dashboard Widgets", icon: Layers, badge: `${widgets.length}` },
              { id: "features", tab: "features", label: "Feature Toggles", icon: Sliders, badge: `${featuresConfig ? Object.values(featuresConfig).filter(Boolean).length : 0}` },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.tab;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.tab as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
                    isActive
                      ? "bg-gold/[0.12] text-gold border border-gold/30 font-bold"
                      : "text-text-muted hover:text-text hover:bg-surface-2/80 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-line font-mono text-text-muted">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* GROUP 3: SPECIALIST ENGINES */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Specialist Engines
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab("tools");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
                activeTab === "tools"
                  ? "bg-gold/[0.12] text-gold border border-gold/30 font-bold"
                  : "text-text-muted hover:text-text hover:bg-surface-2/80 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Wrench className="w-4 h-4" />
                <span>Tools & Calculators</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gold/15 text-gold font-mono font-bold border border-gold/30">
                {tools.length}
              </span>
            </button>
          </div>

          {/* GROUP 4: GOVERNANCE & SECURITY */}
          <div className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
              Governance & Security
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveTab("audit");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all font-semibold cursor-pointer ${
                activeTab === "audit"
                  ? "bg-gold/[0.12] text-gold border border-gold/30 font-bold"
                  : "text-text-muted hover:text-text hover:bg-surface-2/80 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4" />
                <span>Audit Ledger</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-2 border border-line font-mono text-text-muted">
                {auditLogs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={handleFactoryReset}
              disabled={saving}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors font-semibold cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Factory Reset</span>
            </button>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-3.5 border-t border-line space-y-2.5 bg-surface-2/40">
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-[11px] font-semibold bg-surface border border-line hover:border-gold/40 text-text hover:text-gold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Website ↗</span>
            </a>
            <a
              href="/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-[11px] font-semibold bg-surface border border-line hover:border-gold/40 text-text hover:text-gold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>App ↗</span>
            </a>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="w-28">
              <ThemeSwitch compact />
            </div>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="text-xs text-text-muted hover:text-rose-500 p-1.5 rounded-lg border border-line hover:bg-rose-500/10 transition-colors flex items-center gap-1.5 font-semibold cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN WORKSPACE CANVAS                                                     */}
      {/* ========================================================================= */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Sticky Workspace Top Bar */}
        <header className="sticky top-0 z-30 h-16 bg-surface/75 backdrop-blur-xl border-b border-line/60 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-surface-2 border border-line text-text-muted hover:text-text cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
              <span className="text-text-muted/70 hidden sm:inline">{breadcrumb.group}</span>
              <span className="text-text-muted/50 hidden sm:inline">/</span>
              <span className="text-text font-bold tracking-tight truncate">{breadcrumb.current}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live System Pulse Indicator */}
            <div className="hidden xl:flex">
              <StatusBadge label="Superadmin Secure" tone="live" pulse />
            </div>

            <Link
              href="/dashboard"
              className="hidden md:flex items-center gap-1.5 text-xs text-text-muted hover:text-text px-3 py-1.5 rounded-xl border border-line/70 hover:border-gold/40 hover:bg-surface-2 transition-all font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Exit to App</span>
            </Link>

            {/* Contextual Quick Actions */}
            {activeTab === "navigation" && (
              <button
                type="button"
                onClick={() => handleOpenNavModal()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#1a1206] btn-gold-gradient flex items-center gap-1.5 transition-all shadow-lg shadow-[0_8px_20px_-6px_var(--gold-glow)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Nav Button</span>
              </button>
            )}

            {activeTab === "widgets" && (
              <button
                type="button"
                onClick={() => handleOpenWidgetModal()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#1a1206] btn-gold-gradient flex items-center gap-1.5 transition-all shadow-lg shadow-[0_8px_20px_-6px_var(--gold-glow)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Widget</span>
              </button>
            )}

            {activeTab === "tools" && (
              <button
                type="button"
                onClick={() => handleOpenToolModal()}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#1a1206] btn-gold-gradient flex items-center gap-1.5 transition-all shadow-lg shadow-[0_8px_20px_-6px_var(--gold-glow)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tool</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Workspace Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (activeTab === "website" ? subWebTab : "")}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="space-y-6"
            >

      {/* ============================================================= */}
      {/* TAB: MULTI-TENANT ENTERPRISES & USERS                         */}
      {/* ============================================================= */}
      {activeTab === "tenants" && (
        <TenantsManager
          tenants={tenants}
          stats={platformStats}
          onRefresh={fetchTenants}
          notify={notify}
        />
      )}

      {activeTab === "users" && (
        <UsersManager
          users={usersList}
          onRefresh={fetchTenants}
          notify={notify}
        />
      )}

      {/* ============================================================= */}
      {/* TAB: SUBSCRIPTION PLANS & COMMERCIAL                          */}
      {/* ============================================================= */}
      {activeTab === "plans" && (
        <PricingManager
          plans={plans}
          onSave={async (updated, note) => {
            await saveSection("plans", updated, note || "Updated subscription pricing tiers");
          }}
          notify={notify}
          saving={saving}
        />
      )}

      {/* ============================================================= */}
      {/* TAB 1: WEBSITE CONTENT & CTAs                                 */}
      {/* ============================================================= */}
      {activeTab === "website" && (
        <div className="space-y-6">
          {/* Website Subtabs */}
          <div className="flex items-center gap-2 border-b border-line pb-2 text-xs font-semibold overflow-x-auto">
            {[
              { id: "sections", label: "1. Section Toggles" },
              { id: "hero", label: "2. Hero Copy & CTAs" },
              { id: "scenes", label: "3. Story Scenes (01 - 07)" },
              { id: "about_solutions", label: "4. About & Solutions" },
              { id: "contact", label: "5. Contact Info & Socials" },
              { id: "nav_brand", label: "6. Navbar Links & Brand" },
              { id: "vision_words", label: "7. Vision Kinetic Words" },
              { id: "announcement", label: "8. Announcement Banner" },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSubWebTab(st.id as any)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap ${
                  subWebTab === st.id
                    ? "bg-surface-2 text-gold font-bold"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Subtab: Section Visibility Switches */}
          {subWebTab === "sections" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text">Website Section Toggles</h2>
                  <p className="text-xs text-text-muted mt-0.5">
                    Toggle entire sections on or off. Changes immediately affect the marketing homepage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved section visibility switches")}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Visibility Changes"}</span>
                </button>
              </div>

              {/* Announcement Banner Box */}
              <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text">Top Announcement Banner</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold font-mono">Optional</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = {
                        ...websiteConfig,
                        announcement: {
                          ...websiteConfig.announcement,
                          enabled: !websiteConfig.announcement?.enabled,
                        },
                      };
                      setWebsiteConfig(updated);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                      websiteConfig.announcement?.enabled
                        ? "bg-jade/15 border-jade/40 text-jade"
                        : "bg-surface-2 border-line text-text-muted"
                    }`}
                  >
                    {websiteConfig.announcement?.enabled ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
                {websiteConfig.announcement?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] text-text-muted font-medium">Banner Text</label>
                      <input
                        type="text"
                        value={websiteConfig.announcement?.text || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            announcement: { ...websiteConfig.announcement, text: e.target.value },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-gold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-text-muted font-medium">Link Text & URL</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Text"
                          value={websiteConfig.announcement?.linkText || ""}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              announcement: { ...websiteConfig.announcement, linkText: e.target.value },
                            })
                          }
                          className="w-1/2 px-2 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-gold"
                        />
                        <input
                          type="text"
                          placeholder="URL"
                          value={websiteConfig.announcement?.linkUrl || ""}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              announcement: { ...websiteConfig.announcement, linkUrl: e.target.value },
                            })
                          }
                          className="w-1/2 px-2 py-1.5 rounded-lg bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-gold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid of Section Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(websiteConfig.sections || {}).map(([key, sec]: [string, any]) => (
                  <div
                    key={key}
                    className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                      sec.enabled
                        ? "bg-surface border-line"
                        : "bg-surface-2/40 border-dashed border-line opacity-60"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-text block">{sec.title || key}</span>
                      <span className="text-[10px] text-text-muted font-mono">{key}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...websiteConfig,
                          sections: {
                            ...websiteConfig.sections,
                            [key]: { ...sec, enabled: !sec.enabled },
                          },
                        };
                        setWebsiteConfig(updated);
                      }}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        sec.enabled
                          ? "bg-jade/15 border-jade/40 text-jade"
                          : "bg-surface-2 border-line text-text-muted"
                      }`}
                    >
                      {sec.enabled ? "VISIBLE" : "HIDDEN"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab: Hero Copy & Buttons */}
          {subWebTab === "hero" && (
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text">Hero Section & Call-To-Action Buttons</h2>
                  <p className="text-xs text-text-muted">
                    Edit the main brand mark, eyebrow, subtitle, and primary/secondary button labels and links.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved Hero section & buttons")}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Hero Changes"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">Hero Eyebrow Text</label>
                  <input
                    type="text"
                    value={websiteConfig.hero?.eyebrow || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        hero: { ...websiteConfig.hero, eyebrow: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">Brand Wordmark</label>
                  <input
                    type="text"
                    value={websiteConfig.hero?.word || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        hero: { ...websiteConfig.hero, word: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono focus:outline-none focus:border-gold"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-text">Hero Subtitle</label>
                  <input
                    type="text"
                    value={websiteConfig.hero?.subtitle || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        hero: { ...websiteConfig.hero, subtitle: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text focus:outline-none focus:border-gold"
                  />
                </div>

                {/* Primary CTA Button */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2.5">
                  <span className="text-xs font-bold text-gold block">
                    Primary CTA Button (Solid Glow)
                  </span>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Button Label</label>
                    <input
                      type="text"
                      value={websiteConfig.hero?.primaryCtaText || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          hero: { ...websiteConfig.hero, primaryCtaText: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Destination Link (e.g. #s01 or /login)</label>
                    <input
                      type="text"
                      value={websiteConfig.hero?.primaryCtaHref || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          hero: { ...websiteConfig.hero, primaryCtaHref: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text font-mono"
                    />
                  </div>
                </div>

                {/* Secondary CTA Button */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2.5">
                  <span className="text-xs font-bold text-text-muted block">
                    Secondary CTA Button (Outline)
                  </span>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Button Label</label>
                    <input
                      type="text"
                      value={websiteConfig.hero?.secondaryCtaText || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          hero: { ...websiteConfig.hero, secondaryCtaText: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-text-muted">Destination Link (e.g. #s03 or /dashboard)</label>
                    <input
                      type="text"
                      value={websiteConfig.hero?.secondaryCtaHref || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          hero: { ...websiteConfig.hero, secondaryCtaHref: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Scenes 01 to 07 */}
          {subWebTab === "scenes" && (
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text">Cinematic Story Scenes (01–07)</h2>
                  <p className="text-xs text-text-muted">
                    Edit the headlines and subtitles displayed during the 3D scroll journey.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved story scene copy")}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Scenes Changes"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Scene 01 */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-xs font-bold text-text">Scene 01 — Awakening</span>
                  <input
                    type="text"
                    placeholder="Eyebrow"
                    value={websiteConfig.scenes?.s01?.eyebrow || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s01: { ...websiteConfig.scenes?.s01, eyebrow: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                  <textarea
                    rows={2}
                    placeholder="Headline"
                    value={websiteConfig.scenes?.s01?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s01: { ...websiteConfig.scenes?.s01, headline: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                </div>

                {/* Scene 02 */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-xs font-bold text-text">Scene 02 — Connection</span>
                  <input
                    type="text"
                    placeholder="Eyebrow"
                    value={websiteConfig.scenes?.s02?.eyebrow || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s02: { ...websiteConfig.scenes?.s02, eyebrow: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                  <textarea
                    rows={2}
                    placeholder="Headline"
                    value={websiteConfig.scenes?.s02?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s02: { ...websiteConfig.scenes?.s02, headline: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                </div>

                {/* Scene 03 */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-xs font-bold text-text">Scene 03 — Intelligence</span>
                  <input
                    type="text"
                    placeholder="Eyebrow"
                    value={websiteConfig.scenes?.s03?.eyebrow || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s03: { ...websiteConfig.scenes?.s03, eyebrow: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                  <textarea
                    rows={2}
                    placeholder="Headline"
                    value={websiteConfig.scenes?.s03?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s03: { ...websiteConfig.scenes?.s03, headline: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                </div>

                {/* Scene 04 */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-xs font-bold text-text">Scene 04 — This is BizzPal</span>
                  <input
                    type="text"
                    placeholder="Headline"
                    value={websiteConfig.scenes?.s04?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s04: { ...websiteConfig.scenes?.s04, headline: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                  <textarea
                    rows={2}
                    placeholder="Lead text"
                    value={websiteConfig.scenes?.s04?.lead || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s04: { ...websiteConfig.scenes?.s04, lead: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                </div>

                {/* Scene 05 */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-xs font-bold text-text">Scene 05 — Expansion</span>
                  <input
                    type="text"
                    placeholder="Eyebrow"
                    value={websiteConfig.scenes?.s05?.eyebrow || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s05: { ...websiteConfig.scenes?.s05, eyebrow: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                  <textarea
                    rows={2}
                    placeholder="Headline"
                    value={websiteConfig.scenes?.s05?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s05: { ...websiteConfig.scenes?.s05, headline: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                </div>

                {/* Scene 06 */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                  <span className="text-xs font-bold text-text">Scene 06 — Human + AI</span>
                  <input
                    type="text"
                    placeholder="Eyebrow"
                    value={websiteConfig.scenes?.s06?.eyebrow || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s06: { ...websiteConfig.scenes?.s06, eyebrow: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                  <textarea
                    rows={2}
                    placeholder="Headline"
                    value={websiteConfig.scenes?.s06?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        scenes: {
                          ...websiteConfig.scenes,
                          s06: { ...websiteConfig.scenes?.s06, headline: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                  />
                </div>

                {/* Scene 07 */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2 md:col-span-2">
                  <span className="text-xs font-bold text-text">Scene 07 — Future & Final CTA Button</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-text-muted">Eyebrow</label>
                      <input
                        type="text"
                        value={websiteConfig.scenes?.s07?.eyebrow || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            scenes: {
                              ...websiteConfig.scenes,
                              s07: { ...websiteConfig.scenes?.s07, eyebrow: e.target.value },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-text-muted">Headline</label>
                      <input
                        type="text"
                        value={websiteConfig.scenes?.s07?.headline || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            scenes: {
                              ...websiteConfig.scenes,
                              s07: { ...websiteConfig.scenes?.s07, headline: e.target.value },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-text-muted">CTA Button Label</label>
                      <input
                        type="text"
                        value={websiteConfig.scenes?.s07?.ctaText || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            scenes: {
                              ...websiteConfig.scenes,
                              s07: { ...websiteConfig.scenes?.s07, ctaText: e.target.value },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-text-muted">CTA Button Href</label>
                      <input
                        type="text"
                        value={websiteConfig.scenes?.s07?.ctaHref || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            scenes: {
                              ...websiteConfig.scenes,
                              s07: { ...websiteConfig.scenes?.s07, ctaHref: e.target.value },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: About & Solutions */}
          {subWebTab === "about_solutions" && (
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text">About & Solutions Content</h2>
                  <p className="text-xs text-text-muted">
                    Configure the narrative paragraphs and capability solution cards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved About & Solutions content")}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save About/Solutions"}</span>
                </button>
              </div>

              {/* About Text */}
              <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-3">
                <span className="text-xs font-bold text-text block">About BizzPal Narrative</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-text-muted">Headline</label>
                    <input
                      type="text"
                      value={websiteConfig.about?.headline || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, headline: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-text-muted">Eyebrow</label>
                    <input
                      type="text"
                      value={websiteConfig.about?.eyebrow || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, eyebrow: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] text-text-muted">Paragraph 1</label>
                    <textarea
                      rows={2}
                      value={websiteConfig.about?.p1 || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, p1: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] text-text-muted">Paragraph 2</label>
                    <textarea
                      rows={2}
                      value={websiteConfig.about?.p2 || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, p2: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-xs text-text"
                    />
                  </div>
                </div>
              </div>

              {/* Solution Cards */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-text block">Capability Cards (5 Items)</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(websiteConfig.solutions?.cards || []).map((card: any, idx: number) => (
                    <div key={card.id || idx} className="p-3.5 rounded-xl bg-surface-2/60 border border-line space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gold font-mono">
                          Card {card.num || `0${idx+1}`}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-line font-mono">
                          FX: {card.fx || "ai"}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Title"
                        value={card.title || ""}
                        onChange={(e) => {
                          const updatedCards = [...websiteConfig.solutions.cards];
                          updatedCards[idx] = { ...updatedCards[idx], title: e.target.value };
                          setWebsiteConfig({
                            ...websiteConfig,
                            solutions: { ...websiteConfig.solutions, cards: updatedCards },
                          });
                        }}
                        className="w-full px-2.5 py-1 rounded-lg bg-surface border border-line text-xs text-text font-semibold"
                      />
                      <textarea
                        rows={2}
                        placeholder="Description"
                        value={card.desc || ""}
                        onChange={(e) => {
                          const updatedCards = [...websiteConfig.solutions.cards];
                          updatedCards[idx] = { ...updatedCards[idx], desc: e.target.value };
                          setWebsiteConfig({
                            ...websiteConfig,
                            solutions: { ...websiteConfig.solutions, cards: updatedCards },
                          });
                        }}
                        className="w-full px-2.5 py-1 rounded-lg bg-surface border border-line text-xs text-text"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Contact Info & Socials */}
          {subWebTab === "contact" && (
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-text">Contact Onboarding & Direct Channels</h2>
                  <p className="text-xs text-text-muted">
                    Configure the onboarding form headline, CTA button, contact emails, and social profiles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved contact details & socials")}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Contact Info"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">Headline</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, headline: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">Form CTA Button Label</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.ctaText || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, ctaText: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">Direct Contact Email</label>
                  <input
                    type="email"
                    value={websiteConfig.contact?.email || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, email: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">Website Domain Display</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.site || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, site: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">LinkedIn Profile URL</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.linkedin || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, linkedin: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text">X / Twitter Profile URL</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.twitter || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, twitter: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-xs text-text font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Navbar, Vision Words, Announcement Banner */}
          {(subWebTab === "nav_brand" || subWebTab === "vision_words" || subWebTab === "announcement") && (
            <WebsiteCmsExtra
              config={websiteConfig}
              onChange={setWebsiteConfig}
              onSave={async () => {
                await saveSection("website", websiteConfig, `Saved website ${subWebTab} settings`);
              }}
              saving={saving}
              subTab={subWebTab}
            />
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: DASHBOARD NAVIGATION BUTTONS                           */}
      {/* ============================================================= */}
      {activeTab === "navigation" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-text">Dashboard Navigation Buttons & Links</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Add new navigation buttons, edit destinations, change order, or remove links from the tenant sidebar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenNavModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Navigation Button</span>
            </button>
          </div>

          <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-theme">
            <div className="overflow-x-auto touch-scroll">
              <table className="w-full min-w-[640px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-surface-2/60 text-text-muted font-semibold">
                    <th className="p-3 pl-4">Order</th>
                    <th className="p-3">Button Label</th>
                    <th className="p-3">Route / URL</th>
                    <th className="p-3">Icon</th>
                    <th className="p-3">Group</th>
                    <th className="p-3">Badge</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 pr-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {navItems
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-surface-2/40 transition-colors">
                        <td className="p-3 pl-4 font-mono text-text-muted">#{item.order}</td>
                        <td className="p-3 font-bold text-text">{item.label}</td>
                        <td className="p-3 font-mono text-gold">{item.href}</td>
                        <td className="p-3 font-mono text-text-muted">{item.icon}</td>
                        <td className="p-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-line font-mono text-text-muted uppercase">
                            {item.group || "core"}
                          </span>
                        </td>
                        <td className="p-3">
                          {item.badge ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-brass/15 text-brass font-bold font-mono">
                              {item.badge}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[10px]">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleToggleNavItem(item)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                              item.enabled !== false
                                ? "bg-jade/15 border-jade/30 text-jade"
                                : "bg-surface-2 border-line text-text-muted"
                            }`}
                          >
                            {item.enabled !== false ? "ACTIVE" : "HIDDEN"}
                          </button>
                        </td>
                        <td className="p-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenNavModal(item)}
                              className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors cursor-pointer"
                              title="Edit button"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteNavItem(item.id, item.label)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                              title="Delete button"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: PLATFORM FEATURE TOGGLES                               */}
      {/* ============================================================= */}
      {activeTab === "features" && featuresConfig && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-line">
            <h2 className="text-sm font-bold text-text">Global Platform Capabilities & Feature Flags</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Instantly enable or disable executive tools, floating widgets, and integrations across all tenant accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                key: "enableAiCopilot",
                title: "Ask Executive AI Floating Launcher",
                desc: "Floating 24/7 AI Workspace launcher button in the bottom right corner of tenant pages.",
                icon: MessageSquare,
              },
              {
                key: "enableDailyCheckin",
                title: "Daily Executive Pulse Check Ribbon",
                desc: "60-second operational telemetry collection modal and ribbon on the top of the dashboard.",
                icon: CheckCircle2,
              },
              {
                key: "enableCommandPalette",
                title: "Universal Command Palette (⌘K / Ctrl+K)",
                desc: "Spotlight search modal for finding metrics, tools, and execution tasks with quick jump.",
                icon: Search,
              },
              {
                key: "enableWhatsApp",
                title: "WhatsApp Executive Assistant",
                desc: "Direct integration sending morning check-in links and telemetry prompts via WhatsApp API.",
                icon: Globe,
              },
              {
                key: "enableToolsCatalog",
                title: "Specialist Tools & Calculators Module",
                desc: "Interactive financial modeling, break-even simulation, and CAC/LTV calculations catalog.",
                icon: Wrench,
              },
            ].map((feat) => {
              const Icon = feat.icon;
              const isEnabled = featuresConfig[feat.key] !== false;
              return (
                <div
                  key={feat.key}
                  className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    isEnabled ? "bg-surface border-line" : "bg-surface-2/40 border-dashed border-line opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                        isEnabled
                          ? "bg-gold/10 border-gold/30 text-gold"
                          : "bg-surface-2 border-line text-text-muted"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-text">{feat.title}</h3>
                      <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFeature(feat.key)}
                    className={`px-3 py-1 rounded-full text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                      isEnabled
                        ? "bg-jade/15 border-jade/40 text-jade"
                        : "bg-surface-2 border-line text-text-muted"
                    }`}
                  >
                    {isEnabled ? "ENABLED" : "DISABLED"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* DataPal Extraction Engine Features */}
          <DataPalFeatureFlagsSection />
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: DASHBOARD WIDGETS                                      */}
      {/* ============================================================= */}
      {activeTab === "widgets" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-text">Configured Dashboard Widgets ({widgets.length})</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Manage widget components, grid column spans (1–4 columns), priority ordering, and visibility.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenWidgetModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Widget</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {widgets
              .sort((a, b) => b.priority - a.priority)
              .map((widget) => (
                <div
                  key={widget.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    widget.enabled !== false
                      ? "bg-surface border-line"
                      : "bg-surface-2/40 border-dashed border-line opacity-60"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-text">{widget.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold font-mono font-semibold">
                        {widget.defaultSpan}/4 col span
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted font-mono mt-1">
                      Component: {widget.component} · Priority: {widget.priority}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleWidget(widget)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        widget.enabled !== false
                          ? "bg-jade/15 border-jade/30 text-jade"
                          : "bg-surface-2 border-line text-text-muted"
                      }`}
                    >
                      {widget.enabled !== false ? "ACTIVE" : "HIDDEN"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenWidgetModal(widget)}
                      className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWidget(widget.id, widget.title)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 5: SPECIALIST TOOLS CATALOG                               */}
      {/* ============================================================= */}
      {activeTab === "tools" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-text">Specialist Calculators & Tools Catalog ({tools.length})</h2>
              <p className="text-xs text-text-muted mt-0.5">
                Add, configure, or remove business tools available to founders on the /tools catalog page.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleOpenToolModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-brass hover:brightness-110 text-white flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Tool</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tools.map((t) => (
              <div
                key={t.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                  t.enabled !== false
                    ? "bg-surface border-line"
                    : "bg-surface-2/40 border-dashed border-line opacity-60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xs font-bold text-text">{t.name}</h3>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-surface-2 border border-line text-text-muted font-mono uppercase">
                        {t.category}
                      </span>
                      {t.hasInteractiveCalculator && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gold/15 text-gold font-bold">
                          Interactive Pop-up
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleTool(t)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                        t.enabled !== false
                          ? "bg-jade/15 border-jade/30 text-jade"
                          : "bg-surface-2 border-line text-text-muted"
                      }`}
                    >
                      {t.enabled !== false ? "ACTIVE" : "DISABLED"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenToolModal(t)}
                      className="p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTool(t.id, t.name)}
                      className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted pt-2 border-t border-line/60">
                  <span>Required Plan: <b className="text-text font-semibold">{t.requiredPlan.charAt(0).toUpperCase() + t.requiredPlan.slice(1)}</b></span>
                  <span>Badge: <b className="text-text font-mono">{t.badge}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 6: AUDIT LOG                                              */}
      {/* ============================================================= */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-surface border border-line">
            <h2 className="text-sm font-bold text-text">Append-Only Platform Audit Log</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Historical ledger of every change made to the website, navigation, widgets, and feature flags.
            </p>
          </div>

          <div className="bg-surface rounded-2xl border border-line divide-y divide-line overflow-hidden shadow-theme">
            {auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">No audit logs recorded yet.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 text-xs">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-text">{log.note || log.action}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 border border-line font-mono text-text-muted uppercase">
                        {log.entityType}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5 font-mono break-all">
                      Actor: {log.actor} · Target ID: {log.entityId}
                    </p>
                  </div>
                  <span className="text-[10px] text-text-muted font-mono self-end sm:self-auto shrink-0">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ============================================================= */}
      {/* MODAL: ADD / EDIT NAVIGATION BUTTON                           */}
      {/* ============================================================= */}
      {!loading && isNavModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNavModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text">
                    {editingNavItem ? `Edit Navigation Button: ${editingNavItem.label}` : "Add New Navigation Button"}
                  </h3>
                  <p className="text-[11px] text-text-muted">Sidebar navigation routing & icon configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNavModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="nav-modal-form" onSubmit={handleSaveNavItem} className="overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 text-xs flex-1">
              <div className="space-y-1">
                <label className="font-semibold text-text">Button Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Financial Models"
                  value={navForm.label}
                  onChange={(e) => setNavForm({ ...navForm, label: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-gold font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Route / Destination URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /models or https://..."
                  value={navForm.href}
                  onChange={(e) => setNavForm({ ...navForm, href: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Lucide Icon Name</label>
                  <select
                    value={navForm.icon}
                    onChange={(e) => setNavForm({ ...navForm, icon: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono"
                  >
                    <option value="LayoutDashboard">LayoutDashboard</option>
                    <option value="Sparkles">Sparkles</option>
                    <option value="Compass">Compass</option>
                    <option value="TrendingUp">TrendingUp</option>
                    <option value="Wrench">Wrench</option>
                    <option value="AlertTriangle">AlertTriangle</option>
                    <option value="Layers">Layers</option>
                    <option value="Sliders">Sliders</option>
                    <option value="DollarSign">DollarSign</option>
                    <option value="Globe">Globe</option>
                    <option value="Shield">Shield</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Display Order</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={navForm.order}
                    onChange={(e) => setNavForm({ ...navForm, order: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Group</label>
                  <select
                    value={navForm.group}
                    onChange={(e) => setNavForm({ ...navForm, group: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text"
                  >
                    <option value="core">Core</option>
                    <option value="intelligence">Intelligence</option>
                    <option value="management">Management</option>
                    <option value="system">System</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Badge (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. NEW, 3, BETA"
                    value={navForm.badge}
                    onChange={(e) => setNavForm({ ...navForm, badge: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono"
                  />
                </div>
              </div>
            </form>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-line bg-surface-2/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsNavModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-line text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer font-semibold transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="nav-modal-form"
                disabled={saving}
                className="px-5 py-2 rounded-xl text-xs font-bold text-[#1a1206] btn-gold-gradient hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all shadow-md shadow-[0_8px_20px_-6px_var(--gold-glow)] text-center"
              >
                {saving ? "Saving..." : "Save Navigation Button"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD / EDIT DASHBOARD WIDGET                            */}
      {/* ============================================================= */}
      {!loading && isWidgetModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWidgetModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text truncate">
                    {editingWidget ? `Edit Widget: ${editingWidget.title}` : "Add Dashboard Widget"}
                  </h3>
                  <p className="text-[11px] text-text-muted truncate">Executive dashboard modular card configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWidgetModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="widget-modal-form" onSubmit={handleSaveWidget} className="overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 text-xs flex-1">
              <div className="space-y-1">
                <label className="font-semibold text-text">Widget Display Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sales Pipeline Velocity"
                  value={widgetForm.title}
                  onChange={(e) => setWidgetForm({ ...widgetForm, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-gold font-semibold text-sm sm:text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">React Component</label>
                <select
                  value={widgetForm.component}
                  onChange={(e) => setWidgetForm({ ...widgetForm, component: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-sm sm:text-xs"
                >
                  <option value="KpiGridWidget">KpiGridWidget (4-column Sparkline Tiles)</option>
                  <option value="HealthScoreWidget">HealthScoreWidget (Gauge + Breakdown)</option>
                  <option value="BriefingWidget">BriefingWidget (Executive Intelligence Brief)</option>
                  <option value="GapsPreviewWidget">GapsPreviewWidget (Priority Gaps & Bottlenecks)</option>
                  <option value="TasksPreviewWidget">TasksPreviewWidget (Execution Queue)</option>
                  <option value="SimulatorHighlightWidget">SimulatorHighlightWidget (Active Simulation)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Default Column Span</label>
                  <select
                    value={widgetForm.defaultSpan}
                    onChange={(e) => setWidgetForm({ ...widgetForm, defaultSpan: Number(e.target.value) as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text text-sm sm:text-xs"
                  >
                    <option value={1}>1 Column (Compact)</option>
                    <option value={2}>2 Columns (Half Width)</option>
                    <option value={3}>3 Columns (Wide)</option>
                    <option value={4}>4 Columns (Full Width)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Display Priority (0 - 100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={widgetForm.priority}
                    onChange={(e) => setWidgetForm({ ...widgetForm, priority: Number(e.target.value) })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-sm sm:text-xs"
                  />
                </div>
              </div>
            </form>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-line bg-surface-2/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsWidgetModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-line text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer font-semibold transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="widget-modal-form"
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-[#1a1206] btn-gold-gradient hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all shadow-md shadow-[0_8px_20px_-6px_var(--gold-glow)] text-center"
              >
                {saving ? "Saving..." : "Save Widget"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD / EDIT SPECIALIST TOOL                             */}
      {/* ============================================================= */}
      {!loading && isToolModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsToolModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center text-gold shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-text truncate">
                    {editingTool ? `Edit Tool: ${editingTool.name}` : "Add Specialist Tool"}
                  </h3>
                  <p className="text-[11px] text-text-muted truncate">Business specialist calculator & entitlement settings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer transition-colors shrink-0"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form id="tool-modal-form" onSubmit={handleSaveTool} className="overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5 text-xs flex-1">
              <div className="space-y-1">
                <label className="font-semibold text-text">Tool Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Valuation Multiples Calculator"
                  value={toolForm.name}
                  onChange={(e) => setToolForm({ ...toolForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-gold font-semibold text-sm sm:text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Category</label>
                  <select
                    value={toolForm.category}
                    onChange={(e) => setToolForm({ ...toolForm, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text text-sm sm:text-xs"
                  >
                    <option value="finance">Finance</option>
                    <option value="sales">Sales</option>
                    <option value="marketing">Marketing</option>
                    <option value="operations">Operations</option>
                    <option value="strategy">Strategy</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-text">Required Plan</label>
                  <select
                    value={toolForm.requiredPlan}
                    onChange={(e) => setToolForm({ ...toolForm, requiredPlan: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text text-sm sm:text-xs"
                  >
                    <option value="free">Free</option>
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Description</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Brief description of what this calculator or tool computes."
                  value={toolForm.description}
                  onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-gold text-sm sm:text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Badge</label>
                <input
                  type="text"
                  placeholder="e.g. Valuation, Risk"
                  value={toolForm.badge}
                  onChange={(e) => setToolForm({ ...toolForm, badge: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-sm sm:text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-surface-2/60 border border-line hover:border-gold/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={toolForm.enabled}
                    onChange={(e) => setToolForm({ ...toolForm, enabled: e.target.checked })}
                    className="rounded border-line text-gold focus:ring-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-text">Tool Active</span>
                    <span className="text-[10px] text-text-muted">Visible on /tools</span>
                  </div>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-surface-2/60 border border-line hover:border-gold/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={toolForm.hasInteractiveCalculator}
                    onChange={(e) => setToolForm({ ...toolForm, hasInteractiveCalculator: e.target.checked })}
                    className="rounded border-line text-gold focus:ring-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-text">Has Calculator</span>
                    <span className="text-[10px] text-text-muted">Interactive Pop-up</span>
                  </div>
                </label>
              </div>
            </form>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-line bg-surface-2/60 shrink-0">
              <button
                type="button"
                onClick={() => setIsToolModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl border border-line text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer font-semibold transition-colors text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="tool-modal-form"
                disabled={saving}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold text-[#1a1206] btn-gold-gradient hover:brightness-110 active:scale-[0.98] cursor-pointer transition-all shadow-md shadow-[0_8px_20px_-6px_var(--gold-glow)] text-center"
              >
                {saving ? "Saving..." : "Save Tool"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

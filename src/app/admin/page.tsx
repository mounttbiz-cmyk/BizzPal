"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import {
  Globe,
  Database,
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
  RotateCcw, X,
  Menu,
  ArrowLeft,
  LogOut,
  Building2,
  Users,
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import {
  EmptyState,
  Panel,
  PanelToolbar,
  StatusToggle,
  Switch,
  dangerIconButton,
  iconButton,
  primaryButton,
  secondaryButton,
  td,
  th,
} from "./components/ui";
import { NavItem } from "@/config/schemas/nav";
import { WidgetDef } from "@/config/schemas/widget";
import { useEscapeKey } from "@/lib/hooks/useEscapeKey";
import { ThemeSwitch } from "@/components/shell/ThemeSwitch";
import { DataPalFeatureFlagsSection } from "@/components/admin/DataPalFeatureFlagsSection";
import { TenantsManager } from "./components/TenantsManager";
import { UsersManager } from "./components/UsersManager";
import { DataPalUsageManager } from "./components/DataPalUsageManager";
import { AgentEvaluationsSection } from "./components/AgentEvaluationsSection";
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

import { askConfirm } from "@/components/ui/dialogs";
type AdminTab = "website" | "navigation" | "features" | "widgets" | "tools" | "tenants" | "users" | "plans" | "audit" | "datapal" | "backup";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>("tenants");
  const [subWebTab, setSubWebTab] = useState<
    "sections" | "hero" | "scenes" | "about_solutions" | "stats" | "contact" | "nav_brand" | "vision_words" | "announcement" | "footer"
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
          if (Array.isArray(data.data.nav)) {
            setNavItems(data.data.nav);
            try { localStorage.setItem("bizzpal_dashboard_nav", JSON.stringify(data.data.nav)); } catch {}
          }
          if (Array.isArray(data.data.widgets)) {
            setWidgets(data.data.widgets);
            try { localStorage.setItem("bizzpal_dashboard_widgets", JSON.stringify(data.data.widgets)); } catch {}
          }
          if (Array.isArray(data.data.tools)) {
            setTools(data.data.tools);
            try { localStorage.setItem("bizzpal_tools_catalog", JSON.stringify(data.data.tools)); } catch {}
          }
          if (Array.isArray(data.data.plans)) {
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
      setNavItems((prev) => (Array.isArray(prev) ? prev : defaultNavItems));
      setWidgets((prev) => (Array.isArray(prev) ? prev : defaultWidgets));
      setTools((prev) => (Array.isArray(prev) ? prev : DEFAULT_TOOLS_CATALOG));
      setPlans((prev) => (Array.isArray(prev) ? prev : DEFAULT_SUBSCRIPTION_PLANS));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllConfig();
  }, []);

  // Save specific section to database with full rollback if backend rejects/fails
  const saveSection = async (sectionName: string, payload: any, note?: string) => {
    const prevSnapshot = {
      plans,
      websiteConfig,
      navItems,
      widgets,
      tools,
      featuresConfig,
    };

    try {
      setSaving(true);
      if (sectionName === "plans") setPlans(payload);
      if (sectionName === "website") setWebsiteConfig(payload);
      if (sectionName === "nav") setNavItems(payload);
      if (sectionName === "widgets") setWidgets(payload);
      if (sectionName === "tools") setTools(payload);
      if (sectionName === "features") setFeaturesConfig(payload);
      if (sectionName === "import" && payload) {
        if (payload.website) setWebsiteConfig(payload.website);
        if (payload.features) setFeaturesConfig(payload.features);
        if (Array.isArray(payload.nav)) setNavItems(payload.nav);
        if (Array.isArray(payload.widgets)) setWidgets(payload.widgets);
        if (Array.isArray(payload.tools)) setTools(payload.tools);
        if (Array.isArray(payload.plans)) setPlans(payload.plans);
      }

      // Persist to server first before broadcasting across tabs
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

      // Mirror verified save to localStorage and BroadcastChannel
      if (typeof window !== "undefined") {
        try {
          if (sectionName === "website") localStorage.setItem("bizzpal_website_config", JSON.stringify(payload));
          if (sectionName === "tools") localStorage.setItem("bizzpal_tools_catalog", JSON.stringify(payload));
          if (sectionName === "nav") localStorage.setItem("bizzpal_dashboard_nav", JSON.stringify(payload));
          if (sectionName === "widgets") localStorage.setItem("bizzpal_dashboard_widgets", JSON.stringify(payload));
          if (sectionName === "features") localStorage.setItem("bizzpal_dashboard_features", JSON.stringify(payload));
          if (sectionName === "plans") localStorage.setItem("bizzpal_subscription_plans", JSON.stringify(payload));
          if (sectionName === "import" && payload) {
            if (payload.website) localStorage.setItem("bizzpal_website_config", JSON.stringify(payload.website));
            if (payload.features) localStorage.setItem("bizzpal_dashboard_features", JSON.stringify(payload.features));
            if (payload.nav) localStorage.setItem("bizzpal_dashboard_nav", JSON.stringify(payload.nav));
            if (payload.widgets) localStorage.setItem("bizzpal_dashboard_widgets", JSON.stringify(payload.widgets));
            if (payload.tools) localStorage.setItem("bizzpal_tools_catalog", JSON.stringify(payload.tools));
            if (payload.plans) localStorage.setItem("bizzpal_subscription_plans", JSON.stringify(payload.plans));
          }
          localStorage.setItem("bizzpal_config_timestamp", String(Date.now()));
          window.dispatchEvent(new CustomEvent("bizzpal_config_updated", { detail: { section: sectionName } }));
          try {
            const bc = new BroadcastChannel("bizzpal_channel");
            bc.postMessage({ type: "bizzpal_config_updated", section: sectionName });
            bc.close();
          } catch {}
        } catch {}
      }

      if (data.version) setVersion(data.version);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      notify("Changes saved successfully");
    } catch (err: any) {
      // Rollback optimistic UI state when persistence fails
      setPlans(prevSnapshot.plans);
      setWebsiteConfig(prevSnapshot.websiteConfig);
      setNavItems(prevSnapshot.navItems);
      setWidgets(prevSnapshot.widgets);
      setTools(prevSnapshot.tools);
      setFeaturesConfig(prevSnapshot.featuresConfig);
      notify(`Save failed (reverted): ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Factory Reset
  const handleFactoryReset = async () => {
    const ok = await askConfirm({
      title: "Reset every setting to the defaults?",
      message: "Website content, app sidebar, widgets, tools, feature switches and plans go back to how BizzPal shipped. Businesses and users are not touched. This cannot be undone.",
      confirmLabel: "Reset everything",
      danger: true,
    });
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
    if (!(await askConfirm({ title: `Delete the "${label}" link?`, message: "It will disappear from the customer app's sidebar.", confirmLabel: "Delete", danger: true }))) return;
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
    if (!(await askConfirm({ title: `Delete the "${title}" widget?`, message: "It will disappear from the customer dashboard.", confirmLabel: "Delete", danger: true }))) return;
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
    if (!(await askConfirm({ title: `Delete the "${name}" tool?`, message: "Customers will no longer see it on the Tools page.", confirmLabel: "Delete", danger: true }))) return;
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

  
  // Export full platform configuration as JSON
  const handleExportConfig = () => {
    const fullConfig = {
      version,
      exportedAt: new Date().toISOString(),
      website: websiteConfig,
      features: featuresConfig,
      nav: navItems,
      widgets: widgets,
      tools: tools,
      plans: plans,
    };
    const blob = new Blob([JSON.stringify(fullConfig, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bizzpal-platform-config-v${version}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify("Exported full platform configuration to JSON backup file");
  };

  // Import full platform configuration from JSON
  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Invalid configuration file format");
        }
        await saveSection("import", parsed, "Restored configuration from imported JSON backup");
        notify("Successfully imported and restored configuration backup");
      } catch (err: any) {
        notify(`Import failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const NAV_GROUPS: { label: string; items: { tab: AdminTab; label: string; icon: any }[] }[] = [
    {
      label: "Customers",
      items: [
        { tab: "tenants", label: "Businesses", icon: Building2 },
        { tab: "users", label: "Users", icon: Users },
      ],
    },
    {
      label: "Revenue",
      items: [
        { tab: "plans", label: "Plans & pricing", icon: CreditCard },
        { tab: "datapal", label: "DataPal usage", icon: Database },
      ],
    },
    {
      label: "Customer app",
      items: [
        { tab: "navigation", label: "App sidebar", icon: Compass },
        { tab: "widgets", label: "Dashboard widgets", icon: Layers },
        { tab: "features", label: "Feature switches", icon: Sliders },
        { tab: "tools", label: "Tools", icon: Wrench },
      ],
    },
    {
      label: "Website",
      items: [{ tab: "website", label: "Website content", icon: Globe }],
    },
    {
      label: "Settings",
      items: [
        { tab: "audit", label: "Change history", icon: History },
        { tab: "backup", label: "Backup & restore", icon: Save },
      ],
    },
  ];

  const PAGE_META: Record<AdminTab, { title: string; description: string }> = {
    tenants: { title: "Businesses", description: "Every business on BizzPal, how it is doing and when it was last used." },
    users: { title: "Users", description: "Everyone who can sign in, how they sign in and when they were last active." },
    plans: { title: "Plans & pricing", description: "The plans customers can buy, their prices and what each one includes." },
    datapal: { title: "DataPal usage", description: "What DataPal searches cost in Google Cloud, in total and for each account." },
    website: { title: "Website content", description: "Edit the public website. Changes go live as soon as you save." },
    navigation: { title: "App sidebar", description: "The links in the customer app's sidebar, their groups and order." },
    widgets: { title: "Dashboard widgets", description: "The blocks on the customer dashboard, how wide they are and their order." },
    features: { title: "Feature switches", description: "Turn features on or off for every customer account." },
    tools: { title: "Tools", description: "The tools and calculators customers can open from the Tools page." },
    audit: { title: "Change history", description: "Every change made in this console, newest first." },
    backup: { title: "Backup & restore", description: "Download the console settings, restore them from a file, or go back to the defaults." },
  };

  const WEB_TABS: { id: typeof subWebTab; label: string }[] = [
    { id: "sections", label: "Sections" },
    { id: "hero", label: "Hero" },
    { id: "scenes", label: "Story scenes" },
    { id: "about_solutions", label: "About & solutions" },
    { id: "stats", label: "Stats" },
    { id: "contact", label: "Contact" },
    { id: "nav_brand", label: "Navbar & brand" },
    { id: "vision_words", label: "Vision words" },
    { id: "announcement", label: "Announcement" },
    { id: "footer", label: "Footer" },
  ];

  const page = PAGE_META[activeTab];

  const handleAdminLogout = async () => {
    try {
      await fetch("/api/admin/auth", { method: "DELETE" });
    } catch {}
    localStorage.removeItem("bizzpal_admin_session");
    window.location.href = "/admin/login";
  };

  const go = (tab: AdminTab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const isError = (m: string) => /error|failed|could not|not /i.test(m);

  return (
    <div className="admin-shell min-h-screen bg-bg text-text flex">
      {toastMessage && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[1100] max-w-sm px-4 py-3 rounded-xl bg-surface text-text border border-line shadow-lg flex items-start gap-2.5 text-sm"
        >
          {isError(toastMessage) ? (
            <AlertCircle className="w-4 h-4 text-rust shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-jade shrink-0 mt-0.5" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden cursor-default"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface border-r border-line flex flex-col transition-transform duration-200 lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-line shrink-0">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-icon.png" alt="" width={28} height={28} className="object-contain" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-text">
                Bizz<span className="bizzpal-brand-pal">Pal</span>
              </p>
              <p className="text-xs text-text-muted">Admin console</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface-2 text-text-muted hover:text-text cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Admin sections">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-xs font-medium text-text-muted">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.tab;
                  return (
                    <button
                      key={item.tab}
                      type="button"
                      onClick={() => go(item.tab)}
                      aria-current={isActive ? "page" : undefined}
                      className={`w-full flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm transition-colors cursor-pointer ${
                        isActive ? "bg-surface-2 text-text font-medium" : "text-text-muted hover:text-text hover:bg-surface-2/60"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-brass" : ""}`} />
                      <span className="flex-1 text-left truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-line space-y-1 shrink-0">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-2/60"
          >
            <Globe className="w-4 h-4" />
            <span className="flex-1">View website</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm text-text-muted hover:text-text hover:bg-surface-2/60"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="flex-1">Back to the app</span>
          </Link>
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="w-28">
              <ThemeSwitch compact />
            </div>
            <button
              type="button"
              onClick={handleAdminLogout}
              className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-sm text-text-muted hover:text-rust hover:bg-rust/10 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen lg:pl-64">
        <header className="lg:hidden sticky top-0 z-30 h-14 bg-surface border-b border-line px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open menu"
            className="p-2 -ml-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-2 cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-text truncate">{page.title}</span>
        </header>

        <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-6 lg:py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-text">{page.title}</h1>
            <p className="text-sm text-text-muted mt-1">{page.description}</p>
          </div>

          {activeTab === "website" && (
            <div className="border-b border-line overflow-x-auto">
              <div role="tablist" aria-label="Website content" className="flex gap-6 min-w-max">
                {WEB_TABS.map((t) => {
                  const on = subWebTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="tab"
                      aria-selected={on}
                      onClick={() => setSubWebTab(t.id)}
                      className={`relative pb-3 text-sm whitespace-nowrap cursor-pointer transition-colors ${
                        on ? "text-text" : "text-text-muted hover:text-text"
                      }`}
                    >
                      {t.label}
                      {on && <span className="absolute left-0 right-0 bottom-0 h-0.5 rounded-full bg-brass" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-6">

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

          {/* Subtab: Section Visibility Switches */}
          {subWebTab === "sections" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface border border-line flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text">Website sections</h2>
                  <p className="text-sm text-text-muted mt-0.5">
                    Toggle entire sections on or off. Changes immediately affect the marketing homepage.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved section visibility switches")}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brass hover:brightness-110 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save changes"}</span>
                </button>
              </div>

              {/* Announcement Banner Box */}
              <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text">Top announcement banner</span>
                    <span className="text-xs text-text-muted">Optional</span>
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
                    className={`px-3 py-1 rounded-lg text-sm border cursor-pointer ${
                      websiteConfig.announcement?.enabled
                        ? "border-line text-jade hover:bg-surface-2"
                        : "border-line text-text-muted hover:bg-surface-2"
                    }`}
                  >
                    {websiteConfig.announcement?.enabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                {websiteConfig.announcement?.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-sm text-text-muted">Banner Text</label>
                      <input
                        type="text"
                        value={websiteConfig.announcement?.text || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            announcement: { ...websiteConfig.announcement, text: e.target.value },
                          })
                        }
                        className="w-full px-3 py-1.5 rounded-lg bg-surface-2 border border-line text-sm text-text focus:outline-none focus:border-brass"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm text-text-muted">Link Text & URL</label>
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
                          className="w-1/2 px-2 py-1.5 rounded-lg bg-surface-2 border border-line text-sm text-text focus:outline-none focus:border-brass"
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
                          className="w-1/2 px-2 py-1.5 rounded-lg bg-surface-2 border border-line text-sm text-text focus:outline-none focus:border-brass"
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
                      <span className="text-sm font-medium text-text block">{sec.title || key}</span>
                      <span className="text-xs text-text-muted">{key}</span>
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
                      className={`px-3 py-1 rounded-lg text-sm border cursor-pointer ${
                        sec.enabled
                          ? "border-line text-jade hover:bg-surface-2"
                          : "border-line text-text-muted hover:bg-surface-2"
                      }`}
                    >
                      {sec.enabled ? "Visible" : "Hidden"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab: Hero Copy & Buttons */}
          {subWebTab === "hero" && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-text">Hero Section & Call-To-Action Buttons</h2>
                    <p className="text-xs text-text-muted">
                      Edit the main brand mark, eyebrow, subtitle, and primary/secondary button labels and links.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => saveSection("website", websiteConfig, "Saved Hero section & buttons")}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brass hover:brightness-110 text-white flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? "Saving..." : "Save Hero Changes"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-text">Hero Eyebrow Text</label>
                    <input
                      type="text"
                      value={websiteConfig.hero?.eyebrow || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          hero: { ...websiteConfig.hero, eyebrow: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text focus:outline-none focus:border-brass"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-medium text-text">Brand Title Wordmark (Rendered with Cinematic Letter Split)</label>
                    <input
                      type="text"
                      value={websiteConfig.hero?.word || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          hero: { ...websiteConfig.hero, word: e.target.value },
                        })
                      }
                      placeholder="e.g. Autonomous Enterprise Engine or BizzPal™"
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text font-semibold focus:outline-none focus:border-brass"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-text">Hero Subtitle</label>
                      <span className="text-xs text-text-muted font-mono">
                        {(websiteConfig.hero?.subtitle || "").length} characters
                      </span>
                    </div>
                    <input
                      type="text"
                      value={websiteConfig.hero?.subtitle || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          hero: { ...websiteConfig.hero, subtitle: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text focus:outline-none focus:border-brass"
                    />
                  </div>

                  {/* Primary CTA Button */}
                  <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-brass block">
                        Primary CTA Button (Solid Glow)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            hero: {
                              ...websiteConfig.hero,
                              primaryCtaEnabled: websiteConfig.hero?.primaryCtaEnabled === false ? true : false,
                            },
                          })
                        }
                        className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                          websiteConfig.hero?.primaryCtaEnabled !== false
                            ? "bg-jade/15 border-jade/30 text-jade"
                            : "bg-surface border-line text-text-muted"
                        }`}
                      >
                        {websiteConfig.hero?.primaryCtaEnabled !== false ? "Visible" : "Hidden"}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-text-muted">Button Label</label>
                      <input
                        type="text"
                        value={websiteConfig.hero?.primaryCtaText || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            hero: { ...websiteConfig.hero, primaryCtaText: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-text-muted">Destination Link (e.g. #s01 or /dashboard)</label>
                      <input
                        type="text"
                        value={websiteConfig.hero?.primaryCtaHref || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            hero: { ...websiteConfig.hero, primaryCtaHref: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text font-mono"
                      />
                    </div>
                  </div>

                  {/* Secondary CTA Button */}
                  <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-muted block">
                        Secondary CTA Button (Outline)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            hero: {
                              ...websiteConfig.hero,
                              secondaryCtaEnabled: websiteConfig.hero?.secondaryCtaEnabled === false ? true : false,
                            },
                          })
                        }
                        className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                          websiteConfig.hero?.secondaryCtaEnabled !== false
                            ? "bg-jade/15 border-jade/30 text-jade"
                            : "bg-surface border-line text-text-muted"
                        }`}
                      >
                        {websiteConfig.hero?.secondaryCtaEnabled !== false ? "Visible" : "Hidden"}
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-text-muted">Button Label</label>
                      <input
                        type="text"
                        value={websiteConfig.hero?.secondaryCtaText || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            hero: { ...websiteConfig.hero, secondaryCtaText: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-text-muted">Destination Link (e.g. #s03 or /subscription)</label>
                      <input
                        type="text"
                        value={websiteConfig.hero?.secondaryCtaHref || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            hero: { ...websiteConfig.hero, secondaryCtaHref: e.target.value },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Visual Card Preview */}
              <div className="p-6 rounded-2xl bg-[#08070A] border border-[#D6B46A]/25 text-center space-y-3">
                <span className="text-xs font-mono text-[#D6B46A] px-2.5 py-0.5 rounded-full bg-[#D6B46A]/10 border border-[#D6B46A]/20">
                  Live Landing Page Hero Preview
                </span>
                <p className="text-xs text-white/60 tracking-widest font-mono mt-2">
                  {websiteConfig.hero?.eyebrow || "Artificial Intelligence · For Business"}
                </p>
                <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight py-1 font-sans">
                  {websiteConfig.hero?.word || "BizzPal™"}
                </h1>
                <p className="text-sm text-[#E0D8C3] max-w-lg mx-auto">
                  {websiteConfig.hero?.subtitle || "Your Business. Powered by Intelligence."}
                </p>
                <div className="flex items-center justify-center gap-3 pt-3">
                  {websiteConfig.hero?.primaryCtaEnabled !== false && (
                    <span className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#D6B46A] text-black">
                      {websiteConfig.hero?.primaryCtaText || "Explore BizzPal"} →
                    </span>
                  )}
                  {websiteConfig.hero?.secondaryCtaEnabled !== false && (
                    <span className="px-4 py-2 rounded-xl text-xs font-semibold border border-white/20 text-white">
                      {websiteConfig.hero?.secondaryCtaText || "Discover Our Intelligence"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Scenes 01 to 07 */}
          {subWebTab === "scenes" && (
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text">Cinematic Story Scenes (01–07)</h2>
                  <p className="text-xs text-text-muted">
                    Edit the headlines, subtitles, and CTAs displayed during the 3D scroll journey.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved story scene copy")}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brass hover:brightness-110 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Scenes Changes"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {[
                  { key: "s01", title: "Scene 01 — Awakening" },
                  { key: "s02", title: "Scene 02 — Connection" },
                  { key: "s03", title: "Scene 03 — Intelligence" },
                  { key: "s04", title: "Scene 04 — This is BizzPal" },
                  { key: "s05", title: "Scene 05 — Expansion" },
                  { key: "s06", title: "Scene 06 — Human + AI" },
                ].map(({ key, title }) => {
                  const s = websiteConfig.scenes?.[key] || {};
                  return (
                    <div key={key} className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-text">{title}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              scenes: {
                                ...websiteConfig.scenes,
                                [key]: { ...s, enabled: s.enabled === false ? true : false },
                              },
                            })
                          }
                          className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                            s.enabled !== false
                              ? "bg-jade/15 border-jade/30 text-jade"
                              : "bg-surface border-line text-text-muted"
                          }`}
                        >
                          {s.enabled !== false ? "Active" : "Hidden"}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Eyebrow text"
                        value={s.eyebrow || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            scenes: {
                              ...websiteConfig.scenes,
                              [key]: { ...s, eyebrow: e.target.value },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                      />
                      <textarea
                        rows={2}
                        placeholder="Headline text"
                        value={s.headline || ""}
                        onChange={(e) =>
                          setWebsiteConfig({
                            ...websiteConfig,
                            scenes: {
                              ...websiteConfig.scenes,
                              [key]: { ...s, headline: e.target.value },
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                      />
                      {s.lead !== undefined && (
                        <textarea
                          rows={2}
                          placeholder="Lead paragraph"
                          value={s.lead || ""}
                          onChange={(e) =>
                            setWebsiteConfig({
                              ...websiteConfig,
                              scenes: {
                                ...websiteConfig.scenes,
                                [key]: { ...s, lead: e.target.value },
                              },
                            })
                          }
                          className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                        />
                      )}
                    </div>
                  );
                })}

                {/* Scene 07 with Final Action Button */}
                <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-3 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text">Scene 07 — Future & Final CTA Button</span>
                    <button
                      type="button"
                      onClick={() =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          scenes: {
                            ...websiteConfig.scenes,
                            s07: {
                              ...websiteConfig.scenes?.s07,
                              enabled: websiteConfig.scenes?.s07?.enabled === false ? true : false,
                            },
                          },
                        })
                      }
                      className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                        websiteConfig.scenes?.s07?.enabled !== false
                          ? "bg-jade/15 border-jade/30 text-jade"
                          : "bg-surface border-line text-text-muted"
                      }`}
                    >
                      {websiteConfig.scenes?.s07?.enabled !== false ? "Active" : "Hidden"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-text-muted">Eyebrow</label>
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">Headline</label>
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">CTA Button Label</label>
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted">CTA Button Href</label>
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: About & Solutions */}
          {subWebTab === "about_solutions" && (
            <div className="p-5 rounded-2xl bg-surface border border-line space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text">About & Solutions Content</h2>
                  <p className="text-xs text-text-muted">
                    Configure narrative copy, approach pillars, and capabilities cards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved About & Solutions content")}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brass hover:brightness-110 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save About/Solutions"}</span>
                </button>
              </div>

              {/* About Text */}
              <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-3">
                <span className="text-xs font-semibold text-text block">About Narrative</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-text-muted">Headline</label>
                    <input
                      type="text"
                      value={websiteConfig.about?.headline || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, headline: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted">Eyebrow</label>
                    <input
                      type="text"
                      value={websiteConfig.about?.eyebrow || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, eyebrow: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-text-muted">Paragraph 1</label>
                    <textarea
                      rows={2}
                      value={websiteConfig.about?.p1 || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, p1: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-text-muted">Paragraph 2</label>
                    <textarea
                      rows={2}
                      value={websiteConfig.about?.p2 || ""}
                      onChange={(e) =>
                        setWebsiteConfig({
                          ...websiteConfig,
                          about: { ...websiteConfig.about, p2: e.target.value },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text"
                    />
                  </div>
                </div>
              </div>

              {/* Approach Pillars Full CRUD */}
              <div className="p-4 rounded-xl bg-surface-2/60 border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text">Approach Pillars (Step-by-Step Methodology)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = websiteConfig.about?.approach || [];
                      const nextNum = String(cur.length + 1).padStart(2, "0");
                      const updated = [...cur, { label: "New Pillar", num: nextNum }];
                      setWebsiteConfig({
                        ...websiteConfig,
                        about: { ...websiteConfig.about, approach: updated },
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-surface border border-line hover:border-brass text-text text-sm font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-brass" />
                    <span>Add Pillar</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(websiteConfig.about?.approach || []).map((pillar: any, pIdx: number) => (
                    <div key={pIdx} className="p-2.5 rounded-xl bg-surface border border-line flex items-center gap-2">
                      <input
                        type="text"
                        value={pillar.num || ""}
                        onChange={(e) => {
                          const list = [...(websiteConfig.about?.approach || [])];
                          list[pIdx] = { ...list[pIdx], num: e.target.value };
                          setWebsiteConfig({
                            ...websiteConfig,
                            about: { ...websiteConfig.about, approach: list },
                          });
                        }}
                        className="w-12 px-2 py-1 rounded-lg bg-surface-2 border border-line text-sm font-mono font-semibold text-brass text-center"
                      />
                      <input
                        type="text"
                        value={pillar.label || ""}
                        onChange={(e) => {
                          const list = [...(websiteConfig.about?.approach || [])];
                          list[pIdx] = { ...list[pIdx], label: e.target.value };
                          setWebsiteConfig({
                            ...websiteConfig,
                            about: { ...websiteConfig.about, approach: list },
                          });
                        }}
                        className="flex-1 px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-sm text-text font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const list = (websiteConfig.about?.approach || []).filter((_: any, i: number) => i !== pIdx);
                          setWebsiteConfig({
                            ...websiteConfig,
                            about: { ...websiteConfig.about, approach: list },
                          });
                        }}
                        className="p-1 rounded text-text-muted hover:text-rust cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Solution Capability Cards Full CRUD */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text">Capabilities Cards ({(websiteConfig.solutions?.cards || []).length} Cards)</span>
                  <button
                    type="button"
                    onClick={() => {
                      const cur = websiteConfig.solutions?.cards || [];
                      const nextNum = String(cur.length + 1).padStart(2, "0");
                      const newCard = {
                        id: `c_${Date.now()}`,
                        num: nextNum,
                        fx: "ai",
                        title: "Autonomous Intelligence",
                        desc: "Next-generation autonomous system built around enterprise challenges.",
                        enabled: true,
                      };
                      setWebsiteConfig({
                        ...websiteConfig,
                        solutions: { ...websiteConfig.solutions, cards: [...cur, newCard] },
                      });
                    }}
                    className="px-3 py-1.5 rounded-xl bg-surface border border-line hover:border-brass text-text text-sm font-semibold flex items-center gap-1.5 cursor-pointer "
                  >
                    <Plus className="w-3.5 h-3.5 text-brass" />
                    <span>Add Capability Card</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(websiteConfig.solutions?.cards || []).map((card: any, idx: number) => (
                    <div key={card.id || idx} className="p-3.5 rounded-xl bg-surface-2/60 border border-line space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={card.num || `0${idx+1}`}
                            onChange={(e) => {
                              const updatedCards = [...websiteConfig.solutions.cards];
                              updatedCards[idx] = { ...updatedCards[idx], num: e.target.value };
                              setWebsiteConfig({
                                ...websiteConfig,
                                solutions: { ...websiteConfig.solutions, cards: updatedCards },
                              });
                            }}
                            className="w-10 px-1.5 py-0.5 rounded bg-surface border border-line font-mono font-semibold text-xs text-brass text-center"
                          />
                          <select
                            value={card.fx || "ai"}
                            onChange={(e) => {
                              const updatedCards = [...websiteConfig.solutions.cards];
                              updatedCards[idx] = { ...updatedCards[idx], fx: e.target.value };
                              setWebsiteConfig({
                                ...websiteConfig,
                                solutions: { ...websiteConfig.solutions, cards: updatedCards },
                              });
                            }}
                            className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-xs text-text"
                          >
                            <option value="ai">FX: ai</option>
                            <option value="auto">FX: auto</option>
                            <option value="data">FX: data</option>
                            <option value="digital">FX: digital</option>
                            <option value="custom">FX: custom</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const updatedCards = [...websiteConfig.solutions.cards];
                              updatedCards[idx] = { ...updatedCards[idx], enabled: card.enabled === false ? true : false };
                              setWebsiteConfig({
                                ...websiteConfig,
                                solutions: { ...websiteConfig.solutions, cards: updatedCards },
                              });
                            }}
                            className={`px-2 py-0.5 rounded text-xs font-semibold border cursor-pointer ${
                              card.enabled !== false
                                ? "bg-jade/15 border-jade/30 text-jade"
                                : "bg-surface border-line text-text-muted"
                            }`}
                          >
                            {card.enabled !== false ? "Active" : "Hidden"}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!(await askConfirm({ title: `Delete the "${card.title}" card?`, confirmLabel: "Delete", danger: true }))) return;
                              const updatedCards = (websiteConfig.solutions?.cards || []).filter((_: any, i: number) => i !== idx);
                              setWebsiteConfig({
                                ...websiteConfig,
                                solutions: { ...websiteConfig.solutions, cards: updatedCards },
                              });
                            }}
                            className="p-1 rounded text-text-muted hover:text-rust cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
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
                        className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-line text-sm text-text font-semibold"
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
                        className="w-full px-2.5 py-1 rounded-lg bg-surface border border-line text-sm text-text"
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
                  <h2 className="text-base font-semibold text-text">Contact Onboarding & Direct Channels</h2>
                  <p className="text-xs text-text-muted">
                    Configure the onboarding form headline, CTA button, contact emails, and social profiles.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => saveSection("website", websiteConfig, "Saved contact details & socials")}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-brass hover:brightness-110 text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Contact Info"}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">Headline</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.headline || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, headline: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">Form CTA Button Label</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.ctaText || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, ctaText: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">Direct Contact Email</label>
                  <input
                    type="email"
                    value={websiteConfig.contact?.email || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, email: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">Website Domain Display</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.site || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, site: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">LinkedIn Profile URL</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.linkedin || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, linkedin: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">X / Twitter Profile URL</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.twitter || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, twitter: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">GitHub URL (Optional)</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.github || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, github: e.target.value },
                      })
                    }
                    placeholder="https://github.com/..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-text">WhatsApp Direct Chat Link (Optional)</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.whatsapp || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, whatsapp: e.target.value },
                      })
                    }
                    placeholder="https://wa.me/..."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text font-mono"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-text">Note / Privacy Notice</label>
                  <input
                    type="text"
                    value={websiteConfig.contact?.note || ""}
                    onChange={(e) =>
                      setWebsiteConfig({
                        ...websiteConfig,
                        contact: { ...websiteConfig.contact, note: e.target.value },
                      })
                    }
                    placeholder="Opens your mail app — nothing is stored on this page."
                    className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-sm text-text"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Navbar, Vision Words, Announcement, Stats, Footer */}
          {(subWebTab === "nav_brand" || subWebTab === "vision_words" || subWebTab === "announcement" || subWebTab === "stats" || subWebTab === "footer") && (
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
      {/* CUSTOMER APP: SIDEBAR LINKS                                   */}
      {/* ============================================================= */}
      {activeTab === "navigation" && (
        <Panel>
          <PanelToolbar>
            <p className="text-sm text-text-muted">
              {navItems.filter((n) => n.enabled !== false).length} of {navItems.length} links shown
            </p>
            <button type="button" onClick={() => handleOpenNavModal()} className={`${primaryButton} sm:ml-auto`}>
              <Plus className="w-4 h-4" /> Add link
            </button>
          </PanelToolbar>
          {navItems.length === 0 ? (
            <EmptyState title="No links yet" text="Add the first link of the customer sidebar." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={`${th} w-16`}>Order</th>
                    <th className={th}>Link</th>
                    <th className={th}>Group</th>
                    <th className={th}>Icon</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...navItems]
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-surface-2/40">
                        <td className={`${td} text-text-muted tabular-nums`}>{item.order}</td>
                        <td className={td}>
                          <p className="font-medium text-text">
                            {item.label}
                            {item.badge ? <span className="ml-2 text-xs font-normal text-text-muted">{item.badge}</span> : null}
                          </p>
                          <p className="text-xs text-text-muted">{item.href}</p>
                        </td>
                        <td className={`${td} text-text-muted capitalize`}>{item.group || "core"}</td>
                        <td className={`${td} text-text-muted`}>{item.icon}</td>
                        <td className={td}>
                          <StatusToggle on={item.enabled !== false} onClick={() => handleToggleNavItem(item)} />
                        </td>
                        <td className={`${td} text-right`}>
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => handleOpenNavModal(item)} className={iconButton} title="Edit" aria-label={`Edit ${item.label}`}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleDeleteNavItem(item.id, item.label)} className={dangerIconButton} title="Delete" aria-label={`Delete ${item.label}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {/* ============================================================= */}
      {/* CUSTOMER APP: FEATURE SWITCHES                                */}
      {/* ============================================================= */}
      {activeTab === "features" && featuresConfig && (
        <div className="space-y-6">
          <Panel>
            <div className="px-5 py-3.5 border-b border-line">
              <h2 className="text-sm font-semibold text-text">Customer app</h2>
            </div>
            <div className="divide-y divide-line">
              {[
                { key: "enableAiCopilot", title: "Ask AI button", desc: "The floating button that opens the AI advisor on every page." },
                { key: "enableDailyCheckin", title: "Daily check-in", desc: "The short daily check-in at the top of the dashboard." },
                { key: "enableCommandPalette", title: "Quick search (Ctrl + K)", desc: "Search to jump to any page, number or task." },
                { key: "enableWhatsApp", title: "Daily email briefing", desc: "Lets customers turn on a short daily email with their numbers and open tasks." },
                { key: "enableToolsCatalog", title: "Tools page", desc: "Calculators such as break-even, pricing and customer acquisition cost." },
              ].map((feat) => {
                const isEnabled = featuresConfig[feat.key] !== false;
                return (
                  <div key={feat.key} className="px-5 py-4 flex items-center justify-between gap-6">
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-text">{feat.title}</h3>
                      <p className="text-sm text-text-muted mt-0.5">{feat.desc}</p>
                    </div>
                    <Switch on={isEnabled} onChange={() => handleToggleFeature(feat.key)} label={feat.title} />
                  </div>
                );
              })}
            </div>
          </Panel>

          <DataPalFeatureFlagsSection />
        </div>
      )}

      {/* ============================================================= */}
      {/* CUSTOMER APP: DASHBOARD WIDGETS                               */}
      {/* ============================================================= */}
      {activeTab === "widgets" && (
        <Panel>
          <PanelToolbar>
            <p className="text-sm text-text-muted">
              {widgets.filter((w) => w.enabled !== false).length} of {widgets.length} widgets shown · higher order shows first
            </p>
            <button type="button" onClick={() => handleOpenWidgetModal()} className={`${primaryButton} sm:ml-auto`}>
              <Plus className="w-4 h-4" /> Add widget
            </button>
          </PanelToolbar>
          {widgets.length === 0 ? (
            <EmptyState title="No widgets yet" text="Add the first block of the customer dashboard." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={th}>Widget</th>
                    <th className={th}>Width</th>
                    <th className={th}>Order</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[...widgets]
                    .sort((x, y) => y.priority - x.priority)
                    .map((widget) => (
                      <tr key={widget.id} className="hover:bg-surface-2/40">
                        <td className={`${td} font-medium text-text`}>{widget.title}</td>
                        <td className={`${td} text-text-muted`}>
                          {widget.defaultSpan >= 4 ? "Full width" : widget.defaultSpan === 2 ? "Half width" : `${widget.defaultSpan} of 4 columns`}
                        </td>
                        <td className={`${td} text-text-muted tabular-nums`}>{widget.priority}</td>
                        <td className={td}>
                          <StatusToggle on={widget.enabled !== false} onClick={() => handleToggleWidget(widget)} />
                        </td>
                        <td className={`${td} text-right`}>
                          <div className="flex items-center justify-end gap-1">
                            <button type="button" onClick={() => handleOpenWidgetModal(widget)} className={iconButton} title="Edit" aria-label={`Edit ${widget.title}`}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => handleDeleteWidget(widget.id, widget.title)} className={dangerIconButton} title="Delete" aria-label={`Delete ${widget.title}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {activeTab === "datapal" && <DataPalUsageManager />}

      {/* ============================================================= */}
      {/* CUSTOMER APP: TOOLS                                           */}
      {/* ============================================================= */}
      {activeTab === "tools" && (
        <Panel>
          <PanelToolbar>
            <p className="text-sm text-text-muted">
              {tools.filter((t) => t.enabled !== false).length} of {tools.length} tools shown
            </p>
            <button type="button" onClick={() => handleOpenToolModal()} className={`${primaryButton} sm:ml-auto`}>
              <Plus className="w-4 h-4" /> Add tool
            </button>
          </PanelToolbar>
          {tools.length === 0 ? (
            <EmptyState title="No tools yet" text="Add the first tool customers can open." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={th}>Tool</th>
                    <th className={th}>Category</th>
                    <th className={th}>Plan</th>
                    <th className={th}>Status</th>
                    <th className={`${th} text-right`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {tools.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-2/40">
                      <td className={td}>
                        <p className="font-medium text-text">{t.name}</p>
                        <p className="text-xs text-text-muted mt-0.5 max-w-lg line-clamp-1">{t.description}</p>
                      </td>
                      <td className={`${td} text-text-muted capitalize`}>{t.category}</td>
                      <td className={`${td} text-text-muted capitalize`}>{t.requiredPlan}</td>
                      <td className={td}>
                        <StatusToggle on={t.enabled !== false} onClick={() => handleToggleTool(t)} />
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => handleOpenToolModal(t)} className={iconButton} title="Edit" aria-label={`Edit ${t.name}`}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => handleDeleteTool(t.id, t.name)} className={dangerIconButton} title="Delete" aria-label={`Delete ${t.name}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {activeTab === "tools" && <AgentEvaluationsSection notify={notify} />}

      {/* ============================================================= */}
      {/* SETTINGS: CHANGE HISTORY                                      */}
      {/* ============================================================= */}
      {activeTab === "audit" && (
        <Panel>
          {auditLogs.length === 0 ? (
            <EmptyState title="No changes yet" text="Every change saved in this console will be listed here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className={th}>Change</th>
                    <th className={th}>Area</th>
                    <th className={th}>When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className={`${td} text-text`}>{log.note || log.action}</td>
                      <td className={`${td} text-text-muted capitalize`}>{log.entityType || "—"}</td>
                      <td className={`${td} text-text-muted whitespace-nowrap`}>
                        {new Date(log.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {activeTab === "tools" && <AgentEvaluationsSection notify={notify} />}

      {/* ============================================================= */}
      {/* SETTINGS: BACKUP & RESTORE                                    */}
      {/* ============================================================= */}
      {activeTab === "backup" && (
        <div className="space-y-4 max-w-3xl">
          <Panel>
            <div className="divide-y divide-line">
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-text">Download a backup</h3>
                  <p className="text-sm text-text-muted mt-0.5">
                    Website content, app sidebar, widgets, tools, feature switches and plans, as one JSON file. Settings version {version}.
                  </p>
                </div>
                <button type="button" onClick={handleExportConfig} className={secondaryButton}>
                  Download
                </button>
              </div>
              <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-medium text-text">Restore from a backup</h3>
                  <p className="text-sm text-text-muted mt-0.5">Replace the current settings with the ones in a backup file.</p>
                </div>
                <label className={secondaryButton}>
                  Choose file
                  <input type="file" accept="application/json" onChange={handleImportConfig} className="hidden" />
                </label>
              </div>
            </div>
          </Panel>

          <div className="rounded-xl border border-rust/30 bg-surface px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-medium text-rust">Reset to defaults</h3>
              <p className="text-sm text-text-muted mt-0.5">
                Put every setting back to how BizzPal shipped. Businesses and users are not touched. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={handleFactoryReset}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg border border-rust/40 text-sm text-rust hover:bg-rust/10 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>
      )}
          </div>
        </main>
      </div>

      {/* ============================================================= */}
      {/* MODAL: ADD / EDIT NAVIGATION BUTTON                           */}
      {/* ============================================================= */}
      {!loading && isNavModalOpen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNavModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg max-h-[88vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-brass">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-text">
                    {editingNavItem ? `Edit Navigation Button: ${editingNavItem.label}` : "Add New Navigation Button"}
                  </h3>
                  <p className="text-xs text-text-muted">Sidebar navigation routing & icon configuration</p>
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
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-brass font-semibold"
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
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono focus:outline-none focus:border-brass"
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
                    <option value="Zap">Zap</option>
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
                className="px-5 py-2 rounded-xl text-sm font-medium text-white bg-brass hover:brightness-110 cursor-pointer transition-all text-center"
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
          className="fixed inset-0 z-[9999] bg-slate-950/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsWidgetModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-brass shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text truncate">
                    {editingWidget ? `Edit Widget: ${editingWidget.title}` : "Add Dashboard Widget"}
                  </h3>
                  <p className="text-xs text-text-muted truncate">Executive dashboard modular card configuration</p>
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
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-brass font-semibold text-sm sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">React Component</label>
                <select
                  value={widgetForm.component}
                  onChange={(e) => setWidgetForm({ ...widgetForm, component: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-sm sm:text-sm"
                >
                  <option value="KpiGridWidget">KpiGridWidget (4-column Sparkline Tiles)</option>
                  <option value="HealthScoreWidget">HealthScoreWidget (Gauge + Breakdown)</option>
                  <option value="BriefingWidget">BriefingWidget (Executive Intelligence Brief)</option>
                  <option value="GapsPreviewWidget">GapsPreviewWidget (Priority Gaps & Bottlenecks)</option>
                  <option value="TasksPreviewWidget">TasksPreviewWidget (Execution Queue)</option>
                  <option value="SimulatorHighlightWidget">SimulatorHighlightWidget (Active Simulation)</option>
                  <option value="DataUploadWidget">DataUploadWidget (Data Upload)</option>
                  <option value="AgentResultsWidget">AgentResultsWidget (AI agents this week)</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Default Column Span</label>
                  <select
                    value={widgetForm.defaultSpan}
                    onChange={(e) => setWidgetForm({ ...widgetForm, defaultSpan: Number(e.target.value) as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text text-sm sm:text-sm"
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
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-sm sm:text-sm"
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
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-sm font-medium text-white bg-brass hover:brightness-110 cursor-pointer transition-all text-center"
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
          className="fixed inset-0 z-[9999] bg-slate-950/40 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsToolModalOpen(false);
          }}
        >
          <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-line bg-surface shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-brass shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text truncate">
                    {editingTool ? `Edit Tool: ${editingTool.name}` : "Add Specialist Tool"}
                  </h3>
                  <p className="text-xs text-text-muted truncate">Business specialist calculator & entitlement settings</p>
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
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-brass font-semibold text-sm sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-text">Category</label>
                  <select
                    value={toolForm.category}
                    onChange={(e) => setToolForm({ ...toolForm, category: e.target.value as any })}
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text text-sm sm:text-sm"
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
                    className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text text-sm sm:text-sm"
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
                  className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-line text-text focus:outline-none focus:border-brass text-sm sm:text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-text">Badge</label>
                <input
                  type="text"
                  placeholder="e.g. Valuation, Risk"
                  value={toolForm.badge}
                  onChange={(e) => setToolForm({ ...toolForm, badge: e.target.value })}
                  className="w-full px-2.5 py-2 rounded-xl bg-surface-2 border border-line text-text font-mono text-sm sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-surface-2/60 border border-line hover:border-brass/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={toolForm.enabled}
                    onChange={(e) => setToolForm({ ...toolForm, enabled: e.target.checked })}
                    className="rounded border-line text-brass focus:ring-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text">Tool Active</span>
                    <span className="text-xs text-text-muted">Visible on /tools</span>
                  </div>
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-surface-2/60 border border-line hover:border-brass/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={toolForm.hasInteractiveCalculator}
                    onChange={(e) => setToolForm({ ...toolForm, hasInteractiveCalculator: e.target.checked })}
                    className="rounded border-line text-brass focus:ring-0"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text">Has Calculator</span>
                    <span className="text-xs text-text-muted">Interactive Pop-up</span>
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
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl text-sm font-medium text-white bg-brass hover:brightness-110 cursor-pointer transition-all text-center"
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

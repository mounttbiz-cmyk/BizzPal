import { NextResponse } from "next/server";
import {
  getPlatformConfig,
  setPlatformConfig,
  DEFAULT_WEBSITE_CONFIG,
  DEFAULT_DASHBOARD_FEATURES,
  DEFAULT_TOOLS_CATALOG,
  DEFAULT_SUBSCRIPTION_PLANS,
} from "@/lib/db";
import { defaultNavItems } from "@/config/seeds/defaultNav";
import { defaultWidgets } from "@/config/seeds/defaultWidgets";
import { defaultMetrics } from "@/config/seeds/defaultMetrics";
import { platformConfigStore } from "@/config/store";
import { setFirestoreConfig, getFirestoreConfig } from "@/lib/firebase/firestoreService";

export const dynamic = "force-dynamic";

interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: "publish" | "draft" | "rollback" | "override" | "reset";
  entityType: string;
  entityId: string;
  note?: string;
}

export async function GET() {
  try {
    const website = getPlatformConfig("website_config", DEFAULT_WEBSITE_CONFIG);
    const features = getPlatformConfig("dashboard_features", DEFAULT_DASHBOARD_FEATURES);
    const widgets = getPlatformConfig("dashboard_widgets", defaultWidgets);
    let rawNav = getPlatformConfig("dashboard_nav", defaultNavItems);
    const existingNavIds = new Set((Array.isArray(rawNav) ? rawNav : []).map((n: any) => n.id));
    const missingNavDefaults = defaultNavItems.filter(item => !existingNavIds.has(item.id));
    const nav = Array.isArray(rawNav) ? [...rawNav, ...missingNavDefaults].sort((a: any, b: any) => a.order - b.order) : defaultNavItems;
    const tools = getPlatformConfig("tools_catalog", DEFAULT_TOOLS_CATALOG);
    const plans = getPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);
    const metrics = getPlatformConfig("dashboard_metrics", defaultMetrics);
    const auditLogs = getPlatformConfig<AuditLogItem[]>("audit_logs", [
      {
        id: "log_init",
        timestamp: new Date().toISOString(),
        actor: "Superadmin",
        action: "publish",
        entityType: "system",
        entityId: "init",
        note: "System initialized with enterprise defaults",
      },
    ]);
    const version = getPlatformConfig<number>("config_version", 1);

    return NextResponse.json({
      success: true,
      data: {
        website,
        features,
        nav,
        widgets,
        tools,
        plans,
        metrics,
        auditLogs,
        version,
      },
    });
  } catch (error: any) {
    console.error("Admin config GET error:", error);
    return NextResponse.json({
      success: true,
      data: {
        website: DEFAULT_WEBSITE_CONFIG,
        features: DEFAULT_DASHBOARD_FEATURES,
        nav: defaultNavItems,
        widgets: defaultWidgets,
        tools: DEFAULT_TOOLS_CATALOG,
        plans: DEFAULT_SUBSCRIPTION_PLANS,
        metrics: defaultMetrics,
        auditLogs: [],
        version: 1,
      },
      warning: error.message,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { section, payload, note, actor = "Superadmin" } = body;

    const currentVersion = getPlatformConfig<number>("config_version", 1);
    const nextVersion = currentVersion + 1;
    const currentAuditLogs = getPlatformConfig<AuditLogItem[]>("audit_logs", []);

    const newLog: AuditLogItem = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor,
      action: "publish",
      entityType: section || "all",
      entityId: `v${nextVersion}`,
      note: note || `Published updates to ${section || "platform configuration"}`,
    };

    // Update the targeted section
    if (section === "website" && payload) {
      setPlatformConfig("website_config", payload);
      setFirestoreConfig("website_config", payload).catch(() => {});
    } else if (section === "features" && payload) {
      setPlatformConfig("dashboard_features", payload);
      setFirestoreConfig("dashboard_features", payload).catch(() => {});
    } else if (section === "nav" && payload) {
      setPlatformConfig("dashboard_nav", payload);
      setFirestoreConfig("dashboard_nav", payload).catch(() => {});
      // Synchronize in-memory store
      if (Array.isArray(payload)) {
        platformConfigStore.setNav(payload);
      }
    } else if (section === "widgets" && payload) {
      setPlatformConfig("dashboard_widgets", payload);
      setFirestoreConfig("dashboard_widgets", payload).catch(() => {});
      if (Array.isArray(payload)) {
        platformConfigStore.setWidgets(payload);
      }
    } else if (section === "tools" && payload) {
      setPlatformConfig("tools_catalog", payload);
      setFirestoreConfig("tools_catalog", payload).catch(() => {});
    } else if (section === "plans" && payload) {
      setPlatformConfig("subscription_plans", payload);
      setFirestoreConfig("subscription_plans", payload).catch(() => {});
    } else if (section === "all" && payload) {
      if (payload.website) {
        setPlatformConfig("website_config", payload.website);
        setFirestoreConfig("website_config", payload.website).catch(() => {});
      }
      if (payload.features) {
        setPlatformConfig("dashboard_features", payload.features);
        setFirestoreConfig("dashboard_features", payload.features).catch(() => {});
      }
      if (payload.nav) {
        setPlatformConfig("dashboard_nav", payload.nav);
        setFirestoreConfig("dashboard_nav", payload.nav).catch(() => {});
      }
      if (payload.widgets) {
        setPlatformConfig("dashboard_widgets", payload.widgets);
        setFirestoreConfig("dashboard_widgets", payload.widgets).catch(() => {});
      }
      if (payload.tools) {
        setPlatformConfig("tools_catalog", payload.tools);
        setFirestoreConfig("tools_catalog", payload.tools).catch(() => {});
      }
      if (payload.plans) {
        setPlatformConfig("subscription_plans", payload.plans);
        setFirestoreConfig("subscription_plans", payload.plans).catch(() => {});
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid section or missing payload" },
        { status: 400 }
      );
    }

    // Save audit log & updated version
    const updatedAuditLogs = [newLog, ...currentAuditLogs].slice(0, 100);
    setPlatformConfig("audit_logs", updatedAuditLogs);
    setPlatformConfig("config_version", nextVersion);
    setFirestoreConfig("config_version", nextVersion).catch(() => {});

    return NextResponse.json({
      success: true,
      version: nextVersion,
      auditLogs: updatedAuditLogs,
      message: `Successfully saved ${section} configuration (v${nextVersion})`,
    });
  } catch (error: any) {
    console.error("Admin config POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save configuration" },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  try {
    const currentVersion = getPlatformConfig<number>("config_version", 1);
    const nextVersion = currentVersion + 1;
    const currentAuditLogs = getPlatformConfig<AuditLogItem[]>("audit_logs", []);

    setPlatformConfig("website_config", DEFAULT_WEBSITE_CONFIG);
    setPlatformConfig("dashboard_features", DEFAULT_DASHBOARD_FEATURES);
    setPlatformConfig("dashboard_nav", defaultNavItems);
    setPlatformConfig("dashboard_widgets", defaultWidgets);
    setPlatformConfig("tools_catalog", DEFAULT_TOOLS_CATALOG);
    setPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);
    setPlatformConfig("dashboard_metrics", defaultMetrics);

    // Keep in-memory config store in sync
    platformConfigStore.setNav(defaultNavItems);
    platformConfigStore.setWidgets(defaultWidgets);

    const resetLog: AuditLogItem = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: "Superadmin",
      action: "reset",
      entityType: "system",
      entityId: "factory_reset",
      note: "Reset all platform configurations to factory defaults",
    };

    const updatedAuditLogs = [resetLog, ...currentAuditLogs].slice(0, 100);
    setPlatformConfig("audit_logs", updatedAuditLogs);
    setPlatformConfig("config_version", nextVersion);

    return NextResponse.json({
      success: true,
      version: nextVersion,
      auditLogs: updatedAuditLogs,
      message: "Reset all configurations to default values",
      data: {
        website: DEFAULT_WEBSITE_CONFIG,
        features: DEFAULT_DASHBOARD_FEATURES,
        nav: defaultNavItems,
        widgets: defaultWidgets,
        tools: DEFAULT_TOOLS_CATALOG,
        plans: DEFAULT_SUBSCRIPTION_PLANS,
        metrics: defaultMetrics,
        auditLogs: updatedAuditLogs,
        version: nextVersion,
      },
    }, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Admin config DELETE error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reset configurations" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

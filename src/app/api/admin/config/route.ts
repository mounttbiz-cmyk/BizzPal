import { NextResponse } from "next/server";
import {
  getPlatformConfig,
  setPlatformConfig,
  clearMemoryConfigCache,
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

async function fetchConfigWithCloudFirst<T>(key: string, localFallback: T): Promise<T> {
  try {
    const cloudVal = await getFirestoreConfig<T | null>(key, null);
    if (cloudVal !== null && cloudVal !== undefined) {
      // Mirror to local SQLite cache
      try { setPlatformConfig(key, cloudVal); } catch { }
      return cloudVal;
    }
  } catch (e) {
    console.warn(`[GCP Config] Failed reading ${key} from Firestore:`, e);
  }
  return getPlatformConfig<T>(key, localFallback);
}

export async function GET() {
  try {
    const [website, features, widgets, rawNav, tools, plans, metrics, cloudAuditLogs, cloudVersion] = await Promise.all([
      fetchConfigWithCloudFirst("website_config", DEFAULT_WEBSITE_CONFIG),
      fetchConfigWithCloudFirst("dashboard_features", DEFAULT_DASHBOARD_FEATURES),
      fetchConfigWithCloudFirst("dashboard_widgets", defaultWidgets),
      fetchConfigWithCloudFirst("dashboard_nav", defaultNavItems),
      fetchConfigWithCloudFirst("tools_catalog", DEFAULT_TOOLS_CATALOG),
      fetchConfigWithCloudFirst("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS),
      fetchConfigWithCloudFirst("dashboard_metrics", defaultMetrics),
      fetchConfigWithCloudFirst<AuditLogItem[] | null>("audit_logs", null),
      fetchConfigWithCloudFirst<number | null>("config_version", null),
    ]);

    // Respect user deletions: Never append "missing" defaults back!
    const nav = Array.isArray(rawNav) ? rawNav : defaultNavItems;
    const auditLogs = Array.isArray(cloudAuditLogs) ? cloudAuditLogs : getPlatformConfig<AuditLogItem[]>("audit_logs", [
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
    const version = cloudVersion || getPlatformConfig<number>("config_version", 1);

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

    // Update the targeted section in both local SQLite and permanent GCP Cloud Firestore
    if (section === "website" && payload) {
      clearMemoryConfigCache("website_config");
      setPlatformConfig("website_config", payload);
      await setFirestoreConfig("website_config", payload);
    } else if (section === "features" && payload) {
      clearMemoryConfigCache("dashboard_features");
      setPlatformConfig("dashboard_features", payload);
      await setFirestoreConfig("dashboard_features", payload);
    } else if (section === "nav" && payload) {
      clearMemoryConfigCache("dashboard_nav");
      setPlatformConfig("dashboard_nav", payload);
      await setFirestoreConfig("dashboard_nav", payload);
      // Synchronize in-memory store
      if (Array.isArray(payload)) {
        platformConfigStore.setNav(payload);
      }
    } else if (section === "widgets" && payload) {
      clearMemoryConfigCache("dashboard_widgets");
      setPlatformConfig("dashboard_widgets", payload);
      await setFirestoreConfig("dashboard_widgets", payload);
      if (Array.isArray(payload)) {
        platformConfigStore.setWidgets(payload);
      }
    } else if (section === "tools" && payload) {
      clearMemoryConfigCache("tools_catalog");
      setPlatformConfig("tools_catalog", payload);
      await setFirestoreConfig("tools_catalog", payload);
    } else if (section === "plans" && payload) {
      clearMemoryConfigCache("subscription_plans");
      setPlatformConfig("subscription_plans", payload);
      await setFirestoreConfig("subscription_plans", payload);
    } else if ((section === "all" || section === "import") && payload) {
      clearMemoryConfigCache();
      if (payload.website) {
        setPlatformConfig("website_config", payload.website);
        await setFirestoreConfig("website_config", payload.website);
      }
      if (payload.features) {
        setPlatformConfig("dashboard_features", payload.features);
        await setFirestoreConfig("dashboard_features", payload.features);
      }
      if (payload.nav) {
        setPlatformConfig("dashboard_nav", payload.nav);
        await setFirestoreConfig("dashboard_nav", payload.nav);
        if (Array.isArray(payload.nav)) platformConfigStore.setNav(payload.nav);
      }
      if (payload.widgets) {
        setPlatformConfig("dashboard_widgets", payload.widgets);
        await setFirestoreConfig("dashboard_widgets", payload.widgets);
        if (Array.isArray(payload.widgets)) platformConfigStore.setWidgets(payload.widgets);
      }
      if (payload.tools) {
        setPlatformConfig("tools_catalog", payload.tools);
        await setFirestoreConfig("tools_catalog", payload.tools);
      }
      if (payload.plans) {
        setPlatformConfig("subscription_plans", payload.plans);
        await setFirestoreConfig("subscription_plans", payload.plans);
      }
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid section or missing payload" },
        { status: 400 }
      );
    }

    // Save audit log & updated version to both SQLite and GCP Firestore
    const updatedAuditLogs = [newLog, ...currentAuditLogs].slice(0, 100);
    setPlatformConfig("audit_logs", updatedAuditLogs);
    setPlatformConfig("config_version", nextVersion);
    await setFirestoreConfig("audit_logs", updatedAuditLogs);
    await setFirestoreConfig("config_version", nextVersion);

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

    clearMemoryConfigCache();
    setPlatformConfig("website_config", DEFAULT_WEBSITE_CONFIG);
    setPlatformConfig("dashboard_features", DEFAULT_DASHBOARD_FEATURES);
    setPlatformConfig("dashboard_nav", defaultNavItems);
    setPlatformConfig("dashboard_widgets", defaultWidgets);
    setPlatformConfig("tools_catalog", DEFAULT_TOOLS_CATALOG);
    setPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);
    setPlatformConfig("dashboard_metrics", defaultMetrics);

    // Sync reset to permanent GCP Firestore
    await Promise.allSettled([
      setFirestoreConfig("website_config", DEFAULT_WEBSITE_CONFIG),
      setFirestoreConfig("dashboard_features", DEFAULT_DASHBOARD_FEATURES),
      setFirestoreConfig("dashboard_nav", defaultNavItems),
      setFirestoreConfig("dashboard_widgets", defaultWidgets),
      setFirestoreConfig("tools_catalog", DEFAULT_TOOLS_CATALOG),
      setFirestoreConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS),
      setFirestoreConfig("dashboard_metrics", defaultMetrics),
    ]);

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

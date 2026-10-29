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
import { getFirestoreConfig } from "@/lib/firebase/firestoreService";

export const dynamic = "force-dynamic";

async function fetchPublicConfigWithCloudFirst<T>(key: string, localFallback: T): Promise<T> {
  try {
    const cloudVal = await getFirestoreConfig<T | null>(key, null);
    if (cloudVal !== null && cloudVal !== undefined) {
      try { setPlatformConfig(key, cloudVal); } catch { }
      return cloudVal;
    }
  } catch (e) {
    console.warn(`[Public GCP Config] Failed reading ${key} from Firestore:`, e);
  }
  return getPlatformConfig<T>(key, localFallback);
}

export async function GET() {
  try {
    const [website, features, rawNav, tools, widgets, plans] = await Promise.all([
      fetchPublicConfigWithCloudFirst("website_config", DEFAULT_WEBSITE_CONFIG),
      fetchPublicConfigWithCloudFirst("dashboard_features", DEFAULT_DASHBOARD_FEATURES),
      fetchPublicConfigWithCloudFirst("dashboard_nav", defaultNavItems),
      fetchPublicConfigWithCloudFirst("tools_catalog", DEFAULT_TOOLS_CATALOG),
      fetchPublicConfigWithCloudFirst("dashboard_widgets", defaultWidgets),
      fetchPublicConfigWithCloudFirst("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS),
    ]);

    const sanitizeNav = (items: any[]) => (Array.isArray(items) ? items : []).map(item => ({
      ...item,
      icon: (item.id === "nav_chat" || item.label === "AI Workspace") ? "BrainCircuit"
        : (item.id === "nav_strategy" || item.label === "Growth Strategy") ? "Target"
          : (item.id === "nav_playbooks" || item.label === "Executive Playbooks") ? "BookOpen"
            : (item.id === "nav_analytics" || item.label === "Adaptive Analytics") ? "BarChart3"
              : item.icon,
      badge: ((item.id === "nav_strategy" || item.label === "Growth Strategy") && item.badge === "NEW") ||
        ((item.id === "nav_playbooks" || item.label === "Executive Playbooks") && item.badge === "PRO")
        ? undefined
        : item.badge,
    }));

    // Respect user deletions: Only default if completely non-existent / null, NEVER append missing defaults!
    const nav = Array.isArray(rawNav) ? sanitizeNav(rawNav) : sanitizeNav(defaultNavItems);

    const finalTools = Array.isArray(tools) ? tools : DEFAULT_TOOLS_CATALOG;
    const finalWidgets = Array.isArray(widgets) ? widgets : defaultWidgets;

    return NextResponse.json({
      success: true,
      website,
      features,
      nav,
      tools: finalTools,
      widgets: finalWidgets,
      plans,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Failed to fetch public config:", error);
    return NextResponse.json(
      {
        success: true,
        website: DEFAULT_WEBSITE_CONFIG,
        features: DEFAULT_DASHBOARD_FEATURES,
        nav: defaultNavItems,
        tools: DEFAULT_TOOLS_CATALOG,
        widgets: defaultWidgets,
        plans: DEFAULT_SUBSCRIPTION_PLANS,
        warning: error.message,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        }
      }
    );
  }
}

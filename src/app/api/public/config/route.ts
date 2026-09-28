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

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const website = getPlatformConfig("website_config", DEFAULT_WEBSITE_CONFIG);
    const features = getPlatformConfig("dashboard_features", DEFAULT_DASHBOARD_FEATURES);
    let nav = getPlatformConfig("dashboard_nav", defaultNavItems);
    let tools = getPlatformConfig("tools_catalog", DEFAULT_TOOLS_CATALOG);
    let widgets = getPlatformConfig("dashboard_widgets", defaultWidgets);
    let plans = getPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);

    const sanitizeNav = (items: any[]) => items.map(item => ({
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

    // If database had empty sets, seed with defaults; otherwise ensure all defaults like DataPal are present
    if (!Array.isArray(nav) || nav.length === 0) {
      nav = sanitizeNav(defaultNavItems);
      setPlatformConfig("dashboard_nav", nav);
    } else {
      const existingIds = new Set(nav.map((n: any) => n.id));
      const existingHrefs = new Set(nav.map((n: any) => n.href));
      const missingDefaults = defaultNavItems.filter(
        item => !existingIds.has(item.id) && !existingHrefs.has(item.href)
      );
      nav = [...nav, ...missingDefaults].sort((a: any, b: any) => a.order - b.order);
      nav = sanitizeNav(nav);
      setPlatformConfig("dashboard_nav", nav);
    }

    if (!Array.isArray(tools) || tools.length === 0) {
      tools = DEFAULT_TOOLS_CATALOG;
      setPlatformConfig("tools_catalog", tools);
    }

    if (!Array.isArray(widgets) || widgets.length === 0) {
      widgets = defaultWidgets;
      setPlatformConfig("dashboard_widgets", widgets);
    }

    return NextResponse.json({
      success: true,
      website,
      features,
      nav,
      tools,
      widgets,
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

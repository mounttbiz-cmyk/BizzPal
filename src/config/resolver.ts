import { platformConfigStore } from "./store";
import { ThemeTokens } from "./schemas/theme";
import { NavItem } from "./schemas/nav";
import { WidgetDef } from "./schemas/widget";
import { MetricDef } from "./schemas/metric";
import { AgentDef } from "./schemas/agent";
import { GapRule } from "./schemas/rule";
import { ScenarioTemplate } from "./schemas/simulator";

export interface TenantContext {
  id: string;
  name: string;
  industry: "saas" | "d2c" | "agency" | "retail" | "manufacturing" | "services" | "other";
  businessModel: "subscription" | "one-time" | "retainer" | "marketplace" | "usage";
  stage: "idea" | "early_revenue" | "growing" | "scaling";
  teamSize: number;
  plan: "starter" | "growth" | "enterprise";
  currency: string;
}

export interface ResolvedPlatformConfig {
  version: number;
  theme: ThemeTokens;
  nav: NavItem[];
  widgets: WidgetDef[];
  metrics: MetricDef[];
  agents: AgentDef[];
  rules: GapRule[];
  scenarios: ScenarioTemplate[];
}

export function resolveTenantConfig(tenant?: Partial<TenantContext>): ResolvedPlatformConfig {
  const currentVersion = platformConfigStore.getVersion();
  const theme = platformConfigStore.getTheme();
  const allNav: NavItem[] = platformConfigStore.getNav();
  const allWidgets: WidgetDef[] = platformConfigStore.getWidgets();
  const allMetrics = platformConfigStore.getMetrics();
  const allAgents = platformConfigStore.getAgents();
  const allRules = platformConfigStore.getRules();
  const allScenarios = platformConfigStore.getScenarios();

  const industry = tenant?.industry || "saas";
  const model = tenant?.businessModel || "subscription";

  // Filter and sort navigation based on enabled state
  const nav = allNav
    .filter(item => item.enabled)
    .sort((a, b) => a.order - b.order);

  // Filter widgets matching tenant criteria and sort by priority descending
  const widgets = allWidgets
    .filter(w => {
      if (!w.enabled) return false;
      if (w.requires?.industries && w.requires.industries.length > 0) {
        if (!w.requires.industries.includes(industry)) return false;
      }
      if (w.requires?.models && w.requires.models.length > 0) {
        if (!w.requires.models.includes(model)) return false;
      }
      return true;
    })
    .sort((a, b) => b.priority - a.priority);

  // Filter metrics matching tenant industry and business model
  const metrics = allMetrics.filter(m => {
    if (!m.enabled) return false;
    const matchesIndustry = !m.appliesTo.industries || m.appliesTo.industries.length === 0 || m.appliesTo.industries.includes(industry);
    const matchesModel = !m.appliesTo.models || m.appliesTo.models.length === 0 || m.appliesTo.models.includes(model);
    return matchesIndustry && matchesModel;
  });

  // Filter agents matching tenant
  const agents = allAgents.filter(a => {
    if (a.status !== "active") return false;
    if (a.enablementRules.alwaysEnabled) return true;
    return true;
  });

  // Filter rules
  const rules = allRules.filter(r => r.enabled);

  // Filter scenarios
  const scenarios = allScenarios.filter(s => s.enabled);

  return {
    version: currentVersion,
    theme,
    nav,
    widgets,
    metrics,
    agents,
    rules,
    scenarios,
  };
}

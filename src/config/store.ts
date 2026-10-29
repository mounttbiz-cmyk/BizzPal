import { defaultTheme } from "./seeds/defaultTheme";
import { defaultNavItems } from "./seeds/defaultNav";
import { defaultWidgets } from "./seeds/defaultWidgets";
import { defaultMetrics } from "./seeds/defaultMetrics";
import { defaultAgents } from "./seeds/defaultAgents";
import { defaultGapRules } from "./seeds/defaultRules";
import { defaultScenarioTemplates } from "./seeds/defaultScenarios";

import { ThemeTokens, ThemeTokensSchema } from "./schemas/theme";
import { NavItem, NavItemSchema } from "./schemas/nav";
import { WidgetDef, WidgetDefSchema } from "./schemas/widget";
import { MetricDef, MetricDefSchema } from "./schemas/metric";
import { AgentDef, AgentDefSchema } from "./schemas/agent";
import { GapRule, GapRuleSchema } from "./schemas/rule";
import { ScenarioTemplate, ScenarioTemplateSchema } from "./schemas/simulator";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: "publish" | "draft" | "rollback" | "override";
  entityType: string;
  entityId: string;
  note?: string;
  before?: any;
  after?: any;
}

export interface ConfigVersionSnapshot {
  version: number;
  timestamp: string;
  note: string;
  theme: ThemeTokens;
  nav: NavItem[];
  widgets: WidgetDef[];
  metrics: MetricDef[];
  agents: AgentDef[];
  rules: GapRule[];
  scenarios: ScenarioTemplate[];
}

class PlatformConfigStore {
  private currentVersion: number = 1;
  private theme: ThemeTokens = defaultTheme;
  private nav: NavItem[] = [...defaultNavItems];
  private widgets: WidgetDef[] = [...defaultWidgets];
  private metrics: MetricDef[] = [...defaultMetrics];
  private agents: AgentDef[] = [...defaultAgents];
  private rules: GapRule[] = [...defaultGapRules];
  private scenarios: ScenarioTemplate[] = [...defaultScenarioTemplates];

  // Draft buffer
  private draftTheme?: ThemeTokens;
  private draftNav?: NavItem[];
  private draftWidgets?: WidgetDef[];

  // History & Audit Log
  private versions: ConfigVersionSnapshot[] = [];
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    // Attempt to load persisted configuration from SQLite if running server-side
    if (typeof window === "undefined") {
      try {
        const { getPlatformConfig } = require("@/lib/db");
        const persistedNav = getPlatformConfig("dashboard_nav", null);
        if (Array.isArray(persistedNav)) {
          this.nav = [...persistedNav];
        }
        const persistedWidgets = getPlatformConfig("dashboard_widgets", null);
        if (Array.isArray(persistedWidgets) && persistedWidgets.length > 0) {
          this.widgets = persistedWidgets;
        }
        const persistedMetrics = getPlatformConfig("dashboard_metrics", null);
        if (Array.isArray(persistedMetrics) && persistedMetrics.length > 0) {
          this.metrics = persistedMetrics;
        }
        const persistedVersion = getPlatformConfig("config_version", null);
        if (typeof persistedVersion === "number") {
          this.currentVersion = persistedVersion;
        }
        const persistedLogs = getPlatformConfig("audit_logs", null);
        if (Array.isArray(persistedLogs) && persistedLogs.length > 0) {
          this.auditLogs = persistedLogs;
        }
      } catch (err) {
        // Fallback to initial seeds gracefully
      }
    }
    this.recordSnapshot("Initial system seed defaults loaded");
  }

  // Getters for live production config
  getTheme() { return this.theme; }
  getNav() { return this.nav; }
  getWidgets() { return this.widgets; }
  getMetrics() { return this.metrics; }
  getAgents() { return this.agents; }
  getRules() { return this.rules; }
  getScenarios() { return this.scenarios; }
  getVersion() { return this.currentVersion; }
  getAuditLogs() { return this.auditLogs; }
  getVersions() { return this.versions; }

  // Zod-validated mutations
  updateThemeDraft(data: unknown) {
    const validated = ThemeTokensSchema.parse(data);
    this.draftTheme = validated;
    this.logAudit("draft", "theme", validated.id, "Saved theme draft");
    return this.draftTheme;
  }

  setNav(items: NavItem[]) {
    this.nav = [...items];
    return this.nav;
  }

  setWidgets(widgets: WidgetDef[]) {
    this.widgets = [...widgets];
    return this.widgets;
  }

  updateWidget(widget: unknown) {
    const validated = WidgetDefSchema.parse(widget);
    const idx = this.widgets.findIndex(w => w.id === validated.id);
    const before = idx >= 0 ? this.widgets[idx] : undefined;
    if (idx >= 0) {
      this.widgets[idx] = validated;
    } else {
      this.widgets.push(validated);
    }
    this.logAudit("publish", "widget", validated.id, `Updated widget ${validated.title}`, before, validated);
    return validated;
  }

  updateNavItem(nav: unknown) {
    const validated = NavItemSchema.parse(nav);
    const idx = this.nav.findIndex(n => n.id === validated.id);
    const before = idx >= 0 ? this.nav[idx] : undefined;
    if (idx >= 0) {
      this.nav[idx] = validated;
    } else {
      this.nav.push(validated);
    }
    this.logAudit("publish", "nav_item", validated.id, `Updated nav ${validated.label}`, before, validated);
    return validated;
  }

  publishDrafts(note: string) {
    if (this.draftTheme) {
      this.theme = this.draftTheme;
      this.draftTheme = undefined;
    }
    if (this.draftNav) {
      this.nav = this.draftNav;
      this.draftNav = undefined;
    }
    if (this.draftWidgets) {
      this.widgets = this.draftWidgets;
      this.draftWidgets = undefined;
    }
    this.currentVersion += 1;
    this.recordSnapshot(note);
    this.logAudit("publish", "platform_config", `v${this.currentVersion}`, note);
    return this.currentVersion;
  }

  rollbackToVersion(targetVersion: number) {
    const snapshot = this.versions.find(v => v.version === targetVersion);
    if (!snapshot) {
      throw new Error(`Version ${targetVersion} not found in history`);
    }
    this.theme = { ...snapshot.theme };
    this.nav = [...snapshot.nav];
    this.widgets = [...snapshot.widgets];
    this.metrics = [...snapshot.metrics];
    this.agents = [...snapshot.agents];
    this.rules = [...snapshot.rules];
    this.scenarios = [...snapshot.scenarios];
    this.currentVersion += 1;
    this.recordSnapshot(`Rolled back to version ${targetVersion}`);
    this.logAudit("rollback", "platform_config", `v${targetVersion}`, `Rolled back to snapshot v${targetVersion}`);
    return this.currentVersion;
  }

  private recordSnapshot(note: string) {
    this.versions.unshift({
      version: this.currentVersion,
      timestamp: new Date().toISOString(),
      note,
      theme: { ...this.theme },
      nav: [...this.nav],
      widgets: [...this.widgets],
      metrics: [...this.metrics],
      agents: [...this.agents],
      rules: [...this.rules],
      scenarios: [...this.scenarios],
    });
  }

  private logAudit(
    action: AuditLogEntry["action"],
    entityType: string,
    entityId: string,
    note?: string,
    before?: any,
    after?: any
  ) {
    this.auditLogs.unshift({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor: "platform_admin",
      action,
      entityType,
      entityId,
      note,
      before,
      after,
    });
  }
}

// Global singleton instance
export const platformConfigStore = new PlatformConfigStore();

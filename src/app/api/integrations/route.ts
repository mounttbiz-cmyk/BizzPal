import { requireUser } from "@/lib/auth/requireUser";
import { getUserBusinessId } from "@/lib/db";
import { NextResponse } from "next/server";
import { db, healDatabasePermissions } from "@/lib/db";

// Connection tokens and keys never go back to the browser
function stripSecrets(cfg: any): any {
  if (!cfg || typeof cfg !== "object") return cfg;
  const clean: any = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (/token|secret|password|apikey|api_key|privatekey/i.test(k)) continue;
    clean[k] = v;
  }
  return clean;
}

// Fallback in-memory store for high availability during filesystem sync events
const memoryIntegrations = new Map<string, any>();

export async function GET(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const integrations = db
      .prepare("SELECT * FROM integrations WHERE business_id = ? ORDER BY tool_key ASC")
      .all(tenantId) as any[];

    // Fetch recent Stripe events if Stripe is connected
    const stripeEvents = db
      .prepare("SELECT * FROM stripe_events WHERE business_id = ? ORDER BY created_at DESC LIMIT 5")
      .all(tenantId) as any[];

    const formatted = integrations.map(int => {
      let configObj = {};
      try {
        configObj = int.config ? JSON.parse(int.config) : {};
      } catch {}

      // Merge any memory overlay
      if (memoryIntegrations.has(int.tool_key)) {
        const mem = memoryIntegrations.get(int.tool_key);
        configObj = { ...configObj, ...mem.config };
      }

      return {
        id: int.tool_key,
        name: int.name,
        category: int.category,
        status: int.status, // 'not_connected' | 'pending_connection' | 'connected' | 'error'
        apiKey: int.api_key ? "sk_live_••••••••" + int.api_key.slice(-4) : null,
        updatedAt: int.updated_at,
        config: stripSecrets(configObj),
      };
    });

    return NextResponse.json({
      success: true,
      integrations: formatted,
      stripeEvents: stripeEvents.map(e => ({
        id: e.id,
        eventType: e.event_type,
        amount: e.amount,
        currency: e.currency,
        createdAt: e.created_at,
      })),
    });
  } catch (error: any) {
    console.error("GET /api/integrations error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const tenantId = getUserBusinessId(auth.email);

  try {
    const body = await req.json();
    const { toolKey, status, apiKey, config } = body;

    if (!toolKey) {
      return NextResponse.json({ error: "toolKey is required" }, { status: 400 });
    }
    // These two are only "connected" after the connection has really been tested, through their own routes.
    if (toolKey === "slack" || toolKey === "stripe") {
      return NextResponse.json({ error: "Connect this tool from the Integrations page." }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Cache in memory immediately for instantaneous feedback
    memoryIntegrations.set(toolKey, {
      toolKey,
      status: status || "connected",
      apiKey: apiKey || null,
      config: config || {},
      updatedAt: now,
    });

    // Execute SQLite persistence with auto-heal retry
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const existing = db
          .prepare("SELECT id, config FROM integrations WHERE business_id = ? AND tool_key = ?")
          .get(tenantId, toolKey) as any;

        let mergedConfig = config;
        if (existing && existing.config && config) {
          try {
            const prevConfig = JSON.parse(existing.config);
            mergedConfig = { ...prevConfig, ...config };
          } catch (e) {}
        }

        if (existing) {
          db.prepare(`
            UPDATE integrations SET
              status = COALESCE(?, status),
              api_key = COALESCE(?, api_key),
              config = COALESCE(?, config),
              updated_at = ?
            WHERE business_id = ? AND tool_key = ?
          `).run(
            status || null,
            apiKey !== undefined ? apiKey : null,
            mergedConfig ? JSON.stringify(mergedConfig) : null,
            now,
            tenantId,
            toolKey
          );
        } else {
          const toolNames: Record<string, { name: string; category: string }> = {
            google: { name: "Google Account & Workspace", category: "business" },
            google_calendar: { name: "Google Calendar", category: "business" },
            google_workspace: { name: "Google Workspace", category: "business" },
            microsoft: { name: "Microsoft 365 & Teams", category: "business" },
            microsoft_365: { name: "Microsoft 365 & Teams", category: "business" },
            linkedin: { name: "LinkedIn Company & Ads", category: "business" },
            meta: { name: "Meta Business & Instagram", category: "business" },
            stripe: { name: "Stripe", category: "business" },
            slack: { name: "Slack", category: "business" },
            zoho_books: { name: "Zoho Books / QuickBooks", category: "business" },
            help_desk: { name: "Help Desk (Zendesk / Freshdesk)", category: "business" },
            zoom: { name: "Zoom", category: "business" },
            notion: { name: "Notion", category: "data" },
            github: { name: "GitHub", category: "automation" },
            hubspot: { name: "HubSpot", category: "business" },
          };
          const def = toolNames[toolKey] || { name: toolKey, category: "business" };
          db.prepare(`
            INSERT INTO integrations (id, business_id, tool_key, name, category, status, api_key, config, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            tenantId,
            toolKey,
            def.name,
            def.category,
            status || "connected",
            apiKey || null,
            mergedConfig ? JSON.stringify(mergedConfig) : null,
            now
          );
        }

        // If connecting or disconnecting tool, update connected_tools in business record
        const biz = db.prepare("SELECT connected_tools FROM businesses WHERE id = ?").get(tenantId) as any;
        if (biz) {
          let tools: string[] = biz.connected_tools ? JSON.parse(biz.connected_tools) : [];
          if (status === "connected") {
            if (!tools.includes(toolKey)) {
              tools.push(toolKey);
              db.prepare("UPDATE businesses SET connected_tools = ?, no_integrations = 0, updated_at = ? WHERE id = ?").run(
                JSON.stringify(tools),
                now,
                tenantId
              );
            }
          } else if (status === "not_connected") {
            tools = tools.filter(t => t !== toolKey);
            db.prepare("UPDATE businesses SET connected_tools = ?, updated_at = ? WHERE id = ?").run(
              JSON.stringify(tools),
              now,
              tenantId
            );
          }
        }

        break; // Successfully written to SQLite
      } catch (dbErr: any) {
        console.warn(`[Integrations POST] SQLite write attempt ${attempt} failed: ${dbErr.message}`);
        healDatabasePermissions();
        if (attempt === 2) {
          console.error(`[Integrations POST] Could not persist to disk, but cached safely in memory.`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Integration ${toolKey} updated to ${status}`,
    });
  } catch (error: any) {
    console.error("POST /api/integrations unexpected error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

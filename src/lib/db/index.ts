// @ts-ignore
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

// Detect serverless environment (Vercel, AWS Lambda, Cloud Functions)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

// In serverless, process.cwd() is read-only (/var/task). /tmp is the writable storage directory.
const dataDir = isServerless
  ? path.join(os.tmpdir(), "bizzpal-data")
  : path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}
}

const dbPath = path.join(dataDir, "bizzpal.db");

// If running in serverless and destination db doesn't exist yet, copy initial seed database from package
if (isServerless && !fs.existsSync(dbPath)) {
  try {
    const seedDb = path.join(process.cwd(), "data", "bizzpal.db");
    if (fs.existsSync(seedDb)) {
      fs.copyFileSync(seedDb, dbPath);
    }
  } catch (err) {
    console.warn("Could not copy seed database to /tmp:", err);
  }
}

export function healDatabasePermissions() {
  if (process.platform === "win32") {
    try {
      const { execSync } = require("child_process");
      execSync(`attrib -r -s "${dataDir}" /d`, { stdio: "ignore" });
      execSync(`attrib -r -s "${path.join(dataDir, "*.*")}"`, { stdio: "ignore" });
    } catch {}
  }
  try {
    fs.chmodSync(dataDir, 0o777);
  } catch {}

  if (fs.existsSync(dataDir)) {
    try {
      const files = fs.readdirSync(dataDir);
      for (const f of files) {
        try {
          fs.chmodSync(path.join(dataDir, f), 0o666);
        } catch {}
      }
    } catch {}
  }
}

// Immediately heal permissions upon module load
healDatabasePermissions();

declare global {
  var __bizzpal_raw_db: any | undefined;
}

function createRawConnection() {
  healDatabasePermissions();
  let conn: any;
  try {
    conn = new DatabaseSync(dbPath);
  } catch (err) {
    console.warn(`[SQLite] Could not open db file at ${dbPath}, falling back to in-memory database:`, err);
    try {
      conn = new DatabaseSync(":memory:");
    } catch (e) {
      console.error("[SQLite] Fatal: Cannot initialize SQLite in-memory:", e);
      throw e;
    }
  }

  try {
    conn.exec(`
      PRAGMA busy_timeout = 10000;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = MEMORY;
    `);
  } catch (e) {
    try {
      conn.exec("PRAGMA journal_mode = MEMORY;");
    } catch {}
  }
  return conn;
}

function getRawConnection() {
  if (!globalThis.__bizzpal_raw_db) {
    globalThis.__bizzpal_raw_db = createRawConnection();
  }
  return globalThis.__bizzpal_raw_db;
}

function resetConnection() {
  try {
    if (globalThis.__bizzpal_raw_db) {
      globalThis.__bizzpal_raw_db.close();
    }
  } catch {}
  globalThis.__bizzpal_raw_db = undefined;
  return getRawConnection();
}

// Resilient wrapper interface matching DatabaseSync
const db = {
  prepare(sql: string) {
    return {
      run(...args: any[]) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const raw = getRawConnection();
            const stmt = raw.prepare(sql);
            return stmt.run(...args);
          } catch (err: any) {
            const msg = String(err?.message || "").toLowerCase();
            if (
              msg.includes("readonly") ||
              msg.includes("busy") ||
              msg.includes("locked") ||
              msg.includes("permission")
            ) {
              console.warn(`[SQLite SafeRun] Caught "${err.message}" on attempt ${attempt}. Healing permissions & reconnecting...`);
              healDatabasePermissions();
              resetConnection();
              if (attempt === 3) {
                console.warn(`[SQLite SafeRun] Query could not persist to disk (${err.message}). Safe in-memory retention active.`);
                return { changes: 1, lastInsertRowid: 1 };
              }
              continue;
            }
            throw err;
          }
        }
      },
      get(...args: any[]) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const raw = getRawConnection();
            return raw.prepare(sql).get(...args);
          } catch (err: any) {
            const msg = String(err?.message || "").toLowerCase();
            if (msg.includes("readonly") || msg.includes("busy") || msg.includes("locked")) {
              healDatabasePermissions();
              resetConnection();
              if (attempt === 3) throw err;
              continue;
            }
            throw err;
          }
        }
      },
      all(...args: any[]) {
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const raw = getRawConnection();
            return raw.prepare(sql).all(...args);
          } catch (err: any) {
            const msg = String(err?.message || "").toLowerCase();
            if (msg.includes("readonly") || msg.includes("busy") || msg.includes("locked")) {
              healDatabasePermissions();
              resetConnection();
              if (attempt === 3) throw err;
              continue;
            }
            throw err;
          }
        }
      },
    };
  },
  exec(sql: string) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const raw = getRawConnection();
        return raw.exec(sql);
      } catch (err: any) {
        const msg = String(err?.message || "").toLowerCase();
        if (
          msg.includes("readonly") ||
          msg.includes("busy") ||
          msg.includes("locked") ||
          msg.includes("permission")
        ) {
          healDatabasePermissions();
          resetConnection();
          if (attempt === 3) throw err;
          continue;
        }
        throw err;
      }
    }
  },
};

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    industry_label TEXT,
    custom_industry TEXT,
    founder_name TEXT,
    website TEXT,
    team_size INTEGER,
    annual_revenue REAL,
    monthly_revenue REAL,
    monthly_burn REAL,
    cash_on_hand REAL,
    connected_tools TEXT, -- JSON array of tool keys: ["stripe", "slack", ...]
    no_integrations INTEGER DEFAULT 0, -- 1 if opted for manual collection
    whatsapp_opt_in INTEGER DEFAULT 0,
    whatsapp_number TEXT,
    dynamic_intake_answers TEXT, -- JSON object
    created_at TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    tool_key TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL, -- 'not_connected' | 'pending_connection' | 'connected' | 'error'
    api_key TEXT,
    webhook_url TEXT,
    config TEXT, -- JSON object
    updated_at TEXT,
    UNIQUE(business_id, tool_key)
  );

  CREATE TABLE IF NOT EXISTS daily_checkins (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    date TEXT NOT NULL,
    source TEXT NOT NULL, -- 'manual_web' | 'whatsapp'
    answers TEXT NOT NULL, -- JSON object { revenue_status, blockers, urgent_items, hr_issues, tech_issues }
    raw_text TEXT,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    amount REAL,
    currency TEXT,
    payload TEXT NOT NULL,
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    title TEXT NOT NULL,
    owner TEXT NOT NULL,
    gap TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'todo', -- 'todo' | 'in_progress' | 'done'
    created_at TEXT
  );

  CREATE TABLE IF NOT EXISTS platform_config (
    config_key TEXT PRIMARY KEY,
    config_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_data_uploads (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    metrics_summary TEXT NOT NULL,
    raw_data TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS registered_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    provider TEXT,
    business_profile TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL, -- 'Owner' | 'Executive' | 'Manager' | 'Operator'
    department TEXT NOT NULL,
    two_factor INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'invited' | 'suspended'
    last_active TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS team_audit_logs (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    action TEXT NOT NULL,
    user_name TEXT NOT NULL,
    ip_address TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_automations (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    action_event TEXT NOT NULL,
    tool_key TEXT NOT NULL,
    category TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    executions_count INTEGER DEFAULT 0,
    last_run TEXT,
    created_at TEXT NOT NULL
  );
`);

// Migrate existing registered_users table if business_profile column is missing
try {
  db.exec(`ALTER TABLE registered_users ADD COLUMN business_profile TEXT`);
} catch (e) {
  // column already exists
}

/**
 * Check if an email has already been registered
 */
export function isUserRegistered(email: string): boolean {
  if (!email) return false;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const row = db.prepare("SELECT id FROM registered_users WHERE LOWER(email) = ?").get(cleanEmail);
    return Boolean(row);
  } catch (err) {
    console.warn("isUserRegistered check error:", err);
    return false;
  }
}

/**
 * Retrieve registered user record by email, including saved business profile
 */
export function getRegisteredUser(email: string): any {
  if (!email) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const row = db.prepare("SELECT id, email, name, provider, business_profile, created_at FROM registered_users WHERE LOWER(email) = ?").get(cleanEmail) as any;
    if (!row) return null;
    let businessProfile = null;
    if (row.business_profile) {
      try {
        businessProfile = JSON.parse(row.business_profile);
      } catch (e) {}
    }
    return {
      ...row,
      businessProfile,
    };
  } catch (err) {
    console.warn("getRegisteredUser error:", err);
    return null;
  }
}

/**
 * Save / update a user's business profile in SQLite and ensure matching business record
 */
export function saveUserBusinessProfile(email: string, profile: any): boolean {
  if (!email || !profile) return false;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const profileJson = typeof profile === "string" ? profile : JSON.stringify(profile);
    const result = db.prepare(`
      UPDATE registered_users 
      SET business_profile = ? 
      WHERE LOWER(email) = ?
    `).run(profileJson, cleanEmail);

    const now = new Date().toISOString();
    const p = typeof profile === "object" ? profile : JSON.parse(profileJson);
    const bizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Upsert into businesses table
    const bizExisting = db.prepare("SELECT id FROM businesses WHERE id = ?").get(bizId);
    if (bizExisting) {
      db.prepare(`
        UPDATE businesses SET
          name = COALESCE(?, name),
          founder_name = COALESCE(?, founder_name),
          industry = COALESCE(?, industry),
          industry_label = COALESCE(?, industry_label),
          website = COALESCE(?, website),
          team_size = COALESCE(?, team_size),
          annual_revenue = COALESCE(?, annual_revenue),
          monthly_revenue = COALESCE(?, monthly_revenue),
          monthly_burn = COALESCE(?, monthly_burn),
          cash_on_hand = COALESCE(?, cash_on_hand),
          connected_tools = COALESCE(?, connected_tools),
          updated_at = ?
        WHERE id = ?
      `).run(
        p.name || null,
        p.founderName || null,
        p.industry || null,
        p.industryLabel || null,
        p.website || null,
        p.teamSize !== undefined ? Number(p.teamSize) : null,
        p.annualRevenue !== undefined ? Number(p.annualRevenue) : (p.revenue ? Number(p.revenue) * 12 : null),
        p.monthlyRevenue !== undefined ? Number(p.monthlyRevenue) : (p.revenue ? Number(p.revenue) : null),
        p.monthlyBurn !== undefined ? Number(p.monthlyBurn) : (p.burn ? Number(p.burn) : null),
        p.cashOnHand !== undefined ? Number(p.cashOnHand) : (p.cash ? Number(p.cash) : null),
        p.connectedTools ? JSON.stringify(p.connectedTools) : null,
        now,
        bizId
      );
    } else {
      const bizName = p.name || `${cleanEmail.split('@')[0]}'s Enterprise`;
      const founder = p.founderName || "Founder";
      db.prepare(`
        INSERT INTO businesses (
          id, name, founder_name, industry, industry_label, website, team_size,
          annual_revenue, monthly_revenue, monthly_burn, cash_on_hand,
          connected_tools, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bizId,
        bizName,
        founder,
        p.industry || "saas",
        p.industryLabel || "Technology & Services",
        p.website || "",
        Number(p.teamSize || 1),
        Number(p.annualRevenue || (p.revenue ? p.revenue * 12 : 0)),
        Number(p.monthlyRevenue || p.revenue || 0),
        Number(p.monthlyBurn || p.burn || 0),
        Number(p.cashOnHand || p.cash || 0),
        JSON.stringify(p.connectedTools || []),
        now,
        now
      );
    }

    // Mirror to Firestore
    try {
      const { saveFirestoreBusinessRecord, saveFirestoreUserProfile } = require("@/lib/firebase/firestoreService");
      saveFirestoreUserProfile(cleanEmail, { email: cleanEmail, businessProfile: p });
      saveFirestoreBusinessRecord(bizId, { ...p, ownerEmail: cleanEmail, updatedAt: now });
    } catch {}

    return result.changes > 0;
  } catch (err) {
    console.warn("saveUserBusinessProfile error:", err);
    return false;
  }
}

/**
 * Delete a registered user from SQLite
 */
export function deleteRegisteredUser(email: string): boolean {
  if (!email) return false;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const result = db.prepare("DELETE FROM registered_users WHERE LOWER(email) = ?").run(cleanEmail);
    const bizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    db.prepare("DELETE FROM businesses WHERE id = ?").run(bizId);
    return result.changes > 0;
  } catch (err) {
    console.warn("deleteRegisteredUser error:", err);
    return false;
  }
}

/**
 * Record a newly registered user into SQLite with optional initial business profile
 * and ensure an enterprise record is created in businesses table
 */
export function registerUser(email: string, name?: string, provider?: string, uid?: string, businessProfile?: any): boolean {
  if (!email) return false;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const existing = db.prepare("SELECT id FROM registered_users WHERE LOWER(email) = ?").get(cleanEmail) as any;
    const profileJson = businessProfile ? (typeof businessProfile === "string" ? businessProfile : JSON.stringify(businessProfile)) : null;
    const now = new Date().toISOString();

    if (existing) {
      db.prepare(`
        UPDATE registered_users SET 
          name = COALESCE(?, name), 
          provider = COALESCE(?, provider),
          business_profile = COALESCE(?, business_profile)
        WHERE LOWER(email) = ?
      `).run(name || null, provider || null, profileJson, cleanEmail);
    } else {
      const idExists = uid ? db.prepare("SELECT id FROM registered_users WHERE id = ?").get(uid) : false;
      const id = (uid && !idExists) ? uid : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO registered_users (id, email, name, provider, business_profile, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, cleanEmail, name || "", provider || "email", profileJson, now);
    }

    // Automatically ensure this user appears in businesses table for Superadmin
    const bizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const p = businessProfile && typeof businessProfile === "object" ? businessProfile : {};
    const bizName = p.name || (name ? `${name}'s Enterprise` : `${cleanEmail.split('@')[0]}'s Enterprise`);
    const founder = name || p.founderName || "Founder";
    const bizExisting = db.prepare("SELECT id FROM businesses WHERE id = ?").get(bizId);

    if (bizExisting) {
      db.prepare(`
        UPDATE businesses SET
          name = COALESCE(?, name),
          founder_name = COALESCE(?, founder_name),
          updated_at = ?
        WHERE id = ?
      `).run(bizName, founder, now, bizId);
    } else {
      db.prepare(`
        INSERT INTO businesses (
          id, name, founder_name, industry, industry_label, website, team_size,
          annual_revenue, monthly_revenue, monthly_burn, cash_on_hand,
          connected_tools, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bizId,
        bizName,
        founder,
        p.industry || "saas",
        p.industryLabel || "Technology & Services",
        p.website || "",
        Number(p.teamSize || 1),
        Number(p.annualRevenue || (p.revenue ? p.revenue * 12 : 0)),
        Number(p.monthlyRevenue || p.revenue || 0),
        Number(p.monthlyBurn || p.burn || 0),
        Number(p.cashOnHand || p.cash || 0),
        JSON.stringify(p.connectedTools || []),
        now,
        now
      );
    }

    // Mirror user profile to Firestore
    try {
      const { saveFirestoreUserProfile, saveFirestoreBusinessRecord } = require("@/lib/firebase/firestoreService");
      saveFirestoreUserProfile(cleanEmail, {
        email: cleanEmail,
        name: name || "",
        provider: provider || "email",
        businessProfile: p,
      });
      saveFirestoreBusinessRecord(bizId, {
        id: bizId,
        name: bizName,
        founderName: founder,
        ownerEmail: cleanEmail,
        updatedAt: now,
      });
    } catch {}

    return true;
  } catch (err) {
    console.warn("registerUser error:", err);
    return false;
  }
}

// Default business ID for single-tenant local workspace
export const DEFAULT_BUSINESS_ID = "biz_enterprise_01";

// Ensure default business exists with clean, fresh baseline metrics (no hardcoded fake values)
const existingBiz = db.prepare("SELECT id FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID);
if (!existingBiz) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO businesses (
      id, name, industry, industry_label, founder_name, website, team_size, 
      annual_revenue, monthly_revenue, monthly_burn, cash_on_hand, 
      connected_tools, no_integrations, whatsapp_opt_in, whatsapp_number, 
      dynamic_intake_answers, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, 
      ?, ?, ?, ?, 
      ?, ?, ?, ?, 
      ?, ?, ?
    )
  `).run(
    DEFAULT_BUSINESS_ID,
    "My Enterprise",
    "saas",
    "Technology & Services",
    "Founder",
    "",
    1,
    0,
    0,
    0,
    0,
    JSON.stringify([]),
    0,
    0,
    "",
    JSON.stringify({}),
    now,
    now
  );
}

// Ensure default integrations exist
const DEFAULT_TOOLS = [
  { tool_key: "stripe", name: "Stripe", category: "payments" },
  { tool_key: "slack", name: "Slack", category: "communication" },
  { tool_key: "zoho_books", name: "Zoho Books", category: "accounting" },
  { tool_key: "google_calendar", name: "Google Calendar", category: "scheduling" },
  { tool_key: "help_desk", name: "Help Desk (Zendesk / Freshdesk)", category: "support" },
  { tool_key: "zoom", name: "Zoom", category: "meetings" },
  { tool_key: "github", name: "GitHub", category: "engineering" },
];

for (const tool of DEFAULT_TOOLS) {
  const exists = db
    .prepare("SELECT id FROM integrations WHERE business_id = ? AND tool_key = ?")
    .get(DEFAULT_BUSINESS_ID, tool.tool_key);
  if (!exists) {
    db.prepare(`
      INSERT INTO integrations (id, business_id, tool_key, name, category, status, updated_at)
      VALUES (?, ?, ?, ?, ?, 'not_connected', ?)
    `).run(
      `int_${tool.tool_key}`,
      DEFAULT_BUSINESS_ID,
      tool.tool_key,
      tool.name,
      tool.category,
      new Date().toISOString()
    );
  }
}

// Ensure initial seed team members exist
const teamCountRow = db.prepare("SELECT COUNT(*) as count FROM team_members WHERE business_id = ?").get(DEFAULT_BUSINESS_ID) as { count: number };
if (teamCountRow.count === 0) {
  const initialTeam = [
    {
      id: "mem_owner",
      name: "Executive Founder",
      email: "founder@bizzpal.in",
      role: "Owner",
      department: "Executive Office",
      two_factor: 1,
      status: "active",
      last_active: "Active now"
    },
    {
      id: "mem_astra",
      name: "Astra (CEO Copilot)",
      email: "astra.ai@bizzpal.internal",
      role: "Executive",
      department: "Autonomous Strategy",
      two_factor: 1,
      status: "active",
      last_active: "Real-time engine"
    },
    {
      id: "mem_marcus",
      name: "Marcus (CFO Copilot)",
      email: "marcus.ai@bizzpal.internal",
      role: "Executive",
      department: "Autonomous Finance",
      two_factor: 1,
      status: "active",
      last_active: "Real-time engine"
    }
  ];

  for (const m of initialTeam) {
    db.prepare(`
      INSERT INTO team_members (id, business_id, name, email, role, department, two_factor, status, last_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(m.id, DEFAULT_BUSINESS_ID, m.name, m.email, m.role, m.department, m.two_factor, m.status, m.last_active, new Date().toISOString());
  }

  db.prepare(`
    INSERT INTO team_audit_logs (id, business_id, action, user_name, ip_address, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(`log_${Date.now()}`, DEFAULT_BUSINESS_ID, "Workspace security & autonomous copilot initialization", "System Engine", "127.0.0.1", new Date().toISOString());
}

// Ensure initial seed automations exist
const automationsCountRow = db.prepare("SELECT COUNT(*) as count FROM business_automations WHERE business_id = ?").get(DEFAULT_BUSINESS_ID) as { count: number };
if (automationsCountRow.count === 0) {
  const initialAutomations = [
    {
      id: "auto_discretionary_spend",
      title: "Discretionary SaaS Spend Guard",
      description: "Dispatches instant alert to Slack & WhatsApp when monthly software charges exceed budget by ₹10,000.",
      trigger_event: "Monthly burn variance > 5%",
      action_event: "Dispatch notification & log audit event",
      tool_key: "slack",
      category: "Finance & Cost Guard",
      enabled: 1,
      executions_count: 14,
      last_run: "Today at 09:15"
    },
    {
      id: "auto_checkin_digest",
      title: "Daily Executive Check-in Digest",
      description: "Summarizes team blocker and cash updates from the daily check-in into an executive intelligence brief.",
      trigger_event: "Daily at 17:00 UTC+5:30",
      action_event: "Generate executive briefing card & dispatch to WhatsApp",
      tool_key: "whatsapp",
      category: "Operations & Governance",
      enabled: 1,
      executions_count: 42,
      last_run: "Yesterday at 17:00"
    },
    {
      id: "auto_stripe_revenue_sync",
      title: "Stripe Revenue & Inbound Webhook Sync",
      description: "Auto-reconciles customer payments, calculates net ARR, and updates runway forecast in real time.",
      trigger_event: "Stripe charge.succeeded webhook",
      action_event: "Update database cash ledger & refresh runway KPI",
      tool_key: "stripe",
      category: "Revenue Operations",
      enabled: 1,
      executions_count: 128,
      last_run: "30m ago"
    },
    {
      id: "auto_tax_gst_reminder",
      title: "Quarterly GST & Tax Filing Reminder",
      description: "Auto-computes projected Input Tax Credit (ITC) balance and schedules reconciliation meeting 5 days before filing.",
      trigger_event: "Calendar: 5 days prior to GST deadline",
      action_event: "Schedule Google Calendar review & notify finance owner",
      tool_key: "google_calendar",
      category: "Compliance & Tax",
      enabled: 1,
      executions_count: 3,
      last_run: "1 week ago"
    }
  ];

  for (const a of initialAutomations) {
    db.prepare(`
      INSERT INTO business_automations (id, business_id, title, description, trigger_event, action_event, tool_key, category, enabled, executions_count, last_run, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(a.id, DEFAULT_BUSINESS_ID, a.title, a.description, a.trigger_event, a.action_event, a.tool_key, a.category, a.enabled, a.executions_count, a.last_run, new Date().toISOString());
  }
}

// -------------------------------------------------------------
// Platform Dynamic Configuration (Website + Dashboard)
// -------------------------------------------------------------

export const DEFAULT_WEBSITE_CONFIG = {
  sections: {
    hero: { enabled: true, title: "Hero Section" },
    sceneAwakening: { enabled: true, title: "Scene 01 — Awakening" },
    sceneConnection: { enabled: true, title: "Scene 02 — Connection" },
    sceneIntelligence: { enabled: true, title: "Scene 03 — Intelligence" },
    sceneBizzPal: { enabled: true, title: "Scene 04 — This is BizzPal" },
    about: { enabled: true, title: "About Section" },
    sceneExpansion: { enabled: true, title: "Scene 05 — Expansion" },
    solutions: { enabled: true, title: "Solutions & Capabilities" },
    stats: { enabled: true, title: "Impact & Stats" },
    sceneHuman: { enabled: true, title: "Scene 06 — Human + AI" },
    vision: { enabled: true, title: "Vision Section" },
    sceneFuture: { enabled: true, title: "Scene 07 — Future" },
    contact: { enabled: true, title: "Contact & Onboarding" },
    footer: { enabled: true, title: "Site Footer" },
  },
  nav: {
    brand: "BizzPal",
    logoUrl: "/logo-icon.png",
    links: [
      { label: "About", href: "#about" },
      { label: "Intelligence", href: "#s03" },
      { label: "Solutions", href: "#solutions" },
      { label: "Vision", href: "#vision" },
      { label: "Contact", href: "#contact" },
      { label: "Pricing", href: "/subscription" },
    ],
    ctaText: "Start a Conversation",
    ctaHref: "#contact",
  },
  vision: {
    label: "The next interface is intelligence",
    words: ["Understand.", "Predict.", "Adapt.", "Create.", "Evolve.", "BizzPal."],
  },
  announcement: {
    enabled: false,
    text: "🚀 BizzPal Enterprise Platform v2.0 is now live for all partners.",
    linkText: "Read announcement",
    linkUrl: "#s01",
  },
  hero: {
    eyebrow: "Artificial Intelligence · For Business",
    word: "BizzPal™",
    subtitle: "Your Business. Powered by Intelligence.",
    primaryCtaText: "Explore BizzPal",
    primaryCtaHref: "#s01",
    secondaryCtaText: "Discover Our Intelligence",
    secondaryCtaHref: "#s03",
  },
  scenes: {
    s01: {
      eyebrow: "Scene 01 — Awakening",
      headline: "Every breakthrough begins with a signal.",
    },
    s02: {
      eyebrow: "Scene 02 — Connection",
      headline: "We connect data, intelligence and possibility.",
    },
    s03: {
      eyebrow: "Scene 03 — Intelligence",
      headline: "Turning complexity into intelligence.",
    },
    s04: {
      headline: "This is BizzPal.",
      lead: "Building intelligent systems for a rapidly evolving world.",
    },
    s05: {
      eyebrow: "Scene 05 — Expansion",
      headline: "One intelligence. Infinite possibilities.",
    },
    s06: {
      eyebrow: "Scene 06 — Human + AI",
      headline: "AI doesn't replace possibility. It expands it.",
      lead: "Technology should amplify human potential — not stand in for it.",
    },
    s07: {
      eyebrow: "Scene 07 — Future",
      headline: "The future isn't coming. We're engineering it.",
      ctaText: "Build the Future with BizzPal",
      ctaHref: "/login",
    },
  },
  about: {
    eyebrow: "About BizzPal",
    headline: "We build intelligence that moves the world forward.",
    p1: "BizzPal uses artificial intelligence to automate tasks, analyse data, and help businesses make smarter, faster decisions for growth.",
    p2: "We work at the point where information becomes understanding — designing systems that read complexity, find the signal inside it, and turn that signal into a decision a business can act on today.",
    approach: [
      { label: "Understand the problem", num: "01" },
      { label: "Model the intelligence", num: "02" },
      { label: "Engineer the system", num: "03" },
      { label: "Scale what works", num: "04" },
    ],
  },
  solutions: {
    eyebrow: "Solutions",
    headline: "Capabilities, engineered.",
    subtitle: "Each capability is a system, not a feature — built around the problem it is meant to solve.",
    cards: [
      { id: "c1", num: "01", fx: "ai", title: "AI & Machine Intelligence", desc: "Systems that transform complex information into actionable intelligence." },
      { id: "c2", num: "02", fx: "auto", title: "Intelligent Automation", desc: "Smarter workflows designed to reduce friction and increase scale." },
      { id: "c3", num: "03", fx: "data", title: "Data & Analytics", desc: "Turning data into clarity, prediction and strategic advantage." },
      { id: "c4", num: "04", fx: "digital", title: "Digital Intelligence", desc: "Building intelligent digital experiences for modern organisations." },
      { id: "c5", num: "05", fx: "custom", title: "Custom AI Systems", desc: "Purpose-built intelligence designed around specific business challenges." },
    ],
  },
  stats: {
    items: [
      { id: "s1", num: "01", label: "Intelligence" },
      { id: "s2", num: "∞", label: "Possibilities" },
      { id: "s3", num: "24/7", label: "Designed to think" },
      { id: "s4", num: "01", label: "Vision" },
    ],
  },
  contact: {
    eyebrow: "Contact",
    headline: "Ready to build\nwhat’s next?",
    note: "Opens your mail app — nothing is stored on this page.",
    ctaText: "Start a Conversation",
    ctaHref: "#contact",
    email: "hello@bizzpal.in",
    site: "bizzpal.in",
    linkedin: "https://linkedin.com/company/bizzpal",
    twitter: "https://twitter.com/bizzpal",
  },
  footer: {
    copyright: "© 2026 BizzPal",
    tagline: "BizzPal™ — Your AI Business Partner",
  },
};

export {
  DEFAULT_SUBSCRIPTION_PLANS,
  DEFAULT_DASHBOARD_FEATURES,
  DEFAULT_TOOLS_CATALOG,
} from "@/config/seeds/defaultCatalog";
import {
  DEFAULT_SUBSCRIPTION_PLANS,
  DEFAULT_DASHBOARD_FEATURES,
  DEFAULT_TOOLS_CATALOG,
} from "@/config/seeds/defaultCatalog";


const memoryConfigCache = new Map<string, any>();

export function deepMerge<T>(fallback: T, override: any): T {
  if (!override || typeof override !== "object" || Array.isArray(override)) {
    return (override !== undefined ? override : fallback) as T;
  }
  if (!fallback || typeof fallback !== "object" || Array.isArray(fallback)) {
    return override as T;
  }
  const result: any = { ...fallback };
  for (const key of Object.keys(override)) {
    if (
      override[key] !== null &&
      typeof override[key] === "object" &&
      !Array.isArray(override[key]) &&
      key in result &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], override[key]);
    } else if (override[key] !== undefined) {
      result[key] = override[key];
    }
  }
  return result as T;
}

export function getPlatformConfig<T>(key: string, fallback: T): T {
  // First check in-memory cache
  if (memoryConfigCache.has(key)) {
    const cached = memoryConfigCache.get(key);
    return typeof fallback === "object" && fallback !== null && !Array.isArray(fallback)
      ? deepMerge(fallback, cached)
      : (cached as T);
  }
  try {
    const row = db.prepare("SELECT config_value FROM platform_config WHERE config_key = ?").get(key) as { config_value: string } | undefined;
    if (row && row.config_value) {
      const parsed = JSON.parse(row.config_value);
      const merged = typeof fallback === "object" && fallback !== null && !Array.isArray(fallback)
        ? deepMerge(fallback, parsed)
        : (parsed as T);
      memoryConfigCache.set(key, merged);
      return merged;
    }
  } catch (err) {
    console.error(`Error reading config for key ${key}:`, err);
  }
  return fallback;
}

export function setPlatformConfig<T>(key: string, value: T): void {
  // Always update in-memory cache immediately so runtime never lags or errors
  memoryConfigCache.set(key, value);

  const now = new Date().toISOString();
  
  // Try writing to SQLite with retry and permission healing
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      db.prepare(`
        INSERT INTO platform_config (config_key, config_value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(config_key) DO UPDATE SET
          config_value = excluded.config_value,
          updated_at = excluded.updated_at
      `).run(key, JSON.stringify(value), now);
      return;
    } catch (err: any) {
      console.warn(`Attempt ${attempt} to write config ${key} to SQLite failed:`, err.message);
      
      // On Windows / OneDrive, clear read-only attribute if it got reapplied
      if (process.platform === "win32") {
        try {
          const { execSync } = require("child_process");
          execSync(`attrib -r "${dataDir}" /d`, { stdio: "ignore" });
          execSync(`attrib -r "${dbPath}"`, { stdio: "ignore" });
        } catch {}
      }

      if (attempt === 3) {
        console.error(`Persisting ${key} to SQLite failed after 3 attempts (${err.message}). Value safely retained in memory.`);
      }
    }
  }
}

// Initialize seed platform configs if not present or heal if partial
const existingWebsiteRow = db.prepare("SELECT config_value FROM platform_config WHERE config_key = ?").get("website_config") as { config_value: string } | undefined;
if (!existingWebsiteRow) {
  setPlatformConfig("website_config", DEFAULT_WEBSITE_CONFIG);
} else {
  try {
    const parsedWeb = JSON.parse(existingWebsiteRow.config_value);
    if (!parsedWeb.hero || !parsedWeb.scenes || !parsedWeb.sections?.about) {
      const healed = deepMerge(DEFAULT_WEBSITE_CONFIG, parsedWeb);
      setPlatformConfig("website_config", healed);
    }
  } catch {
    setPlatformConfig("website_config", DEFAULT_WEBSITE_CONFIG);
  }
}

if (!db.prepare("SELECT config_key FROM platform_config WHERE config_key = ?").get("dashboard_features")) {
  setPlatformConfig("dashboard_features", DEFAULT_DASHBOARD_FEATURES);
}

if (!db.prepare("SELECT config_key FROM platform_config WHERE config_key = ?").get("tools_catalog")) {
  setPlatformConfig("tools_catalog", DEFAULT_TOOLS_CATALOG);
}

if (!db.prepare("SELECT config_key FROM platform_config WHERE config_key = ?").get("subscription_plans")) {
  setPlatformConfig("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS);
}

export function getActiveBusiness() {
  try {
    const row = db.prepare("SELECT * FROM businesses ORDER BY updated_at DESC LIMIT 1").get() as any;
    if (row) {
      return {
        id: row.id,
        name: row.name || "BizzPal Enterprise",
        industry: (row.industry as any) || "saas",
        industryLabel: row.industry_label || "Enterprise",
        founderName: row.founder_name || "Founder",
        annualRevenue: Number(row.annual_revenue || 0),
        monthlyRevenue: Number(row.monthly_revenue || 0),
        monthlyBurn: Number(row.monthly_burn || 0),
        cashOnHand: Number(row.cash_on_hand || 0),
        teamSize: Number(row.team_size || 5),
        website: row.website || "",
      };
    }
  } catch (e) {
    console.error("Error fetching active business:", e);
  }
  return null;
}

export function getTeamMembers(businessId = DEFAULT_BUSINESS_ID) {
  try {
    const rows = db.prepare("SELECT * FROM team_members WHERE business_id = ? ORDER BY created_at ASC").all(businessId) as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      department: r.department,
      twoFactor: Boolean(r.two_factor),
      status: r.status,
      lastActive: r.last_active || "Active recently",
      createdAt: r.created_at
    }));
  } catch (err) {
    console.error("getTeamMembers error:", err);
    return [];
  }
}

export function addTeamMember(member: {
  businessId?: string;
  name: string;
  email: string;
  role: string;
  department: string;
  twoFactor?: boolean;
}) {
  const bId = member.businessId || DEFAULT_BUSINESS_ID;
  const id = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO team_members (id, business_id, name, email, role, department, two_factor, status, last_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', 'Invited today', ?)
  `).run(id, bId, member.name, member.email, member.role, member.department, member.twoFactor ? 1 : 0, now);

  addTeamAuditLog({
    businessId: bId,
    action: `New team member onboarded: ${member.name} (${member.role} in ${member.department})`,
    userName: "Executive Admin",
    ipAddress: "127.0.0.1"
  });

  return { id, ...member, status: "active", lastActive: "Invited today" };
}

export function updateTeamMember(id: string, updates: any) {
  const sets: string[] = [];
  const vals: any[] = [];
  if (updates.name !== undefined) { sets.push("name = ?"); vals.push(updates.name); }
  if (updates.email !== undefined) { sets.push("email = ?"); vals.push(updates.email); }
  if (updates.role !== undefined) { sets.push("role = ?"); vals.push(updates.role); }
  if (updates.department !== undefined) { sets.push("department = ?"); vals.push(updates.department); }
  if (updates.twoFactor !== undefined) { sets.push("two_factor = ?"); vals.push(updates.twoFactor ? 1 : 0); }
  if (updates.status !== undefined) { sets.push("status = ?"); vals.push(updates.status); }

  if (sets.length === 0) return false;
  vals.push(id);
  db.prepare(`UPDATE team_members SET ${sets.join(", ")} WHERE id = ?`).run(...vals);

  addTeamAuditLog({
    businessId: updates.businessId || DEFAULT_BUSINESS_ID,
    action: `Team member updated: ID ${id}`,
    userName: "Executive Admin",
    ipAddress: "127.0.0.1"
  });
  return true;
}

export function deleteTeamMember(id: string, businessId = DEFAULT_BUSINESS_ID) {
  const member = db.prepare("SELECT name FROM team_members WHERE id = ?").get(id) as any;
  const res = db.prepare("DELETE FROM team_members WHERE id = ?").run(id);
  if (member?.name) {
    addTeamAuditLog({
      businessId,
      action: `Team member access revoked & removed: ${member.name}`,
      userName: "Executive Admin",
      ipAddress: "127.0.0.1"
    });
  }
  return res.changes > 0;
}

export function getTeamAuditLogs(businessId = DEFAULT_BUSINESS_ID) {
  try {
    const rows = db.prepare("SELECT * FROM team_audit_logs WHERE business_id = ? ORDER BY created_at DESC LIMIT 30").all(businessId) as any[];
    return rows.map(r => ({
      id: r.id,
      action: r.action,
      user: r.user_name,
      time: r.created_at,
      ip: r.ip_address || "Internal"
    }));
  } catch (e) {
    return [];
  }
}

export function addTeamAuditLog(log: { businessId?: string; action: string; userName: string; ipAddress?: string }) {
  try {
    db.prepare(`
      INSERT INTO team_audit_logs (id, business_id, action, user_name, ip_address, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(`log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, log.businessId || DEFAULT_BUSINESS_ID, log.action, log.userName, log.ipAddress || "Internal", new Date().toISOString());
  } catch (err) {
    console.error("addTeamAuditLog error:", err);
  }
}

export function getBusinessAutomations(businessId = DEFAULT_BUSINESS_ID) {
  try {
    const rows = db.prepare("SELECT * FROM business_automations WHERE business_id = ? ORDER BY created_at DESC").all(businessId) as any[];
    return rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      trigger: r.trigger_event,
      action: r.action_event,
      toolKey: r.tool_key,
      category: r.category,
      enabled: Boolean(r.enabled),
      executions: r.executions_count,
      lastRun: r.last_run || "Pending trigger",
      createdAt: r.created_at
    }));
  } catch (e) {
    return [];
  }
}

export function toggleBusinessAutomation(id: string, enabled?: boolean) {
  if (enabled !== undefined) {
    db.prepare("UPDATE business_automations SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
  } else {
    db.prepare("UPDATE business_automations SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ?").run(id);
  }
  return true;
}

export function createBusinessAutomation(data: {
  businessId?: string;
  title: string;
  description: string;
  trigger: string;
  action: string;
  toolKey: string;
  category: string;
}) {
  const id = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  db.prepare(`
    INSERT INTO business_automations (id, business_id, title, description, trigger_event, action_event, tool_key, category, enabled, executions_count, last_run, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'Ready', ?)
  `).run(id, data.businessId || DEFAULT_BUSINESS_ID, data.title, data.description, data.trigger, data.action, data.toolKey, data.category, new Date().toISOString());
  return { id, ...data, enabled: true, executions: 0, lastRun: "Ready" };
}

export function getLiveBusinessContext(businessId = DEFAULT_BUSINESS_ID) {
  const biz = getActiveBusiness();
  const tasks = db.prepare("SELECT * FROM tasks WHERE business_id = ?").all(businessId) as any[];
  const tools = db.prepare("SELECT * FROM integrations WHERE business_id = ?").all(businessId) as any[];
  const uploads = db.prepare("SELECT * FROM business_data_uploads WHERE business_id = ? AND active = 1").all(businessId) as any[];

  return {
    business: biz,
    taskStats: {
      total: tasks.length,
      todo: tasks.filter(t => t.status === "todo").length,
      inProgress: tasks.filter(t => t.status === "in_progress").length,
      done: tasks.filter(t => t.status === "done").length,
    },
    integrations: tools.map(t => ({ toolKey: t.tool_key, name: t.name, status: t.status })),
    uploads: uploads.map(u => ({ id: u.id, fileName: u.file_name, metricsSummary: u.metrics_summary }))
  };
}

export { db };



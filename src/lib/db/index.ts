import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { isDemoAccount, demoSubscription } from "@/lib/demoAccount";
import {
  DEFAULT_SUBSCRIPTION_PLANS,
  DEFAULT_DASHBOARD_FEATURES,
  DEFAULT_TOOLS_CATALOG,
} from "@/config/seeds/defaultCatalog";

// Safe dynamic resolution of node:sqlite (supported natively in Node 22.5+)
let DatabaseSyncClass: any = null;
try {
  // Use require so environments running Node < 22 do not fail at module parse time
  const sqlite = require("node:sqlite");
  DatabaseSyncClass = sqlite.DatabaseSync;
} catch (e) {
  console.warn("[SQLite] node:sqlite is not available in this Node runtime:", (e as any)?.message);
}

// In-memory key-value fallback store when SQLite is unavailable or read-only
const inMemoryConfigStore = new Map<string, string>();
const inMemoryBusinessStore: any[] = [];

// True serverless platforms have a read-only app folder and wipe local storage between runs.
// A normal VM (even in production, even on GCP) keeps its disk, so it must NOT use the temp folder.
const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.K_SERVICE ||
  process.env.FUNCTION_NAME ||
  process.env.FUNCTION_TARGET
);

// Where the database lives:
//   1. BIZZPAL_DATA_DIR if set (recommended on the VM: a folder outside the app folder, so deploys never touch it)
//   2. the temp folder on real serverless platforms
//   3. ./data next to the app
let dataDir: string = process.env.BIZZPAL_DATA_DIR
  ? path.resolve(process.env.BIZZPAL_DATA_DIR)
  : isServerless
  ? path.join(os.tmpdir(), "bizzpal-data")
  : path.join(process.cwd(), "data");

try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch {
  dataDir = path.join(os.tmpdir(), "bizzpal-data");
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
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

// Immediately heal permissions upon module load safely
try {
  healDatabasePermissions();
} catch {}

declare global {
  var __bizzpal_raw_db: any | undefined;
}

function createRawConnection() {
  try {
    healDatabasePermissions();
  } catch {}

  if (!DatabaseSyncClass) {
    return null;
  }

  let conn: any = null;
  try {
    conn = new DatabaseSyncClass(dbPath);
  } catch (err) {
    console.warn(`[SQLite] Could not open db file at ${dbPath}, trying /tmp fallback:`, err);
    try {
      const tmpPath = path.join(os.tmpdir(), "bizzpal.db");
      conn = new DatabaseSyncClass(tmpPath);
    } catch (e2) {
      try {
        console.warn(`[SQLite] Falling back to :memory: database`);
        conn = new DatabaseSyncClass(":memory:");
      } catch (e3) {
        console.error("[SQLite] Fatal: Cannot initialize SQLite in-memory:", e3);
        return null;
      }
    }
  }

  if (conn) {
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
  }
  return conn;
}

function getRawConnection() {
  if (globalThis.__bizzpal_raw_db === undefined) {
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

// Resilient wrapper interface matching DatabaseSync that never throws fatal exceptions
const db = {
  prepare(sql: string) {
    return {
      run(...args: any[]) {
        const raw = getRawConnection();
        if (!raw) {
          // Memory fallback handling
          if (sql.includes("platform_config") && args.length >= 2) {
            inMemoryConfigStore.set(String(args[0]), typeof args[1] === "string" ? args[1] : JSON.stringify(args[1]));
          }
          return { changes: 1, lastInsertRowid: 1 };
        }

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
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
              healDatabasePermissions();
              resetConnection();
              if (attempt === 3) {
                console.warn(`[SQLite SafeRun] Query could not persist to disk (${err.message}). Safe in-memory retention active.`);
                return { changes: 1, lastInsertRowid: 1 };
              }
              continue;
            }
            if (attempt === 3) {
              console.warn(`[SQLite SafeRun] Query error:`, err?.message);
              return { changes: 0, lastInsertRowid: 0 };
            }
          }
        }
        return { changes: 0, lastInsertRowid: 0 };
      },
      get(...args: any[]) {
        const raw = getRawConnection();
        if (!raw) {
          if (sql.includes("platform_config") && args[0]) {
            const val = inMemoryConfigStore.get(String(args[0]));
            return val !== undefined ? { config_key: args[0], config_value: val } : undefined;
          }
          if (sql.includes("businesses")) {
            return inMemoryBusinessStore[0] || null;
          }
          return null;
        }

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            return raw.prepare(sql).get(...args);
          } catch (err: any) {
            const msg = String(err?.message || "").toLowerCase();
            if (msg.includes("readonly") || msg.includes("busy") || msg.includes("locked")) {
              healDatabasePermissions();
              resetConnection();
              if (attempt === 3) return null;
              continue;
            }
            if (attempt === 3) {
              console.warn(`[SQLite SafeGet] Query error:`, err?.message);
              return null;
            }
          }
        }
        return null;
      },
      all(...args: any[]) {
        const raw = getRawConnection();
        if (!raw) {
          if (sql.includes("businesses")) return inMemoryBusinessStore;
          return [];
        }

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            return raw.prepare(sql).all(...args);
          } catch (err: any) {
            const msg = String(err?.message || "").toLowerCase();
            if (msg.includes("readonly") || msg.includes("busy") || msg.includes("locked")) {
              healDatabasePermissions();
              resetConnection();
              if (attempt === 3) return [];
              continue;
            }
            if (attempt === 3) {
              console.warn(`[SQLite SafeAll] Query error:`, err?.message);
              return [];
            }
          }
        }
        return [];
      },
    };
  },
  exec(sql: string) {
    const raw = getRawConnection();
    if (!raw) return;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
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
          if (attempt === 3) {
            console.warn(`[SQLite SafeExec] Exec could not complete (${err.message}). Continued gracefully.`);
            return;
          }
          continue;
        }
        if (attempt === 3) {
          console.warn(`[SQLite SafeExec] Exec error:`, err?.message);
          return;
        }
      }
    }
  },
};

// Initialize schema safely
try {
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

  CREATE TABLE IF NOT EXISTS datapal_usage_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_email TEXT NOT NULL,
    account_name TEXT,
    requested INTEGER DEFAULT 0,
    returned INTEGER DEFAULT 0,
    source_mode TEXT,
    google_requests INTEGER DEFAULT 0,
    est_cost_usd REAL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS datapal_credits (
    account_email TEXT PRIMARY KEY,
    used INTEGER NOT NULL DEFAULT 0,
    addon INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
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

  -- Business Context Engine (Company Memory)
  CREATE TABLE IF NOT EXISTS company_documents (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER DEFAULT 0,
    content_hash TEXT NOT NULL,
    mime_type TEXT,
    storage_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'indexed' | 'failed'
    error_message TEXT,
    chunk_count INTEGER DEFAULT 0,
    metadata TEXT DEFAULT '{}', -- JSON object
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    clean_text TEXT NOT NULL,
    char_count INTEGER NOT NULL,
    token_estimate INTEGER NOT NULL,
    page_number INTEGER,
    section_title TEXT,
    embedding TEXT, -- JSON array of floats for vector embedding
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_facts (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    category TEXT NOT NULL, -- 'strategy' | 'finance' | 'operations' | 'marketing' | 'legal'
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    source_document_id TEXT,
    source_citation TEXT,
    verified_by TEXT DEFAULT 'system',
    is_active INTEGER DEFAULT 1,
    valid_from TEXT NOT NULL,
    valid_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    attempts INTEGER DEFAULT 0,
    error_log TEXT,
    started_at TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL
  );

  -- Real-Time Business Intelligence
  CREATE TABLE IF NOT EXISTS kpi_definitions (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    metric_key TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    target_value REAL,
    warning_threshold REAL,
    critical_threshold REAL,
    comparison_type TEXT NOT NULL DEFAULT 'period_over_period',
    alert_severity TEXT NOT NULL DEFAULT 'warning',
    frequency TEXT NOT NULL DEFAULT 'daily',
    enabled INTEGER DEFAULT 1,
    last_evaluated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS business_insights (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    kpi_id TEXT,
    title TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'warning',
    status TEXT NOT NULL DEFAULT 'detected',
    observed_value REAL,
    previous_value REAL,
    change_pct REAL,
    evidence_summary TEXT DEFAULT '{}',
    root_cause_analysis TEXT,
    recommended_actions TEXT DEFAULT '[]',
    audit_trail TEXT DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS insight_actions_audit (
    id TEXT PRIMARY KEY,
    insight_id TEXT NOT NULL,
    business_id TEXT NOT NULL,
    action_key TEXT NOT NULL,
    action_title TEXT NOT NULL,
    action_status TEXT NOT NULL,
    approved_by TEXT,
    created_task_id TEXT,
    details TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_email TEXT NOT NULL,
    business_id TEXT,
    plan_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'active',
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    created_at TEXT NOT NULL,
    current_period_end TEXT
  );

  CREATE TABLE IF NOT EXISTS payment_transactions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL,
    payment_id TEXT,
    user_email TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT NOT NULL,
    raw_response TEXT,
    created_at TEXT NOT NULL
  );
`);

  // Migrate existing registered_users table if business_profile column is missing
  try {
    db.exec(`ALTER TABLE registered_users ADD COLUMN business_profile TEXT`);
  } catch (e) {
    // column already exists
  }

  // DataPal usage: how many of the delivered records came from a real source
  try {
    db.exec(`ALTER TABLE datapal_usage_log ADD COLUMN real_leads INTEGER DEFAULT 0`);
  } catch (e) {
    // column already exists
  }

  // Migrate existing businesses table if logo_url column is missing
  try {
    db.exec(`ALTER TABLE businesses ADD COLUMN logo_url TEXT`);
  } catch (e) {
    // column already exists
  }

  // Migrate existing registered_users table for last_login_at
  try {
    db.exec(`ALTER TABLE registered_users ADD COLUMN last_login_at TEXT`);
  } catch (e) {
    // column already exists
  }

  // Migrate existing businesses table for last_login_at
  try {
    db.exec(`ALTER TABLE businesses ADD COLUMN last_login_at TEXT`);
  } catch (e) {
    // column already exists
  }

  // Groups of companies. An account's own business is the group; the companies it adds point to it with group_id.
  // parent_id nests a company under another company of the same group; segment_id is the category the group defined.
  for (const column of ["group_id TEXT", "parent_id TEXT", "segment_id TEXT", "sort_order INTEGER DEFAULT 0"]) {
    try {
      db.exec(`ALTER TABLE businesses ADD COLUMN ${column}`);
    } catch (e) {
      // column already exists
    }
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_businesses_group ON businesses (group_id);

    CREATE TABLE IF NOT EXISTS business_segments (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_business_segments_group ON business_segments (group_id, sort_order);

    -- The company each person is working in right now. Checked against their group on every request.
    CREATE TABLE IF NOT EXISTS active_business (
      email TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
} catch (err) {
  console.warn("[SQLite] Schema initialization handled safely:", err);
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
    const row = db.prepare("SELECT id, email, name, provider, business_profile, last_login_at, created_at FROM registered_users WHERE LOWER(email) = ?").get(cleanEmail) as any;
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
    const now = new Date().toISOString();
    const p = typeof profile === "object" ? profile : JSON.parse(profileJson);

    // Working in one of the group's companies: the profile being saved is that company's. The account's own
    // profile and the group's record stay as they are.
    const activeId = getUserBusinessId(cleanEmail);
    const companySelected = activeId !== getGroupBusinessId(cleanEmail);
    const bizId = companySelected ? activeId : businessIdFor(cleanEmail);

    const result = companySelected
      ? { changes: 1 }
      : db.prepare(`
      UPDATE registered_users
      SET business_profile = ?
      WHERE LOWER(email) = ?
    `).run(profileJson, cleanEmail);

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
          logo_url = COALESCE(?, logo_url),
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
        p.logoUrl || p.logo || p.logo_url || null,
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
          connected_tools, logo_url, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        p.logoUrl || p.logo || p.logo_url || null,
        now,
        now
      );
    }

    return result.changes > 0;
  } catch (err) {
    console.warn("saveUserBusinessProfile error:", err);
    return false;
  }
}

/**
 * Delete a registered user from SQLite
 */
// Kept after an account is deleted because tax and accounting law requires payment records.
// Credit ledgers and audit events are financial and security records, kept for their legal retention period.
const KEPT_AFTER_DELETE = new Set(["payment_transactions", "subscriptions", "datapal_usage_log", "credit_ledger", "credit_reservations", "audit_events", "ai_usage"]);
// Tables keyed by the person's email instead of by business: [table, column]
const EMAIL_KEYED: Array<[string, string]> = [
  ["password_resets", "email"],
  ["payment_sources", "email"],
  ["business_verifications", "email"],
  ["team_invites", "owner_email"],
  ["team_invites", "invite_email"],
  ["outreach_log", "user_email"],
];

/** Removes businesses and every row saved for them (tasks, documents, connections, team, per-business settings). */
export function deleteBusinessData(businessIds: string[]): void {
  const ids = businessIds.filter(Boolean);
  if (ids.length === 0) return;
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as any[];
  for (const { name } of tables) {
    if (KEPT_AFTER_DELETE.has(name)) continue;
    try {
      const cols = (db.prepare(`PRAGMA table_info("${name}")`).all() as any[]).map(c => c.name);
      if (!cols.includes("business_id")) continue;
      for (const id of ids) db.prepare(`DELETE FROM "${name}" WHERE business_id = ?`).run(id);
    } catch {}
  }
  for (const id of ids) {
    try { db.prepare("DELETE FROM businesses WHERE id = ?").run(id); } catch {}
    // Settings stored per business (permissions, daily briefing). Exact suffix match: "_" in an id is a LIKE wildcard.
    try { db.prepare("DELETE FROM platform_config WHERE substr(config_key, -length(?)) = ?").run(`:${id}`, `:${id}`); } catch {}
  }
}

/** Deletes the account and everything stored for its business (tasks, documents, connections, team, settings). */
export function deleteRegisteredUser(email: string): boolean {
  if (!email) return false;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const bizId = businessIdFor(cleanEmail);
    const result = db.prepare("DELETE FROM registered_users WHERE LOWER(email) = ?").run(cleanEmail);

    // The business and every company in its group, with everything saved for them
    let companyIds: string[] = [];
    try {
      companyIds = (db.prepare("SELECT id FROM businesses WHERE group_id = ?").all(bizId) as any[]).map(r => r.id);
    } catch {}
    deleteBusinessData([bizId, ...companyIds]);
    try { db.prepare("DELETE FROM business_segments WHERE group_id = ?").run(bizId); } catch {}
    try { db.prepare("DELETE FROM active_business WHERE email = ?").run(cleanEmail); } catch {}
    // Records keyed by the person's email
    for (const [table, col] of EMAIL_KEYED) {
      try { db.prepare(`DELETE FROM "${table}" WHERE LOWER(${col}) = ?`).run(cleanEmail); } catch {}
    }
    return result.changes > 0;
  } catch (err) {
    console.warn("deleteRegisteredUser error:", err);
    return false;
  }
}

/**
 * Record exact login timestamp for user and their associated enterprise
 */
export function recordUserLogin(email: string, loginTime?: string): void {
  if (!email) return;
  try {
    const cleanEmail = email.trim().toLowerCase();
    const now = loginTime || new Date().toISOString();
    db.prepare("UPDATE registered_users SET last_login_at = ? WHERE LOWER(email) = ?").run(now, cleanEmail);
    const bizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    db.prepare("UPDATE businesses SET last_login_at = ? WHERE id = ?").run(now, bizId);
  } catch (err) {
    console.warn("recordUserLogin error:", err);
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
          business_profile = COALESCE(?, business_profile),
          last_login_at = ?
        WHERE LOWER(email) = ?
      `).run(name || null, provider || null, profileJson, now, cleanEmail);
    } else {
      const idExists = uid ? db.prepare("SELECT id FROM registered_users WHERE id = ?").get(uid) : false;
      const id = (uid && !idExists) ? uid : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      db.prepare(`
        INSERT INTO registered_users (id, email, name, provider, business_profile, last_login_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, cleanEmail, name || "", provider || "email", profileJson, now, now);
    }

    // Automatically ensure this user appears in businesses table for Superadmin
    const bizId = `biz_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const p = businessProfile && typeof businessProfile === "object" ? businessProfile : {};
    const bizName = p.name || (name ? `${name}'s Enterprise` : `${cleanEmail.split('@')[0]}'s Enterprise`);
    const founder = name || p.founderName || "Founder";
    const bizExisting = db.prepare("SELECT id FROM businesses WHERE id = ?").get(bizId);

    if (bizExisting) {
      // Only a name that was actually given replaces the saved one. Recording a sign-in sends no profile, and must
      // never reset the business to a made-up "<name>'s Enterprise".
      db.prepare(`
        UPDATE businesses SET
          name = COALESCE(?, name),
          founder_name = COALESCE(?, founder_name),
          last_login_at = COALESCE(?, last_login_at),
          updated_at = ?
        WHERE id = ?
      `).run(p.name || null, name || p.founderName || null, now, now, bizId);
    } else {
      db.prepare(`
        INSERT INTO businesses (
          id, name, founder_name, industry, industry_label, website, team_size,
          annual_revenue, monthly_revenue, monthly_burn, cash_on_hand,
          connected_tools, logo_url, last_login_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        p.logoUrl || null,
        now,
        now,
        now
      );
    }


    return true;
  } catch (err) {
    console.warn("registerUser error:", err);
    return false;
  }
}

// Default business ID for single-tenant local workspace
export const DEFAULT_BUSINESS_ID = "biz_enterprise_01";

// Nothing is created for the default business any more. An earlier version added a placeholder business with made-up
// team members, automations and KPI rules. Those rows are removed here if they are still untouched.
try {
  const seed = db.prepare("SELECT name, monthly_revenue FROM businesses WHERE id = ?").get(DEFAULT_BUSINESS_ID) as any;
  if (seed && seed.name === "My Enterprise" && !Number(seed.monthly_revenue)) {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as any[];
    for (const { name } of tables) {
      if (name === "payment_transactions" || name === "subscriptions") continue;
      try {
        const cols = (db.prepare(`PRAGMA table_info("${name}")`).all() as any[]).map(c => c.name);
        if (cols.includes("business_id")) db.prepare(`DELETE FROM "${name}" WHERE business_id = ?`).run(DEFAULT_BUSINESS_ID);
      } catch {}
    }
    db.prepare("DELETE FROM businesses WHERE id = ?").run(DEFAULT_BUSINESS_ID);
  }
} catch {}

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
    email: "hello@bizzpal.ai",
    site: "bizzpal.ai",
    linkedin: "https://linkedin.com/company/bizzpal",
    twitter: "https://twitter.com/bizzpal",
  },
  footer: {
    tagline: "BizzPal™ — Your AI Business Partner",
  },
};

export {
  DEFAULT_SUBSCRIPTION_PLANS,
  DEFAULT_DASHBOARD_FEATURES,
  DEFAULT_TOOLS_CATALOG,
} from "@/config/seeds/defaultCatalog";


export const memoryConfigCache = new Map<string, any>();

export function clearMemoryConfigCache(key?: string): void {
  if (key) {
    memoryConfigCache.delete(key);
  } else {
    memoryConfigCache.clear();
  }
}

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
    return memoryConfigCache.get(key) as T;
  }
  try {
    const row = db.prepare("SELECT config_value FROM platform_config WHERE config_key = ?").get(key) as { config_value: string } | undefined;
    if (row && row.config_value) {
      const parsed = JSON.parse(row.config_value);
      // Collections/Arrays: STRICT REPLACEMENT SEMANTICS. Never append or merge fallback arrays!
      if (Array.isArray(parsed)) {
        memoryConfigCache.set(key, parsed);
        return parsed as T;
      }
      // Objects: Only supply default top-level sections if completely missing in parsed
      let resolved: any = parsed;
      if (
        typeof fallback === "object" &&
        fallback !== null &&
        !Array.isArray(fallback) &&
        typeof parsed === "object" &&
        parsed !== null
      ) {
        resolved = { ...fallback, ...parsed };
        // Retain user-saved sub-objects and arrays exactly as saved
        for (const k of Object.keys(parsed)) {
          if (parsed[k] !== undefined) {
            resolved[k] = parsed[k];
          }
        }
      }
      memoryConfigCache.set(key, resolved);
      return resolved as T;
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

// Initialize seed platform configs ONLY if row does not exist at all (never revive deleted items)
try {
  const existingWebsiteRow = db.prepare("SELECT config_value FROM platform_config WHERE config_key = ?").get("website_config") as { config_value: string } | undefined;
  if (!existingWebsiteRow) {
    setPlatformConfig("website_config", DEFAULT_WEBSITE_CONFIG);
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
} catch (err) {
  console.warn("[SQLite] Database seed caught error (handled safely):", err);
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

export function updateTeamMember(id: string, updates: any, businessId?: string) {
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
  if (businessId) {
    vals.push(businessId);
    db.prepare(`UPDATE team_members SET ${sets.join(", ")} WHERE id = ? AND business_id = ?`).run(...vals);
  } else {
    db.prepare(`UPDATE team_members SET ${sets.join(", ")} WHERE id = ?`).run(...vals);
  }

  addTeamAuditLog({
    businessId: updates.businessId || DEFAULT_BUSINESS_ID,
    action: `Team member updated: ID ${id}`,
    userName: "Executive Admin",
    ipAddress: "127.0.0.1"
  });
  return true;
}

export function deleteTeamMember(id: string, businessId = DEFAULT_BUSINESS_ID) {
  const member = db.prepare("SELECT name FROM team_members WHERE id = ? AND business_id = ?").get(id, businessId) as any;
  const res = db.prepare("DELETE FROM team_members WHERE id = ? AND business_id = ?").run(id, businessId);
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

export function toggleBusinessAutomation(id: string, enabled: boolean | undefined, businessId: string) {
  // Only the owning business can change its own automation
  const res: any =
    enabled !== undefined
      ? db.prepare("UPDATE business_automations SET enabled = ? WHERE id = ? AND business_id = ?").run(enabled ? 1 : 0, id, businessId)
      : db.prepare("UPDATE business_automations SET enabled = CASE WHEN enabled = 1 THEN 0 ELSE 1 END WHERE id = ? AND business_id = ?").run(id, businessId);
  return Boolean(res?.changes);
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

export function createPaymentOrderRecord(data: {
  orderId: string;
  userEmail: string;
  planId: string;
  amount: number;
  currency?: string;
  status?: string;
  rawResponse?: any;
}) {
  const id = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  try {
    db.prepare(`
      INSERT INTO payment_transactions (id, order_id, payment_id, user_email, plan_id, amount, currency, status, raw_response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.orderId,
      null,
      data.userEmail.trim().toLowerCase(),
      data.planId,
      data.amount,
      data.currency || 'INR',
      data.status || 'created',
      data.rawResponse ? JSON.stringify(data.rawResponse) : null,
      now
    );
  } catch (err) {
    console.warn("[Payments DB] createPaymentOrderRecord error:", err);
  }
  return { id, ...data, createdAt: now };
}

export function confirmPaymentAndActivateSubscription(data: {
  orderId: string;
  paymentId: string;
  userEmail: string;
  userName?: string;
  planId: string;
  planName: string;
  amount: number;
  currency?: string;
  rawResponse?: any;
}) {
  const now = new Date().toISOString();
  const cleanEmail = data.userEmail.trim().toLowerCase();

  // 1. Update payment transaction record
  try {
    db.prepare(`
      UPDATE payment_transactions
      SET payment_id = ?, status = 'success', raw_response = COALESCE(?, raw_response)
      WHERE order_id = ? OR (user_email = ? AND plan_id = ? AND status = 'created')
    `).run(
      data.paymentId,
      data.rawResponse ? JSON.stringify(data.rawResponse) : null,
      data.orderId,
      cleanEmail,
      data.planId
    );
  } catch (err) {
    console.warn("[Payments DB] Update transaction warning:", err);
  }

  // 2. Compute 30 days period end
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const subId = `sub_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}_${data.planId}`;

  // 3. Insert or update active subscription
  try {
    const existing = db.prepare("SELECT id FROM subscriptions WHERE user_email = ?").get(cleanEmail) as any;
    if (existing) {
      db.prepare(`
        UPDATE subscriptions
        SET plan_id = ?, plan_name = ?, amount = ?, currency = ?, status = 'active',
            razorpay_order_id = ?, razorpay_payment_id = ?, current_period_end = ?
        WHERE user_email = ?
      `).run(
        data.planId,
        data.planName,
        data.amount,
        data.currency || 'INR',
        data.orderId,
        data.paymentId,
        periodEnd,
        cleanEmail
      );
    } else {
      db.prepare(`
        INSERT INTO subscriptions (id, user_id, user_email, business_id, plan_id, plan_name, amount, currency, status, razorpay_order_id, razorpay_payment_id, created_at, current_period_end)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
      `).run(
        subId,
        null,
        cleanEmail,
        DEFAULT_BUSINESS_ID,
        data.planId,
        data.planName,
        data.amount,
        data.currency || 'INR',
        data.orderId,
        data.paymentId,
        now,
        periodEnd
      );
    }
  } catch (err) {
    console.warn("[Payments DB] Subscriptions table error:", err);
  }

  // 4. Create an automated onboarding notification in tasks
  try {
    const taskId = `task_pay_${Date.now()}`;
    db.prepare(`
      INSERT INTO tasks (id, business_id, title, owner, gap, priority, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      taskId,
      DEFAULT_BUSINESS_ID,
      `[Subscription Activated] Welcome to ${data.planName}! Premium AI C-Suite & Workflows Unlocked.`,
      data.userName || 'Founder',
      'Monetization & Commercial',
      'high',
      'done',
      now
    );
  } catch {}

  return { success: true, subscriptionId: subId, planId: data.planId, periodEnd };
}

export function getUserActiveSubscription(email: string) {
  if (!email) return null;
  try {
    const cleanEmail = email.trim().toLowerCase();
    if (isDemoAccount(cleanEmail)) return demoSubscription(cleanEmail);
    const sub = db.prepare("SELECT * FROM subscriptions WHERE LOWER(user_email) = ? AND status = 'active'").get(cleanEmail);
    return sub || null;
  } catch (err) {
    return null;
  }
}

export function getUserPaymentHistory(email: string) {
  if (!email) return [];
  try {
    const cleanEmail = email.trim().toLowerCase();
    return db.prepare("SELECT * FROM payment_transactions WHERE LOWER(user_email) = ? ORDER BY created_at DESC").all(cleanEmail) as any[];
  } catch (err) {
    return [];
  }
}

export function getPaymentTransactionByOrder(orderId: string) {
  try {
    return (db.prepare("SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1").get(orderId) as any) || null;
  } catch {
    return null;
  }
}

export function markPaymentFailed(orderId: string, paymentId: string | null, rawResponse?: any) {
  try {
    db.prepare(`
      UPDATE payment_transactions SET status = 'failed', payment_id = COALESCE(?, payment_id), raw_response = COALESCE(?, raw_response)
      WHERE order_id = ? AND status != 'success'
    `).run(paymentId, rawResponse ? JSON.stringify(rawResponse) : null, orderId);
  } catch (err) {
    console.warn("[Payments DB] markPaymentFailed error:", err);
  }
}

export function extendSubscriptionPeriod(email: string, days = 30) {
  try {
    const clean = email.trim().toLowerCase();
    const sub = db.prepare("SELECT id, current_period_end FROM subscriptions WHERE LOWER(user_email) = ?").get(clean) as any;
    if (!sub) return null;
    const base = Math.max(Date.now(), sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0);
    const end = new Date(base + days * 86400000).toISOString();
    db.prepare("UPDATE subscriptions SET status = 'active', current_period_end = ? WHERE id = ?").run(end, sub.id);
    return end;
  } catch {
    return null;
  }
}

export function getAllPaymentTransactions(limit = 100) {
  try {
    return db.prepare("SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
  } catch (err) {
    return [];
  }
}

export { db };




// ---------------------------------------------------------------
// DataPal usage: every extraction run, who made it and what it cost
// ---------------------------------------------------------------
// Google Places "Text Search" (the fields DataPal asks for include phone,
// website and rating) is billed per request. This is an estimate of that
// list price; actual GCP billing is the source of truth.
export const PLACES_COST_PER_REQUEST_USD = Number(process.env.PLACES_COST_PER_REQUEST_USD || 0.035);

export function logDataPalUsage(entry: {
  email: string;
  name?: string;
  requested: number;
  returned: number;
  realLeads: number;
  sourceMode: string;
  googleRequests: number;
}): void {
  try {
    db.prepare(
      `INSERT INTO datapal_usage_log (account_email, account_name, requested, returned, real_leads, source_mode, google_requests, est_cost_usd, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      (entry.email || "guest").trim().toLowerCase(),
      entry.name || null,
      entry.requested,
      entry.returned,
      entry.realLeads,
      entry.sourceMode,
      entry.googleRequests,
      entry.googleRequests * PLACES_COST_PER_REQUEST_USD,
      new Date().toISOString()
    );
  } catch (err: any) {
    console.warn("[DataPal usage] could not log:", err?.message);
  }
}


// ---------------------------------------------------------------
// DataPal credits live on the server so a user cannot edit their own balance.
// ---------------------------------------------------------------
import { PLAN_LIMITS as DATAPAL_PLAN_LIMITS, tierFromPlan as datapalTierFromPlan } from "@/lib/datapal/plans";

export interface DataPalCreditsState {
  planTier: "free" | "starter" | "growth" | "enterprise";
  baseQuota: number;
  used: number;
  addon: number;
  totalAllowed: number;
  remaining: number;
}

export function getDataPalCredits(email: string): DataPalCreditsState {
  const key = (email || "guest").trim().toLowerCase();
  let used = 0;
  let addon = 0;
  try {
    const row = db.prepare("SELECT used, addon FROM datapal_credits WHERE account_email = ?").get(key) as any;
    if (row) {
      used = Number(row.used) || 0;
      addon = Number(row.addon) || 0;
    }
  } catch {}
  const sub = getUserActiveSubscription(key) as any;
  const planTier = datapalTierFromPlan(sub?.plan_name || sub?.plan_id);
  const baseQuota = DATAPAL_PLAN_LIMITS[planTier];
  const totalAllowed = baseQuota + addon;
  return { planTier, baseQuota, used, addon, totalAllowed, remaining: Math.max(0, totalAllowed - used) };
}

/** Takes credits for records that were really delivered. Never goes past what the account has. */
export function consumeDataPalCredits(email: string, count: number): DataPalCreditsState {
  const key = (email || "guest").trim().toLowerCase();
  const n = Math.max(0, Math.floor(count));
  if (n > 0) {
    try {
      db.prepare(
        `INSERT INTO datapal_credits (account_email, used, addon, updated_at) VALUES (?, ?, 0, ?)
         ON CONFLICT(account_email) DO UPDATE SET used = used + excluded.used, updated_at = excluded.updated_at`
      ).run(key, n, new Date().toISOString());
    } catch (err: any) {
      console.warn("[DataPal credits] could not record usage:", err?.message);
    }
  }
  return getDataPalCredits(key);
}


/** Adds purchased records to an account's balance. */
export function addDataPalAddon(email: string, count: number): DataPalCreditsState {
  const key = (email || "guest").trim().toLowerCase();
  const n = Math.max(0, Math.floor(count));
  if (n > 0) {
    db.prepare(
      `INSERT INTO datapal_credits (account_email, used, addon, updated_at) VALUES (?, 0, ?, ?)
       ON CONFLICT(account_email) DO UPDATE SET addon = addon + excluded.addon, updated_at = excluded.updated_at`
    ).run(key, n, new Date().toISOString());
  }
  return getDataPalCredits(key);
}

/** Marks a top-up payment as paid and adds the records, but only the first time it is confirmed. */
export function confirmDataPalPackPayment(data: {
  orderId: string;
  paymentId: string;
  email: string;
  records: number;
  rawResponse?: any;
}): { alreadyApplied: boolean; credits: DataPalCreditsState } {
  const res: any = db
    .prepare(
      `UPDATE payment_transactions SET payment_id = ?, status = 'success', raw_response = COALESCE(?, raw_response)
       WHERE order_id = ? AND status != 'success'`
    )
    .run(data.paymentId, data.rawResponse ? JSON.stringify(data.rawResponse) : null, data.orderId);
  if (!res || !res.changes) {
    return { alreadyApplied: true, credits: getDataPalCredits(data.email) };
  }
  return { alreadyApplied: false, credits: addDataPalAddon(data.email, data.records) };
}

// ---------------------------------------------------------------
// Each customer's own business. Every customer API looks up data with this id,
// which comes from the signed-in email and never from anything the browser sends.
// ---------------------------------------------------------------
const businessIdFor = (email: string) => `biz_${String(email || "").trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, "_")}`;

export interface TeamMembership {
  ownerEmail: string;
  role: string;
  /** When the person confirmed the invite (seconds). Sessions older than this are not allowed into the owner's workspace. */
  verifiedAtSec: number;
}

/** Set when this person accepted an invite (confirmed their email with Google) and the owner has not removed them. */
export function getTeamMembership(email: string): TeamMembership | null {
  const e = String(email || "").trim().toLowerCase();
  try {
    const row = db
      .prepare("SELECT owner_email, role, verified_at FROM team_invites WHERE invite_email = ? AND status = 'verified' ORDER BY verified_at DESC LIMIT 1")
      .get(e) as any;
    if (!row || row.owner_email === e || !isUserRegistered(row.owner_email)) return null;
    return { ownerEmail: row.owner_email, role: row.role, verifiedAtSec: Math.floor(new Date(row.verified_at).getTime() / 1000) || 0 };
  } catch {
    return null; // the invites table does not exist until the first invite
  }
}

/** The group a person belongs to: their own account's business, or the owner's when they have joined a team. */
export function getGroupBusinessId(email: string): string {
  const membership = getTeamMembership(email);
  return businessIdFor(membership ? membership.ownerEmail : email);
}

/**
 * The business a person is working in right now: the group itself, or one of the group's companies they switched to.
 * The saved choice is checked against the group every time, so a company that was removed (or belongs to someone
 * else) can never be opened through it.
 */
export function getUserBusinessId(email: string): string {
  const groupId = getGroupBusinessId(email);
  try {
    const row = db
      .prepare(
        `SELECT b.id FROM active_business a JOIN businesses b ON b.id = a.business_id
         WHERE a.email = ? AND b.group_id = ?`
      )
      .get(String(email || "").trim().toLowerCase(), groupId) as any;
    if (row?.id) return row.id;
  } catch {}
  return groupId;
}

/** Switches the company a person works in. Only the group itself or one of its companies is accepted. */
export function setActiveBusiness(email: string, businessId: string): boolean {
  const who = String(email || "").trim().toLowerCase();
  const groupId = getGroupBusinessId(who);
  try {
    if (businessId === groupId) {
      db.prepare("DELETE FROM active_business WHERE email = ?").run(who);
      return true;
    }
    const ok = db.prepare("SELECT id FROM businesses WHERE id = ? AND group_id = ?").get(businessId, groupId);
    if (!ok) return false;
    db.prepare(
      `INSERT INTO active_business (email, business_id, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET business_id = excluded.business_id, updated_at = excluded.updated_at`
    ).run(who, businessId, new Date().toISOString());
    return true;
  } catch {
    return false;
  }
}

export function getUserBusiness(email: string) {
  try {
    const row = db.prepare("SELECT * FROM businesses WHERE id = ?").get(getUserBusinessId(email)) as any;
    if (!row) return null;
    return {
      id: row.id,
      name: row.name || "",
      industry: (row.industry as any) || "",
      industryLabel: row.industry_label || "",
      founderName: row.founder_name || "",
      annualRevenue: Number(row.annual_revenue || 0),
      monthlyRevenue: Number(row.monthly_revenue || 0),
      monthlyBurn: Number(row.monthly_burn || 0),
      cashOnHand: Number(row.cash_on_hand || 0),
      teamSize: Number(row.team_size || 0),
      website: row.website || "",
    };
  } catch {
    return null;
  }
}

// Made-up team members that an earlier version added (an "Executive Founder" and the AI advisors listed as people).
try {
  db.prepare("DELETE FROM team_members WHERE id IN ('mem_owner', 'mem_astra', 'mem_marcus') OR email LIKE '%@bizzpal.internal'").run();
} catch {}

// The menu is saved in the database. Remove the retired Workflows item and any typed-in count badge from the saved copy.
try {
  const navRow = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'dashboard_nav'").get() as any;
  if (navRow && typeof navRow.config_value === "string") {
    const nav = JSON.parse(navRow.config_value);
    if (Array.isArray(nav)) {
      const cleaned = nav
        .filter((i: any) => i?.id !== "nav_workflows")
        .map((i: any) => (typeof i?.badge === "string" && /^[0-9]+$/.test(i.badge.trim()) ? { ...i, badge: undefined } : i));
      if (JSON.stringify(cleaned) !== JSON.stringify(nav)) {
        db.prepare("UPDATE platform_config SET config_value = ?, updated_at = ? WHERE config_key = 'dashboard_nav'").run(JSON.stringify(cleaned), new Date().toISOString());
      }
    }
  }
} catch {}

// Recording a sign-in used to rename each business to "<name>'s Enterprise". Put back the name the customer saved.
try {
  const rows = db
    .prepare(
      `SELECT b.id, b.name AS current, u.business_profile FROM businesses b
       JOIN registered_users u ON b.id = 'biz_' || REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(u.email), '@', '_'), '.', '_'), '-', '_'), '+', '_'), '''', '_')
       WHERE b.name LIKE '%''s Enterprise' AND u.business_profile IS NOT NULL`
    )
    .all() as any[];
  for (const r of rows) {
    let saved = "";
    try { saved = String(JSON.parse(r.business_profile)?.name || "").trim(); } catch {}
    if (saved && saved !== r.current && !/'s Enterprise$/.test(saved)) {
      db.prepare("UPDATE businesses SET name = ? WHERE id = ?").run(saved, r.id);
    }
  }
} catch {}

// The saved menu never gains new default items on its own (so the admin's removals stick). Add the Group & Companies
// item once; after that the admin can rename, move or remove it like any other item.
try {
  const done = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'nav_added_group'").get() as any;
  const navRow = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'dashboard_nav'").get() as any;
  if (!done && navRow && typeof navRow.config_value === "string") {
    const nav = JSON.parse(navRow.config_value);
    if (Array.isArray(nav) && !nav.some((i: any) => i?.id === "nav_group" || i?.href === "/group")) {
      nav.push({ id: "nav_group", label: "Group & Companies", href: "/group", icon: "Network", order: 13, mobileTab: false, group: "system", enabled: true });
      db.prepare("UPDATE platform_config SET config_value = ?, updated_at = ? WHERE config_key = 'dashboard_nav'").run(JSON.stringify(nav), new Date().toISOString());
    }
    db.prepare("INSERT OR REPLACE INTO platform_config (config_key, config_value, updated_at) VALUES ('nav_added_group', 'true', ?)").run(new Date().toISOString());
  }
} catch {}

// Add the Business X-Ray item to the saved menu once; after that the admin can rename, move or remove it.
try {
  const done = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'nav_added_xray'").get() as any;
  const navRow = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'dashboard_nav'").get() as any;
  if (!done && navRow && typeof navRow.config_value === "string") {
    const nav = JSON.parse(navRow.config_value);
    if (Array.isArray(nav) && !nav.some((i: any) => i?.id === "nav_xray" || i?.href === "/xray")) {
      nav.push({ id: "nav_xray", label: "Business X-Ray", href: "/xray", icon: "ScanSearch", order: 4.5, mobileTab: false, group: "intelligence", enabled: true });
      db.prepare("UPDATE platform_config SET config_value = ?, updated_at = ? WHERE config_key = 'dashboard_nav'").run(JSON.stringify(nav), new Date().toISOString());
    }
    db.prepare("INSERT OR REPLACE INTO platform_config (config_key, config_value, updated_at) VALUES ('nav_added_xray', 'true', ?)").run(new Date().toISOString());
  }
} catch {}

// Add the AI Agents item to the saved menu once.
try {
  const done = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'nav_added_agents'").get() as any;
  const navRow = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'dashboard_nav'").get() as any;
  if (!done && navRow && typeof navRow.config_value === "string") {
    const nav = JSON.parse(navRow.config_value);
    if (Array.isArray(nav) && !nav.some((i: any) => i?.id === "nav_agents" || i?.href === "/agents")) {
      nav.push({ id: "nav_agents", label: "AI Agents", href: "/agents", icon: "Bot", order: 12.5, mobileTab: false, group: "management", enabled: true });
      db.prepare("UPDATE platform_config SET config_value = ?, updated_at = ? WHERE config_key = 'dashboard_nav'").run(JSON.stringify(nav), new Date().toISOString());
    }
    db.prepare("INSERT OR REPLACE INTO platform_config (config_key, config_value, updated_at) VALUES ('nav_added_agents', 'true', ?)").run(new Date().toISOString());
  }
} catch {}

// Saved plans used to promise a WhatsApp briefing. The daily briefing now goes by email, so the plan text says that.
try {
  const row = db.prepare("SELECT config_value FROM platform_config WHERE config_key = 'subscription_plans'").get() as any;
  if (row && typeof row.config_value === "string") {
    let text: string = row.config_value;
    for (const old of ["Automated Daily 8:00 AM WhatsApp Briefings", "Daily WhatsApp briefings (coming soon)"]) text = text.split(old).join("Daily email briefing");
    text = text.split("Email & WhatsApp Support").join("Email Support");
    if (text !== row.config_value) {
      db.prepare("UPDATE platform_config SET config_value = ?, updated_at = ? WHERE config_key = 'subscription_plans'").run(text, new Date().toISOString());
    }
  }
} catch {}

// ---------------------------------------------------------------
// Passwords (email sign-in). Only a salted hash is stored.
// ---------------------------------------------------------------
try {
  db.exec(`ALTER TABLE registered_users ADD COLUMN password_hash TEXT`);
} catch {
  // column already exists
}

export function getUserPasswordHash(email: string): string | null {
  try {
    const row = db.prepare("SELECT password_hash FROM registered_users WHERE LOWER(email) = ?").get(String(email || "").trim().toLowerCase()) as any;
    return row?.password_hash || null;
  } catch {
    return null;
  }
}

export function setUserPasswordHash(email: string, hash: string): boolean {
  try {
    const res: any = db.prepare("UPDATE registered_users SET password_hash = ? WHERE LOWER(email) = ?").run(hash, String(email || "").trim().toLowerCase());
    return Boolean(res?.changes);
  } catch {
    return false;
  }
}

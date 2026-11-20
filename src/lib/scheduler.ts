/**
 * Background jobs that run inside the app server, so nothing has to be set up on the machine:
 *  - every 6 hours: run every switched-on automation for every business, and save the monthly snapshot of each
 *    business's real figures (so forecasts fill in even in months nobody opens the product)
 *  - every morning at 8:00 India time: send the daily briefing to people who turned it on
 *
 * The app runs as one process (PM2), so one timer is enough. Each job writes when it last ran, so a restart never
 * repeats work. Set DISABLE_SCHEDULER=1 to switch it off.
 */
import { db, getRegisteredUser, registerUser, saveUserBusinessProfile, setUserPasswordHash, getUserPasswordHash } from "@/lib/db";
import { demoEmails, DEFAULT_DEMO_CREDENTIALS } from "@/lib/demoAccount";
import { hashPassword } from "@/lib/auth/password";
import { calculateBusinessMetrics } from "@/lib/bi/metricsEngine";
import { runAutomation, type RunStatus } from "@/lib/automations/engine";
import { sendAllBriefings } from "@/lib/briefing";
import { appBaseUrl, mailConfigured } from "@/lib/mail";

const SIX_HOURS = 6 * 60 * 60 * 1000;
const TICK_MS = 10 * 60 * 1000;

let tablesReady = false;
function ensureTables() {
  if (tablesReady) return;
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_runs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      automation_id TEXT NOT NULL,
      automation_name TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL,
      source TEXT NOT NULL,
      at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_automation_runs_business ON automation_runs (business_id, at DESC);
  `);
  tablesReady = true;
}

function lastRun(job: string): number {
  try {
    const row = db.prepare("SELECT config_value FROM platform_config WHERE config_key = ?").get(`job:${job}`) as any;
    return row ? new Date(row.config_value).getTime() || 0 : 0;
  } catch {
    return 0;
  }
}
function markRun(job: string) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO platform_config (config_key, config_value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(config_key) DO UPDATE SET config_value = excluded.config_value, updated_at = excluded.updated_at`
  ).run(`job:${job}`, now, now);
}

export interface RunOutcome {
  status: RunStatus;
  detail: string;
  taskAdded: boolean;
  at: string;
}

/** Runs one automation against the business's real figures, records the run, and adds a task if its condition is met. */
export function runAutomationNow(
  businessId: string,
  rule: { id: string; title: string; trigger: string; action: string },
  source: "schedule" | "manual"
): RunOutcome {
  ensureTables();
  const m = calculateBusinessMetrics(businessId);
  const profile = { cash: m.cashReserve, burn: m.monthlyBurn, revenue: m.monthlyRevenue };
  let openTasks: number | null = null;
  try {
    openTasks = (db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE business_id = ? AND status != 'done'").get(businessId) as any).n;
  } catch {}

  const result = runAutomation({ name: rule.title, trigger: rule.trigger, action: rule.action }, { profile, openTasks });
  const at = new Date().toISOString();

  db.prepare("INSERT INTO automation_runs (id, business_id, automation_id, automation_name, status, detail, source, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
    `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, businessId, rule.id, rule.title, result.status, result.detail, source, at
  );
  db.prepare("UPDATE business_automations SET last_run = ?, executions_count = COALESCE(executions_count, 0) + 1 WHERE id = ? AND business_id = ?").run(at, rule.id, businessId);
  // Keep the log to the latest 200 runs per business
  db.prepare("DELETE FROM automation_runs WHERE business_id = ? AND id NOT IN (SELECT id FROM automation_runs WHERE business_id = ? ORDER BY at DESC LIMIT 200)").run(businessId, businessId);

  let taskAdded = false;
  if (result.task) {
    // One open task per kind of problem, so a rule that stays true does not pile up copies
    const open = db.prepare("SELECT id FROM tasks WHERE business_id = ? AND gap = ? AND title LIKE '[Automation]%' AND status != 'done' LIMIT 1").get(businessId, result.task.gap);
    if (!open) {
      db.prepare("INSERT INTO tasks (id, business_id, title, owner, gap, priority, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'todo', ?)").run(
        `task_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, businessId, `[Automation] ${result.task.title}`, "Founder", result.task.gap, result.task.priority, at
      );
      taskAdded = true;
    }
  }
  return { status: result.status, detail: result.detail, taskAdded, at };
}

export function getAutomationRuns(businessId: string, limit = 50) {
  ensureTables();
  return db
    .prepare("SELECT id, automation_id AS automationId, automation_name AS automationName, status, detail, source, at FROM automation_runs WHERE business_id = ? ORDER BY at DESC LIMIT ?")
    .all(businessId, limit) as Array<{ id: string; automationId: string; automationName: string; status: RunStatus; detail: string; source: string; at: string }>;
}

function runEveryBusiness() {
  ensureTables();
  const businesses = db.prepare("SELECT id FROM businesses").all() as Array<{ id: string }>;
  for (const b of businesses) {
    try {
      calculateBusinessMetrics(b.id); // saves this month's snapshot of the real figures
      const rules = db.prepare("SELECT id, title, trigger_event, action_event FROM business_automations WHERE business_id = ? AND enabled = 1").all(b.id) as any[];
      for (const r of rules) runAutomationNow(b.id, { id: r.id, title: r.title, trigger: r.trigger_event, action: r.action_event }, "schedule");
    } catch (e) {
      console.error("[scheduler] business job failed:", b.id, (e as Error).message);
    }
  }
}

const istParts = () => {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value || "";
  return { day: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) % 24 };
};

export async function runDueJobs() {
  try {
    if (Date.now() - lastRun("business-checks") >= SIX_HOURS) {
      markRun("business-checks");
      runEveryBusiness();
    }
    const ist = istParts();
    if (ist.hour >= 8 && mailConfigured()) {
      const last = lastRun("daily-briefing");
      const lastDay = last ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(last)) : "";
      if (lastDay !== ist.day) {
        markRun("daily-briefing");
        const r = await sendAllBriefings(appBaseUrl());
        console.log(`[scheduler] daily briefing: ${r.sent} sent, ${r.failed} failed`);
      }
    }
  } catch (e) {
    console.error("[scheduler] tick failed:", (e as Error).message);
  }
}

/**
 * Keeps the demo account(s) in place: the account exists, and it has a saved business name so it opens straight
 * on the dashboard. If an account is missing it is created only when DEMO_ACCOUNT_PASSWORD is set on the server.
 * An existing account's password is never changed here.
 */
export function ensureDemoAccounts() {
  try {
    const defaultPw = process.env.DEMO_ACCOUNT_PASSWORD || DEFAULT_DEMO_CREDENTIALS.password;
    for (const email of demoEmails()) {
      let user: any = getRegisteredUser(email);
      if (!user) {
        registerUser(email, "BizzPal Demo", "email");
        setUserPasswordHash(email, hashPassword(defaultPw));
        user = getRegisteredUser(email);
      } else {
        const hash = getUserPasswordHash(email);
        if (!hash) {
          setUserPasswordHash(email, hashPassword(defaultPw));
        }
      }
      if (user && !user.business_profile) {
        saveUserBusinessProfile(email, {
          name: "BizzPal Demo Enterprise",
          founderName: "BizzPal Demo",
          industryLabel: "Technology & Services",
          revenue: 12500000,
          completedAt: new Date().toISOString(),
        });
      }
    }
  } catch (e) {
    console.error("[demo] could not prepare the demo account:", (e as Error).message);
  }
}

export function startScheduler() {
  const g = globalThis as any;
  if (g.__bizzpalScheduler || process.env.DISABLE_SCHEDULER === "1") return;
  g.__bizzpalScheduler = true;
  ensureDemoAccounts();
  // First look a minute after start so a restart is not slowed down
  setTimeout(() => { runDueJobs(); }, 60_000).unref?.();
  setInterval(() => { runDueJobs(); }, TICK_MS).unref?.();
}

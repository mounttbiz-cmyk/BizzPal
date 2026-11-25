import { randomBytes } from "crypto";
import { db, getGroupBusinessId, getPlatformConfig, getTeamMembership, getUserActiveSubscription } from "@/lib/db";

/**
 * AI usage and cost (PRD section 11).
 *
 * Every AI answer that carries a meter is recorded with its provider, model, tokens and estimated cost in rupees.
 * Prices per million tokens live in platform settings ("ai_model_prices_usd") so they can follow provider price
 * changes without a release; the rupee rate comes from USD_TO_INR_RATE.
 *
 * Each group (an account and its companies) has a daily AI spending ceiling by plan ("finops_daily_limits_inr").
 * Day-to-day features (chat, X-Ray, brief) are covered by the plan up to that ceiling; agent work additionally pays
 * from the prepaid credit wallet.
 */

export interface ModelPrice {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
}

// Published list prices at the time of writing; override in platform settings when they change.
export const DEFAULT_MODEL_PRICES_USD: Record<string, ModelPrice> = {
  "gemini-2.5-pro": { inputPerMillionUsd: 1.25, outputPerMillionUsd: 10 },
  "gemini-pro-latest": { inputPerMillionUsd: 1.25, outputPerMillionUsd: 10 },
  "gemini-3-pro-preview": { inputPerMillionUsd: 2, outputPerMillionUsd: 12 },
  "gemini-2.5-flash": { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
  "gemini-flash-latest": { inputPerMillionUsd: 0.3, outputPerMillionUsd: 2.5 },
  "gemini-2.5-flash-lite": { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },
  "gemini-flash-lite-latest": { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.4 },
  "llama-3.3-70b-versatile": { inputPerMillionUsd: 0.59, outputPerMillionUsd: 0.79 },
  "llama-3.1-8b-instant": { inputPerMillionUsd: 0.05, outputPerMillionUsd: 0.08 },
  "mistral-small-latest": { inputPerMillionUsd: 0.1, outputPerMillionUsd: 0.3 },
  "command-a-03-2025": { inputPerMillionUsd: 2.5, outputPerMillionUsd: 10 },
  // Anything not listed is costed like a mid-priced model rather than as free
  default: { inputPerMillionUsd: 1, outputPerMillionUsd: 4 },
};

// Rupees of AI usage a group may run per day, by plan. Generous for normal use; it stops runaway cost.
export const DEFAULT_DAILY_LIMITS_INR: Record<string, number> = {
  free: 25,
  starter: 150,
  growth: 500,
  enterprise: 2000,
  default: 150,
};

export class BudgetError extends Error {
  status: number;
  constructor(message: string, status = 429) {
    super(message);
    this.status = status;
  }
}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      feature TEXT NOT NULL,
      trace_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL,
      output_tokens INTEGER NOT NULL,
      cost_usd REAL NOT NULL,
      cost_inr REAL NOT NULL,
      usd_to_inr REAL NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_business ON ai_usage (business_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_trace ON ai_usage (trace_id);
  `);
} catch {}

export const usdToInr = () => {
  const n = Number(process.env.USD_TO_INR_RATE);
  return Number.isFinite(n) && n > 0 ? n : 88;
};

function priceFor(model: string): ModelPrice {
  const table = { ...DEFAULT_MODEL_PRICES_USD, ...(getPlatformConfig<Record<string, ModelPrice>>("ai_model_prices_usd", {}) || {}) };
  const p = table[model] || table.default;
  return {
    inputPerMillionUsd: Math.max(0, Number(p?.inputPerMillionUsd) || 0),
    outputPerMillionUsd: Math.max(0, Number(p?.outputPerMillionUsd) || 0),
  };
}

export function costOf(model: string, inputTokens: number, outputTokens: number): { usd: number; inr: number; rate: number } {
  const p = priceFor(model);
  const usd = (inputTokens * p.inputPerMillionUsd + outputTokens * p.outputPerMillionUsd) / 1_000_000;
  const rate = usdToInr();
  return { usd, inr: Math.round(usd * rate * 10000) / 10000, rate };
}

/** The group a business belongs to: itself, or the account business its companies sit under. */
export function groupOf(businessId: string): string {
  const row = db.prepare("SELECT group_id FROM businesses WHERE id = ?").get(businessId) as any;
  return row?.group_id || businessId;
}

export function recordAiUsage(u: {
  businessId: string;
  feature: string;
  traceId?: string | null;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}) {
  const c = costOf(u.model, u.inputTokens, u.outputTokens);
  db.prepare(
    `INSERT INTO ai_usage (id, business_id, feature, trace_id, provider, model, input_tokens, output_tokens, cost_usd, cost_inr, usd_to_inr, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    `use_${randomBytes(10).toString("hex")}`,
    u.businessId,
    u.feature.slice(0, 40),
    u.traceId || null,
    u.provider,
    u.model,
    u.inputTokens,
    u.outputTokens,
    c.usd,
    c.inr,
    c.rate,
    new Date().toISOString()
  );
  return c;
}

/** Start of today in India, as an ISO time, so "today" matches the customer's day. */
export function startOfIndianDay(now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600_000);
  ist.setUTCHours(0, 0, 0, 0);
  return new Date(ist.getTime() - 5.5 * 3600_000).toISOString();
}

/** Rupees of AI spent today by a group (the account and all its companies). */
export function spentTodayInr(groupId: string): number {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(u.cost_inr), 0) AS total FROM ai_usage u
       LEFT JOIN businesses b ON b.id = u.business_id
       WHERE (u.business_id = ? OR b.group_id = ?) AND u.created_at >= ?`
    )
    .get(groupId, groupId, startOfIndianDay()) as any;
  return Math.round(Number(row?.total || 0) * 100) / 100;
}

export function dailyLimitInr(planId: string): number {
  const table = { ...DEFAULT_DAILY_LIMITS_INR, ...(getPlatformConfig<Record<string, number>>("finops_daily_limits_inr", {}) || {}) };
  const v = Number(table[planId] ?? table.default);
  return Number.isFinite(v) && v >= 0 ? v : DEFAULT_DAILY_LIMITS_INR.default;
}

/** Stops new AI work once the group's daily ceiling is reached. */
export function assertWithinDailyLimit(groupId: string, planId: string) {
  const limit = dailyLimitInr(planId);
  const spent = spentTodayInr(groupId);
  if (spent >= limit) {
    throw new BudgetError(
      `Today's AI usage limit for your plan has been reached (₹${limit.toLocaleString("en-IN")}). It resets at midnight, India time.`
    );
  }
  return { spent, limit };
}

/** Usage summary for the Credits & usage page. */
export function usageSummary(groupId: string, days = 30) {
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const rows = db
    .prepare(
      `SELECT u.feature, COUNT(*) AS calls, SUM(u.input_tokens) AS input_tokens, SUM(u.output_tokens) AS output_tokens, SUM(u.cost_inr) AS cost_inr
       FROM ai_usage u LEFT JOIN businesses b ON b.id = u.business_id
       WHERE (u.business_id = ? OR b.group_id = ?) AND u.created_at >= ?
       GROUP BY u.feature ORDER BY cost_inr DESC`
    )
    .all(groupId, groupId, since) as any[];
  return rows.map(r => ({
    feature: r.feature,
    calls: Number(r.calls),
    inputTokens: Number(r.input_tokens || 0),
    outputTokens: Number(r.output_tokens || 0),
    costInr: Math.round(Number(r.cost_inr || 0) * 100) / 100,
  }));
}

/** The plan that pays for a person's AI use: their own, or the owner's when they work in someone's team. */
export function planIdFor(email: string): string {
  const owner = getTeamMembership(email)?.ownerEmail || email;
  const sub: any = getUserActiveSubscription(owner);
  return sub?.plan_id ? String(sub.plan_id) : "free";
}

/** Throws a BudgetError when the person's group has used up today's AI allowance. */
export function checkDailyAiLimit(email: string) {
  return assertWithinDailyLimit(getGroupBusinessId(email), planIdFor(email));
}

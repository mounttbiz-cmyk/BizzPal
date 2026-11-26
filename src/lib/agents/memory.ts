import { db } from "@/lib/db";
import { generateChatDetailed, type AiTier } from "@/lib/ai/providers";
import { recordAudit } from "@/lib/platform/audit";

/**
 * Agent memory: a short "house style" for each business (tone, how emails are signed, prices and answers the owner
 * actually uses), learned from the messages the owner approved and from the edits they made before approving.
 * The owner can read it, change it and switch it off. It never holds customer contact details.
 */

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_memory (
      business_id TEXT PRIMARY KEY,
      style TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 1,
      learned_from INTEGER NOT NULL DEFAULT 0,
      learned_at TEXT,
      updated_at TEXT NOT NULL,
      updated_by TEXT NOT NULL
    );
  `);
} catch {}

export interface AgentMemory {
  style: string;
  enabled: boolean;
  learnedFrom: number;
  learnedAt: string | null;
  updatedAt: string | null;
  /** Approved messages since the style was last learned */
  newExamples: number;
}

const MAX_STYLE = 2000;
/** Learn again automatically after this many new approved messages */
export const RELEARN_AFTER = 5;

/** Removes email addresses and phone numbers, so customer contact details never end up in the memory. */
export function scrubContactDetails(text: string): string {
  return String(text || "")
    .replace(/[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+/g, "[email]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone]")
    .slice(0, MAX_STYLE);
}

function row(businessId: string): any {
  return db.prepare("SELECT * FROM agent_memory WHERE business_id = ?").get(businessId);
}

function approvedExamples(businessId: string, since?: string | null) {
  const rows = db
    .prepare(
      `SELECT payload, original_payload, decided_at FROM approvals
       WHERE business_id = ? AND action = 'email.send' AND status IN ('approved', 'used') AND payload IS NOT NULL ${since ? "AND decided_at > ?" : ""}
       ORDER BY decided_at DESC LIMIT 30`
    )
    .all(...(since ? [businessId, since] : [businessId])) as any[];
  return rows;
}

export function getMemory(businessId: string): AgentMemory {
  const r = row(businessId);
  return {
    style: r?.style || "",
    enabled: r ? Boolean(r.enabled) : true,
    learnedFrom: Number(r?.learned_from || 0),
    learnedAt: r?.learned_at || null,
    updatedAt: r?.updated_at || null,
    newExamples: approvedExamples(businessId, r?.learned_at || null).length,
  };
}

/** The style to give an agent, or null when there is none or the owner switched it off. */
export function houseStyleFor(businessId: string): string | null {
  const r = row(businessId);
  return r && r.enabled && String(r.style || "").trim() ? String(r.style) : null;
}

function upsert(businessId: string, fields: { style?: string; enabled?: boolean; learnedFrom?: number; learnedAt?: string }, actor: string) {
  const now = new Date().toISOString();
  const cur = row(businessId);
  const style = fields.style !== undefined ? scrubContactDetails(fields.style).trim() : cur?.style || "";
  const enabled = fields.enabled !== undefined ? (fields.enabled ? 1 : 0) : cur ? cur.enabled : 1;
  const learnedFrom = fields.learnedFrom ?? cur?.learned_from ?? 0;
  const learnedAt = fields.learnedAt ?? cur?.learned_at ?? null;
  if (cur) {
    db.prepare("UPDATE agent_memory SET style = ?, enabled = ?, learned_from = ?, learned_at = ?, updated_at = ?, updated_by = ? WHERE business_id = ?").run(
      style,
      enabled,
      learnedFrom,
      learnedAt,
      now,
      actor,
      businessId
    );
  } else {
    db.prepare("INSERT INTO agent_memory (business_id, style, enabled, learned_from, learned_at, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
      businessId,
      style,
      enabled,
      learnedFrom,
      learnedAt,
      now,
      actor
    );
  }
}

/** The owner edits the style or switches it on or off. */
export function saveMemory(businessId: string, input: { style?: string; enabled?: boolean }, actor: string): AgentMemory {
  upsert(businessId, { style: input.style, enabled: input.enabled }, actor);
  recordAudit({ businessId, actor, action: "agent_memory.updated", resource: "house_style", detail: { enabled: input.enabled, edited: input.style !== undefined } });
  return getMemory(businessId);
}

/**
 * Learns the house style from the owner's approved emails (and their edits). Returns the memory, or a reason it could
 * not learn. Costs a little AI; it is metered like every other AI call.
 */
export async function learnHouseStyle(businessId: string, actor: string, tier: AiTier): Promise<{ ok: true; memory: AgentMemory } | { ok: false; reason: string }> {
  const examples = approvedExamples(businessId).slice(0, 20);
  if (examples.length === 0) return { ok: false, reason: "There are no approved emails to learn from yet." };
  const sample = examples
    .map((e, i) => {
      let final: any = {};
      let first: any = {};
      try {
        final = JSON.parse(e.payload || "{}");
        first = JSON.parse(e.original_payload || "{}");
      } catch {}
      const edited = first.body && first.body !== final.body;
      return [
        `Example ${i + 1}${edited ? " (the owner edited the agent's draft before approving)" : ""}:`,
        `Subject: ${scrubContactDetails(final.subject || "")}`,
        `Approved text: ${scrubContactDetails(final.body || "").slice(0, 1200)}`,
        edited ? `Agent's first draft: ${scrubContactDetails(first.body || "").slice(0, 800)}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const answer = await generateChatDetailed(
    {
      system: [
        "You write a short house style guide for an AI agent that drafts emails for a business, based only on emails the owner approved.",
        "Where the owner edited a draft, learn what they changed and why.",
        "Cover: tone and formality, greeting and sign-off, length, words or phrases to use or avoid, prices, offers and answers the owner actually stated.",
        "Never include customer names, email addresses, phone numbers or other personal details. Never invent anything not in the examples.",
        'Answer with JSON only: {"style": "6 to 12 short bullet lines, each starting with - "}',
      ].join("\n"),
      message: sample,
      json: true,
      temperature: 0.2,
      meter: { businessId, feature: "agent_memory" },
    },
    tier
  );
  if (!answer) return { ok: false, reason: "The AI is not answering right now. Please try again later." };
  let style = "";
  try {
    style = String(JSON.parse(answer.text.replace(/^```(?:json)?\s*|\s*```$/g, "")).style || "");
  } catch {}
  if (!style.trim()) return { ok: false, reason: "Could not learn a clear style from these emails." };
  upsert(businessId, { style, learnedFrom: examples.length, learnedAt: new Date().toISOString() }, actor);
  recordAudit({ businessId, actor, action: "agent_memory.learned", resource: "house_style", detail: { examples: examples.length } });
  return { ok: true, memory: getMemory(businessId) };
}

/** After enough new approvals, learn again in the background (only when memory is on). */
export function maybeRelearn(businessId: string, actor: string, tier: AiTier) {
  const m = getMemory(businessId);
  if (!m.enabled || m.newExamples < RELEARN_AFTER) return;
  void learnHouseStyle(businessId, actor, tier).catch(() => {});
}

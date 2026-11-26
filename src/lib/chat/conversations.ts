import { randomBytes } from "crypto";
import { db } from "@/lib/db";

/**
 * Saved advisor conversations, one row per chat, kept per person and per business so a chat survives a refresh and
 * can be reopened from "Recent". Only the person who had the conversation can see it.
 */

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      messages TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_chat_conversations_owner ON chat_conversations (business_id, user_email, agent_id, updated_at);
  `);
} catch {}

const MAX_MESSAGES = 200;
const MAX_CONTENT = 20000;
const AGENT_ID = /^[a-z_]{2,40}$/;

export class ChatStoreError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface ConversationSummary {
  id: string;
  agentId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Keeps only the fields a message is made of, with sane sizes. Local file previews (blob: links) are dropped. */
function cleanMessages(input: unknown): any[] {
  if (!Array.isArray(input)) throw new ChatStoreError("Messages must be a list.");
  return input.slice(-MAX_MESSAGES).map((m: any) => {
    const sender = m?.sender === "user" ? "user" : "agent";
    const out: any = {
      id: String(m?.id || `msg_${randomBytes(6).toString("hex")}`).slice(0, 60),
      sender,
      agentId: String(m?.agentId || "").slice(0, 40),
      agentName: String(m?.agentName || "").slice(0, 120),
      avatar: String(m?.avatar || "").slice(0, 40),
      timestamp: String(m?.timestamp || "").slice(0, 40),
      sentAt: typeof m?.sentAt === "string" ? m.sentAt.slice(0, 40) : undefined,
      content: String(m?.content || "").slice(0, MAX_CONTENT),
    };
    if (m?.isError) out.isError = true;
    if (m?.provider) out.provider = String(m.provider).slice(0, 40);
    if (m?.handoff && typeof m.handoff === "object") out.handoff = { agentId: String(m.handoff.agentId || "").slice(0, 40), question: String(m.handoff.question || "").slice(0, 4000) };
    if (m?.briefSuggestion && typeof m.briefSuggestion === "object") {
      out.briefSuggestion = {
        key: String(m.briefSuggestion.key || "").slice(0, 60),
        label: String(m.briefSuggestion.label || "").slice(0, 120),
        value: String(m.briefSuggestion.value || "").slice(0, 2000),
      };
    }
    if (m?.structuredRecord && typeof m.structuredRecord === "object") out.structuredRecord = m.structuredRecord;
    if (m?.recordCommitted) out.recordCommitted = true;
    if (Array.isArray(m?.attachments)) {
      out.attachments = m.attachments.slice(0, 10).map((a: any) => ({ name: String(a?.name || "").slice(0, 200), size: Number(a?.size) || 0, type: String(a?.type || "").slice(0, 100) }));
    }
    return out;
  });
}

/** A short title from the first thing the person asked. */
export function titleFrom(messages: any[]): string {
  const first = messages.find(m => m.sender === "user" && String(m.content || "").trim());
  const text = String(first?.content || "New chat").replace(/\s+/g, " ").trim();
  return text.length > 60 ? `${text.slice(0, 57).trimEnd()}…` : text;
}

function toSummary(r: any): ConversationSummary {
  return { id: r.id, agentId: r.agent_id, title: r.title, messageCount: Number(r.message_count || 0), createdAt: r.created_at, updatedAt: r.updated_at };
}

export function listConversations(businessId: string, email: string, agentId?: string, limit = 50): ConversationSummary[] {
  const rows = (agentId
    ? db
        .prepare("SELECT id, agent_id, title, message_count, created_at, updated_at FROM chat_conversations WHERE business_id = ? AND user_email = ? AND agent_id = ? ORDER BY updated_at DESC LIMIT ?")
        .all(businessId, email, agentId, Math.min(limit, 200))
    : db
        .prepare("SELECT id, agent_id, title, message_count, created_at, updated_at FROM chat_conversations WHERE business_id = ? AND user_email = ? ORDER BY updated_at DESC LIMIT ?")
        .all(businessId, email, Math.min(limit, 200))) as any[];
  return rows.map(toSummary);
}

export function getConversation(businessId: string, email: string, id: string) {
  const r = db.prepare("SELECT * FROM chat_conversations WHERE id = ? AND business_id = ? AND user_email = ?").get(id, businessId, email) as any;
  if (!r) return null;
  let messages: any[] = [];
  try {
    messages = JSON.parse(r.messages || "[]");
  } catch {}
  return { ...toSummary(r), messages };
}

export function createConversation(businessId: string, email: string, agentId: string, rawMessages: unknown) {
  if (!AGENT_ID.test(agentId)) throw new ChatStoreError("Unknown advisor.");
  const messages = cleanMessages(rawMessages);
  if (!messages.some(m => m.sender === "user")) throw new ChatStoreError("A chat starts with a message.");
  const id = `chat_${randomBytes(10).toString("hex")}`;
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO chat_conversations (id, business_id, user_email, agent_id, title, messages, message_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(id, businessId, email, agentId, titleFrom(messages), JSON.stringify(messages), messages.length, now, now);
  return getConversation(businessId, email, id)!;
}

export function updateConversation(businessId: string, email: string, id: string, input: { messages?: unknown; title?: unknown }) {
  const cur = db.prepare("SELECT id FROM chat_conversations WHERE id = ? AND business_id = ? AND user_email = ?").get(id, businessId, email);
  if (!cur) throw new ChatStoreError("That chat was not found.", 404);
  const now = new Date().toISOString();
  if (input.messages !== undefined) {
    const messages = cleanMessages(input.messages);
    db.prepare("UPDATE chat_conversations SET messages = ?, message_count = ?, updated_at = ? WHERE id = ?").run(JSON.stringify(messages), messages.length, now, id);
  }
  if (input.title !== undefined) {
    const title = String(input.title || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!title) throw new ChatStoreError("Give the chat a name.");
    db.prepare("UPDATE chat_conversations SET title = ? WHERE id = ?").run(title, id);
  }
  return getConversation(businessId, email, id)!;
}

export function deleteConversation(businessId: string, email: string, id: string): boolean {
  const r: any = db.prepare("DELETE FROM chat_conversations WHERE id = ? AND business_id = ? AND user_email = ?").run(id, businessId, email);
  return Boolean(r?.changes);
}

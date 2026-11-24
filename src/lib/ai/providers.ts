import { DEFAULT_SUBSCRIPTION_PLANS, getPlatformConfig, getTeamMembership, getUserActiveSubscription } from "@/lib/db";

/**
 * Sends a conversation to the AI providers. Used by the AI chat and by DataPal.
 *
 * Three tiers, decided by the plan of the account (or of the owner, for a teammate):
 * - top:  the highest plan offered. Google Gemini's strongest (Pro) models only, with no other provider behind it.
 * - paid: any other paid plan. Gemini first, then the other providers if Gemini cannot answer.
 * - free: a lighter Gemini model first, then the other providers.
 */

export type AiTier = "free" | "paid" | "top";

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ChatRequest {
  /** Who the assistant is and what it knows */
  system: string;
  /** Earlier turns of this conversation, oldest first */
  history?: ChatTurn[];
  /** The new message */
  message: string;
  /** Files sent with the message (images or PDFs). Only Gemini can read them. */
  files?: Array<{ mimeType: string; base64: string }>;
  /** Ask for a JSON answer */
  json?: boolean;
}

// Gemini models per tier, tried in order so a retired name falls through to the next one. Change them without a
// deploy by setting GEMINI_MODELS_TOP / GEMINI_MODELS_PAID / GEMINI_MODELS_FREE (comma separated) on the server.
const listFromEnv = (value: string | undefined, fallback: string[]) => {
  const items = (value || "").split(",").map(x => x.trim()).filter(Boolean);
  return items.length > 0 ? items : fallback;
};
const GEMINI_MODELS: Record<AiTier, () => string[]> = {
  top: () => listFromEnv(process.env.GEMINI_MODELS_TOP, ["gemini-pro-latest", "gemini-3-pro-preview", "gemini-2.5-pro"]),
  paid: () => listFromEnv(process.env.GEMINI_MODELS_PAID, ["gemini-flash-latest", "gemini-2.5-flash", "gemini-2.5-pro"]),
  free: () => listFromEnv(process.env.GEMINI_MODELS_FREE, ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-flash-latest"]),
};

/** Paid plans in the order the platform offers them (the admin can change them), lowest first. */
function paidPlanOrder(): string[] {
  let plans: any[] = DEFAULT_SUBSCRIPTION_PLANS as any[];
  try {
    const saved = getPlatformConfig<any[]>("subscription_plans", DEFAULT_SUBSCRIPTION_PLANS as any[]);
    if (Array.isArray(saved) && saved.length > 0) plans = saved;
  } catch {}
  return plans.filter(p => p && p.enabled !== false && p.id && p.id !== "free").map(p => String(p.id));
}

/** The AI tier of a person: from their own plan, or the owner's when they work in someone's team. */
export function aiTierFor(email: string): AiTier {
  const owner = getTeamMembership(email)?.ownerEmail || email;
  const sub: any = getUserActiveSubscription(owner);
  const plan = sub?.plan_id ? String(sub.plan_id) : "free";
  if (plan === "free") return "free";
  const order = paidPlanOrder();
  const rank = order.indexOf(plan);
  // The last plan offered is the top one. A plan no longer offered (for example a custom enterprise deal) counts
  // as top when it is "enterprise", otherwise as an ordinary paid plan.
  if (rank !== -1) return rank === order.length - 1 ? "top" : "paid";
  return plan === "enterprise" ? "top" : "paid";
}

/** Kept for callers that only need to know whether a plan is paid. */
export function hasPaidPlan(email: string): boolean {
  return aiTierFor(email) !== "free";
}

// ---------------------------------------------------------------- providers

async function callGemini(apiKey: string, req: ChatRequest, models: string[], maxOutputTokens: number): Promise<string | null> {
  const contents = [
    ...(req.history || []).map(t => ({ role: t.role === "assistant" ? "model" : "user", parts: [{ text: t.text }] })),
    {
      role: "user",
      parts: [...(req.files || []).map(f => ({ inline_data: { mime_type: f.mimeType, data: f.base64 } })), { text: req.message }],
    },
  ];
  for (const model of models) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents,
          // Pro models think before answering and that thinking counts against the limit, so leave them room
          generationConfig: { temperature: req.json ? 0.2 : 0.6, maxOutputTokens, ...(req.json ? { responseMimeType: "application/json" } : {}) },
        }),
      });
      if (!resp.ok) {
        if (resp.status !== 404) console.warn(`[ai] Gemini ${model} answered ${resp.status}`);
        continue;
      }
      const data = await resp.json();
      const text = (data.candidates?.[0]?.content?.parts || [])
        .filter((p: any) => typeof p?.text === "string" && !p.thought)
        .map((p: any) => p.text)
        .join("")
        .trim();
      if (text) return text;
    } catch (err: any) {
      console.warn(`[ai] Gemini ${model} failed:`, err?.message);
    }
  }
  return null;
}

/** OpenAI-style chat APIs (Groq, OpenRouter, Mistral). */
async function callOpenAiStyle(url: string, apiKey: string, models: string[], req: ChatRequest): Promise<string | null> {
  const messages = [
    { role: "system", content: req.system },
    ...(req.history || []).map(t => ({ role: t.role, content: t.text })),
    { role: "user", content: req.message },
  ];
  for (const model of models) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages, temperature: 0.6, max_tokens: 3500 }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return text;
    } catch {}
  }
  return null;
}

async function callCohere(apiKey: string, req: ChatRequest): Promise<string | null> {
  const resp = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "command-a-03-2025",
      preamble: req.system,
      chat_history: (req.history || []).map(t => ({ role: t.role === "assistant" ? "CHATBOT" : "USER", message: t.text })),
      message: req.message,
      temperature: 0.6,
      max_tokens: 3500,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.text || null;
}

/** The answer to a conversation, or null when no provider allowed for this tier can answer. */
export async function generateChat(req: ChatRequest, tier: AiTier): Promise<string | null> {
  const env = process.env;
  const gemini = () =>
    env.GEMINI_API_KEY ? callGemini(env.GEMINI_API_KEY, req, GEMINI_MODELS[tier](), tier === "top" ? 16384 : 6000) : Promise.resolve(null);

  // The top plan is answered by Gemini Pro and nothing else. Files can only be read by Gemini.
  const chain: Array<() => Promise<string | null>> =
    tier === "top" || (req.files && req.files.length > 0)
      ? [gemini]
      : [
          gemini,
          () =>
            env.GROQ_API_KEY
              ? callOpenAiStyle("https://api.groq.com/openai/v1/chat/completions", env.GROQ_API_KEY, ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"], req)
              : Promise.resolve(null),
          () =>
            env.OPENROUTER_API_KEY
              ? callOpenAiStyle(
                  "https://openrouter.ai/api/v1/chat/completions",
                  env.OPENROUTER_API_KEY,
                  ["meta-llama/llama-3.3-70b-instruct:free", "qwen/qwen-2.5-72b-instruct"],
                  req
                )
              : Promise.resolve(null),
          () =>
            env.MISTRAL_API_KEY
              ? callOpenAiStyle("https://api.mistral.ai/v1/chat/completions", env.MISTRAL_API_KEY, ["mistral-small-latest"], req)
              : Promise.resolve(null),
          () => (env.COHERE_API_KEY ? callCohere(env.COHERE_API_KEY, req) : Promise.resolve(null)),
        ];

  for (const attempt of chain) {
    try {
      const text = await attempt();
      if (text) return text;
    } catch {
      // try the next provider
    }
  }
  return null;
}

/** A single prompt with no conversation around it (DataPal scoring and drafts). */
export async function generateText(prompt: string, paid: boolean | AiTier): Promise<string | null> {
  const tier: AiTier = typeof paid === "string" ? paid : paid ? "paid" : "free";
  return generateChat({ system: "You are a careful assistant. Follow the instructions exactly.", message: prompt }, tier);
}

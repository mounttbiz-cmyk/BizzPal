import { getTeamMembership, getUserActiveSubscription } from "@/lib/db";

/**
 * Sends a prompt to the AI providers in turn until one answers. Used by the AI chat and by DataPal.
 * Gemini answers first (a lighter model for Free plans, a stronger one for paid plans); the others are fallbacks.
 */

interface ProviderAttempt {
  name: string;
  call: (prompt: string) => Promise<string | null>;
}

// Which Gemini models answer, by plan. Each list is tried in order, so a retired model name falls through to the next one.
// Change them without a deploy by setting GEMINI_MODELS_FREE / GEMINI_MODELS_PAID (comma separated) on the server.
const listFromEnv = (value: string | undefined, fallback: string[]) => {
  const items = (value || "").split(",").map(x => x.trim()).filter(Boolean);
  return items.length > 0 ? items : fallback;
};
const GEMINI_MODELS = {
  free: () => listFromEnv(process.env.GEMINI_MODELS_FREE, ["gemini-2.5-flash-lite", "gemini-flash-lite-latest", "gemini-flash-latest"]),
  paid: () => listFromEnv(process.env.GEMINI_MODELS_PAID, ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-flash-latest"]),
};

/** A paid plan is active for this person, or for the business they work in as a teammate. */
export function hasPaidPlan(email: string): boolean {
  const owner = getTeamMembership(email)?.ownerEmail || email;
  const sub: any = getUserActiveSubscription(owner);
  return Boolean(sub && sub.plan_id && sub.plan_id !== "free");
}

async function callGemini(apiKey: string, prompt: string, models: string[]): Promise<string | null> {
  for (const model of models) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 3500 },
          }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch {}
  }
  return null;
}

async function callGroq(apiKey: string, prompt: string): Promise<string | null> {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"];
  for (const model of models) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 3500,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch {}
  }
  return null;
}

async function callOpenRouter(apiKey: string, prompt: string): Promise<string | null> {
  const models = [
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen-2.5-72b-instruct",
    "qwen/qwen3.8-27b:free",
  ];
  for (const model of models) {
    try {
      const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 3500,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch {}
  }
  return null;
}

async function callMistral(apiKey: string, prompt: string): Promise<string | null> {
  const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3500,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || null;
}

async function callCohere(apiKey: string, prompt: string): Promise<string | null> {
  const resp = await fetch("https://api.cohere.com/v1/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "command-a-03-2025",
      message: prompt,
      temperature: 0.7,
      max_tokens: 3500,
    }),
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  return data.text || null;
}

/** Returns the first answer any provider gives, or null when none can answer. */
export async function generateText(prompt: string, paid: boolean): Promise<string | null> {
  const providerChain: ProviderAttempt[] = [
    { name: "Google Gemini", call: p => (process.env.GEMINI_API_KEY ? callGemini(process.env.GEMINI_API_KEY, p, paid ? GEMINI_MODELS.paid() : GEMINI_MODELS.free()) : Promise.resolve(null)) },
    { name: "Groq", call: p => (process.env.GROQ_API_KEY ? callGroq(process.env.GROQ_API_KEY, p) : Promise.resolve(null)) },
    { name: "OpenRouter", call: p => (process.env.OPENROUTER_API_KEY ? callOpenRouter(process.env.OPENROUTER_API_KEY, p) : Promise.resolve(null)) },
    { name: "Mistral", call: p => (process.env.MISTRAL_API_KEY ? callMistral(process.env.MISTRAL_API_KEY, p) : Promise.resolve(null)) },
    { name: "Cohere", call: p => (process.env.COHERE_API_KEY ? callCohere(process.env.COHERE_API_KEY, p) : Promise.resolve(null)) },
  ];
  for (const provider of providerChain) {
    try {
      const text = await provider.call(prompt);
      if (text) return text;
    } catch {
      // try the next provider
    }
  }
  return null;
}

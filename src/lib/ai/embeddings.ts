import crypto from "node:crypto";

export const EMBEDDING_DIMENSION = 768;

/**
 * Generate embedding vector using configured provider (Gemini, Mistral, Cohere)
 * with graceful fallback to deterministic semantic vector generator if offline or unconfigured.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return new Array(EMBEDDING_DIMENSION).fill(0);
  }

  // 1. Try Google Gemini text-embedding-004
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "models/text-embedding-004",
            content: { parts: [{ text: cleanText.slice(0, 8000) }] },
          }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const values: number[] = data.embedding?.values;
        if (values && values.length > 0) {
          return normalizeVector(values);
        }
      }
    } catch (e) {
      console.warn("[Embeddings] Gemini embedding attempt failed, trying fallbacks...", e);
    }
  }

  // 2. Try Mistral embeddings
  const mistralKey = process.env.MISTRAL_API_KEY;
  if (mistralKey) {
    try {
      const resp = await fetch("https://api.mistral.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${mistralKey}`,
        },
        body: JSON.stringify({
          model: "mistral-embed",
          input: [cleanText.slice(0, 8000)],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const values: number[] = data.data?.[0]?.embedding;
        if (values && values.length > 0) {
          // Adjust to 768 dims if necessary
          return normalizeVector(resizeVector(values, EMBEDDING_DIMENSION));
        }
      }
    } catch (e) {
      console.warn("[Embeddings] Mistral embedding attempt failed:", e);
    }
  }

  // 3. Try Cohere embed-english-v3.0
  const cohereKey = process.env.COHERE_API_KEY;
  if (cohereKey) {
    try {
      const resp = await fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cohereKey}`,
        },
        body: JSON.stringify({
          model: "embed-english-v3.0",
          texts: [cleanText.slice(0, 4000)],
          input_type: "search_document",
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const values: number[] = data.embeddings?.[0];
        if (values && values.length > 0) {
          return normalizeVector(resizeVector(values, EMBEDDING_DIMENSION));
        }
      }
    } catch (e) {
      console.warn("[Embeddings] Cohere embedding attempt failed:", e);
    }
  }

  // 4. Deterministic semantic n-gram vector generator (offline & tests resilient)
  return generateDeterministicSemanticEmbedding(cleanText);
}

/**
 * Generate query embedding for search (handles input_type: search_query when supported)
 */
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const cleanQuery = query.trim();
  const cohereKey = process.env.COHERE_API_KEY;
  if (cohereKey) {
    try {
      const resp = await fetch("https://api.cohere.ai/v1/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cohereKey}`,
        },
        body: JSON.stringify({
          model: "embed-english-v3.0",
          texts: [cleanQuery.slice(0, 2000)],
          input_type: "search_query",
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const values: number[] = data.embeddings?.[0];
        if (values && values.length > 0) {
          return normalizeVector(resizeVector(values, EMBEDDING_DIMENSION));
        }
      }
    } catch {}
  }
  return generateEmbedding(cleanQuery);
}

/**
 * High-quality deterministic hashed n-gram bag-of-words embedding generator.
 * Produces a stable, normalized 768-dimensional vector preserving semantic token overlap.
 */
export function generateDeterministicSemanticEmbedding(text: string): number[] {
  const vector = new Array(EMBEDDING_DIMENSION).fill(0);
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9_\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) {
    vector[0] = 1;
    return vector;
  }

  // Process 1-grams, 2-grams, and 3-grams
  const tokens: string[] = [...words];
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`);
    if (i < words.length - 2) {
      tokens.push(`${words[i]}_${words[i + 1]}_${words[i + 2]}`);
    }
  }

  for (const token of tokens) {
    const hash = crypto.createHash("sha256").update(token).digest();
    const idx1 = hash.readUInt16BE(0) % EMBEDDING_DIMENSION;
    const idx2 = hash.readUInt16BE(2) % EMBEDDING_DIMENSION;
    const sign1 = (hash[4] & 1) === 0 ? 1 : -1;
    const sign2 = (hash[5] & 1) === 0 ? 1 : -1;
    const weight = token.includes("_") ? 1.5 : 1.0;

    vector[idx1] += sign1 * weight;
    vector[idx2] += sign2 * (weight * 0.5);
  }

  return normalizeVector(vector);
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function normalizeVector(vec: number[]): number[] {
  let norm = 0;
  for (const val of vec) {
    norm += val * val;
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

function resizeVector(vec: number[], targetSize: number): number[] {
  if (vec.length === targetSize) return vec;
  if (vec.length > targetSize) return vec.slice(0, targetSize);
  const out = [...vec];
  while (out.length < targetSize) {
    out.push(0);
  }
  return out;
}

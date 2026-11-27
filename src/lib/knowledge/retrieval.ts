import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { isPostgresConfigured, queryPostgres } from "@/lib/db/pgClient";
import { generateQueryEmbedding, cosineSimilarity } from "@/lib/ai/embeddings";
import { generateChat } from "@/lib/ai/providers";

export interface SearchResultItem {
  id: string;
  documentId: string;
  documentTitle: string;
  fileName: string;
  pageNumber?: number;
  sectionTitle?: string;
  content: string;
  similarity: number;
}

export interface GroundedAnswerResponse {
  answer: string;
  hasSufficientContext: boolean;
  citations: {
    documentId: string;
    documentTitle: string;
    fileName: string;
    pageNumber?: number;
    sectionTitle?: string;
    snippet: string;
    similarity: number;
  }[];
  verifiedFacts: string[];
  inferredConclusions: string[];
  persistentBusinessFacts: {
    category: string;
    key: string;
    value: string;
    sourceCitation?: string;
  }[];
}

/**
 * Perform semantic search against authorized business document chunks
 */
export async function searchCompanyKnowledge(
  query: string,
  businessId = DEFAULT_BUSINESS_ID,
  options: {
    limit?: number;
    minSimilarity?: number;
    documentId?: string;
  } = {}
): Promise<SearchResultItem[]> {
  const limit = options.limit || 6;
  const minSimilarity = options.minSimilarity ?? 0.05;

  // Fast path: when using SQLite and this business has no document chunks, skip embedding network calls
  if (!isPostgresConfigured()) {
    const hasAny = db.prepare("SELECT 1 FROM document_chunks WHERE business_id = ? LIMIT 1").get(businessId);
    if (!hasAny) return [];
  }

  const queryEmbedding = await generateQueryEmbedding(query);

  // 1. Try pgvector if PostgreSQL is configured
  if (isPostgresConfigured()) {
    try {
      const vectorStr = `[${queryEmbedding.join(",")}]`;
      let sql = `
        SELECT 
          c.id, 
          c.document_id, 
          d.title as document_title, 
          d.file_name,
          c.page_number, 
          c.section_title, 
          c.content,
          (1 - (c.embedding <=> $1::vector)) as similarity
        FROM document_chunks c
        JOIN company_documents d ON c.document_id = d.id
        WHERE c.business_id = $2
      `;
      const params: any[] = [vectorStr, businessId];

      if (options.documentId) {
        sql += ` AND c.document_id = $3`;
        params.push(options.documentId);
      }

      sql += ` ORDER BY similarity DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const rows = await queryPostgres<any>(sql, params);
      if (rows && rows.length > 0) {
        return rows
          .filter((r) => Number(r.similarity) >= minSimilarity)
          .map((r) => ({
            id: r.id,
            documentId: r.document_id,
            documentTitle: r.document_title,
            fileName: r.file_name,
            pageNumber: r.page_number,
            sectionTitle: r.section_title,
            content: r.content,
            similarity: Number(Number(r.similarity).toFixed(4)),
          }));
      }
    } catch (e: any) {
      console.warn("[Retrieval] Postgres pgvector search failed, falling back to SQLite search:", e?.message);
    }
  }

  // 2. Resilient SQLite in-process vector cosine similarity search
  let sql = `
    SELECT 
      c.id, 
      c.document_id, 
      d.title as document_title, 
      d.file_name,
      c.page_number, 
      c.section_title, 
      c.content, 
      c.clean_text,
      c.embedding
    FROM document_chunks c
    JOIN company_documents d ON c.document_id = d.id
    WHERE c.business_id = ?
  `;
  const params: any[] = [businessId];

  if (options.documentId) {
    sql += ` AND c.document_id = ?`;
    params.push(options.documentId);
  }

  const chunks = db.prepare(sql).all(...params) as any[];
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const scored: SearchResultItem[] = [];

  for (const chunk of chunks) {
    let similarity = 0;
    if (chunk.embedding) {
      try {
        const vec = JSON.parse(chunk.embedding);
        similarity = cosineSimilarity(queryEmbedding, vec);
      } catch {}
    }

    // Hybrid keyword boost (BM25-style keyword reinforcement)
    let keywordMatches = 0;
    for (const w of queryWords) {
      if (chunk.clean_text && chunk.clean_text.includes(w)) {
        keywordMatches++;
      }
    }
    const keywordBoost = queryWords.length > 0 ? (keywordMatches / queryWords.length) * 0.15 : 0;
    const finalScore = Math.min(1.0, similarity + keywordBoost);

    if (finalScore >= minSimilarity) {
      scored.push({
        id: chunk.id,
        documentId: chunk.document_id,
        documentTitle: chunk.document_title || "Company Document",
        fileName: chunk.file_name || "document.txt",
        pageNumber: chunk.page_number,
        sectionTitle: chunk.section_title,
        content: chunk.content,
        similarity: Number(finalScore.toFixed(4)),
      });
    }
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, limit);
}

export interface FactFilterOptions {
  category?: string;
  role?: string;
  classification?: string;
  purpose?: string;
  includeExpired?: boolean;
}

function allowedClassificationsForRole(role?: string): string[] {
  const r = String(role || "Owner").toLowerCase();
  if (r === "owner" || r === "admin") return ["public", "internal", "confidential", "restricted"];
  if (r === "manager" || r === "operator") return ["public", "internal", "confidential"];
  return ["public", "internal"];
}

/**
 * Retrieve verified persistent business facts filtered by tenant, role/classification, purpose, and expiry.
 */
export function getPersistentBusinessFacts(businessId = DEFAULT_BUSINESS_ID, categoryOrOptions?: string | FactFilterOptions) {
  const opts: FactFilterOptions =
    typeof categoryOrOptions === "string" ? { category: categoryOrOptions } : categoryOrOptions || {};

  // Ensure provenance columns exist on older databases
  for (const col of [
    "ALTER TABLE business_facts ADD COLUMN owner TEXT",
    "ALTER TABLE business_facts ADD COLUMN verified_at TEXT",
    "ALTER TABLE business_facts ADD COLUMN expires_at TEXT",
    "ALTER TABLE business_facts ADD COLUMN version INTEGER DEFAULT 1",
    "ALTER TABLE business_facts ADD COLUMN classification TEXT DEFAULT 'internal'",
    "ALTER TABLE business_facts ADD COLUMN purpose TEXT DEFAULT 'general'",
  ]) {
    try { db.exec(col); } catch {}
  }

  const now = new Date().toISOString();
  let sql = "SELECT * FROM business_facts WHERE business_id = ? AND is_active = 1";
  const params: any[] = [businessId];

  if (!opts.includeExpired) {
    sql += " AND (expires_at IS NULL OR expires_at > ?) AND (valid_to IS NULL OR valid_to > ?)";
    params.push(now, now);
  }
  if (opts.category) {
    sql += " AND category = ?";
    params.push(opts.category);
  }
  if (opts.purpose) {
    sql += " AND (purpose IS NULL OR purpose = 'general' OR purpose = ?)";
    params.push(opts.purpose);
  }
  if (opts.classification) {
    sql += " AND classification = ?";
    params.push(opts.classification);
  }

  sql += " ORDER BY category ASC, fact_key ASC";
  const rows = db.prepare(sql).all(...params) as any[];
  const allowedClasses = new Set(allowedClassificationsForRole(opts.role));

  return rows
    .filter(r => allowedClasses.has(String(r.classification || "internal").toLowerCase()))
    .map((r) => ({
      id: r.id,
      businessId: r.business_id,
      category: r.category,
      key: r.fact_key,
      value: r.fact_value,
      confidence: r.confidence,
      sourceDocumentId: r.source_document_id,
      source: r.source_citation,
      sourceCitation: r.source_citation,
      verifiedBy: r.verified_by,
      owner: r.owner || r.verified_by || "Owner",
      verifiedAt: r.verified_at || r.valid_from || r.created_at,
      expiresAt: r.expires_at || null,
      expired: Boolean(r.expires_at && r.expires_at <= now),
      version: Number(r.version || 1),
      classification: r.classification || "internal",
      purpose: r.purpose || "general",
      createdAt: r.created_at,
    }));
}

/**
 * Query company memory and generate a grounded, source-cited AI answer
 */
export async function queryCompanyMemory(
  question: string,
  businessId = DEFAULT_BUSINESS_ID
): Promise<GroundedAnswerResponse> {
  // 1. Retrieve top matching chunks
  const searchResults = await searchCompanyKnowledge(question, businessId, { limit: 6, minSimilarity: 0.05 });

  // 2. Retrieve persistent facts
  const facts = getPersistentBusinessFacts(businessId);

  // If no chunks and no facts, return clear insufficient data statement
  if (searchResults.length === 0 && facts.length === 0) {
    return {
      answer: `I could not locate any documents or verified business memory in BizzPal relevant to "${question}". You can upload your company documents (such as financial statements, marketing reports, or operating playbooks) into the Knowledge Hub to make them searchable.`,
      hasSufficientContext: false,
      citations: [],
      verifiedFacts: [],
      inferredConclusions: [],
      persistentBusinessFacts: [],
    };
  }

  // Build context payload
  const evidenceText = searchResults
    .map(
      (r, i) =>
        `[Evidence #${i + 1}] Source: "${r.documentTitle}" (${r.fileName}), Section: "${r.sectionTitle || "General"}", Page: ${r.pageNumber || 1}\n${r.content}`
    )
    .join("\n\n---\n\n");

  const factsText = facts
    .map((f) => `- [${f.category.toUpperCase()}] ${f.key}: ${f.value} (Source: ${f.sourceCitation || "Verified"})`)
    .join("\n");

  const prompt = `You are BizzPal's Business Context Engine, an executive AI company memory.
A user asked: "${question}"

Below is the verified company memory and retrieved document evidence:
=== VERIFIED BUSINESS FACTS ===
${factsText || "None recorded."}

=== RETRIEVED DOCUMENT EVIDENCE ===
${evidenceText || "No document chunks retrieved."}

TASK:
1. Provide a direct, professional, executive-grade answer to the question using ONLY the evidence and facts provided above.
2. Ground all claims with explicit citations referencing the document title, section, or fact.
3. Explicitly distinguish between:
   - "VERIFIED FACTS": Claims directly stated in the evidence.
   - "INFERRED CONCLUSIONS": Deductions or business extrapolations based on the data.
4. If the retrieved evidence does not contain the answer or is incomplete, clearly state what information is missing. DO NOT make up dates, numbers, or facts.`;

  // Call AI models using the unified provider router (Gemini / FreeLLMAPI / Groq / OpenRouter / Mistral / Cohere)
  let aiAnswer = await generateChat(
    {
      system: "You are BizzPal's Business Context Engine. Answer strictly from supplied evidence and cite sources.",
      message: prompt,
      temperature: 0.2,
      meter: { businessId, feature: "knowledge_query" },
    },
    "paid"
  ).catch(() => null);

  // Deterministic synthesis fallback if AI APIs unavailable
  if (!aiAnswer) {
    const topDoc = searchResults[0];
    aiAnswer = `Based on company document **"${topDoc?.documentTitle || "Stored Knowledge"}"** (Page ${topDoc?.pageNumber || 1}):\n\n${topDoc?.content.slice(0, 450)}...\n\n*(Citations: [Doc: ${topDoc?.documentTitle || "Knowledge"}, Page ${topDoc?.pageNumber || 1}])*`;
  }

  const citations = searchResults.map((r) => ({
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    fileName: r.fileName,
    pageNumber: r.pageNumber,
    sectionTitle: r.sectionTitle,
    snippet: r.content.slice(0, 180) + (r.content.length > 180 ? "..." : ""),
    similarity: r.similarity,
  }));

  // Parse verified facts vs inferences
  const verifiedFacts: string[] = [];
  const inferredConclusions: string[] = [];

  const verifiedMatch = aiAnswer.match(/VERIFIED FACTS:?([\s\S]*?)(?=INFERRED CONCLUSIONS:?|$)/i);
  if (verifiedMatch && verifiedMatch[1]) {
    const bullets = verifiedMatch[1].split(/\n/).filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"));
    verifiedFacts.push(...bullets.map((b) => b.replace(/^[-*]\s*/, "").trim()));
  }

  const inferredMatch = aiAnswer.match(/INFERRED CONCLUSIONS:?([\s\S]*?)(?=$)/i);
  if (inferredMatch && inferredMatch[1]) {
    const bullets = inferredMatch[1].split(/\n/).filter((l) => l.trim().startsWith("-") || l.trim().startsWith("*"));
    inferredConclusions.push(...bullets.map((b) => b.replace(/^[-*]\s*/, "").trim()));
  }

  return {
    answer: aiAnswer,
    hasSufficientContext: searchResults.length > 0 || facts.length > 0,
    citations,
    verifiedFacts: verifiedFacts.length > 0 ? verifiedFacts : [citations[0]?.snippet || "Fact retrieved from source."],
    inferredConclusions,
    persistentBusinessFacts: facts.map((f) => ({
      category: f.category,
      key: f.key,
      value: f.value,
      sourceCitation: f.sourceCitation,
    })),
  };
}

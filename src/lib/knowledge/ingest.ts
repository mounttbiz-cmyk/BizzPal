import crypto from "node:crypto";
import { inflateSync } from "node:zlib";
import { db, DEFAULT_BUSINESS_ID } from "@/lib/db";
import { isPostgresConfigured, queryPostgres, initializePostgresSchema } from "@/lib/db/pgClient";
import { generateEmbedding } from "@/lib/ai/embeddings";

export interface DocumentUploadOptions {
  businessId?: string;
  userId?: string;
  fileName: string;
  fileType?: string;
  mimeType?: string;
  content: string | Buffer;
  metadata?: Record<string, any>;
  title?: string;
}

export interface IngestedDocumentResult {
  documentId: string;
  businessId: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: "indexed" | "failed" | "duplicate";
  chunkCount: number;
  contentHash: string;
  errorMessage?: string;
}

/**
 * Clean and normalize text extracted from documents
 */
export function normalizeDocumentText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodePdfLiteralString(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch !== "\\") {
      out += ch;
      continue;
    }
    const next = raw[++i];
    if (next === undefined) break;
    if (next === "n") out += "\n";
    else if (next === "r") out += "\r";
    else if (next === "t") out += "\t";
    else if (next === "b") out += "\b";
    else if (next === "f") out += "\f";
    else if (next === "(" || next === ")" || next === "\\") out += next;
    else if (next >= "0" && next <= "7") {
      let oct = next;
      for (let k = 0; k < 2 && i + 1 < raw.length; k++) {
        const d = raw[i + 1];
        if (d >= "0" && d <= "7") {
          oct += d;
          i++;
        } else break;
      }
      out += String.fromCharCode(parseInt(oct, 8));
    } else if (next === "\r" || next === "\n") {
      if (next === "\r" && raw[i + 1] === "\n") i++;
    } else {
      out += next;
    }
  }
  return out;
}

function decodePdfHexString(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  if (!clean) return "";
  const padded = clean.length % 2 === 1 ? clean + "0" : clean;
  const bytes = Buffer.from(padded, "hex");
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let out = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return out;
  }
  return bytes.toString("latin1");
}

function extractTextOperatorsFromStream(decoded: string): string[] {
  const parts: string[] = [];
  const btRegex = /\bBT\b([\s\S]*?)\bET\b/g;
  let btMatch: RegExpExecArray | null;

  const parseSegment = (seg: string) => {
    // Match TJ arrays [...] TJ and single Tj / ' / " text calls
    const tokenRegex = /(\[(?:[^\]\\]|\\.|"(?:[^"\\]|\\.)*"|\((?:[^()\\]|\\.|(?:\([^()]*\)))*\)|<[0-9a-fA-F\s]*>)*\]\s*TJ)|(\((?:[^()\\]|\\.)*\)\s*(?:Tj|'|"))|(<[0-9a-fA-F\s]+>\s*(?:Tj|'|"))/g;
    let tok: RegExpExecArray | null;
    while ((tok = tokenRegex.exec(seg)) !== null) {
      const full = tok[0];
      if (tok[1]) {
        let line = "";
        const innerRegex = /(\((?:[^()\\]|\\.)*\))|(<[0-9a-fA-F\s]+>)/g;
        let inner: RegExpExecArray | null;
        while ((inner = innerRegex.exec(full)) !== null) {
          if (inner[1]) {
            line += decodePdfLiteralString(inner[1].slice(1, -1));
          } else if (inner[2]) {
            line += decodePdfHexString(inner[2].slice(1, -1));
          }
        }
        if (line.trim()) parts.push(line);
      } else if (tok[2]) {
        const parenEnd = full.lastIndexOf(")");
        const str = decodePdfLiteralString(full.slice(1, parenEnd));
        if (str.trim()) parts.push(str);
      } else if (tok[3]) {
        const angleEnd = full.lastIndexOf(">");
        const str = decodePdfHexString(full.slice(1, angleEnd));
        if (str.trim()) parts.push(str);
      }
    }
  };

  while ((btMatch = btRegex.exec(decoded)) !== null) {
    parseSegment(btMatch[1]);
  }

  // Fallback for uncompressed/non-standard text streams that omit BT/ET wrappers
  if (parts.length === 0 && /\b(Tj|TJ)\b/.test(decoded)) {
    parseSegment(decoded);
  }

  return parts;
}

export function extractPdfText(buffer: Buffer): string {
  const latin = buffer.toString("latin1");
  const collected: string[] = [];
  const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]*endstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(latin)) !== null) {
    const rawBody = Buffer.from(match[1], "latin1");
    let decodedText = "";
    try {
      decodedText = inflateSync(rawBody).toString("latin1");
    } catch {
      // Not Flate-compressed (or partial zlib wrapper): inspect raw stream text
      decodedText = match[1];
    }

    if (!decodedText) continue;
    const ops = extractTextOperatorsFromStream(decodedText);
    if (ops.length > 0) {
      collected.push(ops.join(" ").replace(/\s+/g, " ").trim());
    }
  }

  // Also check top-level BT/ET outside stream blocks (rare uncompressed PDFs)
  if (collected.length === 0) {
    const directOps = extractTextOperatorsFromStream(latin);
    if (directOps.length > 0) {
      collected.push(directOps.join(" ").replace(/\s+/g, " ").trim());
    }
  }

  const cleaned = normalizeDocumentText(
    collected
      .join("\n\n")
      .replace(/[^\x20-\x7E\n\r\t\u00A0-\u024F\u2000-\u206F]/g, " ")
  );

  const meaningfulChars = (cleaned.match(/[A-Za-z0-9]/g) || []).length;
  if (meaningfulChars < 12) {
    throw new Error(
      "Could not extract selectable text from this PDF (it may be scanned, image-only, or encrypted). Export it as text/Markdown or copy-paste its contents."
    );
  }

  return cleaned;
}

/**
 * Extract clean text and structure from raw input according to file type
 */
export function extractTextFromContent(content: string | Buffer, fileName: string): { text: string; fileType: string } {
  const ext = fileName.split(".").pop()?.toLowerCase() || "txt";
  const rawString = Buffer.isBuffer(content) ? content.toString("utf-8") : content;

  if (ext === "json") {
    try {
      const parsed = JSON.parse(rawString);
      return {
        text: JSON.stringify(parsed, null, 2),
        fileType: "json",
      };
    } catch {
      return { text: rawString, fileType: "json" };
    }
  }

  if (ext === "csv") {
    // Parse CSV lines into human-readable business records
    const lines = rawString.split(/\r?\n/).filter(Boolean);
    if (lines.length > 0) {
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const records = lines.slice(1, 250).map((line, idx) => {
        const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const recordStr = headers.map((h, i) => `${h}: ${cols[i] || ""}`).join(" | ");
        return `[Row ${idx + 1}] ${recordStr}`;
      });
      return {
        text: records.join("\n"),
        fileType: "csv",
      };
    }
  }

  if (ext === "html" || ext === "htm") {
    const textWithoutTags = rawString
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');
    return { text: normalizeDocumentText(textWithoutTags), fileType: "html" };
  }

  // PDF text extraction (never index raw binary PDF bytes)
  if (ext === "pdf") {
    const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf-8");
    const extracted = extractPdfText(buf);
    if (!extracted || extracted.length < 20) {
      throw new Error("Could not extract readable text from this PDF (it may be scanned images). Upload a text-based PDF, TXT, CSV, or DOCX.");
    }
    return { text: extracted, fileType: "pdf" };
  }

  return {
    text: normalizeDocumentText(rawString),
    fileType: ext,
  };
}

export interface DocumentChunk {
  index: number;
  content: string;
  cleanText: string;
  charCount: number;
  tokenEstimate: number;
  sectionTitle?: string;
  pageNumber?: number;
}

/**
 * Intelligent text chunker preserving paragraph boundaries, titles, and section structure
 */
export function chunkDocument(
  text: string,
  targetChunkChars = 1200,
  overlapChars = 150
): DocumentChunk[] {
  if (!text || text.length === 0) return [];

  const paragraphs = text.split(/\n\n+/);
  const chunks: DocumentChunk[] = [];
  let currentChunk = "";
  let currentSection = "General Context";
  let chunkIdx = 0;

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // Detect section headers (e.g. # Title, Section 1, 1.0 Executive Summary)
    if (/^(#|\d+\.|\b(section|chapter|appendix|memo|policy|financials)\b)/i.test(trimmed) && trimmed.length < 120) {
      currentSection = trimmed.replace(/^#+\s*/, "");
    }

    if (currentChunk.length + trimmed.length > targetChunkChars && currentChunk.length > 0) {
      const clean = currentChunk.trim();
      chunks.push({
        index: chunkIdx++,
        content: clean,
        cleanText: clean.toLowerCase(),
        charCount: clean.length,
        tokenEstimate: Math.ceil(clean.length / 4),
        sectionTitle: currentSection,
        pageNumber: Math.floor(chunkIdx / 3) + 1,
      });

      // Keep overlap from end of current chunk
      currentChunk = currentChunk.slice(-overlapChars) + "\n\n" + trimmed;
    } else {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
    }
  }

  if (currentChunk.trim().length > 0) {
    const clean = currentChunk.trim();
    chunks.push({
      index: chunkIdx,
      content: clean,
      cleanText: clean.toLowerCase(),
      charCount: clean.length,
      tokenEstimate: Math.ceil(clean.length / 4),
      sectionTitle: currentSection,
      pageNumber: Math.floor(chunkIdx / 3) + 1,
    });
  }

  return chunks;
}

/**
 * Process and Ingest a company document end-to-end
 */
export async function ingestCompanyDocument(options: DocumentUploadOptions): Promise<IngestedDocumentResult> {
  const businessId = options.businessId || DEFAULT_BUSINESS_ID;
  const fileName = options.fileName;
  const { text, fileType } = extractTextFromContent(options.content, fileName);

  const fileSize = Buffer.isBuffer(options.content)
    ? options.content.length
    : Buffer.byteLength(options.content, "utf-8");

  // Calculate SHA-256 content hash for deduplication
  const contentHash = crypto.createHash("sha256").update(text).digest("hex");
  const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const title = options.title || fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

  // Check duplicate in SQLite or Postgres
  const existing = db
    .prepare("SELECT id, status, chunk_count FROM company_documents WHERE business_id = ? AND content_hash = ?")
    .get(businessId, contentHash) as any;

  if (existing && existing.status === "indexed") {
    return {
      documentId: existing.id,
      businessId,
      title,
      fileName,
      fileType,
      fileSize,
      status: "duplicate",
      chunkCount: existing.chunk_count,
      contentHash,
    };
  }

  const now = new Date().toISOString();

  // Create document record with pending status
  db.prepare(`
    INSERT INTO company_documents (id, business_id, title, file_name, file_type, file_size, content_hash, mime_type, storage_url, status, chunk_count, metadata, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'processing', 0, ?, ?, ?, ?)
  `).run(
    documentId,
    businessId,
    title,
    fileName,
    fileType,
    fileSize,
    contentHash,
    options.mimeType || "text/plain",
    null,
    JSON.stringify(options.metadata || {}),
    options.userId || "system_admin",
    now,
    now
  );

  // Record processing job
  const jobId = `job_${Date.now()}`;
  db.prepare(`
    INSERT INTO document_processing_jobs (id, document_id, business_id, job_type, status, attempts, started_at, created_at)
    VALUES (?, ?, ?, 'ingest', 'running', 1, ?, ?)
  `).run(jobId, documentId, businessId, now, now);

  try {
    // 1. Chunk document
    const chunks = chunkDocument(text);
    if (chunks.length === 0) {
      throw new Error("No readable text found in document.");
    }

    // 2. Generate embeddings for each chunk and persist
    for (const chunk of chunks) {
      const chunkId = `chk_${documentId}_${chunk.index}`;
      const embedding = await generateEmbedding(chunk.content);
      const embeddingJson = JSON.stringify(embedding);

      // Persist in SQLite
      db.prepare(`
        INSERT INTO document_chunks (id, document_id, business_id, chunk_index, content, clean_text, char_count, token_estimate, page_number, section_title, embedding, metadata, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        chunkId,
        documentId,
        businessId,
        chunk.index,
        chunk.content,
        chunk.cleanText,
        chunk.charCount,
        chunk.tokenEstimate,
        chunk.pageNumber || 1,
        chunk.sectionTitle || "General",
        embeddingJson,
        JSON.stringify({ fileName, title }),
        now
      );
    }

    // 3. If PostgreSQL is configured, synchronize document and chunks with pgvector
    if (isPostgresConfigured()) {
      try {
        await initializePostgresSchema();
        await queryPostgres(
          `INSERT INTO company_documents (id, business_id, title, file_name, file_type, file_size, content_hash, mime_type, status, chunk_count, metadata, created_by, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'indexed', $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET status = 'indexed', chunk_count = $9, updated_at = $13`,
          [
            documentId,
            businessId,
            title,
            fileName,
            fileType,
            fileSize,
            contentHash,
            options.mimeType || "text/plain",
            chunks.length,
            JSON.stringify(options.metadata || {}),
            options.userId || "system_admin",
            now,
            now,
          ]
        );

        for (const chunk of chunks) {
          const chunkId = `chk_${documentId}_${chunk.index}`;
          const embedding = await generateEmbedding(chunk.content);
          const vectorStr = `[${embedding.join(",")}]`;

          await queryPostgres(
            `INSERT INTO document_chunks (id, document_id, business_id, chunk_index, content, clean_text, char_count, token_estimate, page_number, section_title, embedding, metadata, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             ON CONFLICT (id) DO UPDATE SET content = $5, embedding = $11`,
            [
              chunkId,
              documentId,
              businessId,
              chunk.index,
              chunk.content,
              chunk.cleanText,
              chunk.charCount,
              chunk.tokenEstimate,
              chunk.pageNumber || 1,
              chunk.sectionTitle || "General",
              vectorStr,
              JSON.stringify({ fileName, title }),
              now,
            ]
          );
        }
      } catch (pgErr: any) {
        console.warn("[Ingest] Postgres sync warning:", pgErr?.message);
      }
    }

    // Mark complete in SQLite
    db.prepare(`
      UPDATE company_documents
      SET status = 'indexed', chunk_count = ?, updated_at = ?
      WHERE id = ?
    `).run(chunks.length, now, documentId);

    db.prepare(`
      UPDATE document_processing_jobs
      SET status = 'completed', completed_at = ?
      WHERE id = ?
    `).run(now, jobId);

    return {
      documentId,
      businessId,
      title,
      fileName,
      fileType,
      fileSize,
      status: "indexed",
      chunkCount: chunks.length,
      contentHash,
    };
  } catch (err: any) {
    const errorMsg = err.message || String(err);
    db.prepare(`
      UPDATE company_documents
      SET status = 'failed', error_message = ?, updated_at = ?
      WHERE id = ?
    `).run(errorMsg, now, documentId);

    db.prepare(`
      UPDATE document_processing_jobs
      SET status = 'failed', error_log = ?, completed_at = ?
      WHERE id = ?
    `).run(errorMsg, now, jobId);

    return {
      documentId,
      businessId,
      title,
      fileName,
      fileType,
      fileSize,
      status: "failed",
      chunkCount: 0,
      contentHash,
      errorMessage: errorMsg,
    };
  }
}

/**
 * Delete a company document and its chunks with company boundary verification
 */
export async function deleteCompanyDocument(documentId: string, businessId = DEFAULT_BUSINESS_ID): Promise<boolean> {
  // SQLite deletion
  db.prepare("DELETE FROM document_chunks WHERE document_id = ? AND business_id = ?").run(documentId, businessId);
  db.prepare("DELETE FROM document_processing_jobs WHERE document_id = ? AND business_id = ?").run(documentId, businessId);
  db.prepare("DELETE FROM company_documents WHERE id = ? AND business_id = ?").run(documentId, businessId);

  // Postgres deletion if configured
  if (isPostgresConfigured()) {
    try {
      await queryPostgres("DELETE FROM document_chunks WHERE document_id = $1 AND business_id = $2", [documentId, businessId]);
      await queryPostgres("DELETE FROM company_documents WHERE id = $1 AND business_id = $2", [documentId, businessId]);
    } catch (e) {
      console.warn("[Ingest] Postgres delete warning:", e);
    }
  }

  return true;
}

/**
 * List documents for a business
 */
export function getCompanyDocuments(businessId = DEFAULT_BUSINESS_ID) {
  const docs = db
    .prepare("SELECT * FROM company_documents WHERE business_id = ? ORDER BY created_at DESC")
    .all(businessId) as any[];

  return docs.map((d) => ({
    id: d.id,
    businessId: d.business_id,
    title: d.title,
    fileName: d.file_name,
    fileType: d.file_type,
    fileSize: d.file_size,
    status: d.status,
    chunkCount: d.chunk_count,
    errorMessage: d.error_message,
    metadata: JSON.parse(d.metadata || "{}"),
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  }));
}

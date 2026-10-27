import { Pool, PoolConfig } from "pg";

let pool: Pool | null = null;
let pgInitialized = false;

export function getPostgresConnectionString(): string | null {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    null
  );
}

export function isPostgresConfigured(): boolean {
  return Boolean(getPostgresConnectionString());
}

export function getPgPool(): Pool | null {
  const connectionString = getPostgresConnectionString();
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    const config: PoolConfig = {
      connectionString,
      ssl: connectionString.includes("localhost") || connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
    pool = new Pool(config);
    pool.on("error", (err) => {
      console.error("[PostgreSQL Pool Error]", err);
    });
  }
  return pool;
}

export async function queryPostgres<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const p = getPgPool();
  if (!p) {
    throw new Error("PostgreSQL is not configured. Set DATABASE_URL or POSTGRES_URL in environment.");
  }
  const client = await p.connect();
  try {
    const res = await client.query(sql, params);
    return res.rows as T[];
  } finally {
    client.release();
  }
}

export async function testPostgresConnection(): Promise<{ connected: boolean; hasPgVector: boolean; error?: string }> {
  try {
    const p = getPgPool();
    if (!p) return { connected: false, hasPgVector: false, error: "DATABASE_URL not set" };
    const res = await queryPostgres<{ version: string }>("SELECT version()");
    if (!res || res.length === 0) return { connected: false, hasPgVector: false, error: "Empty query response" };

    let hasVector = false;
    try {
      const extRes = await queryPostgres<{ extname: string }>(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'"
      );
      hasVector = extRes.length > 0;
    } catch {
      hasVector = false;
    }

    return { connected: true, hasPgVector: hasVector };
  } catch (err: any) {
    return { connected: false, hasPgVector: false, error: err.message || String(err) };
  }
}

/**
 * Initialize PostgreSQL schema if connected
 */
export async function initializePostgresSchema(): Promise<void> {
  if (pgInitialized || !isPostgresConfigured()) return;

  try {
    const p = getPgPool();
    if (!p) return;

    // Try enabling vector extension
    try {
      await queryPostgres('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
      await queryPostgres('CREATE EXTENSION IF NOT EXISTS vector;');
    } catch (e: any) {
      console.warn("[PostgreSQL] pgvector extension note:", e?.message);
    }

    // Run core schema statements safely
    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS company_documents (
        id VARCHAR(64) PRIMARY KEY,
        business_id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(64) NOT NULL,
        file_size INTEGER DEFAULT 0,
        content_hash VARCHAR(64) NOT NULL,
        mime_type VARCHAR(128),
        storage_url TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        error_message TEXT,
        chunk_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_by VARCHAR(128),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await queryPostgres(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id VARCHAR(64) PRIMARY KEY,
          document_id VARCHAR(64) NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
          business_id VARCHAR(64) NOT NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          clean_text TEXT NOT NULL,
          char_count INTEGER NOT NULL,
          token_estimate INTEGER NOT NULL,
          page_number INTEGER,
          section_title VARCHAR(255),
          embedding vector(768),
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } catch {
      // If pgvector is not installed on Postgres server, fall back to TEXT for embedding
      await queryPostgres(`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id VARCHAR(64) PRIMARY KEY,
          document_id VARCHAR(64) NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
          business_id VARCHAR(64) NOT NULL,
          chunk_index INTEGER NOT NULL,
          content TEXT NOT NULL,
          clean_text TEXT NOT NULL,
          char_count INTEGER NOT NULL,
          token_estimate INTEGER NOT NULL,
          page_number INTEGER,
          section_title VARCHAR(255),
          embedding TEXT,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    await queryPostgres(`
      CREATE TABLE IF NOT EXISTS business_facts (
        id VARCHAR(64) PRIMARY KEY,
        business_id VARCHAR(64) NOT NULL,
        category VARCHAR(64) NOT NULL,
        fact_key VARCHAR(128) NOT NULL,
        fact_value TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        source_document_id VARCHAR(64),
        source_citation TEXT,
        verified_by VARCHAR(128) DEFAULT 'system',
        is_active BOOLEAN DEFAULT TRUE,
        valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        valid_to TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS document_processing_jobs (
        id VARCHAR(64) PRIMARY KEY,
        document_id VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL,
        job_type VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'queued',
        attempts INTEGER DEFAULT 0,
        error_log TEXT,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS kpi_definitions (
        id VARCHAR(64) PRIMARY KEY,
        business_id VARCHAR(64) NOT NULL,
        metric_key VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_value NUMERIC(15, 2),
        warning_threshold NUMERIC(15, 2),
        critical_threshold NUMERIC(15, 2),
        comparison_type VARCHAR(64) NOT NULL DEFAULT 'period_over_period',
        alert_severity VARCHAR(32) NOT NULL DEFAULT 'warning',
        frequency VARCHAR(32) NOT NULL DEFAULT 'daily',
        enabled BOOLEAN DEFAULT TRUE,
        last_evaluated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS business_insights (
        id VARCHAR(64) PRIMARY KEY,
        business_id VARCHAR(64) NOT NULL,
        kpi_id VARCHAR(64),
        title VARCHAR(255) NOT NULL,
        severity VARCHAR(32) NOT NULL DEFAULT 'warning',
        status VARCHAR(32) NOT NULL DEFAULT 'detected',
        observed_value NUMERIC(15, 2),
        previous_value NUMERIC(15, 2),
        change_pct REAL,
        evidence_summary JSONB DEFAULT '{}'::jsonb,
        root_cause_analysis TEXT,
        recommended_actions JSONB DEFAULT '[]'::jsonb,
        audit_trail JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS insight_actions_audit (
        id VARCHAR(64) PRIMARY KEY,
        insight_id VARCHAR(64) NOT NULL,
        business_id VARCHAR(64) NOT NULL,
        action_key VARCHAR(128) NOT NULL,
        action_title TEXT NOT NULL,
        action_status VARCHAR(32) NOT NULL,
        approved_by VARCHAR(128),
        created_task_id VARCHAR(64),
        details JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    pgInitialized = true;
    console.log("[PostgreSQL] Schema successfully initialized.");
  } catch (err: any) {
    console.warn("[PostgreSQL] Schema initialization warning:", err?.message);
  }
}

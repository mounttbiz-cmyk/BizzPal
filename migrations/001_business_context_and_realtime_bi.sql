-- Migration: 001_business_context_and_realtime_bi.sql
-- Description: Core schema for BizzPal Business Context Engine (pgvector) and Real-Time Business Intelligence
-- Reversible: Yes (see down migration comments at bottom)

-- 1. Enable pgvector extension for semantic similarity search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Companies & Organizations (Boundary of data isolation)
CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(128),
    industry_label VARCHAR(128),
    custom_industry VARCHAR(128),
    founder_name VARCHAR(255),
    website VARCHAR(255),
    team_size INTEGER DEFAULT 1,
    annual_revenue NUMERIC(15, 2) DEFAULT 0,
    monthly_revenue NUMERIC(15, 2) DEFAULT 0,
    monthly_burn NUMERIC(15, 2) DEFAULT 0,
    cash_on_hand NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for company lookups
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);

-- 3. Company Documents (Knowledge Sources)
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
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending' | 'processing' | 'indexed' | 'failed'
    error_message TEXT,
    chunk_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_company_docs_business ON company_documents(business_id);
CREATE INDEX IF NOT EXISTS idx_company_docs_status ON company_documents(status);
CREATE INDEX IF NOT EXISTS idx_company_docs_hash ON company_documents(business_id, content_hash);

-- 4. Document Chunks & Text Embeddings (pgvector: 768 dimensions for Gemini/Cohere or 1536 for OpenAI)
-- We use 768 dimensions matching Google text-embedding-004.
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

CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_business_id ON document_chunks(business_id);

-- HNSW Vector Index for fast cosine similarity search (<=> operator)
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search index for hybrid search
CREATE INDEX IF NOT EXISTS idx_chunks_fts 
ON document_chunks 
USING gin (to_tsvector('english', clean_text));

-- 5. Persistent Business Facts (Verified Company Memory)
CREATE TABLE IF NOT EXISTS business_facts (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'strategy' | 'finance' | 'operations' | 'marketing' | 'legal'
    fact_key VARCHAR(128) NOT NULL,
    fact_value TEXT NOT NULL,
    confidence REAL DEFAULT 1.0,
    source_document_id VARCHAR(64) REFERENCES company_documents(id) ON DELETE SET NULL,
    source_citation TEXT,
    verified_by VARCHAR(128) DEFAULT 'system',
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valid_to TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facts_business ON business_facts(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_facts_category ON business_facts(business_id, category);

-- 6. Document Processing Jobs (Background Job & Error Tracking)
CREATE TABLE IF NOT EXISTS document_processing_jobs (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES company_documents(id) ON DELETE CASCADE,
    business_id VARCHAR(64) NOT NULL,
    job_type VARCHAR(64) NOT NULL, -- 'ingest' | 'reindex' | 'summarize'
    status VARCHAR(32) NOT NULL DEFAULT 'queued', -- 'queued' | 'running' | 'completed' | 'failed'
    attempts INTEGER DEFAULT 0,
    error_log TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON document_processing_jobs(status, business_id);

-- 7. Configurable KPI Definitions
CREATE TABLE IF NOT EXISTS kpi_definitions (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL,
    metric_key VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    target_value NUMERIC(15, 2),
    warning_threshold NUMERIC(15, 2),
    critical_threshold NUMERIC(15, 2),
    comparison_type VARCHAR(64) NOT NULL DEFAULT 'period_over_period', -- 'pct_change' | 'threshold' | 'period_over_period' | 'moving_avg'
    alert_severity VARCHAR(32) NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
    frequency VARCHAR(32) NOT NULL DEFAULT 'daily', -- 'hourly' | 'daily' | 'weekly'
    enabled BOOLEAN DEFAULT TRUE,
    last_evaluated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kpi_business ON kpi_definitions(business_id, enabled);

-- 8. Business Insights (Proactive Business Awareness & Evidence-Based Findings)
CREATE TABLE IF NOT EXISTS business_insights (
    id VARCHAR(64) PRIMARY KEY,
    business_id VARCHAR(64) NOT NULL,
    kpi_id VARCHAR(64) REFERENCES kpi_definitions(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(32) NOT NULL DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
    status VARCHAR(32) NOT NULL DEFAULT 'detected', -- 'detected' | 'investigating' | 'action_recommended' | 'awaiting_approval' | 'action_in_progress' | 'resolved' | 'dismissed'
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

CREATE INDEX IF NOT EXISTS idx_insights_biz_status ON business_insights(business_id, status);
CREATE INDEX IF NOT EXISTS idx_insights_severity ON business_insights(business_id, severity);

-- 9. Insight Actions & Approvals Audit Log
CREATE TABLE IF NOT EXISTS insight_actions_audit (
    id VARCHAR(64) PRIMARY KEY,
    insight_id VARCHAR(64) NOT NULL REFERENCES business_insights(id) ON DELETE CASCADE,
    business_id VARCHAR(64) NOT NULL,
    action_key VARCHAR(128) NOT NULL,
    action_title TEXT NOT NULL,
    action_status VARCHAR(32) NOT NULL, -- 'recommended' | 'approved' | 'rejected' | 'task_created' | 'completed'
    approved_by VARCHAR(128),
    created_task_id VARCHAR(64),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_action_audit_insight ON insight_actions_audit(insight_id);

-- Down Migration Instructions:
-- DROP TABLE IF EXISTS insight_actions_audit;
-- DROP TABLE IF EXISTS business_insights;
-- DROP TABLE IF EXISTS kpi_definitions;
-- DROP TABLE IF EXISTS document_processing_jobs;
-- DROP TABLE IF EXISTS business_facts;
-- DROP TABLE IF EXISTS document_chunks;
-- DROP TABLE IF EXISTS company_documents;
-- DROP TABLE IF EXISTS companies;
-- DROP EXTENSION IF EXISTS vector;

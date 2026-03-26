-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- KB article embeddings for RAG search
CREATE TABLE IF NOT EXISTS kb_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kb_embeddings_tenant ON kb_embeddings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_article ON kb_embeddings(article_id);

-- Add confidence_score to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- Success
DO $$ BEGIN RAISE NOTICE 'pgvector migration complete'; END $$;

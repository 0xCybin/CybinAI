-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- KB article embeddings for RAG search
CREATE TABLE IF NOT EXISTS kb_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER update_kb_embeddings_updated_at BEFORE UPDATE ON kb_embeddings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_kb_embeddings_tenant ON kb_embeddings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_article ON kb_embeddings(article_id);

-- Add confidence_score to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS confidence_score FLOAT;

-- ANN index for fast similarity search (required for production RAG queries)
CREATE INDEX IF NOT EXISTS idx_kb_embeddings_embedding ON kb_embeddings USING hnsw (embedding vector_cosine_ops);

-- Success
DO $$ BEGIN RAISE NOTICE 'pgvector migration complete'; END $$;

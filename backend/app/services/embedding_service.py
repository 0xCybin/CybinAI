"""
Embedding Service for RAG-based Knowledge Base Search.

Generates embeddings for KB articles using OpenAI's text-embedding-3-small
and performs vector similarity search via pgvector.
"""

import logging
from typing import Optional
from uuid import UUID

from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


class EmbeddingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def chunk_text(self, content: str, max_chunk_size: int = 500) -> list[str]:
        """Split text into chunks at sentence boundaries."""
        if not content or not content.strip():
            return []

        content = content.strip()
        if len(content) <= max_chunk_size:
            return [content]

        chunks = []
        sentences = content.replace("\n", ". ").split(". ")
        current_chunk = ""

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            candidate = f"{current_chunk}. {sentence}" if current_chunk else sentence

            if len(candidate) > max_chunk_size and current_chunk:
                chunks.append(current_chunk)
                current_chunk = sentence
            else:
                current_chunk = candidate

        if current_chunk:
            chunks.append(current_chunk)

        return chunks

    async def generate_embedding(self, text_content: str) -> list[float]:
        """Generate embedding vector for a text string."""
        response = await openai_client.embeddings.create(
            model=settings.OPENAI_EMBEDDING_MODEL,
            input=text_content,
        )
        return response.data[0].embedding

    async def embed_article(self, tenant_id: UUID, article_id: UUID, title: str, content: str) -> int:
        """Chunk and embed a KB article. Returns number of chunks created."""
        await self.db.execute(
            text("DELETE FROM kb_embeddings WHERE article_id = :article_id"),
            {"article_id": str(article_id)},
        )

        full_text = f"{title}\n\n{content}"
        chunks = self.chunk_text(full_text)

        for chunk in chunks:
            embedding = await self.generate_embedding(chunk)
            embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

            await self.db.execute(
                text(
                    "INSERT INTO kb_embeddings (tenant_id, article_id, chunk_text, embedding) "
                    "VALUES (:tenant_id, :article_id, :chunk_text, :embedding::vector)"
                ),
                {
                    "tenant_id": str(tenant_id),
                    "article_id": str(article_id),
                    "chunk_text": chunk,
                    "embedding": embedding_str,
                },
            )

        await self.db.commit()
        logger.info(f"Embedded article {article_id}: {len(chunks)} chunks")
        return len(chunks)

    async def search_similar(
        self,
        tenant_id: UUID,
        query: str,
        limit: int = 5,
    ) -> list[dict]:
        """Search KB embeddings for chunks similar to query."""
        query_embedding = await self.generate_embedding(query)
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        result = await self.db.execute(
            text(
                "SELECT chunk_text, 1 - (embedding <=> :query_embedding::vector) AS similarity, article_id "
                "FROM kb_embeddings "
                "WHERE tenant_id = :tenant_id "
                "ORDER BY embedding <=> :query_embedding::vector "
                "LIMIT :limit"
            ),
            {
                "tenant_id": str(tenant_id),
                "query_embedding": embedding_str,
                "limit": limit,
            },
        )

        rows = result.fetchall()
        return [
            {"text": row[0], "score": float(row[1]), "article_id": row[2]}
            for row in rows
        ]

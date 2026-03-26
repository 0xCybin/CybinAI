import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4

from app.services.embedding_service import EmbeddingService


@pytest.fixture
def embedding_service():
    mock_db = AsyncMock()
    return EmbeddingService(db=mock_db)


class TestChunkText:
    def test_short_text_single_chunk(self, embedding_service):
        text = "We offer basic grooming services."
        chunks = embedding_service.chunk_text(text)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_multiple_chunks(self, embedding_service):
        text = "Sentence one. " * 100  # ~1400 chars
        chunks = embedding_service.chunk_text(text, max_chunk_size=500)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 600  # Allow some overlap margin

    def test_empty_text_returns_empty(self, embedding_service):
        chunks = embedding_service.chunk_text("")
        assert chunks == []


class TestGenerateEmbedding:
    @pytest.mark.asyncio
    @patch("app.services.embedding_service.openai_client")
    async def test_generates_embedding_vector(self, mock_client, embedding_service):
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
        mock_client.embeddings.create = AsyncMock(return_value=mock_response)

        result = await embedding_service.generate_embedding("test text")

        assert len(result) == 1536
        assert result[0] == 0.1
        mock_client.embeddings.create.assert_called_once()


class TestSearchSimilar:
    @pytest.mark.asyncio
    @patch("app.services.embedding_service.openai_client")
    async def test_returns_relevant_chunks(self, mock_client, embedding_service):
        mock_response = MagicMock()
        mock_response.data = [MagicMock(embedding=[0.1] * 1536)]
        mock_client.embeddings.create = AsyncMock(return_value=mock_response)

        mock_result = MagicMock()
        mock_result.fetchall.return_value = [
            ("chunk1 text", 0.95, uuid4()),
            ("chunk2 text", 0.85, uuid4()),
        ]
        embedding_service.db.execute = AsyncMock(return_value=mock_result)

        results = await embedding_service.search_similar(
            tenant_id=uuid4(),
            query="grooming prices",
            limit=5
        )

        assert len(results) == 2
        assert results[0]["text"] == "chunk1 text"
        assert results[0]["score"] == 0.95

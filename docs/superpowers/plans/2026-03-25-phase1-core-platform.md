# Phase 1: Core Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Get MykoDesk's chat + email channels working with an upgraded AI engine (GPT-4o Mini + pgvector RAG), progressive capability tiers, onboarding wizard, polished dashboard, and confidence scoring. Demo-ready for the grooming test business.

**Architecture:** FastAPI backend with PostgreSQL + pgvector for RAG, GPT-4o Mini as primary LLM. Next.js frontend with unified inbox, onboarding wizard, and mobile-responsive dashboard. AI responses scored for confidence and displayed to business owners.

**Tech Stack:** Python 3.13, FastAPI, SQLAlchemy 2.0 (async), PostgreSQL 16 + pgvector, Redis, OpenAI API (GPT-4o Mini), Next.js 15, React 19, TypeScript, Tailwind CSS, Socket.IO

**Reference Spec:** `docs/superpowers/specs/2026-03-25-mykodesk-design.md`

---

## File Structure

### New Files to Create

```
backend/
  app/
    services/
      embedding_service.py      # pgvector embedding generation + search
      notification_service.py   # Push/SMS/email notification dispatch
      onboarding_service.py     # Onboarding wizard business logic
    api/v1/endpoints/
      onboarding.py             # Onboarding wizard API endpoints
      ai_capabilities.py        # AI tier management endpoints
      notifications.py          # Notification preference endpoints
    schemas/
      onboarding.py             # Onboarding wizard schemas
      ai_capabilities.py        # AI capability tier schemas
      notifications.py          # Notification preference schemas
    models/
      ai_capabilities.py        # AICapability ORM model
      notifications.py          # NotificationPreference ORM model
  database/
    migrations/
      005_pgvector.sql          # pgvector extension + kb_embeddings table
      006_ai_capabilities.sql   # ai_capabilities table
      007_notifications.sql     # notification_preferences table
  tests/
    test_embedding_service.py   # RAG embedding tests
    test_ai_capabilities.py     # Tier management tests
    test_onboarding.py          # Onboarding flow tests
    test_confidence.py          # Confidence scoring tests

frontend/
  src/
    app/
      onboarding/
        page.tsx                # Onboarding wizard page
      dashboard/
        home/
          page.tsx              # New dashboard home with summary
    components/
      onboarding/
        BusinessBasics.tsx      # Step 1: Business name, industry, hours
        ServicesSetup.tsx       # Step 2: Services & pricing
        FAQBuilder.tsx          # Step 3: FAQ builder
        ChannelSetup.tsx        # Step 4: Channel configuration
        TestConversation.tsx    # Step 5: Test your AI
        GoLive.tsx              # Step 6: Go live
        OnboardingProgress.tsx  # Progress indicator
      dashboard/
        SummaryCard.tsx         # Metric summary card
        AIConfidenceBadge.tsx   # Confidence indicator (H/M/L)
        ConversationStatusBadge.tsx  # AI handled / needs attention
      inbox/
        ChannelIcon.tsx         # Phone/SMS/email/chat icon
        ConversationRow.tsx     # Unified inbox row
    lib/
      onboarding-api.ts        # Onboarding API client
      capabilities-api.ts      # AI capabilities API client
```

### Existing Files to Modify

```
backend/
  app/core/config.py            # Add OpenAI API key, embedding model config
  app/models/models.py          # Add confidence_score to Message model
  app/services/ai_service.py    # Rewrite: GPT-4o Mini, RAG context, confidence scoring
  app/services/llm/factory.py   # Register GPT-4o Mini as default
  app/services/llm/openai.py    # Update to use gpt-4o-mini model
  app/services/prompts/system.py # Update prompts for capability tiers
  app/services/prompts/tools.py  # Add tier-aware tool filtering
  app/services/kb_service.py    # Add vector search using pgvector
  app/services/chat_service.py  # Add confidence to message flow
  app/api/v1/router.py          # Register new endpoint routers
  app/api/v1/endpoints/widget.py # Return confidence metadata
  requirements.txt               # Add pgvector, openai embedding deps

frontend/
  src/app/dashboard/layout.tsx   # Update sidebar nav
  src/app/agent/page.tsx         # Add confidence badges to messages
  src/components/agent/ConversationPanel.tsx  # Add confidence display
  src/components/agent/ConversationList.tsx   # Add channel icons, status badges
  src/components/chat/ChatWidget.tsx          # Polish: colors, branding, mobile
  src/lib/api.ts                 # Add onboarding, capabilities, notifications API calls
```

---

## Task 1: Add pgvector Extension and Embeddings Table

**Files:**
- Create: `backend/database/migrations/005_pgvector.sql`
- Modify: `backend/app/models/models.py`

- [ ] **Step 1: Write the migration SQL**

Create `backend/database/migrations/005_pgvector.sql`:

```sql
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
```

- [ ] **Step 2: Run migration against local database**

```bash
cd C:/Users/0xCyb/Projects/cybinai
docker-compose up -d
docker exec -i cybinai-postgres-1 psql -U mykoDesk -d mykoDesk -f /dev/stdin < backend/database/migrations/005_pgvector.sql
```

Expected: `NOTICE: pgvector migration complete`

If pgvector extension isn't available, update `docker-compose.yml` to use `pgvector/pgvector:pg16` image instead of `postgres:16`.

- [ ] **Step 3: Add KBEmbedding model to models.py**

Add to `backend/app/models/models.py` after the KBArticle class:

```python
class KBEmbedding(TimestampMixin):
    __tablename__ = "kb_embeddings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    article_id = Column(UUID(as_uuid=True), ForeignKey("kb_articles.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    chunk_text = Column(Text, nullable=False)
    embedding = Column(Text)  # Stored as text, converted to vector in queries
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    article = relationship("KBArticle", backref="embeddings")
```

Note: We store embeddings as text and use raw SQL for vector operations since SQLAlchemy doesn't natively support pgvector. This is the standard pattern.

- [ ] **Step 4: Add confidence_score to Message model**

In `backend/app/models/models.py`, add to the Message class:

```python
confidence_score = Column(Float, nullable=True)
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/database/migrations/005_pgvector.sql backend/app/models/models.py
git commit -m "feat: add pgvector extension and kb_embeddings table"
```

---

## Task 2: Build Embedding Service for RAG

**Files:**
- Create: `backend/app/services/embedding_service.py`
- Create: `backend/tests/test_embedding_service.py`
- Modify: `backend/app/core/config.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add OpenAI embedding config to settings**

In `backend/app/core/config.py`, add to the Settings class:

```python
# OpenAI (for embeddings and GPT-4o Mini)
OPENAI_API_KEY: str = ""
OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"
OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
```

- [ ] **Step 2: Update requirements.txt**

Ensure `openai>=1.58.1` is already present (it is). No change needed.

- [ ] **Step 3: Write the failing test**

Create `backend/tests/test_embedding_service.py`:

```python
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

        # Mock the DB execute to return fake results
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
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_embedding_service.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.services.embedding_service'`

- [ ] **Step 5: Implement EmbeddingService**

Create `backend/app/services/embedding_service.py`:

```python
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
        # Delete existing embeddings for this article
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
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_embedding_service.py -v
```

Expected: 4 tests PASS

- [ ] **Step 7: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/app/services/embedding_service.py backend/tests/test_embedding_service.py backend/app/core/config.py
git commit -m "feat: add embedding service for pgvector RAG search"
```

---

## Task 3: Upgrade AI Service to GPT-4o Mini with RAG and Confidence Scoring

**Files:**
- Modify: `backend/app/services/ai_service.py`
- Modify: `backend/app/services/llm/openai.py`
- Modify: `backend/app/services/llm/factory.py`
- Modify: `backend/app/services/prompts/system.py`
- Modify: `backend/app/services/prompts/tools.py`
- Create: `backend/tests/test_confidence.py`

- [ ] **Step 1: Write confidence scoring test**

Create `backend/tests/test_confidence.py`:

```python
import pytest
from app.services.ai_service import AIService, AIResponse, calculate_confidence


class TestConfidenceScoring:
    def test_high_confidence_when_kb_match_and_no_escalation(self):
        score = calculate_confidence(
            has_kb_context=True,
            tool_calls=[],
            should_escalate=False,
            response_length=50,
        )
        assert score >= 0.8

    def test_medium_confidence_when_no_kb_context(self):
        score = calculate_confidence(
            has_kb_context=False,
            tool_calls=[],
            should_escalate=False,
            response_length=50,
        )
        assert 0.5 <= score < 0.8

    def test_low_confidence_when_escalating(self):
        score = calculate_confidence(
            has_kb_context=False,
            tool_calls=[],
            should_escalate=True,
            response_length=50,
        )
        assert score < 0.5

    def test_lower_confidence_for_very_short_responses(self):
        score_short = calculate_confidence(
            has_kb_context=False,
            tool_calls=[],
            should_escalate=False,
            response_length=5,
        )
        score_normal = calculate_confidence(
            has_kb_context=False,
            tool_calls=[],
            should_escalate=False,
            response_length=50,
        )
        assert score_short < score_normal

    def test_higher_confidence_with_successful_tool_call(self):
        score = calculate_confidence(
            has_kb_context=True,
            tool_calls=["search_knowledge_base"],
            should_escalate=False,
            response_length=80,
        )
        assert score >= 0.85
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_confidence.py -v
```

Expected: FAIL with `ImportError: cannot import name 'calculate_confidence'`

- [ ] **Step 3: Add calculate_confidence function to ai_service.py**

Add to the top of `backend/app/services/ai_service.py`, after the imports:

```python
def calculate_confidence(
    has_kb_context: bool,
    tool_calls: list[str],
    should_escalate: bool,
    response_length: int,
) -> float:
    """
    Calculate confidence score (0.0-1.0) for an AI response.

    Factors:
    - Knowledge base context available -> higher confidence
    - Successful tool calls -> higher confidence
    - Escalation requested -> low confidence
    - Very short response -> lower confidence (may indicate confusion)
    """
    if should_escalate:
        return 0.3

    score = 0.5  # Base

    if has_kb_context:
        score += 0.25

    if "search_knowledge_base" in tool_calls:
        score += 0.1

    if "schedule_appointment" in tool_calls:
        score += 0.05

    # Very short responses may indicate the AI didn't have enough info
    if response_length < 10:
        score -= 0.15
    elif response_length > 30:
        score += 0.05

    return max(0.0, min(1.0, score))
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_confidence.py -v
```

Expected: 5 tests PASS

- [ ] **Step 5: Update OpenAI provider to use gpt-4o-mini**

In `backend/app/services/llm/openai.py`, find the model initialization and change the default model:

Replace the model string `"gpt-4"` or `"gpt-3.5-turbo"` (whichever is set) with:

```python
self.model = model or settings.OPENAI_CHAT_MODEL  # defaults to "gpt-4o-mini"
```

- [ ] **Step 6: Update factory to default to OpenAI**

In `backend/app/services/llm/factory.py`, change the default provider:

```python
def get_llm_provider(provider_name: str = None) -> LLMProvider:
    """Get LLM provider by name. Defaults to OpenAI (GPT-4o Mini)."""
    if provider_name is None:
        provider_name = settings.LLM_PROVIDER if settings.LLM_PROVIDER else "openai"
    # ... rest of existing logic
```

- [ ] **Step 7: Update AI service to use RAG and confidence scoring**

In `backend/app/services/ai_service.py`, update the `generate_response` method to:
1. Query pgvector for relevant KB context before calling LLM
2. Calculate confidence score on the response
3. Return confidence in the AIResponse

Update the `generate_response` method body (after building messages, before calling LLM):

```python
# RAG: Search knowledge base for relevant context
knowledge_context = knowledge_context  # passed in or None
if not knowledge_context and self.db:
    try:
        from app.services.embedding_service import EmbeddingService
        embed_service = EmbeddingService(self.db)
        results = await embed_service.search_similar(
            tenant_id=self.tenant_id,
            query=customer_message,
            limit=3,
        )
        if results:
            knowledge_context = "\n\n".join(
                f"[KB] {r['text']}" for r in results if r["score"] > 0.3
            )
    except Exception as e:
        logger.warning(f"RAG search failed, continuing without: {e}")
```

After getting the `ai_response` back from `_process_response`, add confidence:

```python
has_kb = knowledge_context is not None and len(knowledge_context) > 0
ai_response.confidence_score = calculate_confidence(
    has_kb_context=has_kb,
    tool_calls=[tc.name for tc in ai_response.tool_calls],
    should_escalate=ai_response.should_escalate,
    response_length=len(ai_response.content),
)
```

Add `confidence_score: float = 0.0` to the `AIResponse` dataclass.

- [ ] **Step 8: Update system prompt for capability tiers**

In `backend/app/services/prompts/system.py`, update `get_system_prompt` to accept a `tier` parameter:

```python
def get_system_prompt(
    business_name: str = "the company",
    business_type: str = "general",
    additional_context: str = None,
    knowledge_base_context: str = None,
    tier: int = 1,
) -> str:
    tier_instructions = {
        1: (
            "You can ONLY: answer questions using the knowledge base, take messages, "
            "and offer to have someone call the customer back. "
            "Do NOT book appointments or take actions beyond answering questions and taking messages."
        ),
        2: (
            "You can: answer questions, take messages, AND book appointments, "
            "send confirmations, and answer detailed service questions. "
            "Do NOT handle cancellations, complaints, or proactive follow-ups."
        ),
        3: (
            "You can handle all customer interactions: answer questions, book/reschedule/cancel appointments, "
            "handle basic complaints using the HEARD framework, follow up with leads, "
            "and request reviews after service."
        ),
    }

    prompt = get_base_system_prompt(business_name, business_type)
    prompt += f"\n\n## Your Capabilities (Tier {tier})\n{tier_instructions.get(tier, tier_instructions[1])}"

    if additional_context:
        prompt += f"\n\n## Additional Business Context\n{additional_context}"

    if knowledge_base_context:
        prompt += f"\n\n## Knowledge Base (Use this to answer questions)\n{knowledge_base_context}"

    return prompt
```

- [ ] **Step 9: Update tools for tier-aware filtering**

In `backend/app/services/prompts/tools.py`, update `get_available_tools` to accept a tier:

```python
def get_available_tools(
    tier: int = 1,
    include_scheduling: bool = True,
    include_knowledge_base: bool = True,
    include_escalation: bool = True,
) -> list[dict]:
    tools = []

    if include_knowledge_base:
        tools.append(TOOL_DEFINITIONS["search_knowledge_base"])

    if include_escalation:
        tools.append(TOOL_DEFINITIONS["escalate_to_human"])
        tools.append(TOOL_DEFINITIONS["request_callback"])

    if tier >= 2 and include_scheduling:
        tools.append(TOOL_DEFINITIONS["schedule_appointment"])
        tools.append(TOOL_DEFINITIONS["check_appointment_status"])

    return tools
```

- [ ] **Step 10: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/app/services/ai_service.py backend/app/services/llm/openai.py backend/app/services/llm/factory.py backend/app/services/prompts/system.py backend/app/services/prompts/tools.py backend/tests/test_confidence.py
git commit -m "feat: upgrade AI to GPT-4o Mini with RAG context and confidence scoring"
```

---

## Task 4: AI Capability Tiers (Backend)

**Files:**
- Create: `backend/database/migrations/006_ai_capabilities.sql`
- Create: `backend/app/models/ai_capabilities.py`
- Create: `backend/app/schemas/ai_capabilities.py`
- Create: `backend/app/api/v1/endpoints/ai_capabilities.py`
- Create: `backend/tests/test_ai_capabilities.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Write migration**

Create `backend/database/migrations/006_ai_capabilities.sql`:

```sql
CREATE TABLE IF NOT EXISTS ai_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tier INTEGER DEFAULT 1 CHECK (tier IN (1, 2, 3)),
    can_book_appointments BOOLEAN DEFAULT FALSE,
    can_send_reminders BOOLEAN DEFAULT FALSE,
    can_handle_cancellations BOOLEAN DEFAULT FALSE,
    can_follow_up_leads BOOLEAN DEFAULT FALSE,
    can_request_reviews BOOLEAN DEFAULT FALSE,
    can_handle_complaints BOOLEAN DEFAULT FALSE,
    custom_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_ai_capabilities_tenant ON ai_capabilities(tenant_id);
CREATE TRIGGER update_ai_capabilities_updated_at BEFORE UPDATE ON ai_capabilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN RAISE NOTICE 'ai_capabilities migration complete'; END $$;
```

- [ ] **Step 2: Run migration**

```bash
docker exec -i cybinai-postgres-1 psql -U mykoDesk -d mykoDesk -f /dev/stdin < backend/database/migrations/006_ai_capabilities.sql
```

- [ ] **Step 3: Write test**

Create `backend/tests/test_ai_capabilities.py`:

```python
import pytest
from app.schemas.ai_capabilities import AICapabilitiesResponse, AICapabilitiesUpdate


class TestAICapabilitiesSchema:
    def test_default_tier_is_1(self):
        caps = AICapabilitiesResponse(
            tier=1,
            can_book_appointments=False,
            can_send_reminders=False,
            can_handle_cancellations=False,
            can_follow_up_leads=False,
            can_request_reviews=False,
            can_handle_complaints=False,
        )
        assert caps.tier == 1
        assert caps.can_book_appointments is False

    def test_tier_2_enables_booking(self):
        update = AICapabilitiesUpdate(tier=2)
        assert update.tier == 2

    def test_tier_must_be_1_2_or_3(self):
        with pytest.raises(ValueError):
            AICapabilitiesUpdate(tier=5)
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_ai_capabilities.py -v
```

Expected: FAIL - module not found

- [ ] **Step 5: Create model**

Create `backend/app/models/ai_capabilities.py`:

```python
import uuid
from sqlalchemy import Column, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class AICapability(Base):
    __tablename__ = "ai_capabilities"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, unique=True)
    tier = Column(Integer, default=1)
    can_book_appointments = Column(Boolean, default=False)
    can_send_reminders = Column(Boolean, default=False)
    can_handle_cancellations = Column(Boolean, default=False)
    can_follow_up_leads = Column(Boolean, default=False)
    can_request_reviews = Column(Boolean, default=False)
    can_handle_complaints = Column(Boolean, default=False)
    custom_instructions = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```

- [ ] **Step 6: Create schema**

Create `backend/app/schemas/ai_capabilities.py`:

```python
from pydantic import BaseModel, field_validator
from typing import Optional


class AICapabilitiesResponse(BaseModel):
    tier: int
    can_book_appointments: bool
    can_send_reminders: bool
    can_handle_cancellations: bool
    can_follow_up_leads: bool
    can_request_reviews: bool
    can_handle_complaints: bool
    custom_instructions: Optional[str] = None

    model_config = {"from_attributes": True}


class AICapabilitiesUpdate(BaseModel):
    tier: Optional[int] = None
    can_book_appointments: Optional[bool] = None
    can_send_reminders: Optional[bool] = None
    can_handle_cancellations: Optional[bool] = None
    can_follow_up_leads: Optional[bool] = None
    can_request_reviews: Optional[bool] = None
    can_handle_complaints: Optional[bool] = None
    custom_instructions: Optional[str] = None

    @field_validator("tier")
    @classmethod
    def tier_must_be_valid(cls, v):
        if v is not None and v not in (1, 2, 3):
            raise ValueError("Tier must be 1, 2, or 3")
        return v
```

- [ ] **Step 7: Create endpoint**

Create `backend/app/api/v1/endpoints/ai_capabilities.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import DbSession, AuthenticatedUser
from app.models.ai_capabilities import AICapability
from app.schemas.ai_capabilities import AICapabilitiesResponse, AICapabilitiesUpdate

router = APIRouter()


@router.get("/ai-capabilities", response_model=AICapabilitiesResponse)
async def get_ai_capabilities(
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Get current AI capability tier and toggles for this tenant."""
    result = await db.execute(
        select(AICapability).where(AICapability.tenant_id == current_user.tenant_id)
    )
    caps = result.scalar_one_or_none()

    if not caps:
        # Create default Tier 1 capabilities
        caps = AICapability(tenant_id=current_user.tenant_id, tier=1)
        db.add(caps)
        await db.commit()
        await db.refresh(caps)

    return caps


@router.put("/ai-capabilities", response_model=AICapabilitiesResponse)
async def update_ai_capabilities(
    update: AICapabilitiesUpdate,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Update AI capability tier and toggles. Requires admin or owner role."""
    result = await db.execute(
        select(AICapability).where(AICapability.tenant_id == current_user.tenant_id)
    )
    caps = result.scalar_one_or_none()

    if not caps:
        caps = AICapability(tenant_id=current_user.tenant_id)
        db.add(caps)

    update_data = update.model_dump(exclude_unset=True)

    # When tier changes, auto-set capability flags
    if "tier" in update_data:
        tier = update_data["tier"]
        if tier == 1:
            update_data.setdefault("can_book_appointments", False)
            update_data.setdefault("can_send_reminders", False)
            update_data.setdefault("can_handle_cancellations", False)
            update_data.setdefault("can_follow_up_leads", False)
            update_data.setdefault("can_request_reviews", False)
            update_data.setdefault("can_handle_complaints", False)
        elif tier == 2:
            update_data.setdefault("can_book_appointments", True)
            update_data.setdefault("can_send_reminders", True)
            update_data.setdefault("can_handle_cancellations", False)
            update_data.setdefault("can_follow_up_leads", False)
            update_data.setdefault("can_request_reviews", False)
            update_data.setdefault("can_handle_complaints", False)
        elif tier == 3:
            update_data.setdefault("can_book_appointments", True)
            update_data.setdefault("can_send_reminders", True)
            update_data.setdefault("can_handle_cancellations", True)
            update_data.setdefault("can_follow_up_leads", True)
            update_data.setdefault("can_request_reviews", True)
            update_data.setdefault("can_handle_complaints", True)

    for key, value in update_data.items():
        setattr(caps, key, value)

    await db.commit()
    await db.refresh(caps)
    return caps
```

- [ ] **Step 8: Register router**

In `backend/app/api/v1/router.py`, add:

```python
from app.api.v1.endpoints import ai_capabilities

api_router.include_router(
    ai_capabilities.router,
    tags=["AI Capabilities"]
)
```

- [ ] **Step 9: Run tests**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_ai_capabilities.py -v
```

Expected: 3 tests PASS

- [ ] **Step 10: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/database/migrations/006_ai_capabilities.sql backend/app/models/ai_capabilities.py backend/app/schemas/ai_capabilities.py backend/app/api/v1/endpoints/ai_capabilities.py backend/app/api/v1/router.py backend/tests/test_ai_capabilities.py
git commit -m "feat: add AI capability tiers with auto-configured permission levels"
```

---

## Task 5: Notification Preferences (Backend)

**Files:**
- Create: `backend/database/migrations/007_notifications.sql`
- Create: `backend/app/models/notifications.py`
- Create: `backend/app/schemas/notifications.py`
- Create: `backend/app/api/v1/endpoints/notifications.py`
- Create: `backend/app/services/notification_service.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Write migration**

Create `backend/database/migrations/007_notifications.sql`:

```sql
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mode VARCHAR(20) DEFAULT 'regular' CHECK (mode IN ('calm', 'regular', 'all')),
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ix_notification_prefs_user ON notification_preferences(user_id);
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN RAISE NOTICE 'notification_preferences migration complete'; END $$;
```

- [ ] **Step 2: Run migration**

```bash
docker exec -i cybinai-postgres-1 psql -U mykoDesk -d mykoDesk -f /dev/stdin < backend/database/migrations/007_notifications.sql
```

- [ ] **Step 3: Create model**

Create `backend/app/models/notifications.py`:

```python
import uuid
from sqlalchemy import Column, String, Boolean, Time, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.core.database import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    mode = Column(String(20), default="regular")
    push_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=True)
    email_enabled = Column(Boolean, default=True)
    quiet_hours_start = Column(Time, nullable=True)
    quiet_hours_end = Column(Time, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
```

- [ ] **Step 4: Create schema**

Create `backend/app/schemas/notifications.py`:

```python
from pydantic import BaseModel, field_validator
from typing import Optional


class NotificationPreferencesResponse(BaseModel):
    mode: str  # "calm", "regular", "all"
    push_enabled: bool
    sms_enabled: bool
    email_enabled: bool
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None

    model_config = {"from_attributes": True}


class NotificationPreferencesUpdate(BaseModel):
    mode: Optional[str] = None
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None

    @field_validator("mode")
    @classmethod
    def mode_must_be_valid(cls, v):
        if v is not None and v not in ("calm", "regular", "all"):
            raise ValueError("Mode must be 'calm', 'regular', or 'all'")
        return v
```

- [ ] **Step 5: Create notification service**

Create `backend/app/services/notification_service.py`:

```python
"""
Notification Service.

Dispatches notifications to business owners based on their preferences.
Supports push, SMS, and email channels with mode-based filtering.

Modes:
- calm: Only urgent escalations, complaints, emergencies
- regular: New conversations, escalations, daily summary
- all: Everything including resolved conversations, analytics
"""

import logging
from enum import Enum
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notifications import NotificationPreference

logger = logging.getLogger(__name__)


class NotificationLevel(str, Enum):
    URGENT = "urgent"      # Emergency, angry customer, explicit human request
    NORMAL = "normal"      # New conversation, booking request, question AI can't answer
    LOW = "low"            # Resolved conversation, feedback, analytics update


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_preferences(self, user_id: UUID) -> NotificationPreference:
        result = await self.db.execute(
            select(NotificationPreference).where(NotificationPreference.user_id == user_id)
        )
        prefs = result.scalar_one_or_none()
        if not prefs:
            # Return default preferences (regular mode)
            return NotificationPreference(user_id=user_id, mode="regular")
        return prefs

    def should_notify(self, mode: str, level: NotificationLevel) -> bool:
        """Determine if a notification should be sent based on mode and level."""
        if mode == "calm":
            return level == NotificationLevel.URGENT
        elif mode == "regular":
            return level in (NotificationLevel.URGENT, NotificationLevel.NORMAL)
        else:  # "all"
            return True

    async def notify(
        self,
        user_id: UUID,
        level: NotificationLevel,
        title: str,
        body: str,
        data: dict = None,
    ) -> bool:
        """
        Send notification if user's preferences allow it.
        Returns True if notification was sent (or queued).
        """
        prefs = await self.get_preferences(user_id)

        if not self.should_notify(prefs.mode, level):
            logger.debug(f"Notification suppressed by mode={prefs.mode} for level={level}")
            return False

        sent = False

        # For now, log the notification. Phase 2 adds actual push/SMS delivery.
        if prefs.email_enabled:
            logger.info(f"[EMAIL] To user {user_id}: {title} - {body}")
            sent = True

        if prefs.sms_enabled and level == NotificationLevel.URGENT:
            logger.info(f"[SMS] To user {user_id}: {title} - {body}")
            sent = True

        if prefs.push_enabled:
            logger.info(f"[PUSH] To user {user_id}: {title} - {body}")
            sent = True

        return sent
```

- [ ] **Step 6: Create endpoint**

Create `backend/app/api/v1/endpoints/notifications.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import DbSession, AuthenticatedUser
from app.models.notifications import NotificationPreference
from app.schemas.notifications import NotificationPreferencesResponse, NotificationPreferencesUpdate

router = APIRouter()


@router.get("/notifications/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    db: DbSession,
    current_user: AuthenticatedUser,
):
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()

    if not prefs:
        prefs = NotificationPreference(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            mode="regular",
        )
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)

    return prefs


@router.put("/notifications/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    update: NotificationPreferencesUpdate,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == current_user.id)
    )
    prefs = result.scalar_one_or_none()

    if not prefs:
        prefs = NotificationPreference(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
        )
        db.add(prefs)

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(prefs, key, value)

    await db.commit()
    await db.refresh(prefs)
    return prefs
```

- [ ] **Step 7: Register router**

In `backend/app/api/v1/router.py`, add:

```python
from app.api.v1.endpoints import notifications

api_router.include_router(
    notifications.router,
    tags=["Notifications"]
)
```

- [ ] **Step 8: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/database/migrations/007_notifications.sql backend/app/models/notifications.py backend/app/schemas/notifications.py backend/app/api/v1/endpoints/notifications.py backend/app/services/notification_service.py backend/app/api/v1/router.py
git commit -m "feat: add notification preferences with calm/regular/all modes"
```

---

## Task 6: Onboarding Wizard (Backend)

**Files:**
- Create: `backend/app/schemas/onboarding.py`
- Create: `backend/app/services/onboarding_service.py`
- Create: `backend/app/api/v1/endpoints/onboarding.py`
- Create: `backend/tests/test_onboarding.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Write test**

Create `backend/tests/test_onboarding.py`:

```python
import pytest
from app.schemas.onboarding import (
    BusinessBasicsInput,
    ServiceItem,
    ServicesInput,
    FAQItem,
    FAQInput,
)


class TestOnboardingSchemas:
    def test_business_basics_valid(self):
        basics = BusinessBasicsInput(
            business_name="Paws & Claws Grooming",
            industry="grooming",
            phone="555-123-4567",
            address="123 Main St, Grand Prairie, TX",
            timezone="America/Chicago",
        )
        assert basics.business_name == "Paws & Claws Grooming"

    def test_services_with_pricing(self):
        services = ServicesInput(
            services=[
                ServiceItem(name="Bath", description="Basic bath and dry", price_min=30, price_max=50),
                ServiceItem(name="Full Groom", description="Bath, haircut, nails", price_min=60, price_max=120),
            ]
        )
        assert len(services.services) == 2
        assert services.services[0].price_min == 30

    def test_faq_items(self):
        faq = FAQInput(
            items=[
                FAQItem(question="What are your hours?", answer="Mon-Sat 8am-6pm"),
                FAQItem(question="Do I need vaccine records?", answer="Yes, current rabies and Bordetella required."),
            ]
        )
        assert len(faq.items) == 2


class TestIndustryDefaults:
    def test_grooming_generates_defaults(self):
        from app.services.onboarding_service import get_industry_defaults
        defaults = get_industry_defaults("grooming")
        assert len(defaults["services"]) > 0
        assert len(defaults["faqs"]) > 0
        assert any("vaccine" in faq["question"].lower() or "vaccination" in faq["question"].lower() for faq in defaults["faqs"])

    def test_hvac_generates_defaults(self):
        from app.services.onboarding_service import get_industry_defaults
        defaults = get_industry_defaults("hvac")
        assert len(defaults["services"]) > 0
        assert any("emergency" in faq["question"].lower() for faq in defaults["faqs"])

    def test_unknown_industry_returns_generic(self):
        from app.services.onboarding_service import get_industry_defaults
        defaults = get_industry_defaults("underwater_basket_weaving")
        assert len(defaults["services"]) > 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_onboarding.py -v
```

Expected: FAIL

- [ ] **Step 3: Create schemas**

Create `backend/app/schemas/onboarding.py`:

```python
from pydantic import BaseModel
from typing import Optional


class BusinessBasicsInput(BaseModel):
    business_name: str
    industry: str  # grooming, hvac, dental, cleaning, landscaping, salon, restaurant, auto_repair, other
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    timezone: str = "America/Chicago"
    business_hours: Optional[dict] = None  # {"mon": {"open": "08:00", "close": "18:00"}, ...}


class ServiceItem(BaseModel):
    name: str
    description: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    duration_minutes: Optional[int] = None


class ServicesInput(BaseModel):
    services: list[ServiceItem]


class FAQItem(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None


class FAQInput(BaseModel):
    items: list[FAQItem]


class ChannelSetupInput(BaseModel):
    enable_chat: bool = True
    enable_email: bool = False
    enable_phone: bool = False
    enable_sms: bool = False
    email_forward_address: Optional[str] = None
    phone_forward_number: Optional[str] = None


class OnboardingCompleteResponse(BaseModel):
    tenant_id: str
    business_name: str
    channels_enabled: list[str]
    services_count: int
    faq_count: int
    widget_embed_code: str
    message: str
```

- [ ] **Step 4: Create onboarding service with industry defaults**

Create `backend/app/services/onboarding_service.py`:

```python
"""
Onboarding Service.

Handles the 6-step onboarding wizard, including industry-specific defaults
for services and FAQs. Designed for non-technical business owners
(groomers, HVAC techs, dentists) who may have zero digital records.
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)

INDUSTRY_DEFAULTS = {
    "grooming": {
        "services": [
            {"name": "Bath Only", "description": "Bath, blow dry, ear cleaning, nail trim", "price_min": 30, "price_max": 60},
            {"name": "Full Groom", "description": "Bath, haircut, blow dry, ear cleaning, nail trim", "price_min": 50, "price_max": 130},
            {"name": "Nail Trim", "description": "Nail trimming and filing", "price_min": 15, "price_max": 25},
            {"name": "De-shed Treatment", "description": "Deep undercoat removal for heavy shedders", "price_min": 40, "price_max": 80},
            {"name": "Puppy's First Groom", "description": "Gentle introduction to grooming for puppies", "price_min": 30, "price_max": 50},
        ],
        "faqs": [
            {"question": "How much does grooming cost?", "answer": "Pricing depends on your dog's breed, size, and coat condition. Small dogs start around $40, medium dogs $60-80, and large dogs $80-130. We can give you an exact quote when you tell us about your dog.", "category": "Pricing"},
            {"question": "How long does grooming take?", "answer": "Small dogs: about 1-1.5 hours. Medium dogs: 1.5-2.5 hours. Large dogs: 2-3+ hours. First-time visits may take a bit longer so we can assess your dog's needs.", "category": "Services"},
            {"question": "Do I need to bring vaccination records?", "answer": "Yes. All dogs must be current on rabies, distemper, and Bordetella (kennel cough) vaccines. Please bring proof from your vet. Dogs must wait at least 48 hours after vaccination before grooming.", "category": "Requirements"},
            {"question": "How often should I get my dog groomed?", "answer": "Most dogs benefit from grooming every 4-8 weeks. High-maintenance breeds like Poodles and Doodles should come every 4-6 weeks. Short-haired breeds can go 8-12 weeks.", "category": "Services"},
            {"question": "What is your cancellation policy?", "answer": "We ask for at least 24 hours notice for cancellations. Late cancellations or no-shows may be charged a fee. We understand emergencies happen - just let us know as soon as possible.", "category": "Policies"},
            {"question": "My dog is matted. Can you still groom them?", "answer": "Yes, but severe matting requires extra time and may cost more ($20-50 extra). In some cases, we may need to shave the coat short for your dog's comfort and safety. We'll always discuss options with you first.", "category": "Services"},
            {"question": "Do you groom aggressive or anxious dogs?", "answer": "We work with many nervous dogs and use gentle handling techniques. Please let us know about any behavioral concerns when booking so we can prepare. For safety reasons, severely aggressive dogs may need a veterinary groomer.", "category": "Requirements"},
        ],
    },
    "hvac": {
        "services": [
            {"name": "Diagnostic Service Call", "description": "System inspection and problem diagnosis", "price_min": 75, "price_max": 150},
            {"name": "AC Tune-Up", "description": "Annual maintenance and cleaning for cooling system", "price_min": 80, "price_max": 150},
            {"name": "Heating Tune-Up", "description": "Annual maintenance for furnace or heat pump", "price_min": 80, "price_max": 150},
            {"name": "Filter Replacement", "description": "Replace air filters", "price_min": 20, "price_max": 50},
            {"name": "Emergency Service", "description": "After-hours or same-day emergency repair", "price_min": 150, "price_max": 300},
        ],
        "faqs": [
            {"question": "How much does a service call cost?", "answer": "Our diagnostic service call is $75-150 depending on the issue. This fee is often waived if you proceed with the repair. Emergency and after-hours calls are $150-250+.", "category": "Pricing"},
            {"question": "Do you offer emergency service?", "answer": "Yes! We offer 24/7 emergency service for situations like complete heating/cooling failure, gas smells, or electrical issues. Emergency calls are dispatched immediately. Call us and say 'emergency' to be prioritized.", "category": "Emergency"},
            {"question": "How often should I service my HVAC system?", "answer": "We recommend twice a year - once in spring for your cooling system and once in fall for your heating system. Regular maintenance prevents breakdowns and keeps your system running efficiently.", "category": "Maintenance"},
            {"question": "Do you offer maintenance plans?", "answer": "Yes! Our maintenance plans include 2 annual tune-ups, priority scheduling, and discounts on repairs. Plans start at $180/year and save you money in the long run.", "category": "Maintenance"},
            {"question": "Can you give me a quote over the phone?", "answer": "We can quote our diagnostic fee and maintenance plan pricing over the phone. For repair costs, we need to diagnose the issue on-site first since every system is different. We'll always give you a price before starting any work.", "category": "Pricing"},
            {"question": "What are your hours?", "answer": "Our regular business hours are Monday-Friday 8am-5pm. We're available for emergency calls 24/7, including weekends and holidays.", "category": "General"},
        ],
    },
    "dental": {
        "services": [
            {"name": "Cleaning & Exam", "description": "Regular dental cleaning and examination", "price_min": 100, "price_max": 300},
            {"name": "Emergency Visit", "description": "Same-day emergency dental care", "price_min": 150, "price_max": 400},
            {"name": "Whitening", "description": "Professional teeth whitening", "price_min": 200, "price_max": 600},
        ],
        "faqs": [
            {"question": "Do you accept my insurance?", "answer": "We accept most major dental insurance plans. Please call us with your insurance information and we'll verify your coverage before your visit.", "category": "Insurance"},
            {"question": "How often should I come in?", "answer": "We recommend a cleaning and exam every 6 months for most patients. Some patients with gum disease may need visits every 3-4 months.", "category": "General"},
            {"question": "Do you offer emergency appointments?", "answer": "Yes, we reserve time each day for dental emergencies. If you're in pain, call us and we'll get you in as soon as possible.", "category": "Emergency"},
        ],
    },
}

# Generic defaults for unknown industries
GENERIC_DEFAULTS = {
    "services": [
        {"name": "Consultation", "description": "Initial consultation", "price_min": 0, "price_max": 100},
        {"name": "Standard Service", "description": "Our standard service offering", "price_min": 50, "price_max": 200},
    ],
    "faqs": [
        {"question": "What are your hours?", "answer": "Please contact us for our current business hours.", "category": "General"},
        {"question": "How do I book an appointment?", "answer": "You can book by calling us, texting, or using our online chat.", "category": "Booking"},
        {"question": "What is your cancellation policy?", "answer": "We ask for at least 24 hours notice for cancellations.", "category": "Policies"},
    ],
}


def get_industry_defaults(industry: str) -> dict:
    """Get pre-populated services and FAQs for an industry."""
    return INDUSTRY_DEFAULTS.get(industry.lower(), GENERIC_DEFAULTS)


class OnboardingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_business_basics(self, tenant_id: UUID, basics: dict) -> None:
        """Update tenant with business basics from onboarding step 1."""
        from sqlalchemy import text
        await self.db.execute(
            text(
                "UPDATE tenants SET settings = settings || :new_settings, "
                "name = :name, updated_at = NOW() WHERE id = :tenant_id"
            ),
            {
                "tenant_id": str(tenant_id),
                "name": basics["business_name"],
                "new_settings": f'{{"industry": "{basics["industry"]}", "phone": "{basics.get("phone", "")}", "address": "{basics.get("address", "")}", "website": "{basics.get("website", "")}", "timezone": "{basics.get("timezone", "America/Chicago")}"}}',
            },
        )
        await self.db.commit()

    async def save_services(self, tenant_id: UUID, services: list[dict]) -> int:
        """Save services as KB articles. Returns count saved."""
        from sqlalchemy import text

        count = 0
        for service in services:
            price_text = ""
            if service.get("price_min") and service.get("price_max"):
                price_text = f" Price range: ${service['price_min']}-${service['price_max']}."
            elif service.get("price_min"):
                price_text = f" Starting at ${service['price_min']}."

            content = f"{service.get('description', '')}{price_text}"
            if service.get("duration_minutes"):
                content += f" Duration: approximately {service['duration_minutes']} minutes."

            await self.db.execute(
                text(
                    "INSERT INTO kb_articles (tenant_id, title, content, category, published) "
                    "VALUES (:tenant_id, :title, :content, 'Services', TRUE)"
                ),
                {
                    "tenant_id": str(tenant_id),
                    "title": service["name"],
                    "content": content,
                },
            )
            count += 1

        await self.db.commit()
        return count

    async def save_faqs(self, tenant_id: UUID, faqs: list[dict]) -> int:
        """Save FAQs as KB articles and generate embeddings. Returns count saved."""
        from sqlalchemy import text

        embed_service = EmbeddingService(self.db)
        count = 0

        for faq in faqs:
            result = await self.db.execute(
                text(
                    "INSERT INTO kb_articles (tenant_id, title, content, category, published) "
                    "VALUES (:tenant_id, :title, :content, :category, TRUE) RETURNING id"
                ),
                {
                    "tenant_id": str(tenant_id),
                    "title": faq["question"],
                    "content": faq["answer"],
                    "category": faq.get("category", "FAQ"),
                },
            )
            article_id = result.scalar_one()

            # Generate embeddings for RAG search
            try:
                await embed_service.embed_article(
                    tenant_id=tenant_id,
                    article_id=article_id,
                    title=faq["question"],
                    content=faq["answer"],
                )
            except Exception as e:
                logger.warning(f"Failed to embed FAQ '{faq['question']}': {e}")

            count += 1

        await self.db.commit()
        return count
```

- [ ] **Step 5: Create endpoint**

Create `backend/app/api/v1/endpoints/onboarding.py`:

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import DbSession, AuthenticatedUser
from app.schemas.onboarding import (
    BusinessBasicsInput,
    ServicesInput,
    FAQInput,
    ChannelSetupInput,
    OnboardingCompleteResponse,
)
from app.services.onboarding_service import OnboardingService, get_industry_defaults

router = APIRouter()


@router.get("/onboarding/industry-defaults/{industry}")
async def get_defaults(industry: str):
    """Get pre-populated services and FAQs for an industry."""
    return get_industry_defaults(industry)


@router.post("/onboarding/business-info")
async def save_business_info(
    basics: BusinessBasicsInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Step 1: Save business basics."""
    service = OnboardingService(db)
    await service.save_business_basics(current_user.tenant_id, basics.model_dump())
    defaults = get_industry_defaults(basics.industry)
    return {
        "status": "saved",
        "industry_defaults": defaults,
        "message": f"Business info saved. Here are suggested services and FAQs for {basics.industry} businesses.",
    }


@router.post("/onboarding/services")
async def save_services(
    services_input: ServicesInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Step 2: Save services."""
    service = OnboardingService(db)
    count = await service.save_services(
        current_user.tenant_id,
        [s.model_dump() for s in services_input.services],
    )
    return {"status": "saved", "services_count": count}


@router.post("/onboarding/faq")
async def save_faqs(
    faq_input: FAQInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Step 3: Save FAQs and generate embeddings for RAG."""
    service = OnboardingService(db)
    count = await service.save_faqs(
        current_user.tenant_id,
        [f.model_dump() for f in faq_input.items],
    )
    return {"status": "saved", "faq_count": count, "embeddings_generated": True}


@router.post("/onboarding/channels")
async def save_channel_setup(
    channels: ChannelSetupInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Step 4: Save channel configuration."""
    from sqlalchemy import text

    enabled = []
    if channels.enable_chat:
        enabled.append("chat")
    if channels.enable_email:
        enabled.append("email")
    if channels.enable_phone:
        enabled.append("phone")
    if channels.enable_sms:
        enabled.append("sms")

    channels_json = '{"channels": [' + ",".join(f'"{c}"' for c in enabled) + "]}"

    await db.execute(
        text("UPDATE tenants SET settings = settings || :channels WHERE id = :tid"),
        {"channels": channels_json, "tid": str(current_user.tenant_id)},
    )
    await db.commit()

    return {"status": "saved", "channels_enabled": enabled}


@router.post("/onboarding/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Step 6: Mark onboarding complete and return embed code."""
    from sqlalchemy import text, func

    # Count services and FAQs
    services_result = await db.execute(
        text("SELECT COUNT(*) FROM kb_articles WHERE tenant_id = :tid AND category = 'Services'"),
        {"tid": str(current_user.tenant_id)},
    )
    services_count = services_result.scalar_one()

    faq_result = await db.execute(
        text("SELECT COUNT(*) FROM kb_articles WHERE tenant_id = :tid AND category != 'Services'"),
        {"tid": str(current_user.tenant_id)},
    )
    faq_count = faq_result.scalar_one()

    # Get tenant info
    tenant_result = await db.execute(
        text("SELECT name, settings FROM tenants WHERE id = :tid"),
        {"tid": str(current_user.tenant_id)},
    )
    tenant = tenant_result.fetchone()

    # Mark onboarding complete
    await db.execute(
        text("UPDATE tenants SET settings = settings || '{\"onboarding_complete\": true}' WHERE id = :tid"),
        {"tid": str(current_user.tenant_id)},
    )
    await db.commit()

    widget_code = (
        f'<script src="https://app.mykodesk.com/widget.js" '
        f'data-tenant="{current_user.tenant_id}"></script>'
    )

    channels = tenant[1].get("channels", ["chat"]) if tenant[1] else ["chat"]

    return OnboardingCompleteResponse(
        tenant_id=str(current_user.tenant_id),
        business_name=tenant[0] if tenant else "",
        channels_enabled=channels,
        services_count=services_count,
        faq_count=faq_count,
        widget_embed_code=widget_code,
        message="Your AI assistant is ready! It will start answering questions using the information you provided.",
    )
```

- [ ] **Step 6: Register router**

In `backend/app/api/v1/router.py`, add:

```python
from app.api.v1.endpoints import onboarding

api_router.include_router(
    onboarding.router,
    prefix="/onboarding",
    tags=["Onboarding"]
)
```

- [ ] **Step 7: Run tests**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_onboarding.py -v
```

Expected: 6 tests PASS

- [ ] **Step 8: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/app/schemas/onboarding.py backend/app/services/onboarding_service.py backend/app/api/v1/endpoints/onboarding.py backend/tests/test_onboarding.py backend/app/api/v1/router.py
git commit -m "feat: add onboarding wizard with industry-specific defaults for grooming, HVAC, dental"
```

---

## Task 7: Integrate KB Embedding Generation into KB Article CRUD

**Files:**
- Modify: `backend/app/api/v1/endpoints/knowledge_base.py`

- [ ] **Step 1: Add embedding generation on article create/update**

In `backend/app/api/v1/endpoints/knowledge_base.py`, after a KB article is created or updated, add embedding generation:

```python
# At the top, add import:
from app.services.embedding_service import EmbeddingService

# In the create_article endpoint, after the article is saved and committed:
try:
    embed_service = EmbeddingService(db)
    await embed_service.embed_article(
        tenant_id=current_user.tenant_id,
        article_id=article.id,
        title=article.title,
        content=article.content,
    )
except Exception as e:
    logger.warning(f"Failed to generate embeddings for article {article.id}: {e}")

# In the update_article endpoint, after the article is updated and committed:
try:
    embed_service = EmbeddingService(db)
    await embed_service.embed_article(
        tenant_id=current_user.tenant_id,
        article_id=article.id,
        title=article.title,
        content=article.content,
    )
except Exception as e:
    logger.warning(f"Failed to update embeddings for article {article.id}: {e}")
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/app/api/v1/endpoints/knowledge_base.py
git commit -m "feat: auto-generate RAG embeddings when KB articles are created or updated"
```

---

## Task 8: Wire Confidence Score Through Chat Flow

**Files:**
- Modify: `backend/app/services/chat_service.py`
- Modify: `backend/app/api/v1/endpoints/widget.py`
- Modify: `backend/app/schemas/chat.py`
- Modify: `backend/app/schemas/conversation.py`

- [ ] **Step 1: Add confidence to message schemas**

In `backend/app/schemas/chat.py`, add to `SendMessageResponse`:

```python
confidence_score: Optional[float] = None
confidence_level: Optional[str] = None  # "high", "medium", "low"
```

In `backend/app/schemas/conversation.py`, add to `MessageResponse`:

```python
confidence_score: Optional[float] = None
confidence_level: Optional[str] = None
```

- [ ] **Step 2: Add confidence helper function**

Add to `backend/app/schemas/conversation.py`:

```python
def get_confidence_level(score: float) -> str:
    if score is None:
        return None
    if score >= 0.8:
        return "high"
    elif score >= 0.5:
        return "medium"
    return "low"
```

- [ ] **Step 3: Save confidence when AI responds in chat_service.py**

In `backend/app/services/chat_service.py`, in the `add_message` method where the AI response message is created and saved, add:

```python
# When creating the AI response message:
ai_message = Message(
    conversation_id=conversation.id,
    sender_type=SenderType.AI,
    content=ai_response.content,
    confidence_score=ai_response.confidence_score,  # Add this line
    ai_metadata={
        "provider": ai_response.provider,
        "model": ai_response.model,
        "tokens_used": ai_response.tokens_used,
        "estimated_cost": ai_response.estimated_cost,
        "confidence_score": ai_response.confidence_score,
    },
)
```

- [ ] **Step 4: Return confidence in widget response**

In `backend/app/api/v1/endpoints/widget.py`, in the `send_message` endpoint, include confidence in the response.

- [ ] **Step 5: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/app/services/chat_service.py backend/app/api/v1/endpoints/widget.py backend/app/schemas/chat.py backend/app/schemas/conversation.py
git commit -m "feat: wire confidence score through chat flow and expose in API responses"
```

---

## Task 9: Frontend - AI Confidence Badge Component

**Files:**
- Create: `frontend/src/components/dashboard/AIConfidenceBadge.tsx`
- Modify: `frontend/src/components/agent/ConversationPanel.tsx`

- [ ] **Step 1: Create confidence badge component**

Create `frontend/src/components/dashboard/AIConfidenceBadge.tsx`:

```tsx
interface AIConfidenceBadgeProps {
  score: number | null;
  level: "high" | "medium" | "low" | null;
}

export function AIConfidenceBadge({ score, level }: AIConfidenceBadgeProps) {
  if (!level || score === null) return null;

  const config = {
    high: {
      label: "AI Handled",
      color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      icon: "✓",
    },
    medium: {
      label: "Review Suggested",
      color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      icon: "~",
    },
    low: {
      label: "Needs Attention",
      color: "bg-red-500/20 text-red-400 border-red-500/30",
      icon: "!",
    },
  };

  const c = config[level];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${c.color}`}
      title={`AI confidence: ${Math.round(score * 100)}%`}
    >
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}
```

- [ ] **Step 2: Add badge to ConversationPanel message display**

In `frontend/src/components/agent/ConversationPanel.tsx`, import the badge and render it next to AI messages:

```tsx
import { AIConfidenceBadge } from '../dashboard/AIConfidenceBadge';

// In the message rendering loop, for AI messages, add after the message content:
{message.sender_type === 'ai' && (
  <AIConfidenceBadge
    score={message.confidence_score}
    level={message.confidence_level}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add frontend/src/components/dashboard/AIConfidenceBadge.tsx frontend/src/components/agent/ConversationPanel.tsx
git commit -m "feat: add AI confidence badges to conversation panel messages"
```

---

## Task 10: Frontend - Channel Icons and Status Badges

**Files:**
- Create: `frontend/src/components/inbox/ChannelIcon.tsx`
- Create: `frontend/src/components/dashboard/ConversationStatusBadge.tsx`
- Modify: `frontend/src/components/agent/ConversationList.tsx`

- [ ] **Step 1: Create channel icon component**

Create `frontend/src/components/inbox/ChannelIcon.tsx`:

```tsx
interface ChannelIconProps {
  channel: "chat" | "email" | "sms" | "phone";
  size?: number;
}

export function ChannelIcon({ channel, size = 16 }: ChannelIconProps) {
  const icons: Record<string, string> = {
    chat: "💬",
    email: "📧",
    sms: "📱",
    phone: "📞",
  };

  return (
    <span
      className="inline-flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.75 }}
      title={channel}
      role="img"
      aria-label={`${channel} channel`}
    >
      {icons[channel] || "💬"}
    </span>
  );
}
```

- [ ] **Step 2: Create status badge component**

Create `frontend/src/components/dashboard/ConversationStatusBadge.tsx`:

```tsx
interface ConversationStatusBadgeProps {
  status: "open" | "pending" | "resolved" | "closed";
  aiHandled?: boolean;
}

export function ConversationStatusBadge({ status, aiHandled }: ConversationStatusBadgeProps) {
  const config: Record<string, { label: string; color: string }> = {
    open: { label: "Open", color: "bg-blue-500/20 text-blue-400" },
    pending: { label: "Pending", color: "bg-amber-500/20 text-amber-400" },
    resolved: { label: "Resolved", color: "bg-emerald-500/20 text-emerald-400" },
    closed: { label: "Closed", color: "bg-zinc-500/20 text-zinc-400" },
  };

  const c = config[status] || config.open;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${c.color}`}>
      {aiHandled && status === "resolved" ? "AI Resolved" : c.label}
    </span>
  );
}
```

- [ ] **Step 3: Add to conversation list**

In `frontend/src/components/agent/ConversationList.tsx`, import and add channel icons and status badges to each conversation row.

- [ ] **Step 4: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add frontend/src/components/inbox/ChannelIcon.tsx frontend/src/components/dashboard/ConversationStatusBadge.tsx frontend/src/components/agent/ConversationList.tsx
git commit -m "feat: add channel icons and conversation status badges to inbox"
```

---

## Task 11: Frontend - Onboarding Wizard

**Files:**
- Create: `frontend/src/app/onboarding/page.tsx`
- Create: `frontend/src/components/onboarding/BusinessBasics.tsx`
- Create: `frontend/src/components/onboarding/ServicesSetup.tsx`
- Create: `frontend/src/components/onboarding/FAQBuilder.tsx`
- Create: `frontend/src/components/onboarding/ChannelSetup.tsx`
- Create: `frontend/src/components/onboarding/TestConversation.tsx`
- Create: `frontend/src/components/onboarding/GoLive.tsx`
- Create: `frontend/src/components/onboarding/OnboardingProgress.tsx`
- Create: `frontend/src/lib/onboarding-api.ts`

This is a large task. Each step creates one file.

- [ ] **Step 1: Create onboarding API client**

Create `frontend/src/lib/onboarding-api.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function onboardingRequest(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${API_BASE}/api/v1/onboarding${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(`Onboarding API error: ${res.status}`);
  return res.json();
}

export async function getIndustryDefaults(industry: string) {
  return onboardingRequest(`/industry-defaults/${industry}`);
}

export async function saveBusinessInfo(data: {
  business_name: string;
  industry: string;
  phone?: string;
  address?: string;
  website?: string;
  timezone?: string;
}) {
  return onboardingRequest("/business-info", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function saveServices(services: Array<{
  name: string;
  description?: string;
  price_min?: number;
  price_max?: number;
  duration_minutes?: number;
}>) {
  return onboardingRequest("/services", {
    method: "POST",
    body: JSON.stringify({ services }),
  });
}

export async function saveFAQs(items: Array<{
  question: string;
  answer: string;
  category?: string;
}>) {
  return onboardingRequest("/faq", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function saveChannels(data: {
  enable_chat: boolean;
  enable_email: boolean;
  enable_phone: boolean;
  enable_sms: boolean;
}) {
  return onboardingRequest("/channels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function completeOnboarding() {
  return onboardingRequest("/complete", { method: "POST" });
}
```

- [ ] **Step 2: Create progress indicator**

Create `frontend/src/components/onboarding/OnboardingProgress.tsx`:

```tsx
const STEPS = [
  { num: 1, label: "Business Basics" },
  { num: 2, label: "Services & Pricing" },
  { num: 3, label: "FAQs" },
  { num: 4, label: "Channels" },
  { num: 5, label: "Test Your AI" },
  { num: 6, label: "Go Live" },
];

interface OnboardingProgressProps {
  currentStep: number;
}

export function OnboardingProgress({ currentStep }: OnboardingProgressProps) {
  return (
    <div className="flex items-center justify-between w-full max-w-2xl mx-auto mb-8">
      {STEPS.map((step, i) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step.num < currentStep ? "bg-emerald-500 text-white" : ""}
                ${step.num === currentStep ? "bg-blue-500 text-white ring-2 ring-blue-400" : ""}
                ${step.num > currentStep ? "bg-zinc-700 text-zinc-400" : ""}
              `}
            >
              {step.num < currentStep ? "✓" : step.num}
            </div>
            <span className={`text-xs mt-1 ${step.num <= currentStep ? "text-white" : "text-zinc-500"}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`h-0.5 w-12 mx-2 ${
                step.num < currentStep ? "bg-emerald-500" : "bg-zinc-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Create each step component (BusinessBasics, ServicesSetup, FAQBuilder, ChannelSetup, TestConversation, GoLive)**

Each component follows the same pattern: a form that collects data, validates it, and calls `onNext()` with the data. They receive `onNext` and `data` props from the parent page.

These are standard React form components. The key implementation details:

- `BusinessBasics.tsx`: Industry dropdown triggers `getIndustryDefaults()` to pre-populate steps 2 & 3
- `ServicesSetup.tsx`: Editable list of services with add/remove, pre-populated from industry defaults
- `FAQBuilder.tsx`: Editable list of Q&A pairs, pre-populated from industry defaults
- `ChannelSetup.tsx`: Toggle switches for each channel. Phone/SMS show "Coming in Phase 2" notice
- `TestConversation.tsx`: Embedded ChatWidget pointed at the business's own tenant for live testing
- `GoLive.tsx`: Summary of what was set up, widget embed code, next steps

- [ ] **Step 4: Create main onboarding page**

Create `frontend/src/app/onboarding/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { BusinessBasics } from "@/components/onboarding/BusinessBasics";
import { ServicesSetup } from "@/components/onboarding/ServicesSetup";
import { FAQBuilder } from "@/components/onboarding/FAQBuilder";
import { ChannelSetup } from "@/components/onboarding/ChannelSetup";
import { TestConversation } from "@/components/onboarding/TestConversation";
import { GoLive } from "@/components/onboarding/GoLive";
import {
  saveBusinessInfo,
  saveServices,
  saveFAQs,
  saveChannels,
  completeOnboarding,
  getIndustryDefaults,
} from "@/lib/onboarding-api";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Record<string, any>>({});
  const [industryDefaults, setIndustryDefaults] = useState<any>(null);

  const handleStep1 = async (basics: any) => {
    await saveBusinessInfo(basics);
    const defaults = await getIndustryDefaults(basics.industry);
    setIndustryDefaults(defaults);
    setData({ ...data, basics });
    setStep(2);
  };

  const handleStep2 = async (services: any[]) => {
    await saveServices(services);
    setData({ ...data, services });
    setStep(3);
  };

  const handleStep3 = async (faqs: any[]) => {
    await saveFAQs(faqs);
    setData({ ...data, faqs });
    setStep(4);
  };

  const handleStep4 = async (channels: any) => {
    await saveChannels(channels);
    setData({ ...data, channels });
    setStep(5);
  };

  const handleStep5 = () => {
    setStep(6);
  };

  const handleStep6 = async () => {
    const result = await completeOnboarding();
    setData({ ...data, result });
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-2">Set Up Your AI Assistant</h1>
        <p className="text-zinc-400 text-center mb-8">
          {step <= 3 ? "Tell us about your business so your AI knows how to help your customers." : ""}
          {step === 4 ? "Choose how customers can reach you." : ""}
          {step === 5 ? "Try talking to your AI to see how it works." : ""}
          {step === 6 ? "You're all set!" : ""}
        </p>

        <OnboardingProgress currentStep={step} />

        {step === 1 && <BusinessBasics onNext={handleStep1} />}
        {step === 2 && <ServicesSetup onNext={handleStep2} defaults={industryDefaults?.services} />}
        {step === 3 && <FAQBuilder onNext={handleStep3} defaults={industryDefaults?.faqs} />}
        {step === 4 && <ChannelSetup onNext={handleStep4} />}
        {step === 5 && <TestConversation onNext={handleStep5} />}
        {step === 6 && <GoLive data={data} onComplete={handleStep6} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add frontend/src/app/onboarding/ frontend/src/components/onboarding/ frontend/src/lib/onboarding-api.ts
git commit -m "feat: add 6-step onboarding wizard with industry-specific defaults"
```

---

## Task 12: Update Dashboard Home with Summary View

**Files:**
- Create: `frontend/src/components/dashboard/SummaryCard.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Create summary card component**

Create `frontend/src/components/dashboard/SummaryCard.tsx`:

```tsx
interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "green" | "yellow" | "red" | "blue";
}

export function SummaryCard({ title, value, subtitle, trend, trendValue, color = "blue" }: SummaryCardProps) {
  const colors = {
    green: "border-emerald-500/30",
    yellow: "border-amber-500/30",
    red: "border-red-500/30",
    blue: "border-blue-500/30",
  };

  const trendColors = {
    up: "text-emerald-400",
    down: "text-red-400",
    neutral: "text-zinc-400",
  };

  return (
    <div className={`bg-zinc-800 rounded-lg p-4 border ${colors[color]}`}>
      <p className="text-sm text-zinc-400">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      {trend && trendValue && (
        <p className={`text-xs mt-1 ${trendColors[trend]}`}>
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard home page**

Update `frontend/src/app/dashboard/page.tsx` to show:
- 4 summary cards: Conversations Today, AI Resolution Rate, Avg Response Time, Customer Satisfaction
- "Needs Attention" section listing conversations with low confidence
- "Recent Activity" feed showing latest conversations
- Quick actions: "Add FAQ", "View Inbox", "Settings"

- [ ] **Step 3: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add frontend/src/components/dashboard/SummaryCard.tsx frontend/src/app/dashboard/page.tsx
git commit -m "feat: redesign dashboard home with summary cards and AI health indicators"
```

---

## Task 13: Integration Test - End-to-End Chat with RAG

**Files:**
- Create: `backend/tests/test_e2e_chat.py`

- [ ] **Step 1: Write end-to-end test**

Create `backend/tests/test_e2e_chat.py`:

```python
"""
End-to-end test for the chat flow with RAG:
1. Create tenant and user
2. Add KB articles (triggers embedding)
3. Customer sends a message via widget
4. AI responds using RAG context
5. Response includes confidence score
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


class TestE2EChatWithRAG:
    @pytest.mark.asyncio
    @patch("app.services.embedding_service.openai_client")
    @patch("app.services.ai_service.AIService.generate_response")
    async def test_chat_message_returns_confidence(self, mock_generate, mock_openai):
        """Verify that a chat message response includes a confidence score."""
        from app.services.ai_service import AIResponse

        mock_generate.return_value = AIResponse(
            content="We offer bath and full groom services. Small dogs start at $40.",
            tool_calls=[],
            requires_action=False,
            should_escalate=False,
            confidence_score=0.85,
            tokens_used=150,
            estimated_cost=0.0001,
            provider="openai",
            model="gpt-4o-mini",
        )

        response = await mock_generate("How much does grooming cost?")

        assert response.confidence_score == 0.85
        assert response.content is not None
        assert "groom" in response.content.lower()

    def test_confidence_level_mapping(self):
        from app.schemas.conversation import get_confidence_level

        assert get_confidence_level(0.9) == "high"
        assert get_confidence_level(0.7) == "medium"
        assert get_confidence_level(0.3) == "low"
        assert get_confidence_level(None) is None
```

- [ ] **Step 2: Run test**

```bash
cd C:/Users/0xCyb/Projects/cybinai/backend
python -m pytest tests/test_e2e_chat.py -v
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add backend/tests/test_e2e_chat.py
git commit -m "test: add end-to-end chat flow test with RAG and confidence scoring"
```

---

## Task 14: Update .env and Docker for pgvector

**Files:**
- Modify: `docker-compose.yml`
- Modify: `backend/.env`

- [ ] **Step 1: Update docker-compose for pgvector image**

In `docker-compose.yml`, change the postgres service image from `postgres:16` to `pgvector/pgvector:pg16`:

```yaml
  postgres:
    image: pgvector/pgvector:pg16
```

This image includes pgvector extension pre-installed.

- [ ] **Step 2: Add OpenAI API key to .env**

In `backend/.env`, add:

```
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_CHAT_MODEL=gpt-4o-mini
LLM_PROVIDER=openai
```

- [ ] **Step 3: Commit (do NOT commit .env - only docker-compose)**

```bash
cd C:/Users/0xCyb/Projects/cybinai
git add docker-compose.yml
git commit -m "feat: switch to pgvector/pgvector:pg16 image for vector search support"
```

---

## Summary of Phase 1 Tasks

| Task | Description | Files Changed |
|------|------------|--------------|
| 1 | pgvector extension + embeddings table | 2 files |
| 2 | Embedding service for RAG | 3 files |
| 3 | Upgrade AI to GPT-4o Mini + RAG + confidence | 6 files |
| 4 | AI capability tiers (backend) | 6 files |
| 5 | Notification preferences | 6 files |
| 6 | Onboarding wizard (backend) | 5 files |
| 7 | KB embedding auto-generation | 1 file |
| 8 | Confidence through chat flow | 4 files |
| 9 | Confidence badge (frontend) | 2 files |
| 10 | Channel icons + status badges (frontend) | 3 files |
| 11 | Onboarding wizard (frontend) | 10 files |
| 12 | Dashboard home summary | 2 files |
| 13 | End-to-end integration test | 1 file |
| 14 | Docker + env updates | 2 files |

**Total: 14 tasks, ~53 files created or modified**

After Phase 1, you'll have a working platform with:
- AI answering questions using RAG-powered knowledge base
- Confidence scoring on every response
- Progressive capability tiers (1/2/3)
- 6-step onboarding wizard with grooming/HVAC/dental presets
- Unified inbox with channel icons and status badges
- Notification preferences (calm/regular/all)
- Dashboard home with summary metrics
- Demo-ready for testing with your mom's grooming business

---

## What Comes Next

- **Phase 2 Plan:** `2026-03-25-phase2-phone-sms.md` - Retell.ai voice, Twilio SMS, call transcripts, appointment reminders
- **Phase 3 Plan:** `2026-03-25-phase3-billing-integrations.md` - Stripe, Google Calendar, CSV import, review automation
- **Phase 4 Plan:** `2026-03-25-phase4-migration-polish.md` - Migration wizard, Zendesk/Freshdesk import, security audit, deployment

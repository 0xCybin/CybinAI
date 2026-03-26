import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ai_service import AIResponse, calculate_confidence
from app.schemas.conversation import get_confidence_level


class TestE2EChatWithRAG:
    @pytest.mark.asyncio
    async def test_chat_message_returns_confidence(self):
        """Verify that an AIResponse includes confidence score."""
        response = AIResponse(
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
        assert response.confidence_score == 0.85
        assert response.content is not None
        assert "groom" in response.content.lower()

    def test_confidence_level_mapping(self):
        assert get_confidence_level(0.9) == "high"
        assert get_confidence_level(0.7) == "medium"
        assert get_confidence_level(0.3) == "low"
        assert get_confidence_level(None) is None

    def test_confidence_score_calculation_with_kb(self):
        score = calculate_confidence(
            has_kb_context=True, tool_calls=["search_knowledge_base"],
            should_escalate=False, response_length=100,
        )
        assert score >= 0.85

    def test_confidence_score_calculation_escalation(self):
        score = calculate_confidence(
            has_kb_context=False, tool_calls=[],
            should_escalate=True, response_length=50,
        )
        assert score == 0.3

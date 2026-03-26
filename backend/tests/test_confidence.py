import pytest
from app.services.ai_service import calculate_confidence


class TestConfidenceScoring:
    def test_high_confidence_when_kb_match_and_no_escalation(self):
        score = calculate_confidence(
            has_kb_context=True, tool_calls=[], should_escalate=False, response_length=50,
        )
        assert score >= 0.8

    def test_medium_confidence_when_no_kb_context(self):
        score = calculate_confidence(
            has_kb_context=False, tool_calls=[], should_escalate=False, response_length=50,
        )
        assert 0.5 <= score < 0.8

    def test_low_confidence_when_escalating(self):
        score = calculate_confidence(
            has_kb_context=False, tool_calls=[], should_escalate=True, response_length=50,
        )
        assert score < 0.5

    def test_lower_confidence_for_very_short_responses(self):
        score_short = calculate_confidence(
            has_kb_context=False, tool_calls=[], should_escalate=False, response_length=5,
        )
        score_normal = calculate_confidence(
            has_kb_context=False, tool_calls=[], should_escalate=False, response_length=50,
        )
        assert score_short < score_normal

    def test_higher_confidence_with_successful_tool_call(self):
        score = calculate_confidence(
            has_kb_context=True, tool_calls=["search_knowledge_base"], should_escalate=False, response_length=80,
        )
        assert score >= 0.85

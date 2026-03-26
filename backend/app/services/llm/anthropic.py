"""
Anthropic/Claude LLM Provider

Uses the Anthropic Messages API directly via httpx.
API Docs: https://docs.anthropic.com/en/docs/build-with-claude/overview

Pricing (as of March 2026):
- claude-haiku-4-5: $0.80/1M input, $4.00/1M output
- claude-sonnet-4-6: $3.00/1M input, $15.00/1M output
- claude-opus-4-6: $15.00/1M input, $75.00/1M output
"""

import json
import logging
from typing import Optional

import httpx

from app.core.config import settings
from app.services.llm.base import (
    LLMProvider,
    LLMMessage,
    LLMResponse,
    LLMTool,
    LLMToolCall,
    MessageRole,
)

logger = logging.getLogger(__name__)


class AnthropicProvider(LLMProvider):
    """Anthropic Claude API provider."""

    provider_name = "anthropic"

    BASE_URL = "https://api.anthropic.com/v1"
    API_VERSION = "2023-06-01"

    PRICING = {
        "claude-haiku-4-5-20251001": {"input": 0.80, "output": 4.00},
        "claude-sonnet-4-6-20250514": {"input": 3.00, "output": 15.00},
        "claude-opus-4-6-20250514": {"input": 15.00, "output": 75.00},
    }

    # Aliases for convenience
    MODEL_ALIASES = {
        "haiku": "claude-haiku-4-5-20251001",
        "sonnet": "claude-sonnet-4-6-20250514",
        "opus": "claude-opus-4-6-20250514",
        "claude-haiku": "claude-haiku-4-5-20251001",
        "claude-sonnet": "claude-sonnet-4-6-20250514",
        "claude-opus": "claude-opus-4-6-20250514",
    }

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        raw_model = model or settings.ANTHROPIC_MODEL
        self.model = self.MODEL_ALIASES.get(raw_model, raw_model)

        if not self.api_key:
            raise ValueError("Anthropic API key not configured. Set ANTHROPIC_API_KEY.")

    async def complete(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[LLMTool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> LLMResponse:
        """Call Anthropic Messages API."""

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": self.API_VERSION,
            "Content-Type": "application/json",
        }

        # Anthropic separates system prompt from messages
        system_prompt = None
        api_messages = []

        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content
            else:
                api_messages.append({
                    "role": "user" if msg.role == MessageRole.USER else "assistant",
                    "content": msg.content,
                })

        # Anthropic requires alternating user/assistant messages
        # Merge consecutive same-role messages
        merged = []
        for m in api_messages:
            if merged and merged[-1]["role"] == m["role"]:
                merged[-1]["content"] += "\n\n" + m["content"]
            else:
                merged.append(m)
        api_messages = merged

        # Ensure first message is from user (Anthropic requirement)
        if api_messages and api_messages[0]["role"] != "user":
            api_messages.insert(0, {"role": "user", "content": "Hello"})

        payload = {
            "model": self.model,
            "messages": api_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if system_prompt:
            payload["system"] = system_prompt

        # Add tools in Anthropic format
        if tools:
            payload["tools"] = [self._tool_to_anthropic_format(t) for t in tools]

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/messages",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

            return self._parse_response(data)

        except httpx.HTTPStatusError as e:
            logger.error(f"Anthropic API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Anthropic request failed: {e}")
            raise

    def _tool_to_anthropic_format(self, tool: LLMTool) -> dict:
        """Convert LLMTool to Anthropic tool format."""
        return {
            "name": tool.name,
            "description": tool.description,
            "input_schema": tool.parameters,
        }

    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse Anthropic Messages API response."""
        content_text = ""
        tool_calls = []

        for block in data.get("content", []):
            if block["type"] == "text":
                content_text += block["text"]
            elif block["type"] == "tool_use":
                tool_calls.append(LLMToolCall(
                    id=block["id"],
                    name=block["name"],
                    arguments=block.get("input", {}),
                ))

        usage = data.get("usage", {})
        input_tokens = usage.get("input_tokens", 0)
        output_tokens = usage.get("output_tokens", 0)

        pricing = self.PRICING.get(self.model, {"input": 3.00, "output": 15.00})
        estimated_cost = (
            (input_tokens / 1_000_000) * pricing["input"] +
            (output_tokens / 1_000_000) * pricing["output"]
        )

        return LLMResponse(
            content=content_text or None,
            tool_calls=tool_calls,
            finish_reason=data.get("stop_reason", "end_turn"),
            prompt_tokens=input_tokens,
            completion_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            estimated_cost=estimated_cost,
            provider=self.provider_name,
            model=self.model,
        )

    async def health_check(self) -> bool:
        """Quick check that the API is accessible."""
        try:
            response = await self.complete(
                messages=[LLMMessage(role=MessageRole.USER, content="Hi")],
                max_tokens=5,
            )
            return response.content is not None
        except Exception as e:
            logger.warning(f"Anthropic health check failed: {e}")
            return False

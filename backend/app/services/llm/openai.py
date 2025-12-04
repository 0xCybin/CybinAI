"""
OpenAI LLM Provider

For production use when switching from DeepSeek.
API Docs: https://platform.openai.com/docs/api-reference

Pricing (as of Dec 2024):
- gpt-4o-mini: $0.15/1M input, $0.60/1M output
- gpt-4o: $2.50/1M input, $10/1M output
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
)

logger = logging.getLogger(__name__)


class OpenAIProvider(LLMProvider):
    """OpenAI API provider."""
    
    provider_name = "openai"
    
    BASE_URL = "https://api.openai.com/v1"
    DEFAULT_MODEL = "gpt-4o-mini"
    
    # Pricing per 1M tokens (USD) for gpt-4o-mini
    PRICING = {
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4-turbo": {"input": 10.00, "output": 30.00},
    }
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.model = model or self.DEFAULT_MODEL
        
        if not self.api_key:
            raise ValueError("OpenAI API key not configured. Set OPENAI_API_KEY.")
    
    async def complete(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[LLMTool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> LLMResponse:
        """Call OpenAI chat completions API."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        # Add tools if provided
        if tools:
            payload["tools"] = [t.to_openai_format() for t in tools]
            payload["tool_choice"] = "auto"
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/chat/completions",
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()
                
            return self._parse_response(data)
            
        except httpx.HTTPStatusError as e:
            logger.error(f"OpenAI API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"OpenAI request failed: {e}")
            raise
    
    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse OpenAI API response."""
        choice = data["choices"][0]
        message = choice["message"]
        usage = data.get("usage", {})
        
        # Extract tool calls if present
        tool_calls = []
        if "tool_calls" in message and message["tool_calls"]:
            for tc in message["tool_calls"]:
                try:
                    arguments = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    arguments = {}
                
                tool_calls.append(LLMToolCall(
                    id=tc["id"],
                    name=tc["function"]["name"],
                    arguments=arguments,
                ))
        
        # Calculate cost
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        
        pricing = self.PRICING.get(self.model, self.PRICING["gpt-4o-mini"])
        estimated_cost = (
            (prompt_tokens / 1_000_000) * pricing["input"] +
            (completion_tokens / 1_000_000) * pricing["output"]
        )
        
        return LLMResponse(
            content=message.get("content"),
            tool_calls=tool_calls,
            finish_reason=choice.get("finish_reason", "stop"),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            estimated_cost=estimated_cost,
            provider=self.provider_name,
            model=self.model,
        )
    
    async def health_check(self) -> bool:
        """Quick check that the API is accessible."""
        try:
            response = await self.complete(
                messages=[LLMMessage(role="user", content="Hi")],
                max_tokens=5,
            )
            return response.content is not None
        except Exception as e:
            logger.warning(f"OpenAI health check failed: {e}")
            return False
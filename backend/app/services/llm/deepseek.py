"""
DeepSeek LLM Provider

API Docs: https://api-docs.deepseek.com/
Pricing (as of Dec 2024):
- deepseek-chat (V3): $0.27/1M input, $1.10/1M output
- Cached input: $0.07/1M (75% discount)
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


class DeepSeekProvider(LLMProvider):
    """DeepSeek API provider."""
    
    provider_name = "deepseek"
    
    BASE_URL = "https://api.deepseek.com/v1"
    DEFAULT_MODEL = "deepseek-chat"
    
    # Pricing per 1M tokens (USD)
    INPUT_COST_PER_M = 0.27
    OUTPUT_COST_PER_M = 1.10
    CACHED_INPUT_COST_PER_M = 0.07
    
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.DEEPSEEK_API_KEY
        self.model = model or self.DEFAULT_MODEL
        
        if not self.api_key:
            raise ValueError("DeepSeek API key not configured. Set DEEPSEEK_API_KEY.")
    
    async def complete(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[LLMTool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> LLMResponse:
        """Call DeepSeek chat completions API."""
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        
        payload = {
            "model": self.model,
            "messages": [m.to_dict() for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": False,
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
            logger.error(f"DeepSeek API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"DeepSeek request failed: {e}")
            raise
    
    def _parse_response(self, data: dict) -> LLMResponse:
        """Parse DeepSeek API response."""
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
        
        # Check for cached tokens (DeepSeek specific)
        cached_tokens = usage.get("prompt_cache_hit_tokens", 0)
        uncached_input = prompt_tokens - cached_tokens
        
        estimated_cost = (
            (uncached_input / 1_000_000) * self.INPUT_COST_PER_M +
            (cached_tokens / 1_000_000) * self.CACHED_INPUT_COST_PER_M +
            (completion_tokens / 1_000_000) * self.OUTPUT_COST_PER_M
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
            # Use a minimal request to check connectivity
            response = await self.complete(
                messages=[LLMMessage(role="user", content="Hi")],
                max_tokens=5,
            )
            return response.content is not None
        except Exception as e:
            logger.warning(f"DeepSeek health check failed: {e}")
            return False
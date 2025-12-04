"""
LLM Provider Abstraction Layer

Supports multiple LLM backends with easy switching via configuration.
Currently implemented: DeepSeek, OpenAI
Future: Anthropic, local models (Ollama)
"""

from app.services.llm.base import (
    LLMProvider,
    LLMMessage,
    LLMResponse,
    LLMTool,
    LLMToolCall,
)
from app.services.llm.factory import get_llm_provider

__all__ = [
    "LLMProvider",
    "LLMMessage",
    "LLMResponse",
    "LLMTool",
    "LLMToolCall",
    "get_llm_provider",
]
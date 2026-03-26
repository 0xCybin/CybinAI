"""
LLM Provider Abstraction Layer

Supports multiple LLM backends with easy switching via configuration.
Implemented: DeepSeek, OpenAI, Anthropic (Claude)
Future: local models (Ollama)

Switch providers by setting LLM_PROVIDER env var to: deepseek, openai, or anthropic
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
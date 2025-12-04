"""
Base classes for LLM provider abstraction.

This allows swapping between DeepSeek, OpenAI, Anthropic, or local models
with a single configuration change.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


@dataclass
class LLMMessage:
    """A message in the conversation."""
    role: MessageRole
    content: str
    name: Optional[str] = None  # For tool messages
    tool_call_id: Optional[str] = None  # For tool results
    
    def to_dict(self) -> dict:
        """Convert to API-compatible dict."""
        d = {"role": self.role.value, "content": self.content}
        if self.name:
            d["name"] = self.name
        if self.tool_call_id:
            d["tool_call_id"] = self.tool_call_id
        return d


@dataclass
class LLMTool:
    """A tool/function the LLM can call."""
    name: str
    description: str
    parameters: dict  # JSON Schema
    
    def to_openai_format(self) -> dict:
        """Convert to OpenAI/DeepSeek function format."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            }
        }


@dataclass
class LLMToolCall:
    """A tool call made by the LLM."""
    id: str
    name: str
    arguments: dict  # Parsed JSON arguments


@dataclass
class LLMResponse:
    """Response from an LLM completion."""
    content: Optional[str] = None
    tool_calls: list[LLMToolCall] = field(default_factory=list)
    finish_reason: str = "stop"
    
    # Usage tracking
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    
    # Cost tracking (in USD)
    estimated_cost: float = 0.0
    
    # Provider info
    provider: str = ""
    model: str = ""
    
    @property
    def has_tool_calls(self) -> bool:
        return len(self.tool_calls) > 0


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    
    Implement this for each provider (DeepSeek, OpenAI, etc.)
    """
    
    provider_name: str = "base"
    
    @abstractmethod
    async def complete(
        self,
        messages: list[LLMMessage],
        tools: Optional[list[LLMTool]] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
        **kwargs,
    ) -> LLMResponse:
        """
        Generate a completion from the LLM.
        
        Args:
            messages: Conversation history
            tools: Available tools/functions
            temperature: Randomness (0-2)
            max_tokens: Maximum response length
            
        Returns:
            LLMResponse with content and/or tool calls
        """
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is available."""
        pass
    
    def estimate_tokens(self, text: str) -> int:
        """Rough token estimation (4 chars ≈ 1 token)."""
        return len(text) // 4
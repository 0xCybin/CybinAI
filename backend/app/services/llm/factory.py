"""
LLM Provider Factory

Gets the appropriate LLM provider based on configuration.
Switch providers by changing LLM_PROVIDER env var.
"""

import logging
from typing import Optional

from app.core.config import settings
from app.services.llm.base import LLMProvider

logger = logging.getLogger(__name__)

# Provider registry
_providers: dict[str, type[LLMProvider]] = {}


def register_provider(name: str, provider_class: type[LLMProvider]):
    """Register a provider class."""
    _providers[name] = provider_class


def get_llm_provider(
    provider_name: Optional[str] = None,
    **kwargs,
) -> LLMProvider:
    """
    Get an LLM provider instance.
    
    Args:
        provider_name: Override the configured provider
        **kwargs: Passed to provider constructor (api_key, model, etc.)
        
    Returns:
        Configured LLMProvider instance
        
    Raises:
        ValueError: If provider is not supported
    """
    name = provider_name or settings.LLM_PROVIDER
    
    # Lazy import to avoid circular dependencies
    if not _providers:
        _register_all_providers()
    
    if name not in _providers:
        available = ", ".join(_providers.keys())
        raise ValueError(
            f"Unknown LLM provider: {name}. Available: {available}"
        )
    
    logger.info(f"Initializing LLM provider: {name}")
    return _providers[name](**kwargs)


def _register_all_providers():
    """Register all available providers."""
    from app.services.llm.deepseek import DeepSeekProvider
    from app.services.llm.openai import OpenAIProvider
    
    register_provider("deepseek", DeepSeekProvider)
    register_provider("openai", OpenAIProvider)
    
    # Future providers:
    # register_provider("anthropic", AnthropicProvider)
    # register_provider("ollama", OllamaProvider)


def get_available_providers() -> list[str]:
    """List available provider names."""
    if not _providers:
        _register_all_providers()
    return list(_providers.keys())
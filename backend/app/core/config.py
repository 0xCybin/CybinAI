"""
Application Configuration

Loads settings from environment variables with sensible defaults.
Add new settings here as the app grows.
"""

from functools import lru_cache
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ==================
    # Application
    # ==================
    APP_NAME: str = "CybinAI"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "debug"
    API_V1_PREFIX: str = "/api/v1"

    # ==================
    # Database
    # ==================
    DATABASE_URL: str = "postgresql+asyncpg://cybinai:cybinai_local_dev@localhost:5432/cybinai"

    # ==================
    # Redis
    # ==================
    REDIS_URL: str = "redis://localhost:6379"

    # ==================
    # Authentication
    # ==================
    JWT_SECRET: str = "change-this-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    JWT_EXPIRATION_MINUTES: int = 30  # Alias for compatibility
    JWT_REFRESH_EXPIRATION_DAYS: int = 7  # Alias for compatibility

    # ==================
    # LLM / AI Settings
    # ==================
    LLM_PROVIDER: str = "deepseek"

    # DeepSeek
    DEEPSEEK_API_KEY: Optional[str] = None
    DEEPSEEK_MODEL: str = "deepseek-chat"
    DEEPSEEK_BASE_URL: str = "https://api.deepseek.com"

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None

    # AI behavior settings
    AI_MAX_TOKENS: int = 500
    AI_TEMPERATURE: float = 0.7
    AI_CONVERSATION_HISTORY_LIMIT: int = 10

    # ==================
    # CORS
    # ==================
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # ==================
    # Server
    # ==================
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    # ==================
    # Frontend URLs
    # ==================
    NEXT_PUBLIC_API_URL: str = "http://localhost:8000"
    NEXT_PUBLIC_WS_URL: str = "ws://localhost:8000"

    # ==================
    # Integrations - Jobber
    # ==================
    JOBBER_CLIENT_ID: Optional[str] = None
    JOBBER_CLIENT_SECRET: Optional[str] = None
    JOBBER_REDIRECT_URI: str = "http://localhost:8000/api/v1/integrations/jobber/callback"

    # ==================
    # Email (Phase 2)
    # ==================
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@cybinai.com"

    # ==================
    # Encryption
    # ==================
    ENCRYPTION_KEY: str = "your-32-byte-encryption-key-here"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# Global settings instance
settings = get_settings()
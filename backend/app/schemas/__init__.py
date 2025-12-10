"""Pydantic schemas for API request/response validation."""

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    TokenRefresh,
    PasswordChange,
    TokenPair,
    UserResponse,
    AuthResponse,
    TenantInfo,
    MeResponse,
)

from app.schemas.knowledge_base import (
    KBArticleCreate,
    KBArticleUpdate,
    KBArticleResponse,
    KBArticleListResponse,
    KBSearchRequest,
    KBSearchResponse,
    KBSearchResult,
    KBCategoryListResponse,
)

__all__ = [
    # Auth
    "UserRegister",
    "UserLogin",
    "TokenRefresh",
    "PasswordChange",
    "TokenPair",
    "UserResponse",
    "AuthResponse",
    "TenantInfo",
    "MeResponse",
    # Knowledge Base
    "KBArticleCreate",
    "KBArticleUpdate",
    "KBArticleResponse",
    "KBArticleListResponse",
    "KBSearchRequest",
    "KBSearchResponse",
    "KBSearchResult",
    "KBCategoryListResponse",
]
"""
Knowledge Base Pydantic Schemas
For API request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


# =============================================================================
# Request Schemas
# =============================================================================

class KBArticleCreate(BaseModel):
    """Schema for creating a new KB article."""
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = Field(default_factory=list)
    published: Optional[bool] = True
    metadata: Optional[dict] = Field(default_factory=dict)


class KBArticleUpdate(BaseModel):
    """Schema for updating a KB article. All fields optional."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = None
    published: Optional[bool] = None
    metadata: Optional[dict] = None


class KBSearchRequest(BaseModel):
    """Schema for searching the knowledge base."""
    query: str = Field(..., min_length=1, max_length=500)
    category: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)


# =============================================================================
# Response Schemas
# =============================================================================

class KBArticleResponse(BaseModel):
    """Schema for KB article response."""
    id: UUID
    title: str
    content: str
    category: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    published: bool = True
    metadata: Optional[dict] = Field(default=None, alias="metadata_")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


class KBArticleListResponse(BaseModel):
    """Schema for paginated list of KB articles."""
    articles: List[KBArticleResponse]
    total: int
    limit: int
    offset: int


class KBSearchResult(BaseModel):
    """Schema for a single search result."""
    id: UUID
    title: str
    content: str
    category: Optional[str] = None
    score: float = Field(..., ge=0.0, le=1.0, description="Relevance score 0-1")


class KBSearchResponse(BaseModel):
    """Schema for search results."""
    results: List[KBSearchResult]
    query: str


class KBCategoryListResponse(BaseModel):
    """Schema for list of categories."""
    categories: List[str]
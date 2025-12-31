"""
Tag Pydantic Schemas
For API request/response validation.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Request Schemas
# =============================================================================

class TagCreate(BaseModel):
    """Schema for creating a new tag."""
    name: str = Field(..., min_length=1, max_length=50)
    color: str = Field(default="#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")
    description: Optional[str] = Field(None, max_length=255)


class TagUpdate(BaseModel):
    """Schema for updating a tag. All fields optional."""
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    description: Optional[str] = Field(None, max_length=255)


class TagAssign(BaseModel):
    """Schema for assigning a tag to a conversation."""
    tag_id: UUID


class TagBulkAssign(BaseModel):
    """Schema for assigning multiple tags at once."""
    tag_ids: List[UUID] = Field(..., min_length=1, max_length=20)


# =============================================================================
# Response Schemas
# =============================================================================

class TagResponse(BaseModel):
    """Tag response for API."""
    id: UUID
    name: str
    color: str
    description: Optional[str] = None
    conversation_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TagListResponse(BaseModel):
    """List of tags response."""
    tags: List[TagResponse]
    total: int


class ConversationTagResponse(BaseModel):
    """Tag assignment on a conversation."""
    id: UUID
    name: str
    color: str
    assigned_at: datetime
    assigned_by: Optional[UUID] = None
    assigned_by_name: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationTagsResponse(BaseModel):
    """All tags on a conversation."""
    conversation_id: UUID
    tags: List[ConversationTagResponse]


# =============================================================================
# Embedded in Conversation Responses
# =============================================================================

class TagBrief(BaseModel):
    """Minimal tag info for embedding in conversation responses."""
    id: UUID
    name: str
    color: str

    class Config:
        from_attributes = True
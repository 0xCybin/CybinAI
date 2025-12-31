"""
Internal Notes Pydantic Schemas
For API request/response validation.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Embedded Schemas
# =============================================================================

class NoteAuthor(BaseModel):
    """Author info embedded in note response."""
    id: UUID
    name: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    
    class Config:
        from_attributes = True


# =============================================================================
# Request Schemas
# =============================================================================

class InternalNoteCreate(BaseModel):
    """Schema for creating a new internal note."""
    content: str = Field(..., min_length=1, max_length=10000)
    mentions: Optional[List[UUID]] = Field(default_factory=list)


# =============================================================================
# Response Schemas
# =============================================================================

class InternalNoteResponse(BaseModel):
    """Internal note response for API."""
    id: UUID
    conversation_id: UUID
    author: NoteAuthor
    content: str
    mentions: List[UUID] = Field(default_factory=list)
    created_at: datetime
    
    class Config:
        from_attributes = True


class InternalNoteListResponse(BaseModel):
    """List of internal notes."""
    notes: List[InternalNoteResponse]
    total: int
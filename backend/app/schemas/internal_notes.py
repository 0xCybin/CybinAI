"""
Internal Notes Schemas
NEW FILE: backend/app/schemas/internal_notes.py

Pydantic schemas for internal notes - private agent collaboration
that is NEVER visible to customers.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Author Info (embedded in note responses)
# =============================================================================

class NoteAuthor(BaseModel):
    """Author information for display in notes."""
    id: UUID
    name: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


# =============================================================================
# Internal Note Schemas
# =============================================================================

class InternalNoteCreate(BaseModel):
    """Schema for creating an internal note."""
    content: str = Field(..., min_length=1, max_length=10000)
    mentions: List[UUID] = Field(default_factory=list)


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
    """List of internal notes for a conversation."""
    items: List[InternalNoteResponse]
    total: int
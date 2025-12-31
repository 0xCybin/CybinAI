"""
Conversation schemas for Agent Dashboard.
Updated to include tags support.
"""

from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import Optional, List

from app.schemas.tags import TagBrief
from app.schemas.internal_notes import InternalNoteResponse


# ============================================================================
# Customer schemas (embedded in conversation responses)
# ============================================================================

class CustomerInfo(BaseModel):
    """Customer information for display."""
    id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Message schemas
# ============================================================================

class MessageCreate(BaseModel):
    """Schema for creating a new message (agent reply)."""
    content: str = Field(..., min_length=1, max_length=10000)


class MessageResponse(BaseModel):
    """Message response for API."""
    id: UUID
    conversation_id: UUID
    sender_type: str  # customer, ai, agent, system
    sender_id: Optional[UUID] = None
    content: str
    metadata: dict = Field(default_factory=dict)
    created_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# Conversation schemas
# ============================================================================

class ConversationListItem(BaseModel):
    """Conversation item for list view (inbox)."""
    id: UUID
    customer: Optional[CustomerInfo] = None
    channel: str
    status: str  # open, pending, resolved, closed
    priority: str  # low, normal, high, urgent
    ai_handled: bool
    ai_confidence: Optional[float] = None
    assigned_to: Optional[UUID] = None
    assigned_agent_name: Optional[str] = None
    last_message_preview: Optional[str] = None
    last_message_at: Optional[datetime] = None
    message_count: int = 0
    tags: List[TagBrief] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ConversationDetail(BaseModel):
    """Full conversation detail with messages."""
    id: UUID
    tenant_id: UUID
    customer: Optional[CustomerInfo] = None
    channel: str
    status: str
    priority: str
    ai_handled: bool
    ai_confidence: Optional[float] = None
    assigned_to: Optional[UUID] = None
    assigned_agent_name: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    messages: List[MessageResponse] = Field(default_factory=list)
    internal_notes: List[InternalNoteResponse] = Field(default_factory=list)
    tags: List[TagBrief] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ConversationAssign(BaseModel):
    """Schema for assigning/claiming a conversation."""
    # If None, assigns to current user (self-claim)
    agent_id: Optional[UUID] = None


class ConversationStatusUpdate(BaseModel):
    """Schema for updating conversation status."""
    status: str  # open, pending, resolved, closed


class ConversationPriorityUpdate(BaseModel):
    """Schema for updating conversation priority."""
    priority: str  # low, normal, high, urgent


# ============================================================================
# List Response schema (matches existing endpoint)
# ============================================================================

class ConversationListResponse(BaseModel):
    """Paginated list of conversations."""
    items: List[ConversationListItem]
    total: int
    page: int
    page_size: int
    has_more: bool
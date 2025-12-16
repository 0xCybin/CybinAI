"""
Customer Management Pydantic Schemas
For API request/response validation.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime


# =============================================================================
# Request Schemas
# =============================================================================

class CustomerCreate(BaseModel):
    """Schema for creating a new customer manually."""
    name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    metadata: Optional[dict[str, Any]] = Field(default_factory=dict)
    external_ids: Optional[dict[str, str]] = Field(
        default_factory=dict,
        description="External system IDs, e.g., {'jobber': 'client_123'}"
    )


class CustomerUpdate(BaseModel):
    """Schema for updating a customer. All fields optional."""
    name: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=50)
    metadata: Optional[dict[str, Any]] = None
    external_ids: Optional[dict[str, str]] = None


# =============================================================================
# Response Schemas
# =============================================================================

class CustomerResponse(BaseModel):
    """Basic customer response for list views."""
    id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    conversation_count: int = 0
    last_contact_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomerListResponse(BaseModel):
    """Paginated list of customers."""
    customers: List[CustomerResponse]
    total: int
    limit: int
    offset: int


# =============================================================================
# Embedded Conversation Summary (for customer detail)
# =============================================================================

class ConversationSummary(BaseModel):
    """Minimal conversation info for embedding in customer detail."""
    id: UUID
    channel: str
    status: str
    subject: Optional[str] = None
    message_count: int = 0
    ai_handled: bool = True
    created_at: datetime
    updated_at: datetime
    last_message_preview: Optional[str] = None

    class Config:
        from_attributes = True


# =============================================================================
# Customer Detail (Full Profile)
# =============================================================================

class CustomerDetail(BaseModel):
    """Full customer profile with conversation history."""
    id: UUID
    tenant_id: UUID
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    external_ids: dict[str, str] = Field(default_factory=dict)
    metadata: Optional[dict[str, Any]] = Field(default=None, alias="metadata_")
    
    # Computed stats
    conversation_count: int = 0
    total_messages: int = 0
    first_contact_at: Optional[datetime] = None
    last_contact_at: Optional[datetime] = None
    
    # Recent conversations
    recent_conversations: List[ConversationSummary] = Field(default_factory=list)
    
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# =============================================================================
# Customer Conversations List
# =============================================================================

class CustomerConversationsResponse(BaseModel):
    """All conversations for a specific customer."""
    customer_id: UUID
    customer_name: Optional[str] = None
    conversations: List[ConversationSummary]
    total: int
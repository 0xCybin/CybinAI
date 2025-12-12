"""Pydantic schemas for chat/widget functionality."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import uuid


# ============================================================================
# Enums
# ============================================================================

class SenderType(str, Enum):
    CUSTOMER = "customer"
    AI = "ai"
    AGENT = "agent"
    SYSTEM = "system"


class ConversationStatus(str, Enum):
    OPEN = "open"
    PENDING = "pending"
    RESOLVED = "resolved"
    CLOSED = "closed"


# ============================================================================
# Widget Config
# ============================================================================

class WidgetBranding(BaseModel):
    """Widget branding configuration with all colors."""
    business_name: str
    logo_url: Optional[str] = None
    # All four colors from admin settings
    primary_color: str = "#D97706"
    secondary_color: str = "#92400E"
    background_color: str = "#1A1915"
    text_color: str = "#F5F5F4"
    # Messages
    welcome_message: str = "Hi! How can we help you today?"


class WidgetFeatures(BaseModel):
    show_branding: bool = True
    collect_email: bool = True
    collect_phone: bool = False
    show_powered_by: bool = True


class WidgetConfig(BaseModel):
    tenant_id: str
    branding: WidgetBranding
    features: WidgetFeatures


# ============================================================================
# Customer (for widget - anonymous or identified)
# ============================================================================

class CustomerInfo(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class StartConversationRequest(BaseModel):
    customer: Optional[CustomerInfo] = None
    initial_message: Optional[str] = None


# ============================================================================
# Messages
# ============================================================================

class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)


class SendMessageRequest(MessageBase):
    pass


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_type: SenderType
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Conversations
# ============================================================================

class ConversationResponse(BaseModel):
    id: str
    status: ConversationStatus
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []
    is_ai_responding: bool = False

    class Config:
        from_attributes = True


class StartConversationResponse(BaseModel):
    conversation_id: str
    tenant_id: str
    welcome_message: str
    created_at: datetime


class SendMessageResponse(BaseModel):
    customer_message: MessageResponse
    ai_response: Optional[MessageResponse] = None
    ai_confidence: Optional[float] = None
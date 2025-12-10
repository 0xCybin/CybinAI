"""
Email Schemas - Pydantic models for email operations.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# =============================================================================
# Inbound Email (Webhook Payload)
# =============================================================================

class InboundEmailAttachment(BaseModel):
    """Attachment in an inbound email."""
    filename: str
    content_type: str
    size: int
    content_id: Optional[str] = None
    # Note: Actual content would be base64 encoded or a URL


class InboundEmailPayload(BaseModel):
    """
    Payload received from Resend inbound webhook.
    
    Reference: https://resend.com/docs/dashboard/webhooks/event-types#emailreceived
    """
    # Email headers
    from_email: EmailStr = Field(..., alias="from")
    to: List[EmailStr]
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    reply_to: Optional[EmailStr] = None
    subject: Optional[str] = None
    message_id: Optional[str] = None
    in_reply_to: Optional[str] = None
    references: Optional[str] = None
    
    # Body content
    text: Optional[str] = None  # Plain text body
    html: Optional[str] = None  # HTML body
    
    # Attachments
    attachments: Optional[List[InboundEmailAttachment]] = None
    
    # Metadata
    spam_score: Optional[float] = None
    spam_status: Optional[str] = None
    
    class Config:
        populate_by_name = True


class InboundEmailWebhook(BaseModel):
    """
    Full webhook payload from Resend.
    """
    type: str  # "email.received"
    created_at: datetime
    data: InboundEmailPayload


# =============================================================================
# Outbound Email
# =============================================================================

class SendEmailRequest(BaseModel):
    """Request to send an email."""
    to_email: EmailStr
    subject: str
    body_text: str
    body_html: Optional[str] = None
    conversation_id: Optional[UUID] = None


class SendEmailResponse(BaseModel):
    """Response from sending an email."""
    success: bool
    email_id: Optional[str] = None
    error: Optional[str] = None


# =============================================================================
# Email Conversation
# =============================================================================

class EmailConversationCreate(BaseModel):
    """Create a new conversation from an inbound email."""
    tenant_id: UUID
    from_email: EmailStr
    from_name: Optional[str] = None
    subject: str
    body: str
    message_id: Optional[str] = None


class EmailReplyCreate(BaseModel):
    """Add a reply to an existing email conversation."""
    conversation_id: UUID
    body: str
    message_id: Optional[str] = None
    in_reply_to: Optional[str] = None


# =============================================================================
# Email Settings (Tenant Configuration)
# =============================================================================

class EmailSettingsUpdate(BaseModel):
    """Update email settings for a tenant."""
    email_enabled: Optional[bool] = None
    email_from_name: Optional[str] = None
    email_from_address: Optional[EmailStr] = None
    email_signature: Optional[str] = None
    auto_reply_enabled: Optional[bool] = None
    auto_reply_message: Optional[str] = None


class EmailSettingsResponse(BaseModel):
    """Current email settings for a tenant."""
    email_enabled: bool = False
    email_from_name: Optional[str] = None
    email_from_address: Optional[str] = None
    email_signature: Optional[str] = None
    auto_reply_enabled: bool = False
    auto_reply_message: Optional[str] = None
    domain_verified: bool = False
    inbound_address: Optional[str] = None  # The address customers can email
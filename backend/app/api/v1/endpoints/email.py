"""
Email API Endpoints

Handles:
1. Inbound email webhook (receives emails from Resend)
2. Email settings management
3. Manual email sending for agents
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, status, Request, BackgroundTasks
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import DbSession, AuthenticatedUser
from app.core.config import get_settings
from app.models.models import (
    Tenant,
    Conversation,
    Message,
    Customer,
    SenderType,
    ConversationStatus,
    ChannelType,
)
from app.schemas.email import (
    InboundEmailWebhook,
    InboundEmailPayload,
    SendEmailRequest,
    SendEmailResponse,
    EmailSettingsUpdate,
    EmailSettingsResponse,
)
from app.services.email import EmailService, get_email_service
from app.services.email.service import InboundEmailParser

logger = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter()


# =============================================================================
# Inbound Email Webhook
# =============================================================================

@router.post(
    "/webhook/inbound",
    status_code=status.HTTP_200_OK,
    summary="Receive inbound email (Resend webhook)",
    include_in_schema=False,  # Hide from public docs
)
async def receive_inbound_email(
    request: Request,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    """
    Webhook endpoint for receiving inbound emails from Resend.
    
    This endpoint:
    1. Parses the incoming email
    2. Routes it to existing conversation OR creates a new one
    3. Triggers AI response (in background)
    4. Sends auto-reply if configured
    
    Note: In production, you should verify the webhook signature.
    """
    try:
        payload = await request.json()
        logger.info(f"Received inbound email webhook: {payload.get('type')}")
        
        # Parse the webhook payload
        if payload.get("type") != "email.received":
            # Not an inbound email event, acknowledge and ignore
            return {"status": "ignored", "reason": "not email.received event"}
        
        email_data = InboundEmailPayload(**payload.get("data", {}))
        
        # Extract conversation ID from reply-to address if this is a reply
        conversation_id = None
        for to_addr in email_data.to:
            conv_id = InboundEmailParser.extract_conversation_id(to_addr)
            if conv_id:
                conversation_id = conv_id
                break
        
        # Determine which tenant this email belongs to
        tenant = await _resolve_tenant_from_email(db, email_data.to)
        if not tenant:
            logger.warning(f"Could not resolve tenant for email to: {email_data.to}")
            return {"status": "error", "reason": "tenant not found"}
        
        # Extract the actual message content (strip quotes, signatures)
        body_content = email_data.text or ""
        if email_data.html and not body_content:
            # TODO: Parse HTML to text if only HTML provided
            body_content = email_data.html
        
        clean_content = InboundEmailParser.extract_reply_content(body_content)
        
        if conversation_id:
            # This is a reply to an existing conversation
            await _handle_email_reply(
                db=db,
                tenant=tenant,
                conversation_id=conversation_id,
                from_email=email_data.from_email,
                content=clean_content,
                subject=email_data.subject,
                message_id=email_data.message_id,
                background_tasks=background_tasks,
            )
        else:
            # New conversation
            await _handle_new_email(
                db=db,
                tenant=tenant,
                from_email=email_data.from_email,
                content=clean_content,
                subject=email_data.subject or "New inquiry",
                message_id=email_data.message_id,
                background_tasks=background_tasks,
            )
        
        await db.commit()
        return {"status": "processed"}
        
    except Exception as e:
        logger.error(f"Error processing inbound email: {e}", exc_info=True)
        # Still return 200 to prevent webhook retries
        return {"status": "error", "reason": str(e)}


async def _resolve_tenant_from_email(
    db: AsyncSession,
    to_addresses: list[str]
) -> Optional[Tenant]:
    """
    Determine which tenant an email belongs to based on the 'to' address.
    
    Logic:
    1. Check for reply+{conv_id}@ format and get tenant from conversation
    2. Check for {subdomain}@ format and match to tenant
    3. Check tenant email settings for custom addresses
    """
    for addr in to_addresses:
        addr_lower = addr.lower()
        
        # Check for conversation reply format
        conv_id = InboundEmailParser.extract_conversation_id(addr_lower)
        if conv_id:
            result = await db.execute(
                select(Tenant)
                .join(Conversation, Conversation.tenant_id == Tenant.id)
                .where(Conversation.id == conv_id)
            )
            tenant = result.scalar_one_or_none()
            if tenant:
                return tenant
        
        # Check for subdomain@ format
        # e.g., acmehvac@mail.cybinai.com
        if "@mail.cybinai.com" in addr_lower or "@" in addr_lower:
            local_part = addr_lower.split("@")[0]
            # Remove reply+ prefix if present
            if local_part.startswith("reply+"):
                continue
            
            result = await db.execute(
                select(Tenant).where(Tenant.subdomain == local_part)
            )
            tenant = result.scalar_one_or_none()
            if tenant:
                return tenant
    
    return None


async def _handle_new_email(
    db: AsyncSession,
    tenant: Tenant,
    from_email: str,
    content: str,
    subject: str,
    message_id: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Handle a new inbound email - create conversation and customer."""
    
    # Find or create customer
    result = await db.execute(
        select(Customer).where(
            and_(
                Customer.tenant_id == tenant.id,
                Customer.email == from_email.lower(),
            )
        )
    )
    customer = result.scalar_one_or_none()
    
    if not customer:
        # Extract name from email address as fallback
        name_part = from_email.split("@")[0]
        # Convert john.doe to John Doe
        name = " ".join(word.capitalize() for word in name_part.replace(".", " ").replace("_", " ").split())
        
        customer = Customer(
            tenant_id=tenant.id,
            email=from_email.lower(),
            name=name,
        )
        db.add(customer)
        await db.flush()
    
    # Create conversation
    conversation = Conversation(
        tenant_id=tenant.id,
        customer_id=customer.id,
        channel=ChannelType.EMAIL,
        subject=subject,
        status=ConversationStatus.OPEN,
        ai_handled=True,
        metadata={
            "email_thread_started": True,
            "original_message_id": message_id,
            "last_email_message_id": message_id,
        },
    )
    db.add(conversation)
    await db.flush()
    
    # Add customer message
    message = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.CUSTOMER,
        content=content,
        metadata={
            "email_message_id": message_id,
            "email_subject": subject,
        },
    )
    db.add(message)
    
    logger.info(f"Created email conversation {conversation.id} for {from_email}")
    
    # Queue AI response in background
    background_tasks.add_task(
        _process_ai_response,
        tenant_id=tenant.id,
        conversation_id=conversation.id,
        customer_message=content,
    )


async def _handle_email_reply(
    db: AsyncSession,
    tenant: Tenant,
    conversation_id: UUID,
    from_email: str,
    content: str,
    subject: Optional[str],
    message_id: Optional[str],
    background_tasks: BackgroundTasks,
):
    """Handle a reply to an existing email conversation."""
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant.id,
            )
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        logger.warning(f"Conversation {conversation_id} not found for reply")
        return
    
    # Verify the email is from the customer (security check)
    result = await db.execute(
        select(Customer).where(Customer.id == conversation.customer_id)
    )
    customer = result.scalar_one_or_none()
    
    if customer and customer.email and customer.email.lower() != from_email.lower():
        logger.warning(
            f"Email reply from {from_email} doesn't match customer {customer.email}"
        )
        # Could create a new conversation or reject - for now, still process
    
    # Update conversation status if it was closed
    if conversation.status in (ConversationStatus.RESOLVED, ConversationStatus.CLOSED):
        conversation.status = ConversationStatus.OPEN
    
    conversation.updated_at = datetime.utcnow()
    
    # Update metadata
    if not conversation.metadata:
        conversation.metadata = {}
    conversation.metadata["last_email_message_id"] = message_id
    
    # Add customer message
    message = Message(
        conversation_id=conversation.id,
        sender_type=SenderType.CUSTOMER,
        content=content,
        metadata={
            "email_message_id": message_id,
        },
    )
    db.add(message)
    
    logger.info(f"Added reply to conversation {conversation_id}")
    
    # Queue AI response if conversation is AI-handled
    if conversation.ai_handled:
        background_tasks.add_task(
            _process_ai_response,
            tenant_id=tenant.id,
            conversation_id=conversation.id,
            customer_message=content,
        )


async def _process_ai_response(
    tenant_id: UUID,
    conversation_id: UUID,
    customer_message: str,
):
    """
    Background task to generate AI response and send email.
    
    Note: This needs its own database session since it runs in background.
    """
    from app.core.database import async_session_factory
    from app.services.chat_service import ChatService
    
    logger.info(f"Processing AI response for conversation {conversation_id}")
    
    try:
        async with async_session_factory() as db:
            # Get conversation and tenant
            result = await db.execute(
                select(Conversation)
                .where(Conversation.id == conversation_id)
            )
            conversation = result.scalar_one_or_none()
            if not conversation:
                return
            
            result = await db.execute(
                select(Tenant).where(Tenant.id == tenant_id)
            )
            tenant = result.scalar_one_or_none()
            if not tenant:
                return
            
            result = await db.execute(
                select(Customer).where(Customer.id == conversation.customer_id)
            )
            customer = result.scalar_one_or_none()
            if not customer:
                return
            
            # Generate AI response using existing chat service
            chat_service = ChatService(db)
            
            # This will generate AI response and save it
            _, ai_message = await chat_service.process_customer_message(
                conversation=conversation,
                tenant=tenant,
                content=customer_message,
            )
            
            # Send email with AI response
            if ai_message and customer.email:
                email_service = await get_email_service(db, tenant_id)
                result = await email_service.send_conversation_reply(
                    conversation=conversation,
                    message=ai_message,
                    customer=customer,
                )
                
                if result["success"]:
                    logger.info(f"Sent AI email reply: {result['email_id']}")
                else:
                    logger.error(f"Failed to send AI email: {result['error']}")
            
            await db.commit()
            
    except Exception as e:
        logger.error(f"Error in AI email response: {e}", exc_info=True)


# =============================================================================
# Email Settings
# =============================================================================

@router.get(
    "/settings",
    response_model=EmailSettingsResponse,
    summary="Get email settings",
)
async def get_email_settings(
    db: DbSession,
    current: AuthenticatedUser,
):
    """Get email settings for the current tenant."""
    tenant = current.tenant
    email_settings = tenant.settings.get("email", {}) if tenant.settings else {}
    
    # Build inbound address
    inbound_address = None
    if tenant.subdomain:
        inbound_address = f"{tenant.subdomain}@mail.cybinai.com"
    
    return EmailSettingsResponse(
        email_enabled=email_settings.get("enabled", False),
        email_from_name=email_settings.get("from_name", tenant.name),
        email_from_address=email_settings.get("from_address"),
        email_signature=email_settings.get("signature"),
        auto_reply_enabled=email_settings.get("auto_reply_enabled", True),
        auto_reply_message=email_settings.get("auto_reply_message"),
        domain_verified=email_settings.get("domain_verified", False),
        inbound_address=inbound_address,
    )


@router.patch(
    "/settings",
    response_model=EmailSettingsResponse,
    summary="Update email settings",
)
async def update_email_settings(
    data: EmailSettingsUpdate,
    db: DbSession,
    current: AuthenticatedUser,
):
    """Update email settings for the current tenant."""
    tenant = current.tenant
    
    if not tenant.settings:
        tenant.settings = {}
    
    if "email" not in tenant.settings:
        tenant.settings["email"] = {}
    
    # Update only provided fields
    if data.email_enabled is not None:
        tenant.settings["email"]["enabled"] = data.email_enabled
    if data.email_from_name is not None:
        tenant.settings["email"]["from_name"] = data.email_from_name
    if data.email_from_address is not None:
        tenant.settings["email"]["from_address"] = data.email_from_address
    if data.email_signature is not None:
        tenant.settings["email"]["signature"] = data.email_signature
    if data.auto_reply_enabled is not None:
        tenant.settings["email"]["auto_reply_enabled"] = data.auto_reply_enabled
    if data.auto_reply_message is not None:
        tenant.settings["email"]["auto_reply_message"] = data.auto_reply_message
    
    tenant.updated_at = datetime.utcnow()
    await db.commit()
    
    return await get_email_settings(db, current)


# =============================================================================
# Manual Email Sending (Agent Dashboard)
# =============================================================================

@router.post(
    "/send",
    response_model=SendEmailResponse,
    summary="Send email manually",
)
async def send_email(
    data: SendEmailRequest,
    db: DbSession,
    current: AuthenticatedUser,
):
    """
    Send an email manually (for agents).
    
    This is typically used when an agent wants to send a one-off email
    outside of a conversation context.
    """
    email_service = await get_email_service(db, current.tenant.id)
    
    result = await email_service.send_email(
        to_email=data.to_email,
        subject=data.subject,
        body_text=data.body_text,
        body_html=data.body_html,
        conversation_id=data.conversation_id,
    )
    
    return SendEmailResponse(**result)
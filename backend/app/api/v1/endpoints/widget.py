"""
Widget Endpoints (Public)
Handles the embeddable chat widget functionality.
These endpoints are public but scoped to a specific tenant.

UPDATED: Now reads from new nested settings structure set by Admin UI.
UPDATED: Now emits WebSocket events for real-time agent dashboard updates.
"""

from fastapi import APIRouter, HTTPException, status, Path, Depends
from typing import Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.websocket import emit_new_message  # NEW: WebSocket emitter
from app.services.chat_service import ChatService
from app.schemas.chat import (
    WidgetConfig, WidgetBranding, WidgetFeatures,
    StartConversationRequest, StartConversationResponse,
    SendMessageRequest, SendMessageResponse,
    ConversationResponse
)

router = APIRouter()


async def get_chat_service(db: AsyncSession = Depends(get_db)) -> ChatService:
    return ChatService(db)


async def resolve_tenant(tenant_id: str, service: ChatService):
    """Resolve tenant by ID or subdomain."""
    # Try as UUID first
    try:
        tenant_uuid = uuid.UUID(tenant_id)
        tenant = await service.get_tenant_by_id(tenant_uuid)
    except ValueError:
        # Not a UUID, try as subdomain
        tenant = await service.get_tenant_by_subdomain(tenant_id)

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant


@router.get("/{tenant_id}/config", response_model=WidgetConfig)
async def get_widget_config(
    tenant_id: str = Path(..., description="Tenant ID or subdomain"),
    service: ChatService = Depends(get_chat_service)
):
    """
    Get widget configuration for embedding.
    Returns branding, welcome message, etc.
    Public endpoint - no auth required.
    
    UPDATED: Now reads from nested settings structure:
    - settings.widget.colors.primary_color
    - settings.widget.messages.welcome_message
    - settings.widget.features.show_branding
    - settings.profile.logo_url
    """
    tenant = await resolve_tenant(tenant_id, service)

    # Get settings from tenant or use defaults
    settings = tenant.settings or {}
    widget_settings = settings.get("widget", {})
    profile_settings = settings.get("profile", {})
    
    # === READ FROM NEW NESTED STRUCTURE ===
    colors = widget_settings.get("colors", {})
    messages = widget_settings.get("messages", {})
    features = widget_settings.get("features", {})
    
    # Default colors (Industrial Warmth theme)
    default_primary = "#D97706"  # Amber
    default_welcome = f"Hi! Welcome to {tenant.name}. How can we help you today?"

    # Default colors (Industrial Warmth theme)
    default_secondary = "#92400E"
    default_background = "#1A1915"
    default_text = "#F5F5F4"

    return WidgetConfig(
        tenant_id=str(tenant.id),
        branding=WidgetBranding(
            business_name=tenant.name,
            # Check profile first, then widget settings for logo
            logo_url=profile_settings.get("logo_url") or colors.get("logo_url"),
            # Read ALL colors from nested colors object
            primary_color=colors.get("primary_color", default_primary),
            secondary_color=colors.get("secondary_color", default_secondary),
            background_color=colors.get("background_color", default_background),
            text_color=colors.get("text_color", default_text),
            # Read from nested messages object
            welcome_message=messages.get("welcome_message", default_welcome)
        ),
        features=WidgetFeatures(
            # Read from nested features object
            show_branding=features.get("show_branding", True),
            collect_email=features.get("collect_email", True),
            collect_phone=features.get("collect_phone", False),
            show_powered_by=features.get("show_powered_by", True)
        )
    )


@router.post("/{tenant_id}/conversations", response_model=StartConversationResponse)
async def start_conversation(
    tenant_id: str = Path(..., description="Tenant ID or subdomain"),
    request: Optional[StartConversationRequest] = None,
    service: ChatService = Depends(get_chat_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Start a new chat conversation.
    Creates a new conversation and returns the ID.
    """
    tenant = await resolve_tenant(tenant_id, service)

    customer_info = request.customer if request else None
    initial_message = request.initial_message if request else None

    conversation, _ = await service.start_conversation(
        tenant=tenant,
        customer_info=customer_info,
        initial_message=initial_message
    )

    await db.commit()

    # Get welcome message from NEW nested structure
    settings = tenant.settings or {}
    widget_settings = settings.get("widget", {})
    messages = widget_settings.get("messages", {})
    welcome_message = messages.get(
        "welcome_message",
        f"Hi! Welcome to {tenant.name}. How can we help you today?"
    )

    return StartConversationResponse(
        conversation_id=str(conversation.id),
        tenant_id=str(tenant.id),
        welcome_message=welcome_message,
        created_at=conversation.created_at
    )


@router.get("/{tenant_id}/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_widget_conversation(
    tenant_id: str = Path(..., description="Tenant ID or subdomain"),
    conversation_id: str = Path(..., description="Conversation ID"),
    service: ChatService = Depends(get_chat_service)
):
    """
    Get conversation details for the widget.
    Returns messages and current status.
    """
    tenant = await resolve_tenant(tenant_id, service)

    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )

    conversation = await service.get_conversation(conv_uuid, tenant.id)

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return service.format_conversation_response(conversation)


@router.post("/{tenant_id}/conversations/{conversation_id}/messages", response_model=SendMessageResponse)
async def send_widget_message(
    tenant_id: str = Path(..., description="Tenant ID or subdomain"),
    conversation_id: str = Path(..., description="Conversation ID"),
    request: SendMessageRequest = ...,
    service: ChatService = Depends(get_chat_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message from the customer via widget.
    
    If conversation is AI-handled, triggers AI processing and returns response.
    If conversation has been taken over by human agent, just saves message
    and emits WebSocket event (no AI response).
    """
    tenant = await resolve_tenant(tenant_id, service)

    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )

    conversation = await service.get_conversation(conv_uuid, tenant.id)

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Process message and get AI response (if AI is handling)
    customer_msg, ai_msg = await service.send_customer_message(
        conversation=conversation,
        tenant=tenant,
        content=request.content
    )

    await db.commit()

    # =========================================================================
    # NEW: Emit WebSocket event for customer message
    # This notifies agents in the dashboard about the new message
    # =========================================================================
    await emit_new_message(
        tenant_id=tenant.id,
        conversation_id=conv_uuid,
        message_data={
            "id": str(customer_msg.id),
            "conversation_id": str(customer_msg.conversation_id),
            "sender_type": customer_msg.sender_type.value if hasattr(customer_msg.sender_type, 'value') else customer_msg.sender_type,
            "sender_id": str(customer_msg.sender_id) if customer_msg.sender_id else None,
            "content": customer_msg.content,
            "created_at": customer_msg.created_at.isoformat(),
        }
    )

    # Also emit AI response if there was one
    if ai_msg:
        await emit_new_message(
            tenant_id=tenant.id,
            conversation_id=conv_uuid,
            message_data={
                "id": str(ai_msg.id),
                "conversation_id": str(ai_msg.conversation_id),
                "sender_type": ai_msg.sender_type.value if hasattr(ai_msg.sender_type, 'value') else ai_msg.sender_type,
                "sender_id": None,
                "content": ai_msg.content,
                "created_at": ai_msg.created_at.isoformat(),
            }
        )

    return SendMessageResponse(
        customer_message=service.format_message_response(customer_msg),
        ai_response=service.format_message_response(ai_msg) if ai_msg else None,
        ai_confidence=0.85 if ai_msg else None
    )


@router.post("/{tenant_id}/conversations/{conversation_id}/end")
async def end_widget_conversation(
    tenant_id: str = Path(..., description="Tenant ID or subdomain"),
    conversation_id: str = Path(..., description="Conversation ID"),
    service: ChatService = Depends(get_chat_service),
    db: AsyncSession = Depends(get_db)
):
    """
    End/close a conversation from the widget.
    """
    tenant = await resolve_tenant(tenant_id, service)

    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )

    conversation = await service.get_conversation(conv_uuid, tenant.id)

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    from app.models.models import ConversationStatus as ConvStatus
    conversation.status = ConvStatus.CLOSED

    await db.commit()

    return {
        "message": "Conversation ended",
        "conversation_id": conversation_id
    }


@router.post("/{tenant_id}/conversations/{conversation_id}/request-human")
async def request_human_agent(
    tenant_id: str = Path(..., description="Tenant ID or subdomain"),
    conversation_id: str = Path(..., description="Conversation ID"),
    service: ChatService = Depends(get_chat_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Customer requests to speak with a human agent.
    Escalates the conversation.
    """
    tenant = await resolve_tenant(tenant_id, service)

    try:
        conv_uuid = uuid.UUID(conversation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid conversation ID"
        )

    conversation = await service.get_conversation(conv_uuid, tenant.id)

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Mark as needing human attention
    from app.models.models import ConversationStatus as ConvStatus
    conversation.status = ConvStatus.PENDING
    conversation.ai_handled = False

    # Add system message
    from app.models.models import SenderType
    system_msg = await service.add_message(
        conversation_id=conversation.id,
        sender_type=SenderType.SYSTEM,
        content="Customer requested to speak with a human agent."
    )

    await db.commit()

    return {
        "message": "Human agent requested",
        "conversation_id": conversation_id,
        "status": "pending"
    }
"""
Widget Endpoints (Public)
Handles the embeddable chat widget functionality.
These endpoints are public but scoped to a specific tenant.
"""

from fastapi import APIRouter, HTTPException, status, Path, Depends
from typing import Optional
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
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
    """
    tenant = await resolve_tenant(tenant_id, service)
    
    # Get settings from tenant or use defaults
    settings = tenant.settings or {}
    widget_settings = settings.get("widget", {})
    
    return WidgetConfig(
        tenant_id=str(tenant.id),
        branding=WidgetBranding(
            business_name=tenant.name,
            logo_url=widget_settings.get("logo_url"),
            primary_color=widget_settings.get("primary_color", "#0066CC"),
            welcome_message=widget_settings.get(
                "welcome_message", 
                f"Hi! Welcome to {tenant.name}. How can we help you today?"
            )
        ),
        features=WidgetFeatures(
            show_branding=widget_settings.get("show_branding", True),
            collect_email=widget_settings.get("collect_email", True),
            collect_phone=widget_settings.get("collect_phone", False),
            show_powered_by=widget_settings.get("show_powered_by", True)
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
    
    # Get welcome message
    settings = tenant.settings or {}
    widget_settings = settings.get("widget", {})
    welcome_message = widget_settings.get(
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
    Triggers AI processing and returns response.
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
    
    # Process message and get AI response
    customer_msg, ai_msg = await service.send_customer_message(
        conversation=conversation,
        content=request.content
    )
    
    await db.commit()
    
    return SendMessageResponse(
        customer_message=service.format_message_response(customer_msg),
        ai_response=service.format_message_response(ai_msg) if ai_msg else None,
        ai_confidence=0.85  # Placeholder - will come from actual AI
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
    conversation.ai_handled = False
    from app.models.models import ConversationStatus as ConvStatus, SenderType
    conversation.status = ConvStatus.PENDING
    
    # Add system message
    await service.add_message(
        conversation_id=conversation.id,
        sender_type=SenderType.SYSTEM,
        content="Customer requested to speak with a human agent."
    )
    
    await db.commit()
    
    return {
        "message": "A human agent will be with you shortly.",
        "conversation_id": conversation_id,
        "escalated": True
    }
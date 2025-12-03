"""
Widget Endpoints (Public)
Handles the embeddable chat widget functionality.
These endpoints are public but scoped to a specific tenant.
"""

from fastapi import APIRouter, HTTPException, status, Path
from typing import Optional

router = APIRouter()


@router.get("/{tenant_id}/config")
async def get_widget_config(tenant_id: str = Path(..., description="Tenant ID or subdomain")):
    """
    Get widget configuration for embedding.
    Returns branding, welcome message, etc.
    Public endpoint - no auth required.
    """
    return {
        "tenant_id": tenant_id,
        "branding": {
            "business_name": "Sample HVAC Co",
            "logo_url": None,
            "primary_color": "#0066CC",
            "welcome_message": "Hi! How can we help you today?"
        },
        "features": {
            "show_branding": True,
            "collect_email": True,
            "collect_phone": False
        }
    }


@router.post("/{tenant_id}/conversations")
async def start_conversation(tenant_id: str = Path(..., description="Tenant ID or subdomain")):
    """
    Start a new chat conversation.
    Creates a new conversation and returns the ID.
    """
    return {
        "conversation_id": "conv_placeholder",
        "tenant_id": tenant_id,
        "welcome_message": "Hi! I'm here to help. What can I assist you with today?",
        "created_at": "2024-01-01T00:00:00Z"
    }


@router.get("/{tenant_id}/conversations/{conversation_id}")
async def get_widget_conversation(
    tenant_id: str = Path(..., description="Tenant ID"),
    conversation_id: str = Path(..., description="Conversation ID")
):
    """
    Get conversation details for the widget.
    Returns messages and current status.
    """
    return {
        "conversation_id": conversation_id,
        "status": "open",
        "messages": [],
        "is_ai_responding": False
    }


@router.post("/{tenant_id}/conversations/{conversation_id}/messages")
async def send_widget_message(
    tenant_id: str = Path(..., description="Tenant ID"),
    conversation_id: str = Path(..., description="Conversation ID")
):
    """
    Send a message from the customer via widget.
    Triggers AI processing and returns response.
    """
    return {
        "customer_message": {
            "id": "msg_customer",
            "content": "Customer message",
            "sender_type": "customer",
            "created_at": "2024-01-01T00:00:00Z"
        },
        "ai_response": {
            "id": "msg_ai",
            "content": "Thank you for reaching out! How can I help you today?",
            "sender_type": "ai",
            "created_at": "2024-01-01T00:00:01Z"
        },
        "ai_confidence": 0.92
    }


@router.post("/{tenant_id}/conversations/{conversation_id}/end")
async def end_widget_conversation(
    tenant_id: str = Path(..., description="Tenant ID"),
    conversation_id: str = Path(..., description="Conversation ID")
):
    """
    End/close a conversation from the widget.
    Optionally collect feedback.
    """
    return {
        "message": "Conversation ended",
        "conversation_id": conversation_id
    }


@router.post("/{tenant_id}/conversations/{conversation_id}/request-human")
async def request_human_agent(
    tenant_id: str = Path(..., description="Tenant ID"),
    conversation_id: str = Path(..., description="Conversation ID")
):
    """
    Customer requests to speak with a human agent.
    Escalates the conversation.
    """
    return {
        "message": "A human agent will be with you shortly.",
        "conversation_id": conversation_id,
        "escalated": True
    }

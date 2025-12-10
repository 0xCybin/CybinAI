"""
Email integration for conversations.

This module provides helpers to send emails when agents reply to email conversations.
"""

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Conversation, Message, Customer, ChannelType
from app.services.email import get_email_service

logger = logging.getLogger(__name__)


async def send_email_if_email_channel(
    db: AsyncSession,
    conversation: Conversation,
    message: Message,
) -> dict:
    """
    If the conversation is an email channel, send the message as an email.
    
    Called after an agent sends a message in the dashboard.
    
    Args:
        db: Database session
        conversation: The conversation
        message: The message that was just created
        
    Returns:
        dict with 'sent' bool and 'result' if sent
    """
    # Only send for email channel conversations
    if conversation.channel != ChannelType.EMAIL:
        return {"sent": False, "reason": "not email channel"}
    
    # Get customer
    result = await db.execute(
        select(Customer).where(Customer.id == conversation.customer_id)
    )
    customer = result.scalar_one_or_none()
    
    if not customer or not customer.email:
        logger.warning(f"Cannot send email - customer has no email address")
        return {"sent": False, "reason": "no customer email"}
    
    # Get email service
    email_service = await get_email_service(db, conversation.tenant_id)
    
    if not email_service.is_configured:
        logger.warning("Email service not configured - skipping email send")
        return {"sent": False, "reason": "email not configured"}
    
    # Send the email
    result = await email_service.send_conversation_reply(
        conversation=conversation,
        message=message,
        customer=customer,
    )
    
    if result["success"]:
        logger.info(f"Sent email reply for conversation {conversation.id}")
        return {"sent": True, "result": result}
    else:
        logger.error(f"Failed to send email: {result['error']}")
        return {"sent": False, "reason": result["error"]}
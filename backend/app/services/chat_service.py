"""Chat service - handles conversation and message operations."""

import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Tenant, Customer, Conversation, Message,
    ConversationStatus, SenderType, ChannelType
)
from app.schemas.chat import (
    CustomerInfo, StartConversationResponse, 
    MessageResponse, SendMessageResponse, ConversationResponse
)


class ChatService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_tenant_by_subdomain(self, subdomain: str) -> Optional[Tenant]:
        """Get tenant by subdomain."""
        result = await self.db.execute(
            select(Tenant).where(
                Tenant.subdomain == subdomain.lower(),
                Tenant.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def get_tenant_by_id(self, tenant_id: uuid.UUID) -> Optional[Tenant]:
        """Get tenant by ID."""
        result = await self.db.execute(
            select(Tenant).where(
                Tenant.id == tenant_id,
                Tenant.is_active == True
            )
        )
        return result.scalar_one_or_none()

    async def get_or_create_customer(
        self,
        tenant_id: uuid.UUID,
        customer_info: Optional[CustomerInfo] = None
    ) -> Customer:
        """Get existing customer or create anonymous one."""
        
        # If we have email, try to find existing customer
        if customer_info and customer_info.email:
            result = await self.db.execute(
                select(Customer).where(
                    Customer.tenant_id == tenant_id,
                    Customer.email == customer_info.email.lower()
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                # Update name/phone if provided
                if customer_info.name:
                    existing.name = customer_info.name
                if customer_info.phone:
                    existing.phone = customer_info.phone
                return existing

        # Create new customer
        customer = Customer(
            tenant_id=tenant_id,
            email=customer_info.email.lower() if customer_info and customer_info.email else None,
            name=customer_info.name if customer_info else None,
            phone=customer_info.phone if customer_info else None,
        )
        self.db.add(customer)
        await self.db.flush()
        return customer

    async def start_conversation(
        self,
        tenant: Tenant,
        customer_info: Optional[CustomerInfo] = None,
        initial_message: Optional[str] = None
    ) -> tuple[Conversation, Optional[Message]]:
        """Start a new conversation."""
        
        # Get or create customer
        customer = await self.get_or_create_customer(tenant.id, customer_info)
        
        # Create conversation
        conversation = Conversation(
            tenant_id=tenant.id,
            customer_id=customer.id,
            channel=ChannelType.CHAT,
            status=ConversationStatus.OPEN,
            ai_handled=True,
        )
        self.db.add(conversation)
        await self.db.flush()

        # Add initial message if provided
        initial_msg = None
        if initial_message:
            initial_msg = Message(
                conversation_id=conversation.id,
                sender_type=SenderType.CUSTOMER,
                content=initial_message,
            )
            self.db.add(initial_msg)
            await self.db.flush()

        return conversation, initial_msg

    async def get_conversation(
        self,
        conversation_id: uuid.UUID,
        tenant_id: uuid.UUID
    ) -> Optional[Conversation]:
        """Get conversation with messages."""
        result = await self.db.execute(
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .where(
                Conversation.id == conversation_id,
                Conversation.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        sender_type: SenderType,
        content: str,
        sender_id: Optional[uuid.UUID] = None
    ) -> Message:
        """Add a message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            sender_type=sender_type,
            sender_id=sender_id,
            content=content,
        )
        self.db.add(message)
        await self.db.flush()
        return message

    async def send_customer_message(
        self,
        conversation: Conversation,
        content: str
    ) -> tuple[Message, Optional[Message]]:
        """
        Process a customer message and generate AI response.
        Returns (customer_message, ai_response).
        """
        # Save customer message
        customer_msg = await self.add_message(
            conversation_id=conversation.id,
            sender_type=SenderType.CUSTOMER,
            content=content
        )

        # TODO: Replace with actual AI call
        # For now, return a placeholder response
        ai_content = self._get_placeholder_response(content)
        
        ai_msg = await self.add_message(
            conversation_id=conversation.id,
            sender_type=SenderType.AI,
            content=ai_content
        )

        return customer_msg, ai_msg

    def _get_placeholder_response(self, customer_message: str) -> str:
        """Placeholder AI response - will be replaced with DeepSeek integration."""
        message_lower = customer_message.lower()
        
        if any(word in message_lower for word in ['hello', 'hi', 'hey']):
            return "Hello! Thanks for reaching out to us. How can I help you today?"
        
        if any(word in message_lower for word in ['appointment', 'schedule', 'book', 'service']):
            return ("I'd be happy to help you schedule a service appointment! "
                    "Could you please tell me what type of service you need and "
                    "your preferred date/time?")
        
        if any(word in message_lower for word in ['price', 'cost', 'how much', 'quote']):
            return ("For accurate pricing, I'll need a bit more information about "
                    "what you need. Could you describe the issue or service you're looking for?")
        
        if any(word in message_lower for word in ['emergency', 'urgent', 'broken', 'not working']):
            return ("I understand this is urgent! Let me help you right away. "
                    "Can you describe what's happening so I can assist you better? "
                    "If this is an emergency, you can also call us directly.")
        
        if any(word in message_lower for word in ['human', 'agent', 'person', 'speak to']):
            return ("Of course! Let me connect you with one of our team members. "
                    "Please hold on a moment while I transfer this conversation.")
        
        return ("Thanks for your message! I'm here to help with scheduling, "
                "pricing questions, and general inquiries. What can I assist you with?")

    def format_message_response(self, message: Message) -> MessageResponse:
        """Format a message for API response."""
        return MessageResponse(
            id=str(message.id),
            conversation_id=str(message.conversation_id),
            sender_type=message.sender_type.value,
            content=message.content,
            created_at=message.created_at
        )

    def format_conversation_response(self, conversation: Conversation) -> ConversationResponse:
        """Format a conversation for API response."""
        return ConversationResponse(
            id=str(conversation.id),
            status=conversation.status.value,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            messages=[self.format_message_response(m) for m in conversation.messages],
            is_ai_responding=False
        )
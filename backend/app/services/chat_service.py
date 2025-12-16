"""Chat service - handles conversation and message operations."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import select, and_, func
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
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


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
        sender_id: Optional[uuid.UUID] = None,
        ai_metadata: Optional[dict] = None
    ) -> Message:
        """Add a message to a conversation."""
        message = Message(
            conversation_id=conversation_id,
            sender_type=sender_type,
            sender_id=sender_id,
            content=content,
            ai_metadata=ai_metadata or {},
        )
        self.db.add(message)
        await self.db.flush()
        return message

    async def send_customer_message(
        self,
        conversation: Conversation,
        tenant: Tenant,
        content: str
    ) -> tuple[Message, Optional[Message]]:
        """
        Process a customer message and generate AI response.
        Now respects tenant AI settings!
        Returns (customer_message, ai_response).
        """
        # Save customer message
        customer_msg = await self.add_message(
            conversation_id=conversation.id,
            sender_type=SenderType.CUSTOMER,
            content=content
        )

        # === LOAD AI SETTINGS FROM TENANT ===
        settings = tenant.settings or {}
        ai_settings = settings.get("ai", {})
        
        # Check if AI is enabled
        ai_enabled = ai_settings.get("enabled", True)
        
        if not ai_enabled:
            # AI disabled - route directly to human
            await self._handle_escalation(
                conversation,
                reason="AI responses disabled",
                priority="normal"
            )
            # Return system message instead of AI response
            system_msg = await self.add_message(
                conversation_id=conversation.id,
                sender_type=SenderType.SYSTEM,
                content="A team member will be with you shortly."
            )
            return customer_msg, system_msg

        # Get AI configuration from settings
        response_style = ai_settings.get("response_style", "professional")
        custom_instructions = ai_settings.get("custom_instructions")
        escalation_threshold = ai_settings.get("escalation_threshold", 0.7)
        max_ai_turns = ai_settings.get("max_ai_turns", 5)

        # Count AI turns in this conversation
        ai_turn_count = await self._count_ai_turns(conversation.id)
        
        # Check if we've exceeded max AI turns
        if ai_turn_count >= max_ai_turns:
            await self._handle_escalation(
                conversation,
                reason=f"Maximum AI turns ({max_ai_turns}) reached",
                priority="normal"
            )
            suggest_msg = await self.add_message(
                conversation_id=conversation.id,
                sender_type=SenderType.AI,
                content="I think it would be best to connect you with one of our team members who can better assist you. Someone will be with you shortly!"
            )
            return customer_msg, suggest_msg

        # Get conversation history for context
        conversation_history = await self._get_conversation_history(conversation.id)

        # Generate AI response
        ai_msg = None
        try:
            # Build additional context from response style settings
            style_instructions = {
                "professional": "Maintain a professional, business-like tone.",
                "friendly": "Be warm, friendly, and approachable. Use casual language.",
                "casual": "Be relaxed and conversational. It's okay to be informal.",
                "formal": "Use formal, polished language. Be very proper and respectful.",
            }
            
            additional_context_parts = []
            
            # Add response style instruction
            style_instruction = style_instructions.get(response_style, style_instructions["professional"])
            additional_context_parts.append(f"Response Style: {style_instruction}")
            
            # Add custom instructions if provided
            if custom_instructions:
                additional_context_parts.append(f"Additional Instructions: {custom_instructions}")
            
            additional_context = "\n".join(additional_context_parts) if additional_context_parts else None

            # Create AI service with tenant settings
            ai_service = AIService(
                tenant_id=tenant.id,
                business_name=tenant.name,
                business_type=ai_settings.get("business_type", "general"),
                additional_context=additional_context,
                db=self.db,
            )

            ai_response = await ai_service.generate_response(
                conversation_history=conversation_history,
                customer_message=content,
            )

            # Store AI metadata for analytics
            ai_metadata = {
                "tokens_used": ai_response.tokens_used,
                "estimated_cost": ai_response.estimated_cost,
                "provider": ai_response.provider,
                "model": ai_response.model,
                "response_style": response_style,
                "ai_turn": ai_turn_count + 1,
                "max_ai_turns": max_ai_turns,
                "tool_calls": [
                    {"name": tc.name, "arguments": tc.arguments}
                    for tc in ai_response.tool_calls
                ],
            }
            
            # Add tool execution results if present
            if ai_response.tool_results:
                ai_metadata["tool_results"] = {}
                for tool_name, result in ai_response.tool_results.items():
                    ai_metadata["tool_results"][tool_name] = {
                        "success": result.success,
                        "message": result.message,
                        "data": result.data,
                        "error": result.error,
                    }

            # Handle escalation if AI requested it
            if ai_response.should_escalate:
                await self._handle_escalation(
                    conversation,
                    ai_response.escalation_reason,
                    ai_response.escalation_priority
                )

            ai_msg = await self.add_message(
                conversation_id=conversation.id,
                sender_type=SenderType.AI,
                content=ai_response.content,
                ai_metadata=ai_metadata
            )

            # Log tool executions if any
            if ai_response.tool_results:
                for tool_name, result in ai_response.tool_results.items():
                    status_str = "✓" if result.success else "✗"
                    logger.info(
                        f"Tool execution {status_str}: {tool_name} - {result.message}"
                    )

            logger.info(
                f"AI response generated: tokens={ai_response.tokens_used}, "
                f"cost=${ai_response.estimated_cost:.6f}, provider={ai_response.provider}, "
                f"style={response_style}, turn={ai_turn_count + 1}/{max_ai_turns}"
            )

        except Exception as e:
            logger.error(f"AI generation failed: {e}", exc_info=True)
            # Fallback to a helpful error message
            ai_msg = await self.add_message(
                conversation_id=conversation.id,
                sender_type=SenderType.AI,
                content=(
                    "I apologize, but I'm having a bit of trouble right now. "
                    "Would you like me to have someone from our team call you back? "
                    "Just let me know your phone number and the best time to reach you."
                ),
                ai_metadata={"error": str(e)}
            )

        return customer_msg, ai_msg

    async def process_customer_message(
        self,
        conversation: Conversation,
        tenant: Tenant,
        content: str
    ) -> tuple[Message, Optional[Message]]:
        """Alias for send_customer_message for backwards compatibility."""
        return await self.send_customer_message(conversation, tenant, content)

    async def _get_conversation_history(
        self,
        conversation_id: uuid.UUID,
        limit: int = 10
    ) -> list[dict]:
        """Get recent conversation history for AI context."""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        messages = result.scalars().all()

        # Convert to format expected by AI service (oldest first)
        history = []
        for msg in reversed(messages):
            role = "user" if msg.sender_type == SenderType.CUSTOMER else "assistant"
            history.append({"role": role, "content": msg.content})

        return history

    async def _count_ai_turns(self, conversation_id: uuid.UUID) -> int:
        """Count number of AI messages in a conversation."""
        result = await self.db.execute(
            select(func.count(Message.id))
            .where(
                and_(
                    Message.conversation_id == conversation_id,
                    Message.sender_type == SenderType.AI
                )
            )
        )
        return result.scalar() or 0

    async def _handle_escalation(
        self,
        conversation: Conversation,
        reason: Optional[str],
        priority: Optional[str]
    ):
        """Handle AI escalation request."""
        # Update conversation status
        conversation.ai_handled = False
        conversation.status = ConversationStatus.PENDING

        # Set priority if provided
        if priority:
            from app.models.models import ConversationPriority
            priority_map = {
                "low": ConversationPriority.LOW,
                "normal": ConversationPriority.NORMAL,
                "high": ConversationPriority.HIGH,
                "urgent": ConversationPriority.URGENT,
            }
            if priority in priority_map:
                conversation.priority = priority_map[priority]

        # Add system message about escalation
        await self.add_message(
            conversation_id=conversation.id,
            sender_type=SenderType.SYSTEM,
            content=f"Conversation escalated to human agent. Reason: {reason or 'Customer request'}",
        )

        logger.info(f"Conversation {conversation.id} escalated: {reason}")

    def format_message_response(self, message: Message) -> MessageResponse:
        """Format a message for API response."""
        return MessageResponse(
            id=str(message.id),
            conversation_id=str(message.conversation_id),
            sender_type=message.sender_type.value if hasattr(message.sender_type, 'value') else message.sender_type,
            content=message.content,
            created_at=message.created_at
        )

    def format_conversation_response(self, conversation: Conversation) -> ConversationResponse:
        """Format a conversation for API response."""
        return ConversationResponse(
            id=str(conversation.id),
            status=conversation.status.value if hasattr(conversation.status, 'value') else conversation.status,
            created_at=conversation.created_at,
            updated_at=conversation.updated_at,
            messages=[self.format_message_response(m) for m in conversation.messages],
            is_ai_responding=False
        )
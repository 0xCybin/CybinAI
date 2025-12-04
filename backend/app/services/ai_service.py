"""
AI Service for Customer Conversations

This is the brain of the customer service AI. It:
1. Builds context from conversation history
2. Generates responses using the LLM
3. Handles function calling
4. Tracks costs and usage
"""

import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from app.services.llm import (
    LLMProvider,
    LLMMessage,
    LLMResponse,
    LLMToolCall,
    get_llm_provider,
)
from app.services.llm.base import MessageRole
from app.services.prompts import get_system_prompt, get_available_tools

logger = logging.getLogger(__name__)


@dataclass
class AIResponse:
    """Response from the AI service."""
    content: str
    tool_calls: list[LLMToolCall]
    requires_action: bool  # True if tool calls need to be executed
    should_escalate: bool  # True if escalate_to_human was called
    escalation_reason: Optional[str] = None
    escalation_priority: Optional[str] = None
    
    # Metadata
    tokens_used: int = 0
    estimated_cost: float = 0.0
    provider: str = ""
    model: str = ""


class AIService:
    """
    Service for generating AI responses in customer conversations.
    
    Usage:
        ai = AIService(tenant_id, business_name="ACME HVAC")
        response = await ai.generate_response(conversation_history, customer_message)
    """
    
    def __init__(
        self,
        tenant_id: UUID,
        business_name: str = "the company",
        business_type: str = "hvac",
        additional_context: Optional[str] = None,
        provider: Optional[LLMProvider] = None,
    ):
        self.tenant_id = tenant_id
        self.business_name = business_name
        self.business_type = business_type
        self.additional_context = additional_context
        
        # Get LLM provider (uses config default if not specified)
        self.llm = provider or get_llm_provider()
        
        # Get available tools for this business
        self.tools = get_available_tools(
            include_scheduling=True,
            include_knowledge_base=True,
            include_escalation=True,
        )
    
    async def generate_response(
        self,
        conversation_history: list[dict],
        customer_message: str,
        knowledge_context: Optional[str] = None,
    ) -> AIResponse:
        """
        Generate an AI response to a customer message.
        
        Args:
            conversation_history: Previous messages [{role, content}, ...]
            customer_message: The new message from the customer
            knowledge_context: Relevant KB content for this query
            
        Returns:
            AIResponse with content and/or tool calls
        """
        # Build the system prompt
        system_prompt = get_system_prompt(
            business_name=self.business_name,
            business_type=self.business_type,
            additional_context=self.additional_context,
            knowledge_base_context=knowledge_context,
        )
        
        # Build message list
        messages = [
            LLMMessage(role=MessageRole.SYSTEM, content=system_prompt),
        ]
        
        # Add conversation history (limit to last 10 messages for context window)
        for msg in conversation_history[-10:]:
            role = MessageRole(msg["role"]) if msg["role"] in ["user", "assistant"] else MessageRole.USER
            messages.append(LLMMessage(role=role, content=msg["content"]))
        
        # Add the new customer message
        messages.append(LLMMessage(role=MessageRole.USER, content=customer_message))
        
        # Call the LLM
        try:
            response = await self.llm.complete(
                messages=messages,
                tools=self.tools,
                temperature=0.7,
                max_tokens=500,  # Keep responses concise
            )
            
            return self._process_response(response)
            
        except Exception as e:
            logger.error(f"AI generation failed: {e}")
            # Return a graceful fallback
            return AIResponse(
                content="I apologize, but I'm having trouble processing your request right now. "
                        "Would you like me to have someone call you back?",
                tool_calls=[],
                requires_action=False,
                should_escalate=False,
                tokens_used=0,
                estimated_cost=0.0,
                provider=self.llm.provider_name,
                model="",
            )
    
    def _process_response(self, llm_response: LLMResponse) -> AIResponse:
        """Process the LLM response and check for escalation."""
        
        should_escalate = False
        escalation_reason = None
        escalation_priority = None
        
        # Check if AI requested escalation
        for tool_call in llm_response.tool_calls:
            if tool_call.name == "escalate_to_human":
                should_escalate = True
                escalation_reason = tool_call.arguments.get("reason", "Customer requested human agent")
                escalation_priority = tool_call.arguments.get("priority", "normal")
                break
        
        # If no content but tool calls, generate acknowledgment
        content = llm_response.content or ""
        if not content and llm_response.has_tool_calls:
            # AI is taking an action, generate appropriate response
            tool_names = [tc.name for tc in llm_response.tool_calls]
            if "schedule_appointment" in tool_names:
                content = "Let me schedule that appointment for you..."
            elif "check_appointment_status" in tool_names:
                content = "Let me look up your appointment..."
            elif "request_callback" in tool_names:
                content = "I'll arrange for someone to call you back..."
            elif "escalate_to_human" in tool_names:
                content = "I'm connecting you with a team member who can better assist you. One moment please..."
        
        return AIResponse(
            content=content,
            tool_calls=llm_response.tool_calls,
            requires_action=llm_response.has_tool_calls,
            should_escalate=should_escalate,
            escalation_reason=escalation_reason,
            escalation_priority=escalation_priority,
            tokens_used=llm_response.total_tokens,
            estimated_cost=llm_response.estimated_cost,
            provider=llm_response.provider,
            model=llm_response.model,
        )
    
    async def execute_tool_call(self, tool_call: LLMToolCall) -> str:
        """
        Execute a tool call and return the result.
        
        This will be expanded to actually call Jobber, etc.
        For now, returns simulated results.
        """
        logger.info(f"Executing tool: {tool_call.name} with args: {tool_call.arguments}")
        
        if tool_call.name == "schedule_appointment":
            # TODO: Integrate with Jobber API
            return (
                f"✓ Appointment scheduled for {tool_call.arguments.get('customer_name', 'customer')}. "
                f"Service: {tool_call.arguments.get('service_type', 'general service')}. "
                f"Preferred time: {tool_call.arguments.get('preferred_date', 'TBD')} "
                f"{tool_call.arguments.get('preferred_time', '')}. "
                "Confirmation will be sent via text message."
            )
        
        elif tool_call.name == "check_appointment_status":
            # TODO: Query Jobber API
            return (
                "I found your upcoming appointment: "
                "Service scheduled for tomorrow between 9 AM - 12 PM. "
                "Our technician will call 30 minutes before arrival."
            )
        
        elif tool_call.name == "request_callback":
            # TODO: Create callback request in system
            return (
                f"✓ Callback request submitted for {tool_call.arguments.get('customer_name', 'customer')}. "
                f"Regarding: {tool_call.arguments.get('reason', 'general inquiry')}. "
                "Someone will call you back within 2 hours during business hours."
            )
        
        elif tool_call.name == "search_knowledge_base":
            # TODO: Query vector database
            query = tool_call.arguments.get("query", "")
            return f"[Knowledge base search for: {query}] No specific articles found."
        
        elif tool_call.name == "escalate_to_human":
            # This is handled by the chat service
            return "Conversation transferred to human agent."
        
        return f"Unknown tool: {tool_call.name}"


async def get_ai_service(
    tenant_id: UUID,
    business_name: str = "the company",
    business_type: str = "hvac",
) -> AIService:
    """Factory function to get AI service for a tenant."""
    return AIService(
        tenant_id=tenant_id,
        business_name=business_name,
        business_type=business_type,
    )
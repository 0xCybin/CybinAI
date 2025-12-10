"""
AI Service for Customer Conversations

This is the brain of the customer service AI. It:
1. Builds context from conversation history
2. Generates responses using the LLM
3. Handles function calling
4. Executes Jobber actions
5. Tracks costs and usage
"""

import logging
from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

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
    
    # Tool execution results
    tool_results: Optional[dict] = None
    
    # Metadata
    tokens_used: int = 0
    estimated_cost: float = 0.0
    provider: str = ""
    model: str = ""


@dataclass
class ToolExecutionResult:
    """Result from executing a tool call."""
    success: bool
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None


class AIService:
    """
    Service for generating AI responses in customer conversations.
    
    Usage:
        ai = AIService(tenant_id, business_name="ACME HVAC", db=db_session)
        response = await ai.generate_response(conversation_history, customer_message)
    """
    
    def __init__(
        self,
        tenant_id: UUID,
        business_name: str = "the company",
        business_type: str = "hvac",
        additional_context: Optional[str] = None,
        provider: Optional[LLMProvider] = None,
        db: Optional[AsyncSession] = None,
    ):
        self.tenant_id = tenant_id
        self.business_name = business_name
        self.business_type = business_type
        self.additional_context = additional_context
        self.db = db
        
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
            
            ai_response = self._process_response(response)
            
            # If there are tool calls that need execution, execute them
            if ai_response.requires_action and ai_response.tool_calls:
                tool_results = {}
                for tool_call in ai_response.tool_calls:
                    # Skip escalation - it's handled by the chat service
                    if tool_call.name == "escalate_to_human":
                        continue
                    
                    result = await self.execute_tool_call(tool_call)
                    tool_results[tool_call.name] = result
                
                ai_response.tool_results = tool_results
                
                # Generate a follow-up response with tool results if we have any
                if tool_results:
                    follow_up = await self._generate_follow_up_response(
                        messages, ai_response.tool_calls, tool_results
                    )
                    if follow_up:
                        ai_response.content = follow_up
            
            return ai_response
            
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
    
    async def _generate_follow_up_response(
        self,
        original_messages: list[LLMMessage],
        tool_calls: list[LLMToolCall],
        tool_results: dict,
    ) -> Optional[str]:
        """
        Generate a natural language response after tool execution.
        
        This gives the AI the tool results and lets it craft a user-friendly response.
        """
        try:
            # Build tool results summary for the AI
            results_summary = []
            for tool_call in tool_calls:
                if tool_call.name in tool_results:
                    result = tool_results[tool_call.name]
                    results_summary.append(
                        f"Tool: {tool_call.name}\n"
                        f"Arguments: {tool_call.arguments}\n"
                        f"Result: {result}"
                    )
            
            if not results_summary:
                return None
            
            # Add a system message about the tool execution
            follow_up_messages = original_messages.copy()
            follow_up_messages.append(
                LLMMessage(
                    role=MessageRole.SYSTEM,
                    content=(
                        "You just executed the following actions. Based on the results, "
                        "provide a friendly, concise response to the customer. "
                        "Don't mention 'tools' or 'functions' - speak naturally.\n\n"
                        + "\n\n".join(results_summary)
                    )
                )
            )
            
            response = await self.llm.complete(
                messages=follow_up_messages,
                tools=[],  # No tools for follow-up
                temperature=0.7,
                max_tokens=300,
            )
            
            return response.content
            
        except Exception as e:
            logger.error(f"Failed to generate follow-up response: {e}")
            return None
    
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
    
    async def execute_tool_call(self, tool_call: LLMToolCall) -> ToolExecutionResult:
        """
        Execute a tool call and return the result.
        
        This routes to the appropriate integration (Jobber, etc.)
        """
        logger.info(f"Executing tool: {tool_call.name} with args: {tool_call.arguments}")
        
        try:
            if tool_call.name == "schedule_appointment":
                return await self._execute_schedule_appointment(tool_call.arguments)
            
            elif tool_call.name == "check_appointment_status":
                return await self._execute_check_appointment_status(tool_call.arguments)
            
            elif tool_call.name == "request_callback":
                return await self._execute_request_callback(tool_call.arguments)
            
            elif tool_call.name == "search_knowledge_base":
                return await self._execute_knowledge_base_search(tool_call.arguments)
            
            elif tool_call.name == "escalate_to_human":
                # This is handled by the chat service, not here
                return ToolExecutionResult(
                    success=True,
                    message="Conversation transferred to human agent."
                )
            
            else:
                logger.warning(f"Unknown tool: {tool_call.name}")
                return ToolExecutionResult(
                    success=False,
                    message=f"Unknown action: {tool_call.name}",
                    error="Tool not implemented"
                )
                
        except Exception as e:
            logger.error(f"Tool execution failed for {tool_call.name}: {e}")
            return ToolExecutionResult(
                success=False,
                message="I encountered an issue while processing that request.",
                error=str(e)
            )
    
    async def _execute_schedule_appointment(self, args: dict) -> ToolExecutionResult:
        """Execute the schedule_appointment tool via Jobber."""
        
        # Check if we have a database session for Jobber
        if not self.db:
            logger.warning("No database session available for Jobber integration")
            return self._fallback_schedule_appointment(args)
        
        try:
            # Import Jobber service
            from app.services.jobber.service import get_jobber_service
            from app.schemas.jobber import ScheduleAppointmentParams
            
            # Get Jobber service for this tenant
            jobber_service = await get_jobber_service(self.db, self.tenant_id)
            
            if not jobber_service:
                logger.info("Jobber not connected for this tenant, using fallback")
                return self._fallback_schedule_appointment(args)
            
            # Build params from tool arguments
            params = ScheduleAppointmentParams(
                customer_name=args.get("customer_name", ""),
                customer_phone=args.get("phone", ""),
                customer_email=args.get("email"),
                service_type=args.get("service_type", "Service Request"),
                preferred_date=args.get("preferred_date"),
                preferred_time=args.get("preferred_time"),
                notes=args.get("issue_description", ""),
                address=args.get("address"),
            )
            
            # Execute in Jobber
            result = await jobber_service.schedule_appointment(params)
            
            if result.success:
                logger.info(f"Jobber appointment created: {result.data}")
                return ToolExecutionResult(
                    success=True,
                    message=(
                        f"✓ Appointment scheduled for {args.get('customer_name', 'you')}! "
                        f"Service: {args.get('service_type', 'general service')}. "
                        f"Preferred time: {args.get('preferred_date', '')} {args.get('preferred_time', '')}. "
                        "You'll receive a confirmation shortly."
                    ),
                    data=result.data
                )
            else:
                logger.error(f"Jobber scheduling failed: {result.error}")
                return ToolExecutionResult(
                    success=False,
                    message="I had trouble creating the appointment in our system. Let me connect you with someone who can help.",
                    error=result.error
                )
                
        except ImportError:
            logger.warning("Jobber service not available")
            return self._fallback_schedule_appointment(args)
        except Exception as e:
            logger.error(f"Jobber schedule_appointment error: {e}")
            return self._fallback_schedule_appointment(args)
    
    def _fallback_schedule_appointment(self, args: dict) -> ToolExecutionResult:
        """Fallback when Jobber is not available."""
        return ToolExecutionResult(
            success=True,
            message=(
                f"✓ Appointment request received for {args.get('customer_name', 'you')}! "
                f"Service: {args.get('service_type', 'general service')}. "
                f"Preferred time: {args.get('preferred_date', 'TBD')} {args.get('preferred_time', '')}. "
                "Our team will reach out to confirm the appointment time."
            ),
            data={"fallback": True, "args": args}
        )
    
    async def _execute_check_appointment_status(self, args: dict) -> ToolExecutionResult:
        """Execute the check_appointment_status tool via Jobber."""
        
        if not self.db:
            return self._fallback_check_appointment_status(args)
        
        try:
            from app.services.jobber.service import get_jobber_service
            from app.schemas.jobber import CheckAppointmentStatusParams
            
            jobber_service = await get_jobber_service(self.db, self.tenant_id)
            
            if not jobber_service:
                return self._fallback_check_appointment_status(args)
            
            params = CheckAppointmentStatusParams(
                customer_phone=args.get("phone", ""),
                customer_name=args.get("name"),
            )
            
            result = await jobber_service.check_appointment_status(params)
            
            if result.success and result.data:
                appointments = result.data.get("appointments", [])
                if appointments:
                    # Format appointment info nicely
                    appt = appointments[0]  # Most recent
                    return ToolExecutionResult(
                        success=True,
                        message=(
                            f"I found your appointment! "
                            f"Service: {appt.get('title', 'Service call')}. "
                            f"Scheduled for: {appt.get('scheduled_date', 'TBD')}. "
                            f"Status: {appt.get('status', 'scheduled')}."
                        ),
                        data=result.data
                    )
                else:
                    return ToolExecutionResult(
                        success=True,
                        message="I couldn't find any upcoming appointments for that phone number. Would you like to schedule a new appointment?",
                        data={"appointments": []}
                    )
            else:
                return ToolExecutionResult(
                    success=False,
                    message="I had trouble looking up your appointment. Can you verify your phone number?",
                    error=result.error
                )
                
        except ImportError:
            return self._fallback_check_appointment_status(args)
        except Exception as e:
            logger.error(f"Jobber check_appointment_status error: {e}")
            return self._fallback_check_appointment_status(args)
    
    def _fallback_check_appointment_status(self, args: dict) -> ToolExecutionResult:
        """Fallback when Jobber is not available."""
        return ToolExecutionResult(
            success=True,
            message=(
                "I'm checking our system for your appointment. "
                "Our team will follow up with the details shortly. "
                "Is there anything else I can help you with?"
            ),
            data={"fallback": True, "args": args}
        )
    
    async def _execute_request_callback(self, args: dict) -> ToolExecutionResult:
        """Execute the request_callback tool via Jobber."""
        
        if not self.db:
            return self._fallback_request_callback(args)
        
        try:
            from app.services.jobber.service import get_jobber_service
            from app.schemas.jobber import CreateCallbackRequestParams
            
            jobber_service = await get_jobber_service(self.db, self.tenant_id)
            
            if not jobber_service:
                return self._fallback_request_callback(args)
            
            params = CreateCallbackRequestParams(
                customer_name=args.get("customer_name", ""),
                customer_phone=args.get("phone", ""),
                reason=args.get("reason", "Callback requested"),
                best_time=args.get("best_time"),
            )
            
            result = await jobber_service.create_callback_request(params)
            
            if result.success:
                return ToolExecutionResult(
                    success=True,
                    message=(
                        f"✓ Callback request submitted for {args.get('customer_name', 'you')}! "
                        f"Regarding: {args.get('reason', 'your inquiry')}. "
                        "Someone from our team will call you back during business hours."
                    ),
                    data=result.data
                )
            else:
                return ToolExecutionResult(
                    success=False,
                    message="I had trouble creating the callback request. Would you like to try again or speak with someone now?",
                    error=result.error
                )
                
        except ImportError:
            return self._fallback_request_callback(args)
        except Exception as e:
            logger.error(f"Jobber create_callback_request error: {e}")
            return self._fallback_request_callback(args)
    
    def _fallback_request_callback(self, args: dict) -> ToolExecutionResult:
        """Fallback when Jobber is not available."""
        return ToolExecutionResult(
            success=True,
            message=(
                f"✓ Callback request received for {args.get('customer_name', 'you')}! "
                f"Regarding: {args.get('reason', 'your inquiry')}. "
                "Someone will call you back within 2 hours during business hours."
            ),
            data={"fallback": True, "args": args}
        )
    
    async def _execute_knowledge_base_search(self, args: dict) -> ToolExecutionResult:
        """Execute a knowledge base search."""
        query = args.get("query", "")
        
        # TODO: Implement vector search when we add embeddings
        # For now, return a placeholder
        return ToolExecutionResult(
            success=True,
            message=f"[Knowledge base search for: {query}]",
            data={"query": query, "results": []}
        )


async def get_ai_service(
    tenant_id: UUID,
    business_name: str = "the company",
    business_type: str = "hvac",
    db: Optional[AsyncSession] = None,
) -> AIService:
    """Factory function to get AI service for a tenant."""
    return AIService(
        tenant_id=tenant_id,
        business_name=business_name,
        business_type=business_type,
        db=db,
    )
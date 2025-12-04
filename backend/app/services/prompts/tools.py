"""
Tool Definitions for AI Function Calling

These define the actions the AI can take during a conversation.
"""

from app.services.llm.base import LLMTool


# Define all available tools
TOOL_DEFINITIONS = {
    "schedule_appointment": LLMTool(
        name="schedule_appointment",
        description="""Schedule a service appointment for the customer. 
Use this when the customer wants to book a service visit.
You need to collect: customer name, phone number, service type, and preferred time window.""",
        parameters={
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "Customer's full name",
                },
                "phone": {
                    "type": "string",
                    "description": "Customer's phone number",
                },
                "service_type": {
                    "type": "string",
                    "description": "Type of service needed (e.g., 'AC repair', 'furnace maintenance', 'installation quote')",
                },
                "preferred_date": {
                    "type": "string",
                    "description": "Preferred date (e.g., 'tomorrow', 'Monday', '2024-12-15')",
                },
                "preferred_time": {
                    "type": "string",
                    "description": "Preferred time window (e.g., 'morning', 'afternoon', '9am-12pm')",
                },
                "issue_description": {
                    "type": "string",
                    "description": "Brief description of the issue or service needed",
                },
                "address": {
                    "type": "string",
                    "description": "Service address if different from customer's default",
                },
            },
            "required": ["customer_name", "phone", "service_type"],
        },
    ),
    
    "check_appointment_status": LLMTool(
        name="check_appointment_status",
        description="""Look up the status of an existing appointment.
Use this when a customer asks about their scheduled appointment.""",
        parameters={
            "type": "object",
            "properties": {
                "phone": {
                    "type": "string",
                    "description": "Customer's phone number to look up",
                },
                "name": {
                    "type": "string",
                    "description": "Customer's name (optional, helps with lookup)",
                },
            },
            "required": ["phone"],
        },
    ),
    
    "request_callback": LLMTool(
        name="request_callback",
        description="""Request a callback from the business.
Use this when a customer wants to speak with someone but doesn't need immediate service.""",
        parameters={
            "type": "object",
            "properties": {
                "customer_name": {
                    "type": "string",
                    "description": "Customer's name",
                },
                "phone": {
                    "type": "string",
                    "description": "Phone number to call back",
                },
                "reason": {
                    "type": "string",
                    "description": "Brief reason for callback (e.g., 'quote for new AC', 'billing question')",
                },
                "best_time": {
                    "type": "string",
                    "description": "Best time to call (optional)",
                },
            },
            "required": ["customer_name", "phone", "reason"],
        },
    ),
    
    "escalate_to_human": LLMTool(
        name="escalate_to_human",
        description="""Transfer the conversation to a human agent.
Use this when:
- Customer explicitly asks to speak to a human
- The issue is too complex for AI
- Customer is frustrated or upset
- Emergency situation
- Requires account access or sensitive information""",
        parameters={
            "type": "object",
            "properties": {
                "reason": {
                    "type": "string",
                    "description": "Why this needs human attention",
                },
                "priority": {
                    "type": "string",
                    "enum": ["low", "normal", "high", "urgent"],
                    "description": "How urgent is this escalation",
                },
                "summary": {
                    "type": "string",
                    "description": "Brief summary of the conversation so far for the agent",
                },
            },
            "required": ["reason", "priority", "summary"],
        },
    ),
    
    "search_knowledge_base": LLMTool(
        name="search_knowledge_base",
        description="""Search the knowledge base for information.
Use this to find specific information about services, pricing, policies, etc.""",
        parameters={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query (e.g., 'maintenance plan pricing', 'service area')",
                },
            },
            "required": ["query"],
        },
    ),
}


def get_available_tools(
    include_scheduling: bool = True,
    include_knowledge_base: bool = True,
    include_escalation: bool = True,
) -> list[LLMTool]:
    """
    Get list of tools available for a conversation.
    
    Different businesses may have different tools enabled.
    """
    tools = []
    
    if include_scheduling:
        tools.extend([
            TOOL_DEFINITIONS["schedule_appointment"],
            TOOL_DEFINITIONS["check_appointment_status"],
            TOOL_DEFINITIONS["request_callback"],
        ])
    
    if include_knowledge_base:
        tools.append(TOOL_DEFINITIONS["search_knowledge_base"])
    
    if include_escalation:
        tools.append(TOOL_DEFINITIONS["escalate_to_human"])
    
    return tools
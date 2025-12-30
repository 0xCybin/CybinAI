"""
Canned Responses Schemas

Pydantic models for canned response CRUD operations.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field


# =============================================================================
# Request Schemas
# =============================================================================

class CannedResponseCreate(BaseModel):
    """Schema for creating a new canned response."""
    title: str = Field(..., min_length=1, max_length=255, description="Display title")
    shortcut: Optional[str] = Field(
        None, 
        max_length=50, 
        pattern=r"^/[a-z0-9_-]+$",
        description="Shortcut trigger (e.g., /thanks). Must start with /"
    )
    content: str = Field(..., min_length=1, description="Response content with optional {{variables}}")
    category: Optional[str] = Field(None, max_length=100, description="Category for organization")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "title": "Thank You Response",
                    "shortcut": "/thanks",
                    "content": "Thank you for contacting us, {{customer_name}}! Is there anything else I can help you with?",
                    "category": "General"
                }
            ]
        }
    }


class CannedResponseUpdate(BaseModel):
    """Schema for updating an existing canned response."""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    shortcut: Optional[str] = Field(
        None, 
        max_length=50, 
        pattern=r"^/[a-z0-9_-]+$"
    )
    content: Optional[str] = Field(None, min_length=1)
    category: Optional[str] = Field(None, max_length=100)


# =============================================================================
# Response Schemas
# =============================================================================

class CannedResponseResponse(BaseModel):
    """Schema for returning a canned response."""
    id: UUID
    tenant_id: UUID
    title: str
    shortcut: Optional[str]
    content: str
    category: Optional[str]
    use_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CannedResponseList(BaseModel):
    """Schema for listing canned responses."""
    responses: List[CannedResponseResponse]
    total: int


class CannedResponseExpanded(BaseModel):
    """Schema for returning an expanded canned response with variable substitution."""
    original: str
    expanded: str
    variables_used: List[str]


# =============================================================================
# Variable Context Schema
# =============================================================================

class VariableContext(BaseModel):
    """Context for variable substitution in canned responses."""
    customer_name: Optional[str] = None
    customer_first_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    agent_name: Optional[str] = None
    agent_email: Optional[str] = None
    business_name: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[str] = None
    ticket_id: Optional[str] = None
    current_date: Optional[str] = None
    current_time: Optional[str] = None
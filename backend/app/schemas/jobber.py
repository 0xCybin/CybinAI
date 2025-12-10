"""
Jobber Integration Schemas

Pydantic models for Jobber API interactions.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ============================================================================
# Request Parameter Schemas (for AI tool calls)
# ============================================================================

class ScheduleAppointmentParams(BaseModel):
    """Parameters for scheduling an appointment via Jobber."""
    customer_name: str = Field(..., description="Customer's full name")
    customer_phone: str = Field(..., description="Customer's phone number")
    customer_email: Optional[str] = Field(None, description="Customer's email")
    service_type: str = Field(..., description="Type of service requested")
    preferred_date: Optional[str] = Field(None, description="Preferred date")
    preferred_time: Optional[str] = Field(None, description="Preferred time window")
    notes: Optional[str] = Field(None, description="Additional notes/issue description")
    address: Optional[str] = Field(None, description="Service address")


class CheckAppointmentStatusParams(BaseModel):
    """Parameters for checking appointment status."""
    customer_phone: str = Field(..., description="Customer's phone number to lookup")
    customer_name: Optional[str] = Field(None, description="Customer name (helps narrow search)")
    customer_email: Optional[str] = Field(None, description="Customer email (alternative lookup)")


class CreateCallbackRequestParams(BaseModel):
    """Parameters for creating a callback request."""
    customer_name: str = Field(..., description="Customer's name")
    customer_phone: str = Field(..., description="Phone number to call back")
    reason: str = Field(..., description="Reason for callback")
    best_time: Optional[str] = Field(None, description="Best time to call")


# ============================================================================
# Response Schemas
# ============================================================================

class JobberActionResult(BaseModel):
    """Result from a Jobber action."""
    success: bool
    message: str
    data: Optional[dict] = None
    error: Optional[str] = None
    jobber_id: Optional[str] = None  # ID of created/found resource in Jobber


class JobberClient(BaseModel):
    """Jobber client (customer) information."""
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    created_at: Optional[datetime] = None


class JobberAppointment(BaseModel):
    """Jobber appointment/job information."""
    id: str
    title: str
    status: str
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    client_name: Optional[str] = None
    notes: Optional[str] = None


class AppointmentStatusResult(BaseModel):
    """Result from checking appointment status."""
    success: bool
    client: Optional[JobberClient] = None
    appointments: List[JobberAppointment] = []
    message: str
    error: Optional[str] = None


# ============================================================================
# Jobber GraphQL Response Types (internal use)
# ============================================================================

class JobberClientCreateResponse(BaseModel):
    """Response from clientCreate mutation."""
    client_id: Optional[str] = None
    success: bool
    errors: List[str] = []


class JobberRequestCreateResponse(BaseModel):
    """Response from requestCreate mutation."""
    request_id: Optional[str] = None
    success: bool
    errors: List[str] = []


# ============================================================================
# Integration Settings
# ============================================================================

class JobberIntegrationSettings(BaseModel):
    """Tenant-specific Jobber integration settings."""
    enabled: bool = True
    auto_create_clients: bool = True  # Create client in Jobber if not found
    default_service_type: str = "Service Request"
    business_hours_start: str = "08:00"
    business_hours_end: str = "17:00"
    callback_response_time: str = "2 hours"  # For messaging
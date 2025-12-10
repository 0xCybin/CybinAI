"""
Pydantic schemas for integrations (Jobber, etc.)
"""

from datetime import datetime
from typing import Optional, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class IntegrationType(str, Enum):
    """Supported integration types."""
    JOBBER = "jobber"
    # Future: quickbooks, square, servicetitan, etc.


class IntegrationStatus(str, Enum):
    """Integration connection status."""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"


# ============================================================================
# Jobber-specific schemas
# ============================================================================

class JobberConnectResponse(BaseModel):
    """Response when initiating Jobber OAuth flow."""
    authorization_url: str
    state: str


class JobberCallbackRequest(BaseModel):
    """OAuth callback parameters from Jobber."""
    code: str
    state: str


class JobberTokens(BaseModel):
    """Jobber OAuth tokens (stored encrypted)."""
    access_token: str
    refresh_token: str
    expires_at: datetime
    account_id: Optional[str] = None
    account_name: Optional[str] = None


class JobberClient(BaseModel):
    """A client in Jobber's system."""
    id: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class JobberClientCreate(BaseModel):
    """Data needed to create a client in Jobber."""
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    street_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None


class JobberRequest(BaseModel):
    """A service/work request in Jobber."""
    id: str
    title: Optional[str] = None
    details: Optional[str] = None
    client_id: str
    status: Optional[str] = None
    created_at: Optional[datetime] = None


class JobberRequestCreate(BaseModel):
    """Data needed to create a service request in Jobber."""
    client_id: str
    title: str
    details: Optional[str] = None
    # For new clients, can provide contact info directly
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class JobberJob(BaseModel):
    """A job in Jobber's system."""
    id: str
    job_number: Optional[str] = None
    title: Optional[str] = None
    status: Optional[str] = None
    client_name: Optional[str] = None
    scheduled_at: Optional[datetime] = None


# ============================================================================
# Generic integration schemas
# ============================================================================

class IntegrationBase(BaseModel):
    """Base integration schema."""
    type: IntegrationType
    status: IntegrationStatus = IntegrationStatus.DISCONNECTED


class IntegrationResponse(BaseModel):
    """Integration status response."""
    id: UUID
    tenant_id: UUID
    type: str
    status: IntegrationStatus
    account_name: Optional[str] = None
    connected_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class IntegrationListResponse(BaseModel):
    """List of integrations for a tenant."""
    integrations: list[IntegrationResponse]


# ============================================================================
# AI Function Call schemas (for executing Jobber actions)
# ============================================================================

class ScheduleAppointmentParams(BaseModel):
    """Parameters for scheduling an appointment via AI."""
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    service_type: str
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    notes: Optional[str] = None


class CheckAppointmentStatusParams(BaseModel):
    """Parameters for checking appointment status."""
    customer_phone: Optional[str] = None
    customer_name: Optional[str] = None
    job_number: Optional[str] = None


class CreateCallbackRequestParams(BaseModel):
    """Parameters for creating a callback request."""
    customer_name: str
    customer_phone: str
    reason: Optional[str] = None
    preferred_time: Optional[str] = None


class JobberActionResult(BaseModel):
    """Result of a Jobber action."""
    success: bool
    message: str
    data: Optional[dict[str, Any]] = None
    error: Optional[str] = None

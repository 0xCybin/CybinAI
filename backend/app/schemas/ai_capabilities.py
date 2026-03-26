from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class AICapabilitiesResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    tier: int
    can_book_appointments: bool
    can_send_reminders: bool
    can_handle_cancellations: bool
    can_follow_up_leads: bool
    can_request_reviews: bool
    can_handle_complaints: bool
    custom_instructions: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AICapabilitiesUpdate(BaseModel):
    tier: Optional[int] = None
    can_book_appointments: Optional[bool] = None
    can_send_reminders: Optional[bool] = None
    can_handle_cancellations: Optional[bool] = None
    can_follow_up_leads: Optional[bool] = None
    can_request_reviews: Optional[bool] = None
    can_handle_complaints: Optional[bool] = None
    custom_instructions: Optional[str] = None

    @field_validator("tier")
    @classmethod
    def tier_must_be_valid(cls, v):
        if v is not None and v not in (1, 2, 3):
            raise ValueError("tier must be 1, 2, or 3")
        return v

"""Pydantic schemas for notification preferences."""

from datetime import datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, field_validator


class NotificationPreferencesResponse(BaseModel):
    id: UUID
    user_id: UUID
    tenant_id: UUID
    mode: str
    push_enabled: bool
    sms_enabled: bool
    email_enabled: bool
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationPreferencesUpdate(BaseModel):
    mode: Optional[str] = None
    push_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    quiet_hours_start: Optional[time] = None
    quiet_hours_end: Optional[time] = None

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("calm", "regular", "all"):
            raise ValueError("mode must be 'calm', 'regular', or 'all'")
        return v

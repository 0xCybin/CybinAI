"""
Pydantic schemas for tenant settings management.

Covers:
- Business profile (name, logo, contact info, timezone)
- Widget customization (colors, messages, features)
- AI configuration (response style, escalation thresholds)
- Notification preferences
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum


# =============================================================================
# Enums
# =============================================================================

class ResponseStyle(str, Enum):
    """AI response personality style."""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    CASUAL = "casual"
    FORMAL = "formal"


class DayOfWeek(str, Enum):
    """Days of the week for business hours."""
    MONDAY = "monday"
    TUESDAY = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY = "thursday"
    FRIDAY = "friday"
    SATURDAY = "saturday"
    SUNDAY = "sunday"


# =============================================================================
# Business Profile Settings
# =============================================================================

class BusinessHoursEntry(BaseModel):
    """Single day's business hours."""
    day: DayOfWeek
    enabled: bool = True
    open_time: str = Field(default="09:00", pattern=r"^\d{2}:\d{2}$")
    close_time: str = Field(default="17:00", pattern=r"^\d{2}:\d{2}$")


class BusinessProfileUpdate(BaseModel):
    """Update business profile information."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, max_length=30)
    email: Optional[EmailStr] = None
    website: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = Field(None, max_length=500)
    timezone: Optional[str] = Field(None, max_length=50)
    business_hours: Optional[List[BusinessHoursEntry]] = None


class BusinessProfileResponse(BaseModel):
    """Full business profile response."""
    name: str
    subdomain: str
    custom_domain: Optional[str] = None
    logo_url: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    timezone: str = "America/New_York"
    business_hours: List[BusinessHoursEntry] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# =============================================================================
# Widget Customization Settings
# =============================================================================

class WidgetColorsUpdate(BaseModel):
    """Widget color scheme."""
    primary_color: Optional[str] = Field(
        None, 
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Primary brand color (hex)"
    )
    secondary_color: Optional[str] = Field(
        None, 
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Secondary accent color (hex)"
    )
    background_color: Optional[str] = Field(
        None,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Widget background color (hex)"
    )
    text_color: Optional[str] = Field(
        None,
        pattern=r"^#[0-9A-Fa-f]{6}$",
        description="Primary text color (hex)"
    )


class WidgetMessagesUpdate(BaseModel):
    """Widget text content."""
    welcome_message: Optional[str] = Field(None, max_length=500)
    offline_message: Optional[str] = Field(None, max_length=500)
    placeholder_text: Optional[str] = Field(None, max_length=100)
    away_message: Optional[str] = Field(None, max_length=500)


class WidgetFeaturesUpdate(BaseModel):
    """Widget feature toggles."""
    show_branding: Optional[bool] = None
    collect_email: Optional[bool] = None
    collect_phone: Optional[bool] = None
    collect_name: Optional[bool] = None
    require_email: Optional[bool] = None
    show_powered_by: Optional[bool] = None
    enable_attachments: Optional[bool] = None
    enable_emoji: Optional[bool] = None
    show_agent_avatars: Optional[bool] = None
    enable_sound_notifications: Optional[bool] = None


class WidgetPositionUpdate(BaseModel):
    """Widget position on page."""
    position: Optional[str] = Field(
        None,
        pattern=r"^(bottom-right|bottom-left|top-right|top-left)$"
    )
    offset_x: Optional[int] = Field(None, ge=0, le=100)
    offset_y: Optional[int] = Field(None, ge=0, le=100)


class WidgetSettingsUpdate(BaseModel):
    """Complete widget settings update."""
    colors: Optional[WidgetColorsUpdate] = None
    messages: Optional[WidgetMessagesUpdate] = None
    features: Optional[WidgetFeaturesUpdate] = None
    position: Optional[WidgetPositionUpdate] = None


class WidgetSettingsResponse(BaseModel):
    """Complete widget settings response."""
    colors: dict = Field(default_factory=lambda: {
        "primary_color": "#D97706",
        "secondary_color": "#92400E",
        "background_color": "#1A1915",
        "text_color": "#F5F5F4",
    })
    messages: dict = Field(default_factory=lambda: {
        "welcome_message": "Hi! How can we help you today?",
        "offline_message": "We're currently offline. Leave a message and we'll get back to you.",
        "placeholder_text": "Type your message...",
        "away_message": "Our team is away. We'll respond as soon as possible.",
    })
    features: dict = Field(default_factory=lambda: {
        "show_branding": True,
        "collect_email": True,
        "collect_phone": False,
        "collect_name": True,
        "require_email": False,
        "show_powered_by": True,
        "enable_attachments": False,
        "enable_emoji": True,
        "show_agent_avatars": True,
        "enable_sound_notifications": True,
    })
    position: dict = Field(default_factory=lambda: {
        "position": "bottom-right",
        "offset_x": 20,
        "offset_y": 20,
    })


# =============================================================================
# AI Configuration Settings
# =============================================================================

class AISettingsUpdate(BaseModel):
    """AI behavior configuration."""
    enabled: Optional[bool] = Field(None, description="Enable/disable AI responses")
    response_style: Optional[ResponseStyle] = Field(
        None, 
        description="AI personality style"
    )
    escalation_threshold: Optional[float] = Field(
        None, 
        ge=0.0, 
        le=1.0,
        description="Confidence threshold for human escalation (0.0-1.0)"
    )
    max_ai_turns: Optional[int] = Field(
        None, 
        ge=1, 
        le=20,
        description="Max AI responses before suggesting human help"
    )
    auto_resolve_enabled: Optional[bool] = Field(
        None,
        description="Auto-resolve conversations after inactivity"
    )
    auto_resolve_hours: Optional[int] = Field(
        None,
        ge=1,
        le=168,
        description="Hours of inactivity before auto-resolve"
    )
    greeting_enabled: Optional[bool] = Field(
        None,
        description="Enable proactive greeting"
    )
    custom_instructions: Optional[str] = Field(
        None,
        max_length=2000,
        description="Additional instructions for AI behavior"
    )


class AISettingsResponse(BaseModel):
    """Full AI configuration response."""
    enabled: bool = True
    response_style: ResponseStyle = ResponseStyle.PROFESSIONAL
    escalation_threshold: float = 0.7
    max_ai_turns: int = 5
    auto_resolve_enabled: bool = True
    auto_resolve_hours: int = 24
    greeting_enabled: bool = False
    custom_instructions: Optional[str] = None


# =============================================================================
# Notification Settings
# =============================================================================

class NotificationSettingsUpdate(BaseModel):
    """Email and notification preferences."""
    email_new_conversation: Optional[bool] = None
    email_escalation: Optional[bool] = None
    email_daily_digest: Optional[bool] = None
    email_weekly_report: Optional[bool] = None
    notification_email: Optional[EmailStr] = None
    slack_webhook_url: Optional[str] = Field(None, max_length=500)
    slack_enabled: Optional[bool] = None


class NotificationSettingsResponse(BaseModel):
    """Full notification settings response."""
    email_new_conversation: bool = True
    email_escalation: bool = True
    email_daily_digest: bool = False
    email_weekly_report: bool = True
    notification_email: Optional[str] = None
    slack_webhook_url: Optional[str] = None
    slack_enabled: bool = False


# =============================================================================
# Combined Settings Response
# =============================================================================

class AllSettingsResponse(BaseModel):
    """Complete settings for the tenant."""
    business_profile: BusinessProfileResponse
    widget: WidgetSettingsResponse
    ai: AISettingsResponse
    notifications: NotificationSettingsResponse
"""
Admin Settings API Endpoints

Handles tenant configuration including:
- Business profile (name, logo, contact, timezone)
- Widget customization (colors, messages, features)
- AI configuration (response style, escalation)
- Notification preferences

FIXED: Added flag_modified() to ensure JSON changes are persisted to database.
"""

import logging
from typing import Annotated, Optional
from datetime import datetime, timezone
from copy import deepcopy

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified  # <-- THE FIX

from app.core.database import get_db
from app.core.deps import CurrentUser, require_admin, AdminUser, DbSession
from app.models.models import Tenant
from app.schemas.settings import (
    # Business Profile
    BusinessProfileUpdate,
    BusinessProfileResponse,
    BusinessHoursEntry,
    # Widget
    WidgetSettingsUpdate,
    WidgetSettingsResponse,
    # AI
    AISettingsUpdate,
    AISettingsResponse,
    ResponseStyle,
    # Notifications
    NotificationSettingsUpdate,
    NotificationSettingsResponse,
    # Combined
    AllSettingsResponse,
    DayOfWeek,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# =============================================================================
# Helper Functions
# =============================================================================

async def get_tenant(db: AsyncSession, tenant_id) -> Tenant:
    """Fetch tenant by ID."""
    result = await db.execute(
        select(Tenant).where(Tenant.id == tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    return tenant


def deep_merge(base: dict, updates: dict) -> dict:
    """Deep merge updates into base dict."""
    result = base.copy()
    for key, value in updates.items():
        if value is None:
            continue
        if isinstance(value, dict) and key in result and isinstance(result[key], dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def get_default_business_hours() -> list:
    """Return default business hours (Mon-Fri 9-5)."""
    weekdays = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, 
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]
    weekend = [DayOfWeek.SATURDAY, DayOfWeek.SUNDAY]
    
    hours = []
    for day in weekdays:
        hours.append({
            "day": day.value,
            "enabled": True,
            "open_time": "09:00",
            "close_time": "17:00"
        })
    for day in weekend:
        hours.append({
            "day": day.value,
            "enabled": False,
            "open_time": "09:00",
            "close_time": "17:00"
        })
    return hours


# =============================================================================
# Get All Settings
# =============================================================================

@router.get(
    "",
    response_model=AllSettingsResponse,
    summary="Get all tenant settings",
)
async def get_all_settings(
    db: DbSession,
    current_user: AdminUser,
):
    """
    Get all settings for the current tenant.
    Combines business profile, widget, AI, and notification settings.
    Requires admin or owner role.
    """
    tenant = await get_tenant(db, current_user.tenant_id)
    settings = tenant.settings or {}
    
    # Build business profile
    profile_data = settings.get("profile", {})
    business_hours_data = profile_data.get("business_hours", get_default_business_hours())
    
    business_profile = BusinessProfileResponse(
        name=tenant.name,
        subdomain=tenant.subdomain,
        custom_domain=tenant.custom_domain,
        logo_url=profile_data.get("logo_url"),
        phone=profile_data.get("phone"),
        email=profile_data.get("email"),
        website=profile_data.get("website"),
        address=profile_data.get("address"),
        timezone=profile_data.get("timezone", "America/New_York"),
        business_hours=[BusinessHoursEntry(**h) for h in business_hours_data],
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
    )
    
    # Widget settings with defaults
    widget_data = settings.get("widget", {})
    widget = WidgetSettingsResponse(
        colors=widget_data.get("colors", WidgetSettingsResponse().colors),
        messages=widget_data.get("messages", WidgetSettingsResponse().messages),
        features=widget_data.get("features", WidgetSettingsResponse().features),
        position=widget_data.get("position", WidgetSettingsResponse().position),
    )
    
    # AI settings with defaults
    ai_data = settings.get("ai", {})
    ai = AISettingsResponse(
        enabled=ai_data.get("enabled", True),
        response_style=ResponseStyle(ai_data.get("response_style", "professional")),
        escalation_threshold=ai_data.get("escalation_threshold", 0.7),
        max_ai_turns=ai_data.get("max_ai_turns", 5),
        auto_resolve_enabled=ai_data.get("auto_resolve_enabled", True),
        auto_resolve_hours=ai_data.get("auto_resolve_hours", 24),
        greeting_enabled=ai_data.get("greeting_enabled", False),
        custom_instructions=ai_data.get("custom_instructions"),
    )
    
    # Notification settings with defaults
    notif_data = settings.get("notifications", {})
    notifications = NotificationSettingsResponse(
        email_new_conversation=notif_data.get("email_new_conversation", True),
        email_escalation=notif_data.get("email_escalation", True),
        email_daily_digest=notif_data.get("email_daily_digest", False),
        email_weekly_report=notif_data.get("email_weekly_report", True),
        notification_email=notif_data.get("notification_email"),
        slack_webhook_url=notif_data.get("slack_webhook_url"),
        slack_enabled=notif_data.get("slack_enabled", False),
    )
    
    return AllSettingsResponse(
        business_profile=business_profile,
        widget=widget,
        ai=ai,
        notifications=notifications,
    )


# =============================================================================
# Business Profile Settings
# =============================================================================

@router.get(
    "/business-profile",
    response_model=BusinessProfileResponse,
    summary="Get business profile",
)
async def get_business_profile(
    db: DbSession,
    current_user: AdminUser,
):
    """Get business profile settings for the current tenant."""
    tenant = await get_tenant(db, current_user.tenant_id)
    settings = tenant.settings or {}
    profile_data = settings.get("profile", {})
    business_hours_data = profile_data.get("business_hours", get_default_business_hours())
    
    return BusinessProfileResponse(
        name=tenant.name,
        subdomain=tenant.subdomain,
        custom_domain=tenant.custom_domain,
        logo_url=profile_data.get("logo_url"),
        phone=profile_data.get("phone"),
        email=profile_data.get("email"),
        website=profile_data.get("website"),
        address=profile_data.get("address"),
        timezone=profile_data.get("timezone", "America/New_York"),
        business_hours=[BusinessHoursEntry(**h) for h in business_hours_data],
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
    )


@router.patch(
    "/business-profile",
    response_model=BusinessProfileResponse,
    summary="Update business profile",
)
async def update_business_profile(
    data: BusinessProfileUpdate,
    db: DbSession,
    current_user: AdminUser,
):
    """
    Update business profile settings.
    Only provided fields will be updated.
    Requires admin or owner role.
    """
    tenant = await get_tenant(db, current_user.tenant_id)
    
    # IMPORTANT: Create a NEW dict to ensure SQLAlchemy detects the change
    settings = deepcopy(tenant.settings) if tenant.settings else {}
    profile_data = settings.get("profile", {})
    
    # Update tenant name directly if provided
    if data.name is not None:
        tenant.name = data.name
    
    # Update profile settings
    update_fields = data.model_dump(exclude_unset=True, exclude={"name"})
    
    # Handle business hours separately
    if "business_hours" in update_fields:
        profile_data["business_hours"] = [h.model_dump() for h in data.business_hours]
        del update_fields["business_hours"]
    
    # Merge other fields
    for key, value in update_fields.items():
        if value is not None:
            profile_data[key] = value
    
    settings["profile"] = profile_data
    tenant.settings = settings
    tenant.updated_at = datetime.now(timezone.utc)
    
    # CRITICAL: Tell SQLAlchemy the JSON column was modified
    flag_modified(tenant, "settings")
    
    await db.commit()
    await db.refresh(tenant)
    
    logger.info(f"Updated business profile for tenant {tenant.id}")
    
    business_hours_data = profile_data.get("business_hours", get_default_business_hours())
    
    return BusinessProfileResponse(
        name=tenant.name,
        subdomain=tenant.subdomain,
        custom_domain=tenant.custom_domain,
        logo_url=profile_data.get("logo_url"),
        phone=profile_data.get("phone"),
        email=profile_data.get("email"),
        website=profile_data.get("website"),
        address=profile_data.get("address"),
        timezone=profile_data.get("timezone", "America/New_York"),
        business_hours=[BusinessHoursEntry(**h) for h in business_hours_data],
        created_at=tenant.created_at,
        updated_at=tenant.updated_at,
    )


# =============================================================================
# Widget Settings
# =============================================================================

@router.get(
    "/widget",
    response_model=WidgetSettingsResponse,
    summary="Get widget settings",
)
async def get_widget_settings(
    db: DbSession,
    current_user: AdminUser,
):
    """Get chat widget customization settings."""
    tenant = await get_tenant(db, current_user.tenant_id)
    settings = tenant.settings or {}
    widget_data = settings.get("widget", {})
    
    defaults = WidgetSettingsResponse()
    
    return WidgetSettingsResponse(
        colors=widget_data.get("colors", defaults.colors),
        messages=widget_data.get("messages", defaults.messages),
        features=widget_data.get("features", defaults.features),
        position=widget_data.get("position", defaults.position),
    )


@router.patch(
    "/widget",
    response_model=WidgetSettingsResponse,
    summary="Update widget settings",
)
async def update_widget_settings(
    data: WidgetSettingsUpdate,
    db: DbSession,
    current_user: AdminUser,
):
    """
    Update chat widget settings.
    Supports partial updates for colors, messages, features, and position.
    """
    tenant = await get_tenant(db, current_user.tenant_id)
    
    # IMPORTANT: Create a NEW dict to ensure SQLAlchemy detects the change
    settings = deepcopy(tenant.settings) if tenant.settings else {}
    widget_data = settings.get("widget", {})
    defaults = WidgetSettingsResponse()
    
    # Deep merge each section
    if data.colors:
        current_colors = widget_data.get("colors", defaults.colors)
        widget_data["colors"] = deep_merge(
            current_colors, 
            data.colors.model_dump(exclude_unset=True)
        )
    
    if data.messages:
        current_messages = widget_data.get("messages", defaults.messages)
        widget_data["messages"] = deep_merge(
            current_messages,
            data.messages.model_dump(exclude_unset=True)
        )
    
    if data.features:
        current_features = widget_data.get("features", defaults.features)
        widget_data["features"] = deep_merge(
            current_features,
            data.features.model_dump(exclude_unset=True)
        )
    
    if data.position:
        current_position = widget_data.get("position", defaults.position)
        widget_data["position"] = deep_merge(
            current_position,
            data.position.model_dump(exclude_unset=True)
        )
    
    settings["widget"] = widget_data
    tenant.settings = settings
    tenant.updated_at = datetime.now(timezone.utc)
    
    # CRITICAL: Tell SQLAlchemy the JSON column was modified
    flag_modified(tenant, "settings")
    
    await db.commit()
    await db.refresh(tenant)
    
    logger.info(f"Updated widget settings for tenant {tenant.id}")
    
    return WidgetSettingsResponse(
        colors=widget_data.get("colors", defaults.colors),
        messages=widget_data.get("messages", defaults.messages),
        features=widget_data.get("features", defaults.features),
        position=widget_data.get("position", defaults.position),
    )


# =============================================================================
# AI Settings
# =============================================================================

@router.get(
    "/ai",
    response_model=AISettingsResponse,
    summary="Get AI settings",
)
async def get_ai_settings(
    db: DbSession,
    current_user: AdminUser,
):
    """Get AI configuration settings."""
    tenant = await get_tenant(db, current_user.tenant_id)
    settings = tenant.settings or {}
    ai_data = settings.get("ai", {})
    
    return AISettingsResponse(
        enabled=ai_data.get("enabled", True),
        response_style=ResponseStyle(ai_data.get("response_style", "professional")),
        escalation_threshold=ai_data.get("escalation_threshold", 0.7),
        max_ai_turns=ai_data.get("max_ai_turns", 5),
        auto_resolve_enabled=ai_data.get("auto_resolve_enabled", True),
        auto_resolve_hours=ai_data.get("auto_resolve_hours", 24),
        greeting_enabled=ai_data.get("greeting_enabled", False),
        custom_instructions=ai_data.get("custom_instructions"),
    )


@router.patch(
    "/ai",
    response_model=AISettingsResponse,
    summary="Update AI settings",
)
async def update_ai_settings(
    data: AISettingsUpdate,
    db: DbSession,
    current_user: AdminUser,
):
    """
    Update AI behavior configuration.
    Controls response style, escalation thresholds, and auto-resolve.
    """
    tenant = await get_tenant(db, current_user.tenant_id)
    
    # IMPORTANT: Create a NEW dict to ensure SQLAlchemy detects the change
    settings = deepcopy(tenant.settings) if tenant.settings else {}
    ai_data = settings.get("ai", {})
    
    # Update only provided fields
    update_fields = data.model_dump(exclude_unset=True)
    
    # Handle enum conversion
    if "response_style" in update_fields and update_fields["response_style"]:
        update_fields["response_style"] = update_fields["response_style"].value
    
    ai_data = deep_merge(ai_data, update_fields)
    
    settings["ai"] = ai_data
    tenant.settings = settings
    tenant.updated_at = datetime.now(timezone.utc)
    
    # CRITICAL: Tell SQLAlchemy the JSON column was modified
    flag_modified(tenant, "settings")
    
    await db.commit()
    await db.refresh(tenant)
    
    logger.info(f"Updated AI settings for tenant {tenant.id}")
    
    return AISettingsResponse(
        enabled=ai_data.get("enabled", True),
        response_style=ResponseStyle(ai_data.get("response_style", "professional")),
        escalation_threshold=ai_data.get("escalation_threshold", 0.7),
        max_ai_turns=ai_data.get("max_ai_turns", 5),
        auto_resolve_enabled=ai_data.get("auto_resolve_enabled", True),
        auto_resolve_hours=ai_data.get("auto_resolve_hours", 24),
        greeting_enabled=ai_data.get("greeting_enabled", False),
        custom_instructions=ai_data.get("custom_instructions"),
    )


# =============================================================================
# Notification Settings
# =============================================================================

@router.get(
    "/notifications",
    response_model=NotificationSettingsResponse,
    summary="Get notification settings",
)
async def get_notification_settings(
    db: DbSession,
    current_user: AdminUser,
):
    """Get notification preferences."""
    tenant = await get_tenant(db, current_user.tenant_id)
    settings = tenant.settings or {}
    notif_data = settings.get("notifications", {})
    
    return NotificationSettingsResponse(
        email_new_conversation=notif_data.get("email_new_conversation", True),
        email_escalation=notif_data.get("email_escalation", True),
        email_daily_digest=notif_data.get("email_daily_digest", False),
        email_weekly_report=notif_data.get("email_weekly_report", True),
        notification_email=notif_data.get("notification_email"),
        slack_webhook_url=notif_data.get("slack_webhook_url"),
        slack_enabled=notif_data.get("slack_enabled", False),
    )


@router.patch(
    "/notifications",
    response_model=NotificationSettingsResponse,
    summary="Update notification settings",
)
async def update_notification_settings(
    data: NotificationSettingsUpdate,
    db: DbSession,
    current_user: AdminUser,
):
    """
    Update notification preferences.
    Controls email alerts and Slack integration.
    """
    tenant = await get_tenant(db, current_user.tenant_id)
    
    # IMPORTANT: Create a NEW dict to ensure SQLAlchemy detects the change
    settings = deepcopy(tenant.settings) if tenant.settings else {}
    notif_data = settings.get("notifications", {})
    
    # Update only provided fields
    update_fields = data.model_dump(exclude_unset=True)
    notif_data = deep_merge(notif_data, update_fields)
    
    settings["notifications"] = notif_data
    tenant.settings = settings
    tenant.updated_at = datetime.now(timezone.utc)
    
    # CRITICAL: Tell SQLAlchemy the JSON column was modified
    flag_modified(tenant, "settings")
    
    await db.commit()
    await db.refresh(tenant)
    
    logger.info(f"Updated notification settings for tenant {tenant.id}")
    
    return NotificationSettingsResponse(
        email_new_conversation=notif_data.get("email_new_conversation", True),
        email_escalation=notif_data.get("email_escalation", True),
        email_daily_digest=notif_data.get("email_daily_digest", False),
        email_weekly_report=notif_data.get("email_weekly_report", True),
        notification_email=notif_data.get("notification_email"),
        slack_webhook_url=notif_data.get("slack_webhook_url"),
        slack_enabled=notif_data.get("slack_enabled", False),
    )


# =============================================================================
# Widget Preview (for live preview without saving)
# =============================================================================

@router.post(
    "/widget/preview",
    response_model=dict,
    summary="Get widget preview config",
)
async def get_widget_preview(
    data: WidgetSettingsUpdate,
    db: DbSession,
    current_user: AdminUser,
):
    """
    Generate a preview configuration for the widget.
    Merges provided settings with current settings without saving.
    Used for live preview in the admin UI.
    """
    tenant = await get_tenant(db, current_user.tenant_id)
    settings = tenant.settings or {}
    widget_data = settings.get("widget", {})
    defaults = WidgetSettingsResponse()
    
    preview_config = {
        "tenant_id": str(tenant.id),
        "business_name": tenant.name,
        "colors": widget_data.get("colors", defaults.colors),
        "messages": widget_data.get("messages", defaults.messages),
        "features": widget_data.get("features", defaults.features),
        "position": widget_data.get("position", defaults.position),
    }
    
    # Apply preview overrides
    if data.colors:
        preview_config["colors"] = deep_merge(
            preview_config["colors"],
            data.colors.model_dump(exclude_unset=True)
        )
    if data.messages:
        preview_config["messages"] = deep_merge(
            preview_config["messages"],
            data.messages.model_dump(exclude_unset=True)
        )
    if data.features:
        preview_config["features"] = deep_merge(
            preview_config["features"],
            data.features.model_dump(exclude_unset=True)
        )
    if data.position:
        preview_config["position"] = deep_merge(
            preview_config["position"],
            data.position.model_dump(exclude_unset=True)
        )
    
    return preview_config
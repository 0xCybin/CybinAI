"""Notification preferences endpoints."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import select

from app.core.deps import DbSession, AuthenticatedUser
from app.models.notifications import NotificationPreferences
from app.schemas.notifications import NotificationPreferencesResponse, NotificationPreferencesUpdate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: AuthenticatedUser,
    db: DbSession,
):
    result = await db.execute(
        select(NotificationPreferences).where(
            NotificationPreferences.user_id == current_user.user_id
        )
    )
    prefs = result.scalar_one_or_none()

    if prefs is None:
        prefs = NotificationPreferences(
            user_id=current_user.user_id,
            tenant_id=current_user.tenant_id,
            mode="regular",
            push_enabled=True,
            sms_enabled=True,
            email_enabled=True,
        )
        db.add(prefs)
        await db.commit()
        await db.refresh(prefs)
        logger.info("Created default notification prefs for user %s", current_user.user_id)

    return prefs


@router.put("/preferences", response_model=NotificationPreferencesResponse)
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    current_user: AuthenticatedUser,
    db: DbSession,
):
    result = await db.execute(
        select(NotificationPreferences).where(
            NotificationPreferences.user_id == current_user.user_id
        )
    )
    prefs = result.scalar_one_or_none()

    if prefs is None:
        prefs = NotificationPreferences(
            user_id=current_user.user_id,
            tenant_id=current_user.tenant_id,
            mode="regular",
            push_enabled=True,
            sms_enabled=True,
            email_enabled=True,
        )
        db.add(prefs)

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)

    await db.commit()
    await db.refresh(prefs)

    logger.info("Updated notification prefs for user %s: %s", current_user.user_id, update_data)
    return prefs

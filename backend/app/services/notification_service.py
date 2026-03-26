"""
Notification Service.
Dispatches notifications based on user preferences.

Modes:
- calm: Only urgent (escalations, complaints, emergencies)
- regular: Urgent + normal (new conversations, booking requests)
- all: Everything including resolved conversations
"""

import logging
from enum import Enum
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notifications import NotificationPreferences

logger = logging.getLogger(__name__)


class NotificationLevel(str, Enum):
    URGENT = "urgent"
    NORMAL = "normal"
    LOW = "low"


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_preferences(self, user_id: UUID) -> NotificationPreferences:
        result = await self.db.execute(
            select(NotificationPreferences).where(NotificationPreferences.user_id == user_id)
        )
        prefs = result.scalar_one_or_none()

        if prefs is None:
            # Return a default in-memory object without persisting
            prefs = NotificationPreferences(
                user_id=user_id,
                tenant_id=user_id,  # placeholder; caller should set correctly if needed
                mode="regular",
                push_enabled=True,
                sms_enabled=True,
                email_enabled=True,
            )

        return prefs

    def should_notify(self, mode: str, level: NotificationLevel) -> bool:
        if mode == "calm":
            return level == NotificationLevel.URGENT
        if mode == "regular":
            return level in (NotificationLevel.URGENT, NotificationLevel.NORMAL)
        # all
        return True

    async def notify(self, user_id: UUID, level: NotificationLevel, title: str, body: str) -> bool:
        prefs = await self.get_preferences(user_id)

        if not self.should_notify(prefs.mode, level):
            logger.debug(
                "Notification suppressed for user %s (mode=%s, level=%s): %s",
                user_id, prefs.mode, level, title
            )
            return False

        # Phase 2: actual push/SMS dispatch goes here
        logger.info(
            "NOTIFY user=%s level=%s title=%r body=%r",
            user_id, level.value, title, body
        )
        return True

import logging

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import DbSession, AuthenticatedUser
from app.models.ai_capabilities import AICapabilities
from app.schemas.ai_capabilities import AICapabilitiesResponse, AICapabilitiesUpdate

logger = logging.getLogger(__name__)
router = APIRouter()

TIER_FLAGS = {
    1: {
        "can_book_appointments": False,
        "can_send_reminders": False,
        "can_handle_cancellations": False,
        "can_follow_up_leads": False,
        "can_request_reviews": False,
        "can_handle_complaints": False,
    },
    2: {
        "can_book_appointments": True,
        "can_send_reminders": True,
        "can_handle_cancellations": False,
        "can_follow_up_leads": False,
        "can_request_reviews": False,
        "can_handle_complaints": False,
    },
    3: {
        "can_book_appointments": True,
        "can_send_reminders": True,
        "can_handle_cancellations": True,
        "can_follow_up_leads": True,
        "can_request_reviews": True,
        "can_handle_complaints": True,
    },
}


@router.get("", response_model=AICapabilitiesResponse)
async def get_ai_capabilities(
    db: DbSession,
    current_user: AuthenticatedUser,
):
    result = await db.execute(
        select(AICapabilities).where(AICapabilities.tenant_id == current_user.tenant_id)
    )
    caps = result.scalar_one_or_none()

    if not caps:
        caps = AICapabilities(tenant_id=current_user.tenant_id)
        db.add(caps)
        await db.commit()
        await db.refresh(caps)
        logger.info(f"Created default Tier 1 AI capabilities for tenant {current_user.tenant_id}")

    return caps


@router.put("", response_model=AICapabilitiesResponse)
async def update_ai_capabilities(
    data: AICapabilitiesUpdate,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    result = await db.execute(
        select(AICapabilities).where(AICapabilities.tenant_id == current_user.tenant_id)
    )
    caps = result.scalar_one_or_none()

    if not caps:
        caps = AICapabilities(tenant_id=current_user.tenant_id)
        db.add(caps)

    update = data.model_dump(exclude_unset=True)

    # If tier changed, auto-set capability flags first, then layer any explicit overrides
    if "tier" in update:
        new_tier = update["tier"]
        for flag, val in TIER_FLAGS[new_tier].items():
            setattr(caps, flag, val)

    for field, value in update.items():
        setattr(caps, field, value)

    await db.commit()
    await db.refresh(caps)
    logger.info(f"Updated AI capabilities for tenant {current_user.tenant_id}")

    return caps

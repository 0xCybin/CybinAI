import logging
from copy import deepcopy

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import text, func, select

from app.core.deps import AuthenticatedUser, DbSession
from app.models.models import KBArticle
from app.schemas.onboarding import (
    BusinessBasicsInput,
    ChannelSetupInput,
    FAQInput,
    OnboardingCompleteResponse,
    ServicesInput,
)
from app.services.onboarding_service import OnboardingService, get_industry_defaults

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/industry-defaults/{industry}")
async def get_defaults_for_industry(industry: str):
    """Return pre-populated services and FAQs for a given industry. Public endpoint."""
    return get_industry_defaults(industry)


@router.post("/business-info")
async def save_business_info(
    data: BusinessBasicsInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Save basic business info and return industry defaults for the next steps."""
    service = OnboardingService(db)
    await service.save_business_basics(
        tenant_id=current_user.tenant_id,
        basics_dict=data.model_dump(),
    )

    defaults = get_industry_defaults(data.industry)
    return {
        "message": "Business info saved.",
        "industry": data.industry,
        "suggested_services": defaults["services"],
        "suggested_faqs": defaults["faqs"],
    }


@router.post("/services")
async def save_services(
    data: ServicesInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Save services as KB articles."""
    service = OnboardingService(db)
    count = await service.save_services(
        tenant_id=current_user.tenant_id,
        services_list=[s.model_dump() for s in data.services],
    )
    return {"message": f"Saved {count} services.", "count": count}


@router.post("/faq")
async def save_faq(
    data: FAQInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Save FAQ items as KB articles and generate embeddings for RAG search."""
    service = OnboardingService(db)
    count = await service.save_faqs(
        tenant_id=current_user.tenant_id,
        faqs_list=[f.model_dump() for f in data.items],
    )
    return {"message": f"Saved {count} FAQ items with embeddings.", "count": count}


@router.post("/channels")
async def save_channels(
    data: ChannelSetupInput,
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Save enabled channel configuration to tenant settings."""
    import json

    result = await db.execute(
        text("SELECT settings FROM tenants WHERE id = :tenant_id"),
        {"tenant_id": str(current_user.tenant_id)},
    )
    row = result.fetchone()
    current_settings = deepcopy(row.settings) if row and row.settings else {}

    channels = {
        "chat": data.enable_chat,
        "email": data.enable_email,
        "phone": data.enable_phone,
        "sms": data.enable_sms,
    }
    current_settings["channels"] = channels

    await db.execute(
        text(
            "UPDATE tenants SET settings = :settings::jsonb, updated_at = NOW() WHERE id = :tenant_id"
        ),
        {
            "settings": json.dumps(current_settings),
            "tenant_id": str(current_user.tenant_id),
        },
    )
    await db.commit()

    enabled = [ch for ch, on in channels.items() if on]
    return {"message": "Channel configuration saved.", "channels_enabled": enabled}


@router.post("/complete", response_model=OnboardingCompleteResponse)
async def complete_onboarding(
    db: DbSession,
    current_user: AuthenticatedUser,
):
    """Mark onboarding complete and return a summary with the widget embed code."""
    import json

    result = await db.execute(
        text("SELECT name, settings FROM tenants WHERE id = :tenant_id"),
        {"tenant_id": str(current_user.tenant_id)},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    business_name = row.name
    settings = deepcopy(row.settings) if row.settings else {}
    settings["onboarding_complete"] = True

    await db.execute(
        text(
            "UPDATE tenants SET settings = :settings::jsonb, updated_at = NOW() WHERE id = :tenant_id"
        ),
        {
            "settings": json.dumps(settings),
            "tenant_id": str(current_user.tenant_id),
        },
    )
    await db.commit()

    channels_config = settings.get("channels", {"chat": True})
    channels_enabled = [ch for ch, on in channels_config.items() if on]
    if not channels_enabled:
        channels_enabled = ["chat"]

    services_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM kb_articles WHERE tenant_id = :tenant_id AND category = 'Services'"
        ),
        {"tenant_id": str(current_user.tenant_id)},
    )
    services_count = services_result.scalar() or 0

    faq_result = await db.execute(
        text(
            "SELECT COUNT(*) FROM kb_articles WHERE tenant_id = :tenant_id AND category != 'Services'"
        ),
        {"tenant_id": str(current_user.tenant_id)},
    )
    faq_count = faq_result.scalar() or 0

    tenant_id_str = str(current_user.tenant_id)
    widget_embed_code = (
        f'<script src="https://cdn.cybinai.com/widget.js" '
        f'data-tenant="{tenant_id_str}" async></script>'
    )

    return OnboardingCompleteResponse(
        tenant_id=tenant_id_str,
        business_name=business_name,
        channels_enabled=channels_enabled,
        services_count=services_count,
        faq_count=faq_count,
        widget_embed_code=widget_embed_code,
        message="Onboarding complete! Your AI assistant is ready.",
    )

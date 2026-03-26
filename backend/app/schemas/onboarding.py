from pydantic import BaseModel
from typing import Optional


class BusinessBasicsInput(BaseModel):
    business_name: str
    industry: str  # grooming, hvac, dental, cleaning, landscaping, salon, restaurant, auto_repair, other
    phone: Optional[str] = None
    address: Optional[str] = None
    website: Optional[str] = None
    timezone: str = "America/Chicago"
    business_hours: Optional[dict] = None


class ServiceItem(BaseModel):
    name: str
    description: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    duration_minutes: Optional[int] = None


class ServicesInput(BaseModel):
    services: list[ServiceItem]


class FAQItem(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None


class FAQInput(BaseModel):
    items: list[FAQItem]


class ChannelSetupInput(BaseModel):
    enable_chat: bool = True
    enable_email: bool = False
    enable_phone: bool = False
    enable_sms: bool = False


class OnboardingCompleteResponse(BaseModel):
    tenant_id: str
    business_name: str
    channels_enabled: list[str]
    services_count: int
    faq_count: int
    widget_embed_code: str
    message: str

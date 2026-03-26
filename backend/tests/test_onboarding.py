import pytest
from app.schemas.onboarding import BusinessBasicsInput, ServiceItem, ServicesInput, FAQItem, FAQInput


class TestOnboardingSchemas:
    def test_business_basics_valid(self):
        basics = BusinessBasicsInput(
            business_name="Paws & Claws Grooming",
            industry="grooming",
            phone="555-123-4567",
            address="123 Main St, Grand Prairie, TX",
            timezone="America/Chicago",
        )
        assert basics.business_name == "Paws & Claws Grooming"

    def test_services_with_pricing(self):
        services = ServicesInput(services=[
            ServiceItem(name="Bath", description="Basic bath", price_min=30, price_max=50),
            ServiceItem(name="Full Groom", description="Everything", price_min=60, price_max=120),
        ])
        assert len(services.services) == 2

    def test_faq_items(self):
        faq = FAQInput(items=[
            FAQItem(question="What are your hours?", answer="Mon-Sat 8am-6pm"),
            FAQItem(question="Vaccines required?", answer="Yes, rabies and Bordetella."),
        ])
        assert len(faq.items) == 2


class TestIndustryDefaults:
    def test_grooming_generates_defaults(self):
        from app.services.onboarding_service import get_industry_defaults
        defaults = get_industry_defaults("grooming")
        assert len(defaults["services"]) > 0
        assert len(defaults["faqs"]) > 0
        assert any("vaccin" in faq["question"].lower() for faq in defaults["faqs"])

    def test_hvac_generates_defaults(self):
        from app.services.onboarding_service import get_industry_defaults
        defaults = get_industry_defaults("hvac")
        assert len(defaults["services"]) > 0
        assert any("emergency" in faq["question"].lower() for faq in defaults["faqs"])

    def test_unknown_industry_returns_generic(self):
        from app.services.onboarding_service import get_industry_defaults
        defaults = get_industry_defaults("underwater_basket_weaving")
        assert len(defaults["services"]) > 0

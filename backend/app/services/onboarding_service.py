import logging
from copy import deepcopy
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.models import KBArticle, Tenant
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


INDUSTRY_DEFAULTS = {
    "grooming": {
        "services": [
            {
                "name": "Bath Only",
                "description": "Full bath, blow dry, and brush out. Includes ear cleaning and nail trim.",
                "price_min": 30,
                "price_max": 60,
                "duration_minutes": 60,
            },
            {
                "name": "Full Groom",
                "description": "Complete grooming package: bath, dry, haircut, ear cleaning, nail trim, and bandana.",
                "price_min": 50,
                "price_max": 130,
                "duration_minutes": 120,
            },
            {
                "name": "Nail Trim",
                "description": "Nail trimming and filing. Quick service, no appointment required.",
                "price_min": 15,
                "price_max": 25,
                "duration_minutes": 15,
            },
            {
                "name": "De-shed Treatment",
                "description": "Deep deshedding treatment to reduce shedding by up to 80%. Includes special shampoo and thorough blow-out.",
                "price_min": 40,
                "price_max": 80,
                "duration_minutes": 90,
            },
            {
                "name": "Puppy's First Groom",
                "description": "Gentle introductory grooming session for puppies under 6 months. Includes bath, dry, and light trim.",
                "price_min": 30,
                "price_max": 50,
                "duration_minutes": 60,
            },
        ],
        "faqs": [
            {
                "question": "How much does grooming cost?",
                "answer": "Pricing depends on your dog's size and coat type. Small dogs typically range from $30-60 for a bath or $50-80 for a full groom. Large dogs range from $60-130. We can give you an exact quote when you call or drop in.",
                "category": "Pricing",
            },
            {
                "question": "How long does grooming take?",
                "answer": "Most grooms take 2-4 hours depending on your dog's size, coat condition, and the services requested. We'll give you a time estimate when you drop off. You're welcome to wait or we can call you when your pet is ready.",
                "category": "Services",
            },
            {
                "question": "What vaccinations are required?",
                "answer": "For the safety of all pets, we require proof of current rabies, distemper, and Bordetella (kennel cough) vaccinations. All vaccines must be administered at least 48 hours before the appointment.",
                "category": "Policies",
            },
            {
                "question": "How often should I get my dog groomed?",
                "answer": "Most dogs benefit from professional grooming every 4-8 weeks. Dogs with longer coats or heavy shedding may need more frequent visits. We can recommend a schedule based on your dog's breed and coat type.",
                "category": "Services",
            },
            {
                "question": "What is your cancellation policy?",
                "answer": "We ask for at least 24 hours notice if you need to cancel or reschedule your appointment. Late cancellations or no-shows may be subject to a cancellation fee.",
                "category": "Policies",
            },
            {
                "question": "What if my dog is matted?",
                "answer": "Severely matted coats require extra time and care. We may need to shave the matted areas rather than brush them out, which can be uncomfortable for your dog if forced. There is an additional charge of $20-50 for dematting depending on severity.",
                "category": "Pricing",
            },
            {
                "question": "Do you groom anxious or aggressive dogs?",
                "answer": "We have experience with nervous pets and take extra time to help them feel comfortable. For dogs with a history of aggression, please let us know in advance so we can plan accordingly. In some cases we may recommend a vet visit before grooming.",
                "category": "Services",
            },
        ],
    },
    "hvac": {
        "services": [
            {
                "name": "Diagnostic Service Call",
                "description": "Technician visit to diagnose any HVAC issue. Fee applied toward repair cost if you proceed with service.",
                "price_min": 75,
                "price_max": 150,
                "duration_minutes": 60,
            },
            {
                "name": "AC Tune-Up",
                "description": "Complete air conditioning tune-up including coil cleaning, refrigerant check, filter replacement, and system performance test.",
                "price_min": 80,
                "price_max": 150,
                "duration_minutes": 90,
            },
            {
                "name": "Heating Tune-Up",
                "description": "Complete furnace or heat pump tune-up including burner cleaning, heat exchanger inspection, and safety checks.",
                "price_min": 80,
                "price_max": 150,
                "duration_minutes": 90,
            },
            {
                "name": "Filter Replacement",
                "description": "Standard filter replacement service. Includes inspection of filter housing and airflow check.",
                "price_min": 20,
                "price_max": 50,
                "duration_minutes": 30,
            },
            {
                "name": "Emergency Service",
                "description": "24/7 emergency HVAC service for heating or cooling failures. Priority response, same-day availability.",
                "price_min": 150,
                "price_max": 300,
                "duration_minutes": 90,
            },
        ],
        "faqs": [
            {
                "question": "How much does a service call cost?",
                "answer": "Our standard diagnostic service call is $75-150. If you choose to proceed with the repair, we apply the service call fee toward the total cost. Final pricing depends on the issue and parts required.",
                "category": "Pricing",
            },
            {
                "question": "Do you offer emergency service?",
                "answer": "Yes, we offer 24/7 emergency service for heating and cooling failures. Emergency rates apply for after-hours calls. To request emergency service, call us and mention it's an emergency so we can prioritize your call.",
                "category": "Services",
            },
            {
                "question": "How often should I have my HVAC system serviced?",
                "answer": "We recommend servicing your HVAC system twice a year: once in spring for your AC and once in fall for your heating system. Regular maintenance prevents breakdowns, extends equipment life, and keeps your energy bills lower.",
                "category": "Services",
            },
            {
                "question": "Do you offer maintenance plans?",
                "answer": "Yes, our maintenance plans start at $180/year and include two tune-ups (AC + heating), priority scheduling, and discounts on repairs. It's the best way to keep your system running efficiently and avoid costly breakdowns.",
                "category": "Pricing",
            },
            {
                "question": "Can you give me a quote over the phone?",
                "answer": "We can give you general pricing ranges over the phone, but an accurate quote requires a technician to diagnose the issue in person. There are too many variables with HVAC systems to commit to a final price without seeing the equipment.",
                "category": "Pricing",
            },
            {
                "question": "What are your business hours?",
                "answer": "We're available Monday through Friday 7am-6pm and Saturday 8am-2pm for standard service calls. Emergency service is available 24/7, including nights and holidays.",
                "category": "General",
            },
        ],
    },
    "dental": {
        "services": [
            {
                "name": "Cleaning & Exam",
                "description": "Comprehensive dental exam, x-rays, and professional teeth cleaning by a dental hygienist.",
                "price_min": 100,
                "price_max": 300,
                "duration_minutes": 60,
            },
            {
                "name": "Emergency Visit",
                "description": "Same-day emergency appointment for tooth pain, broken teeth, lost fillings, or other urgent dental issues.",
                "price_min": 150,
                "price_max": 400,
                "duration_minutes": 60,
            },
            {
                "name": "Teeth Whitening",
                "description": "Professional in-office teeth whitening treatment for a brighter smile in one visit.",
                "price_min": 200,
                "price_max": 600,
                "duration_minutes": 90,
            },
        ],
        "faqs": [
            {
                "question": "Do you accept dental insurance?",
                "answer": "Yes, we accept most major dental insurance plans. We'll verify your benefits before your appointment and file claims on your behalf. For patients without insurance, we offer payment plans and a discount membership program.",
                "category": "Insurance",
            },
            {
                "question": "How often should I come in for a cleaning?",
                "answer": "Most patients should visit every 6 months for a routine cleaning and exam. Patients with gum disease or other concerns may need more frequent visits. We'll recommend a schedule based on your individual needs.",
                "category": "Services",
            },
            {
                "question": "Can I get a same-day emergency appointment?",
                "answer": "Yes, we reserve time each day for dental emergencies. Call us first thing in the morning and we'll do our best to see you the same day. If you're in severe pain, please let us know when you call.",
                "category": "Services",
            },
        ],
    },
    "generic": {
        "services": [
            {
                "name": "Consultation",
                "description": "Initial consultation to discuss your needs and provide a custom quote.",
                "price_min": 0,
                "price_max": 100,
                "duration_minutes": 30,
            },
            {
                "name": "Standard Service",
                "description": "Our standard service package. Contact us for details and pricing.",
                "price_min": 50,
                "price_max": 200,
                "duration_minutes": 60,
            },
        ],
        "faqs": [
            {
                "question": "What are your hours?",
                "answer": "Please contact us for our current business hours. We're happy to accommodate your schedule.",
                "category": "General",
            },
            {
                "question": "How do I book an appointment?",
                "answer": "You can reach us by phone, email, or through this chat. We'll get back to you as soon as possible to confirm your appointment.",
                "category": "General",
            },
            {
                "question": "What is your cancellation policy?",
                "answer": "We ask for at least 24 hours notice if you need to cancel or reschedule. Please contact us as soon as possible if your plans change.",
                "category": "Policies",
            },
        ],
    },
}


def get_industry_defaults(industry: str) -> dict:
    return INDUSTRY_DEFAULTS.get(industry, INDUSTRY_DEFAULTS["generic"])


class OnboardingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def save_business_basics(self, tenant_id: UUID, basics_dict: dict) -> None:
        result = await self.db.execute(
            text("SELECT id, name, settings FROM tenants WHERE id = :tenant_id"),
            {"tenant_id": str(tenant_id)},
        )
        row = result.fetchone()
        if not row:
            raise ValueError(f"Tenant {tenant_id} not found")

        current_settings = row.settings or {}
        settings = deepcopy(current_settings)
        profile = settings.get("profile", {})

        if basics_dict.get("phone"):
            profile["phone"] = basics_dict["phone"]
        if basics_dict.get("address"):
            profile["address"] = basics_dict["address"]
        if basics_dict.get("website"):
            profile["website"] = basics_dict["website"]
        if basics_dict.get("timezone"):
            profile["timezone"] = basics_dict["timezone"]
        if basics_dict.get("business_hours"):
            profile["business_hours"] = basics_dict["business_hours"]

        profile["industry"] = basics_dict.get("industry", "other")

        settings["profile"] = profile

        import json
        await self.db.execute(
            text(
                "UPDATE tenants SET name = :name, settings = :settings::jsonb, updated_at = NOW() "
                "WHERE id = :tenant_id"
            ),
            {
                "name": basics_dict["business_name"],
                "settings": json.dumps(settings),
                "tenant_id": str(tenant_id),
            },
        )
        await self.db.commit()
        logger.info(f"Saved business basics for tenant {tenant_id}")

    async def save_services(self, tenant_id: UUID, services_list: list[dict]) -> int:
        for svc in services_list:
            parts = []
            if svc.get("description"):
                parts.append(svc["description"])

            price_min = svc.get("price_min")
            price_max = svc.get("price_max")
            if price_min is not None and price_max is not None:
                parts.append(f"Price: ${price_min:.0f} - ${price_max:.0f}")
            elif price_min is not None:
                parts.append(f"Starting at ${price_min:.0f}")
            elif price_max is not None:
                parts.append(f"Up to ${price_max:.0f}")

            if svc.get("duration_minutes"):
                parts.append(f"Approximate duration: {svc['duration_minutes']} minutes")

            content = "\n".join(parts) if parts else svc["name"]

            await self.db.execute(
                text(
                    "INSERT INTO kb_articles (tenant_id, title, content, category, published, tags, metadata_) "
                    "VALUES (:tenant_id, :title, :content, :category, true, '{}', '{}'::jsonb)"
                ),
                {
                    "tenant_id": str(tenant_id),
                    "title": svc["name"],
                    "content": content,
                    "category": "Services",
                },
            )

        await self.db.commit()
        logger.info(f"Saved {len(services_list)} services for tenant {tenant_id}")
        return len(services_list)

    async def save_faqs(self, tenant_id: UUID, faqs_list: list[dict]) -> int:
        embedding_service = EmbeddingService(self.db)

        for faq in faqs_list:
            content = faq["answer"]
            category = faq.get("category") or "FAQ"

            result = await self.db.execute(
                text(
                    "INSERT INTO kb_articles (tenant_id, title, content, category, published, tags, metadata_) "
                    "VALUES (:tenant_id, :title, :content, :category, true, '{}', '{}'::jsonb) "
                    "RETURNING id"
                ),
                {
                    "tenant_id": str(tenant_id),
                    "title": faq["question"],
                    "content": content,
                    "category": category,
                },
            )
            await self.db.commit()

            row = result.fetchone()
            if row:
                article_id = row[0]
                try:
                    await embedding_service.embed_article(
                        tenant_id=tenant_id,
                        article_id=article_id,
                        title=faq["question"],
                        content=content,
                    )
                except Exception as e:
                    logger.warning(f"Failed to embed FAQ article {article_id}: {e}")

        logger.info(f"Saved {len(faqs_list)} FAQs for tenant {tenant_id}")
        return len(faqs_list)

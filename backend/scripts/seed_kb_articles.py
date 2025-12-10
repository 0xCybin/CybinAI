"""
Seed Knowledge Base Articles for HVAC Client
Run this after database is initialized to populate sample content.

Usage:
    cd C:\Users\0xCyb\CybinAI\backend
    .\venv\Scripts\activate
    python scripts/seed_kb_articles.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from uuid import UUID

from app.models.models import KBArticle, Tenant
from app.core.config import settings


# HVAC-specific sample articles
HVAC_ARTICLES = [
    {
        "title": "About Our Company",
        "content": """ACME HVAC is a family-owned heating and cooling company serving New Jersey since 1995. 

We specialize in residential and light commercial HVAC services including:
- Air conditioning installation and repair
- Heating system installation and repair
- Furnace maintenance and tune-ups
- Heat pump services
- Indoor air quality solutions
- Ductwork repair and cleaning

Our team of certified technicians is available for both scheduled appointments and emergency service. We're proud to serve homeowners throughout Central New Jersey with honest, reliable HVAC services.""",
        "category": "General",
        "tags": ["about", "company", "services"],
    },
    {
        "title": "Service Areas",
        "content": """We proudly serve the following areas in New Jersey:

**Primary Service Area:**
- Edison
- New Brunswick
- Piscataway
- Highland Park
- East Brunswick
- South Brunswick
- North Brunswick
- Metuchen
- Woodbridge

**Extended Service Area (additional travel fee may apply):**
- Princeton
- Somerset
- Bridgewater
- Sayreville
- Perth Amboy

If your town isn't listed, please call us - we may still be able to help!""",
        "category": "General",
        "tags": ["service area", "locations", "new jersey"],
    },
    {
        "title": "Business Hours",
        "content": """**Regular Business Hours:**
- Monday - Friday: 8:00 AM - 6:00 PM
- Saturday: 9:00 AM - 2:00 PM
- Sunday: Closed

**Emergency Service:**
We offer 24/7 emergency service for existing customers. Emergency calls outside regular hours are subject to an after-hours service fee.

**Holidays:**
We are closed on major holidays including New Year's Day, Memorial Day, July 4th, Labor Day, Thanksgiving, and Christmas. Emergency service is still available.""",
        "category": "Hours & Location",
        "tags": ["hours", "schedule", "emergency"],
    },
    {
        "title": "Pricing - Service Calls",
        "content": """**Diagnostic/Service Call Fee:** $89

This fee covers:
- Travel to your home
- Full system diagnostic
- Written estimate for any repairs needed

**What's Included:**
The diagnostic fee is waived if you proceed with the recommended repair. If you choose not to repair, you only pay the $89 service call fee.

**Emergency Service:**
After-hours and weekend emergency calls have an additional $75 emergency fee on top of the standard service call rate.

*Prices subject to change. Contact us for current pricing.*""",
        "category": "Pricing",
        "tags": ["pricing", "service call", "diagnostic", "cost"],
    },
    {
        "title": "Pricing - AC Installation",
        "content": """**Air Conditioning Installation**

AC installation costs depend on several factors:
- Size of your home (square footage)
- Existing ductwork condition
- Efficiency rating (SEER) of the new unit
- Brand and model selected

**Typical Price Ranges:**
- Basic 2-ton system: $4,500 - $6,000
- Mid-range 3-ton system: $6,000 - $8,500
- High-efficiency 3+ ton system: $8,500 - $12,000+

**We offer:**
- Free in-home estimates
- Financing options available
- Manufacturer rebates when available
- 10-year parts warranty on select systems

Contact us to schedule a free estimate!""",
        "category": "Pricing",
        "tags": ["pricing", "ac", "installation", "air conditioning", "cost"],
    },
    {
        "title": "Pricing - Heating Installation",
        "content": """**Heating System Installation**

Furnace and heating installation costs vary based on:
- Fuel type (gas, oil, electric, heat pump)
- Home size and heating requirements
- Efficiency rating (AFUE for furnaces)
- Existing ductwork and venting

**Typical Price Ranges:**
- Gas furnace replacement: $3,500 - $7,500
- Oil furnace replacement: $4,500 - $8,500
- Heat pump system: $5,500 - $10,000+

**Included with installation:**
- Removal of old equipment
- All permits and inspections
- 1-year labor warranty
- Manufacturer's parts warranty

Schedule your free heating estimate today!""",
        "category": "Pricing",
        "tags": ["pricing", "heating", "furnace", "installation", "cost"],
    },
    {
        "title": "Maintenance Plans",
        "content": """**ACME Comfort Club - Annual Maintenance Plan**

Keep your HVAC system running efficiently with our maintenance plan!

**Plan Includes:**
- 2 tune-ups per year (heating + cooling)
- Priority scheduling
- 15% discount on all repairs
- No overtime charges
- Extended equipment life

**Annual Cost:** $199/year (or $18/month)

**What we check during tune-ups:**
- Refrigerant levels
- Electrical connections
- Thermostat calibration
- Filter replacement
- Condensate drain cleaning
- Safety controls
- Overall system performance

Sign up anytime - call or ask your technician!""",
        "category": "Services",
        "tags": ["maintenance", "tune-up", "plan", "comfort club"],
    },
    {
        "title": "Emergency Services",
        "content": """**24/7 Emergency HVAC Service**

We understand HVAC emergencies don't wait for business hours!

**What qualifies as an emergency:**
- No heat when outdoor temps are below 40°F
- No cooling when outdoor temps exceed 90°F
- Gas smell or carbon monoxide detector alarm
- Water leaking from your system
- Complete system failure

**Emergency Service Fee:** $75 (in addition to standard diagnostic fee)

**Response Time:** We aim to respond to emergencies within 2-4 hours, depending on call volume.

**To request emergency service:** Call our main number and follow the prompts for emergency service. Leave a detailed message and we'll call you back ASAP.""",
        "category": "Services",
        "tags": ["emergency", "24/7", "urgent", "after hours"],
    },
    {
        "title": "Scheduling an Appointment",
        "content": """**How to Schedule Service**

**Option 1: Call Us**
Call (555) 123-4567 during business hours to speak with our scheduling team.

**Option 2: Online**
Use our online chat to request an appointment. Let us know:
- Your name and address
- Best phone number to reach you
- Brief description of the issue
- Your preferred date/time

**What to Expect:**
1. We'll confirm your appointment via text or email
2. You'll receive a reminder the day before
3. Our technician will call 30 minutes before arrival
4. After service, you'll receive an emailed invoice

**Cancellation Policy:**
Please give us 24 hours notice if you need to reschedule. Same-day cancellations may be subject to a $50 fee.""",
        "category": "General",
        "tags": ["appointment", "schedule", "booking"],
    },
    {
        "title": "Payment Options",
        "content": """**Accepted Payment Methods**

We accept:
- Cash
- Check
- All major credit cards (Visa, MasterCard, Amex, Discover)
- Financing (for installations over $1,000)

**Financing Options:**
We offer financing through GreenSky with:
- 0% APR for 12 months on qualifying purchases
- Low monthly payment options
- Quick approval process
- Apply online or with your technician

**Payment Terms:**
- Service calls: Payment due at time of service
- Installations: 50% deposit, balance due at completion
- We do not offer payment plans for repairs under $500

Questions about payment? Just ask!""",
        "category": "Policies",
        "tags": ["payment", "financing", "credit card"],
    },
    {
        "title": "Warranties and Guarantees",
        "content": """**Our Warranties & Guarantees**

**Satisfaction Guarantee:**
If you're not satisfied with our service, let us know within 30 days and we'll make it right.

**Repair Warranty:**
All repairs include a 90-day parts and labor warranty. If the same repair fails within 90 days, we'll fix it at no charge.

**Installation Warranty:**
- 1-year labor warranty on all installations
- Manufacturer's parts warranty (typically 5-10 years)
- Extended warranties available for purchase

**What's NOT covered:**
- Damage from power surges or acts of nature
- Improper use or lack of maintenance
- Repairs performed by others
- Cosmetic damage

Keep your receipts and warranty documents in a safe place!""",
        "category": "Policies",
        "tags": ["warranty", "guarantee", "coverage"],
    },
    {
        "title": "Energy Saving Tips",
        "content": """**Tips to Lower Your Energy Bills**

**Quick Wins:**
- Change your air filter every 1-3 months
- Set your thermostat to 68°F in winter, 76°F in summer
- Use a programmable or smart thermostat
- Keep vents clear of furniture and curtains
- Close blinds on sunny days in summer

**Bigger Savings:**
- Seal air leaks around windows and doors
- Add insulation to your attic
- Upgrade to a high-efficiency system (16+ SEER AC, 95%+ AFUE furnace)
- Consider a ductless mini-split for problem rooms
- Schedule annual maintenance

**Did You Know?**
A dirty filter can increase energy costs by 15%! Regular maintenance keeps your system running at peak efficiency.

Want a home energy assessment? Ask us about our comfort consultation!""",
        "category": "General",
        "tags": ["energy", "savings", "tips", "efficiency"],
    },
]


async def seed_articles():
    """Seed the database with HVAC sample articles."""
    
    # Create async engine
    engine = create_async_engine(settings.database_url, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        # Find the ACME HVAC tenant
        result = await session.execute(
            select(Tenant).where(Tenant.subdomain == "acmehvac")
        )
        tenant = result.scalar_one_or_none()
        
        if not tenant:
            print("❌ Error: 'acmehvac' tenant not found!")
            print("   Make sure you've registered a test account first.")
            print("   Go to http://localhost:3000 and register with subdomain 'acmehvac'")
            return
        
        print(f"✅ Found tenant: {tenant.name} (ID: {tenant.id})")
        
        # Check for existing articles
        existing = await session.execute(
            select(KBArticle).where(KBArticle.tenant_id == tenant.id)
        )
        existing_articles = existing.scalars().all()
        
        if existing_articles:
            print(f"⚠️  Found {len(existing_articles)} existing articles.")
            response = input("   Delete existing and reseed? (y/n): ")
            if response.lower() == 'y':
                for article in existing_articles:
                    await session.delete(article)
                await session.commit()
                print("   Deleted existing articles.")
            else:
                print("   Keeping existing articles. Exiting.")
                return
        
        # Create new articles
        print(f"\n📝 Creating {len(HVAC_ARTICLES)} articles...")
        
        for article_data in HVAC_ARTICLES:
            article = KBArticle(
                tenant_id=tenant.id,
                title=article_data["title"],
                content=article_data["content"],
                category=article_data["category"],
                tags=article_data["tags"],
                published=True,
            )
            session.add(article)
            print(f"   ✅ {article_data['title']}")
        
        await session.commit()
        print(f"\n🎉 Successfully seeded {len(HVAC_ARTICLES)} KB articles!")
        print("   View them at: http://localhost:3000/admin/knowledge-base")


if __name__ == "__main__":
    asyncio.run(seed_articles())
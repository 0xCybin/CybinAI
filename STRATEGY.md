# MykoDesk - Full Strategy & Implementation Plan

## The Vision

MykoDesk is an AI-powered customer service platform for small local businesses. It handles phone calls, texts, emails, and web chat - everything a receptionist would do - at a fraction of the cost. Business owners get a dashboard to monitor everything. Fair pricing, no hidden fees, no scammy per-seat multipliers.

---

## The Market Opportunity

### Why This Works Right Now

- AI CS market: $9.5B in 2025, growing 20%/year
- 60-80% of small business inquiries are routine (hours, pricing, booking) - perfect for AI
- Average lead response time is **47 hours**. Only 23% of businesses respond within 5 min
- 78% of customers buy from whoever responds first
- Small businesses currently spend $3,700-5,400/mo on a receptionist, or $250-1,700/mo on virtual receptionist services

### Your Competitive Advantage

The big players (Zendesk, Intercom, Freshdesk) are expensive, complex, and built for tech companies. Small local businesses (plumbers, HVAC, dentists, salons, landscapers) need something simple that just works. Nobody is doing **AI voice + text + email + chat in one affordable package** for the local business market.

---

## Target Customers (Prioritized)

### Tier 1 - Best Fit (Start Here)
| Industry | Why | CS Needs |
|----------|-----|----------|
| HVAC/Plumbing/Electrical | High call volume, seasonal peaks, emergency calls | Scheduling, after-hours, quotes, dispatch |
| Dental/Medical offices | Constant appointment calls, insurance questions | Booking, reminders, intake, insurance FAQ |
| Cleaning/Landscaping | Repeat scheduling, pricing questions | Booking, quotes, service confirmation |

### Tier 2 - Good Fit (Expand To)
| Industry | Why | CS Needs |
|----------|-----|----------|
| Salons/Spas | Appointment-heavy, rescheduling | Booking, waitlist, service questions |
| Auto Repair | Status updates, quote requests | Quotes, repair status, warranty FAQ |
| Real Estate agents | Lead follow-up critical, showing scheduling | Lead capture, showing scheduling |

### Tier 3 - Later
Restaurants, law firms, property management, small retail

---

## What MykoDesk Does (Full Feature Set)

### Core: The AI Agent
The AI handles customer interactions across all channels. For each business, it learns:
- Business info (hours, location, services, pricing)
- How to book appointments
- Common questions & answers (knowledge base)
- When to escalate to a human
- The business's tone/personality

### Channels

| Channel | What It Does | Tech |
|---------|-------------|------|
| **Phone** | Answers calls, books appointments, takes messages, handles after-hours | Retell.ai ($0.07/min) |
| **SMS/Text** | Two-way texting, appointment reminders, follow-ups | Twilio ($0.0083/msg) |
| **Email** | Reads and responds to customer emails, threads conversations | SendGrid or Amazon SES |
| **Web Chat** | Embeddable widget on business website | Custom (already built) |

### Dashboard (Business Owner View)
- **Conversation inbox** - All channels unified in one view
- **Analytics** - Call volume, AI resolution rate, response times, busiest hours
- **Knowledge base** - Add/edit FAQs and business info the AI uses
- **Settings** - Business hours, escalation rules, notification preferences
- **Customer list** - Contact history across all channels
- **Activity log** - Everything the AI did, with full transcripts

### Key Capabilities
- **Appointment booking** - Integrates with Jobber, Google Calendar, Calendly, Acuity
- **After-hours coverage** - 24/7 phone/text/chat, takes messages, books for next day
- **Lead capture** - Captures name, phone, email, what they need
- **Appointment reminders** - Automated SMS/email reminders reduce no-shows 30-38%
- **Review requests** - Follow up after service asking for Google review
- **Human escalation** - AI knows when to hand off, notifies the right person
- **Multi-business** - Each business gets their own isolated environment

---

## Pricing Strategy

### Philosophy
- Flat monthly price. No per-seat, no per-resolution, no surprise bills
- Include everything in the plan (AI, all channels, dashboard)
- Usage-based only for actual telecom costs (calls, texts) with generous included amounts
- Annual discount that's actually meaningful (20%)

### Proposed Tiers

| Plan | Monthly | Annual | What's Included |
|------|---------|--------|-----------------|
| **Starter** | $99/mo | $79/mo | Web chat + email, 1 user, 500 AI conversations, knowledge base, basic analytics |
| **Pro** | $199/mo | $159/mo | Everything in Starter + phone (100 min included) + SMS (500 texts included) + 3 users, scheduling integration, appointment reminders |
| **Business** | $349/mo | $279/mo | Everything in Pro + 500 min phone + 2,000 texts + unlimited users, priority support, custom AI training, migration assistance |

### Overage Pricing (Transparent)
- Extra phone minutes: $0.12/min (our cost ~$0.07, healthy margin)
- Extra SMS: $0.02/text (our cost ~$0.01)
- Extra AI conversations: $0.05 each (our cost ~$0.001-0.01)

### Why This Is Fair
- A receptionist costs $3,700-5,400/mo
- Ruby virtual receptionist costs $250-1,700/mo for just phone
- Smith.ai costs $292-1,170/mo
- MykoDesk Pro at $199/mo does phone + text + email + chat + AI
- Business owner saves $2,000-5,000/mo minimum

### Your Unit Economics (Per Customer on Pro Plan)
| Cost | Monthly |
|------|---------|
| LLM (GPT-4o Mini/Claude Haiku) | $2-10 |
| Phone/Retell (100 min) | $7 |
| SMS/Twilio (500 texts) | $8 |
| Email/SES | $1-2 |
| Infrastructure (DB, hosting, per-tenant share) | $5-10 |
| **Total cost per customer** | **~$25-35** |
| **Revenue (Pro plan)** | **$199** |
| **Gross margin** | **~82-87%** |

---

## Tech Stack

### What You Already Have (Keep)
- **Backend**: FastAPI + Python (solid choice)
- **Database**: PostgreSQL with multi-tenant schema (good)
- **Auth**: JWT-based authentication (working)
- **WebSocket**: Socket.IO for real-time chat (working)
- **LLM**: OpenAI/DeepSeek abstraction layer (good, needs expanding)
- **Chat widget**: Basic implementation (needs polish)
- **Jobber integration**: Scheduling via Jobber API (good start)
- **Email**: Resend integration (working)
- **Frontend**: Next.js dashboard (good foundation)

### What to Add

| Component | Technology | Why | Cost |
|-----------|-----------|-----|------|
| **Voice AI** | Retell.ai | Best price ($0.07/min), good latency (~600ms), appointment booking built-in | Pay per use |
| **SMS** | Twilio | Industry standard, reliable, good docs | $0.0083/msg + $1/mo per number |
| **Email (upgrade)** | Amazon SES or keep Resend | SES is 3-30x cheaper at scale | $0.10/1K emails |
| **LLM (primary)** | GPT-4o Mini or Claude Haiku | Best cost/quality for CS ($0.0005-0.001/conversation) | Pay per use |
| **LLM (complex)** | GPT-4o or Claude Sonnet | For escalation analysis, complex queries | Pay per use |
| **Vector DB (RAG)** | pgvector (PostgreSQL extension) | Already using Postgres, no new infra, free | $0 |
| **Billing** | Stripe | Industry standard for SaaS billing | 2.9% + $0.30 per charge |
| **Background jobs** | Celery + Redis | Already have Redis, need async task processing | $0 |
| **Monitoring** | Sentry + basic logging | Error tracking, performance monitoring | Free tier |

### Architecture Overview

```
                    Customer Touchpoints
                    ┌─────────────────────┐
                    │  Phone  │ SMS │ Email│ Web Chat
                    └────┬────┴──┬──┴──┬──┴────┬────┘
                         │      │     │       │
                    ┌────▼──────▼─────▼───────▼────┐
                    │     Channel Router            │
                    │  (normalizes all inbound to   │
                    │   unified conversation format)│
                    └──────────────┬────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │      AI Engine             │
                    │  ┌─────────────────────┐  │
                    │  │ Context Builder      │  │
                    │  │ (conversation history│  │
                    │  │  + RAG knowledge     │  │
                    │  │  + business config)  │  │
                    │  └──────────┬──────────┘  │
                    │             │              │
                    │  ┌──────────▼──────────┐  │
                    │  │ LLM (GPT-4o Mini /  │  │
                    │  │  Claude Haiku)       │  │
                    │  └──────────┬──────────┘  │
                    │             │              │
                    │  ┌──────────▼──────────┐  │
                    │  │ Tool Router          │  │
                    │  │ (book, check status, │  │
                    │  │  escalate, KB search)│  │
                    │  └─────────────────────┘  │
                    └──────────────┬────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    Integrations Layer      │
                    │  Jobber │ GCal │ Twilio    │
                    │  Stripe │ SES  │ Retell    │
                    └──────────────┬────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │    PostgreSQL Database     │
                    │  (multi-tenant, pgvector)  │
                    └───────────────────────────┘
```

---

## Migration System

### Why This Matters
Businesses switching from Zendesk, Freshdesk, Intercom, or even just spreadsheets need a smooth transition. A bad migration kills the sale.

### What We Import
1. **Contacts/Customers** - Name, email, phone, notes (CSV or API)
2. **Conversation history** - Past tickets/chats for context (JSON/API)
3. **Knowledge base articles** - FAQs, help docs (markdown/HTML)
4. **Canned responses/templates** - Pre-written replies (CSV)

### Supported Migration Sources (Priority Order)
1. **CSV/Spreadsheet** - Most small businesses live here
2. **Zendesk** - Full API export available
3. **Freshdesk** - Full API export available
4. **Intercom** - Limited API, OAuth required
5. **Google Sheets** - Direct integration
6. **Manual entry** - Guided setup wizard

### Migration Flow
1. Business selects source (or uploads CSV)
2. MykoDesk maps fields automatically (with manual override)
3. Preview imported data before committing
4. Import runs in background
5. Verification report shows what was imported

### Onboarding Wizard (Critical for Adoption)
Instead of dumping businesses into a blank dashboard:
1. **Business basics** - Name, industry, hours, location, phone, website
2. **Services** - What do you offer? (pre-filled by industry)
3. **FAQ builder** - "What are your top 5 questions customers ask?" -> auto-generates KB
4. **Channel setup** - Which channels do you want? (guided connection)
5. **Test conversation** - Owner chats with their own AI to verify it works
6. **Go live** - Embed widget, forward phone number, connect email

---

## Compliance Checklist

### SMS/Text (TCPA + 10DLC)
- [ ] Register with The Campaign Registry (TCR) - mandatory since Feb 2025
- [ ] Get 10DLC numbers for each business
- [ ] Collect prior express written consent before texting
- [ ] Include opt-out in every message ("Reply STOP to unsubscribe")
- [ ] Honor opt-outs immediately (FCC rule April 2026: opt-out applies to ALL future messages)
- [ ] Track consent records

### Phone/Voice
- [ ] Disclose AI in call greeting ("Hi, this is [Business]'s AI assistant...")
- [ ] Disclose call recording where required (two-party consent states)
- [ ] Allow callers to request human at any time
- [ ] Don't store payment card data in call recordings (PCI)

### Email (CAN-SPAM)
- [ ] Include unsubscribe link in every email
- [ ] Honor unsubscribes within 10 business days
- [ ] Include physical business address
- [ ] Don't use deceptive subject lines

### Data Privacy
- [ ] Encrypt data at rest and in transit (SSL/TLS)
- [ ] Data isolation between tenants (row-level security)
- [ ] Data retention policy (30-90 day auto-delete option)
- [ ] Privacy policy on widget and dashboard
- [ ] Don't store sensitive data (SSN, full credit card numbers) in conversations

---

## Sales Playbook (How to Get Customers)

### Your Advantage: You're Local
Big SaaS companies sell online. You can walk into a business, show them a demo on your phone, and set them up the same day. This is huge.

### Approach
1. **Build a demo for each industry** - "Here's what MykoDesk looks like for a plumbing company"
2. **Free 14-day trial** - No credit card required, full Pro features
3. **Same-day setup** - Walk in, set up their account, train the AI on their business, go live
4. **Show the math** - "You're paying $X for a receptionist/answering service. This is $199/mo and works 24/7"

### Pitch Points (What Resonates)
- "78% of customers buy from whoever responds first. Right now your average response time is probably hours. This responds in seconds."
- "It's not replacing your staff - it handles the routine stuff so they can focus on the work that matters"
- "Nights, weekends, holidays - never miss a call again"
- "One customer who would've gone to a competitor pays for 6 months of MykoDesk"

### What Kills Deals (Avoid These)
- Hidden costs or unclear pricing
- "It can do everything!" (over-promising)
- Complicated setup that takes weeks
- No way to try before buying
- AI that sounds robotic or gets things wrong in the demo

### Realistic Conversion Expectations
- Cold outreach: 1-3% meeting rate
- Demo to trial: 30-40%
- Trial to paid: 20-30%
- Target: 10-15 demos/month -> 3-5 new customers/month

---

## Implementation Phases

### Phase 1: Core Platform (4-6 weeks)
**Goal: Web chat + email working perfectly with great onboarding**

- [ ] Revamp onboarding wizard (business setup, FAQ builder, test conversation)
- [ ] Upgrade AI engine (switch to GPT-4o Mini, add pgvector RAG)
- [ ] Polish chat widget (customizable colors, business branding)
- [ ] Polish dashboard (unified inbox, conversation view, basic analytics)
- [ ] Email channel (inbound parsing + AI response + threading)
- [ ] Knowledge base improvements (easy editing, category management)
- [ ] Billing integration (Stripe, plan management)

### Phase 2: Phone + SMS (3-4 weeks)
**Goal: Full omnichannel - the killer feature**

- [ ] Retell.ai integration (inbound/outbound voice AI)
- [ ] Twilio SMS integration (two-way texting)
- [ ] Phone number provisioning per business
- [ ] 10DLC registration flow
- [ ] Call transcripts in unified inbox
- [ ] SMS conversation threading
- [ ] Appointment reminders (SMS + email)
- [ ] After-hours routing logic

### Phase 3: Integrations + Migration (2-3 weeks)
**Goal: Connect to tools businesses already use**

- [ ] Google Calendar integration
- [ ] Calendly/Acuity integration
- [ ] CSV import for contacts + KB articles
- [ ] Zendesk/Freshdesk migration tool
- [ ] Zapier integration (for anything else)
- [ ] Google Business Profile integration

### Phase 4: Growth Features (Ongoing)
- [ ] Review request automation
- [ ] Lead scoring
- [ ] Multi-location support
- [ ] Custom AI personality/tone editor
- [ ] Advanced analytics (ROI dashboard)
- [ ] Mobile app for business owners
- [ ] WhatsApp/Facebook Messenger channels
- [ ] White-label option (for agencies)

---

## Key Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI gives wrong answer to customer | Customer upset, business loses trust | Confidence scoring, human escalation, easy override, conversation review |
| Voice AI latency too high | Awkward phone conversations | Use Retell (lowest latency), test extensively, fallback to voicemail |
| SMS compliance violation | Fines ($500-1,500 per text) | 10DLC registration, consent tracking, automatic opt-out handling |
| LLM costs spike | Margins shrink | Use cheapest models (Haiku/4o-mini), cache common responses, set per-tenant limits |
| Small businesses don't adopt | No revenue | Free trial, same-day setup, industry-specific demos, local sales approach |
| Multi-turn conversations confuse AI | Bad customer experience | Conversation summarization, context windowing, escalation triggers |

---

## Success Metrics

### Month 1-3 (Validation)
- 5-10 paying customers
- >80% AI resolution rate on routine queries
- <2 min average first response time
- <3% customer complaint rate about AI

### Month 4-6 (Growth)
- 20-30 paying customers
- $4,000-6,000 MRR
- <5% monthly churn
- Net Promoter Score >40

### Month 7-12 (Scale)
- 50-100 paying customers
- $10,000-20,000 MRR
- Referral program generating 20%+ of new customers
- Expand to adjacent metro areas

---

## Bottom Line

You're building something people actually need. The key differentiators:

1. **All-in-one** - Phone + text + email + chat in one tool (competitors make you buy separate products)
2. **Fair pricing** - Flat rate, no per-seat multiplication, transparent overage
3. **Local sales** - You can walk into businesses and set them up same-day (competitors can't)
4. **Simple** - Built for people who aren't technical, not for IT teams
5. **AI-first** - Not chat software with AI bolted on, but AI that happens to work across all channels

The tech stack is proven, the unit economics work ($25-35 cost vs $199 revenue = 82%+ margin), and the market is massive. Start with Phase 1, get 5 paying customers, then build Phase 2.

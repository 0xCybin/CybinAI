# MykoDesk - Complete System Design Specification

**Version**: 1.0
**Date**: 2026-03-25
**Author**: John (founder) + Claude Code
**Status**: Draft - Pending Review

---

## Table of Contents

1. [Business Overview](#1-business-overview)
2. [Customer Service Fundamentals](#2-customer-service-fundamentals)
3. [Target Market & Industry Profiles](#3-target-market--industry-profiles)
4. [Product Definition](#4-product-definition)
5. [AI Agent Behavior Specification](#5-ai-agent-behavior-specification)
6. [Channel Architecture](#6-channel-architecture)
7. [Dashboard & UX Design](#7-dashboard--ux-design)
8. [Technical Architecture](#8-technical-architecture)
9. [Integrations](#9-integrations)
10. [Migration System](#10-migration-system)
11. [Onboarding System](#11-onboarding-system)
12. [Pricing & Billing](#12-pricing--billing)
13. [Compliance & Legal](#13-compliance--legal)
14. [Business Operations](#14-business-operations)
15. [Sales Playbook](#15-sales-playbook)
16. [Implementation Phases](#16-implementation-phases)
17. [Success Metrics](#17-success-metrics)
18. [Risk Register](#18-risk-register)
19. [Glossary](#19-glossary)

---

## 1. Business Overview

### What MykoDesk Is

MykoDesk is an AI-powered customer service platform for small local businesses (1-50 employees). It handles phone calls, text messages, emails, and web chat - everything a receptionist or customer service rep would do - at a fraction of the cost.

### The Problem

- Small businesses lose an average of $126,000/year to unanswered calls
- 62% of phone calls to small businesses go unanswered
- Average lead response time across industries is 47 hours
- Only 23% of businesses respond within 5 minutes
- 78% of customers buy from whoever responds first
- 85% of callers who reach voicemail will never call back
- A full-time receptionist costs $45,000-65,000/year
- Virtual receptionist services (Ruby, Smith.ai) cost $250-1,700/month and only handle phone

### The Solution

MykoDesk provides AI that answers phones, texts, emails, and web chats 24/7 for $79-249/month. It books appointments, answers common questions, takes messages, and escalates to humans when needed. Business owners get a dashboard to monitor everything.

### Why Now

- AI CS market: $9.5B (2025), growing 20%/year to $41.2B by 2033
- AI voice quality has reached human-like levels (Retell.ai, ElevenLabs)
- LLM costs have dropped to $0.0005-0.001 per conversation (GPT-4o Mini, Claude Haiku)
- 89% of small businesses already use some form of AI
- Conversational AI is replacing IVR phone trees - 70%+ of businesses adopting by 2026

### Why MykoDesk Wins

| Advantage | vs. Zendesk/Freshdesk | vs. Ruby/Smith.ai | vs. Tidio/Intercom |
|-----------|----------------------|-------------------|-------------------|
| Price | 50-80% cheaper | 30-60% cheaper | Comparable but includes phone/SMS |
| Channels | All-in-one | Phone only | Chat/email only |
| Setup | Same-day | Days | Hours |
| AI-first | Yes | Human-first | AI add-on |
| Local sales | In-person demos | Online only | Online only |
| Target | Small local biz | All sizes | E-commerce focus |

### Founder

- John, solo developer in Grand Prairie, Texas (DFW metroplex)
- Building with Claude Code as primary development tool
- Two test businesses: mother's pet grooming (paper-based) and best friend's HVAC (uses Jobber, based in NJ)

### Market

- Grand Prairie sits in DFW metroplex (8M people, 150,000+ small businesses)
- Texas has no state income tax
- Texas is a one-party consent state for call recording
- DFW has massive home services market (HVAC is year-round due to heat)
- 9,096 HVAC businesses in Texas alone ($11.1B market)
- ~38% of DFW population is Hispanic - bilingual (English/Spanish) support is a differentiator

---

## 2. Customer Service Fundamentals

This section exists so any AI agent working on MykoDesk understands CS from the ground up. Every design decision flows from these principles.

### Core Principles of Great Customer Service

1. **Speed** - 78% of customers buy from the first responder. Response time is the single most impactful metric.
2. **Empathy** - Customers want to feel heard, not just processed. The AI must acknowledge emotions before solving problems.
3. **First Contact Resolution (FCR)** - Resolve the issue the first time. Industry benchmark: 70-71% average, 80%+ is world-class. Target: 75-80%.
4. **Consistency** - Same quality whether it's 2pm Tuesday or 3am Saturday.
5. **Transparency** - Never mislead about what the AI can/can't do. Always offer a path to a human.

### Response Time Standards (What MykoDesk Must Hit)

| Channel | Target | Industry Average | Impact |
|---------|--------|-----------------|--------|
| Phone | Answer within 20 seconds | 46 seconds | 26% hang up after 2-4 min |
| Web Chat | First response under 30 seconds | 48 seconds | Every 1 min delay = 10% fewer conversions |
| SMS/Text | Reply within 2 minutes | 2-4 hours | Treated as high-priority by customers |
| Email | Reply within 1 hour | 12 hours 10 min | 89% expect response within 1 hour |

### Customer Satisfaction Metrics

MykoDesk tracks three metrics per business:

**CSAT (Customer Satisfaction Score)**
- Measured after each interaction: "How satisfied were you? 1-5 stars"
- Target: 75-85%
- Used for: Immediate interaction quality

**NPS (Net Promoter Score)**
- Measured quarterly: "How likely to recommend? 0-10"
- Target: 20-50 (good), 50+ (excellent)
- Used for: Long-term loyalty tracking

**CES (Customer Effort Score)**
- Measured after support interactions: "How easy was it to get help? 1-5"
- Target: 4.0+
- Used for: Identifying friction in processes

### The Customer Journey (Small Service Business)

```
Discovery          First Contact       Booking           Service          Follow-up         Repeat
  |                    |                  |                 |                 |                |
Google/Referral -> Phone/Text/Chat -> Schedule appt -> Get service -> Reminder/Review -> Rebook
  |                    |                  |                 |                 |                |
  AI role:         AI answers,        AI books or      AI sends         AI sends          AI sends
  None             qualifies,         captures info    reminders        follow-up,        rebooking
                   provides info      for callback                      requests review   reminder
```

### Communication Preferences by Generation

| Generation | Preferred Channel | AI Comfort | Approach |
|-----------|------------------|------------|----------|
| Boomers (1946-64) | Phone, email | Low (20%) | Phone support, clear language, human escalation easy |
| Gen X (1965-80) | Email, phone | Low-moderate (30-40%) | Email with phone backup, straightforward |
| Millennials (1981-96) | Text, chat, email | Moderate-high (60%+) | Multi-channel, personalized |
| Gen Z (1997-2012) | Mobile/chat, text | High (70%+) | Mobile-first, chat/text, AI-powered |

**Implication**: MykoDesk must support all channels. Boomers won't text. Gen Z won't call. You need both.

### Emotional Intelligence Framework

The AI must handle different emotional states:

**Angry/Frustrated Customers:**
- Let them express frustration without interrupting
- Acknowledge: "I can see why that would be frustrating"
- Apologize specifically: "I'm sorry the appointment was missed"
- Offer solution immediately
- If anger escalates: warm transfer to human with full context

**Confused/Uncertain Customers:**
- Use simple language, no jargon
- Ask clarifying questions one at a time
- Provide step-by-step guidance
- Follow up with written confirmation (text/email)

**Impatient/In-a-Hurry Customers:**
- Be efficient - get to the point
- Offer fast options (express booking, callback)
- Don't make them repeat themselves
- Provide status updates on timing

### Complaint Handling: The HEARD Framework

Every complaint the AI encounters follows this pattern:

1. **H - Hear**: Listen fully. Don't interrupt or jump to solutions.
2. **E - Empathize**: "I understand why that's frustrating" (not generic "I understand")
3. **A - Apologize**: Sincere, specific. "I'm sorry the technician was late."
4. **R - Resolve**: Fix it or provide clear next steps with timeline.
5. **D - Diagnose**: Log the issue for the business owner to prevent recurrence.

**The Service Recovery Paradox**: Customers who experience a problem that gets resolved excellently become MORE loyal than customers who never had a problem. This is why complaint handling matters.

### Warm Transfer Protocol

When the AI escalates to a human, it must:

1. Tell the customer: "I'm connecting you with [name/role] who can help with this. One moment."
2. Pass to the human: Full conversation transcript, customer name, issue summary, what's been tried, customer's emotional state.
3. The human picks up WITH context. Customer never repeats themselves.
4. 73% of customers cite "repeating information" as a major frustration. This must never happen.

---

## 3. Target Market & Industry Profiles

### Tier 1: Pet Grooming (Test Business - John's Mother)

**How Grooming Businesses Operate:**
- Appointment-based, walk-ins discouraged (cause schedule chaos)
- Each appointment: 45 min to 4+ hours depending on dog size/breed/coat
- Groomers can't answer phones while grooming (hands full, dog safety)
- Busiest: Saturdays, lunch hour (12-2pm), after work (5-7pm)
- Seasonal peaks: Christmas/New Year's, Valentine's, summer vacation
- Popular groomers are booked 8-12 weeks out
- Regular clients rebook every 4-8 weeks

**Current Situation (Paper-Based):**
- All booking by hand/paper
- Phone is primary contact method
- Regulars and walk-ins
- No digital record of customers, appointments, or pet info
- Missed calls during grooming = lost business

**What Customers Ask (Every Common Question):**

| Category | Example Questions |
|----------|-----------------|
| Pricing | "How much for a [breed]?" "What's included in basic grooming?" |
| Availability | "When can I book?" "Do you have Saturday openings?" |
| Breed-specific | "Do you groom [breed]?" "How long does a Goldendoodle take?" |
| Drop-off/Pickup | "When should I drop off?" "How long will it take?" |
| Services | "What services do you offer?" "Do you do nail trimming only?" |
| Special needs | "My dog has anxiety" "My dog has skin allergies" |
| Vaccinations | "Do I need vaccine records?" (Yes, always: rabies, distemper, Bordetella) |
| Cancellation | "I need to cancel" "What's the cancellation policy?" |
| Recurring | "Can I book recurring appointments?" "How often should I groom?" |

**Booking Information Required:**
- Dog name, breed/mix, size/weight, age
- Coat type and condition (matted? when last groomed?)
- Services requested (bath only, full groom, specific cut style)
- Special needs (medical, behavioral, allergies, medications)
- Vaccination status (must be current)
- Owner name, phone, email
- Preferred date/time
- First-time flag (needs longer slot + assessment)

**Appointment Duration by Size:**

| Dog Size | Duration | Examples |
|----------|----------|---------|
| Small (0-20 lbs) | 45 min - 1.5 hrs | Chihuahua, Yorkie, Maltese |
| Medium (20-50 lbs) | 1.5 - 2.5 hrs | Cocker Spaniel, Beagle |
| Large (50-75 lbs) | 2 - 3 hrs | Golden Retriever, Labrador |
| Giant (75+ lbs) | 3 - 5 hrs | Great Pyrenees, Saint Bernard |
| Matted (any size) | +1-2 hours extra | Any breed with neglected coat |

**Pricing Structure (Typical):**

| Dog Size | Bath Only | Full Groom |
|----------|-----------|-----------|
| Small (0-20 lbs) | $30-50 | $40-90 |
| Medium (20-50 lbs) | $40-70 | $60-130 |
| Large (50-75 lbs) | $50-90 | $75-150 |
| Giant (75+ lbs) | $70-120 | $100-180+ |

**Pain Points AI Solves:**
- No-shows (5-15% rate): AI sends reminders, reducing no-shows 34-60%
- Phone interruptions during grooming: AI answers 24/7
- Scheduling chaos: AI handles booking with availability checking
- No record keeping: AI logs everything digitally
- Customer retention: Pre-booking next appointment, follow-up messages

**Customer Lifetime Value:**
- Loyal customer visiting every 6 weeks for 10 years = 80+ appointments
- At $65 average = $5,200+ per customer
- Pre-booking next appointment increases retention 30-40%

**Grooming Software Landscape (What Exists):**
- Gingr: $99-399/mo (overkill for grooming-only)
- Pawfinity: $59-199/mo (good but doesn't include AI CS)
- MoeGo: Tiered pricing (modern, popular)
- DaySmart Pet: $39-99/mo (affordable, dated UI)

**Paper-to-Digital Transition Best Practices:**
- Don't flip overnight. Run hybrid (paper + digital) for 2 weeks.
- Start with scheduling only, then add features incrementally.
- Expected ROI: 3-8x return in first year, 10-15 hours/week saved on admin.
- Timeline: 30-60 days to full transition.

### Tier 1: HVAC (Test Business - Best Friend, NJ, Uses Jobber)

**How HVAC Businesses Operate:**
- Mix of emergency and scheduled work
- 20% of daily capacity reserved for emergency calls
- Technicians dispatched by proximity, expertise, availability
- Each service call: 30 min (diagnostic) to 8 hrs (installation)
- Scheduling windows: morning (8am-12pm) or afternoon (12pm-5pm)
- 3-6 calls per technician per day

**Seasonal Patterns (Texas):**
- Peak: June-October (cooling demand)
- Absolute peak month: October (maintenance before winter)
- Slowest: September (between summer and fall)
- Call volume 20-40% higher in summer than winter
- Emergency premium: 25-50% above standard rates for same-day

**Emergency Triage (How AI Must Classify Calls):**

| Level | Examples | Response |
|-------|---------|----------|
| Emergency | No heat in freezing temps, gas smell, sparks/burning, complete system failure with vulnerable occupants | Immediate dispatch or escalation to on-call tech |
| Urgent | System not working but no safety issue, partial cooling/heating loss | Same-day callback, within business hours |
| Routine | Maintenance request, filter question, efficiency concern | Schedule next available slot |

**What Customers Ask:**

| Category | Example Questions |
|----------|-----------------|
| System failure | "My AC stopped working" "No heat" "System making loud noise" |
| Maintenance | "Need a tune-up" "When should I schedule maintenance?" |
| Pricing | "How much for a service call?" "Can you give me a quote?" |
| Warranty | "What's covered?" "Is refrigerant included?" |
| Financing | "Do you offer payment plans?" |
| Thermostat | "How do I program it?" "Should I upgrade?" |
| New system | "How much for a new AC?" "Heat pump vs furnace?" |
| Maintenance plans | "What's included?" "How much per year?" |

**Booking Information Required:**
- Customer name, phone, email
- Service address
- System type (AC, furnace, heat pump)
- System age (if known)
- Problem description with symptoms
- Urgency level
- Thermostat type
- Current maintenance agreement status
- Access notes (locked gate, dogs, occupant availability)

**Pricing Model:**
- Service call/diagnostic fee: $75-150 (often waived if repair proceeds)
- Emergency/after-hours: $150-250+
- Flat rate for common services (maintenance, diagnostics)
- Time & materials for complex/unpredictable repairs
- Technician labor: $65-150+/hour
- Cannot quote most repairs without on-site diagnosis

**What CAN Be Quoted Over Phone:**
- Diagnostic fee (standard)
- Maintenance plan pricing
- Filter replacement (if customer knows type)
- General pricing ranges for common repairs

**What CANNOT Be Quoted Over Phone:**
- Actual repair costs (diagnosis needed)
- Parts required for unknown issues
- System replacement (ductwork evaluation needed)

**Customer Lifetime Value:**
- Average HVAC customer: $47,200 over lifetime
- Maintenance plans: $180-550/year, capture 39-55% of total revenue
- Customers on plans are 70-80% more likely to choose same company for replacement
- Increasing retention 5% = 25-95% profit increase

**Jobber Integration (What It Already Does):**
- Work request to job conversion
- Drag-and-drop scheduling (5 calendar views)
- GPS dispatching and route optimization
- Auto-notification of schedule changes
- Customer communication (estimates, reminders, status)
- Invoicing + QuickBooks sync
- 2000+ tool integrations

**What Jobber Does NOT Do (Where MykoDesk Adds Value):**
- Natural language phone intake and triage
- AI-powered diagnostic suggestions from customer description
- 24/7 phone/text/chat answering
- Intelligent priority routing beyond nearest tech
- Maintenance agreement upselling during interactions
- Customer sentiment analysis

**Texas-Specific HVAC Data:**
- Full system replacement: $8,000-16,000 in DFW
- Heat pumps increasingly popular (mild winters)
- Long cooling season: May-October (6 months)
- DFW pricing 5-10% higher than state average

### Other Tier 1 Industries (Expand To After Launch)

**Dental/Medical:**
- Appointment-heavy, insurance questions constant
- Need: booking, reminders, intake, insurance FAQ
- Special: HIPAA compliance required for medical data

**Cleaning/Landscaping:**
- Repeat scheduling, pricing questions
- Need: booking, quotes, service confirmation
- Simpler than HVAC/grooming (fewer variables)

---

## 4. Product Definition

### Feature Set (Complete)

#### 4.1 AI Agent (The Core Product)

The AI agent is the brain of MykoDesk. For each business, it:
- Learns the business's information, services, pricing, hours, and personality
- Handles customer interactions across all channels (phone, SMS, email, chat)
- Books appointments, answers questions, takes messages
- Escalates to humans when needed with full context
- Operates on a progressive capability tier system

#### 4.2 Progressive Capability Tiers

The AI starts conservative and earns trust. Business owners unlock capabilities as they're comfortable.

**Tier 1 - Answering (Enabled by default, day 1):**
- Answer calls/texts/chats/emails
- Provide business info (hours, location, services, pricing)
- Take messages and notify owner
- "Let me have someone get back to you"
- Capture lead info (name, phone, email, what they need)

**Tier 2 - Booking (Owner enables when ready):**
- Book appointments (with calendar integration)
- Answer detailed service questions from knowledge base
- Send appointment confirmations
- Send appointment reminders (SMS + email)

**Tier 3 - Active Management (Owner enables later):**
- Handle rescheduling and cancellations
- Follow up with leads
- Request reviews after service
- Handle basic complaints (HEARD framework, then notify owner)
- Proactive maintenance reminders
- Pre-book next appointments

Each tier has a toggle in the dashboard. The AI never exceeds its authorized tier.

#### 4.3 Dashboard (Business Owner View)

**Home Screen:**
- Today's summary: conversations handled, messages needing attention, upcoming appointments
- AI confidence indicator: "AI handled 45 of 52 conversations successfully today"
- 3-5 key metrics (response time, resolution rate, satisfaction, volume)

**Unified Inbox:**
- All channels (phone transcripts, SMS threads, emails, chats) in one view
- Conversation threaded per customer, not per channel
- Channel type shown via icons (phone, SMS, email, chat)
- Status: "AI handled" (green), "Needs attention" (yellow), "Escalated" (red)
- Owner can jump into any conversation and respond directly

**Customers:**
- Contact list with full history across all channels
- Pet/property/account details
- Notes, tags, preferences
- Last interaction date

**Knowledge Base:**
- Business info editor (hours, location, services, pricing)
- FAQ builder (guided: "What are the top 5 questions customers ask?")
- Service catalog with pricing
- Custom AI instructions per topic

**Analytics:**
- Daily/weekly digest (not real-time dashboard - owners check on mobile)
- Key metrics: response time, AI resolution rate, satisfaction, volume trends
- Color-coded: green (good), yellow (fair), red (needs attention)
- Comparison to previous period

**Settings:**
- Business hours and timezone
- AI capability tier toggles
- Escalation rules (who gets notified, how, when)
- Notification preferences (3 modes: Calm, Regular, All)
- Channel configuration (enable/disable channels)
- Widget customization (colors, logo, greeting)

#### 4.4 Chat Widget (Embeddable)

- Single script tag, embeds on any website
- Customizable: colors, logo, greeting message, position
- Real-time AI responses
- Collects name/email before conversation (optional)
- Mobile-responsive
- Shows when human is available vs AI-only

#### 4.5 Appointment Reminders

Based on research, optimal reminder schedule:

**For appointments weeks+ away:**
- 1 week before: SMS + email
- 24 hours before: SMS
- Optional: 3 hours before on day-of (SMS)

**Timing:**
- Send between 10am-3pm (highest open rates)
- Avoid 6:30-8:30am (commute) and 4-7pm (dinner)
- Max 2-3 reminders per appointment (more = annoying)

**Content:**
- Short, essential info: date, time, location, service type
- Clear call-to-action: "Reply C to confirm, R to reschedule"
- Include business name in every message

#### 4.6 Review Requests

- Sent 24-48 hours after service completion
- Direct link to Google review (one tap)
- Simple ask: "How was your experience? Leave us a review!"
- Only sent for interactions where AI confidence was high or owner confirms quality

---

## 5. AI Agent Behavior Specification

This section defines exactly how the AI behaves. Any AI agent building or maintaining MykoDesk must implement these behaviors precisely.

### 5.1 Greeting (Phone)

**Texas law (SB 140) requires AI disclosure within 30 seconds.** The greeting must:

1. Identify the business: "Hi, thanks for calling [Business Name]."
2. Disclose AI: "I'm [Name], [Business Name]'s AI assistant."
3. Offer help: "I can help with scheduling, pricing, or answer questions about our services."
4. Offer human: "Or I can connect you with [Owner/Team] if you'd prefer."
5. If recording: "This call may be recorded for quality purposes."

**Example (Grooming):**
"Hi, thanks for calling [Grooming Business]. I'm Mia, your AI assistant. I can help you book a grooming appointment, check pricing, or answer questions. I can also connect you with [Owner] if you'd prefer. How can I help you today?"

**Example (HVAC):**
"Thanks for calling [HVAC Business]. I'm your AI assistant. If this is an emergency - like no heat, a gas smell, or electrical sparks - say 'emergency' and I'll get someone on the line right away. Otherwise, I can help with scheduling, pricing, or questions about your system. What can I help with?"

### 5.2 Greeting (SMS/Chat)

Shorter, no recording disclosure needed:
"Hi! I'm [Business Name]'s AI assistant. I can help with appointments, pricing, or questions. What do you need?"

### 5.3 Greeting (Email)

Auto-reply to inbound emails:
"Thanks for reaching out to [Business Name]. I'm reviewing your message and will get back to you within [timeframe]. If this is urgent, you can call us at [phone] or text [number]."

Then AI processes the email and sends a substantive response.

### 5.4 Conversation Flow Rules

1. **One question at a time.** Never ask multiple questions in one message.
2. **Confirm understanding.** Before taking action: "Just to make sure I have this right - you'd like to book a grooming appointment for your medium Goldendoodle on Saturday morning?"
3. **Use the customer's name** after they provide it.
4. **Keep responses concise.** Phone: 2-3 sentences max. Chat/SMS: 1-2 sentences. Email: as needed.
5. **Never say "I don't know."** Instead: "Let me check on that for you" or "I'll have [Owner] get back to you with that information."
6. **Never make up information.** If the AI doesn't have pricing, hours, or service details in its knowledge base, it says: "I want to make sure I give you the right information. Let me have [Owner] confirm that for you."
7. **Always offer next steps.** Every response ends with either an action or a question. Never leave the customer hanging.

### 5.5 Phone-Specific Rules

- **Silence handling**: If 3 seconds of silence, say "Are you still there?" or "Take your time."
- **Interruption handling**: Allow natural interruptions. Don't talk over the customer.
- **Processing time**: Never more than 2 seconds of dead air. Use fillers like "Let me check that for you" during lookups.
- **Background noise**: Modern voice AI handles up to 90dB ambient noise with 95%+ accuracy across accents.
- **Accents**: Trained on 100+ languages and regional variations. Adaptive acoustic models adjust in real-time.

### 5.6 Escalation Rules

**Escalate immediately (Urgent) - Text + call to owner:**
- Customer says "emergency" or describes safety issue
- Customer is angry and AI can't de-escalate after 2 attempts
- Customer explicitly asks for a human (always honor this)
- Complaint about a previous service
- Legal threat or liability concern
- AI confidence is below threshold

**Escalate normally - Text to owner:**
- Question outside AI's knowledge base
- Booking request AI isn't authorized to handle (Tier 1 business)
- Custom quote request that needs human judgment
- Customer asks about something not in the system

**Log for dashboard (Low priority):**
- Customer asked about a service the business doesn't offer (market intelligence)
- Feedback or suggestion
- General inquiry that was fully resolved

**Escalation notification pattern:**
Push notification -> SMS -> Email (if no response to push within 5 minutes)

### 5.7 AI Confidence Scoring

Every AI response gets a confidence score:

- **High (80-100%)**: AI has the answer in knowledge base, question is routine
- **Medium (50-79%)**: AI is inferring from partial information, somewhat confident
- **Low (0-49%)**: AI is unsure, should escalate or caveat

Display in dashboard:
- High confidence: Green badge, "AI handled successfully"
- Medium confidence: Yellow badge, "AI handled - review suggested"
- Low confidence: Red badge, "Needs your attention"

### 5.8 Multi-Language Support

- Primary: English
- Secondary: Spanish (critical for DFW - ~38% Hispanic population)
- AI detects language from first customer message and responds in kind
- If unsure, default to English and ask: "Would you prefer English or Spanish?"

---

## 6. Channel Architecture

### 6.1 Phone (Voice AI)

**Technology: Retell.ai**
- Cost: $0.07/min (best price-to-quality ratio)
- Latency: ~600-700ms (good - avoids awkward pauses)
- Supports appointment booking, natural conversation, interruption handling
- SIP trunking support for connecting existing phone systems

**Phone Number Handling (Based on Industry Research):**

The industry standard for small businesses is **call forwarding** (used by ~70% of small businesses, per Ruby/Smith.ai/Dialzara documentation). This is what MykoDesk implements:

**Default: Call Forwarding**
- Business keeps their existing phone number
- Business forwards calls to a MykoDesk number (one setting change on their phone)
- Customers call the same number they always have
- Setup: minutes, not days
- Easy to test: forward after-hours first, then expand
- Easy to revert: just stop forwarding
- No carrier coordination, no downtime risk

**Optional: Number Porting**
- For businesses wanting full consolidation
- Number transfers to our system (Twilio/Retell)
- Timeline: 3-5 business days
- Requires Letter of Authorization from business
- Full SMS capability on ported numbers

**Optional: New Number**
- For new businesses or those wanting a separate line
- MykoDesk provisions a local number (matching area code)
- Business uses it as their customer service line

**Routing Modes:**
- **All calls**: Every call goes to AI (AI handles first, escalates as needed)
- **After-hours only**: AI answers outside business hours, calls go to business during hours
- **Overflow**: AI catches calls the business doesn't answer after X rings
- **Conditional**: Based on time of day, day of week, caller ID

### 6.2 SMS/Text

**Technology: Twilio**
- Cost: $0.0083/message + $1/month per number
- 10DLC registration required (mandatory since Feb 2025)

**Capabilities:**
- Two-way conversational texting
- Appointment confirmations and reminders
- Lead follow-up
- Review requests
- Quick replies (confirm, reschedule, cancel)

**Compliance (Non-negotiable):**
- 10DLC registration with The Campaign Registry (TCR) before first message
- Prior express written consent required before sending
- Every message includes opt-out: "Reply STOP to unsubscribe"
- Opt-outs honored immediately across ALL future messages (FCC rule, April 2026)
- First message to new contact MUST include: business name, expected frequency, carrier fee notice
- Consent records stored and auditable

### 6.3 Email

**Technology: Amazon SES (primary) or Resend (already integrated)**
- SES cost: $0.10/1,000 emails (cheapest at scale)
- Resend: already in codebase, works for early stage

**Capabilities:**
- Inbound email parsing (extract sender, subject, body, thread ID)
- AI reads and responds to customer emails
- Threading (In-Reply-To / Message-ID headers maintain conversation)
- Attachments handling (store, reference in conversation)
- Auto-replies for acknowledgment

**Email Flow:**
1. Customer emails business
2. Email forwarded to MykoDesk inbound address (or parsed via webhook)
3. AI processes content, checks knowledge base
4. AI drafts response
5. If confidence high: sends automatically
6. If confidence low: queues for owner review in dashboard

### 6.4 Web Chat Widget

**Technology: Custom (already partially built)**
- Single `<script>` tag for embedding
- WebSocket for real-time messaging (Socket.IO already in codebase)
- No npm/build step required for the business

**Features:**
- Customizable colors, logo, greeting, position (bottom-right default)
- Optional pre-chat form (name, email)
- AI responds in real-time
- Shows typing indicator
- Mobile-responsive
- Offline mode: "We're not available right now. Leave a message and we'll get back to you."
- Business hours awareness

### 6.5 Channel Router (Unified Processing)

All inbound messages, regardless of channel, get normalized into a unified format:

```
InboundMessage {
  id: UUID
  tenant_id: UUID
  customer_id: UUID
  channel: "phone" | "sms" | "email" | "chat"
  content: string (transcript for phone, message text for others)
  attachments: []
  metadata: {
    phone_number: string (if phone/sms)
    email_address: string (if email)
    session_id: string (if chat)
    call_duration: int (if phone)
    recording_url: string (if phone)
  }
  created_at: timestamp
}
```

The AI engine processes this unified format identically regardless of source channel. Responses are formatted appropriately for the outbound channel.

---

## 7. Dashboard & UX Design

### Design Principles (Non-Technical Users)

The users are groomers, plumbers, HVAC techs. Not software engineers. Every design decision follows these rules:

1. **Mobile-first**: 60%+ of SaaS users access dashboards on mobile. Design for phone first.
2. **3-5 metrics max**: Small business owners don't want 50 charts.
3. **Daily digest over real-time dashboard**: A morning summary email is more useful than a live dashboard they'll never watch.
4. **Progressive disclosure**: Show simple settings by default. "Advanced" button for power users.
5. **Smart defaults**: The app should work correctly even if the owner touches zero settings.
6. **Empty states guide action**: Don't show a blank page. Show what it will look like and guide them to fill it.
7. **No jargon**: "Response time" not "MTTR". "Customer satisfaction" not "CSAT".
8. **Touch targets**: Minimum 48x48dp on mobile. Buttons must be finger-friendly.
9. **Color contrast**: 4.5:1 ratio minimum. Accessible to colorblind users.

### Navigation Structure

```
Home (Summary)
Inbox (All conversations)
  - Filter by: channel, status, date
  - Sort by: newest, needs attention
Customers
  - Customer list
  - Customer detail (history, notes, pets/properties)
Knowledge Base
  - Business info
  - FAQs
  - Services & pricing
Analytics
  - Key metrics
  - Trends
Settings
  - Business info
  - AI capabilities (tier toggles)
  - Channels
  - Notifications
  - Team (users)
  - Billing
  - Widget
```

### Unified Inbox Design

- Conversations listed left (or stacked on mobile)
- Selected conversation detail right (or full screen on mobile)
- Each conversation shows: customer name, last message preview, channel icon, timestamp, status badge
- Channel icon: phone handset, SMS bubble, email envelope, chat bubble
- Status: green check (resolved), yellow clock (waiting), red dot (needs attention)
- AI vs human messages clearly distinguished (AI has a subtle indicator)
- System messages (escalation, assignment) centered and grayed out
- Call transcripts shown as timestamped text, not bubbles
- Owner can reply directly from inbox in any channel

### Notification Modes

Three predefined modes instead of 50 individual toggles:

| Mode | What You Get | Best For |
|------|-------------|----------|
| **Calm** | Only urgent escalations, complaints, emergencies | Owner who trusts the AI |
| **Regular** | New conversations, escalations, daily summary | Most owners |
| **All** | Everything including resolved conversations, analytics | New users learning the system |

Each mode configurable by channel (push, SMS, email) and time window (business hours vs always).

### Widget Customization UI

- Color picker with presets + custom hex
- Logo upload (PNG/JPEG, max 2MB)
- Greeting message text editor
- Position selector (bottom-right, bottom-left)
- Live preview on right side of screen
- Mobile and desktop preview toggle

---

## 8. Technical Architecture

### Current Stack (What Exists)

| Layer | Technology | Status |
|-------|-----------|--------|
| Backend | FastAPI + Python 3.13 | Working scaffold |
| Database | PostgreSQL (via Docker) | Schema exists, multi-tenant |
| Cache | Redis (via Docker) | Configured, not heavily used |
| WebSocket | Socket.IO (python-socketio) | Working for chat |
| Auth | JWT (python-jose + passlib) | Working |
| LLM | OpenAI + DeepSeek abstraction | Working with tool calling |
| Email | Resend | Basic integration |
| Scheduling | Jobber API | OAuth + basic operations |
| Frontend | Next.js 15 | Dashboard + widget + auth pages |
| ORM | SQLAlchemy 2.0 (async) | Models exist |

### Target Stack (What We're Building)

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | FastAPI + Python | Keep - solid foundation |
| Database | PostgreSQL + pgvector | Add pgvector for RAG - free, already have Postgres |
| Cache | Redis | Keep - need for session state, job queues |
| Background Jobs | Celery + Redis | Add - need async task processing (reminders, email) |
| Voice AI | Retell.ai | Add - best price/quality for phone ($0.07/min) |
| SMS | Twilio | Add - industry standard ($0.0083/msg) |
| Email | Amazon SES (or keep Resend for now) | SES for scale, Resend for early stage |
| LLM Primary | GPT-4o Mini or Claude Haiku | Switch - $0.0005-0.001/conversation (cheapest quality option) |
| LLM Complex | GPT-4o or Claude Sonnet | Add - for escalation analysis, complex queries |
| Vector DB | pgvector (PostgreSQL extension) | Add - free, no new infrastructure |
| Billing | Stripe | Add - subscriptions, invoicing, dunning |
| Monitoring | Sentry (free tier) | Add - error tracking |
| Frontend | Next.js | Keep - good foundation |
| Deployment | DigitalOcean or Hetzner VPS | Add - 4GB RAM minimum |

### Architecture Diagram

```
                    Customer Touchpoints
          ┌──────────┬──────────┬──────────┬──────────┐
          │  Phone   │   SMS    │  Email   │ Web Chat │
          │(Retell)  │(Twilio)  │(SES)     │(Widget)  │
          └────┬─────┴────┬─────┴────┬─────┴────┬─────┘
               │          │          │          │
          ┌────▼──────────▼──────────▼──────────▼────┐
          │           Channel Router                  │
          │    Normalizes all inbound to unified      │
          │    InboundMessage format                  │
          └─────────────────┬────────────────────────┘
                            │
          ┌─────────────────▼────────────────────────┐
          │              AI Engine                    │
          │  ┌────────────────────────────────────┐  │
          │  │ 1. Load tenant config + tier level │  │
          │  │ 2. Retrieve conversation history   │  │
          │  │ 3. RAG: query pgvector KB          │  │
          │  │ 4. Build context + system prompt   │  │
          │  │ 5. Call LLM with tools             │  │
          │  │ 6. Execute tool calls if needed    │  │
          │  │ 7. Score confidence                │  │
          │  │ 8. Route: respond / escalate / log │  │
          │  └────────────────────────────────────┘  │
          └─────────────────┬────────────────────────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
          ┌────▼────┐  ┌───▼────┐  ┌───▼─────┐
          │  Tools  │  │Escalate│  │ Respond  │
          │ (Book,  │  │(Notify │  │(Send via │
          │  Search,│  │ owner) │  │ original │
          │  Quote) │  │        │  │ channel) │
          └────┬────┘  └────────┘  └─────────┘
               │
          ┌────▼─────────────────────────────────────┐
          │           Integrations Layer              │
          │  Jobber │ Google Cal │ Calendly │ Stripe  │
          └──────────────────────┬────────────────────┘
                                 │
          ┌──────────────────────▼────────────────────┐
          │           PostgreSQL Database              │
          │    Multi-tenant │ pgvector │ Audit log     │
          └───────────────────────────────────────────┘
```

### Database Schema Updates Needed

The existing schema is solid. Additions needed:

```sql
-- Voice call records
CREATE TABLE call_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    direction VARCHAR(10) NOT NULL, -- 'inbound' or 'outbound'
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    duration_seconds INTEGER,
    recording_url TEXT,
    transcript TEXT,
    retell_call_id VARCHAR(255),
    cost DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS records
CREATE TABLE sms_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    direction VARCHAR(10) NOT NULL,
    from_number VARCHAR(20),
    to_number VARCHAR(20),
    body TEXT NOT NULL,
    twilio_sid VARCHAR(255),
    status VARCHAR(20), -- sent, delivered, failed
    cost DECIMAL(10,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phone numbers provisioned per tenant
CREATE TABLE phone_numbers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    number VARCHAR(20) NOT NULL,
    provider VARCHAR(20) NOT NULL, -- 'twilio', 'retell'
    type VARCHAR(20) NOT NULL, -- 'voice', 'sms', 'both'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KB article embeddings for RAG
CREATE TABLE kb_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    chunk_text TEXT NOT NULL,
    embedding vector(1536), -- pgvector, OpenAI embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI capability tiers per tenant
CREATE TABLE ai_capabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    tier INTEGER DEFAULT 1, -- 1, 2, or 3
    can_book_appointments BOOLEAN DEFAULT FALSE,
    can_send_reminders BOOLEAN DEFAULT FALSE,
    can_handle_cancellations BOOLEAN DEFAULT FALSE,
    can_follow_up_leads BOOLEAN DEFAULT FALSE,
    can_request_reviews BOOLEAN DEFAULT FALSE,
    can_handle_complaints BOOLEAN DEFAULT FALSE,
    custom_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    mode VARCHAR(20) DEFAULT 'regular', -- 'calm', 'regular', 'all'
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscription/billing
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    plan VARCHAR(20) NOT NULL, -- 'starter', 'pro', 'business'
    billing_cycle VARCHAR(10) NOT NULL, -- 'monthly', 'annual'
    status VARCHAR(20) DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking (for overage billing)
CREATE TABLE usage_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    phone_minutes_used INTEGER DEFAULT 0,
    sms_count INTEGER DEFAULT 0,
    ai_conversations INTEGER DEFAULT 0,
    email_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled reminders
CREATE TABLE scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    type VARCHAR(20) NOT NULL, -- 'appointment', 'follow_up', 'review_request', 'rebooking'
    channel VARCHAR(10) NOT NULL, -- 'sms', 'email'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    content TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    related_conversation_id UUID REFERENCES conversations(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Consent tracking (SMS compliance)
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    customer_id UUID NOT NULL REFERENCES customers(id),
    channel VARCHAR(10) NOT NULL, -- 'sms', 'email', 'phone_recording'
    consent_type VARCHAR(20) NOT NULL, -- 'opt_in', 'opt_out'
    consent_text TEXT, -- what they agreed to
    source VARCHAR(50), -- 'web_form', 'sms_reply', 'phone_verbal'
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints (New/Updated)

```
# Voice
POST   /api/v1/voice/webhook          # Retell.ai webhook for call events
GET    /api/v1/voice/calls             # List call records
GET    /api/v1/voice/calls/:id         # Get call detail + transcript

# SMS
POST   /api/v1/sms/webhook            # Twilio webhook for inbound SMS
POST   /api/v1/sms/send               # Send outbound SMS
GET    /api/v1/sms/messages            # List SMS records

# Phone Numbers
GET    /api/v1/phone-numbers           # List tenant's numbers
POST   /api/v1/phone-numbers           # Provision new number
DELETE /api/v1/phone-numbers/:id       # Release number

# AI Capabilities
GET    /api/v1/ai-capabilities         # Get current tier + toggles
PUT    /api/v1/ai-capabilities         # Update tier/toggles

# Notifications
GET    /api/v1/notifications/preferences   # Get notification settings
PUT    /api/v1/notifications/preferences   # Update notification settings

# Billing
GET    /api/v1/billing/subscription    # Current plan
POST   /api/v1/billing/subscribe       # Create subscription
PUT    /api/v1/billing/change-plan     # Upgrade/downgrade
GET    /api/v1/billing/usage           # Current period usage
POST   /api/v1/billing/webhook         # Stripe webhook

# Onboarding
POST   /api/v1/onboarding/business-info    # Step 1: Basic info
POST   /api/v1/onboarding/services         # Step 2: Services
POST   /api/v1/onboarding/faq              # Step 3: FAQ builder
POST   /api/v1/onboarding/channels         # Step 4: Channel setup
POST   /api/v1/onboarding/test             # Step 5: Test conversation
POST   /api/v1/onboarding/complete         # Step 6: Go live

# Migration
POST   /api/v1/migration/upload        # Upload CSV/data file
POST   /api/v1/migration/map-fields    # Map source to MykoDesk fields
POST   /api/v1/migration/preview       # Preview import
POST   /api/v1/migration/execute       # Run import
GET    /api/v1/migration/status        # Import progress

# Reminders
GET    /api/v1/reminders               # List scheduled reminders
POST   /api/v1/reminders               # Create reminder
DELETE /api/v1/reminders/:id           # Cancel reminder

# Consent
GET    /api/v1/consent/:customer_id    # Get consent records
POST   /api/v1/consent                 # Record consent
```

---

## 9. Integrations

### 9.1 Scheduling Integrations

| Integration | API | Priority | Use Case |
|------------|-----|----------|----------|
| Jobber | GraphQL API | Phase 1 (already started) | HVAC, plumbing, home services |
| Google Calendar | REST API | Phase 2 | Universal - any business |
| Calendly | REST API (150+ integrations) | Phase 3 | Businesses already using it |
| Acuity Scheduling | REST API (Powerhouse plan) | Phase 3 | Salons, spas, consultants |

### 9.2 Business Tools

| Integration | Priority | Use Case |
|------------|----------|----------|
| QuickBooks Online | Phase 3 | Accounting sync |
| Stripe | Phase 1 | Our billing |
| Square | Phase 3 | POS for retail/salons |
| Zapier | Phase 3 | Connect anything else |

### 9.3 Grooming-Specific Software

| Integration | Priority | Notes |
|------------|----------|-------|
| MoeGo | Phase 3+ | Modern grooming platform, if demand exists |
| Gingr | Phase 3+ | Full-service pet facilities |

---

## 10. Migration System

### What Gets Imported

| Data Type | Source Formats | Priority |
|-----------|---------------|----------|
| Contacts/Customers | CSV, Google Sheets | Phase 1 |
| Knowledge base / FAQs | Text, CSV, copy-paste | Phase 1 |
| Conversation history | JSON, CSV | Phase 2 |
| Canned responses | CSV | Phase 2 |
| From Zendesk | API export | Phase 3 |
| From Freshdesk | API export | Phase 3 |
| From paper/notebook | Guided manual entry | Phase 1 (onboarding wizard) |

### Migration Flow

1. Business selects source: "Where is your data coming from?"
   - Options: CSV file, Google Sheets, Zendesk, Freshdesk, "I don't have digital records" (guided entry)
2. Upload or connect
3. MykoDesk auto-maps fields (with manual override)
4. Preview: "Here's what we'll import. Does this look right?"
5. Import runs in background
6. Verification report: "Imported 150 contacts, 45 FAQs. 3 records had issues (review)."

### Paper-to-Digital Migration (Critical for Target Market)

Many small businesses like John's mother's grooming shop have zero digital records. The onboarding wizard handles this:

1. "Tell me about your regular customers" -> guided entry
2. "What are your most common services and prices?" -> builds service catalog
3. "What questions do customers ask most?" -> builds knowledge base
4. "What does your typical week look like?" -> builds availability schedule

This is the same data the AI would get from a CSV import, just collected through conversation.

---

## 11. Onboarding System

### Design Principles (From Research)

- Get to first value in under 2 minutes
- Every extra form field = 7% lower conversion
- Pre-load demo data (don't show empty screens)
- Progress indicators with time estimates
- Celebrate milestones ("Your AI just handled its first message!")

### Onboarding Flow (6 Steps)

**Step 1: Business Basics** (60 seconds)
- Business name
- Industry (dropdown: Grooming, HVAC, Dental, Cleaning, Landscaping, Auto Repair, Salon, Restaurant, Other)
- Phone number
- Address
- Website (optional)
- Business hours (quick picker with common presets)

On industry selection, pre-fill common services, pricing ranges, and FAQ templates.

**Step 2: Services & Pricing** (2-3 minutes)
- Pre-populated list based on industry (e.g., grooming shows: Bath, Full Groom, Nail Trim, De-shed)
- Owner edits names, prices, descriptions
- Add/remove services
- "Don't worry, you can always change this later"

**Step 3: FAQ Builder** (2-3 minutes)
- "What are the top 5 questions customers ask you?"
- Text field for each, or guided prompts based on industry
- Pre-populated with industry-common questions (editable)
- This becomes the knowledge base the AI uses

**Step 4: Channel Setup** (1-2 minutes)
- Which channels do you want? (toggles: Phone, SMS, Chat, Email)
- For phone: "Forward your number to [MykoDesk number]. Here's how: [carrier-specific instructions]"
- For chat: "Copy this code to your website" (single script tag)
- For email: "Forward emails to [your-business]@mykodesk.com"
- Skip any channel, enable later

**Step 5: Test Conversation** (1-2 minutes)
- Owner talks to their own AI (via chat or phone)
- "Try asking it a question a customer would ask"
- AI responds using the info from steps 1-3
- Owner sees it working in real-time
- "Does this look right? Anything you'd change?"

**Step 6: Go Live** (30 seconds)
- Summary of what's set up
- "Your AI is ready. Here's what happens next:"
- Clear instructions for each enabled channel
- "You'll get a notification the first time your AI handles a real conversation"

Total onboarding time: 8-12 minutes.

---

## 12. Pricing & Billing

### Pricing Tiers

| | Starter | Pro | Business |
|---|---------|-----|----------|
| **Monthly** | $79/mo | $149/mo | $249/mo |
| **Annual** | $63/mo ($756/yr) | $119/mo ($1,428/yr) | $199/mo ($2,388/yr) |
| **Channels** | Chat + Email | + Phone + SMS | + Phone + SMS (more volume) |
| **Phone minutes** | - | 100 included | 500 included |
| **SMS messages** | - | 500 included | 2,000 included |
| **AI conversations** | 500/mo | Unlimited | Unlimited |
| **Users** | 1 | 3 | Unlimited |
| **Knowledge base** | Yes | Yes | Yes |
| **Analytics** | Basic | Full | Full + export |
| **Integrations** | Chat widget | + Jobber, Google Cal | + All integrations |
| **Support** | Email | Email + priority | Email + phone + migration help |

### Overage Pricing

| Item | Per-Unit Cost | Our Cost | Margin |
|------|-------------|----------|--------|
| Phone minute | $0.12 | ~$0.07 | 42% |
| SMS message | $0.02 | ~$0.01 | 50% |
| AI conversation | $0.05 | ~$0.001 | 98% |

### Why These Prices Are Fair

- Receptionist: $3,700-5,400/mo
- Ruby virtual receptionist: $250-1,700/mo (phone only)
- Smith.ai: $292-1,170/mo (phone only)
- MykoDesk Pro at $149/mo: phone + text + email + chat + AI
- One missed call can cost $500-10,000+ in lifetime customer value
- MykoDesk pays for itself if it catches one customer per month

### Our Unit Economics

| Cost Component | Per Customer/Month |
|---------------|-------------------|
| LLM (GPT-4o Mini) | $2-10 |
| Phone/Retell (100 min) | $7 |
| SMS/Twilio (500 texts) | $8 |
| Email/SES | $1-2 |
| Infrastructure share | $5-10 |
| **Total** | **$23-37** |
| **Revenue (Pro)** | **$149** |
| **Gross Margin** | **75-85%** |

### Billing Implementation (Stripe)

- Stripe handles: recurring billing, smart retries (8 attempts over 2 weeks), subscription management, tax calculation
- We build: dunning emails, usage tracking, overage calculation, plan change logic
- Dunning flow: Day 1 (payment failed), Day 7 (reminder), Day 14 (final notice + pause service)
- 14-day free trial, credit card required (40-60% trial-to-paid conversion for B2B vs 2-5% for freemium)
- Annual billing toggle on pricing page with specific savings shown ("Save $360/year" not "20% off")

---

## 13. Compliance & Legal

### Texas SB 140 (AI Disclosure)

- **Mandatory**: Disclose AI within first 30 seconds of any call
- **Cannot**: Use voice cloning
- **Penalty**: $1,000-$10,000 per violation (private right of action - customers can sue)
- **Implementation**: Built into every phone greeting template

### TCPA (Federal - Phone/SMS)

- AI-generated voices = "artificial/prerecorded voice" calls per FCC (Feb 2024 ruling)
- Prior express consent required for AI calls
- Prior express written consent required for marketing texts
- Automated opt-out mechanism required
- Do-not-call compliance for outbound

### 10DLC (SMS Registration)

- Register with The Campaign Registry (TCR) before sending any SMS
- Two-step: Brand registration + Campaign registration
- Timeline: 1-3 weeks for approval
- Reseller ID required when registering on behalf of client businesses
- Unregistered = carriers block ALL traffic (complete service failure)
- Prohibited industries: cannabis, firearms, payday loans, debt collection

### Call Recording

- Texas: One-party consent (we're fine)
- NJ (friend's business): One-party consent (we're fine)
- 13 two-party consent states: CA, CT, DE, FL, IL, MD, MA, MI, MT, NV, NH, PA, WA
- **Implementation**: AI greeting includes recording disclosure for ALL calls (safest approach)
- Store recordings encrypted, role-based access, defined retention period

### CAN-SPAM (Email)

- Include unsubscribe link in every commercial email
- Honor unsubscribes within 10 business days
- Include physical business address
- No deceptive subject lines

### Data Privacy

- Encrypt data at rest and in transit (SSL/TLS)
- Row-level security for tenant isolation
- Data Processing Agreement (DPA) template available for enterprise customers
- Data retention: configurable per tenant (30-90 day default for conversations)
- Breach notification: within 72 hours to affected parties
- No PII in AI training data
- No credit card data stored (PCI compliance via Stripe)

### Legal Setup (Texas LLC)

- Form LLC: $300 Texas filing fee
- Get EIN: Free from IRS
- Business bank account: Required for liability protection
- Terms of Service + Privacy Policy: Template from TermsFeed ($50-100)
- Tech E&O Insurance: ~$100-120/month, $1M coverage (recommended)
- S-Corp election: Consider at ~$80K+ annual profit (talk to CPA)
- Texas franchise tax: Not owed until $2.65M+ annual revenue
- Texas sales tax on SaaS: Generally not applicable for pure software licensing

---

## 14. Business Operations

### Metrics to Track

| Metric | Target | Why |
|--------|--------|-----|
| MRR | Growing 20%+ monthly | Survival metric |
| Monthly churn | Under 5% | Retention health |
| CAC | Under $500 | Growth efficiency |
| LTV:CAC ratio | 3:1 or better | Business viability |
| Activation rate | 60%+ of signups | Product-market fit |
| NPS | 20+ | Customer satisfaction |
| AI resolution rate | 75-80% | Product quality |

### Support Strategy (Solo Founder)

**Until $10K MRR:**
- Knowledge base from day 1 (reduces support load 40%)
- Email support only (24-hour response, aim for 4-8)
- Use MykoDesk's own AI for tier-1 support (eat your own dog food)
- Monthly 1-hour office hours (optional, builds relationships)

**At $20K MRR:**
- Hire part-time support (10 hrs/week, ~$500/mo)
- DFW has affordable part-time talent (students, etc.)

### Accounting

**Month 1-6**: Wave (free) or QuickBooks Self-Employed ($12/mo)
**Month 6-12**: Talk to CPA for first tax return ($1,500-2,000)
**At $100K+ revenue**: Part-time bookkeeper ($300-500/mo)

---

## 15. Sales Playbook

### Sales Model: Hybrid (Personal Onboarding -> Self-Service)

Start by personally onboarding every customer. This is how you:
1. Learn what businesses actually need
2. Build relationships that create referrals
3. Convert at 30-40% (vs 1-5% pure self-service)
4. Build the automated onboarding flow based on what you do manually

Every manual step gets automated in the platform simultaneously. As automation matures, shift to self-service with optional white-glove onboarding as upsell.

### Local Sales Process

**Phase 1: List Building**
- Google Maps: "[industry] in [city]" for target segments
- LinkedIn: "owner" + city + industry
- Local business directories

**Phase 2: Outreach (Multi-Channel)**
- Email: Value-first, not pitch. "Restaurants in Dallas lose X% of calls..."
- Phone: Follow up on non-responders
- In-person: Walk in with demo ready on phone

**Phase 3: Demo (10-15 minutes max)**
1. Show their website/Facebook (where customers find them)
2. Show AI handling their exact type of question
3. Show setup speed (5 minutes)
4. Show instant response time
5. Close: "Start free trial, I'll help set it up today"

**Objection Handling:**

| Objection | Response |
|-----------|----------|
| "I already have [Zendesk/Ruby]" | "They cost $X/mo for just [phone/chat]. This does everything for $149/mo." |
| "Is the AI good enough?" | "Ask me a question your customers would ask." (Prove it live) |
| "What if you go out of business?" | "Your data exports anytime. We're bootstrapped - no investor money to burn through." |
| "I don't trust AI with my customers" | "It starts with just taking messages. You control what it does. Try the 14-day trial." |

### Referral Pipeline

- Ask every customer for referrals at month 2
- Incentive: $50 account credit per signup
- Referred customers are 25% more profitable and 18% more loyal
- Target: 20%+ of new customers from referrals by month 6

### Conversion Funnel (Realistic)

1,000 outreach -> 150 responses (15%) -> 75 demos (50%) -> 45 trials (60%) -> 15 paid (33%)
= ~$2,200 MRR at $149/mo average

---

## 16. Implementation Phases

Each phase is a complete, testable unit. An AI agent can pick up any phase, read this doc, and know exactly what to build.

### Phase 1: Core Platform (Weeks 1-4)

**Goal**: Chat + email working perfectly with polished onboarding. Demo-ready.

**Deliverables:**
- [ ] Upgrade AI engine to GPT-4o Mini with pgvector RAG
- [ ] Implement progressive capability tiers (Tier 1/2/3 toggles)
- [ ] Build onboarding wizard (6 steps)
- [ ] Polish chat widget (customizable, embeddable, mobile-responsive)
- [ ] Polish unified inbox (all conversations in one view)
- [ ] Polish dashboard home (summary, metrics, AI confidence)
- [ ] Email channel (inbound parsing, AI response, threading)
- [ ] Knowledge base editor (guided FAQ builder, service catalog)
- [ ] Customer management (list, detail, history, notes)
- [ ] Notification system (3 modes, push + SMS + email)
- [ ] Deploy to VPS (accessible via web)
- [ ] AI confidence scoring on every response

**Test with**: Mother's grooming business (chat + email channel)

### Phase 2: Phone + SMS (Weeks 5-8)

**Goal**: Full omnichannel with voice AI and texting.

**Deliverables:**
- [ ] Retell.ai integration (inbound voice AI with greeting, tool calling)
- [ ] Twilio SMS integration (two-way texting, webhook)
- [ ] Phone number provisioning per tenant
- [ ] Call forwarding setup guide in onboarding
- [ ] Call transcripts in unified inbox
- [ ] SMS conversation threading in inbox
- [ ] Appointment reminders (SMS + email, configurable schedule)
- [ ] After-hours routing logic
- [ ] Emergency detection and escalation (HVAC: "gas smell", "no heat")
- [ ] 10DLC registration flow documentation
- [ ] Consent tracking system
- [ ] Recording disclosure in phone greetings

**Test with**: Both businesses (grooming + HVAC). Test phone + SMS end-to-end.

### Phase 3: Billing + Integrations (Weeks 9-11)

**Goal**: Paying customers can sign up and manage their own account.

**Deliverables:**
- [ ] Stripe integration (subscriptions, payment, webhooks)
- [ ] Pricing page (3 tiers, annual toggle, feature comparison)
- [ ] Plan management (upgrade, downgrade, cancel)
- [ ] Usage tracking (phone minutes, SMS, AI conversations)
- [ ] Overage billing
- [ ] Dunning flow (failed payment emails)
- [ ] Google Calendar integration
- [ ] CSV import (contacts, KB articles)
- [ ] Review request automation (Tier 3)
- [ ] Lead follow-up automation (Tier 3)

**Test with**: First external customer (not family/friends).

### Phase 4: Migration + Polish (Weeks 12-14)

**Goal**: Businesses can migrate from other tools. Product is production-ready.

**Deliverables:**
- [ ] Migration wizard (CSV, Google Sheets, guided entry)
- [ ] Zendesk data import (API)
- [ ] Freshdesk data import (API)
- [ ] Landing page (with demo video)
- [ ] Terms of Service + Privacy Policy
- [ ] Daily/weekly email digest for business owners
- [ ] Mobile optimization pass (touch targets, responsive)
- [ ] Error monitoring (Sentry)
- [ ] Performance optimization
- [ ] Security audit (SQL injection, XSS, CSRF, auth bypass)
- [ ] Documentation for AI agent operations

### Phase 5: Growth Features (Ongoing)

- [ ] Calendly/Acuity integration
- [ ] QuickBooks integration
- [ ] Zapier integration
- [ ] Spanish language support
- [ ] Multi-location support
- [ ] Custom AI personality/tone editor
- [ ] Advanced analytics (ROI dashboard)
- [ ] Mobile app for business owners
- [ ] WhatsApp/Facebook Messenger channels
- [ ] White-label option

---

## 17. Success Metrics

### Month 1-3 (Validation)

| Metric | Target |
|--------|--------|
| Test businesses active | 2 |
| AI resolution rate | >75% |
| First response time | <30 seconds (chat), <1 hour (email) |
| Onboarding completion rate | >80% |
| Critical bugs | 0 |

### Month 4-6 (First Customers)

| Metric | Target |
|--------|--------|
| Paying customers | 5-10 |
| MRR | $500-1,500 |
| Monthly churn | <10% (early stage) |
| Trial to paid | >30% |
| NPS | >20 |

### Month 7-12 (Growth)

| Metric | Target |
|--------|--------|
| Paying customers | 25-50 |
| MRR | $4,000-8,000 |
| Monthly churn | <5% |
| Referral rate | 20%+ of new customers |
| AI resolution rate | >80% |
| CSAT | >80% |

### Year 2 (Scale)

| Metric | Target |
|--------|--------|
| Paying customers | 50-100+ |
| MRR | $8,000-20,000 |
| Monthly churn | <3% |
| Net revenue retention | >110% |

---

## 18. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI gives wrong answer | High (early) | High - customer loses trust | Confidence scoring, human escalation, conversation review, start at Tier 1 |
| Voice AI latency too high | Medium | High - awkward calls | Use Retell (lowest latency), test extensively, fallback to voicemail |
| SMS compliance violation | Low (if followed) | Very High - $500-1,500 per text | 10DLC registration, consent tracking, auto opt-out |
| LLM costs spike | Low | Medium - margins shrink | Use cheapest models, cache common responses, per-tenant limits |
| Low adoption | Medium | High - no revenue | Free trial, same-day setup, local demos, industry-specific templates |
| Security breach | Low | Very High | Encryption, row-level security, E&O insurance, breach plan |
| Retell/Twilio outage | Low | Medium - calls fail | Fallback to voicemail, status monitoring, notify business owners |
| Solo dev burnout | Medium | Very High | Scope phases tightly, ship incrementally, automate what you can |

---

## 19. Glossary

For any AI agent working on this codebase:

| Term | Definition |
|------|-----------|
| Tenant | A business using MykoDesk. Each tenant is isolated. |
| Customer | A tenant's customer (the end-user calling/texting/chatting). |
| User/Agent | A person on the tenant's team (owner, admin, support agent). |
| Conversation | A thread of messages between a customer and the business, across any channel. |
| Channel | How the customer communicates: phone, SMS, email, or chat. |
| KB | Knowledge Base - the business's stored information the AI uses to answer questions. |
| RAG | Retrieval-Augmented Generation - querying the KB to provide context to the LLM. |
| FCR | First Contact Resolution - resolving an issue on the first interaction. |
| CSAT | Customer Satisfaction Score - post-interaction rating. |
| NPS | Net Promoter Score - loyalty metric. |
| CES | Customer Effort Score - how easy it was to get help. |
| Tier | AI capability level (1=answering, 2=booking, 3=active management). |
| Escalation | When the AI hands off to a human. |
| Warm transfer | Escalation where the human receives full conversation context. |
| 10DLC | 10-Digit Long Code - SMS registration requirement for US businesses. |
| TCR | The Campaign Registry - organization managing 10DLC registration. |
| Dunning | Process of collecting failed subscription payments. |
| MRR | Monthly Recurring Revenue. |
| CAC | Customer Acquisition Cost. |
| LTV | Lifetime Value of a customer. |

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-25 | 1.0 | Initial comprehensive design spec |

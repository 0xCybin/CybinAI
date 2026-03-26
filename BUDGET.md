# MykoDesk - Budget & Local Strategy (Grand Prairie, TX)

## Your Situation
- Solo dev (you + Claude Code)
- Grand Prairie, Texas (DFW metroplex - 8M people, massive home services market)
- Two test businesses available (brother + best friend in NJ)
- Budget-conscious, willing to spend smart

## DFW Market Advantage

Grand Prairie sits in the middle of the DFW metroplex. This is one of the best markets in the country for home service businesses:
- Hot summers = HVAC is a year-round monster industry
- Rapid suburban growth = plumbing, electrical, landscaping booming
- Texas has no state income tax = small businesses have more cash to spend on tools
- Texas is a **one-party consent** state for call recording (you only need one party's consent - huge compliance win)
- DFW has 150,000+ small businesses

You can literally drive to businesses and demo in person. This is your unfair advantage over every SaaS company selling online.

---

## What You Need to Spend Money On (And What You Don't)

### Must-Spend (Required to Launch)

| Item | Cost | Why |
|------|------|-----|
| **Domain + hosting** | $12/yr domain + $5-20/mo VPS | You probably already have this |
| **Retell.ai** (voice AI) | $0/mo base + $0.07/min usage | Pay as you go, no upfront. Test businesses might use 50 min/mo = $3.50 |
| **Twilio** (SMS) | $1/mo per number + $0.0083/text | One number for testing = ~$5/mo |
| **OpenAI API** (GPT-4o Mini) | Pay per use | For testing: maybe $2-5/mo. Per conversation cost is $0.001 |
| **Stripe** (billing) | $0 until you charge | 2.9% + $0.30 per transaction, only when you have paying customers |
| **SSL certificate** | $0 | Let's Encrypt, free |

**Total to get started: ~$15-30/month**

### Nice-to-Have (Spend When You Have Revenue)

| Item | Cost | When |
|------|------|------|
| **Custom email domain** (support@mykodesk.com) | $6/mo (Google Workspace) | Before first paying customer |
| **Sentry** (error monitoring) | $0 (free tier) | Now |
| **Better VPS** (more RAM for Postgres) | $20-40/mo | When you have 5+ customers |
| **10DLC registration** (SMS compliance) | ~$4/brand + $15/campaign | Before sending SMS to real customers |
| **Amazon SES** (email at scale) | $0.10/1K emails | When email volume gets real |

### Don't Spend On (Yet)

| Item | Why Not |
|------|---------|
| Pinecone/Weaviate (vector DB) | Use pgvector - it's free and you already have Postgres |
| Vercel Pro | Free tier is fine for now |
| Datadog/New Relic | Overkill, use basic logging |
| Multiple LLM providers | Just use OpenAI GPT-4o Mini for now, cheapest good option |
| Zapier paid plan | Build direct integrations first |
| Marketing/ads | Your sales channel is walking into businesses, not Google Ads |
| Mobile app | Dashboard works on mobile browsers. Native app is Phase 4 |
| Fancy landing page | A clean single page with a demo video is enough |

---

## Realistic Timeline (Solo Dev + Claude Code)

### Weeks 1-3: Fix What's There
- Clean up existing codebase
- Get onboarding wizard working
- Get chat widget polished and demo-ready
- Get AI engine working reliably with GPT-4o Mini + pgvector RAG
- Get dashboard looking professional
- Deploy to a VPS so it's accessible

### Weeks 4-5: Add Phone + SMS
- Integrate Retell.ai for voice
- Integrate Twilio for SMS
- Unified inbox showing all channels
- Test with brother's business

### Week 6: Polish + Billing
- Stripe integration
- Onboarding flow for new businesses
- Landing page
- Test with friend in NJ (different timezone/state = good test)

### Week 7+: Start Selling
- Walk into businesses in Grand Prairie/Arlington/DFW
- Demo on your phone
- Offer free 14-day trial
- Iterate based on feedback

---

## Test Business Strategy

### Brother's Business (Local)
- **Perfect for**: In-person testing, watching customers interact with the AI
- **What to test**: Phone calls, web chat, appointment booking
- **What you learn**: What breaks, what confuses customers, what's missing
- **Ask him**: What are his top 10 customer questions? What scheduling tool does he use? What's his biggest CS pain?

### Best Friend's Business (NJ)
- **Perfect for**: Remote setup testing (can you onboard someone who's not in the room?)
- **What to test**: Self-service onboarding, email channel, different timezone handling
- **What you learn**: Whether businesses can set this up without you physically there
- **Compliance note**: NJ is a **one-party consent** state too, so recording is fine

### What to Track During Testing
- How many conversations does the AI handle correctly vs incorrectly?
- What questions stump it?
- Do customers realize it's AI? Do they care?
- How long does onboarding take?
- What does the business owner actually look at in the dashboard?

---

## Revenue Projections (Conservative)

### Month 1-2: Testing
- 0 paying customers
- Spending: $15-30/mo on infrastructure
- Focus: Get the product right with test businesses

### Month 3-4: First Customers
- 3-5 paying customers at $99-199/mo
- Revenue: $300-1,000/mo
- Spending: $50-100/mo on infrastructure
- Net: $200-900/mo

### Month 5-6: Growing
- 10-15 paying customers
- Revenue: $2,000-3,000/mo
- Spending: $150-300/mo
- Net: $1,700-2,700/mo

### Month 7-12: Real Business
- 25-50 paying customers
- Revenue: $5,000-10,000/mo
- Spending: $500-1,000/mo
- Net: $4,000-9,000/mo

### To Hit $10K MRR
You need ~50 customers on Pro ($199/mo) or ~100 on Starter ($99/mo). In a market of 150,000+ small businesses in DFW, that's 0.03-0.07% market penetration. Very achievable.

---

## Pricing Adjustment (Budget-Conscious Version)

Given you're solo and budget-conscious, I'd actually suggest launching with slightly lower prices to reduce friction and build a customer base fast:

| Plan | Monthly | Annual | Notes |
|------|---------|--------|-------|
| **Starter** | $79/mo | $63/mo | Chat + email only. Perfect entry point. |
| **Pro** | $149/mo | $119/mo | + Phone + SMS. The sweet spot. |
| **Business** | $249/mo | $199/mo | + More minutes/texts, priority support. |

**Why lower than the strategy doc**: You're new, no brand recognition, no case studies yet. Slightly lower price = easier first sales. You can always raise prices for new customers once you have proof it works. Early customers locked in at lower rate = loyalty.

**Still great margins**: Your cost per customer is ~$25-35/mo. Even at $79/mo Starter, you're at 55-68% gross margin. At $149/mo Pro, you're at 76-83%.

---

## What to Spend Money On RIGHT NOW

1. **Domain**: mykodesk.com (if not already registered) - ~$12/year
2. **VPS**: DigitalOcean or Hetzner droplet, 4GB RAM - $12-24/mo (runs Postgres, Redis, FastAPI, Next.js)
3. **OpenAI API key**: Load $10 to start, lasts months of testing
4. **Retell.ai account**: Free to sign up, pay per use when testing voice
5. **Twilio account**: Free trial includes $15 credit

**Total immediate spend: ~$25-50**

That's it. Everything else can wait until you have paying customers.

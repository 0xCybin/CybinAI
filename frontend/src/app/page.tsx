import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Phone,
  MessageSquare,
  Mail,
  MessagesSquare,
  CalendarCheck,
  Moon,
  BarChart3,
  BookOpen,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Phone,
    title: 'Phone AI',
    desc: 'Your AI answers calls, takes messages, and routes urgent issues to your team.',
  },
  {
    icon: MessageSquare,
    title: 'SMS / Text',
    desc: 'Two-way texting that handles appointment confirmations, reminders, and questions.',
  },
  {
    icon: Mail,
    title: 'Email',
    desc: 'AI reads, categorizes, and responds to customer emails automatically.',
  },
  {
    icon: MessagesSquare,
    title: 'Web Chat',
    desc: 'A chat widget on your website that converts visitors into booked jobs.',
  },
  {
    icon: CalendarCheck,
    title: 'Smart Booking',
    desc: 'AI schedules appointments based on your real availability. No double-booking.',
  },
  {
    icon: Moon,
    title: 'After-Hours Coverage',
    desc: 'Customers get answers at 2 AM. You get sleep. Everybody wins.',
  },
  {
    icon: BarChart3,
    title: 'Dashboard',
    desc: 'See every conversation, resolution rate, and response time in one place.',
  },
  {
    icon: BookOpen,
    title: 'Knowledge Base',
    desc: 'Teach your AI about your services, pricing, and policies. It learns fast.',
  },
];

const TIERS = [
  {
    name: 'Starter',
    price: 79,
    annual: 63,
    desc: 'Chat and email coverage for your business.',
    features: [
      'Web chat widget',
      'Email AI responses',
      'Knowledge base',
      'Dashboard & analytics',
      'Up to 500 conversations/mo',
      'Email support',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 149,
    annual: 119,
    desc: 'Add phone and SMS for full coverage.',
    features: [
      'Everything in Starter',
      'Phone AI answering',
      'SMS / text support',
      'Smart booking',
      'Up to 2,000 conversations/mo',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    highlight: true,
  },
  {
    name: 'Business',
    price: 249,
    annual: 199,
    desc: 'Unlimited coverage with premium features.',
    features: [
      'Everything in Pro',
      'Unlimited conversations',
      'Custom AI training',
      'Jobber integration',
      'Multi-location support',
      'Dedicated account manager',
    ],
    cta: 'Start Free Trial',
    highlight: false,
  },
];

const INDUSTRIES = [
  'Grooming',
  'HVAC',
  'Dental',
  'Cleaning',
  'Salon',
  'Plumbing',
  'Electrical',
  'Landscaping',
  'Auto Repair',
  'Property Management',
];

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Navigation */}
      <nav className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-white tracking-tight">
              Myko<span className="text-amber-500">Desk</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="#how-it-works"
                className="text-zinc-400 hover:text-white transition-colors text-sm font-medium hidden sm:block"
              >
                How It Works
              </Link>
              <Link
                href="#features"
                className="text-zinc-400 hover:text-white transition-colors text-sm font-medium hidden sm:block"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-zinc-400 hover:text-white transition-colors text-sm font-medium hidden sm:block"
              >
                Pricing
              </Link>
              <Link
                href="/auth/login"
                className="text-zinc-300 hover:text-white transition-colors text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2.5 rounded-lg transition-all text-sm font-semibold shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-600/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-6 pt-24 pb-28 relative">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              Never Miss Another
              <br />
              <span className="text-amber-500">Customer Call</span>
            </h1>

            <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              AI that handles your phone calls, texts, emails, and website chat 24/7.
              Your customers get instant answers. You get more booked jobs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
              <Link
                href="/auth/register"
                className="group bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-amber-600/25 hover:shadow-amber-500/30 flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#how-it-works"
                className="border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all flex items-center justify-center"
              >
                See How It Works
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Setup in 5 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="border-y border-zinc-800/50 bg-zinc-900/50">
        <div className="container mx-auto px-6 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
              Every missed call is a missed paycheck
            </h2>
            <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 mt-10">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8">
                <p className="text-3xl sm:text-4xl font-bold text-amber-500 mb-3">$126,000</p>
                <p className="text-zinc-400 leading-relaxed">
                  Average revenue small businesses lose per year from missed calls and slow responses.
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 sm:p-8">
                <p className="text-3xl sm:text-4xl font-bold text-amber-500 mb-3">78%</p>
                <p className="text-zinc-400 leading-relaxed">
                  of customers buy from whoever responds first. Speed wins the job.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-zinc-950">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Up and running in 5 minutes
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              No complex setup. No IT department needed. No contracts.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-center">
            {/* Left: Steps */}
            <div className="space-y-8">
              <div className="flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-amber-600/20">
                  1
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Tell us about your business
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Your services, pricing, hours, and the questions customers ask most. We pre-fill everything based on your industry.
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-amber-600/20">
                  2
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    AI learns your business instantly
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Your AI reads your knowledge base and learns how to answer questions, book appointments, and handle inquiries just like you would.
                  </p>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-amber-600/20">
                  3
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    Customers get instant answers 24/7
                  </h3>
                  <p className="text-zinc-400 leading-relaxed">
                    Phone, text, email, or chat - your AI handles it all. You see every conversation in your dashboard and step in when needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Simulated Chat Demo */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-1 shadow-2xl">
              <div className="bg-zinc-800 rounded-xl overflow-hidden">
                {/* Chat header */}
                <div className="bg-amber-600 px-5 py-3.5 flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">M</div>
                  <div>
                    <div className="text-white font-semibold text-sm">Mike&apos;s HVAC Services</div>
                    <div className="text-amber-100/70 text-xs">AI Assistant - Online</div>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="p-5 space-y-4 min-h-[320px]">
                  {/* Customer message */}
                  <div className="flex justify-end">
                    <div className="bg-amber-600/20 border border-amber-600/30 text-zinc-200 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-sm">
                      Hi, my AC stopped blowing cold air. Can someone come look at it today?
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="flex justify-start">
                    <div className="bg-zinc-700/50 text-zinc-200 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
                      I&apos;m sorry to hear that! I can definitely help. Our diagnostic service call is $89, and we have a technician available this afternoon between 2-4 PM. Would that work for you?
                    </div>
                  </div>

                  {/* Customer message */}
                  <div className="flex justify-end">
                    <div className="bg-amber-600/20 border border-amber-600/30 text-zinc-200 rounded-2xl rounded-br-md px-4 py-2.5 max-w-[80%] text-sm">
                      Yes, 2-4 works. What do I need to have ready?
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="flex justify-start">
                    <div className="bg-zinc-700/50 text-zinc-200 rounded-2xl rounded-bl-md px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
                      You&apos;re all set for today between 2-4 PM. Just make sure someone 18+ is home, and if you can, set your thermostat to where the problem happens. Our tech will call 30 min before arrival. Can I get your address?
                    </div>
                  </div>

                  {/* Confidence badge */}
                  <div className="flex justify-start">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      AI handled with high confidence
                    </span>
                  </div>
                </div>

                {/* Chat input */}
                <div className="border-t border-zinc-700 px-4 py-3 flex gap-2">
                  <div className="flex-1 bg-zinc-700/50 rounded-lg px-3 py-2 text-zinc-500 text-sm">
                    Type a message...
                  </div>
                  <div className="w-9 h-9 bg-amber-600 rounded-lg flex items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 sm:py-28 bg-zinc-900/50 border-y border-zinc-800/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything your business needs
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              One platform that handles every customer touchpoint, so you can focus on doing the actual work.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-6 transition-all"
              >
                <div className="w-11 h-11 bg-amber-500/10 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-28 bg-zinc-950">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              No per-agent fees. No surprise charges. Pay annually and save 20%.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-8 border transition-all ${
                  tier.highlight
                    ? 'bg-zinc-900 border-amber-500/50 shadow-lg shadow-amber-500/5'
                    : 'bg-zinc-900 border-zinc-800'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-white mb-1">{tier.name}</h3>
                  <p className="text-zinc-500 text-sm">{tier.desc}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-white">${tier.price}</span>
                    <span className="text-zinc-500">/mo</span>
                  </div>
                  <p className="text-sm text-amber-500 mt-1">
                    ${tier.annual}/mo billed annually (save 20%)
                  </p>
                </div>

                <ul className="space-y-3 mb-8">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-zinc-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/auth/register"
                  className={`block w-full text-center py-3.5 rounded-xl font-semibold transition-all text-sm ${
                    tier.highlight
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/25'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                  }`}
                >
                  {tier.cta}
                </Link>

                <p className="text-zinc-600 text-xs text-center mt-3">
                  14 days free -- no credit card required
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / Industries Section */}
      <section className="border-y border-zinc-800/50 bg-zinc-900/50">
        <div className="container mx-auto px-6 py-16 sm:py-20">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Built for businesses like yours
            </h2>
            <p className="text-zinc-400">
              Service businesses across every industry trust MykoDesk to handle their customers.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto">
            {INDUSTRIES.map((ind) => (
              <span
                key={ind}
                className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400 text-sm font-medium"
              >
                {ind}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-20 sm:py-28 bg-zinc-950">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to stop missing calls?
            </h2>
            <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto">
              Join thousands of service businesses using AI to respond faster, book more jobs, and keep customers happy.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-amber-600/25 hover:shadow-amber-500/30"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-zinc-600 text-sm mt-4">
              14-day free trial -- no credit card -- cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold text-white">
              Myko<span className="text-amber-500">Desk</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-zinc-500">
              <Link href="#" className="hover:text-zinc-300 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-zinc-300 transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-zinc-300 transition-colors">
                Contact
              </Link>
            </div>
            <div className="text-sm text-zinc-600">
              {new Date().getFullYear()} MykoDesk. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

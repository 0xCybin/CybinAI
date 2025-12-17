import Link from 'next/link';
import {
  Bot,
  MessageSquare,
  Zap,
  Shield,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Star,
  Building2,
  Wrench,
  Plug,
  Droplets,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0F0E0C]">
      {/* Navigation */}
      <nav className="border-b border-neutral-800/50 bg-[#0F0E0C]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-white tracking-tight">
              Myko<span className="text-amber-500">Desk</span>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="#features"
                className="text-neutral-400 hover:text-white transition-colors text-sm font-medium hidden sm:block"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-neutral-400 hover:text-white transition-colors text-sm font-medium hidden sm:block"
              >
                Pricing
              </Link>
              <Link
                href="/auth/login"
                className="text-neutral-300 hover:text-white transition-colors text-sm font-medium"
              >
                Login
              </Link>
              <Link
                href="/auth/register"
                className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium shadow-lg shadow-amber-600/20 hover:shadow-amber-500/30"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-amber-600/5 rounded-full blur-3xl" />

        <div className="container mx-auto px-6 pt-20 pb-24 relative">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              <span className="text-amber-400 text-sm font-medium">
                Now with Jobber Integration
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              AI Customer Service
              <br />
              <span className="text-amber-500">Built for the Trades</span>
            </h1>

            <p className="text-lg sm:text-xl text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Handle 60-80% of customer inquiries automatically. Your AI assistant
              answers questions, books appointments, and knows when to escalate—
              24/7, at a fraction of enterprise costs.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/auth/register"
                className="group bg-amber-600 hover:bg-amber-500 text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-amber-600/25 hover:shadow-amber-500/30 flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/demo/widget"
                className="border border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:text-white px-8 py-3.5 rounded-xl text-lg font-semibold transition-all flex items-center justify-center"
              >
                See Live Demo
              </Link>
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-neutral-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>Setup in 10 minutes</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y border-neutral-800/50 bg-[#131210]/50">
        <div className="container mx-auto px-6 py-12">
          <p className="text-center text-neutral-500 text-sm mb-8">
            TRUSTED BY SERVICE BUSINESSES
          </p>
          <div className="flex flex-wrap items-center justify-center gap-12 text-neutral-600">
            <div className="flex items-center gap-2">
              <Wrench className="w-6 h-6" />
              <span className="font-medium">HVAC Pros</span>
            </div>
            <div className="flex items-center gap-2">
              <Droplets className="w-6 h-6" />
              <span className="font-medium">Plumbers</span>
            </div>
            <div className="flex items-center gap-2">
              <Plug className="w-6 h-6" />
              <span className="font-medium">Electricians</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-6 h-6" />
              <span className="font-medium">Property Managers</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-[#0F0E0C]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything Your Business Needs
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              A complete customer service platform that works as hard as you do.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="group bg-[#1A1915] p-6 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                AI-Powered Responses
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Smart AI handles routine inquiries, answers FAQs from your
                knowledge base, and books appointments automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group bg-[#1A1915] p-6 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Multi-Channel Support
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Web chat widget, email, and more—meet your customers where they
                are. One inbox for everything.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group bg-[#1A1915] p-6 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Jobber Integration
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Your AI can schedule appointments directly in Jobber, look up
                customer info, and create work requests automatically.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group bg-[#1A1915] p-6 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Smart Escalation
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                AI knows its limits. Complex issues or unhappy customers get
                seamlessly handed off to your team with full context.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="group bg-[#1A1915] p-6 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                24/7 Availability
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Never miss a lead. Your AI assistant responds instantly, even at
                2 AM when the furnace breaks down.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="group bg-[#1A1915] p-6 rounded-2xl border border-neutral-800 hover:border-neutral-700 transition-all">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Analytics & Insights
              </h3>
              <p className="text-neutral-400 leading-relaxed">
                Track AI resolution rates, response times, customer satisfaction,
                and identify trends in customer inquiries.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 bg-[#131210]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Up and Running in Minutes
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              No complex setup. No IT department needed.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Add Your Knowledge
              </h3>
              <p className="text-neutral-400">
                Import your FAQs, service info, pricing, and policies. The AI
                learns your business.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Connect Your Tools
              </h3>
              <p className="text-neutral-400">
                One-click integrations with Jobber, email, and more. Your AI
                can take real actions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl font-bold text-white">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Embed & Go Live
              </h3>
              <p className="text-neutral-400">
                Drop our chat widget on your site with one line of code. Start
                handling inquiries instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-24 bg-[#0F0E0C]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pricing That Makes Sense
            </h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Enterprise features without enterprise pricing. No per-agent fees.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <div className="bg-[#1A1915] rounded-2xl border border-neutral-800 p-8 text-center relative overflow-hidden">
              {/* Gradient accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400" />

              <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-6">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-amber-400 text-sm font-medium">
                  Early Access
                </span>
              </div>

              <div className="text-5xl font-bold text-white mb-2">$29</div>
              <div className="text-neutral-400 mb-8">/month for your whole team</div>

              <ul className="space-y-4 text-left mb-8">
                {[
                  'Unlimited conversations',
                  'AI-powered responses',
                  'Knowledge base management',
                  'Jobber integration',
                  'Email support channel',
                  'Analytics dashboard',
                  'Unlimited team members',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-neutral-300">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/auth/register"
                className="block w-full bg-amber-600 hover:bg-amber-500 text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-amber-600/25"
              >
                Start Your Free Trial
              </Link>

              <p className="text-neutral-500 text-sm mt-4">
                14 days free • No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#131210] border-t border-neutral-800/50">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
              Ready to Transform Your Customer Service?
            </h2>
            <p className="text-neutral-400 text-lg mb-8">
              Join service businesses using AI to handle more inquiries, book
              more appointments, and keep customers happy—all while you focus on
              the work that matters.
            </p>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-amber-600/25 hover:shadow-amber-500/30"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-800/50 bg-[#0F0E0C]">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-2xl font-bold text-white">
              Myko<span className="text-amber-500">Desk</span>
            </div>
            <div className="flex items-center gap-8 text-sm text-neutral-500">
              <Link href="#" className="hover:text-neutral-300 transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-neutral-300 transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-neutral-300 transition-colors">
                Contact
              </Link>
            </div>
            <div className="text-sm text-neutral-600">
              © {new Date().getFullYear()} MykoDesk. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
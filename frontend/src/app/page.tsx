import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <nav className="flex justify-between items-center mb-16">
          <div className="text-2xl font-bold text-white">
            Cybin<span className="text-blue-400">AI</span>
          </div>
          <div className="space-x-4">
            <Link 
              href="/auth/login" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link 
              href="/auth/signup" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            AI-Powered Customer Service for{' '}
            <span className="text-blue-400">Small Businesses</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Handle 60-80% of customer inquiries automatically. Professional support 
            at a fraction of the cost of enterprise solutions.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/auth/signup"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Start Free Trial
            </Link>
            <Link 
              href="/demo"
              className="border border-gray-500 text-gray-300 hover:border-white hover:text-white px-8 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              See Demo
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <div className="text-3xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-white mb-2">AI-First</h3>
            <p className="text-gray-400">
              Smart AI handles routine inquiries, answers FAQs, and books appointments automatically.
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <div className="text-3xl mb-4">💬</div>
            <h3 className="text-xl font-semibold text-white mb-2">Multi-Channel</h3>
            <p className="text-gray-400">
              Web chat, email, SMS — meet your customers where they are.
            </p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700">
            <div className="text-3xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold text-white mb-2">Integrations</h3>
            <p className="text-gray-400">
              Connect with Jobber, QuickBooks, and your existing tools.
            </p>
          </div>
        </div>

        {/* Pricing Teaser */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Enterprise Features, Small Business Pricing
          </h2>
          <p className="text-gray-400 text-lg">
            Starting at <span className="text-blue-400 font-bold">$29/month</span> — 
            less than half the cost of Zendesk.
          </p>
        </div>

        {/* Footer */}
        <footer className="mt-24 text-center text-gray-500 text-sm">
          <p>© 2024 CybinAI. All rights reserved.</p>
        </footer>
      </div>
    </main>
  )
}

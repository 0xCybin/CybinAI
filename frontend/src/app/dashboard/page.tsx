'use client';

import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, tenant, logout, isLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = '/auth/login';
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-xl font-bold text-slate-900">
                Cybin<span className="text-blue-600">AI</span>
              </Link>
              {tenant && (
                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  {tenant.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user?.name} ({user?.role})
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            Here&apos;s what&apos;s happening with your customer service today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard 
            title="Active Conversations" 
            value="0" 
            change="+0%"
            changeType="neutral"
          />
          <StatsCard 
            title="AI Resolution Rate" 
            value="--" 
            change="No data yet"
            changeType="neutral"
          />
          <StatsCard 
            title="Avg Response Time" 
            value="--" 
            change="No data yet"
            changeType="neutral"
          />
          <StatsCard 
            title="Customer Satisfaction" 
            value="--" 
            change="No data yet"
            changeType="neutral"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickAction
              title="Set Up Chat Widget"
              description="Add the chat widget to your website"
              icon="💬"
              href="/settings/widget"
              disabled
            />
            <QuickAction
              title="Create Knowledge Base"
              description="Add FAQs and common answers"
              icon="📚"
              href="/knowledge-base"
              disabled
            />
            <QuickAction
              title="Connect Jobber"
              description="Sync your customer data"
              icon="🔗"
              href="/integrations"
              disabled
            />
          </div>
        </div>

        {/* Development Status */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">🚧 Development Status</h3>
          <p className="text-sm text-blue-700">
            Authentication is complete! Next up: Chat widget system, AI integration, and agent inbox.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatsCard({ 
  title, 
  value, 
  change,
  changeType 
}: { 
  title: string; 
  value: string; 
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
}) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      <p className={`text-xs mt-1 ${changeColors[changeType]}`}>{change}</p>
    </div>
  );
}

function QuickAction({
  title,
  description,
  icon,
  href,
  disabled = false,
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
  disabled?: boolean;
}) {
  const content = (
    <div className={`p-4 border rounded-lg transition-colors ${
      disabled 
        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' 
        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
    }`}>
      <span className="text-2xl">{icon}</span>
      <h3 className="font-medium text-gray-900 mt-2">{title}</h3>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
      {disabled && <span className="text-xs text-gray-400 mt-2 block">Coming soon</span>}
    </div>
  );

  if (disabled) {
    return content;
  }

  return (
    <Link href={href}>
      {content}
    </Link>
  );
}
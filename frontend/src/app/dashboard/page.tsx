'use client';

import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import {
  MessageSquare,
  Bot,
  Clock,
  ThumbsUp,
  Inbox,
  BookOpen,
  Zap,
  ArrowRight,
  Loader2,
} from 'lucide-react';

export default function DashboardPage() {
  const { user, tenant, isLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1915]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-neutral-400 mt-1">
              Here&apos;s what&apos;s happening with your customer service today.
            </p>
          </div>
          {tenant && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 rounded-full border border-neutral-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-sm font-medium text-neutral-300">{tenant.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={<MessageSquare className="w-5 h-5" />}
          title="Active Conversations"
          value="0"
          subtitle="No active chats"
          color="blue"
        />
        <StatsCard
          icon={<Bot className="w-5 h-5" />}
          title="AI Resolution Rate"
          value="--"
          subtitle="No data yet"
          color="amber"
        />
        <StatsCard
          icon={<Clock className="w-5 h-5" />}
          title="Avg Response Time"
          value="--"
          subtitle="No data yet"
          color="emerald"
        />
        <StatsCard
          icon={<ThumbsUp className="w-5 h-5" />}
          title="Customer Satisfaction"
          value="--"
          subtitle="No data yet"
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-[#232220] rounded-xl border border-neutral-800 p-6 mb-8">
        <h2 className="text-lg font-semibold text-neutral-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickAction
            href="/agent"
            icon={<Inbox className="w-6 h-6" />}
            title="View Inbox"
            description="Check customer conversations"
            color="blue"
          />
          <QuickAction
            href="/admin/knowledge-base"
            icon={<BookOpen className="w-6 h-6" />}
            title="Knowledge Base"
            description="Manage AI training content"
            color="amber"
          />
          <QuickAction
            href="/demo/widget"
            icon={<Zap className="w-6 h-6" />}
            title="Test Widget"
            description="Try the chat experience"
            color="emerald"
          />
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 rounded-xl border border-neutral-700 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-100 mb-2">Getting Started</h2>
            <p className="text-neutral-400 text-sm mb-4 max-w-lg">
              Your AI customer service platform is ready. Add knowledge base articles to train your AI, 
              then embed the widget on your website to start helping customers automatically.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="/admin/knowledge-base/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium text-white transition-colors"
              >
                Add Knowledge Article
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/demo/widget"
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium text-neutral-200 transition-colors"
              >
                Preview Widget
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  icon,
  title,
  value,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: 'blue' | 'amber' | 'emerald' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    amber: 'bg-amber-500/10 text-amber-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    purple: 'bg-purple-500/10 text-purple-400',
  };

  return (
    <div className="bg-[#232220] rounded-xl border border-neutral-800 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-neutral-400">{title}</span>
      </div>
      <p className="text-2xl font-bold text-neutral-100">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'amber' | 'emerald';
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500/20',
    amber: 'bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20',
  };

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 p-4 rounded-xl border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all"
    >
      <div className={`p-3 rounded-xl transition-colors ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-neutral-200 group-hover:text-neutral-100">{title}</h3>
        <p className="text-sm text-neutral-500">{description}</p>
      </div>
    </Link>
  );
}
'use client';

import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';

export default function DashboardPage() {
  const { user, tenant, isLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 bg-zinc-900 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-zinc-400 mt-1">
              Here&apos;s what&apos;s happening with your customer service today.
            </p>
          </div>
          {tenant && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full border border-zinc-700">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-sm font-medium text-zinc-300">{tenant.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Conversations Today"
          value={0}
          subtitle="across all channels"
          color="blue"
        />
        <SummaryCard
          title="AI Resolution Rate"
          value="-- %"
          subtitle="handled without human"
          color="green"
        />
        <SummaryCard
          title="Avg Response Time"
          value="< 30s"
          subtitle="target: under 30 seconds"
          color="blue"
        />
        <SummaryCard
          title="Customer Satisfaction"
          value="-- / 5"
          subtitle="based on feedback"
          color="green"
        />
      </div>

      {/* Needs Attention */}
      <div className="bg-zinc-800 rounded-lg p-6 mb-8 border border-zinc-700">
        <h2 className="text-lg font-semibold text-white mb-3">Needs Attention</h2>
        <p className="text-zinc-300 text-sm">No conversations need attention right now.</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-zinc-800 rounded-lg p-6 border border-zinc-700">
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/agent"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium text-white transition-colors"
          >
            View Inbox
          </Link>
          <Link
            href="/admin/knowledge-base/new"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium text-zinc-200 transition-colors"
          >
            Add FAQ
          </Link>
          <Link
            href="/admin/settings"
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm font-medium text-zinc-200 transition-colors"
          >
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}

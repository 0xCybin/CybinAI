'use client';

import { useState } from 'react';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { Loader2, Check, ArrowRight, BookOpen, Settings, BarChart3 } from 'lucide-react';
import { SummaryCard } from '@/components/dashboard/SummaryCard';

const onboardingSteps = [
  { id: 'business', label: 'Set up business info', href: '/onboarding?step=1' },
  { id: 'services', label: 'Add services & pricing', href: '/onboarding?step=2' },
  { id: 'knowledge', label: 'Build FAQ knowledge base', href: '/admin/knowledge-base' },
  { id: 'channels', label: 'Configure channels', href: '/admin/settings' },
  { id: 'test', label: 'Test your AI', href: '/demo/widget' },
  { id: 'live', label: 'Go live', href: '/onboarding?step=6' },
];

export default function DashboardPage() {
  const { user, tenant, isLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  // TODO: pull real completion state from API
  const [completedSteps] = useState<string[]>([]);
  const onboardingComplete = completedSteps.length >= onboardingSteps.length;
  const progressPercent = Math.round((completedSteps.length / onboardingSteps.length) * 100);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Banner */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-zinc-500 mt-1 text-sm">{today}</p>
            </div>
            <div className="flex items-center gap-3">
              {tenant && (
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 rounded-lg border border-zinc-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-sm font-medium text-zinc-300">{tenant.name}</span>
                </div>
              )}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
                onboardingComplete
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : 'bg-amber-500/10 border-amber-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${onboardingComplete ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`text-sm font-medium ${onboardingComplete ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {onboardingComplete ? 'AI Online' : 'Setup Required'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Onboarding Checklist (hero when incomplete) */}
        {!onboardingComplete && (
          <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Get your AI assistant ready</h2>
                  <p className="text-zinc-400 text-sm">
                    Complete these steps so your AI can start handling customer conversations.
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-2xl font-bold text-amber-500">{progressPercent}%</span>
                  <div className="w-32 bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                {onboardingSteps.map((step) => {
                  const done = completedSteps.includes(step.id);
                  return (
                    <Link
                      key={step.id}
                      href={step.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors group ${
                        done
                          ? 'bg-zinc-800/50'
                          : 'bg-zinc-800 hover:bg-zinc-700/80'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                        done
                          ? 'bg-emerald-500'
                          : 'border-2 border-zinc-600 group-hover:border-amber-500'
                      }`}>
                        {done && <Check size={14} className="text-white" />}
                      </div>
                      <span className={`text-sm font-medium flex-1 ${
                        done ? 'text-zinc-500 line-through' : 'text-zinc-200 group-hover:text-white'
                      }`}>
                        {step.label}
                      </span>
                      {!done && (
                        <ArrowRight size={16} className="text-zinc-600 group-hover:text-amber-500 transition-colors" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors"
              >
                Continue Setup
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        )}

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

        {/* AI Health + Recent Conversations */}
        {onboardingComplete && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* AI Health */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">AI Status</h2>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                </div>
                <div>
                  <p className="text-white font-medium">Your AI is active and handling conversations</p>
                  <p className="text-zinc-500 text-sm mt-1">Responding across all configured channels. Average response time under 30 seconds.</p>
                </div>
              </div>
            </div>

            {/* Recent Conversations */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Conversations</h2>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <MessageSquareIcon />
                </div>
                <p className="text-zinc-300 font-medium mb-1">No conversations yet</p>
                <p className="text-zinc-500 text-sm max-w-xs">
                  Once customers reach out, their conversations will appear here.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout - Activity + Quick Actions */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Activity (shown when onboarding incomplete) */}
          {!onboardingComplete && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                  <MessageSquareIcon />
                </div>
                <p className="text-zinc-300 font-medium mb-1">No conversations yet</p>
                <p className="text-zinc-500 text-sm mb-5 max-w-xs">
                  Complete onboarding to get started. Once customers reach out, their conversations will appear here.
                </p>
                <Link
                  href="/onboarding"
                  className="text-amber-500 hover:text-amber-400 text-sm font-medium transition-colors"
                >
                  Complete onboarding
                </Link>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className={`bg-zinc-900 border border-zinc-800 rounded-xl p-6 ${onboardingComplete ? 'lg:col-span-2' : ''}`}>
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href="/agent"
                className="flex items-center gap-3 px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg transition-colors group"
              >
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <InboxIcon />
                </div>
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-amber-500 transition-colors">View Inbox</p>
                  <p className="text-zinc-500 text-xs">See all conversations</p>
                </div>
              </Link>
              <Link
                href="/admin/knowledge-base/new"
                className="flex items-center gap-3 px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg transition-colors group"
              >
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <PlusIcon />
                </div>
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-amber-500 transition-colors">Add FAQ</p>
                  <p className="text-zinc-500 text-xs">Teach your AI</p>
                </div>
              </Link>
              <Link
                href="/admin/settings"
                className="flex items-center gap-3 px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg transition-colors group"
              >
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <GearIcon />
                </div>
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-amber-500 transition-colors">AI Settings</p>
                  <p className="text-zinc-500 text-xs">Configure behavior</p>
                </div>
              </Link>
              <Link
                href="/demo/widget"
                className="flex items-center gap-3 px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg transition-colors group"
              >
                <div className="w-9 h-9 bg-amber-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <WidgetIcon />
                </div>
                <div>
                  <p className="text-white text-sm font-medium group-hover:text-amber-500 transition-colors">Widget Demo</p>
                  <p className="text-zinc-500 text-xs">Preview chat widget</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Getting Started Guide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/admin/knowledge-base"
              className="flex items-start gap-3 p-4 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg transition-colors group"
            >
              <BookOpen size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium group-hover:text-amber-500 transition-colors">How to add FAQs</p>
                <p className="text-zinc-500 text-xs mt-1">Add articles so your AI can answer common questions accurately.</p>
              </div>
            </Link>
            <Link
              href="/admin/settings"
              className="flex items-start gap-3 p-4 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg transition-colors group"
            >
              <Settings size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium group-hover:text-amber-500 transition-colors">Customize your widget</p>
                <p className="text-zinc-500 text-xs mt-1">Change colors, greeting messages, and data collection fields.</p>
              </div>
            </Link>
            <Link
              href="/dashboard/analytics"
              className="flex items-start gap-3 p-4 bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700/50 rounded-lg transition-colors group"
            >
              <BarChart3 size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-medium group-hover:text-amber-500 transition-colors">Read your analytics</p>
                <p className="text-zinc-500 text-xs mt-1">Track resolution rates, response times, and conversation volume.</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageSquareIcon() {
  return (
    <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function WidgetIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

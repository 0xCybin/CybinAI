'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import {
  BarChart3,
  MessageSquare,
  Users,
  Clock,
  TrendingUp,
  Bot,
  UserCheck,
  Loader2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types matching the backend schema
interface OverviewStats {
  total_conversations: number;
  open_conversations: number;
  resolved_today: number;
  ai_resolution_rate: number;
  avg_response_time_seconds: number | null;
  total_messages: number;
}

interface DailyCount {
  date: string;
  count: number;
}

interface ConversationVolumeData {
  period: string;
  data: DailyCount[];
  total: number;
}

interface StatusBreakdown {
  open: number;
  pending: number;
  resolved: number;
  closed: number;
}

interface ChannelBreakdown {
  chat: number;
  email: number;
  sms: number;
  other: number;
}

interface ResolutionBreakdown {
  ai_resolved: number;
  human_resolved: number;
  ai_resolution_rate: number;
}

interface HourlyActivity {
  hour: number;
  count: number;
}

interface ResponseTimeStats {
  avg_first_response_seconds: number | null;
  avg_resolution_time_seconds: number | null;
}

interface AnalyticsDashboard {
  overview: OverviewStats;
  volume: ConversationVolumeData;
  status_breakdown: StatusBreakdown;
  channel_breakdown: ChannelBreakdown;
  resolution_breakdown: ResolutionBreakdown;
  hourly_activity: HourlyActivity[];
  response_times: ResponseTimeStats;
  generated_at: string;
}

// Stat Card Component
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'amber',
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  color?: 'amber' | 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    amber: 'bg-amber-500/10 text-amber-500',
    green: 'bg-green-500/10 text-green-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
  };

  return (
    <div className="bg-[#232220] border border-neutral-800 rounded-xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && (
            <p className="text-sm text-neutral-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <TrendingUp size={14} className="text-green-500" />
              <span className="text-sm text-green-500">{trend.value}%</span>
              <span className="text-sm text-neutral-500">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

// Simple Bar Chart Component
function SimpleBarChart({
  data,
  maxValue,
  label,
}: {
  data: { label: string; value: number }[];
  maxValue: number;
  label: string;
}) {
  return (
    <div className="space-y-3">
      {label && <p className="text-sm text-neutral-400">{label}</p>}
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-sm text-neutral-500 w-16">{item.label}</span>
          <div className="flex-1 bg-neutral-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%` }}
            />
          </div>
          <span className="text-sm text-neutral-300 w-12 text-right">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// Volume Chart Component (last 7 days)
function VolumeChart({ data }: { data: DailyCount[] }) {
  // Take last 7 days of data
  const last7Days = data.slice(-7);
  
  // Check if we have any data
  const hasData = last7Days.length > 0 && last7Days.some(d => d.count > 0);
  const maxCount = Math.max(...last7Days.map(d => d.count), 1);

  // If no data at all, show empty state
  if (last7Days.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-neutral-500">
        <div className="text-center">
          <BarChart3 size={40} className="mx-auto mb-2 opacity-30" />
          <p>No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-48 flex items-end gap-2">
      {last7Days.map((day, i) => {
        const height = hasData ? (day.count / maxCount) * 100 : 0;
        const date = new Date(day.date + 'T00:00:00'); // Ensure proper date parsing
        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <div className="flex-1 w-full flex items-end justify-center">
              {day.count > 0 ? (
                <div
                  className="w-full max-w-[40px] bg-amber-500/80 rounded-t transition-all duration-500 hover:bg-amber-500 cursor-default"
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${dateLabel}: ${day.count} conversations`}
                />
              ) : (
                <div
                  className="w-full max-w-[40px] bg-neutral-700/50 rounded-t h-2"
                  title={`${dateLabel}: 0 conversations`}
                />
              )}
            </div>
            <div className="text-center">
              <span className="text-xs text-neutral-500 block">{dayLabel}</span>
              <span className="text-[10px] text-neutral-600">{day.count}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Hourly Heatmap Component
function HourlyHeatmap({ data }: { data: HourlyActivity[] }) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  const getOpacity = (count: number) => {
    if (count === 0) return 0.1;
    return 0.2 + (count / maxCount) * 0.8;
  };

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {data.map((hour, i) => (
          <div
            key={i}
            className="flex-1 h-8 rounded transition-all duration-300 hover:scale-110 cursor-default"
            style={{ backgroundColor: `rgba(217, 119, 6, ${getOpacity(hour.count)})` }}
            title={`${hour.hour}:00 - ${hour.count} conversations`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-neutral-600">
        <span>12am</span>
        <span>6am</span>
        <span>12pm</span>
        <span>6pm</span>
        <span>11pm</span>
      </div>
    </div>
  );
}

// Format seconds to human readable
function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

export default function AnalyticsDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/analytics/dashboard?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated, fetchAnalytics]);

  // Show loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1A1915] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1915] text-white">
      {/* Header */}
      <header className="bg-[#131210] border-b border-neutral-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft size={20} className="text-neutral-400" />
            </Link>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <BarChart3 className="text-amber-500" size={24} />
                Analytics Dashboard
              </h1>
              <p className="text-sm text-neutral-500">
                Performance metrics and insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Period Selector */}
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {loading && !analytics ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Conversations"
                value={analytics.overview.total_conversations}
                subtitle={`Last ${days} days`}
                icon={MessageSquare}
                color="amber"
              />
              <StatCard
                title="AI Resolution Rate"
                value={`${analytics.overview.ai_resolution_rate}%`}
                subtitle="Handled without human"
                icon={Bot}
                color="green"
              />
              <StatCard
                title="Open Conversations"
                value={analytics.overview.open_conversations}
                subtitle="Currently active"
                icon={Users}
                color="blue"
              />
              <StatCard
                title="Avg Response Time"
                value={formatDuration(analytics.overview.avg_response_time_seconds)}
                subtitle="First response"
                icon={Clock}
                color="purple"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Conversation Volume */}
              <div className="bg-[#232220] border border-neutral-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Conversation Volume (Last 7 Days)</h3>
                <VolumeChart data={analytics.volume.data} />
                <p className="text-sm text-neutral-500 mt-4 text-center">
                  {analytics.volume.total} total in period
                </p>
              </div>

              {/* AI vs Human Resolution */}
              <div className="bg-[#232220] border border-neutral-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Resolution Breakdown</h3>
                <div className="flex items-center justify-center gap-8 py-8">
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mb-3">
                      <Bot size={40} className="text-amber-500" />
                    </div>
                    <p className="text-2xl font-bold">{analytics.resolution_breakdown.ai_resolved}</p>
                    <p className="text-sm text-neutral-500">AI Resolved</p>
                  </div>
                  <div className="text-4xl text-neutral-700">vs</div>
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
                      <UserCheck size={40} className="text-blue-500" />
                    </div>
                    <p className="text-2xl font-bold">{analytics.resolution_breakdown.human_resolved}</p>
                    <p className="text-sm text-neutral-500">Human Resolved</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Breakdowns Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Status Breakdown */}
              <div className="bg-[#232220] border border-neutral-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">By Status</h3>
                <SimpleBarChart
                  label=""
                  maxValue={Math.max(
                    analytics.status_breakdown.open,
                    analytics.status_breakdown.pending,
                    analytics.status_breakdown.resolved,
                    analytics.status_breakdown.closed,
                    1
                  )}
                  data={[
                    { label: 'Open', value: analytics.status_breakdown.open },
                    { label: 'Pending', value: analytics.status_breakdown.pending },
                    { label: 'Resolved', value: analytics.status_breakdown.resolved },
                    { label: 'Closed', value: analytics.status_breakdown.closed },
                  ]}
                />
              </div>

              {/* Channel Breakdown */}
              <div className="bg-[#232220] border border-neutral-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">By Channel</h3>
                <SimpleBarChart
                  label=""
                  maxValue={Math.max(
                    analytics.channel_breakdown.chat,
                    analytics.channel_breakdown.email,
                    analytics.channel_breakdown.sms,
                    1
                  )}
                  data={[
                    { label: 'Chat', value: analytics.channel_breakdown.chat },
                    { label: 'Email', value: analytics.channel_breakdown.email },
                    { label: 'SMS', value: analytics.channel_breakdown.sms },
                  ]}
                />
              </div>

              {/* Response Times */}
              <div className="bg-[#232220] border border-neutral-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Response Times</h3>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Avg First Response</p>
                    <p className="text-3xl font-bold text-amber-500">
                      {formatDuration(analytics.response_times.avg_first_response_seconds)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500 mb-1">Avg Resolution Time</p>
                    <p className="text-3xl font-bold text-green-500">
                      {formatDuration(analytics.response_times.avg_resolution_time_seconds)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Hourly Activity */}
            <div className="bg-[#232220] border border-neutral-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Activity by Hour</h3>
              <HourlyHeatmap data={analytics.hourly_activity} />
              <p className="text-sm text-neutral-500 mt-4 text-center">
                Conversation volume by hour of day (UTC)
              </p>
            </div>

            {/* Footer Stats */}
            <div className="flex items-center justify-between text-sm text-neutral-500 pt-4 border-t border-neutral-800">
              <span>
                Total messages: {analytics.overview.total_messages.toLocaleString()}
              </span>
              <span>
                Last updated: {new Date(analytics.generated_at).toLocaleString()}
              </span>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
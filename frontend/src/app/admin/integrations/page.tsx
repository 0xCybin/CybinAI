'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Unlink,
  Zap,
  Calendar,
  CreditCard,
  MessageSquare,
  Clock,
} from 'lucide-react';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

interface Integration {
  id: string;
  tenant_id: string;
  type: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  account_name?: string;
  connected_at?: string;
  last_sync_at?: string;
  error_message?: string;
}

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  comingSoon?: boolean;
}

// =============================================================================
// Integration Configurations
// =============================================================================

const INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'jobber',
    name: 'Jobber',
    description: 'Field service management for scheduling, clients, and appointments',
    icon: <Calendar className="w-6 h-6" />,
    color: '#00A3E0',
    available: true,
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Accounting and invoicing integration',
    icon: <CreditCard className="w-6 h-6" />,
    color: '#2CA01C',
    available: false,
    comingSoon: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get notified about new conversations and escalations',
    icon: <MessageSquare className="w-6 h-6" />,
    color: '#4A154B',
    available: false,
    comingSoon: true,
  },
];

// =============================================================================
// Main Component
// =============================================================================

export default function IntegrationsPage() {
  const { isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();
  const searchParams = useSearchParams();

  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Check for OAuth callback status in URL
  useEffect(() => {
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');
    const account = searchParams.get('account');
    const message = searchParams.get('message');

    if (status === 'connected' && provider) {
      setSuccessMessage(`${provider} connected successfully${account ? ` to ${account}` : ''}!`);
      // Clear URL params
      window.history.replaceState({}, '', '/admin/integrations');
    } else if (status === 'error' && provider) {
      setError(message || `Failed to connect ${provider}`);
      window.history.replaceState({}, '', '/admin/integrations');
    }
  }, [searchParams]);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/integrations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch integrations');
      }

      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchIntegrations();
    }
  }, [isAuthenticated, fetchIntegrations]);

  // Connect integration (Jobber OAuth)
  const handleConnect = async (integrationType: string) => {
    setActionLoading(integrationType);
    setError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/integrations/${integrationType}/connect`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to initiate connection');
      }

      const data = await res.json();
      
      // Redirect to OAuth provider
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setActionLoading(null);
    }
  };

  // Disconnect integration
  const handleDisconnect = async (integrationType: string) => {
    if (!confirm(`Are you sure you want to disconnect ${integrationType}? This will disable all related features.`)) {
      return;
    }

    setActionLoading(integrationType);
    setError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/integrations/${integrationType}/disconnect`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to disconnect');
      }

      setSuccessMessage(`${integrationType} disconnected successfully`);
      await fetchIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Test connection
  const handleTest = async (integrationType: string) => {
    setActionLoading(`test-${integrationType}`);
    setError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/integrations/${integrationType}/test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Connection test failed');
      }

      const data = await res.json();
      setSuccessMessage(`Connection verified! Account: ${data.account_name || data.account_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setActionLoading(null);
    }
  };

  // Get integration status
  const getIntegrationStatus = (configId: string): Integration | undefined => {
    return integrations.find((i) => i.type === configId);
  };

  // Loading state
  if (authLoading || !isAuthenticated || loading) {
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
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Integrations</h1>
            <p className="text-sm text-neutral-500">
              Connect third-party services to enhance your workflow
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="max-w-6xl mx-auto px-6 pt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <Check size={16} />
            {successMessage}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Active Integrations Section */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            Available Integrations
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.filter((config) => config.available).map((config) => {
              const status = getIntegrationStatus(config.id);
              return (
                <IntegrationCard
                  key={config.id}
                  config={config}
                  status={status}
                  onConnect={() => handleConnect(config.id)}
                  onDisconnect={() => handleDisconnect(config.id)}
                  onTest={() => handleTest(config.id)}
                  actionLoading={actionLoading}
                />
              );
            })}
          </div>
        </section>

        {/* Coming Soon Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={20} className="text-neutral-500" />
            Coming Soon
          </h2>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.filter((config) => config.comingSoon).map((config) => (
              <IntegrationCard
                key={config.id}
                config={config}
                comingSoon
              />
            ))}
          </div>
        </section>

        {/* Help Section */}
        <section className="mt-12 p-6 bg-[#232220] rounded-xl border border-neutral-800">
          <h3 className="font-semibold mb-2">Need help with integrations?</h3>
          <p className="text-sm text-neutral-400 mb-4">
            Integrations allow CybinAI to connect with your existing tools. When connected,
            the AI can perform actions like scheduling appointments, looking up customer info,
            and more—all automatically during conversations.
          </p>
          <div className="flex gap-3">
            <a
              href="https://developer.getjobber.com/docs/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              Jobber API Docs
              <ExternalLink size={14} />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

// =============================================================================
// Integration Card Component
// =============================================================================

interface IntegrationCardProps {
  config: IntegrationConfig;
  status?: Integration;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onTest?: () => void;
  actionLoading?: string | null;
  comingSoon?: boolean;
}

function IntegrationCard({
  config,
  status,
  onConnect,
  onDisconnect,
  onTest,
  actionLoading,
  comingSoon,
}: IntegrationCardProps) {
  const isConnected = status?.status === 'connected';
  const hasError = status?.status === 'error';
  const isLoading = actionLoading === config.id;
  const isTestLoading = actionLoading === `test-${config.id}`;

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (comingSoon) {
    return (
      <div className="bg-[#232220] rounded-xl border border-neutral-800 p-5 opacity-60">
        <div className="flex items-start gap-4">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <div style={{ color: config.color }}>{config.icon}</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{config.name}</h3>
              <span className="text-[10px] font-medium bg-neutral-700/50 text-neutral-400 px-1.5 py-0.5 rounded">
                Coming Soon
              </span>
            </div>
            <p className="text-sm text-neutral-500 mt-1">{config.description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#232220] rounded-xl border border-neutral-800 p-5">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <div style={{ color: config.color }}>{config.icon}</div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{config.name}</h3>
            {/* Status Badge */}
            {isConnected && (
              <span className="text-[10px] font-medium bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Connected
              </span>
            )}
            {hasError && (
              <span className="text-[10px] font-medium bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <AlertCircle size={10} />
                Error
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500 mt-1">{config.description}</p>

          {/* Connection Details */}
          {isConnected && status && (
            <div className="mt-3 pt-3 border-t border-neutral-700/50 space-y-1">
              {status.account_name && (
                <p className="text-xs text-neutral-400">
                  Account: <span className="text-neutral-300">{status.account_name}</span>
                </p>
              )}
              {status.connected_at && (
                <p className="text-xs text-neutral-500">
                  Connected {formatDate(status.connected_at)}
                </p>
              )}
              {status.last_sync_at && (
                <p className="text-xs text-neutral-500">
                  Last sync: {formatDate(status.last_sync_at)}
                </p>
              )}
            </div>
          )}

          {/* Error Details */}
          {hasError && status?.error_message && (
            <div className="mt-3 pt-3 border-t border-neutral-700/50">
              <p className="text-xs text-red-400">{status.error_message}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-4 border-t border-neutral-700/50 flex gap-2">
        {!isConnected && !hasError && (
          <button
            onClick={onConnect}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Zap size={16} />
                Connect
              </>
            )}
          </button>
        )}

        {isConnected && (
          <>
            <button
              onClick={onTest}
              disabled={isTestLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isTestLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw size={16} />
                  Test
                </>
              )}
            </button>
            <button
              onClick={onDisconnect}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Unlink size={16} />
              )}
            </button>
          </>
        )}

        {hasError && (
          <button
            onClick={onConnect}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Reconnect
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
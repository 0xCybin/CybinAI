'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  ExternalLink,
  Bot,
  UserCheck,
  Hash,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface ConversationSummary {
  id: string;
  channel: string;
  status: string;
  subject: string | null;
  message_count: number;
  ai_handled: boolean;
  created_at: string;
  updated_at: string;
  last_message_preview: string | null;
}

interface CustomerDetail {
  id: string;
  tenant_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  external_ids: Record<string, string>;
  metadata_: Record<string, unknown> | null;
  conversation_count: number;
  total_messages: number;
  first_contact_at: string | null;
  last_contact_at: string | null;
  recent_conversations: ConversationSummary[];
  created_at: string;
  updated_at: string;
}

// Status badge colors
const statusColors: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  closed: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
};

// Format date helper
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const { isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  // State
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Auth headers
  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // Fetch customer
  const fetchCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/customers/${customerId}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Customer not found');
        }
        throw new Error('Failed to fetch customer');
      }

      const data: CustomerDetail = await res.json();
      setCustomer(data);
      setEditName(data.name || '');
      setEditEmail(data.email || '');
      setEditPhone(data.phone || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer');
    } finally {
      setLoading(false);
    }
  }, [customerId, getAuthHeaders]);

  // Fetch on mount
  useEffect(() => {
    if (isAuthenticated && customerId) {
      fetchCustomer();
    }
  }, [isAuthenticated, customerId, fetchCustomer]);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/customers/${customerId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: editName || null,
          email: editEmail || null,
          phone: editPhone || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update customer');
      }

      await fetchCustomer();
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Delete customer
  const handleDelete = async () => {
    setDeleting(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/customers/${customerId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to delete customer');
      }

      router.push('/admin/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(customer?.name || '');
    setEditEmail(customer?.email || '');
    setEditPhone(customer?.phone || '');
  };

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1915]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !customer) {
    return (
      <div className="p-8">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </Link>
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!customer) return null;

  const displayName = customer.name || customer.email || customer.phone || 'Anonymous';

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-neutral-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile */}
        <div className="lg:col-span-1">
          <div className="bg-[#131210] border border-neutral-800 rounded-xl p-6">
            {/* Avatar & Name */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-amber-600/20 rounded-full flex items-center justify-center">
                  <span className="text-amber-500 font-bold text-2xl">
                    {displayName[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">{displayName}</h1>
                  <p className="text-sm text-neutral-500">
                    Customer since {new Date(customer.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={saving}
                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">
                Contact Information
              </h3>

              {/* Name */}
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-neutral-500" />
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <span className={customer.name ? 'text-white' : 'text-neutral-500'}>
                    {customer.name || 'No name'}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-neutral-500" />
                {isEditing ? (
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <span className={customer.email ? 'text-white' : 'text-neutral-500'}>
                    {customer.email || 'No email'}
                  </span>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-neutral-500" />
                {isEditing ? (
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Phone"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                  />
                ) : (
                  <span className={customer.phone ? 'text-white' : 'text-neutral-500'}>
                    {customer.phone || 'No phone'}
                  </span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-8 pt-6 border-t border-neutral-800">
              <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-4">
                Activity Stats
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-neutral-500 mb-1">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-xs">Conversations</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {customer.conversation_count}
                  </p>
                </div>
                <div className="bg-neutral-800/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-neutral-500 mb-1">
                    <Hash className="w-4 h-4" />
                    <span className="text-xs">Messages</span>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {customer.total_messages}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    First Contact
                  </span>
                  <span className="text-neutral-300">
                    {formatDate(customer.first_contact_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Last Contact
                  </span>
                  <span className="text-neutral-300">
                    {formatRelativeTime(customer.last_contact_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* External IDs */}
            {Object.keys(customer.external_ids).length > 0 && (
              <div className="mt-6 pt-6 border-t border-neutral-800">
                <h3 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  External IDs
                </h3>
                <div className="space-y-2">
                  {Object.entries(customer.external_ids).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-neutral-500 capitalize">{key}</span>
                      <span className="text-neutral-300 font-mono text-xs">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Conversations */}
        <div className="lg:col-span-2">
          <div className="bg-[#131210] border border-neutral-800 rounded-xl">
            <div className="px-6 py-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-white">
                Conversation History
              </h2>
              <p className="text-sm text-neutral-500">
                {customer.conversation_count} total conversations
              </p>
            </div>

            {customer.recent_conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-neutral-500">
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">No conversations yet</p>
                <p className="text-sm">
                  Conversations will appear here when this customer contacts you
                </p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800">
                {customer.recent_conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/agent?conversation=${conv.id}`}
                    className="block px-6 py-4 hover:bg-neutral-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded border ${
                              statusColors[conv.status] || statusColors.open
                            }`}
                          >
                            {conv.status}
                          </span>
                          <span className="text-xs text-neutral-500 capitalize flex items-center gap-1">
                            {conv.channel === 'chat' ? (
                              <MessageSquare className="w-3 h-3" />
                            ) : (
                              <Mail className="w-3 h-3" />
                            )}
                            {conv.channel}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {conv.ai_handled ? (
                              <span className="flex items-center gap-1 text-emerald-500">
                                <Bot className="w-3 h-3" />
                                AI handled
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-500">
                                <UserCheck className="w-3 h-3" />
                                Human assisted
                              </span>
                            )}
                          </span>
                        </div>

                        {conv.last_message_preview && (
                          <p className="text-sm text-neutral-400 truncate">
                            {conv.last_message_preview}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                          <span>{conv.message_count} messages</span>
                          <span>{formatRelativeTime(conv.updated_at)}</span>
                        </div>
                      </div>

                      <ExternalLink className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-1" />
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* View All Link */}
            {customer.conversation_count > 10 && (
              <div className="px-6 py-4 border-t border-neutral-800 text-center">
                <Link
                  href={`/agent?customer=${customer.id}`}
                  className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
                >
                  View all {customer.conversation_count} conversations →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-[#1A1915] border border-neutral-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-white mb-2">Delete Customer?</h3>
            <p className="text-neutral-400 mb-6">
              This will permanently delete this customer and all their conversation
              history. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
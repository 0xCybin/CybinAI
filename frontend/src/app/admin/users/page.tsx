'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  MoreVertical,
  User,
  Shield,
  Crown,
  Mail,
  Calendar,
  MessageSquare,
  Check,
  X,
  AlertCircle,
  UserPlus,
  Edit,
  Trash2,
  Key,
} from 'lucide-react';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'agent';
  avatar_url?: string;
  is_active: boolean;
  last_seen_at?: string;
  created_at: string;
  updated_at: string;
  conversation_count: number;
}

interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// =============================================================================
// Helper Components
// =============================================================================

function RoleBadge({ role }: { role: string }) {
  const config = {
    owner: {
      icon: Crown,
      label: 'Owner',
      className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    admin: {
      icon: Shield,
      label: 'Admin',
      className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    agent: {
      icon: User,
      label: 'Agent',
      className: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
    },
  }[role] || {
    icon: User,
    label: role,
    className: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}
    >
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      Inactive
    </span>
  );
}

function UserAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover"
      />
    );
  }

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
      <span className="text-amber-400 font-medium text-sm">{initials}</span>
    </div>
  );
}

// =============================================================================
// Modals
// =============================================================================

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserRole: string;
}

function CreateUserModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserRole,
}: CreateUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/users`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          role,
          password: password || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to create user');
      }

      onSuccess();
      onClose();
      setName('');
      setEmail('');
      setRole('agent');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#1A1915] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus size={20} className="text-amber-500" />
            Add Team Member
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              placeholder="John Smith"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              placeholder="john@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
              disabled={currentUserRole !== 'owner'}
            >
              <option value="agent">Agent</option>
              {currentUserRole === 'owner' && (
                <option value="admin">Admin</option>
              )}
            </select>
            {currentUserRole !== 'owner' && (
              <p className="text-xs text-neutral-500 mt-1">
                Only owners can create admin users
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Password{' '}
              <span className="text-neutral-500">(optional)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              placeholder="Leave blank to auto-generate"
              minLength={8}
            />
            <p className="text-xs text-neutral-500 mt-1">
              If blank, a temporary password will be generated
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <UserPlus size={18} />
              )}
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: User | null;
  currentUserRole: string;
}

function EditUserModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  currentUserRole,
}: EditUserModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole(user.role === 'owner' ? 'admin' : (user.role as 'admin' | 'agent'));
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          role: currentUserRole === 'owner' ? role : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to update user');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) return null;

  const isOwner = user.role === 'owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#1A1915] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Edit size={20} className="text-amber-500" />
            Edit Team Member
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {isOwner && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 text-sm">
              Owner accounts have limited editability
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              required
              disabled={isOwner}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              required
              disabled={isOwner}
            />
          </div>

          {!isOwner && currentUserRole === 'owner' && (
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-1">
                Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
                className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || isOwner}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function UsersPage() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);

  // Clear messages after timeout
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20',
      });
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);

      const res = await fetch(`${API_URL}/api/v1/users?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch users');
      }

      const data: UserListResponse = await res.json();
      setUsers(data.users);
      setTotalPages(data.total_pages);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, fetchUsers]);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle deactivate
  const handleDeactivate = async (user: User) => {
    if (
      !confirm(
        `Are you sure you want to deactivate ${user.name}? They will no longer be able to access the system.`
      )
    ) {
      return;
    }

    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to deactivate user');
      }

      setSuccessMessage(`${user.name} has been deactivated`);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
    setActionMenuUser(null);
  };

  // Handle reactivate
  const handleReactivate = async (user: User) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: true }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to reactivate user');
      }

      setSuccessMessage(`${user.name} has been reactivated`);
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate user');
    }
    setActionMenuUser(null);
  };

  const currentUserRole = currentUser?.role || 'agent';
  const isOwner = currentUserRole === 'owner';

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
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft size={20} className="text-neutral-400" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Team Management</h1>
              <p className="text-sm text-neutral-500">
                {total} team member{total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
          >
            <Plus size={18} />
            Add Member
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="max-w-6xl mx-auto px-6 pt-4">
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-auto hover:text-red-300"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <Check size={16} />
            {successMessage}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-10 pr-4 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
          >
            <option value="">All Roles</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
            <option value="agent">Agents</option>
          </select>
        </div>
      </div>

      {/* User List */}
      <main className="max-w-6xl mx-auto px-6 pb-6">
        <div className="bg-[#131210] border border-neutral-800 rounded-xl overflow-hidden">
          {users.length === 0 ? (
            <div className="p-12 text-center">
              <User size={48} className="mx-auto text-neutral-600 mb-4" />
              <h3 className="text-lg font-medium text-neutral-400 mb-2">
                No team members found
              </h3>
              <p className="text-neutral-500 mb-4">
                {search || roleFilter
                  ? 'Try adjusting your filters'
                  : 'Add your first team member to get started'}
              </p>
              {!search && !roleFilter && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
                >
                  <UserPlus size={18} />
                  Add Member
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 hover:bg-neutral-800/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <UserAvatar name={user.name} avatarUrl={user.avatar_url} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{user.name}</span>
                        <RoleBadge role={user.role} />
                        {!user.is_active && <StatusBadge isActive={false} />}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-500">
                        <span className="flex items-center gap-1 truncate">
                          <Mail size={14} />
                          {user.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare size={14} />
                          {user.conversation_count} assigned
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.last_seen_at && (
                        <span className="text-xs text-neutral-500 hidden sm:block">
                          Last seen{' '}
                          {new Date(user.last_seen_at).toLocaleDateString()}
                        </span>
                      )}

                      {/* Actions dropdown */}
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActionMenuUser(
                              actionMenuUser === user.id ? null : user.id
                            )
                          }
                          className="p-2 rounded-lg hover:bg-neutral-700 transition-colors"
                        >
                          <MoreVertical size={18} className="text-neutral-400" />
                        </button>

                        {actionMenuUser === user.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenuUser(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-[#1A1915] border border-neutral-700 rounded-lg shadow-xl z-20 py-1">
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowEditModal(true);
                                  setActionMenuUser(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-800 flex items-center gap-2"
                              >
                                <Edit size={16} className="text-neutral-400" />
                                Edit Details
                              </button>

                              {isOwner && user.role !== 'owner' && (
                                <>
                                  {user.is_active ? (
                                    <button
                                      onClick={() => handleDeactivate(user)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-800 flex items-center gap-2 text-red-400"
                                    >
                                      <Trash2 size={16} />
                                      Deactivate
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleReactivate(user)}
                                      className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-800 flex items-center gap-2 text-green-400"
                                    >
                                      <Check size={16} />
                                      Reactivate
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setSuccessMessage('Team member added successfully');
          fetchUsers();
        }}
        currentUserRole={currentUserRole}
      />

      <EditUserModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSuccess={() => {
          setSuccessMessage('Team member updated successfully');
          fetchUsers();
        }}
        user={selectedUser}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
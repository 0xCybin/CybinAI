'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import {
  Users,
  Search,
  Plus,
  MessageSquare,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCircle,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Types
interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  conversation_count: number;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerListResponse {
  customers: Customer[];
  total: number;
  limit: number;
  offset: number;
}

// Helper to format relative time
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
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  
  return date.toLocaleDateString();
}

// Customer display name helper
function getCustomerDisplayName(customer: Customer): string {
  if (customer.name) return customer.name;
  if (customer.email) return customer.email;
  if (customer.phone) return customer.phone;
  return 'Anonymous';
}

export default function CustomersPage() {
  const { isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('last_contact');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Auth headers
  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch customers
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const offset = (currentPage - 1) * pageSize;
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: offset.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const res = await fetch(
        `${API_URL}/api/v1/customers/?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      if (!res.ok) {
        throw new Error('Failed to fetch customers');
      }

      const data: CustomerListResponse = await res.json();
      setCustomers(data.customers);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, sortBy, sortOrder, debouncedSearch, getAuthHeaders]);

  // Fetch on mount and when deps change
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    }
  }, [isAuthenticated, fetchCustomers]);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Pagination helpers
  const totalPages = Math.ceil(total / pageSize);
  const canPrevious = currentPage > 1;
  const canNext = currentPage < totalPages;

  // Loading state
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1A1915]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-100 flex items-center gap-3">
            <Users className="w-7 h-7 text-amber-500" />
            Customers
          </h1>
          <p className="text-neutral-400 mt-1">
            {total} {total === 1 ? 'customer' : 'customers'} total
          </p>
        </div>

        <Link
          href="/admin/customers/new"
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </Link>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-[#131210] border border-neutral-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
            <UserCircle className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No customers found</p>
            <p className="text-sm mt-1">
              {debouncedSearch
                ? 'Try a different search term'
                : 'Customers will appear here when they start a chat'}
            </p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-800 text-left">
                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-200 transition-colors"
                    >
                      Customer
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort('email')}
                      className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-200 transition-colors"
                    >
                      Email
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-center">
                    Chats
                  </th>
                  <th className="px-6 py-4">
                    <button
                      onClick={() => handleSort('last_contact')}
                      className="flex items-center gap-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider hover:text-neutral-200 transition-colors"
                    >
                      Last Contact
                      <ArrowUpDown className="w-3.5 h-3.5" />
                    </button>
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-neutral-400 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-neutral-800/50 transition-colors"
                  >
                    {/* Name */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <div className="w-10 h-10 bg-amber-600/20 rounded-full flex items-center justify-center">
                          <span className="text-amber-500 font-semibold text-sm">
                            {(customer.name || customer.email || '?')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium group-hover:text-amber-400 transition-colors">
                            {getCustomerDisplayName(customer)}
                          </p>
                          <p className="text-xs text-neutral-500">
                            Added {new Date(customer.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      {customer.email ? (
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Mail className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm">{customer.email}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-600 text-sm">—</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4">
                      {customer.phone ? (
                        <div className="flex items-center gap-2 text-neutral-300">
                          <Phone className="w-4 h-4 text-neutral-500" />
                          <span className="text-sm">{customer.phone}</span>
                        </div>
                      ) : (
                        <span className="text-neutral-600 text-sm">—</span>
                      )}
                    </td>

                    {/* Conversation Count */}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-700/50 rounded-full text-sm text-neutral-300">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {customer.conversation_count}
                      </span>
                    </td>

                    {/* Last Contact */}
                    <td className="px-6 py-4 text-sm text-neutral-400">
                      {formatRelativeTime(customer.last_contact_at)}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        View
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800">
                <p className="text-sm text-neutral-500">
                  Showing {(currentPage - 1) * pageSize + 1} to{' '}
                  {Math.min(currentPage * pageSize, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={!canPrevious}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-3 py-1 text-sm text-neutral-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={!canNext}
                    className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
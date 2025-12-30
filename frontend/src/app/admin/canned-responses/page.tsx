'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Search,
  MoreVertical,
  MessageSquareText,
  Zap,
  FolderOpen,
  Hash,
  Edit,
  Trash2,
  Copy,
  Check,
  X,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

interface CannedResponse {
  id: string;
  tenant_id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string | null;
  use_count: number;
  created_at: string;
  updated_at: string;
}

interface CannedResponseListResponse {
  responses: CannedResponse[];
  total: number;
}

// =============================================================================
// Helper Components
// =============================================================================

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-700/50 text-neutral-300 border border-neutral-600/50">
      <FolderOpen size={10} />
      {category}
    </span>
  );
}

function ShortcutBadge({ shortcut }: { shortcut: string | null }) {
  if (!shortcut) return null;
  
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
      <Zap size={10} />
      {shortcut}
    </span>
  );
}

function UsageCount({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-neutral-500">
      <Hash size={12} />
      {count} uses
    </span>
  );
}

// =============================================================================
// Create/Edit Modal
// =============================================================================

interface CannedResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingResponse: CannedResponse | null;
  categories: string[];
}

function CannedResponseModal({
  isOpen,
  onClose,
  onSuccess,
  editingResponse,
  categories,
}: CannedResponseModalProps) {
  const [title, setTitle] = useState('');
  const [shortcut, setShortcut] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editingResponse;

  useEffect(() => {
    if (editingResponse) {
      setTitle(editingResponse.title);
      setShortcut(editingResponse.shortcut?.replace('/', '') || '');
      setContent(editingResponse.content);
      setCategory(editingResponse.category || '');
    } else {
      setTitle('');
      setShortcut('');
      setContent('');
      setCategory('');
    }
    setNewCategory('');
    setShowNewCategory(false);
    setError(null);
  }, [editingResponse, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const finalCategory = showNewCategory ? newCategory : category;
    const finalShortcut = shortcut ? `/${shortcut.toLowerCase().replace(/[^a-z0-9_-]/g, '')}` : null;

    try {
      const token = getAccessToken();
      const url = isEditing
        ? `${API_URL}/api/v1/canned-responses/${editingResponse.id}`
        : `${API_URL}/api/v1/canned-responses`;
      
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          shortcut: finalShortcut,
          content,
          category: finalCategory || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to save canned response');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
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
      <div className="relative bg-[#1A1915] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-[#1A1915]">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquareText size={20} className="text-amber-500" />
            {isEditing ? 'Edit Canned Response' : 'New Canned Response'}
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

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              placeholder="e.g., Thank You Response"
              required
            />
          </div>

          {/* Shortcut */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Shortcut
            </label>
            <div className="flex items-center">
              <span className="px-3 py-2 bg-neutral-800 border border-r-0 border-neutral-700 rounded-l-lg text-neutral-400 font-mono">
                /
              </span>
              <input
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                className="flex-1 px-3 py-2 bg-[#131210] border border-neutral-700 rounded-r-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 font-mono"
                placeholder="thanks"
              />
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Type this shortcut in the message box to quickly insert this response
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Category
            </label>
            {!showNewCategory ? (
              <div className="space-y-2">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
                >
                  <option value="">No category</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewCategory(true)}
                  className="text-sm text-amber-500 hover:text-amber-400"
                >
                  + Create new category
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
                  placeholder="e.g., Scheduling"
                />
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCategory(false);
                    setNewCategory('');
                  }}
                  className="text-sm text-neutral-400 hover:text-neutral-300"
                >
                  ← Use existing category
                </button>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Response Content <span className="text-red-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 resize-none"
              placeholder="Thank you for contacting us, {{customer_name}}! Is there anything else I can help you with?"
              required
            />
            <p className="text-xs text-neutral-500 mt-1">
              Use {'{{customer_name}}'}, {'{{agent_name}}'}, {'{{business_name}}'}, etc. for dynamic content
            </p>
          </div>

          {/* Variable Reference */}
          <div className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
            <p className="text-xs font-medium text-neutral-400 mb-2">Available Variables:</p>
            <div className="flex flex-wrap gap-1">
              {[
                'customer_name',
                'customer_first_name',
                'agent_name',
                'business_name',
                'ticket_id',
                'current_date',
                'current_time',
              ].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setContent(content + `{{${v}}}`)}
                  className="px-2 py-0.5 bg-neutral-700 hover:bg-neutral-600 rounded text-xs font-mono text-neutral-300 transition-colors"
                >
                  {`{{${v}}}`}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
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
              disabled={loading || !title || !content}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Check size={18} />
              )}
              {isEditing ? 'Save Changes' : 'Create Response'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// =============================================================================
// Delete Confirmation Modal
// =============================================================================

interface DeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  responseName: string;
}

function DeleteModal({ isOpen, onClose, onConfirm, loading, responseName }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#1A1915] border border-neutral-800 rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="text-red-500" size={24} />
          </div>
          <h3 className="text-lg font-semibold mb-2">Delete Canned Response</h3>
          <p className="text-neutral-400 text-sm mb-6">
            Are you sure you want to delete &quot;{responseName}&quot;? This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function CannedResponsesPage() {
  const { isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();

  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingResponse, setEditingResponse] = useState<CannedResponse | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CannedResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch responses
  const fetchResponses = useCallback(async () => {
    try {
      const token = getAccessToken();
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);

      const res = await fetch(`${API_URL}/api/v1/canned-responses?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) throw new Error('Failed to fetch canned responses');

      const data: CannedResponseListResponse = await res.json();
      setResponses(data.responses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/canned-responses/categories/list`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch {
      // Ignore category fetch errors
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchResponses();
      fetchCategories();
    }
  }, [isAuthenticated, fetchResponses, fetchCategories]);

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchResponses();
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(
        `${API_URL}/api/v1/canned-responses/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error('Search failed');

      const data: CannedResponseListResponse = await res.json();
      setResponses(data.responses);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/canned-responses/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to delete');

      setDeleteTarget(null);
      fetchResponses();
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Copy handler
  const handleCopy = async (response: CannedResponse) => {
    await navigator.clipboard.writeText(response.content);
    setCopiedId(response.id);
    setTimeout(() => setCopiedId(null), 2000);
    setOpenDropdown(null);
  };

  // Filter responses by search query (client-side)
  const filteredResponses = responses.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.content.toLowerCase().includes(q) ||
      r.shortcut?.toLowerCase().includes(q)
    );
  });

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1A1915] flex items-center justify-center">
        <Loader2 className="animate-spin text-amber-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1915]">
      {/* Header */}
      <header className="border-b border-neutral-800 bg-[#131210]">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/admin/settings"
              className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
            >
              <ArrowLeft size={20} className="text-neutral-400" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold">Canned Responses</h1>
              <p className="text-sm text-neutral-500">
                Pre-written responses for quick replies
              </p>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by title, shortcut, or content..."
                className="w-full pl-10 pr-4 py-2 bg-[#1A1915] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            {/* Category Filter */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-[#1A1915] border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Create Button */}
            <button
              onClick={() => {
                setEditingResponse(null);
                setShowModal(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              New Response
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center gap-2">
            <AlertCircle size={18} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : filteredResponses.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquareText size={48} className="mx-auto text-neutral-600 mb-4" />
            <h3 className="text-lg font-medium text-neutral-300 mb-2">
              {searchQuery || filterCategory ? 'No matching responses' : 'No canned responses yet'}
            </h3>
            <p className="text-neutral-500 mb-4">
              {searchQuery || filterCategory
                ? 'Try adjusting your search or filter'
                : 'Create your first canned response to speed up your workflow'}
            </p>
            {!searchQuery && !filterCategory && (
              <button
                onClick={() => {
                  setEditingResponse(null);
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Create First Response
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredResponses.map((response) => (
              <div
                key={response.id}
                className="bg-[#131210] border border-neutral-800 rounded-lg p-4 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium text-white truncate">{response.title}</h3>
                      <ShortcutBadge shortcut={response.shortcut} />
                      <CategoryBadge category={response.category} />
                    </div>

                    {/* Content preview */}
                    <p className="text-sm text-neutral-400 line-clamp-2 mb-2">
                      {response.content}
                    </p>

                    {/* Meta */}
                    <UsageCount count={response.use_count} />
                  </div>

                  {/* Actions dropdown */}
                  <div className="relative">
                    <button
                      onClick={() =>
                        setOpenDropdown(openDropdown === response.id ? null : response.id)
                      }
                      className="p-2 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      <MoreVertical size={18} className="text-neutral-400" />
                    </button>

                    {openDropdown === response.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenDropdown(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-40 bg-[#1A1915] border border-neutral-700 rounded-lg shadow-xl z-20 py-1">
                          <button
                            onClick={() => {
                              setEditingResponse(response);
                              setShowModal(true);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-800 flex items-center gap-2"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleCopy(response)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-800 flex items-center gap-2"
                          >
                            {copiedId === response.id ? (
                              <>
                                <Check size={14} className="text-green-400" />
                                <span className="text-green-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={14} />
                                Copy Content
                              </>
                            )}
                          </button>
                          <hr className="my-1 border-neutral-700" />
                          <button
                            onClick={() => {
                              setDeleteTarget(response);
                              setOpenDropdown(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-800 flex items-center gap-2 text-red-400"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      <CannedResponseModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingResponse(null);
        }}
        onSuccess={() => {
          fetchResponses();
          fetchCategories();
        }}
        editingResponse={editingResponse}
        categories={categories}
      />

      {/* Delete Confirmation */}
      <DeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleting}
        responseName={deleteTarget?.title || ''}
      />
    </div>
  );
}
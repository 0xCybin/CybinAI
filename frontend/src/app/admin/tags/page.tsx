'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Tag,
  X,
  MessageSquare,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

interface TagType {
  id: string;
  name: string;
  color: string;
  description: string | null;
  conversation_count: number;
  created_at: string;
}

// Predefined color palette
const COLOR_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
];

// =============================================================================
// Main Page Component
// =============================================================================

export default function TagsAdminPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // State
  const [tags, setTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<TagType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<TagType | null>(null);

  // =============================================================================
  // API Functions
  // =============================================================================

  const fetchTags = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch tags');

      const data = await res.json();
      setTags(data.tags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const token = getAccessToken();
      const res = await fetch(`${API_URL}/api/v1/tags/${tagId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to delete tag');

      setSuccessMessage('Tag deleted successfully');
      setShowDeleteConfirm(false);
      setTagToDelete(null);
      fetchTags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  // =============================================================================
  // Effects
  // =============================================================================

  useEffect(() => {
    if (isAuthenticated) {
      fetchTags();
    }
  }, [isAuthenticated]);

  // Auto-dismiss messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // =============================================================================
  // Loading State
  // =============================================================================

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1A1915] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // =============================================================================
  // Render
  // =============================================================================

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
              <h1 className="text-xl font-bold">Tags Management</h1>
              <p className="text-sm text-neutral-500">
                {tags.length} tag{tags.length !== 1 ? 's' : ''} configured
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Create Tag
          </button>
        </div>
      </header>

      {/* Messages */}
      {successMessage && (
        <div className="max-w-6xl mx-auto px-6 mt-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-sm">
            {successMessage}
          </div>
        </div>
      )}
      {error && (
        <div className="max-w-6xl mx-auto px-6 mt-4">
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-[#131210] border border-neutral-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
          ) : tags.length === 0 ? (
            <div className="p-12 text-center">
              <Tag className="w-12 h-12 mx-auto mb-4 text-neutral-600" />
              <h3 className="text-lg font-medium text-neutral-300 mb-2">No tags yet</h3>
              <p className="text-neutral-500 mb-4">
                Create tags to organize and categorize your conversations
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
              >
                <Plus size={18} />
                Create Your First Tag
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-800">
              {/* Table Header */}
              <div className="px-6 py-3 bg-neutral-800/30 grid grid-cols-12 gap-4 text-xs font-medium text-neutral-500 uppercase tracking-wider">
                <div className="col-span-4">Tag</div>
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Conversations</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              {/* Tag Rows */}
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="px-6 py-4 grid grid-cols-12 gap-4 items-center hover:bg-neutral-800/20 transition-colors"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span
                      className="px-2.5 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: `${tag.color}20`,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </span>
                  </div>
                  <div className="col-span-4 text-sm text-neutral-400 truncate">
                    {tag.description || '—'}
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-sm text-neutral-400">
                    <MessageSquare size={14} />
                    {tag.conversation_count}
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setSelectedTag(tag);
                        setShowEditModal(true);
                      }}
                      className="p-2 hover:bg-neutral-700 rounded-lg transition-colors"
                      title="Edit tag"
                    >
                      <Pencil size={16} className="text-neutral-400" />
                    </button>
                    <button
                      onClick={() => {
                        setTagToDelete(tag);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete tag"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-[#131210] border border-neutral-800 rounded-xl">
          <h3 className="font-semibold mb-2">Using Tags</h3>
          <p className="text-sm text-neutral-400 mb-4">
            Tags help you organize conversations by topic, issue type, or any other criteria.
            Agents can add tags to conversations from the conversation panel, and you can
            filter the inbox by tag to find related tickets quickly.
          </p>
          <ul className="text-sm text-neutral-400 space-y-1 list-disc list-inside">
            <li>Create descriptive tags like &quot;Billing&quot;, &quot;Technical Support&quot;, &quot;Feature Request&quot;</li>
            <li>Use colors to quickly identify tag categories</li>
            <li>Tags persist on conversations even after they&apos;re resolved</li>
          </ul>
        </div>
      </main>

      {/* Create Modal */}
      <TagModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setSuccessMessage('Tag created successfully');
          fetchTags();
        }}
        mode="create"
      />

      {/* Edit Modal */}
      <TagModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTag(null);
        }}
        onSuccess={() => {
          setSuccessMessage('Tag updated successfully');
          fetchTags();
        }}
        mode="edit"
        tag={selectedTag}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && tagToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1E1C19] border border-neutral-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Delete Tag</h3>
            <p className="text-neutral-400 text-sm mb-4">
              Are you sure you want to delete the tag{' '}
              <span
                className="px-2 py-0.5 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${tagToDelete.color}20`,
                  color: tagToDelete.color,
                }}
              >
                {tagToDelete.name}
              </span>
              ?
            </p>
            {tagToDelete.conversation_count > 0 && (
              <p className="text-amber-400 text-sm mb-4">
                This tag is used on {tagToDelete.conversation_count} conversation
                {tagToDelete.conversation_count !== 1 ? 's' : ''}. They will be untagged.
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTagToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteTag(tagToDelete.id)}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Tag Modal Component (Create/Edit)
// =============================================================================

interface TagModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  tag?: TagType | null;
}

function TagModal({ isOpen, onClose, onSuccess, mode, tag }: TagModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && tag) {
        setName(tag.name);
        setColor(tag.color);
        setDescription(tag.description || '');
      } else {
        setName('');
        setColor('#6B7280');
        setDescription('');
      }
      setError(null);
    }
  }, [isOpen, mode, tag]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      const url =
        mode === 'create'
          ? `${API_URL}/api/v1/tags`
          : `${API_URL}/api/v1/tags/${tag?.id}`;

      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          color,
          description: description.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Failed to ${mode} tag`);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${mode} tag`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1E1C19] border border-neutral-800 rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {mode === 'create' ? 'Create Tag' : 'Edit Tag'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-800 rounded transition-colors"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Billing, Technical Support"
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50"
              maxLength={50}
              required
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1E1C19]'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Preview
            </label>
            <div className="flex items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-full text-sm font-medium"
                style={{
                  backgroundColor: `${color}20`,
                  color: color,
                }}
              >
                {name || 'Tag Name'}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description for this tag"
              rows={2}
              className="w-full px-3 py-2 bg-[#131210] border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 resize-none"
              maxLength={255}
            />
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
              disabled={loading || !name.trim()}
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'create' ? (
                'Create Tag'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
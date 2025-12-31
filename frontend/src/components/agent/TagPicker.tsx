'use client';

import { useState, useEffect, useRef } from 'react';
import { Tag, X, Plus, Loader2, Check } from 'lucide-react';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Types
// =============================================================================

export interface TagType {
  id: string;
  name: string;
  color: string;
  description?: string | null;
}

interface TagPickerProps {
  conversationId: string;
  currentTags: TagType[];
  onTagsChange: (tags: TagType[]) => void;
  compact?: boolean;
}

// =============================================================================
// TagPicker Component
// =============================================================================

export default function TagPicker({
  conversationId,
  currentTags,
  onTagsChange,
  compact = false,
}: TagPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableTags, setAvailableTags] = useState<TagType[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // =============================================================================
  // Fetch Available Tags
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
      setAvailableTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  };

  // =============================================================================
  // Add/Remove Tags
  // =============================================================================

  const addTag = async (tag: TagType) => {
    if (currentTags.some((t) => t.id === tag.id)) return;

    try {
      setAdding(tag.id);
      const token = getAccessToken();
      const res = await fetch(
        `${API_URL}/api/v1/tags/conversations/${conversationId}/tags`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tag_id: tag.id }),
        }
      );

      if (!res.ok) throw new Error('Failed to add tag');

      onTagsChange([...currentTags, tag]);
    } catch (err) {
      console.error('Failed to add tag:', err);
    } finally {
      setAdding(null);
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      setRemoving(tagId);
      const token = getAccessToken();
      const res = await fetch(
        `${API_URL}/api/v1/tags/conversations/${conversationId}/tags/${tagId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to remove tag');

      onTagsChange(currentTags.filter((t) => t.id !== tagId));
    } catch (err) {
      console.error('Failed to remove tag:', err);
    } finally {
      setRemoving(null);
    }
  };

  // =============================================================================
  // Click Outside Handler
  // =============================================================================

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Fetch tags when dropdown opens
  useEffect(() => {
    if (isOpen && availableTags.length === 0) {
      fetchTags();
    }
  }, [isOpen]);

  // =============================================================================
  // Get tags not yet applied
  // =============================================================================

  const unusedTags = availableTags.filter(
    (tag) => !currentTags.some((t) => t.id === tag.id)
  );

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Tags + Add Button */}
      <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'min-h-[32px]'}`}>
        {currentTags.length === 0 && !compact && (
          <span className="text-xs text-neutral-500">No tags</span>
        )}

        {currentTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium group"
            style={{
              backgroundColor: `${tag.color}20`,
              color: tag.color,
            }}
          >
            {tag.name}
            <button
              onClick={() => removeTag(tag.id)}
              disabled={removing === tag.id}
              className="opacity-60 hover:opacity-100 transition-opacity"
            >
              {removing === tag.id ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <X size={10} />
              )}
            </button>
          </span>
        ))}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-300 transition-colors
            ${compact ? 'p-1' : ''}`}
          title="Add tag"
        >
          {compact ? (
            <Tag size={12} />
          ) : (
            <>
              <Plus size={12} />
              Add
            </>
          )}
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-56 bg-[#1E1C19] border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2 border-b border-neutral-800">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
              Select Tag
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <Loader2 size={16} className="animate-spin text-amber-500" />
              </div>
            ) : unusedTags.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500">
                {availableTags.length === 0 ? (
                  <>
                    No tags created yet.
                    <br />
                    <a
                      href="/admin/tags"
                      className="text-amber-500 hover:text-amber-400 underline"
                    >
                      Create tags
                    </a>
                  </>
                ) : (
                  'All tags applied'
                )}
              </div>
            ) : (
              <div className="p-1">
                {unusedTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addTag(tag)}
                    disabled={adding === tag.id}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 transition-colors text-left"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1 text-sm text-neutral-200">{tag.name}</span>
                    {adding === tag.id && (
                      <Loader2 size={14} className="animate-spin text-amber-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Applied Tags Section */}
          {currentTags.length > 0 && (
            <>
              <div className="p-2 border-t border-neutral-800">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Applied
                </span>
              </div>
              <div className="p-1 pb-2">
                {currentTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-400"
                  >
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="flex-1">{tag.name}</span>
                    <Check size={14} className="text-emerald-500" />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Simple Tag Display (read-only)
// =============================================================================

export function TagDisplay({ tags }: { tags: TagType[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag.id}
          className="px-2 py-0.5 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color,
          }}
        >
          {tag.name}
        </span>
      ))}
    </div>
  );
}
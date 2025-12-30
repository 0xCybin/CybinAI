/**
 * Internal Notes Panel Component
 * NEW FILE: frontend/src/components/agent/InternalNotesPanel.tsx
 * 
 * Displays and manages internal notes for agent collaboration.
 * These notes are NEVER visible to customers.
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Trash2, StickyNote, AlertCircle } from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface NoteAuthor {
  id: string;
  name: string;
  avatar_url?: string;
}

interface InternalNote {
  id: string;
  conversation_id: string;
  author: NoteAuthor;
  content: string;
  mentions: string[];
  created_at: string;
}

interface InternalNotesPanelProps {
  conversationId: string;
  currentUserId: string;
  currentUserRole: string;
}

// =============================================================================
// Component
// =============================================================================

export function InternalNotesPanel({
  conversationId,
  currentUserId,
  currentUserRole,
}: InternalNotesPanelProps) {
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Fetch notes on mount and when conversationId changes
  useEffect(() => {
    if (conversationId) {
      fetchNotes();
    }
  }, [conversationId]);

  // Scroll to bottom when notes change
  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

  const fetchNotes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${conversationId}/notes`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }

      const data = await response.json();
      setNotes(data.items || []);
    } catch (err) {
      setError('Failed to load notes');
      console.error('Error fetching notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newNote.trim() || isSending) return;

    try {
      setIsSending(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/api/v1/conversations/${conversationId}/notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: JSON.stringify({
            content: newNote.trim(),
            mentions: [], // TODO: Parse @mentions from content
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to create note');
      }

      const createdNote = await response.json();
      setNotes((prev) => [...prev, createdNote]);
      setNewNote('');
    } catch (err) {
      setError('Failed to add note');
      console.error('Error creating note:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const response = await fetch(
        `${API_URL}/api/v1/conversations/${conversationId}/notes/${noteId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          },
        }
      );

      if (!response.ok && response.status !== 204) {
        throw new Error('Failed to delete note');
      }

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError('Failed to delete note');
      console.error('Error deleting note:', err);
    }
  };

  const canDelete = (note: InternalNote) => {
    return (
      note.author.id === currentUserId ||
      currentUserRole === 'admin' ||
      currentUserRole === 'owner'
    );
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Add a note received via WebSocket
  const addNoteFromWebSocket = (noteData: InternalNote) => {
    setNotes((prev) => {
      // Avoid duplicates
      if (prev.some((n) => n.id === noteData.id)) return prev;
      return [...prev, noteData];
    });
  };

  // Expose method to parent for WebSocket integration
  // Usage: ref.current?.addNoteFromWebSocket(note)
  useEffect(() => {
    // @ts-ignore
    window.__addInternalNote = addNoteFromWebSocket;
    return () => {
      // @ts-ignore
      delete window.__addInternalNote;
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-neutral-400">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-800">
        <StickyNote className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-neutral-200">
          Internal Notes
        </span>
        <span className="text-xs text-neutral-500">
          ({notes.length})
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            ×
          </button>
        </div>
      )}

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {notes.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No internal notes yet</p>
            <p className="text-xs mt-1">
              Add notes for team collaboration
            </p>
          </div>
        ) : (
          notes.map((note) => (
            <div
              key={note.id}
              className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 group"
            >
              {/* Note header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {/* Avatar */}
                  {note.author.avatar_url ? (
                    <img
                      src={note.author.avatar_url}
                      alt={note.author.name}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs font-medium text-white">
                      {getInitials(note.author.name)}
                    </div>
                  )}
                  {/* Author & time */}
                  <div>
                    <span className="text-sm font-medium text-amber-400">
                      {note.author.name}
                    </span>
                    <span className="text-xs text-neutral-500 ml-2">
                      {formatDistanceToNow(new Date(note.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
                
                {/* Delete button */}
                {canDelete(note) && (
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-red-400 transition-all"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Note content */}
              <p className="text-sm text-neutral-200 whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))
        )}
        <div ref={notesEndRef} />
      </div>

      {/* New note input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-800">
        <div className="flex gap-2">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add an internal note..."
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 resize-none focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
            rows={2}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newNote.trim() || isSending}
            className="self-end px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-neutral-700 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          💡 Notes are only visible to your team, never to customers. Press Ctrl+Enter to send.
        </p>
      </form>
    </div>
  );
}

export default InternalNotesPanel;
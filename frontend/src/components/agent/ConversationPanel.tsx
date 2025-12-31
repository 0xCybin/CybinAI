'use client';

import { useState, useRef, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Send, RotateCcw, UserPlus, Loader2, StickyNote, Trash2, AlertCircle } from 'lucide-react';
import { getAccessToken } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============================================
// SVG ICONS - Inline for better control
// ============================================

const SparklesIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
    <path d="M18 14L18.62 17.38L22 18L18.62 18.62L18 22L17.38 18.62L14 18L17.38 17.38L18 14Z" opacity="0.7" />
    <path d="M6 14L6.38 16.62L9 17L6.38 17.38L6 20L5.62 17.38L3 17L5.62 16.62L6 14Z" opacity="0.5" />
  </svg>
);

const UserIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const MessageCircleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

// ============================================
// TYPES
// ============================================

interface Message {
  id: string;
  content: string;
  sender_type: 'customer' | 'ai' | 'agent';
  sender_name: string | null;
  created_at: string;
}

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

interface CannedResponse {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string | null;
}

interface ConversationDetail {
  id: string;
  customer_name: string;
  status: string;
  priority: string;
  ai_handled: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  messages: Message[];
  internal_notes?: InternalNote[];
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

interface ConversationPanelProps {
  conversation: ConversationDetail;
  currentUserId?: string;
  currentUserRole?: string;
  onTakeOver: () => void;
  onReturnToAI: () => void;
  onSendMessage: (content: string) => void;
  onStatusChange: (status: string) => void;
  loading: boolean;
}

type ActiveTab = 'messages' | 'notes';

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================

function MessageBubble({ 
  message, 
  isFromCurrentAgent 
}: { 
  message: Message;
  isFromCurrentAgent: boolean;
}) {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';
  const isAgent = message.sender_type === 'agent';

  const alignRight = isAgent || (isFromCurrentAgent && isAgent);

  const getBubbleStyles = () => {
    if (isCustomer) {
      return 'bg-neutral-800 text-neutral-100 border border-neutral-700/50';
    }
    if (isAI) {
      return 'bg-blue-950/40 text-blue-100 border border-blue-800/30';
    }
    if (isAgent) {
      return 'bg-amber-600/20 text-amber-50 border border-amber-600/30';
    }
    return 'bg-neutral-800 text-neutral-100';
  };

  const getSenderInfo = () => {
    if (isCustomer) {
      return { 
        label: 'Customer', 
        icon: <MessageCircleIcon className="w-3.5 h-3.5" />,
        color: 'text-neutral-400',
        iconBg: 'bg-neutral-700'
      };
    }
    if (isAI) {
      return { 
        label: 'AI Assistant', 
        icon: <SparklesIcon className="w-3.5 h-3.5" />,
        color: 'text-blue-400',
        iconBg: 'bg-blue-900/50'
      };
    }
    if (isAgent) {
      return { 
        label: message.sender_name || 'Agent', 
        icon: <UserIcon className="w-3.5 h-3.5" />,
        color: 'text-amber-400',
        iconBg: 'bg-amber-900/50'
      };
    }
    return { label: 'Unknown', icon: null, color: 'text-neutral-400', iconBg: 'bg-neutral-700' };
  };

  const senderInfo = getSenderInfo();

  return (
    <div className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'} max-w-[75%] ${alignRight ? 'ml-auto' : 'mr-auto'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${senderInfo.iconBg}`}>
          <span className={senderInfo.color}>{senderInfo.icon}</span>
        </div>
        <span className={`text-xs font-medium ${senderInfo.color}`}>
          {senderInfo.label}
        </span>
        <span className="text-xs text-neutral-600">
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>
      
      <div 
        className={`p-3 rounded-2xl ${getBubbleStyles()} ${alignRight ? 'rounded-br-md' : 'rounded-bl-md'}`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

// ============================================
// INTERNAL NOTES PANEL COMPONENT
// ============================================

function InternalNotesPanel({
  conversationId,
  currentUserId,
  currentUserRole,
  initialNotes = [],
}: {
  conversationId: string;
  currentUserId: string;
  currentUserRole: string;
  initialNotes?: InternalNote[];
}) {
  const [notes, setNotes] = useState<InternalNote[]>(initialNotes);
  const [newNote, setNewNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notesEndRef = useRef<HTMLDivElement>(null);

  const getAuthHeaders = () => {
    const token = getAccessToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  useEffect(() => {
    setNotes(initialNotes);
  }, [conversationId]);

  useEffect(() => {
    notesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [notes]);

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
          headers: getAuthHeaders(),
          body: JSON.stringify({
            content: newNote.trim(),
            mentions: [],
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
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      setError('Failed to delete note');
      console.error('Error deleting note:', err);
    }
  };

  const canDelete = (note: InternalNote) => {
    return note.author.id === currentUserId || 
           currentUserRole === 'admin' || 
           currentUserRole === 'owner';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-300 hover:text-red-200">×</button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-500">
            <StickyNote className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No internal notes yet</p>
            <p className="text-xs mt-1">Add notes visible only to your team</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="group bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
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
                  <div>
                    <span className="text-sm font-medium text-amber-400">
                      {note.author.name}
                    </span>
                    <span className="text-xs text-neutral-500 ml-2">
                      {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
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

              <p className="text-sm text-neutral-200 whitespace-pre-wrap">
                {note.content}
              </p>
            </div>
          ))
        )}
        <div ref={notesEndRef} />
      </div>

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
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">
          💡 Notes are only visible to your team. Press Ctrl+Enter to send.
        </p>
      </form>
    </div>
  );
}

// ============================================
// CANNED RESPONSE PICKER COMPONENT
// ============================================

function CannedResponsePicker({
  responses,
  loading,
  searchTerm,
  onSelect,
  onClose,
  selectedIndex,
}: {
  responses: CannedResponse[];
  loading: boolean;
  searchTerm: string;
  onSelect: (response: CannedResponse) => void;
  onClose: () => void;
  selectedIndex: number;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0 && selectedIndex < responses.length) {
      const items = listRef.current.querySelectorAll('[data-canned-item]');
      items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, responses.length]);

  if (loading) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E1C19] border border-neutral-700 rounded-lg shadow-xl p-4">
        <div className="flex items-center justify-center gap-2 text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E1C19] border border-neutral-700 rounded-lg shadow-xl p-4">
        <p className="text-sm text-neutral-400 text-center">
          {searchTerm ? `No responses matching "/${searchTerm}"` : 'No canned responses available'}
        </p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1E1C19] border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
      <div className="p-2 border-b border-neutral-800 flex items-center justify-between">
        <span className="text-xs text-neutral-500">
          Type to filter • ↑↓ to navigate • Enter to select • Esc to close
        </span>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 text-xs">
          ✕
        </button>
      </div>
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {responses.map((response, index) => (
          <button
            key={response.id}
            data-canned-item
            onClick={() => onSelect(response)}
            className={`w-full text-left px-3 py-2 transition-colors ${
              index === selectedIndex
                ? 'bg-amber-600/20 border-l-2 border-amber-500'
                : 'hover:bg-neutral-800 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-neutral-200">{response.title}</span>
              {response.shortcut && (
                <span className="text-xs px-1.5 py-0.5 bg-neutral-700 rounded text-amber-400 font-mono">
                  {response.shortcut}
                </span>
              )}
              {response.category && (
                <span className="text-xs px-1.5 py-0.5 bg-neutral-800 rounded text-neutral-400">
                  {response.category}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 truncate">{response.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ConversationPanel({
  conversation,
  currentUserId,
  currentUserRole = 'agent',
  onTakeOver,
  onReturnToAI,
  onSendMessage,
  onStatusChange,
  loading,
}: ConversationPanelProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('messages');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Canned response state
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearchTerm, setCannedSearchTerm] = useState('');
  const [selectedCannedIndex, setSelectedCannedIndex] = useState(0);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [cannedLoading, setCannedLoading] = useState(false);

  const isAssignedToMe = conversation.assigned_to === currentUserId;
  const isAIHandled = conversation.ai_handled;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  useEffect(() => {
    setActiveTab('messages');
  }, [conversation.id]);

  // Reset canned picker when message clears or conversation changes
  useEffect(() => {
    setShowCannedPicker(false);
    setCannedSearchTerm('');
    setSelectedCannedIndex(0);
    setCannedResponses([]);
  }, [conversation.id]);

  // Fetch canned responses when picker is shown
  useEffect(() => {
    if (!showCannedPicker) {
      return;
    }

    const fetchResponses = async () => {
      try {
        setCannedLoading(true);
        // Try both token keys - cybinai_access_token is the one that works
        const token = localStorage.getItem('cybinai_access_token') || getAccessToken();
        // Search with the shortcut prefix for better matching
        const searchQuery = cannedSearchTerm ? `/${cannedSearchTerm}` : '';
        const url = searchQuery
          ? `${API_URL}/api/v1/canned-responses/search?q=${encodeURIComponent(searchQuery)}`
          : `${API_URL}/api/v1/canned-responses?limit=10`;
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          // API returns 'responses' not 'items'
          setCannedResponses(data.responses || data.items || []);
          setSelectedCannedIndex(0);
        }
      } catch (err) {
        console.error('Failed to fetch canned responses:', err);
        setCannedResponses([]);
      } finally {
        setCannedLoading(false);
      }
    };

    fetchResponses();
  }, [showCannedPicker, cannedSearchTerm]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    // Don't send if it's just a shortcut
    if (message.match(/^\/\w*$/)) {
      return;
    }
    
    setSending(true);
    try {
      await onSendMessage(message);
      setMessage('');
      setShowCannedPicker(false);
    } finally {
      setSending(false);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);

    // Detect /shortcut pattern at end of message
    const shortcutMatch = value.match(/\/(\w*)$/);
    if (shortcutMatch) {
      setShowCannedPicker(true);
      setCannedSearchTerm(shortcutMatch[1] || '');
      setSelectedCannedIndex(0);
    } else {
      setShowCannedPicker(false);
      setCannedSearchTerm('');
    }
  };

  const handleSelectCannedResponse = (response: CannedResponse) => {
    // Replace the /shortcut with the canned response content
    const newMessage = message.replace(/\/\w*$/, response.content);
    setMessage(newMessage);
    setShowCannedPicker(false);
    setCannedSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle canned response picker navigation
    if (showCannedPicker && cannedResponses.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedCannedIndex((prev) => Math.min(prev + 1, cannedResponses.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedCannedIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowCannedPicker(false);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        // Select the currently highlighted response
        const selectedResponse = cannedResponses[selectedCannedIndex];
        if (selectedResponse) {
          handleSelectCannedResponse(selectedResponse);
        }
      }
      return;
    }

    // Close picker on Escape even if no responses
    if (showCannedPicker && e.key === 'Escape') {
      e.preventDefault();
      setShowCannedPicker(false);
      return;
    }

    // Normal send on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getPriorityBadge = () => {
    const priority = conversation.priority;
    const baseClasses = "px-2 py-0.5 rounded text-xs font-medium";
    switch (priority) {
      case 'urgent':
        return <span className={`${baseClasses} bg-red-500/20 text-red-400`}>Urgent</span>;
      case 'high':
        return <span className={`${baseClasses} bg-orange-500/20 text-orange-400`}>High</span>;
      case 'normal':
        return <span className={`${baseClasses} bg-neutral-500/20 text-neutral-400`}>Normal</span>;
      case 'low':
        return <span className={`${baseClasses} bg-neutral-600/20 text-neutral-500`}>Low</span>;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1A1915]">
      {/* Header */}
      <div className="bg-[#1E1C19] border-b border-neutral-800 p-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center">
            <span className="text-sm font-medium text-neutral-300">
              {conversation.customer_name?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-neutral-100">{conversation.customer_name}</h2>
              {getPriorityBadge()}
              {isAIHandled && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  AI Handling
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-neutral-500">
              {conversation.customer.email && <span>{conversation.customer.email}</span>}
              {conversation.customer.phone && (
                <>
                  <span>•</span>
                  <span>{conversation.customer.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={conversation.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-sm bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none cursor-pointer"
          >
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {isAIHandled || !isAssignedToMe ? (
            <button
              onClick={onTakeOver}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Take Over
            </button>
          ) : (
            <button
              onClick={onReturnToAI}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Return to AI
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-800 bg-[#1E1C19]">
        <button
          onClick={() => setActiveTab('messages')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'messages'
              ? 'text-amber-500 border-b-2 border-amber-500 -mb-px'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Messages
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'notes'
              ? 'text-amber-500 border-b-2 border-amber-500 -mb-px'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <StickyNote className="w-4 h-4" />
          Notes
        </button>
      </div>

      {/* Messages Tab */}
      <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'messages' ? '' : 'hidden'}`}>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : (
            <>
              {conversation.messages.map((msg) => (
                <MessageBubble 
                  key={msg.id} 
                  message={msg}
                  isFromCurrentAgent={msg.sender_type === 'agent' && msg.sender_name === conversation.assigned_to_name}
                />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {isAssignedToMe && !isAIHandled && (
          <div className="bg-[#1E1C19] border-t border-neutral-800 p-4 flex-shrink-0 relative">
            {/* Canned Response Picker */}
            {showCannedPicker && (
              <CannedResponsePicker
                responses={cannedResponses}
                loading={cannedLoading}
                searchTerm={cannedSearchTerm}
                onSelect={handleSelectCannedResponse}
                onClose={() => setShowCannedPicker(false)}
                selectedIndex={selectedCannedIndex}
              />
            )}
            
            <div className="flex items-end gap-3">
              <textarea
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (use /shortcut for quick replies)"
                rows={2}
                className="flex-1 px-4 py-3 bg-[#131210] border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending || /^\/\w*$/.test(message)}
                className="p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        )}

        {isAIHandled && (
          <div className="bg-blue-950/30 border-t border-blue-800/30 p-4 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
              <SparklesIcon className="w-4 h-4" />
              <span>This conversation is being handled by AI. Click <strong>Take Over</strong> to respond manually.</span>
            </div>
          </div>
        )}

        {!isAIHandled && !isAssignedToMe && (
          <div className="bg-neutral-800/50 border-t border-neutral-700 p-4 flex-shrink-0">
            <p className="text-sm text-neutral-400 text-center">
              This conversation is assigned to another agent. Click <strong>Take Over</strong> to claim it.
            </p>
          </div>
        )}
      </div>

      {/* Notes Tab */}
      <div className={`flex-1 overflow-hidden ${activeTab === 'notes' ? '' : 'hidden'}`}>
        <InternalNotesPanel
          conversationId={conversation.id}
          currentUserId={currentUserId || ''}
          currentUserRole={currentUserRole}
          initialNotes={conversation.internal_notes || []}
        />
      </div>
    </div>
  );
}

export default ConversationPanel;
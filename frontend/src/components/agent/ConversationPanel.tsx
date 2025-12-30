'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Send, RotateCcw, UserPlus, Loader2, Zap, X } from 'lucide-react';
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

interface ConversationDetail {
  id: string;
  customer_name: string;
  status: string;
  priority: string;
  ai_handled: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  messages: Message[];
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
  onTakeOver: () => void;
  onReturnToAI: () => void;
  onSendMessage: (message: string) => Promise<void>;
  onStatusChange: (status: string) => void;
  loading: boolean;
}

interface CannedResponse {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string | null;
}

// ============================================
// MESSAGE BUBBLE COMPONENT
// ============================================

interface MessageBubbleProps {
  message: Message;
  isFromCurrentAgent: boolean;
}

function MessageBubble({ message, isFromCurrentAgent }: MessageBubbleProps) {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';
  const isAgent = message.sender_type === 'agent';
  
  const alignRight = isCustomer;
  
  const getSenderInfo = () => {
    if (isCustomer) {
      return {
        label: 'Customer',
        icon: <MessageCircleIcon className="w-3 h-3" />,
        color: 'text-amber-400',
        iconBg: 'bg-amber-500/20',
      };
    }
    if (isAI) {
      return {
        label: 'AI Assistant',
        icon: <SparklesIcon className="w-3 h-3" />,
        color: 'text-blue-400',
        iconBg: 'bg-blue-500/20',
      };
    }
    return {
      label: message.sender_name || 'Agent',
      icon: <UserIcon className="w-3 h-3" />,
      color: 'text-amber-400',
      iconBg: 'bg-amber-500/20',
    };
  };

  const getBubbleStyles = () => {
    if (isCustomer) {
      return 'bg-gradient-to-br from-amber-600 to-amber-700 text-white';
    }
    if (isAI) {
      return 'bg-blue-500/15 border border-blue-500/20 text-neutral-100';
    }
    return 'bg-amber-500/15 border border-amber-500/20 text-neutral-100';
  };

  const senderInfo = getSenderInfo();

  return (
    <div className={`flex flex-col ${alignRight ? 'items-end' : 'items-start'} mb-4`}>
      <div className={`flex items-center gap-2 mb-1 ${alignRight ? 'flex-row-reverse' : 'flex-row'}`}>
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
        className={`p-3 rounded-2xl max-w-[80%] ${getBubbleStyles()} ${alignRight ? 'rounded-br-md' : 'rounded-bl-md'}`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

// ============================================
// CANNED RESPONSE PICKER COMPONENT
// ============================================

interface CannedResponsePickerProps {
  searchTerm: string;
  onSelect: (response: CannedResponse) => void;
  onClose: () => void;
  conversationId: string;
}

function CannedResponsePicker({ searchTerm, onSelect, onClose, conversationId }: CannedResponsePickerProps) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch canned responses
  useEffect(() => {
    const fetchResponses = async () => {
      try {
        const token = getAccessToken();
        const url = searchTerm 
          ? `${API_URL}/api/v1/canned-responses/search?q=${encodeURIComponent(searchTerm)}`
          : `${API_URL}/api/v1/canned-responses`;
        
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          setResponses(data.responses || []);
        }
      } catch (err) {
        console.error('Failed to fetch canned responses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, [searchTerm]);

  // Reset selection when responses change
  useEffect(() => {
    setSelectedIndex(0);
  }, [responses]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, responses.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && responses.length > 0) {
        e.preventDefault();
        onSelect(responses[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [responses, selectedIndex, onSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedEl = listRef.current?.children[selectedIndex] as HTMLElement;
    selectedEl?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (loading) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1A1915] border border-neutral-700 rounded-lg shadow-xl p-4">
        <div className="flex items-center justify-center gap-2 text-neutral-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading responses...</span>
        </div>
      </div>
    );
  }

  if (responses.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1A1915] border border-neutral-700 rounded-lg shadow-xl p-4">
        <p className="text-sm text-neutral-500 text-center">
          No canned responses found for &quot;{searchTerm}&quot;
        </p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1A1915] border border-neutral-700 rounded-lg shadow-xl overflow-hidden z-50">
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-800/50">
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Zap size={12} className="text-amber-500" />
          <span>Canned Responses</span>
          <span className="text-neutral-600">• ↑↓ to navigate • Enter to select • Esc to close</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-neutral-700 rounded">
          <X size={14} className="text-neutral-500" />
        </button>
      </div>
      
      <div ref={listRef} className="max-h-64 overflow-y-auto">
        {responses.map((response, index) => (
          <button
            key={response.id}
            onClick={() => onSelect(response)}
            className={`w-full px-3 py-2 text-left transition-colors ${
              index === selectedIndex 
                ? 'bg-amber-500/20 border-l-2 border-amber-500' 
                : 'hover:bg-neutral-800 border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-white">{response.title}</span>
              {response.shortcut && (
                <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-xs font-mono rounded">
                  {response.shortcut}
                </span>
              )}
              {response.category && (
                <span className="px-1.5 py-0.5 bg-neutral-700 text-neutral-400 text-xs rounded">
                  {response.category}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 line-clamp-1">{response.content}</p>
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
  onTakeOver,
  onReturnToAI,
  onSendMessage,
  onStatusChange,
  loading,
}: ConversationPanelProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedSearchTerm, setCannedSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAssignedToMe = conversation.assigned_to === currentUserId;
  const isAIHandled = conversation.ai_handled;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  // Detect shortcut trigger (typing /something)
  useEffect(() => {
    const shortcutMatch = message.match(/\/(\w*)$/);
    if (shortcutMatch) {
      setShowCannedPicker(true);
      setCannedSearchTerm(shortcutMatch[1] || '');
    } else {
      setShowCannedPicker(false);
      setCannedSearchTerm('');
    }
  }, [message]);

  // Handle selecting a canned response
  const handleSelectCannedResponse = useCallback(async (response: CannedResponse) => {
    try {
      // Call the expand endpoint to get variable-substituted content
      const token = getAccessToken();
      const res = await fetch(
        `${API_URL}/api/v1/canned-responses/${response.id}/expand?conversation_id=${conversation.id}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      let expandedContent = response.content;
      if (res.ok) {
        const data = await res.json();
        expandedContent = data.expanded;
      }

      // Replace the shortcut trigger with the expanded content
      const newMessage = message.replace(/\/\w*$/, expandedContent);
      setMessage(newMessage);
      setShowCannedPicker(false);
      
      // Focus back on textarea
      textareaRef.current?.focus();
    } catch (err) {
      console.error('Failed to expand canned response:', err);
      // Fallback to raw content
      const newMessage = message.replace(/\/\w*$/, response.content);
      setMessage(newMessage);
      setShowCannedPicker(false);
    }
  }, [message, conversation.id]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    setSending(true);
    try {
      await onSendMessage(message);
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't send if canned picker is open (let it handle Enter)
    if (showCannedPicker) {
      return;
    }
    
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
            <h2 className="font-medium text-white">{conversation.customer_name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {getPriorityBadge()}
              {isAIHandled && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 flex items-center gap-1">
                  <SparklesIcon className="w-3 h-3" />
                  AI Handling
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAIHandled ? (
            <button
              onClick={onTakeOver}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Take Over
            </button>
          ) : isAssignedToMe ? (
            <button
              onClick={onReturnToAI}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Return to AI
            </button>
          ) : (
            <button
              onClick={onTakeOver}
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Take Over
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
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

      {/* Input - Only show if assigned and not AI handled */}
      {isAssignedToMe && !isAIHandled && (
        <div className="bg-[#1E1C19] border-t border-neutral-800 p-4 flex-shrink-0">
          <div className="relative">
            {/* Canned Response Picker */}
            {showCannedPicker && (
              <CannedResponsePicker
                searchTerm={cannedSearchTerm}
                onSelect={handleSelectCannedResponse}
                onClose={() => setShowCannedPicker(false)}
                conversationId={conversation.id}
              />
            )}
            
            <div className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message... (type / for quick responses)"
                  rows={2}
                  className="w-full px-4 py-3 bg-[#131210] border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
                />
                {!showCannedPicker && (
                  <div className="absolute right-3 bottom-3">
                    <button
                      onClick={() => {
                        setMessage(message + '/');
                        textareaRef.current?.focus();
                      }}
                      className="p-1.5 text-neutral-500 hover:text-amber-500 hover:bg-amber-500/10 rounded transition-colors"
                      title="Insert canned response"
                    >
                      <Zap size={16} />
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
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
          
          {/* Helper text */}
          <p className="text-xs text-neutral-600 mt-2">
            Press <kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-400">Enter</kbd> to send • <kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-400">Shift+Enter</kbd> for new line • Type <kbd className="px-1 py-0.5 bg-neutral-800 rounded text-neutral-400">/</kbd> for quick responses
          </p>
        </div>
      )}

      {/* AI Handled Notice */}
      {isAIHandled && (
        <div className="bg-blue-950/30 border-t border-blue-800/30 p-4 flex-shrink-0">
          <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
            <SparklesIcon className="w-4 h-4" />
            <span>This conversation is being handled by AI. Click <strong>Take Over</strong> to respond manually.</span>
          </div>
        </div>
      )}

      {/* Not Assigned Notice */}
      {!isAIHandled && !isAssignedToMe && (
        <div className="bg-neutral-800/50 border-t border-neutral-700 p-4 flex-shrink-0">
          <p className="text-sm text-neutral-400 text-center">
            This conversation is assigned to another agent. Click <strong>Take Over</strong> to claim it.
          </p>
        </div>
      )}
    </div>
  );
}

export default ConversationPanel;
'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Send, RotateCcw, UserPlus, Loader2 } from 'lucide-react';

// ============================================
// SVG ICONS - Inline for better control
// ============================================

// Sparkles icon for AI - clean and professional
const SparklesIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
    <path d="M18 14L18.62 17.38L22 18L18.62 18.62L18 22L17.38 18.62L14 18L17.38 17.38L18 14Z" opacity="0.7" />
    <path d="M6 14L6.38 16.62L9 17L6.38 17.38L6 20L5.62 17.38L3 17L5.62 16.62L6 14Z" opacity="0.5" />
  </svg>
);

// User icon
const UserIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Message circle icon for customer
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
  onSendMessage: (content: string) => void;
  onStatusChange: (status: string) => void;
  loading: boolean;
}

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

  // Determine alignment
  // From agent's perspective: Customer on left, Agent on right
  const alignRight = isAgent || (isFromCurrentAgent && isAgent);
  const alignLeft = isCustomer || isAI;

  // Determine styling based on sender type
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

  // Get sender info
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
      {/* Sender label with icon */}
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
      
      {/* Message bubble */}
      <div 
        className={`p-3 rounded-2xl ${getBubbleStyles()} ${alignRight ? 'rounded-br-md' : 'rounded-bl-md'}`}
      >
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAssignedToMe = conversation.assigned_to === currentUserId;
  const isAIHandled = conversation.ai_handled;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Priority badge colors
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
          {/* Customer avatar */}
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
          {/* Status Dropdown */}
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

          {/* Take Over / Return Button */}
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

      {/* Messages */}
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

      {/* Input - Only show if assigned and not AI handled */}
      {isAssignedToMe && !isAIHandled && (
        <div className="bg-[#1E1C19] border-t border-neutral-800 p-4 flex-shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={2}
              className="flex-1 px-4 py-3 bg-[#131210] border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none transition-all"
            />
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
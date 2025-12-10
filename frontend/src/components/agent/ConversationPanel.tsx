'use client';

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Bot, User, Send, RotateCcw, UserPlus, Loader2 } from 'lucide-react';

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#1E1C19] border-b border-neutral-800 p-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="font-semibold text-neutral-100">{conversation.customer_name}</h2>
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            {conversation.customer.email && <span>{conversation.customer.email}</span>}
            {conversation.customer.phone && <span>• {conversation.customer.phone}</span>}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Status Dropdown */}
          <select
            value={conversation.status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="text-sm bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-neutral-200 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
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
              className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Take Over
            </button>
          ) : (
            <button
              onClick={onReturnToAI}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-sm font-medium rounded-lg transition-colors"
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
          conversation.messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isAssignedToMe && !isAIHandled && (
        <div className="bg-[#1E1C19] border-t border-neutral-800 p-4 flex-shrink-0">
          <div className="flex items-end gap-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={2}
              className="flex-1 px-4 py-3 bg-[#131210] border border-neutral-700 rounded-xl text-neutral-100 placeholder-neutral-500 resize-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 outline-none"
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
        <div className="bg-blue-500/10 border-t border-blue-500/20 p-4 flex-shrink-0">
          <p className="text-sm text-blue-400 text-center">
            This conversation is being handled by AI. Click &quot;Take Over&quot; to respond manually.
          </p>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';
  const isAgent = message.sender_type === 'agent';

  const bubbleStyles = isCustomer
    ? 'bg-neutral-800 text-neutral-100'
    : isAI
    ? 'bg-blue-600/20 text-blue-100 border border-blue-500/20'
    : 'bg-amber-600/20 text-amber-100 border border-amber-500/20';

  const alignStyles = isCustomer ? 'mr-auto' : 'ml-auto';

  return (
    <div className={`max-w-[70%] ${alignStyles}`}>
      <div className="flex items-center gap-2 mb-1">
        {isAI && <Bot className="w-4 h-4 text-blue-400" />}
        {isAgent && <User className="w-4 h-4 text-amber-400" />}
        <span className="text-xs text-neutral-500">
          {isCustomer ? 'Customer' : isAI ? 'AI Assistant' : message.sender_name || 'Agent'}
        </span>
        <span className="text-xs text-neutral-600">
          {format(new Date(message.created_at), 'h:mm a')}
        </span>
      </div>
      <div className={`p-3 rounded-xl ${bubbleStyles}`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
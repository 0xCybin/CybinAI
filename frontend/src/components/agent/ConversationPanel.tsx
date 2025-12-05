'use client';

import { useState, useRef, useEffect } from 'react';
import { ConversationDetail, ConversationStatus, AgentMessageResponse } from '@/lib/api';

interface ConversationPanelProps {
  conversation: ConversationDetail;
  currentUserId: string;
  loading: boolean;
  onTakeOver: () => Promise<void>;
  onReturnToAI: () => Promise<void>;
  onStatusChange: (status: ConversationStatus) => Promise<void>;
  onSendMessage: (content: string) => Promise<void>;
}

export function ConversationPanel({
  conversation,
  currentUserId,
  loading,
  onTakeOver,
  onReturnToAI,
  onStatusChange,
  onSendMessage,
}: ConversationPanelProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isAssignedToMe = conversation.assigned_to === currentUserId;
  const isAiHandled = conversation.ai_handled;
  const customerName = conversation.customer?.name || conversation.customer?.email || 'Customer';

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation.messages]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await onSendMessage(message.trim());
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

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">{customerName}</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              {conversation.customer?.email && <span>{conversation.customer.email}</span>}
              {conversation.customer?.phone && (
                <>
                  <span>•</span>
                  <span>{conversation.customer.phone}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Take Over / Return to AI */}
            {isAiHandled ? (
              <button
                onClick={onTakeOver}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Take Over
              </button>
            ) : isAssignedToMe ? (
              <button
                onClick={onReturnToAI}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
              >
                Return to AI
              </button>
            ) : null}
            
            {/* Status Dropdown */}
            <select
              value={conversation.status}
              onChange={(e) => onStatusChange(e.target.value as ConversationStatus)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
        
        {/* Assignment Info */}
        <div className="mt-2 flex items-center space-x-4 text-xs">
          {isAiHandled ? (
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
              🤖 AI Handling
              {conversation.ai_confidence && (
                <span className="ml-1 text-purple-500">
                  ({Math.round(conversation.ai_confidence * 100)}% confident)
                </span>
              )}
            </span>
          ) : (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
              👤 {conversation.assigned_agent_name || 'Agent'}
            </span>
          )}
          <span className="text-gray-400">
            {conversation.messages.length} messages
          </span>
          <span className="text-gray-400">
            Channel: {conversation.channel}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {conversation.messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Composer */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-white">
        {conversation.status === 'closed' || conversation.status === 'resolved' ? (
          <div className="text-center text-gray-500 text-sm py-2">
            This conversation is {conversation.status}. 
            <button 
              onClick={() => onStatusChange('open')} 
              className="ml-2 text-blue-600 hover:underline"
            >
              Reopen
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isAiHandled ? "Take over to reply..." : "Type your message... (Enter to send)"}
              disabled={isAiHandled || sending}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={2}
            />
            <button
              onClick={handleSend}
              disabled={!message.trim() || sending || isAiHandled}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <span className="animate-pulse">...</span>
              ) : (
                <SendIcon className="w-5 h-5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AgentMessageResponse }) {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';
  const isAgent = message.sender_type === 'agent';
  const isSystem = message.sender_type === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-500 bg-gray-200 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  const bgColor = isCustomer 
    ? 'bg-white border border-gray-200' 
    : isAI 
      ? 'bg-purple-50 border border-purple-100' 
      : 'bg-blue-600 text-white';
  
  const alignment = isCustomer ? 'justify-start' : 'justify-end';
  const label = isCustomer ? 'Customer' : isAI ? '🤖 AI' : '👤 Agent';
  const labelColor = isCustomer ? 'text-gray-500' : isAI ? 'text-purple-600' : 'text-blue-600';

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], { 
    hour: 'numeric', 
    minute: '2-digit' 
  });

  return (
    <div className={`flex ${alignment}`}>
      <div className={`max-w-[70%] ${isCustomer ? '' : 'text-right'}`}>
        <div className={`text-xs ${labelColor} mb-1`}>
          {label} • {formattedTime}
        </div>
        <div className={`px-4 py-2 rounded-lg ${bgColor} shadow-sm`}>
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

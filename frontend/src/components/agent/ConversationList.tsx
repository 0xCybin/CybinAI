'use client';

import { formatDistanceToNow } from 'date-fns';
import { Bot, User, Loader2 } from 'lucide-react';

export interface Conversation {
  id: string;
  customer_name: string;
  customer_email: string | null;
  status: string;
  priority: string;
  channel: string;
  ai_handled: boolean;
  assigned_to: string | null;
  assigned_to_name: string | null;
  message_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  loading: boolean;
}

export function ConversationList({ conversations, selectedId, onSelect, loading }: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500 p-4">
        <div className="text-center">
          <div className="text-3xl mb-2 opacity-50">📭</div>
          <p className="text-sm">No conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv)}
          className={`w-full p-4 border-b border-neutral-800 text-left transition-colors ${
            selectedId === conv.id
              ? 'bg-amber-600/10 border-l-2 border-l-amber-500'
              : 'hover:bg-neutral-800/50'
          }`}
        >
          <div className="flex items-start justify-between mb-1">
            <span className={`font-medium text-sm ${
              selectedId === conv.id ? 'text-amber-400' : 'text-neutral-200'
            }`}>
              {conv.customer_name}
            </span>
            <span className="text-xs text-neutral-500">
              {conv.last_message_at 
                ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true })
                : formatDistanceToNow(new Date(conv.created_at), { addSuffix: true })
              }
            </span>
          </div>
          
          <p className="text-sm text-neutral-400 truncate mb-2">
            {conv.last_message_preview || 'No messages yet'}
          </p>
          
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            <StatusBadge status={conv.status} />
            
            {/* Priority Badge */}
            {conv.priority !== 'normal' && (
              <PriorityBadge priority={conv.priority} />
            )}
            
            {/* AI/Human indicator */}
            {conv.ai_handled ? (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <Bot className="w-3 h-3" />
                AI
              </span>
            ) : conv.assigned_to_name ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <User className="w-3 h-3" />
                {conv.assigned_to_name.split(' ')[0]}
              </span>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    resolved: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
    closed: 'bg-neutral-600/10 text-neutral-500 border-neutral-600/20',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[status] || styles.open}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    low: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20',
    high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    urgent: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${styles[priority] || ''}`}>
      {priority}
    </span>
  );
}
'use client';

import { ConversationListItem } from '@/lib/api';

interface ConversationListProps {
  conversations: ConversationListItem[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading: boolean;
}

export function ConversationList({ conversations, selectedId, onSelect, loading }: ConversationListProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 p-4">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-sm">No conversations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <ConversationListItemRow
          key={conv.id}
          conversation={conv}
          isSelected={conv.id === selectedId}
          onClick={() => onSelect(conv.id)}
        />
      ))}
    </div>
  );
}

interface ConversationListItemRowProps {
  conversation: ConversationListItem;
  isSelected: boolean;
  onClick: () => void;
}

function ConversationListItemRow({ conversation, isSelected, onClick }: ConversationListItemRowProps) {
  const customerName = conversation.customer?.name || conversation.customer?.email || 'Anonymous';
  const timeAgo = conversation.last_message_at 
    ? formatTimeAgo(new Date(conversation.last_message_at))
    : formatTimeAgo(new Date(conversation.created_at));

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-2 border-l-blue-600' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-gray-900 truncate max-w-[140px]">
            {customerName}
          </span>
          {conversation.ai_handled && (
            <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
              AI
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{timeAgo}</span>
      </div>
      
      <p className="text-sm text-gray-600 truncate mb-2">
        {conversation.last_message_preview || 'No messages yet'}
      </p>
      
      <div className="flex items-center space-x-2">
        <StatusBadge status={conversation.status} />
        <PriorityBadge priority={conversation.priority} />
        <ChannelBadge channel={conversation.channel} />
      </div>
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    resolved: 'bg-gray-100 text-gray-600',
    closed: 'bg-gray-100 text-gray-500',
  };
  
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${styles[status] || styles.open}`}>
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'normal' || priority === 'low') return null;
  
  const styles: Record<string, string> = {
    high: 'bg-orange-100 text-orange-700',
    urgent: 'bg-red-100 text-red-700',
  };
  
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded capitalize ${styles[priority]}`}>
      {priority}
    </span>
  );
}

function ChannelBadge({ channel }: { channel: string }) {
  const icons: Record<string, string> = {
    chat: '💬',
    email: '📧',
    sms: '📱',
  };
  
  return (
    <span className="text-xs text-gray-400">
      {icons[channel] || '💬'} {channel}
    </span>
  );
}

// Simple time ago formatter (no external dependency needed)
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { ConversationList, Conversation } from '@/components/agent/ConversationList';
import { ConversationPanel } from '@/components/agent/ConversationPanel';
import { useSocket } from '@/hooks/useSocket';
import { Loader2, Wifi, WifiOff } from 'lucide-react';

const API_URL = 'http://localhost:8000';

interface Message {
  id: string;
  content: string;
  sender_type: 'customer' | 'ai' | 'agent';
  sender_name: string | null;
  created_at: string;
}

interface ConversationDetail extends Conversation {
  messages: Message[];
  customer: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export default function AgentInboxPage() {
  const { user, tenant, logout, isLoading: authLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();
  
  const [activeView, setActiveView] = useState<'all' | 'unassigned' | 'mine' | 'resolved'>('all');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // =========================================================================
  // WebSocket Integration
  // =========================================================================
  
 const handleNewConversation = useCallback((data: { id: string; customer: { name: string; email: string | null }; channel: string; status: string; ai_handled: boolean; created_at: string }) => {
    console.log('[AgentInbox] New conversation received:', data.id);
    
    // Add to conversation list
    setConversations(prev => {
      // Check if already exists
      if (prev.some(c => c.id === data.id)) {
        return prev;
      }
      
      // Add new conversation at the top
      const newConv: Conversation = {
        id: data.id,
        customer_name: data.customer?.name || 'Anonymous',
        customer_email: data.customer?.email || null,
        channel: data.channel,
        status: data.status,
        priority: 'normal',
        ai_handled: data.ai_handled,
        last_message_preview: '',
        last_message_at: data.created_at,
        message_count: 0,
        created_at: data.created_at,
        updated_at: data.created_at,
        assigned_to: null,
        assigned_to_name: null,
      };
      
      return [newConv, ...prev];
    });
  }, []);

  const handleNewMessage = useCallback((data: { conversation_id: string; message: { id: string; content: string; sender_type: string; sender_name: string; created_at: string } }) => {
    console.log('[AgentInbox] New message received:', data.conversation_id);
    
    // Update conversation list with new message preview
    setConversations(prev => prev.map(conv => {
      if (conv.id === data.conversation_id) {
        return {
          ...conv,
          last_message_preview: data.message.content.substring(0, 100),
          last_message_at: data.message.created_at,
        };
      }
      return conv;
    }));
    
    // If this conversation is currently selected, add the message
    setSelectedConversation(prev => {
      if (prev && prev.id === data.conversation_id) {
        // Check if message already exists
        if (prev.messages.some(m => m.id === data.message.id)) {
          return prev;
        }
        
        return {
          ...prev,
          messages: [
            ...prev.messages,
            {
              id: data.message.id,
              content: data.message.content,
              sender_type: data.message.sender_type as 'customer' | 'ai' | 'agent',
              sender_name: data.message.sender_name,
              created_at: data.message.created_at,
            },
          ],
        };
      }
      return prev;
    });
  }, []);

  const handleConversationUpdated = useCallback((data: { conversation_id: string; status?: string; ai_handled?: boolean; assigned_to?: string | null; assigned_agent_name?: string | null }) => {
    console.log('[AgentInbox] Conversation updated:', data.conversation_id);
    
    // Update conversation in list
    setConversations(prev => prev.map(conv => {
      if (conv.id === data.conversation_id) {
        return {
          ...conv,
          ...(data.status !== undefined && { status: data.status }),
          ...(data.ai_handled !== undefined && { ai_handled: data.ai_handled }),
          ...(data.assigned_to !== undefined && { assigned_to: data.assigned_to }),
        };
      }
      return conv;
    }));
    
    // Update selected conversation if it matches
    setSelectedConversation(prev => {
      if (prev && prev.id === data.conversation_id) {
        return {
          ...prev,
          ...(data.status !== undefined && { status: data.status }),
          ...(data.ai_handled !== undefined && { ai_handled: data.ai_handled }),
          ...(data.assigned_to !== undefined && { assigned_to: data.assigned_to }),
          ...(data.assigned_agent_name !== undefined && { assigned_agent_name: data.assigned_agent_name }),
        };
      }
      return prev;
    });
  }, []);

  // Connect to WebSocket
  const { isConnected, joinConversation, leaveConversation } = useSocket({
    tenantId: tenant?.id || '',
    userId: user?.id || '',
    onNewConversation: handleNewConversation,
    onNewMessage: handleNewMessage,
    onConversationUpdated: handleConversationUpdated,
    enabled: isAuthenticated && !!tenant?.id && !!user?.id,
  });

  // =========================================================================
  // API Calls
  // =========================================================================

  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      let url = `${API_URL}/api/v1/conversations/?`;
      
      if (activeView === 'unassigned') {
        url += 'unassigned_only=true';
      } else if (activeView === 'mine' && user?.id) {
        url += `assigned_to=${user.id}`;
      } else if (activeView === 'resolved') {
        url += 'status=resolved';
      }

      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch conversations');
      
      const data = await res.json();
      setConversations(data.items || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoadingList(false);
    }
  }, [activeView, user?.id, getAuthHeaders]);

  const fetchConversationDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${id}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch conversation');
      
      const data = await res.json();
      setSelectedConversation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoadingDetail(false);
    }
  }, [getAuthHeaders]);

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  // Fallback polling (reduced frequency since we have WebSocket)
  useEffect(() => {
    // Only poll if WebSocket is not connected
    if (isConnected) {
      return;
    }
    
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchConversations();
        if (selectedConversation) {
          fetchConversationDetail(selectedConversation.id);
        }
      }
    }, 15000); // Slower polling when WebSocket is down

    return () => clearInterval(interval);
  }, [isAuthenticated, isConnected, selectedConversation, fetchConversations, fetchConversationDetail]);

  // =========================================================================
  // Event Handlers
  // =========================================================================

  const handleSelectConversation = (conv: Conversation) => {
    // Leave previous conversation room
    if (selectedConversation) {
      leaveConversation(selectedConversation.id);
    }
    
    // Fetch and join new conversation
    fetchConversationDetail(conv.id);
    joinConversation(conv.id);
  };

  const handleTakeOver = async () => {
    if (!selectedConversation || !user) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${selectedConversation.id}/take-over`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) throw new Error('Failed to take over conversation');
      
      // WebSocket will update the state, but we can also refresh manually
      await fetchConversationDetail(selectedConversation.id);
      await fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take over conversation');
    }
  };

  const handleReturnToAI = async () => {
    if (!selectedConversation) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${selectedConversation.id}/unassign`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) throw new Error('Failed to return to AI');
      
      await fetchConversationDetail(selectedConversation.id);
      await fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return to AI');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content }),
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      
      // WebSocket will add the message, but refresh just in case
      await fetchConversationDetail(selectedConversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!selectedConversation) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${selectedConversation.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      await fetchConversationDetail(selectedConversation.id);
      await fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // =========================================================================
  // Render
  // =========================================================================

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#131210]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-[#131210] text-neutral-100">
      {/* Header */}
      <header className="bg-[#1A1915] border-b border-neutral-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-neutral-100">Agent Inbox</h1>
          {/* WebSocket Connection Status */}
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
            isConnected 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-red-500/10 text-red-400'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-sm text-neutral-400">{user?.name}</span>
          </div>
          <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-300">
            Dashboard
          </Link>
          <button
            onClick={() => { logout(); window.location.href = '/auth/login'; }}
            className="text-sm text-neutral-500 hover:text-neutral-300"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-red-400 text-sm flex-shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-4 text-red-300 hover:text-red-200 underline">Dismiss</button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AgentSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          conversationCounts={{
            all: conversations.length,
            unassigned: conversations.filter(c => !c.assigned_to).length,
            mine: conversations.filter(c => c.assigned_to === user?.id).length,
          }}
        />

        {/* Conversation List */}
        <div className="w-80 bg-[#1E1C19] border-r border-neutral-800 flex flex-col">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="font-semibold text-neutral-200 capitalize">{activeView} Conversations</h2>
            <button 
              onClick={fetchConversations}
              className="text-sm text-amber-500 hover:text-amber-400"
            >
              Refresh
            </button>
          </div>
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id}
            onSelect={handleSelectConversation}
            loading={loadingList}
          />
        </div>

        {/* Conversation Panel */}
        <div className="flex-1 flex flex-col bg-[#1A1915]">
          {selectedConversation ? (
            <ConversationPanel
              conversation={selectedConversation}
              currentUserId={user?.id}
              onTakeOver={handleTakeOver}
              onReturnToAI={handleReturnToAI}
              onSendMessage={handleSendMessage}
              onStatusChange={handleStatusChange}
              loading={loadingDetail}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-500">
              <div className="text-center">
                <div className="text-4xl mb-3 opacity-50">💬</div>
                <p>Select a conversation to view</p>
                {isConnected && (
                  <p className="text-xs text-emerald-400 mt-2">Real-time updates active</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
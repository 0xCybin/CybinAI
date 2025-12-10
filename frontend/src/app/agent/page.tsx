'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { getAccessToken } from '@/lib/api';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import { ConversationList, Conversation } from '@/components/agent/ConversationList';
import { ConversationPanel } from '@/components/agent/ConversationPanel';
import { Loader2 } from 'lucide-react';

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
  const { user, logout, isLoading: authLoading } = useAuth();
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
      setConversations(data.conversations || []);
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

  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
  }, [isAuthenticated, fetchConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isAuthenticated) {
        fetchConversations();
        if (selectedConversation) {
          fetchConversationDetail(selectedConversation.id);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isAuthenticated, selectedConversation, fetchConversations, fetchConversationDetail]);

  const handleSelectConversation = (conv: Conversation) => {
    fetchConversationDetail(conv.id);
  };

  const handleTakeOver = async () => {
    if (!selectedConversation || !user) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${selectedConversation.id}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ agent_id: user.id }),
      });
      
      if (!res.ok) throw new Error('Failed to assign conversation');
      
      await fetchConversationDetail(selectedConversation.id);
      await fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take over conversation');
    }
  };

  const handleReturnToAI = async () => {
    if (!selectedConversation) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${selectedConversation.id}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ agent_id: null }),
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
      
      await fetchConversationDetail(selectedConversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selectedConversation) return;
    
    try {
      const res = await fetch(`${API_URL}/api/v1/conversations/${selectedConversation.id}/status`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      await fetchConversationDetail(selectedConversation.id);
      await fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1A1915] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1A1915] flex flex-col">
      {/* Header */}
      <header className="bg-[#131210] border-b border-neutral-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-xl font-bold text-neutral-100">
            Cybin<span className="text-amber-500">AI</span>
          </Link>
          <span className="text-neutral-600">|</span>
          <span className="text-neutral-400 text-sm font-medium">Agent Inbox</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
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
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
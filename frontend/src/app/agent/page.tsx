'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useRequireAuth } from '@/contexts/AuthContext';
import { 
  conversationsApi, 
  ConversationListItem, 
  ConversationDetail, 
  ConversationStatus 
} from '@/lib/api';
import { ConversationList } from '@/components/agent/ConversationList';
import { ConversationPanel } from '@/components/agent/ConversationPanel';
import { AgentSidebar } from '@/components/agent/AgentSidebar';
import Link from 'next/link';

type FilterView = 'all' | 'unassigned' | 'mine' | 'resolved';

export default function AgentDashboardPage() {
  const { user, tenant, logout, isLoading } = useAuth();
  const { isAuthenticated } = useRequireAuth();
  
  // State
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationDetail | null>(null);
  const [activeView, setActiveView] = useState<FilterView>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations based on active view
  const fetchConversations = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    
    try {
      const filters: Record<string, unknown> = {};
      
      switch (activeView) {
        case 'unassigned':
          filters.unassigned_only = true;
          break;
        case 'mine':
          filters.assigned_to = user?.id;
          break;
        case 'resolved':
          filters.status = 'resolved';
          break;
      }
      
      const response = await conversationsApi.list(filters);
      setConversations(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setLoadingList(false);
    }
  }, [activeView, user?.id]);

  // Load conversations on mount and when view changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchConversations();
    }
  }, [isAuthenticated, user, fetchConversations]);

  // Polling for new conversations (every 10 seconds)
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    
    const interval = setInterval(() => {
      fetchConversations();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated, user, fetchConversations]);

  // Select a conversation
  const handleSelectConversation = async (id: string) => {
    setLoadingConversation(true);
    try {
      const detail = await conversationsApi.get(id);
      setSelectedConversation(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoadingConversation(false);
    }
  };

  // Take over (assign to self)
  const handleTakeOver = async () => {
    if (!selectedConversation) return;
    try {
      const updated = await conversationsApi.assign(selectedConversation.id);
      setSelectedConversation(updated);
      fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to take over conversation');
    }
  };

  // Return to AI
  const handleReturnToAI = async () => {
    if (!selectedConversation) return;
    try {
      const updated = await conversationsApi.unassign(selectedConversation.id);
      setSelectedConversation(updated);
      fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return to AI');
    }
  };

  // Update status
  const handleStatusChange = async (status: ConversationStatus) => {
    if (!selectedConversation) return;
    try {
      const updated = await conversationsApi.updateStatus(selectedConversation.id, status);
      setSelectedConversation(updated);
      fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Send message
  const handleSendMessage = async (content: string) => {
    if (!selectedConversation) return;
    try {
      await conversationsApi.sendMessage(selectedConversation.id, content);
      // Refresh the conversation to get the new message
      const updated = await conversationsApi.get(selectedConversation.id);
      setSelectedConversation(updated);
      fetchConversations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  };

  // Loading state
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="text-xl font-bold text-slate-900">
            Cybin<span className="text-blue-600">AI</span>
          </Link>
          {tenant && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
              {tenant.name}
            </span>
          )}
          <span className="text-sm text-blue-600 font-medium">Agent Dashboard</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-sm text-gray-600">{user?.name}</span>
          </div>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
            Dashboard
          </Link>
          <button
            onClick={() => { logout(); window.location.href = '/auth/login'; }}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-red-700 text-sm flex-shrink-0">
          {error}
          <button onClick={() => setError(null)} className="ml-4 underline">Dismiss</button>
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
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 capitalize">{activeView} Conversations</h2>
            <button 
              onClick={fetchConversations}
              className="text-sm text-blue-600 hover:text-blue-700"
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
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <ConversationPanel
              conversation={selectedConversation}
              currentUserId={user?.id || ''}
              loading={loadingConversation}
              onTakeOver={handleTakeOver}
              onReturnToAI={handleReturnToAI}
              onStatusChange={handleStatusChange}
              onSendMessage={handleSendMessage}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose from the list to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * useSocket Hook
 * 
 * React hook for managing WebSocket connection in the Agent Dashboard.
 * Handles connection lifecycle, reconnection, and event subscriptions.
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import {
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  getSocket,
  onNewConversation,
  onNewMessage,
  onConversationUpdated,
  offNewConversation,
  offNewMessage,
  offConversationUpdated,
  NewConversationEvent,
  NewMessageEvent,
  ConversationUpdatedEvent,
  joinConversation,
  leaveConversation,
} from '@/lib/socket';

interface UseSocketOptions {
  tenantId: string;
  userId: string;
  onNewConversation?: (data: NewConversationEvent) => void;
  onNewMessage?: (data: NewMessageEvent) => void;
  onConversationUpdated?: (data: ConversationUpdatedEvent) => void;
  enabled?: boolean;
}

interface UseSocketReturn {
  isConnected: boolean;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
}

export function useSocket({
  tenantId,
  userId,
  onNewConversation: handleNewConversation,
  onNewMessage: handleNewMessage,
  onConversationUpdated: handleConversationUpdated,
  enabled = true,
}: UseSocketOptions): UseSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  
  // Use refs to avoid stale closures in event handlers
  const handleNewConversationRef = useRef(handleNewConversation);
  const handleNewMessageRef = useRef(handleNewMessage);
  const handleConversationUpdatedRef = useRef(handleConversationUpdated);
  
  // Update refs when handlers change
  useEffect(() => {
    handleNewConversationRef.current = handleNewConversation;
  }, [handleNewConversation]);
  
  useEffect(() => {
    handleNewMessageRef.current = handleNewMessage;
  }, [handleNewMessage]);
  
  useEffect(() => {
    handleConversationUpdatedRef.current = handleConversationUpdated;
  }, [handleConversationUpdated]);

  // Connect to socket
  useEffect(() => {
    if (!enabled || !tenantId || !userId) {
      return;
    }

    console.log('[useSocket] Initializing connection', { tenantId, userId });

    // Connect with auth
    const socket = connectSocket({
      tenant_id: tenantId,
      user_id: userId,
    });

    // Track connection state
    const handleConnect = () => {
      console.log('[useSocket] Connected');
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('[useSocket] Disconnected');
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    // Set initial state
    setIsConnected(socket.connected);

    // Cleanup on unmount
    return () => {
      console.log('[useSocket] Cleaning up');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      disconnectSocket();
      setIsConnected(false);
    };
  }, [enabled, tenantId, userId]);

  // Subscribe to events
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    console.log('[useSocket] Setting up event handlers');

    // Wrapper functions that use refs
    const newConversationHandler = (data: NewConversationEvent) => {
      console.log('[useSocket] New conversation:', data);
      handleNewConversationRef.current?.(data);
    };

    const newMessageHandler = (data: NewMessageEvent) => {
      console.log('[useSocket] New message:', data);
      handleNewMessageRef.current?.(data);
    };

    const conversationUpdatedHandler = (data: ConversationUpdatedEvent) => {
      console.log('[useSocket] Conversation updated:', data);
      handleConversationUpdatedRef.current?.(data);
    };

    // Subscribe
    onNewConversation(newConversationHandler);
    onNewMessage(newMessageHandler);
    onConversationUpdated(conversationUpdatedHandler);

    // Cleanup
    return () => {
      console.log('[useSocket] Removing event handlers');
      offNewConversation(newConversationHandler);
      offNewMessage(newMessageHandler);
      offConversationUpdated(conversationUpdatedHandler);
    };
  }, [isConnected]);

  // Memoized actions
  const handleJoinConversation = useCallback((conversationId: string) => {
    if (isConnected) {
      joinConversation(conversationId);
    }
  }, [isConnected]);

  const handleLeaveConversation = useCallback((conversationId: string) => {
    if (isConnected) {
      leaveConversation(conversationId);
    }
  }, [isConnected]);

  return {
    isConnected,
    joinConversation: handleJoinConversation,
    leaveConversation: handleLeaveConversation,
  };
}

export default useSocket;
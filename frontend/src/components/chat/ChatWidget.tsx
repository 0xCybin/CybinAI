'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getWidgetConfig,
  startConversation,
  sendMessage,
  requestHumanAgent,
  WidgetConfig,
  Message,
} from '@/lib/widget-api';
import styles from './ChatWidget.module.css';

// ============================================
// ICONS (inline SVGs for zero dependencies)
// ============================================

const ChatIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MinimizeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// ============================================
// TYPING INDICATOR
// ============================================

const TypingIndicator = () => (
  <div className={styles.typingIndicator}>
    <span className={styles.typingDot} style={{ animationDelay: '0ms' }} />
    <span className={styles.typingDot} style={{ animationDelay: '150ms' }} />
    <span className={styles.typingDot} style={{ animationDelay: '300ms' }} />
  </div>
);

// ============================================
// MESSAGE BUBBLE
// ============================================

interface MessageBubbleProps {
  message: Message;
  isLatest: boolean;
}

const MessageBubble = ({ message, isLatest }: MessageBubbleProps) => {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';
  
  return (
    <div 
      className={`${styles.messageWrapper} ${isCustomer ? styles.messageCustomer : styles.messageAgent}`}
      style={isLatest ? { animation: 'fadeInUp 0.3s ease-out forwards' } : undefined}
    >
      {!isCustomer && (
        <div className={styles.messageAvatar}>
          {isAI ? '✦' : <UserIcon />}
        </div>
      )}
      <div className={`${styles.messageBubble} ${isCustomer ? styles.bubbleCustomer : styles.bubbleAgent}`}>
        <p className={styles.messageText}>{message.content}</p>
        <span className={styles.messageTime}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

// ============================================
// MAIN WIDGET COMPONENT
// ============================================

interface ChatWidgetProps {
  tenantId: string;
}

export default function ChatWidget({ tenantId }: ChatWidgetProps) {
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load widget config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        console.log('[Widget] Loading config for tenant:', tenantId);
        const widgetConfig = await getWidgetConfig(tenantId);
        console.log('[Widget] Config loaded:', widgetConfig);
        setConfig(widgetConfig);
      } catch (err) {
        console.error('[Widget] Failed to load config:', err);
        // Use defaults if config fails
        setConfig({
          tenant_id: tenantId,
          business_name: 'Support',
          welcome_message: 'Hi! How can we help you today?',
          primary_color: '#D97706',
          position: 'bottom-right',
          offline_message: 'We\'re currently offline. Leave a message!',
          is_online: true,
        });
      }
    }
    loadConfig();
  }, [tenantId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Start conversation
  const initConversation = useCallback(async () => {
    if (conversationId) {
      console.log('[Widget] Conversation already exists:', conversationId);
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('[Widget] Starting new conversation...');
      const conv = await startConversation(tenantId);
      console.log('[Widget] Conversation started:', conv);
      
      // FIX: API returns conversation_id, not id
      const convId = conv.conversation_id || conv.id;
      console.log('[Widget] Setting conversationId to:', convId);
      setConversationId(convId);
      
      // Add welcome message
      const welcomeMsg = conv.welcome_message || config?.welcome_message || 'Hi! How can we help you today?';
      setMessages([{
        id: 'welcome',
        conversation_id: convId,
        sender_type: 'ai',
        content: welcomeMsg,
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      setError('Failed to start conversation. Please try again.');
      console.error('[Widget] Failed to start conversation:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, conversationId, config?.welcome_message]);

  // Handle open/close
  const handleOpen = async () => {
    console.log('[Widget] Opening widget');
    setIsOpen(true);
    setIsClosing(false);
    setHasNewMessage(false);
    if (!conversationId) {
      await initConversation();
    }
  };

  const handleClose = () => {
    console.log('[Widget] Closing widget');
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  // Send message
  const handleSend = async () => {
    console.log('[Widget] handleSend called', { 
      inputValue, 
      conversationId, 
      isSending,
      inputTrimmed: inputValue.trim(),
      hasInput: !!inputValue.trim(),
      hasConversation: !!conversationId,
      notSending: !isSending
    });
    
    if (!inputValue.trim()) {
      console.log('[Widget] No input value, returning');
      return;
    }
    
    if (!conversationId) {
      console.log('[Widget] No conversationId, returning');
      setError('No active conversation. Please refresh and try again.');
      return;
    }
    
    if (isSending) {
      console.log('[Widget] Already sending, returning');
      return;
    }

    const content = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setError(null);

    // Optimistically add customer message
    const tempCustomerMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_type: 'customer',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempCustomerMsg]);
    console.log('[Widget] Added optimistic message, sending to API...');

    try {
      const response = await sendMessage(tenantId, conversationId, content);
      console.log('[Widget] Message sent, response:', response);
      
      // Replace temp message with real one and add AI response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempCustomerMsg.id);
        const newMessages = [...filtered, response.customer_message];
        if (response.ai_response) {
          newMessages.push(response.ai_response);
        }
        return newMessages;
      });
    } catch (err) {
      console.error('[Widget] Failed to send message:', err);
      setError('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempCustomerMsg.id));
      setInputValue(content); // Restore input
    } finally {
      setIsSending(false);
    }
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      console.log('[Widget] Enter key pressed');
      handleSend();
    }
  };

  // Request human agent
  const handleRequestHuman = async () => {
    if (!conversationId) return;
    
    try {
      console.log('[Widget] Requesting human agent');
      await requestHumanAgent(tenantId, conversationId, 'Customer requested human assistance');
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'ai',
        content: 'I\'ve notified our team. A human agent will be with you shortly. Please hold tight!',
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      setError('Failed to request human agent.');
      console.error('[Widget] Failed to request human:', err);
    }
  };

  // Debug: log state changes
  useEffect(() => {
    console.log('[Widget] State updated:', { conversationId, messagesCount: messages.length, isLoading, isSending });
  }, [conversationId, messages.length, isLoading, isSending]);

  if (!config) return null;

  return (
    <div className={styles.widgetContainer} data-position={config.position}>
      {/* Chat Window */}
      {isOpen && (
        <div className={`${styles.chatWindow} ${isClosing ? styles.chatWindowClosing : ''}`}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <div className={styles.headerLogo}>✦</div>
              <div className={styles.headerInfo}>
                <h3 className={styles.headerTitle}>{config.business_name}</h3>
                <span className={styles.headerStatus}>
                  <span className={styles.statusDot} />
                  {config.is_online ? 'Online now' : 'Away'}
                </span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <button 
                className={styles.headerButton}
                onClick={handleRequestHuman}
                title="Talk to a human"
                type="button"
              >
                <UserIcon />
              </button>
              <button 
                className={styles.headerButton}
                onClick={handleClose}
                title="Minimize"
                type="button"
              >
                <MinimizeIcon />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={`${styles.messagesContainer} scrollbar-custom`}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} />
                <p>Starting conversation...</p>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isLatest={idx === messages.length - 1}
                  />
                ))}
                {isSending && (
                  <div className={`${styles.messageWrapper} ${styles.messageAgent}`}>
                    <div className={styles.messageAvatar}>✦</div>
                    <div className={`${styles.messageBubble} ${styles.bubbleAgent}`}>
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className={styles.errorBanner}>
              {error}
              <button onClick={() => setError(null)} type="button">×</button>
            </div>
          )}

          {/* Input */}
          <div className={styles.inputContainer}>
            <input
              ref={inputRef}
              type="text"
              name="chat-message"
              id="chat-message-input"
              className={styles.input}
              placeholder="Type your message..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isSending}
              autoComplete="off"
            />
            <button
              className={styles.sendButton}
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || isSending}
              type="button"
            >
              <SendIcon />
            </button>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            Powered by <span className={styles.footerBrand}>CybinAI</span>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        className={`${styles.bubble} ${isOpen ? styles.bubbleHidden : ''} ${hasNewMessage ? styles.bubblePulse : ''}`}
        onClick={handleOpen}
        aria-label="Open chat"
        type="button"
      >
        <ChatIcon />
        {hasNewMessage && <span className={styles.bubbleBadge} />}
      </button>
    </div>
  );
}
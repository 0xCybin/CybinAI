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
import { getWidgetSocket } from '@/lib/widgetSocket';
import styles from './ChatWidget.module.css';

// ============================================
// SVG ICONS
// ============================================

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

// Sparkles icon for AI - clean and professional
const SparklesIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
    <path d="M12 2L13.09 8.26L19 9L13.09 9.74L12 16L10.91 9.74L5 9L10.91 8.26L12 2Z" />
    <path d="M18 14L18.62 17.38L22 18L18.62 18.62L18 22L17.38 18.62L14 18L17.38 17.38L18 14Z" opacity="0.7" />
    <path d="M6 14L6.38 16.62L9 17L6.38 17.38L6 20L5.62 17.38L3 17L5.62 16.62L6 14Z" opacity="0.5" />
  </svg>
);

// ============================================
// COLOR UTILITY
// ============================================

function adjustColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

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
// MESSAGE BUBBLE - IMPROVED
// ============================================

interface MessageBubbleProps {
  message: Message;
  isLatest: boolean;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
}

const MessageBubble = ({ message, isLatest, colors }: MessageBubbleProps) => {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';

  // Customer message styles - right side, primary color
  const customerBubbleStyle = isCustomer ? {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
    boxShadow: `0 2px 8px ${colors.primary}30`,
  } : {};

  // AI/Agent message styles - left side
  const respondentBubbleStyle = !isCustomer ? {
    background: adjustColor(colors.background, 8),
    border: `1px solid ${colors.text}08`,
  } : {};

  const timeStyle = {
    color: isCustomer ? 'rgba(255,255,255,0.7)' : `${colors.text}50`,
  };
  
  return (
    <div 
      className={`${styles.messageWrapper} ${isCustomer ? styles.messageCustomer : styles.messageAgent}`}
      style={isLatest ? { animation: 'fadeInUp 0.3s ease-out forwards' } : undefined}
    >
      {/* Avatar/Icon for AI and Agent messages */}
      {!isCustomer && (
        <div className={styles.senderSection}>
          <div 
            className={styles.messageAvatar}
            style={{
              background: isAI 
                ? `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}10 100%)`
                : `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
              border: isAI ? `1px solid ${colors.primary}30` : 'none',
            }}
          >
            {isAI ? (
              <span style={{ color: colors.primary }}><SparklesIcon /></span>
            ) : (
              <span style={{ color: '#fff' }}><UserIcon /></span>
            )}
          </div>
          <span 
            className={styles.senderLabel}
            style={{ color: isAI ? colors.primary : `${colors.text}70` }}
          >
            {isAI ? 'AI Assistant' : 'Support Agent'}
          </span>
        </div>
      )}
      
      {/* Message Bubble */}
      <div 
        className={`${styles.messageBubble} ${isCustomer ? styles.bubbleCustomer : styles.bubbleAgent}`}
        style={isCustomer ? customerBubbleStyle : respondentBubbleStyle}
      >
        <p 
          className={styles.messageText} 
          style={{ color: isCustomer ? '#FFFFFF' : colors.text }}
        >
          {message.content}
        </p>
        <span className={styles.messageTime} style={timeStyle}>
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
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load widget config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const widgetConfig = await getWidgetConfig(tenantId);
        setConfig(widgetConfig);
      } catch {
        // Use defaults if config fails
        setConfig({
          tenant_id: tenantId,
          business_name: 'Support',
          welcome_message: 'Hi! How can we help you today?',
          primary_color: '#D97706',
          secondary_color: '#92400E',
          background_color: '#1A1915',
          text_color: '#F5F5F4',
          position: 'bottom-right',
          offline_message: 'We\'re currently offline. Leave a message!',
          is_online: true,
        });
      }
    }
    loadConfig();
  }, [tenantId]);

  // WebSocket setup for real-time agent messages
  useEffect(() => {
    if (!conversationId) return;

    const socket = getWidgetSocket();

    const handleConnect = () => {
      console.log('[ChatWidget] Socket connected, joining room:', conversationId);
      socket.emit('join_conversation', { conversation_id: conversationId });
    };

    const handleNewMessage = (data: { message: Message }) => {
      console.log('[ChatWidget] New message received:', data);
      
      // Only add if not already present and not from customer
      if (data.message.sender_type !== 'customer') {
        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        
        if (!isOpen) {
          setHasNewMessage(true);
        }
      }
      setIsTyping(false);
    };

    socket.on('connect', handleConnect);
    socket.on('new_message', handleNewMessage);
    
    if (!socket.connected) {
      socket.connect();
    } else {
      // Already connected, join room immediately
      socket.emit('join_conversation', { conversation_id: conversationId });
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('new_message', handleNewMessage);
      socket.emit('leave_conversation', { conversation_id: conversationId });
    };
  }, [conversationId, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Start conversation
  const initConversation = useCallback(async () => {
    if (conversationId) return;
    
    setIsLoading(true);
    try {
      const conv = await startConversation(tenantId);
      setConversationId(conv.conversation_id);
      
      // Add welcome message
      const welcomeMsg = conv.welcome_message || config?.welcome_message || 'Hi! How can we help you today?';
      setMessages([{
        id: 'welcome',
        conversation_id: conv.conversation_id,
        sender_type: 'ai',
        content: welcomeMsg,
        created_at: new Date().toISOString(),
      }]);
    } catch {
      setError('Failed to start conversation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, tenantId, config?.welcome_message]);

  // Handle widget open
  const handleOpen = () => {
    setIsOpen(true);
    setHasNewMessage(false);
    initConversation();
  };

  // Handle widget close
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 200);
  };

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() || !conversationId || isSending) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsSending(true);
    setIsTyping(true);

    // Add user message immediately
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      conversation_id: conversationId,
      sender_type: 'customer',
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await sendMessage(tenantId, conversationId, userMessage);
      
      // Add AI response (if present - might come via WebSocket instead)
      if (response.ai_response) {
        setMessages(prev => {
          // Check if already added via WebSocket
          const exists = prev.some(m => m.id === response.ai_response!.id);
          if (exists) return prev;
          return [...prev, {
            id: response.ai_response!.id,
            conversation_id: conversationId,
            sender_type: response.ai_response!.sender_type,
            content: response.ai_response!.content,
            created_at: response.ai_response!.created_at,
          }];
        });
        setIsTyping(false);
      }
    } catch {
      setError('Failed to send message. Please try again.');
      setIsTyping(false);
    } finally {
      setIsSending(false);
    }
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle request human
  const handleRequestHuman = async () => {
    if (!conversationId) return;
    
    try {
      await requestHumanAgent(tenantId, conversationId);
      // Add system message
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'agent' as const,
        content: 'A human agent will be with you shortly. Please hold tight!',
        created_at: new Date().toISOString(),
      }]);
    } catch {
      setError('Failed to request human agent.');
    }
  };

  if (!config) return null;

  // Extract all colors from config (with fallbacks)
  const colors = {
    primary: config.primary_color || '#D97706',
    secondary: config.secondary_color || '#92400E',
    background: config.background_color || '#1A1915',
    text: config.text_color || '#F5F5F4',
  };

  // Dynamic styles
  const bubbleStyle = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
    boxShadow: `0 4px 14px ${colors.primary}50, 0 2px 6px rgba(0, 0, 0, 0.2)`,
  };

  const headerStyle = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
  };

  const chatWindowStyle = {
    background: colors.background,
  };

  const messagesContainerStyle = {
    background: colors.background,
  };

  const inputContainerStyle = {
    background: adjustColor(colors.background, -10),
    borderColor: `${colors.text}10`,
  };

  const inputStyle = {
    background: colors.background,
    color: colors.text,
    borderColor: `${colors.text}20`,
  };

  const sendButtonStyle = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
    boxShadow: `0 2px 6px ${colors.primary}40`,
  };

  const footerStyle = {
    background: adjustColor(colors.background, -10),
    borderColor: `${colors.text}10`,
    color: `${colors.text}60`,
  };

  const footerBrandStyle = {
    color: colors.primary,
  };

  return (
    <div className={styles.widgetContainer} data-position={config.position}>
      {/* Chat Window */}
      {isOpen && (
        <div 
          className={`${styles.chatWindow} ${isClosing ? styles.chatWindowClosing : ''}`}
          style={chatWindowStyle}
        >
          {/* Header */}
          <div className={styles.header} style={headerStyle}>
            <div className={styles.headerContent}>
              <div className={styles.headerInfo}>
                <h3 className={styles.headerTitle}>{config.business_name}</h3>
                <div className={styles.headerStatus}>
                  <span className={styles.statusDot} />
                  <span>{config.is_online ? 'Online' : 'Offline'}</span>
                </div>
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
                aria-label="Close chat"
                type="button"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className={styles.messagesContainer} style={messagesContainerStyle}>
            {isLoading ? (
              <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner} style={{ borderTopColor: colors.primary }} />
                <span>Starting chat...</span>
              </div>
            ) : (
              <>
                {messages.map((msg, idx) => (
                  <MessageBubble 
                    key={msg.id} 
                    message={msg} 
                    isLatest={idx === messages.length - 1}
                    colors={colors}
                  />
                ))}
                {/* Typing indicator */}
                {isTyping && (
                  <div className={`${styles.messageWrapper} ${styles.messageAgent}`}>
                    <div className={styles.senderSection}>
                      <div 
                        className={styles.messageAvatar}
                        style={{
                          background: `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}10 100%)`,
                          border: `1px solid ${colors.primary}30`,
                        }}
                      >
                        <span style={{ color: colors.primary }}><SparklesIcon /></span>
                      </div>
                    </div>
                    <div 
                      className={`${styles.messageBubble} ${styles.bubbleAgent}`}
                      style={{ background: adjustColor(colors.background, 8), border: `1px solid ${colors.text}08` }}
                    >
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
          <div className={styles.inputContainer} style={inputContainerStyle}>
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
              style={inputStyle}
            />
            <button
              className={styles.sendButton}
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading || isSending}
              type="button"
              style={sendButtonStyle}
            >
              <SendIcon />
            </button>
          </div>

          {/* Footer */}
          <div className={styles.footer} style={footerStyle}>
            Powered by <span className={styles.footerBrand} style={footerBrandStyle}>MykoDesk</span>
          </div>
        </div>
      )}

      {/* Floating Bubble */}
      <button
        className={`${styles.bubble} ${isOpen ? styles.bubbleHidden : ''} ${hasNewMessage ? styles.bubblePulse : ''}`}
        onClick={handleOpen}
        aria-label="Open chat"
        type="button"
        style={bubbleStyle}
      >
        <ChatIcon />
        {hasNewMessage && <span className={styles.bubbleBadge} />}
      </button>
    </div>
  );
}
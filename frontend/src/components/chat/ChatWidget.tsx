'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  getWidgetConfig,
  startConversation,
  sendMessage,
  requestHumanAgent,
  WidgetConfig,
  Message as BaseMessage,
} from '@/lib/widget-api';
import { 
  connectWidgetSocket, 
  disconnectWidgetSocket,
  onWidgetMessage,
  offWidgetMessage,
  NewMessageEvent,
} from '@/lib/widgetSocket';
import styles from './ChatWidget.module.css';

// ============================================
// EXTENDED MESSAGE TYPE
// Widget messages from WebSocket include sender_name
// ============================================

interface Message extends BaseMessage {
  sender_name?: string | null;
}

// ============================================
// ICONS (inline SVGs for zero dependencies)
// ============================================

const ChatIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
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

// Human/Agent Icon
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Bot Icon for AI
const BotIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v4" />
    <line x1="8" y1="16" x2="8" y2="16" />
    <line x1="16" y1="16" x2="16" y2="16" />
  </svg>
);

// Headset Icon for "Talk to Human" button
const HeadsetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
  </svg>
);

// ============================================
// HELPER: Darken/lighten color for gradients
// ============================================
function adjustColor(hex: string, percent: number): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  const adjust = (value: number) => {
    if (percent > 0) {
      return Math.min(255, Math.floor(value + (255 - value) * (percent / 100)));
    } else {
      return Math.max(0, Math.floor(value * (1 + percent / 100)));
    }
  };
  
  const newR = adjust(r);
  const newG = adjust(g);
  const newB = adjust(b);
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
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
// MESSAGE BUBBLE
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
  const isAgent = message.sender_type === 'agent';
  
  // Get sender label
  const getSenderLabel = () => {
    if (isCustomer) return 'You';
    if (isAI) return 'AI Assistant';
    return message.sender_name || 'Support Agent';
  };

  // Dynamic styles - Different colors for AI vs Human Agent
  const customerBubbleStyle = isCustomer ? {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
    boxShadow: `0 2px 8px ${colors.primary}40`,
    color: '#FFFFFF',
  } : {};

  // AI bubbles: Subtle blue tint
  const aiBubbleStyle = isAI ? {
    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    color: colors.text,
  } : {};

  // Human agent bubbles: Warm amber tint (different from AI)
  const agentBubbleStyle = isAgent ? {
    background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.15) 0%, rgba(180, 83, 9, 0.1) 100%)',
    border: '1px solid rgba(217, 119, 6, 0.2)',
    color: colors.text,
  } : {};

  // AI avatar: Blue gradient
  const aiAvatarStyle = {
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)',
  };

  // Human agent avatar: Amber gradient
  const agentAvatarStyle = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
    boxShadow: `0 2px 6px ${colors.primary}50`,
  };

  const timeStyle = {
    color: isCustomer ? 'rgba(255,255,255,0.8)' : `${colors.text}60`,
  };

  // Sender label style
  const labelStyle = {
    color: isAI ? 'rgba(59, 130, 246, 0.8)' : isAgent ? `${colors.primary}` : `${colors.text}60`,
  };
  
  return (
    <div 
      className={`${styles.messageWrapper} ${isCustomer ? styles.messageCustomer : styles.messageAgent}`}
      style={isLatest ? { animation: 'fadeInUp 0.3s ease-out forwards' } : undefined}
    >
      {/* Avatar for non-customer messages */}
      {!isCustomer && (
        <div 
          className={styles.messageAvatar} 
          style={isAI ? aiAvatarStyle : agentAvatarStyle}
          title={isAI ? 'AI Assistant' : 'Human Agent'}
        >
          {isAI ? <BotIcon /> : <UserIcon />}
        </div>
      )}
      
      <div className={styles.messageContent}>
        {/* Sender Label */}
        <span className={styles.senderLabel} style={labelStyle}>
          {getSenderLabel()}
        </span>
        
        {/* Message Bubble */}
        <div 
          className={`${styles.messageBubble} ${isCustomer ? styles.bubbleCustomer : styles.bubbleAgent} ${isAI ? styles.bubbleAI : ''} ${isAgent ? styles.bubbleHuman : ''}`}
          style={isCustomer ? customerBubbleStyle : (isAI ? aiBubbleStyle : agentBubbleStyle)}
        >
          <p className={styles.messageText} style={{ color: isCustomer ? '#FFFFFF' : colors.text }}>
            {message.content}
          </p>
          <span className={styles.messageTime} style={timeStyle}>
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// STATUS BANNER COMPONENT
// ============================================

interface StatusBannerProps {
  isAIHandled: boolean;
  agentName?: string;
  colors: {
    primary: string;
    text: string;
  };
}

const StatusBanner = ({ isAIHandled, agentName, colors }: StatusBannerProps) => {
  if (isAIHandled) {
    return (
      <div className={styles.statusBanner} style={{ 
        background: 'rgba(59, 130, 246, 0.1)',
        borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
      }}>
        <div className={styles.statusBannerContent}>
          <div className={styles.statusBannerIcon} style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
            <BotIcon />
          </div>
          <span style={{ color: 'rgba(147, 197, 253, 0.9)' }}>
            Chatting with AI Assistant
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statusBanner} style={{ 
      background: `${colors.primary}15`,
      borderBottom: `1px solid ${colors.primary}30`,
    }}>
      <div className={styles.statusBannerContent}>
        <div className={styles.statusBannerIcon} style={{ background: `${colors.primary}25` }}>
          <UserIcon />
        </div>
        <span style={{ color: colors.primary }}>
          {agentName ? `Connected with ${agentName}` : 'Connected with Support Agent'}
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
  
  // Track if AI is handling or human agent has taken over
  const [isAIHandled, setIsAIHandled] = useState(true);
  const [agentName, setAgentName] = useState<string | undefined>(undefined);

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

  // WebSocket connection for real-time agent messages
  useEffect(() => {
    if (!conversationId) return;

    // Connect to WebSocket
    connectWidgetSocket(conversationId);

    // Handler for new messages
    const handleNewMessage = (data: NewMessageEvent) => {
      const incomingMessage = data.message;
      
      // Only add messages from agents/AI (not our own customer messages)
      if (incomingMessage.sender_type !== 'customer') {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.some(m => m.id === incomingMessage.id)) {
            return prev;
          }
          // Cast to our extended Message type
          const newMessage: Message = {
            id: incomingMessage.id,
            conversation_id: incomingMessage.conversation_id,
            sender_type: incomingMessage.sender_type as 'customer' | 'ai' | 'agent',
            content: incomingMessage.content,
            created_at: incomingMessage.created_at,
            // sender_name might come from metadata or not exist
            sender_name: (incomingMessage.metadata?.sender_name as string) || undefined,
          };
          return [...prev, newMessage];
        });
        
        // If we receive an agent message, they've taken over
        if (incomingMessage.sender_type === 'agent') {
          setIsAIHandled(false);
          // Try to get agent name from metadata
          const name = incomingMessage.metadata?.sender_name as string | undefined;
          if (name) {
            setAgentName(name);
          }
        }
        
        // Notify if widget is minimized
        if (!isOpen) {
          setHasNewMessage(true);
        }
      }
    };

    // Subscribe to messages
    onWidgetMessage(handleNewMessage);

    // Cleanup
    return () => {
      offWidgetMessage(handleNewMessage);
      disconnectWidgetSocket();
    };
  }, [conversationId, isOpen]);

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
      return;
    }
    
    setIsLoading(true);
    try {
      const conv = await startConversation(tenantId);
      setConversationId(conv.conversation_id);
      setIsAIHandled(true); // New conversations start with AI
      
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
      
      // Add AI response (only if AI is still handling and not already added via WebSocket)
      if (response.ai_response) {
        setMessages(prev => {
          // Check if this message already exists (could have arrived via WebSocket)
          if (prev.some(m => m.id === response.ai_response!.id)) {
            return prev;
          }
          return [...prev, {
            id: response.ai_response!.id,
            conversation_id: conversationId,
            sender_type: response.ai_response!.sender_type,
            content: response.ai_response!.content,
            created_at: response.ai_response!.created_at,
          }];
        });
      }
    } catch {
      setError('Failed to send message. Please try again.');
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
      setMessages(prev => [...prev, {
        id: `system-${Date.now()}`,
        conversation_id: conversationId,
        sender_type: 'ai' as const,
        content: 'I\'m connecting you with a human agent. Please hold tight — someone will be with you shortly!',
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

  // Dynamic styles based on ALL colors
  const bubbleStyle = {
    background: `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
    boxShadow: `0 4px 14px ${colors.primary}66, 0 2px 6px rgba(0, 0, 0, 0.2)`,
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
    boxShadow: `0 2px 6px ${colors.primary}50`,
  };

  const footerStyle = {
    background: adjustColor(colors.background, -10),
    borderColor: `${colors.text}10`,
    color: `${colors.text}80`,
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
          {/* Header - PRIMARY COLOR */}
          <div className={styles.header} style={headerStyle}>
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
              {/* Only show "Talk to Human" if AI is currently handling */}
              {isAIHandled && (
                <button 
                  className={styles.headerButton}
                  onClick={handleRequestHuman}
                  title="Talk to a human"
                  type="button"
                >
                  <HeadsetIcon />
                </button>
              )}
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

          {/* Status Banner - Shows who customer is chatting with */}
          {!isLoading && messages.length > 0 && (
            <StatusBanner 
              isAIHandled={isAIHandled} 
              agentName={agentName}
              colors={colors}
            />
          )}

          {/* Messages - BACKGROUND COLOR */}
          <div 
            className={`${styles.messagesContainer} scrollbar-custom`}
            style={messagesContainerStyle}
          >
            {isLoading ? (
              <div className={styles.loadingContainer} style={{ color: colors.text }}>
                <div className={styles.loadingSpinner} style={{ borderTopColor: colors.primary }} />
                <p>Starting conversation...</p>
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
                {isSending && (
                  <div className={`${styles.messageWrapper} ${styles.messageAgent}`}>
                    <div 
                      className={styles.messageAvatar}
                      style={{
                        background: isAIHandled 
                          ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)'
                          : `linear-gradient(135deg, ${colors.primary} 0%, ${adjustColor(colors.primary, -20)} 100%)`,
                      }}
                    >
                      {isAIHandled ? <BotIcon /> : <UserIcon />}
                    </div>
                    <div className={styles.messageContent}>
                      <span className={styles.senderLabel} style={{ color: isAIHandled ? 'rgba(59, 130, 246, 0.8)' : colors.primary }}>
                        {isAIHandled ? 'AI Assistant' : (agentName || 'Support Agent')}
                      </span>
                      <div 
                        className={`${styles.messageBubble} ${styles.bubbleAgent}`}
                        style={{ 
                          background: isAIHandled 
                            ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)'
                            : `linear-gradient(135deg, ${colors.primary}20 0%, ${colors.primary}10 100%)`,
                          border: isAIHandled 
                            ? '1px solid rgba(59, 130, 246, 0.2)'
                            : `1px solid ${colors.primary}30`,
                          color: colors.text,
                        }}
                      >
                        <TypingIndicator />
                      </div>
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

          {/* Input - BACKGROUND + TEXT COLORS */}
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
            {/* Send Button - PRIMARY COLOR */}
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

      {/* Floating Bubble - PRIMARY COLOR */}
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
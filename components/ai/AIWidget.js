'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { usePathname, useRouter } from 'next/navigation'
import {
  SparklesIcon,
  XMarkIcon,
  MinusIcon,
  PaperAirplaneIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../SupabaseAuthProvider'
import { useAIWidget } from '@/contexts/AIWidgetContext'
import { createConversationSync } from '@/lib/conversation-sync'

/**
 * AIWidget Component
 *
 * Persistent, theme-aware AI chat widget that provides intelligent database access
 * and KPI reporting. Follows industry-standard widget patterns (Intercom/Drift).
 *
 * Features:
 * - Full light/dark mode support via next-themes
 * - Persistent across pages (via React Context)
 * - Minimizable with conversation memory
 * - Responsive design (modal on mobile)
 * - Natural language to SQL for data queries
 * - Real-time KPI reporting
 *
 * @param {Object} props
 * @param {string} props.barbershopId - Current barbershop context for data queries
 * @param {string} props.position - Widget position: 'bottom-right' | 'bottom-left' (default: 'bottom-right')
 */
export default function AIWidget({
  barbershopId,
  position = 'bottom-right'
}) {
  // Theme system integration
  const { theme, resolvedTheme } = useTheme()
  const { user } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  // Hide widget on AI Command Center page to avoid redundancy
  const isCommandCenterPage = pathname?.includes('/ai-command-center')

  // Get widget state and methods from context (single source of truth)
  const {
    isOpen,
    isMinimized,
    messages,
    toggleWidget,
    toggleMinimize,
    addMessage,
    clearMessages,
    updateBarbershopContext
  } = useAIWidget()

  // Local UI state only
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [csrfToken, setCsrfToken] = useState(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // Sync barbershop context when barbershopId prop changes
  useEffect(() => {
    if (barbershopId) {
      updateBarbershopContext(barbershopId)
    }
  }, [barbershopId, updateBarbershopContext])

  // Refs
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Focus input when widget opens
  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, isMinimized])

  // Fetch CSRF token on mount (for Phase 2 - currently exempted in middleware)
  useEffect(() => {
    if (mounted && user) {
      // Fetch CSRF token from any GET API endpoint
      fetch('/api/health')
        .then(res => {
          const token = res.headers.get('X-CSRF-Token')
          if (token) {
            setCsrfToken(token)
          }
        })
        .catch(err => console.error('Failed to fetch CSRF token:', err))
    }
  }, [mounted, user])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toISOString()
    }

    // Add user message via context (auto-saved to localStorage with proper scoping)
    addMessage(userMessage)
    setInputValue('')
    setIsLoading(true)

    try {
      // Call AI data query endpoint with CSRF token (when available)
      const headers = {
        'Content-Type': 'application/json'
      }

      // Include CSRF token if available (Phase 2 will require it)
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken
      }

      const response = await fetch('/api/ai/data-query', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: userMessage.content,
          barbershopId,
          userId: user?.id,
          conversationHistory: messages.slice(-5) // Last 5 messages for context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response || 'I apologize, but I encountered an issue processing your request.',
        data: data.queryResults,
        timestamp: new Date().toISOString()
      }

      // Add AI response via context (auto-saved with proper scoping)
      addMessage(aiMessage)
    } catch (error) {
      console.error('AI Widget error:', error)

      // Fallback response
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
        error: true,
        timestamp: new Date().toISOString()
      }

      // Add error message via context
      addMessage(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleClearConversation = () => {
    // Use context method (handles all cleanup including localStorage)
    clearMessages()
  }

  /**
   * Handle bridge to Command Center with conversation sync
   * Syncs current Widget conversation to Command Center and navigates with conversation ID
   */
  const handleBridgeToCommandCenter = async () => {
    if (!user?.id) {
      console.warn('[AIWidget] User not authenticated, cannot sync conversation');
      router.push('/dashboard/ai-command-center');
      return;
    }

    if (messages.length === 0) {
      // No messages to sync, just navigate
      router.push('/dashboard/ai-command-center');
      return;
    }

    try {
      setIsSyncing(true);

      // Create sync service instance
      const sync = createConversationSync(user.id, barbershopId);

      // Sync Widget conversation to Command Center
      const result = await sync.syncWidgetToCommandCenter();

      if (result.success && result.conversationId) {
        console.log(`[AIWidget] ✅ Synced conversation: ${result.conversationId}`);

        // Navigate to Command Center with conversation ID as query parameter
        router.push(`/dashboard/ai-command-center?conversation=${result.conversationId}`);
      } else {
        console.warn('[AIWidget] Sync completed but no conversation ID returned');
        router.push('/dashboard/ai-command-center');
      }
    } catch (error) {
      console.error('[AIWidget] Failed to sync conversation:', error);
      // Still navigate even if sync fails
      router.push('/dashboard/ai-command-center');
    } finally {
      setIsSyncing(false);
    }
  }

  // Don't render until mounted (prevents hydration issues)
  if (!mounted) {
    return null
  }

  // Hide widget on AI Command Center page (avoid redundancy)
  if (isCommandCenterPage) {
    return null
  }

  // Position classes
  const positionClasses = position === 'bottom-left'
    ? 'bottom-6 left-6'
    : 'bottom-6 right-6'

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {/* Floating Button (collapsed state) */}
      {!isOpen && (
        <button
          onClick={toggleWidget}
          className={`
            group relative
            w-14 h-14 rounded-full shadow-lg
            bg-olive-600 dark:bg-olive-500
            hover:bg-olive-700 dark:hover:bg-olive-600
            hover:scale-110
            text-white
            transition-all duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2
            dark:focus:ring-olive-400 dark:focus:ring-offset-gray-900
          `}
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
        >
          <SparklesIcon className="w-6 h-6 mx-auto animate-pulse" />

          {/* Notification badge (if new messages) */}
          {messages.length > 0 && (
            <span className={`
              absolute -top-1 -right-1
              w-5 h-5 rounded-full
              bg-moss-500 dark:bg-moss-400
              text-white text-xs font-bold
              flex items-center justify-center
              border-2 border-background dark:border-gray-900
            `}>
              {messages.length}
            </span>
          )}

          {/* Hover tooltip */}
          <span className={`
            absolute bottom-full right-0 mb-2
            px-3 py-1 rounded-lg
            bg-gray-900 dark:bg-gray-700
            text-white text-sm whitespace-nowrap
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            pointer-events-none
          `}>
            Ask me anything!
          </span>
        </button>
      )}

      {/* Chat Panel (expanded state) */}
      {isOpen && (
        <div
          className={`
            flex flex-col

            /* Desktop: Fixed size panel */
            w-[400px] h-[600px]

            /* Mobile: Full screen modal */
            md:w-[400px] md:h-[600px]
            max-md:fixed max-md:inset-0 max-md:w-full max-md:h-full max-md:rounded-none max-md:bottom-0 max-md:right-0

            rounded-lg shadow-2xl
            bg-background dark:bg-card
            border border-border dark:border-gray-700
            overflow-hidden
            transition-all duration-300 ease-in-out
            ${isMinimized ? 'h-14 max-md:h-14' : 'h-[600px] max-md:h-full'}

            /* Mobile: Slide up animation */
            max-md:animate-in max-md:slide-in-from-bottom
          `}
        >
          {/* Header */}
          <div className={`
            flex items-center justify-between
            px-4 py-3
            bg-olive-600 dark:bg-olive-700
            text-white
            border-b border-olive-700 dark:border-olive-800
          `}>
            <div className="flex items-center space-x-2">
              <SparklesIcon className="w-5 h-5" />
              <h3 className="font-semibold">AI Business Assistant</h3>
            </div>

            <div className="flex items-center space-x-1">
              {/* Minimize button */}
              <button
                onClick={toggleMinimize}
                className={`
                  p-2 rounded
                  hover:bg-olive-700 dark:hover:bg-olive-800
                  transition-colors
                  min-h-[44px] min-w-[44px] flex items-center justify-center
                  md:min-h-0 md:min-w-0 md:p-1
                `}
                aria-label={isMinimized ? 'Expand' : 'Minimize'}
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <MinusIcon className="w-5 h-5 md:w-4 md:h-4" />
              </button>

              {/* Close button */}
              <button
                onClick={toggleWidget}
                className={`
                  p-2 rounded
                  hover:bg-olive-700 dark:hover:bg-olive-800
                  transition-colors
                  min-h-[44px] min-w-[44px] flex items-center justify-center
                  md:min-h-0 md:min-w-0 md:p-1
                `}
                aria-label="Close"
                title="Close"
              >
                <XMarkIcon className="w-5 h-5 md:w-4 md:h-4" />
              </button>
            </div>
          </div>

          {/* Chat content (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div className={`
                flex-1 overflow-y-auto p-4 space-y-4
                bg-gray-50 dark:bg-gray-900
              `}>
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    <ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Ask me about your business!</p>
                    <p className="text-sm mt-2">
                      I can help with revenue, appointments, customers, and more.
                    </p>

                    {/* Quick action suggestions - Touch optimized on mobile */}
                    <div className="mt-6 space-y-2">
                      <button
                        onClick={() => setInputValue("What's my revenue this week?")}
                        className={`
                          w-full text-left px-4 py-3 rounded-lg
                          bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-700 dark:text-gray-300
                          hover:border-olive-500 dark:hover:border-olive-400
                          transition-colors text-sm
                          min-h-[44px] flex items-center
                        `}
                      >
                        💰 What's my revenue this week?
                      </button>
                      <button
                        onClick={() => setInputValue("How many appointments do I have today?")}
                        className={`
                          w-full text-left px-4 py-3 rounded-lg
                          bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-700 dark:text-gray-300
                          hover:border-olive-500 dark:hover:border-olive-400
                          transition-colors text-sm
                          min-h-[44px] flex items-center
                        `}
                      >
                        📅 How many appointments today?
                      </button>
                      <button
                        onClick={() => setInputValue("Show me my top customers")}
                        className={`
                          w-full text-left px-4 py-3 rounded-lg
                          bg-white dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-700 dark:text-gray-300
                          hover:border-olive-500 dark:hover:border-olive-400
                          transition-colors text-sm
                          min-h-[44px] flex items-center
                        `}
                      >
                        👥 Show me my top customers
                      </button>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`
                        max-w-[85%] rounded-lg px-4 py-2
                        ${message.role === 'user'
                          ? 'bg-olive-600 dark:bg-olive-500 text-white'
                          : message.error
                          ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                          : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                        }
                      `}
                    >
                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                      <div className={`
                        text-xs mt-1
                        ${message.role === 'user'
                          ? 'text-white/70'
                          : 'text-gray-500 dark:text-gray-400'
                        }
                      `}>
                        {new Date(message.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className={`
                      bg-white dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700
                      rounded-lg px-4 py-3
                    `}>
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className={`
                border-t border-border dark:border-gray-700
                p-4
                bg-background dark:bg-card
              `}>
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your business data..."
                    disabled={isLoading}
                    className={`
                      flex-1 px-4 py-2 rounded-lg
                      bg-gray-100 dark:bg-gray-800
                      border border-gray-300 dark:border-gray-600
                      text-gray-900 dark:text-gray-100
                      placeholder-gray-500 dark:placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-olive-500 dark:focus:ring-olive-400
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-colors
                    `}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    className={`
                      px-4 py-2 rounded-lg
                      bg-olive-600 dark:bg-olive-500
                      hover:bg-olive-700 dark:hover:bg-olive-600
                      text-white
                      disabled:opacity-50 disabled:cursor-not-allowed
                      focus:outline-none focus:ring-2 focus:ring-olive-500 dark:focus:ring-olive-400
                      transition-colors
                      min-h-[44px] min-w-[44px] flex items-center justify-center
                    `}
                    aria-label="Send message"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>Press Enter to send</span>
                  {messages.length > 0 && (
                    <button
                      onClick={handleClearConversation}
                      className="hover:text-olive-600 dark:hover:text-olive-400 transition-colors"
                    >
                      Clear conversation
                    </button>
                  )}
                </div>
              </div>

              {/* Bridge to Command Center (after 5 messages) */}
              {messages.length >= 5 && (
                <div className="px-4 py-3 bg-olive-50 dark:bg-olive-900/20 border-t border-olive-200 dark:border-olive-700">
                  <button
                    onClick={handleBridgeToCommandCenter}
                    disabled={isSyncing}
                    className={`
                      w-full flex items-center justify-center gap-2 text-sm
                      ${isSyncing
                        ? 'text-olive-500 dark:text-olive-500 cursor-wait'
                        : 'text-olive-700 dark:text-olive-400 hover:text-olive-900 dark:hover:text-olive-300'
                      }
                      transition-colors py-2 rounded-lg hover:bg-olive-100 dark:hover:bg-olive-900/30
                      disabled:opacity-75
                    `}
                    title={isSyncing ? 'Syncing conversation...' : 'Continue in Command Center'}
                  >
                    {isSyncing ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                        <span className="font-medium">Syncing conversation...</span>
                      </>
                    ) : (
                      <>
                        <ChartBarIcon className="h-4 w-4" />
                        <span className="font-medium">Continue in Command Center →</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

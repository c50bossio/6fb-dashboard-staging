'use client'

import { 
  SparklesIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'

const MAX_MESSAGES = 50  // Limit message history to prevent memory bloat
const SESSION_STORAGE_KEY = 'ai_chat_session_id'
const MESSAGE_STORAGE_KEY = 'ai_chat_messages'
const CACHE_TTL = 30 * 60 * 1000  // 30 minutes cache TTL
const DEBOUNCE_DELAY = 300  // Debounce user input

export default function OptimizedFloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hi! I'm your AI business assistant. Ask me about your barbershop's performance, bookings, or how to improve your business!",
      timestamp: Date.now()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [showRating, setShowRating] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  
  // Refs for cleanup and performance
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  const debounceTimeoutRef = useRef(null)
  const messageInputRef = useRef(null)
  const analyticsQueueRef = useRef([])
  
  // Memoized session initialization to prevent re-creation
  const initializeSession = useCallback(() => {
    try {
      let existingSession = localStorage.getItem(SESSION_STORAGE_KEY)
      
      if (existingSession) {
        // Validate session format
        if (!existingSession.startsWith('persistent_session_')) {
          existingSession = null
        }
      }
      
      if (!existingSession) {
        const newSessionId = `persistent_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, newSessionId)
          existingSession = newSessionId
        } catch (e) {
          // LocalStorage full or disabled, use in-memory session
          existingSession = newSessionId
        }
      }
      
      setSessionId(existingSession)
      return existingSession
    } catch (e) {
      // Fallback for environments without localStorage
      const fallbackSession = `temp_session_${Date.now()}`
      setSessionId(fallbackSession)
      return fallbackSession
    }
  }, [])
  
  // Load cached messages with TTL check
  const loadCachedMessages = useCallback(() => {
    try {
      const cached = localStorage.getItem(MESSAGE_STORAGE_KEY)
      if (cached) {
        const { messages: cachedMessages, timestamp } = JSON.parse(cached)
        
        // Check if cache is still valid
        if (Date.now() - timestamp < CACHE_TTL && Array.isArray(cachedMessages)) {
          // Limit cached messages and ensure they have required fields
          const validMessages = cachedMessages
            .filter(msg => msg.id && msg.type && msg.content && msg.timestamp)
            .slice(-MAX_MESSAGES)
          
          if (validMessages.length > 0) {
            setMessages(validMessages)
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load cached messages:', e)
    }
  }, [])
  
  // Cache messages with size limit
  const cacheMessages = useCallback((messagesToCache) => {
    try {
      const cacheData = {
        messages: messagesToCache.slice(-MAX_MESSAGES),  // Keep only recent messages
        timestamp: Date.now()
      }
      
      const serialized = JSON.stringify(cacheData)
      
      // Check serialized size (limit to 500KB)
      if (serialized.length < 500000) {
        localStorage.setItem(MESSAGE_STORAGE_KEY, serialized)
      } else {
        console.warn('Message cache too large, skipping cache update')
      }
    } catch (e) {
      // LocalStorage full or disabled, clear old data and try again
      try {
        localStorage.removeItem(MESSAGE_STORAGE_KEY)
        localStorage.removeItem('ai_chat_old_data')  // Clear any old keys
      } catch (clearError) {
        console.warn('Could not clear storage:', clearError)
      }
    }
  }, [])
  
  // Initialize session and load messages on mount
  useEffect(() => {
    const session = initializeSession()
    loadCachedMessages()
    
    return () => {
      // Cleanup on unmount
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [initializeSession, loadCachedMessages])
  
  // Optimized scroll to bottom with debouncing
  const scrollToBottom = useCallback(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      })
    }, 100)
  }, [])

  // Auto-scroll when messages change (debounced)
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])
  
  // Cache messages when they change
  useEffect(() => {
    if (messages.length > 1) {  // Don't cache just the initial message
      cacheMessages(messages)
    }
  }, [messages, cacheMessages])
  
  // Batch analytics to reduce API calls
  const flushAnalytics = useCallback(async () => {
    if (analyticsQueueRef.current.length === 0) return
    
    const batch = analyticsQueueRef.current.splice(0)  // Take all queued items
    
    try {
      await fetch('/api/ai/analytics/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch })
      })
    } catch (error) {
      console.warn('Batch analytics failed:', error)
      // Don't re-queue on failure to prevent infinite loops
    }
  }, [])
  
  // Queue analytics event
  const queueAnalytics = useCallback((event) => {
    analyticsQueueRef.current.push({
      ...event,
      timestamp: Date.now(),
      sessionId: sessionId
    })
    
    // Flush batch when it gets large enough or after delay
    if (analyticsQueueRef.current.length >= 5) {
      flushAnalytics()
    } else {
      // Flush after 5 seconds if batch not full
      setTimeout(flushAnalytics, 5000)
    }
  }, [sessionId, flushAnalytics])
  
  // Optimized message sending with abort controller
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || isLoading || !sessionId) return

    // Validate message length
    if (message.length > 2000) {
      alert('Message too long. Please keep it under 2000 characters.')
      return
    }

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message.trim(),
      timestamp: Date.now()
    }

    // Update messages optimistically
    setMessages(prev => {
      const updated = [...prev, userMessage]
      return updated.slice(-MAX_MESSAGES)  // Keep only recent messages
    })
    
    const currentMessage = message
    setMessage('')
    setIsLoading(true)
    
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const startTime = Date.now()
      
      // Call AI API with timeout and abort signal
      const response = await fetch('/api/ai/analytics-enhanced-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          session_id: sessionId,
          business_context: {
            shop_name: 'Demo Barbershop',
            customer_count: 150,
            monthly_revenue: 5000,
            location: 'Downtown',
            staff_count: 3,
            barbershop_id: 'demo'
          },
          barbershop_id: 'demo'
        }),
        signal: abortControllerRef.current.signal
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const responseTime = (Date.now() - startTime) / 1000
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.response || data.message || "I'm here to help! What would you like to know about your business?",
        timestamp: Date.now(),
        provider: data.agent_details?.primary_agent || 'FloatingChat'
      }

      setMessages(prev => {
        const updated = [...prev, aiMessage]
        return updated.slice(-MAX_MESSAGES)  // Prevent memory bloat
      })
      
      // Queue analytics (batched)
      queueAnalytics({
        action: 'track_conversation',
        data: {
          agent: data.agent_details?.primary_agent || 'FloatingChat',
          topic: data.message_type || 'general',
          responseTime: responseTime,
          userId: 'demo_user'
        }
      })
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled')
        return  // Don't show error message for cancelled requests
      }
      
      console.error('AI Chat error:', error)
      
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: "I'm having trouble connecting right now. Try asking me about your bookings, revenue, or customer insights!",
        timestamp: Date.now(),
        error: true
      }
      
      setMessages(prev => {
        const updated = [...prev, errorMessage]
        return updated.slice(-MAX_MESSAGES)
      })
      
      // Queue error analytics
      queueAnalytics({
        action: 'track_error',
        data: {
          error: error.message,
          agent: 'FloatingChat'
        }
      })
      
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
      
      // Focus back on input for better UX
      setTimeout(() => {
        messageInputRef.current?.focus()
      }, 100)
    }
  }, [message, isLoading, sessionId, queueAnalytics])

  // Optimized key press handler
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }, [handleSendMessage])

  // Optimized rating handler with batching
  const handleRating = useCallback(async (messageId, rating) => {
    try {
      // Queue rating analytics
      queueAnalytics({
        action: 'track_satisfaction',
        data: {
          rating: rating,
          agent: 'FloatingChat',
          topic: 'general',
          messageId: messageId
        }
      })
      
      setShowRating(null)
      
      // Update the message to show it was rated (optimistic update)
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, rated: rating }
          : msg
      ))
    } catch (error) {
      console.warn('Rating tracking failed:', error)
    }
  }, [queueAnalytics])
  
  // Memoize expensive rendering operations
  const memoizedMessages = useMemo(() => {
    return messages.map((msg) => (
      <div
        key={msg.id}
        className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
            msg.type === 'user'
              ? 'bg-amber-600 text-white rounded-br-sm'
              : `bg-gray-100 text-gray-800 rounded-bl-sm ${msg.error ? 'border-l-4 border-red-400' : ''}`
          }`}
        >
          {msg.content}
          
          {/* Rating component for assistant messages */}
          {msg.type === 'assistant' && msg.id > 1 && !msg.rated && !msg.error && showRating !== msg.id && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <button
                onClick={() => setShowRating(msg.id)}
                className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                Rate this response
              </button>
            </div>
          )}
          
          {/* Rating interface */}
          {showRating === msg.id && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-2">How helpful was this response?</p>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => handleRating(msg.id, rating)}
                    className="text-lg hover:text-yellow-500 transition-colors focus:outline-none"
                    aria-label={`Rate ${rating} stars`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Rated confirmation */}
          {msg.rated && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Rated: {Array(msg.rated).fill('⭐').join('')} Thanks for your feedback!
              </p>
            </div>
          )}
          
          {/* Provider badge for debugging */}
          {msg.provider && msg.type === 'assistant' && (
            <div className="mt-1">
              <span className="text-xs text-gray-400 bg-gray-200 px-1 rounded">
                {msg.provider}
              </span>
            </div>
          )}
        </div>
      </div>
    ))
  }, [messages, showRating, handleRating])

  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Clear debounce timers
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
      
      // Flush remaining analytics
      flushAnalytics()
    }
  }, [flushAnalytics])

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-amber-600 hover:bg-amber-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 z-40 group focus:outline-none focus:ring-2 focus:ring-amber-500"
          aria-label="Open AI Assistant Chat"
        >
          <SparklesIcon className="h-6 w-6" />
          <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            AI
          </div>
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            Chat with AI Assistant
          </div>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-xl">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant</h3>
              <div className="bg-green-400 text-green-900 text-xs px-2 py-0.5 rounded-full font-bold">
                Online
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors focus:outline-none focus:bg-white/20"
              aria-label="Close chat"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {memoizedMessages}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                ref={messageInputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your business..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
                disabled={isLoading}
                maxLength={2000}
                aria-label="Message input"
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500"
                aria-label="Send message"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
            
            {/* Character counter */}
            <div className="mt-1 text-xs text-gray-500 text-right">
              {message.length}/2000
            </div>
            
            <div className="mt-2 text-center">
              <button 
                onClick={() => window.location.href = '/ai-agents'}
                className="text-xs text-amber-600 hover:text-amber-700 flex items-center justify-center space-x-1 transition-colors focus:outline-none focus:underline"
              >
                <ChatBubbleLeftRightIcon className="h-3 w-3" />
                <span>Open Full AI Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
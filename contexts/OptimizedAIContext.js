'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '../components/SupabaseAuthProvider'

/**
 * Optimized AI Context with selective subscriptions and efficient memory management
 * Features:
 * - Selective context subscriptions to reduce re-renders
 * - Conversation history pagination and cleanup
 * - Efficient caching with TTL
 * - Memory usage monitoring
 */

// Split context into smaller, focused contexts
const AIStateContext = createContext()
const AIActionsContext = createContext()
const AIConversationContext = createContext()
const AISystemContext = createContext()

// Constants for memory management
const MAX_CONVERSATION_HISTORY = 100
const CONVERSATION_CLEANUP_THRESHOLD = 150
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MEMORY_CHECK_INTERVAL = 30 * 1000 // 30 seconds

/**
 * Optimized AI Provider with split contexts
 */
export function OptimizedAIProvider({ children }) {
  const { user } = useAuth()
  
  // Core state management
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [currentSession, setCurrentSession] = useState(null)
  
  // System health (infrequently changing)
  const [systemHealth, setSystemHealth] = useState({
    status: 'healthy',
    lastChecked: Date.now(),
    agents: { active: 0, total: 0 },
    api: { healthy: true, response_time: 0 }
  })
  
  // Conversation state with memory management
  const [conversationState, setConversationState] = useState({
    messages: [],
    totalMessages: 0,
    currentPage: 1,
    hasMore: false
  })
  
  // Memory management refs
  const conversationHistoryRef = useRef(new Map()) // session_id -> messages[]
  const cacheRef = useRef(new Map()) // cache_key -> { data, timestamp, hits }
  const memoryStatsRef = useRef({ conversations: 0, cacheEntries: 0, lastCleanup: Date.now() })
  
  // Cleanup interval
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      performMemoryCleanup()
    }, MEMORY_CHECK_INTERVAL)
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // Memory cleanup function
  const performMemoryCleanup = useCallback(() => {
    const now = Date.now()
    const stats = memoryStatsRef.current
    
    // Clean expired cache entries
    let cacheCleanedCount = 0
    for (const [key, entry] of cacheRef.current.entries()) {
      if (now - entry.timestamp > CACHE_TTL) {
        cacheRef.current.delete(key)
        cacheCleanedCount++
      }
    }
    
    // Clean old conversation sessions (keep only recent 10)
    const conversationEntries = Array.from(conversationHistoryRef.current.entries())
    if (conversationEntries.length > 10) {
      const sorted = conversationEntries.sort(([,a], [,b]) => 
        b[b.length - 1]?.timestamp || 0 - a[a.length - 1]?.timestamp || 0
      )
      
      // Keep only the 10 most recent sessions
      conversationHistoryRef.current.clear()
      sorted.slice(0, 10).forEach(([sessionId, messages]) => {
        conversationHistoryRef.current.set(sessionId, messages)
      })
    }
    
    // Trim current conversation if too long
    setConversationState(prev => {
      if (prev.messages.length > CONVERSATION_CLEANUP_THRESHOLD) {
        return {
          ...prev,
          messages: prev.messages.slice(-MAX_CONVERSATION_HISTORY),
          totalMessages: prev.totalMessages
        }
      }
      return prev
    })
    
    // Update memory stats
    memoryStatsRef.current = {
      conversations: conversationHistoryRef.current.size,
      cacheEntries: cacheRef.current.size,
      lastCleanup: now,
      lastCleanupRemoved: cacheCleanedCount
    }
    
    console.debug('🧹 Memory cleanup completed', {
      cacheEntriesRemoved: cacheCleanedCount,
      activeConversations: conversationHistoryRef.current.size,
      currentMessages: conversationState.messages.length
    })
  }, [])

  // Efficient cache management with hit tracking
  const getCachedData = useCallback((key) => {
    const entry = cacheRef.current.get(key)
    if (entry && (Date.now() - entry.timestamp < CACHE_TTL)) {
      entry.hits++
      return entry.data
    }
    return null
  }, [])

  const setCachedData = useCallback((key, data) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0
    })
  }, [])

  // Optimized conversation management
  const addMessage = useCallback((message) => {
    setConversationState(prev => {
      const newMessages = [...prev.messages, message]
      
      // Auto-cleanup if exceeding threshold
      const finalMessages = newMessages.length > CONVERSATION_CLEANUP_THRESHOLD
        ? newMessages.slice(-MAX_CONVERSATION_HISTORY)
        : newMessages
      
      return {
        ...prev,
        messages: finalMessages,
        totalMessages: prev.totalMessages + 1
      }
    })
    
    // Store in session history
    if (currentSession) {
      const sessionMessages = conversationHistoryRef.current.get(currentSession) || []
      sessionMessages.push(message)
      conversationHistoryRef.current.set(currentSession, sessionMessages)
    }
  }, [currentSession])

  // Efficient system health checks with caching
  const checkSystemHealth = useCallback(async () => {
    const cacheKey = 'system_health'
    const cached = getCachedData(cacheKey)
    if (cached) return cached
    
    try {
      const response = await fetch('/api/ai/health')
      if (!response.ok) throw new Error('Health check failed')
      
      const healthData = await response.json()
      const optimizedHealth = {
        status: healthData.status || 'healthy',
        lastChecked: Date.now(),
        agents: {
          active: healthData.agents?.active || 0,
          total: healthData.agents?.total || 0
        },
        api: {
          healthy: healthData.api?.healthy || true,
          response_time: healthData.api?.response_time || 0
        }
      }
      
      setCachedData(cacheKey, optimizedHealth)
      setSystemHealth(optimizedHealth)
      return optimizedHealth
    } catch (error) {
      console.error('Health check failed:', error)
      return null
    }
  }, [getCachedData, setCachedData])

  // Load conversation history for a session (paginated)
  const loadConversationHistory = useCallback(async (sessionId, page = 1) => {
    const cacheKey = `conversation_${sessionId}_${page}`
    const cached = getCachedData(cacheKey)
    if (cached) {
      setConversationState(prev => ({ ...prev, ...cached }))
      return cached
    }
    
    // Check in-memory storage first
    const sessionMessages = conversationHistoryRef.current.get(sessionId)
    if (sessionMessages) {
      const pageSize = 20
      const start = (page - 1) * pageSize
      const paginatedMessages = sessionMessages.slice(start, start + pageSize)
      
      const result = {
        messages: paginatedMessages,
        currentPage: page,
        hasMore: start + pageSize < sessionMessages.length,
        totalMessages: sessionMessages.length
      }
      
      setCachedData(cacheKey, result)
      setConversationState(prev => ({ ...prev, ...result }))
      return result
    }
    
    return { messages: [], currentPage: 1, hasMore: false, totalMessages: 0 }
  }, [getCachedData, setCachedData])

  // Optimized chat function with intelligent caching
  const chatWithAgent = useCallback(async (message, options = {}) => {
    const { sessionId, agentType, useCache = true } = options
    
    // Check cache for similar recent queries
    const cacheKey = useCache ? `chat_${message.substring(0, 50)}_${agentType}` : null
    const cached = cacheKey ? getCachedData(cacheKey) : null
    
    if (cached) {
      addMessage({
        role: 'assistant',
        content: cached.response,
        timestamp: new Date().toISOString(),
        fromCache: true,
        provider: cached.provider
      })
      return cached
    }
    
    try {
      setLoading(true)
      setError(null)
      
      // Add user message immediately
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      }
      addMessage(userMessage)
      
      const response = await fetch('/api/ai/enhanced-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          sessionId: sessionId || currentSession,
          agentType,
          context: { userId: user?.id }
        })
      })
      
      if (!response.ok) throw new Error(`Chat failed: ${response.status}`)
      
      const result = await response.json()
      
      // Add AI response
      const aiMessage = {
        role: 'assistant',
        content: result.response,
        timestamp: result.timestamp,
        provider: result.provider,
        confidence: result.confidence,
        fromCache: false
      }
      addMessage(aiMessage)
      
      // Cache successful responses
      if (cacheKey && result.success) {
        setCachedData(cacheKey, result)
      }
      
      return result
    } catch (error) {
      console.error('Chat error:', error)
      setError(error.message)
      
      // Add fallback message
      const fallbackMessage = {
        role: 'assistant',
        content: 'I apologize, but I\'m having trouble processing your request right now. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      }
      addMessage(fallbackMessage)
      
      throw error
    } finally {
      setLoading(false)
    }
  }, [user, currentSession, addMessage, getCachedData, setCachedData])

  // Get memory statistics
  const getMemoryStats = useCallback(() => {
    return {
      ...memoryStatsRef.current,
      currentMessages: conversationState.messages.length,
      cacheHitRate: calculateCacheHitRate()
    }
  }, [conversationState.messages.length])

  const calculateCacheHitRate = useCallback(() => {
    let totalHits = 0
    let totalEntries = 0
    
    for (const entry of cacheRef.current.values()) {
      totalHits += entry.hits
      totalEntries++
    }
    
    return totalEntries > 0 ? (totalHits / totalEntries).toFixed(2) : 0
  }, [])

  // Memoized values to prevent unnecessary re-renders
  const stateValue = useMemo(() => ({
    loading,
    error,
    currentSession
  }), [loading, error, currentSession])

  const actionsValue = useMemo(() => ({
    chatWithAgent,
    setCurrentSession,
    setError: (error) => setError(error),
    clearError: () => setError(null)
  }), [chatWithAgent])

  const conversationValue = useMemo(() => ({
    ...conversationState,
    addMessage,
    loadConversationHistory
  }), [conversationState, addMessage, loadConversationHistory])

  const systemValue = useMemo(() => ({
    systemHealth,
    checkSystemHealth,
    getMemoryStats,
    performMemoryCleanup
  }), [systemHealth, checkSystemHealth, getMemoryStats, performMemoryCleanup])

  return (
    <AIStateContext.Provider value={stateValue}>
      <AIActionsContext.Provider value={actionsValue}>
        <AIConversationContext.Provider value={conversationValue}>
          <AISystemContext.Provider value={systemValue}>
            {children}
          </AISystemContext.Provider>
        </AIConversationContext.Provider>
      </AIActionsContext.Provider>
    </AIStateContext.Provider>
  )
}

// Selective hooks for different aspects of AI functionality
export const useAIState = () => {
  const context = useContext(AIStateContext)
  if (!context) {
    throw new Error('useAIState must be used within OptimizedAIProvider')
  }
  return context
}

export const useAIActions = () => {
  const context = useContext(AIActionsContext)
  if (!context) {
    throw new Error('useAIActions must be used within OptimizedAIProvider')
  }
  return context
}

export const useAIConversation = () => {
  const context = useContext(AIConversationContext)
  if (!context) {
    throw new Error('useAIConversation must be used within OptimizedAIProvider')
  }
  return context
}

export const useAISystem = () => {
  const context = useContext(AISystemContext)
  if (!context) {
    throw new Error('useAISystem must be used within OptimizedAIProvider')
  }
  return context
}

// Composite hook for backward compatibility (use sparingly)
export const useOptimizedAI = () => {
  const state = useAIState()
  const actions = useAIActions()
  const conversation = useAIConversation()
  const system = useAISystem()
  
  return { ...state, ...actions, ...conversation, ...system }
}
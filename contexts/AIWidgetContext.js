'use client'

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

/**
 * AIWidgetContext
 *
 * Global state management for the AI Widget to enable:
 * - Persistent widget state across page navigation
 * - Cross-component widget control (open/close from anywhere)
 * - Conversation history synchronization
 * - Widget preferences (position, behavior)
 *
 * Usage:
 * ```jsx
 * import { useAIWidget } from '@/contexts/AIWidgetContext'
 *
 * function MyComponent() {
 *   const { openWidget, sendMessage } = useAIWidget()
 *
 *   return (
 *     <button onClick={() => sendMessage("What's my revenue?")}>
 *       Ask AI
 *     </button>
 *   )
 * }
 * ```
 */

const AIWidgetContext = createContext(undefined)

export function AIWidgetProvider({ children }) {
  // Get user from auth context
  const { user } = useAuth()

  // Widget state
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState([])
  const [position, setPosition] = useState('bottom-right') // 'bottom-right' | 'bottom-left'
  const [barbershopContext, setBarbershopContext] = useState(null)

  // Helper function to get user-scoped storage key (now includes barbershop context)
  const getStorageKey = useCallback((key) => {
    if (!user?.id) return `ai-widget-${key}` // Fallback for unauthenticated

    // Include barbershop context for location-specific conversations
    if (barbershopContext) {
      return `ai-widget-${key}-${user.id}-${barbershopContext}` // User + Barbershop scoped
    }

    return `ai-widget-${key}-${user.id}` // User-scoped key (backward compatible)
  }, [user?.id, barbershopContext])

  // Load persisted state from localStorage on mount (user-scoped + validation)
  useEffect(() => {
    if (!user) return // Don't load until we know the user

    try {
      const stateKey = getStorageKey('state')
      const messagesKey = getStorageKey('conversation')

      // STALE DATA VALIDATION: Check if loaded data matches current context
      const savedState = localStorage.getItem(stateKey)
      if (savedState) {
        const parsed = JSON.parse(savedState)

        // Validate state belongs to current user + barbershop context
        const isValidContext = stateKey.includes(user.id) &&
          (!barbershopContext || stateKey.includes(barbershopContext))

        if (isValidContext) {
          setIsOpen(parsed.isOpen || false)
          setIsMinimized(parsed.isMinimized || false)
          setPosition(parsed.position || 'bottom-right')
        } else {
          // Stale state from different context - remove it
          localStorage.removeItem(stateKey)
          console.log(`[AI Widget] Removed stale state: ${stateKey}`)
        }
      }

      const savedMessages = localStorage.getItem(messagesKey)
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages)

        // Validate messages belong to current user + barbershop context
        const isValidContext = messagesKey.includes(user.id) &&
          (!barbershopContext || messagesKey.includes(barbershopContext))

        if (isValidContext) {
          setMessages(parsed)
        } else {
          // Stale messages from different context - remove them
          localStorage.removeItem(messagesKey)
          console.log(`[AI Widget] Removed stale messages: ${messagesKey}`)
        }
      }

      // CLEANUP LEGACY KEYS: Remove old global keys if they exist
      const legacyKeys = ['ai-widget-conversation', 'ai-widget-state']
      legacyKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key)
          console.log(`[AI Widget] Removed legacy key: ${key}`)
        }
      })

    } catch (err) {
      console.error('Failed to load AI Widget state:', err)
    }
  }, [user, getStorageKey, barbershopContext])

  // Save state to localStorage when it changes (user-scoped)
  useEffect(() => {
    if (!user) return

    try {
      const stateKey = getStorageKey('state')
      localStorage.setItem(stateKey, JSON.stringify({
        isOpen,
        isMinimized,
        position
      }))
    } catch (err) {
      console.error('Failed to save AI Widget state:', err)
    }
  }, [isOpen, isMinimized, position, user, getStorageKey])

  // Save messages to localStorage when they change (user-scoped)
  useEffect(() => {
    if (!user || messages.length === 0) return

    try {
      const messagesKey = getStorageKey('conversation')
      localStorage.setItem(messagesKey, JSON.stringify(messages))
    } catch (err) {
      console.error('Failed to save AI Widget conversation:', err)
    }
  }, [messages, user, getStorageKey])

  // Widget control methods
  const openWidget = useCallback(() => {
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const closeWidget = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleWidget = useCallback(() => {
    setIsOpen(prev => !prev)
    if (isMinimized) {
      setIsMinimized(false)
    }
  }, [isMinimized])

  const minimizeWidget = useCallback(() => {
    setIsMinimized(true)
  }, [])

  const maximizeWidget = useCallback(() => {
    setIsMinimized(false)
  }, [])

  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev)
  }, [])

  // Message management methods
  const addMessage = useCallback((message) => {
    setMessages(prev => [...prev, {
      ...message,
      id: message.id || Date.now(),
      timestamp: message.timestamp || new Date().toISOString()
    }])
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])

    // Remove conversation from localStorage (context-aware)
    if (user?.id) {
      const messagesKey = getStorageKey('conversation')
      localStorage.removeItem(messagesKey)

      // Also remove any legacy keys for this user
      if (barbershopContext) {
        // Remove both barbershop-scoped and user-only scoped versions
        localStorage.removeItem(`ai-widget-conversation-${user.id}-${barbershopContext}`)
        localStorage.removeItem(`ai-widget-conversation-${user.id}`)
      }
    }

    // Always remove global legacy keys
    localStorage.removeItem('ai-widget-conversation')
    localStorage.removeItem('ai-widget-messages')

    console.log('[AI Widget] Conversation cleared')
  }, [user, getStorageKey, barbershopContext])

  const sendMessage = useCallback((content) => {
    openWidget()
    addMessage({
      role: 'user',
      content
    })
  }, [openWidget, addMessage])

  // Position management
  const setWidgetPosition = useCallback((newPosition) => {
    setPosition(newPosition)
  }, [])

  // Context management
  const updateBarbershopContext = useCallback((context) => {
    // Clear messages when switching barbershops (industry standard: Intercom, Drift)
    if (barbershopContext && context !== barbershopContext) {
      setMessages([])

      // Remove old barbershop-scoped conversation from localStorage
      if (user?.id) {
        const oldMessagesKey = `ai-widget-conversation-${user.id}-${barbershopContext}`
        localStorage.removeItem(oldMessagesKey)
      }
    }

    setBarbershopContext(context)
  }, [barbershopContext, user?.id])

  // Monitor auth state changes and clear widget on logout (Intercom standard)
  useEffect(() => {
    // Clear widget when user logs out
    if (!user) {
      setMessages([])
      setIsOpen(false)
      setIsMinimized(false)
      setBarbershopContext(null)

      // AGGRESSIVE CLEANUP: Remove ALL AI widget localStorage keys
      // This prevents stale conversations from persisting across sessions
      try {
        // Remove all known legacy key patterns
        const legacyKeys = [
          'ai-widget-conversation',          // Original global key (bug source)
          'ai-widget-state',                 // Original global state
          'ai-widget-messages',              // Potential alternate key
        ]

        legacyKeys.forEach(key => {
          localStorage.removeItem(key)
        })

        // Remove ALL ai-widget-* keys (user-scoped, barbershop-scoped, etc.)
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('ai-widget-')) {
            localStorage.removeItem(key)
            console.log(`[AI Widget] Cleaned up key on logout: ${key}`)
          }
        })

        console.log('[AI Widget] All conversation data cleared on logout')
      } catch (err) {
        console.error('Failed to clean up widget state on logout:', err)
      }
    }
  }, [user])

  // Export keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeydown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        toggleWidget()
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [toggleWidget])

  const value = {
    // State
    isOpen,
    isMinimized,
    messages,
    position,
    barbershopContext,

    // Control methods
    openWidget,
    closeWidget,
    toggleWidget,
    minimizeWidget,
    maximizeWidget,
    toggleMinimize,

    // Message methods
    addMessage,
    clearMessages,
    sendMessage,

    // Settings methods
    setWidgetPosition,
    updateBarbershopContext
  }

  return (
    <AIWidgetContext.Provider value={value}>
      {children}
    </AIWidgetContext.Provider>
  )
}

/**
 * Hook to access AI Widget context
 *
 * @returns {Object} AI Widget state and methods
 * @throws {Error} If used outside AIWidgetProvider
 */
export function useAIWidget() {
  const context = useContext(AIWidgetContext)

  if (context === undefined) {
    throw new Error('useAIWidget must be used within AIWidgetProvider')
  }

  return context
}

export default AIWidgetContext

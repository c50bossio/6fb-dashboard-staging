'use client'

import { 
  PaperAirplaneIcon, 
  StopIcon,
  SparklesIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { getStreamingClient } from '@/lib/ai-streaming-client'
import CacheStatsModal from './CacheStatsModal'

/**
 * Virtual Scrolling AI Chat Component
 * Optimized for large message histories with efficient rendering
 */
export default function VirtualScrollChat({
  className = '',
  height = '600px',
  placeholder = 'Ask me anything about your business...',
  showAgentSelector = true,
  persistConversation = true,
  itemHeight = 80, // Estimated height per message
  overscan = 5, // Number of items to render outside viewport
  onMessage = null,
}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('auto')
  const [sessionId, setSessionId] = useState(null)
  const [error, setError] = useState(null)
  const [showCacheStats, setShowCacheStats] = useState(false)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [containerHeight, setContainerHeight] = useState(500)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const streamControllerRef = useRef(null)
  const streamingClient = useMemo(() => getStreamingClient(), [])
  const resizeObserverRef = useRef(null)

  const { visibleItems, totalHeight, scrollTop } = useMemo(() => {
    const totalMessages = messages.length + (streamingMessage ? 1 : 0)
    const containerPixelHeight = containerHeight
    const startIndex = Math.max(0, Math.floor(scrollPosition / itemHeight) - overscan)
    const endIndex = Math.min(
      totalMessages,
      Math.ceil((scrollPosition + containerPixelHeight) / itemHeight) + overscan
    )
    
    const visibleMessages = []
    
    for (let i = startIndex; i < Math.min(endIndex, messages.length); i++) {
      visibleMessages.push({
        ...messages[i],
        index: i,
        top: i * itemHeight
      })
    }
    
    if (streamingMessage && endIndex > messages.length) {
      visibleMessages.push({
        role: 'assistant',
        content: streamingMessage,
        isStreaming: true,
        index: messages.length,
        top: messages.length * itemHeight
      })
    }
    
    return {
      visibleItems: visibleMessages,
      totalHeight: totalMessages * itemHeight,
      scrollTop: scrollPosition
    }
  }, [messages, streamingMessage, scrollPosition, containerHeight, itemHeight, overscan])

  useEffect(() => {
    const storedSessionId = localStorage.getItem('ai_chat_session')
    if (storedSessionId && persistConversation) {
      setSessionId(storedSessionId)
      loadConversationHistory(storedSessionId)
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
      if (persistConversation) {
        localStorage.setItem('ai_chat_session', newSessionId)
      }
    }

    if (messagesContainerRef.current && !resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height)
        }
      })
      resizeObserverRef.current.observe(messagesContainerRef.current)
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [persistConversation])

  const handleScroll = useCallback((e) => {
    const container = e.target
    const newScrollPosition = container.scrollTop
    setScrollPosition(newScrollPosition)
    
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setIsAtBottom(isNearBottom)
    
    if (isNearBottom && unreadCount > 0) {
      setUnreadCount(0)
    }
  }, [unreadCount])

  useEffect(() => {
    if (isAtBottom && messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
    } else if (!isAtBottom) {
      setUnreadCount(prev => prev + 1)
    }
  }, [messages, streamingMessage, isAtBottom])

  const loadConversationHistory = async (sessionId) => {
    try {
      const stored = localStorage.getItem(`ai_conversation_${sessionId}`)
      if (stored) {
        const history = JSON.parse(stored)
        setMessages(history.messages || [])
      }
    } catch (error) {
      console.error('Failed to load conversation history:', error)
    }
  }

  const saveConversation = useCallback(() => {
    if (!persistConversation || !sessionId) return
    
    try {
      localStorage.setItem(`ai_conversation_${sessionId}`, JSON.stringify({
        messages,
        sessionId,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('Failed to save conversation:', error)
    }
  }, [messages, sessionId, persistConversation])

  useEffect(() => {
    saveConversation()
  }, [messages, saveConversation])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    
    if (!input.trim() || isStreaming) return
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setError(null)
    setIsStreaming(true)
    setStreamingMessage('')
    
    const aiMessageId = Date.now() + 1
    
    try {
      streamControllerRef.current = await streamingClient.streamChat(
        userMessage.content,
        {
          sessionId,
          agentId: selectedAgent === 'auto' ? null : selectedAgent,
          context: {
            userId: user?.id,
            shopName: 'Demo Barbershop',
            previousMessages: messages.slice(-5)
          }
        },
        (chunk) => {
          setStreamingMessage(prev => prev + chunk)
        },
        ({ response, fromCache }) => {
          const aiMessage = {
            id: aiMessageId,
            role: 'assistant',
            content: response,
            agent: selectedAgent,
            timestamp: new Date().toISOString(),
            fromCache
          }
          
          setMessages(prev => [...prev, aiMessage])
          setStreamingMessage('')
          setIsStreaming(false)
          
          onMessage?.(aiMessage)
          trackUsage('message_sent', { agent: selectedAgent, fromCache })
        },
        (error) => {
          console.error('Streaming error:', error)
          setError('Failed to get response. Please try again.')
          setIsStreaming(false)
          setStreamingMessage('')
        }
      )
      
    } catch (error) {
      console.error('Chat error:', error)
      setError('Something went wrong. Please try again.')
      setIsStreaming(false)
      setStreamingMessage('')
    }
  }

  const stopStreaming = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
      
      if (streamingMessage) {
        const aiMessage = {
          id: Date.now(),
          role: 'assistant',
          content: streamingMessage + ' [Stopped]',
          agent: selectedAgent,
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
      }
      
      setStreamingMessage('')
      setIsStreaming(false)
    }
  }

  const trackUsage = async (event, data) => {
    try {
      await fetch('/api/ai/analytics/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: event,
          data: {
            ...data,
            sessionId,
            timestamp: Date.now()
          }
        })
      })
    } catch (error) {
      console.warn('Analytics tracking failed:', error)
    }
  }

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      container.scrollTop = container.scrollHeight
      setIsAtBottom(true)
      setUnreadCount(0)
    }
  }

  const agents = [
    { id: 'auto', name: 'Auto Select', icon: SparklesIcon },
    { id: 'marcus', name: 'Marcus (Strategy)', icon: SparklesIcon },
    { id: 'sophia', name: 'Sophia (Marketing)', icon: SparklesIcon },
    { id: 'david', name: 'David (Operations)', icon: SparklesIcon },
  ]

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-lg relative ${className}`} style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-olive-500 to-gold-600 rounded-full flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Business Assistant</h3>
            <p className="text-sm text-gray-500">
              {isStreaming ? 'Thinking...' : `Ready to help • ${messages.length} messages`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {showAgentSelector && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
              disabled={isStreaming}
            >
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          )}
          
          <button
            onClick={() => setShowCacheStats(true)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Cache Statistics"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Virtual Scrolled Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
        onScroll={handleScroll}
        style={{ height: 'calc(100% - 140px)' }}
      >
        <div style={{ height: totalHeight, position: 'relative' }}>
          {visibleItems.length === 0 && !streamingMessage && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium mb-2">Start a conversation</p>
                <p className="text-sm">Ask about bookings, revenue, marketing, or operations</p>
              </div>
            </div>
          )}
          
          {visibleItems.map((message, index) => (
            <div
              key={message.id || `streaming-${index}`}
              style={{
                position: 'absolute',
                top: message.top,
                left: 16,
                right: 16,
                minHeight: itemHeight
              }}
            >
              <MessageBubble message={message} />
            </div>
          ))}
        </div>
        
        {error && (
          <div className="sticky bottom-0 bg-red-50 border border-red-200 text-red-700 px-4 py-3 mx-4 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute right-4 bottom-20 bg-olive-600 text-white p-3 rounded-full shadow-lg hover:bg-olive-700 transition-colors z-10"
        >
          <ChevronDownIcon className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
            disabled={isStreaming}
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={stopStreaming}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <StopIcon className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
      
      {/* Cache Stats Modal */}
      <CacheStatsModal 
        isOpen={showCacheStats} 
        onClose={() => setShowCacheStats(false)} 
      />
    </div>
  )
}

/**
 * Virtual message bubble component
 */
function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`
          max-w-[80%] rounded-lg px-4 py-2
          ${isUser 
            ? 'bg-olive-600 text-white' 
            : 'bg-gray-100 text-gray-900'
          }
          ${message.isStreaming ? 'animate-pulse' : ''}
        `}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center space-x-2">
            {message.isStreaming && (
              <ArrowPathIcon className="h-3 w-3 animate-spin text-current opacity-50" />
            )}
            {message.fromCache && (
              <div className="flex items-center space-x-1">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                <span className="text-xs opacity-75">cached</span>
              </div>
            )}
          </div>
          {message.timestamp && (
            <span className={`text-xs ${isUser ? 'text-olive-100' : 'text-gray-500'}`}>
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
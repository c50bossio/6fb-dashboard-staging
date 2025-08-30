'use client'

import React from 'react'
import { useSelectiveContext } from '@/hooks/useSelectiveContext'
import { useConversationHistory } from '@/lib/ConversationHistoryManager'
import { useAIConversation, useAIActions, useAISystem } from '@/contexts/OptimizedAIContext'

/**
 * Example: Optimized AI Chat Component
 * 
 * This demonstrates how to use the new optimized context patterns
 * to reduce re-renders and improve performance.
 * 
 * Key optimizations:
 * 1. Selective context subscriptions
 * 2. Efficient conversation history management
 * 3. Separated concerns (actions vs data)
 */

export default function OptimizedAIChatExample({ sessionId }) {
  // ✅ OPTIMIZED: Use selective contexts instead of full context
  // Only subscribes to conversation-related data
  const { messages, totalMessages, hasMore } = useAIConversation()
  
  // ✅ OPTIMIZED: Actions in separate context (doesn't re-render when data changes)
  const { chatWithAgent, setCurrentSession } = useAIActions()
  
  // ✅ OPTIMIZED: System data in separate context (rarely changes)
  const { systemHealth } = useAISystem()
  
  // ✅ OPTIMIZED: Efficient conversation history with pagination and caching
  const {
    messages: historyMessages,
    loadMore,
    addMessage,
    hasMore: hasMoreHistory,
    loading: historyLoading
  } = useConversationHistory(sessionId)

  return (
    <div className="optimized-ai-chat">
      <ChatHeader systemHealth={systemHealth} />
      <ConversationView 
        messages={historyMessages} 
        hasMore={hasMoreHistory}
        onLoadMore={loadMore}
        loading={historyLoading}
      />
      <ChatInput 
        onSendMessage={chatWithAgent}
        onNewMessage={addMessage}
      />
    </div>
  )
}

/**
 * Example: Chat Header with selective system health subscription
 */
function ChatHeader({ systemHealth }) {
  // ✅ OPTIMIZED: Component only re-renders when system health changes
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h3 className="text-lg font-semibold">AI Assistant</h3>
        <SystemStatus status={systemHealth?.status} />
      </div>
    </div>
  )
}

/**
 * Example: Conversation view with efficient rendering
 */
function ConversationView({ messages, hasMore, onLoadMore, loading }) {
  return (
    <div className="flex-1 overflow-y-auto p-4">
      {hasMore && (
        <button 
          onClick={onLoadMore}
          disabled={loading}
          className="w-full mb-4 p-2 text-sm text-gray-600 hover:text-gray-800"
        >
          {loading ? 'Loading...' : 'Load previous messages'}
        </button>
      )}
      
      {messages.map((message, index) => (
        <MessageBubble key={message.id || index} message={message} />
      ))}
    </div>
  )
}

/**
 * Example: Chat input with optimized message handling
 */
function ChatInput({ onSendMessage, onNewMessage }) {
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    }

    // Add message immediately to conversation history
    onNewMessage(userMessage)
    setInput('')
    setLoading(true)

    try {
      await onSendMessage(input.trim())
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 px-3 py-2 border rounded-lg"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2 bg-olive-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </form>
  )
}

/**
 * Example: System status with selective updates
 */
function SystemStatus({ status }) {
  const statusColor = status === 'healthy' ? 'green' : status === 'degraded' ? 'yellow' : 'red'
  
  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full bg-${statusColor}-500`} />
      <span className="text-sm text-gray-600 capitalize">{status}</span>
    </div>
  )
}

/**
 * Example: Message bubble with memoization
 */
const MessageBubble = React.memo(({ message }) => {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`
        max-w-[80%] rounded-lg px-4 py-2
        ${isUser ? 'bg-olive-600 text-white' : 'bg-gray-100 text-gray-900'}
      `}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <MessageMetadata message={message} />
      </div>
    </div>
  )
})

/**
 * Example: Message metadata with selective rendering
 */
function MessageMetadata({ message }) {
  if (!message.timestamp) return null
  
  return (
    <div className="flex items-center justify-between mt-1 text-xs opacity-70">
      <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
      <MessageIndicators message={message} />
    </div>
  )
}

/**
 * Example: Message indicators (cached, fallback, etc.)
 */
function MessageIndicators({ message }) {
  return (
    <div className="flex items-center space-x-1">
      {message.fromCache && <CacheIndicator />}
      {message.fromFallback && <FallbackIndicator />}
      {message.provider && <ProviderIndicator provider={message.provider} />}
    </div>
  )
}

const CacheIndicator = () => (
  <div className="flex items-center space-x-1">
    <div className="w-1 h-1 bg-green-400 rounded-full" />
    <span>cached</span>
  </div>
)

const FallbackIndicator = () => (
  <div className="flex items-center space-x-1">
    <div className="w-1 h-1 bg-yellow-400 rounded-full" />
    <span>fallback</span>
  </div>
)

const ProviderIndicator = ({ provider }) => (
  <span className="text-xs">({provider})</span>
)

MessageBubble.displayName = 'MessageBubble'
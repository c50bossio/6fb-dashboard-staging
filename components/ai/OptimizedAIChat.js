'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { 
  PaperAirplaneIcon, 
  StopIcon,
  SparklesIcon,
  ArrowPathIcon 
} from '@heroicons/react/24/outline'
import { getStreamingClient } from '@/lib/ai-streaming-client'
import { useAuth } from '@/components/SupabaseAuthProvider'

/**
 * Optimized AI Chat Component with SSE Streaming
 * Features: Real-time streaming, typing indicators, error recovery
 */
export default function OptimizedAIChat({
  className = '',
  height = '600px',
  placeholder = 'Ask me anything about your business...',
  showAgentSelector = true,
  persistConversation = true,
  enableVoice = false,
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
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const streamControllerRef = useRef(null)
  const streamingClient = useMemo(() => getStreamingClient(), [])

  // Initialize session
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
  }, [persistConversation])

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage, scrollToBottom])

  // Load conversation history
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

  // Save conversation
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

  // Save on message update
  useEffect(() => {
    saveConversation()
  }, [messages, saveConversation])

  // Handle message submission
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
      // Start streaming
      streamControllerRef.current = await streamingClient.streamChat(
        userMessage.content,
        {
          sessionId,
          agentId: selectedAgent === 'auto' ? null : selectedAgent,
          context: {
            userId: user?.id,
            shopName: 'Demo Barbershop', // Replace with actual shop data
            previousMessages: messages.slice(-5) // Last 5 messages for context
          }
        },
        // On chunk callback
        (chunk) => {
          setStreamingMessage(prev => prev + chunk)
        },
        // On complete callback
        ({ response }) => {
          const aiMessage = {
            id: aiMessageId,
            role: 'assistant',
            content: response,
            agent: selectedAgent,
            timestamp: new Date().toISOString()
          }
          
          setMessages(prev => [...prev, aiMessage])
          setStreamingMessage('')
          setIsStreaming(false)
          
          // Callback
          onMessage?.(aiMessage)
          
          // Track analytics
          trackUsage('message_sent', { agent: selectedAgent })
        },
        // On error callback
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

  // Stop streaming
  const stopStreaming = () => {
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
      
      // Save partial message
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

  // Track usage analytics
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

  // Agent options
  const agents = [
    { id: 'auto', name: 'Auto Select', icon: SparklesIcon },
    { id: 'marcus', name: 'Marcus (Strategy)', icon: SparklesIcon },
    { id: 'sophia', name: 'Sophia (Marketing)', icon: SparklesIcon },
    { id: 'david', name: 'David (Operations)', icon: SparklesIcon },
  ]

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-lg ${className}`} style={{ height }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Business Assistant</h3>
            <p className="text-sm text-gray-500">
              {isStreaming ? 'Thinking...' : 'Ready to help'}
            </p>
          </div>
        </div>
        
        {showAgentSelector && (
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isStreaming}
          >
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streamingMessage && (
          <div className="text-center text-gray-500 mt-8">
            <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">Ask about bookings, revenue, marketing, or operations</p>
          </div>
        )}
        
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        
        {streamingMessage && (
          <MessageBubble 
            message={{
              role: 'assistant',
              content: streamingMessage,
              isStreaming: true
            }}
          />
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

/**
 * Message bubble component
 */
function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`
          max-w-[80%] rounded-lg px-4 py-2
          ${isUser 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-100 text-gray-900'
          }
          ${message.isStreaming ? 'animate-pulse' : ''}
        `}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.isStreaming && (
          <span className="inline-block mt-1">
            <ArrowPathIcon className="h-3 w-3 animate-spin" />
          </span>
        )}
      </div>
    </div>
  )
}
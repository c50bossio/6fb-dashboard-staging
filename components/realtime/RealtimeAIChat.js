/**
 * Real-time AI Chat Component
 * Provides live chat interface with AI agents via WebSocket
 */

import React, { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, MessageSquare, Zap, RotateCcw } from 'lucide-react'
import { useAIChat, useEnhancedWebSocket } from '@/hooks/useEnhancedWebSocket'

const TypingIndicator = ({ agentName }) => (
  <div className="flex items-center space-x-2 text-gray-500 py-2">
    <Bot size={16} />
    <span className="text-sm">{agentName} is typing</span>
    <div className="flex space-x-1">
      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" />
      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
      <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
    </div>
  </div>
)

const MessageBubble = ({ message, isUser = false }) => {
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md`}>
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Bot size={16} className="text-blue-600" />
          </div>
        )}
        
        <div>
          <div className={`
            px-4 py-2 rounded-lg text-sm
            ${isUser 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800'
            }
          `}>
            {message.message}
          </div>
          
          <div className={`
            flex items-center mt-1 text-xs text-gray-500
            ${isUser ? 'justify-end' : 'justify-start'}
          `}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {message.model && !isUser && (
              <>
                <span className="mx-1">•</span>
                <span title={`Powered by ${message.model}`}>
                  {message.model === 'gpt-4o-mini' ? '⚡' : '🤖'}
                </span>
              </>
            )}
          </div>
        </div>

        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <User size={16} className="text-gray-600" />
          </div>
        )}
      </div>
    </div>
  )
}

const AgentSelector = ({ agents, currentAgent, onAgentChange, isConnected }) => {
  const agentOptions = [
    { id: 'business_coach', name: 'Business Coach', icon: '💼', description: 'Strategic business advice' },
    { id: 'marketing_expert', name: 'Marketing Expert', icon: '📈', description: 'Marketing and promotion strategies' },
    { id: 'financial_advisor', name: 'Financial Advisor', icon: '💰', description: 'Financial planning and pricing' }
  ]

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">AI Assistant</h3>
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {agentOptions.map(agent => (
          <button
            key={agent.id}
            onClick={() => onAgentChange(agent.id)}
            className={`
              flex items-center space-x-3 p-2 rounded-lg text-left transition-colors
              ${currentAgent === agent.id 
                ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' 
                : 'hover:bg-gray-50 border-2 border-transparent'
              }
            `}
            disabled={!isConnected}
          >
            <span className="text-xl">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{agent.name}</div>
              <div className="text-xs text-gray-500 truncate">{agent.description}</div>
            </div>
            {currentAgent === agent.id && <Zap size={16} className="text-blue-600" />}
          </button>
        ))}
      </div>
    </div>
  )
}

export function RealtimeAIChat({ 
  className = '', 
  height = '500px',
  initialAgent = 'business_coach',
  showAgentSelector = true 
}) {
  const [inputMessage, setInputMessage] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const messagesContainerRef = useRef(null)
  
  const { isConnected, connect } = useEnhancedWebSocket()
  const {
    messages,
    isTyping,
    currentAgent,
    sendMessage,
    switchAgent,
    clearMessages
  } = useAIChat(initialAgent)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, autoScroll])

  // Auto-connect on mount
  useEffect(() => {
    if (!isConnected) {
      connect().catch(error => {
        console.error('Failed to connect to chat service:', error)
      })
    }
  }, [isConnected, connect])

  // Check if user is at bottom of messages
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setAutoScroll(isAtBottom)
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    
    if (!inputMessage.trim() || !isConnected) return
    
    const sent = sendMessage(inputMessage.trim())
    
    if (sent) {
      setInputMessage('')
      setAutoScroll(true)
    }
  }

  const handleAgentChange = (agentId) => {
    switchAgent(agentId)
    inputRef.current?.focus()
  }

  const handleClearChat = () => {
    clearMessages()
    inputRef.current?.focus()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  const getCurrentAgentInfo = () => {
    const agentMap = {
      business_coach: { name: 'Business Coach', icon: '💼' },
      marketing_expert: { name: 'Marketing Expert', icon: '📈' },
      financial_advisor: { name: 'Financial Advisor', icon: '💰' }
    }
    return agentMap[currentAgent] || agentMap.business_coach
  }

  const agentInfo = getCurrentAgentInfo()

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Agent Selector */}
      {showAgentSelector && (
        <AgentSelector
          currentAgent={currentAgent}
          onAgentChange={handleAgentChange}
          isConnected={isConnected}
        />
      )}

      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{agentInfo.icon}</span>
          <div>
            <h3 className="font-medium text-gray-900">{agentInfo.name}</h3>
            <p className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearChat}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Clear chat"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="overflow-y-auto p-4 space-y-2"
        style={{ height: height }}
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">
              Start a conversation with your {agentInfo.name}
            </p>
          </div>
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={message.type === 'user'}
              />
            ))}
            
            {isTyping && (
              <TypingIndicator agentName={agentInfo.name} />
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              isConnected 
                ? `Ask ${agentInfo.name} anything...`
                : 'Connecting to chat service...'
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={!isConnected || isTyping}
            maxLength={500}
          />
          
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>
            {inputMessage.length}/500 characters
          </span>
          
          <div className="flex items-center space-x-4">
            <span>Press Enter to send</span>
            {!autoScroll && (
              <button
                onClick={() => {
                  setAutoScroll(true)
                  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="text-blue-600 hover:text-blue-800"
              >
                Scroll to bottom
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Compact floating chat widget
 */
export function FloatingAIChat({ position = 'bottom-right' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [hasNewMessages, setHasNewMessages] = useState(false)
  
  const { isConnected } = useEnhancedWebSocket()
  const { messages } = useAIChat('business_coach')

  // Track new messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.type === 'agent') {
        setHasNewMessages(true)
      }
    }
  }, [messages, isOpen])

  const handleToggle = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setHasNewMessages(false)
    }
  }

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={handleToggle}
        className={`
          fixed z-50 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200
          ${positionClasses[position]}
          ${isOpen ? 'rotate-45' : 'hover:scale-110'}
        `}
        title="Chat with AI Assistant"
      >
        <MessageSquare size={24} className="mx-auto" />
        
        {hasNewMessages && !isOpen && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white" />
        )}
        
        {/* Connection indicator */}
        <div className={`
          absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
          ${isConnected ? 'bg-green-500' : 'bg-red-500'}
        `} />
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className={`
          fixed z-40 w-96 h-[600px] bg-white rounded-lg shadow-xl border border-gray-200
          ${position.includes('right') ? 'right-4' : 'left-4'}
          ${position.includes('bottom') ? 'bottom-20' : 'top-20'}
        `}>
          <RealtimeAIChat 
            height="540px"
            showAgentSelector={true}
          />
        </div>
      )}
    </>
  )
}

export default RealtimeAIChat
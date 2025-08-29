/**
 * Real-time AI Chat Component
 * Provides live chat interface with AI agents via WebSocket
 */

import { Send, Bot, User, MessageSquare, Zap, RotateCcw, DollarSign } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { useAIChat } from '@/hooks/useAISDK'

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

  const isStreaming = message.isStreaming
  const isError = message.type === 'error'
  const isSystem = message.type === 'system'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`flex items-start space-x-2 max-w-xs lg:max-w-md`}>
        {!isUser && (
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isError ? 'bg-red-100' : isSystem ? 'bg-yellow-100' : 'bg-blue-100'
          }`}>
            <Bot size={16} className={`${
              isError ? 'text-red-600' : isSystem ? 'text-yellow-600' : 'text-blue-600'
            }`} />
          </div>
        )}
        
        <div className="flex-1">
          <div className={`
            px-4 py-2 rounded-lg text-sm relative
            ${isUser 
              ? 'bg-blue-600 text-white' 
              : isError 
              ? 'bg-red-50 text-red-800 border border-red-200'
              : isSystem
              ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              : 'bg-gray-100 text-gray-800'
            }
          `}>
            {message.content || message.message}
            {isStreaming && (
              <div className="inline-block ml-2 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div className={`
            flex items-center mt-1 text-xs text-gray-500 space-x-2
            ${isUser ? 'justify-end' : 'justify-start'}
          `}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {message.model && !isUser && (
              <>
                <span>•</span>
                <span title={`Powered by ${message.model}`}>
                  {message.model.includes('gemini') ? '🧠' : 
                   message.model.includes('gpt') ? '⚡' : '🤖'}
                </span>
              </>
            )}
            {message.cost && !isUser && (
              <>
                <span>•</span>
                <span title={`Cost: $${message.cost.toFixed(4)}`} className="flex items-center">
                  <DollarSign size={10} className="mr-1" />
                  {(message.cost * 1000).toFixed(2)}¢
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

const AgentSelector = ({ currentAgent, onAgentChange, agentInfo, totalCost = 0 }) => {
  const agentOptions = [
    { id: 'business_coach', name: 'Business Coach', icon: '💼', description: 'Strategic business advice', color: 'blue' },
    { id: 'marketing_expert', name: 'Marketing Expert', icon: '📱', description: 'Marketing and promotion strategies', color: 'purple' },
    { id: 'financial_advisor', name: 'Financial Advisor', icon: '💰', description: 'Financial planning and pricing', color: 'green' },
    { id: 'operations_manager', name: 'Operations Manager', icon: '⚙️', description: 'Operations and efficiency', color: 'orange' },
    { id: 'customer_care', name: 'Customer Care', icon: '👥', description: 'Customer service excellence', color: 'pink' }
  ]

  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">AI Assistant</h3>
        <div className="flex items-center space-x-2">
          <div className="flex items-center text-xs text-gray-500">
            <DollarSign size={12} className="mr-1" />
            ${totalCost.toFixed(4)}
          </div>
          <div className="w-2 h-2 rounded-full bg-green-500" title="AI SDK Ready" />
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {agentOptions.map(agent => (
          <button
            key={agent.id}
            onClick={() => onAgentChange(agent.id)}
            className={`
              flex items-center space-x-3 p-2 rounded-lg text-left transition-colors
              ${currentAgent === agent.id 
                ? `bg-${agent.color}-50 text-${agent.color}-700 border-2 border-${agent.color}-200` 
                : 'hover:bg-gray-50 border-2 border-transparent'
              }
            `}
          >
            <span className="text-xl">{agent.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{agent.name}</div>
              <div className="text-xs text-gray-500 truncate">{agent.description}</div>
            </div>
            {currentAgent === agent.id && <Zap size={16} className={`text-${agent.color}-600`} />}
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
  const [autoScroll, setAutoScroll] = useState(true)
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const messagesContainerRef = useRef(null)
  
  const {
    messages,
    isLoading,
    error,
    currentAgent,
    agentInfo,
    input,
    handleInputChange,
    handleSubmit,
    sendMessage,
    switchAgent,
    clearMessages,
    totalCost,
    getConversationStats
  } = useAIChat(initialAgent)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, autoScroll])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Check if user is at bottom of messages
  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
      setAutoScroll(isAtBottom)
    }
  }

  const handleSendMessage = async (e) => {
    e?.preventDefault()
    
    if (!input.trim() || isLoading) return
    
    setAutoScroll(true)
    
    // Use the Vercel AI SDK submit handler
    await handleSubmit(e)
    
    // Focus back on input
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleAgentChange = (agentId) => {
    switchAgent(agentId)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleClearChat = () => {
    clearMessages()
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(e)
    }
  }

  // Use the agent info from the hook, which includes more details
  const displayAgentInfo = agentInfo || {
    name: 'AI Assistant',
    icon: '🤖',
    color: 'blue'
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Agent Selector */}
      {showAgentSelector && (
        <AgentSelector
          currentAgent={currentAgent}
          onAgentChange={handleAgentChange}
          agentInfo={displayAgentInfo}
          totalCost={totalCost}
        />
      )}

      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{displayAgentInfo.icon}</span>
          <div>
            <h3 className="font-medium text-gray-900">{displayAgentInfo.name}</h3>
            <p className="text-xs text-gray-500">
              {isLoading ? 'Thinking...' : 'AI SDK Ready'}
              {error && <span className="text-red-500 ml-2">Error: {error.message}</span>}
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
              Start a conversation with your {displayAgentInfo.name}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              Powered by latest AI models with 90% cost optimization
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
            
            {isLoading && (
              <TypingIndicator agentName={displayAgentInfo.name} />
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
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder={`Ask ${displayAgentInfo.name} anything...`}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={isLoading}
            maxLength={500}
          />
          
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            <span>{input.length}/500 characters</span>
            {totalCost > 0 && (
              <span className="flex items-center">
                <DollarSign size={10} className="mr-1" />
                Session: ${totalCost.toFixed(4)}
              </span>
            )}
          </div>
          
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
  
  const { messages, isLoading, totalCost } = useAIChat('business_coach')

  // Track new messages when chat is closed
  useEffect(() => {
    if (!isOpen && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.type === 'assistant' || lastMessage.type === 'agent') {
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
        
        {/* AI Status indicator */}
        <div className={`
          absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
          ${isLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}
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
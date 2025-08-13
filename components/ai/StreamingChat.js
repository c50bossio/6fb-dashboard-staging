'use client'

import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { useChat } from 'ai/react'
import { useState, useRef, useEffect } from 'react'

import { captureException } from '@/lib/sentry'

export default function StreamingChat({ 
  agentId = null,
  initialMessages = [],
  placeholder = 'Type your message...',
  className = '',
  onNewMessage = null,
}) {
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: '/api/ai/chat',
    body: { agentId },
    initialMessages,
    onResponse: () => {
      setIsTyping(true)
    },
    onFinish: (message) => {
      setIsTyping(false)
      if (onNewMessage) {
        onNewMessage(message)
      }
    },
    onError: (error) => {
      captureException(error, { context: 'StreamingChat' })
      setIsTyping(false)
    },
  })

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const onSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    handleSubmit(e)
  }

  return (
    <div className={`flex flex-col h-full bg-white rounded-lg shadow-sm ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium mb-2">Start a conversation</p>
            <p className="text-sm">Ask me anything about your barbershop business!</p>
          </div>
        )}
        
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-olive-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
              <div className={`text-xs mt-1 ${
                message.role === 'user' ? 'text-olive-100' : 'text-gray-500'
              }`}>
                {new Date(message.createdAt || Date.now()).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">Error: {error.message}</p>
            <button
              onClick={() => reload()}
              className="text-sm text-red-700 underline mt-1"
            >
              Try again
            </button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            autoFocus
          />
          
          {isLoading ? (
            <button
              type="button"
              onClick={stop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <PaperAirplaneIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Character count */}
        <div className="mt-2 text-xs text-gray-500 text-right">
          {input.length} / 2000 characters
        </div>
      </form>
    </div>
  )
}
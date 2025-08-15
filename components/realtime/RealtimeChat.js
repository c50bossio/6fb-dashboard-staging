'use client'

import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  SignalIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'

import { useRealtime } from '../../hooks/useRealtime'

export default function RealtimeChat({ className = '' }) {
  const {
    isConnected,
    aiResponses,
    sendMetricEvent
  } = useRealtime()

  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [streamingResponse, setStreamingResponse] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, streamingResponse])

  useEffect(() => {
    if (aiResponses.length > 0) {
      const latestResponse = aiResponses[0]
      
      const isNewResponse = !chatHistory.find(msg => 
        msg.timestamp === latestResponse.timestamp && msg.role === 'assistant'
      )
      
      if (isNewResponse) {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: latestResponse.response,
          timestamp: latestResponse.timestamp,
          confidence: latestResponse.confidence,
          provider: latestResponse.provider,
          knowledgeEnhanced: latestResponse.knowledgeEnhanced
        }])
        setIsTyping(false)
        setStreamingResponse('')
      }
    }
  }, [aiResponses, chatHistory])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!message.trim()) return
    
    const userMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date().toISOString()
    }
    
    setChatHistory(prev => [...prev, userMessage])
    setMessage('')
    setIsTyping(true)
    
    try {
      const response = await fetch('/api/ai/enhanced-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: `chat_${Date.now()}`,
          businessContext: {
            source: 'realtime_chat',
            timestamp: new Date().toISOString()
          }
        })
      })

      const data = await response.json()

      if (data.success) {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp,
          confidence: data.confidence,
          provider: data.provider,
          messageType: data.messageType,
          knowledgeEnhanced: data.knowledgeEnhanced,
          contextualInsights: data.contextualInsights
        }])
        setIsTyping(false)
      } else {
        throw new Error(data.error || 'Failed to get AI response')
      }

    } catch (error) {
      console.error('Chat error:', error)
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your message. Please try again.',
        timestamp: new Date().toISOString(),
        error: true
      }])
      setIsTyping(false)
    }
  }

  const clearChat = () => {
    setChatHistory([])
    setStreamingResponse('')
    setIsTyping(false)
  }

  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch (error) {
      return ''
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="relative">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-600" />
            {isConnected && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            )}
          </div>
          <h3 className="font-semibold text-gray-900">AI Business Coach</h3>
          {isConnected && (
            <SignalIcon className="h-4 w-4 text-green-500" />
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
            disabled={chatHistory.length === 0}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {chatHistory.length === 0 ? (
          <div className="text-center py-8">
            <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">
              Start a conversation with your AI business coach
            </p>
            <p className="text-gray-400 text-xs mt-2">
              Get insights on revenue, scheduling, customer service, and more
            </p>
          </div>
        ) : (
          chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs sm:max-w-md px-4 py-2 rounded-lg ${
                msg.role === 'user'
                  ? 'bg-olive-600 text-white'
                  : msg.error
                  ? 'bg-red-50 text-red-800 border border-red-200'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                <div className="text-sm">{msg.content}</div>
                
                {/* Metadata for AI responses */}
                {msg.role === 'assistant' && !msg.error && (
                  <div className="flex items-center justify-between mt-2 text-xs opacity-75">
                    <div className="flex items-center space-x-2">
                      {msg.knowledgeEnhanced && (
                        <span className="bg-gold-100 text-gold-800 px-1.5 py-0.5 rounded text-xs">
                          RAG Enhanced
                        </span>
                      )}
                      {msg.confidence && (
                        <span className="text-gray-600">
                          {(msg.confidence * 100).toFixed(0)}% confidence
                        </span>
                      )}
                    </div>
                    <div className="text-gray-500">
                      {formatTimestamp(msg.timestamp)}
                    </div>
                  </div>
                )}

                {/* Timestamp for user messages */}
                {msg.role === 'user' && (
                  <div className="text-xs opacity-75 mt-1 text-right">
                    {formatTimestamp(msg.timestamp)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Streaming response indicator */}
        {streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-xs sm:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
              <div className="text-sm">{streamingResponse}</div>
              <div className="flex items-center mt-2 text-xs text-gray-500">
                <ArrowPathIcon className="h-3 w-3 animate-spin mr-1" />
                Streaming...
              </div>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isTyping && !streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-xs sm:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500 ml-2">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about your business performance..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent text-sm"
            disabled={isTyping}
          />
          <button
            type="submit"
            disabled={!message.trim() || isTyping}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </form>
        
        {!isConnected && (
          <div className="mt-2 text-xs text-amber-700 text-center">
            Real-time features limited - connection offline
          </div>
        )}
      </div>
    </div>
  )
}
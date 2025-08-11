'use client'

import { 
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function AIAgentChat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hello! I'm your AI business assistant. I'm connecting to your live business data to provide real insights about your bookings, revenue, and customers. What would you like to know?",
      agent: 'Marcus',
      timestamp: new Date(Date.now() - 60000)
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  const [businessContext, setBusinessContext] = useState(null)

  // Check API connection on mount
  useEffect(() => {
    checkAPIConnection()
  }, [])

  const checkAPIConnection = async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        setApiConnected(true)
        // Update initial message to show connection status
        setMessages(prev => prev.map(msg => 
          msg.id === 1 
            ? { ...msg, content: "✅ Internal API connection detected! I can access your live booking calendar, appointments, and analytics. What business insights can I help you with?" }
            : msg
        ))
      }
    } catch (error) {
      console.error('API connection failed:', error)
      setApiConnected(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    const newMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setMessage('')
    setIsLoading(true)

    try {
      // Call the real AI API with business context
      const response = await fetch('/api/ai/unified-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are Marcus, an expert AI business assistant for a barbershop. Use the business context provided to give specific, actionable insights based on real data.'
            },
            ...messages.filter(msg => msg.type !== 'system').map(msg => ({
              role: msg.type === 'user' ? 'user' : 'assistant',
              content: msg.content
            })),
            {
              role: 'user',
              content: message
            }
          ],
          provider: 'openai',
          model: 'gpt-4o-mini',
          stream: false,
          includeBusinessContext: true,
          barbershopId: 'default'
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.content || "I apologize, but I'm having trouble accessing your business data right now. Please try again in a moment.",
        agent: 'Marcus',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('AI response error:', error)
      
      // Fallback response with connection status
      const errorResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: apiConnected 
          ? "I'm having trouble processing your request right now. My connection to the business data is active, but there may be a temporary issue. Please try again."
          : "⚠️ I'm having trouble connecting to your business data. Please check your API connection and try again.",
        agent: 'Marcus',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp)
  }

  return (
    <div className="flex flex-col h-96 bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Business Assistant</h3>
            <p className="text-sm text-gray-500">Marcus, Sophia & David ready to help</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
            Online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              msg.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.type === 'assistant' && (
                <div className="flex items-center space-x-2 mb-1">
                  <CpuChipIcon className="h-3 w-3 text-gray-500" />
                  <span className="text-xs font-medium text-gray-500">{msg.agent}</span>
                </div>
              )}
              <p className="text-sm">{msg.content}</p>
              <p className={`text-xs mt-1 ${
                msg.type === 'user' ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about scheduling, customers, marketing, or business optimization..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setMessage("How can I increase my booking rate?")}
            className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
          >
            Increase Bookings
          </button>
          <button
            onClick={() => setMessage("What's the best pricing strategy for my services?")}
            className="px-3 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100"
          >
            Pricing Strategy
          </button>
          <button
            onClick={() => setMessage("Help me optimize my daily schedule")}
            className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-full hover:bg-green-100"
          >
            Schedule Optimization
          </button>
        </div>
      </div>
    </div>
  )
}
'use client'

import { 
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import ModelSelector from './ModelSelector'

export default function AIAgentChat({ barbershopId }) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: barbershopId 
        ? "Hello! I'm your AI business assistant. I'm connecting to your live business data to provide real insights about your bookings, revenue, and customers. What would you like to know?"
        : "Hello! I'm your AI business assistant. I need a valid barbershop ID to access your business data. Please make sure you're properly logged in to get personalized insights.",
      agent: 'Marcus',
      timestamp: new Date(Date.now() - 60000)
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  const [businessContext, setBusinessContext] = useState(null)
  const [selectedModel, setSelectedModel] = useState('gpt-5')

  useEffect(() => {
    checkAPIConnection()
  }, [])

  const checkAPIConnection = async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        setApiConnected(true)
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
    if (!barbershopId) {
      const errorResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: "I need a valid barbershop ID to access your business data and provide personalized insights. Please make sure you're properly logged in.",
        agent: 'Marcus',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorResponse])
      return
    }

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
          provider: selectedModel.startsWith('gpt') ? 'openai' : selectedModel.startsWith('claude') ? 'anthropic' : 'google',
          model: selectedModel,
          stream: false,
          includeBusinessContext: true,
          barbershopId: barbershopId
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
          <div className="h-10 w-10 bg-gradient-to-br from-olive-500 to-gold-600 rounded-full flex items-center justify-center">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Business Assistant</h3>
            <p className="text-sm text-gray-500">Marcus, Sophia & David ready to help</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            apiConnected 
              ? 'bg-moss-100 text-moss-900' 
              : 'bg-amber-100 text-amber-900'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
              apiConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            {apiConnected ? 'API Connected' : 'Connecting...'}
          </span>
          {!apiConnected && (
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-800" />
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              msg.type === 'user' 
                ? 'bg-olive-600 text-white' 
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
                msg.type === 'user' ? 'text-olive-200' : 'text-gray-500'
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
        <div className="mb-3 flex justify-between items-center">
          <ModelSelector 
            selectedModel={selectedModel} 
            onModelChange={setSelectedModel} 
          />
          <span className="text-xs text-gray-500">
            {apiConnected ? '🟢 Connected' : '🔴 Offline'}
          </span>
        </div>
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about scheduling, customers, marketing, or business optimization..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-olive-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setMessage("Show me today's bookings and revenue")}
            className="px-3 py-1 text-xs bg-olive-50 text-olive-700 rounded-full hover:bg-olive-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!apiConnected || !barbershopId}
          >
            Today's Performance
          </button>
          <button
            onClick={() => setMessage("Analyze my customer booking patterns this month")}
            className="px-3 py-1 text-xs bg-gold-50 text-gold-700 rounded-full hover:bg-gold-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!apiConnected || !barbershopId}
          >
            Customer Analytics
          </button>
          <button
            onClick={() => setMessage("What's my most popular service and best revenue opportunities?")}
            className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-full hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!apiConnected || !barbershopId}
          >
            Revenue Insights
          </button>
          <button
            onClick={() => setMessage("Show me my weekly schedule and suggest optimizations")}
            className="px-3 py-1 text-xs bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!apiConnected || !barbershopId}
          >
            Schedule Analysis
          </button>
        </div>
      </div>
    </div>
  )
}
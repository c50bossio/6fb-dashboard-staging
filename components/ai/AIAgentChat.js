'use client'

import { 
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline'
import { useState } from 'react'

export default function AIAgentChat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hello! I'm your AI business assistant. I can help you with scheduling, customer management, marketing strategies, and business optimization. What would you like to discuss?",
      agent: 'Marcus',
      timestamp: new Date(Date.now() - 60000)
    }
  ])
  const [isLoading, setIsLoading] = useState(false)

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

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on your current booking patterns, I recommend scheduling your premium services during peak hours (10 AM - 2 PM) to maximize revenue. Would you like me to analyze your specific schedule?",
        "I can help you optimize that! Let me analyze your customer data and suggest the best approach for your barbershop.",
        "Great question! Here are three strategies that have worked well for similar barbershops: 1) Implement a loyalty program, 2) Optimize peak hour pricing, 3) Create package deals for regular customers.",
        "I see an opportunity to increase your revenue by 15-20% with some scheduling adjustments. Let me walk you through the data..."
      ]
      
      const response = {
        id: Date.now() + 1,
        type: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        agent: ['Marcus', 'Sophia', 'David'][Math.floor(Math.random() * 3)],
        timestamp: new Date()
      }

      setMessages(prev => [...prev, response])
      setIsLoading(false)
    }, 1500)
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
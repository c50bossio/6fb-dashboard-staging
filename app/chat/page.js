'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// AI Agent Orchestrator - determines which agent(s) to engage based on context
const determineRelevantAgents = (message) => {
  const lowerMessage = message.toLowerCase()
  const relevantAgents = []

  // Master Coach - strategic, planning, general business advice
  if (lowerMessage.includes('strategy') || lowerMessage.includes('plan') || 
      lowerMessage.includes('goal') || lowerMessage.includes('growth') ||
      lowerMessage.includes('advice') || lowerMessage.includes('help')) {
    relevantAgents.push('master_coach')
  }

  // Financial Agent - money, revenue, costs, pricing
  if (lowerMessage.includes('money') || lowerMessage.includes('revenue') || 
      lowerMessage.includes('profit') || lowerMessage.includes('cost') ||
      lowerMessage.includes('price') || lowerMessage.includes('financial') ||
      lowerMessage.includes('budget')) {
    relevantAgents.push('financial')
  }

  // Marketing Agent - promotion, customers, advertising
  if (lowerMessage.includes('marketing') || lowerMessage.includes('customer') || 
      lowerMessage.includes('promote') || lowerMessage.includes('advertis') ||
      lowerMessage.includes('social media') || lowerMessage.includes('campaign')) {
    relevantAgents.push('marketing')
  }

  // Operations Agent - efficiency, workflow, processes
  if (lowerMessage.includes('operation') || lowerMessage.includes('process') || 
      lowerMessage.includes('workflow') || lowerMessage.includes('efficiency') ||
      lowerMessage.includes('schedule') || lowerMessage.includes('staff')) {
    relevantAgents.push('operations')
  }

  // Brand Agent - reputation, image, positioning
  if (lowerMessage.includes('brand') || lowerMessage.includes('reputation') || 
      lowerMessage.includes('image') || lowerMessage.includes('position')) {
    relevantAgents.push('brand')
  }

  // Growth Agent - expansion, scaling, new locations
  if (lowerMessage.includes('expand') || lowerMessage.includes('scale') || 
      lowerMessage.includes('grow') || lowerMessage.includes('location') ||
      lowerMessage.includes('franchise')) {
    relevantAgents.push('growth')
  }

  // If no specific agents detected, default to Master Coach
  if (relevantAgents.length === 0) {
    relevantAgents.push('master_coach')
  }

  return relevantAgents
}

const agentIcons = {
  master_coach: '🎯',
  financial: '💰',
  marketing: '📈',
  operations: '⚙️',
  brand: '🏆',
  growth: '🚀'
}

const agentNames = {
  master_coach: 'Master Coach',
  financial: 'Financial Agent',
  marketing: 'Marketing Agent', 
  operations: 'Operations Agent',
  brand: 'Brand Agent',
  growth: 'Growth Agent'
}

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      content: 'Welcome to your AI Business Management System! I\'m your unified AI assistant that coordinates multiple specialized agents to help grow your barbershop business. Ask me anything about marketing, operations, finances, or strategy.',
      agents: ['master_coach'],
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    // Determine which agents are relevant for this message
    const relevantAgents = determineRelevantAgents(inputMessage)
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      // Call the unified chat API endpoint
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          agents: relevantAgents,
          conversation_history: messages.slice(-10) // Last 10 messages for context
        })
      })

      const data = await response.json()

      if (data.success) {
        const aiMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: data.response,
          agents: relevantAgents,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        // Fallback response if API fails
        const fallbackMessage = {
          id: Date.now() + 1,
          type: 'ai',
          content: `I understand you're asking about ${relevantAgents.map(agent => agentNames[agent]).join(' and ')} topics. Let me help you with that! (Note: I'm currently in development mode - full AI responses coming soon!)`,
          agents: relevantAgents,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, fallbackMessage])
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment.',
        agents: ['master_coach'],
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="max-w-4xl mx-auto h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Business Assistant</h1>
          <p className="text-sm text-gray-500">Unified interface coordinating all your AI agents</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.type === 'user' 
                ? 'bg-blue-600 text-white' 
                : message.type === 'system'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-white text-gray-800 border border-gray-200'
            }`}>
              {/* Agent indicators for AI messages */}
              {message.type === 'ai' && message.agents && (
                <div className="flex gap-1 mb-2">
                  {message.agents.map(agent => (
                    <span 
                      key={agent}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                      title={agentNames[agent]}
                    >
                      {agentIcons[agent]} {agentNames[agent]}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-75 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-800 border border-gray-200 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-500">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-4">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about marketing, operations, finances, strategy, or anything business-related..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows="2"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          💡 Try asking: "How can I increase revenue?", "What marketing strategies work best?", or "Help me optimize my operations"
        </div>
      </div>
    </div>
  )
}
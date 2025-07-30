'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/components/AuthProvider'
import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const isDevBypass = searchParams.get('dev') === 'true' && process.env.NODE_ENV === 'development'

  // If dev bypass is enabled, skip authentication
  if (isDevBypass) {
    return <DashboardContent devMode={true} />
  }

  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

// Agent orchestration logic (same as chat page)
const determineRelevantAgents = (message) => {
  const lowerMessage = message.toLowerCase()
  const relevantAgents = []

  if (lowerMessage.includes('strategy') || lowerMessage.includes('plan') || 
      lowerMessage.includes('goal') || lowerMessage.includes('growth') ||
      lowerMessage.includes('advice') || lowerMessage.includes('help')) {
    relevantAgents.push('master_coach')
  }
  if (lowerMessage.includes('money') || lowerMessage.includes('revenue') || 
      lowerMessage.includes('profit') || lowerMessage.includes('cost') ||
      lowerMessage.includes('price') || lowerMessage.includes('financial') ||
      lowerMessage.includes('budget')) {
    relevantAgents.push('financial')
  }
  if (lowerMessage.includes('marketing') || lowerMessage.includes('customer') || 
      lowerMessage.includes('promote') || lowerMessage.includes('advertis') ||
      lowerMessage.includes('social media') || lowerMessage.includes('campaign')) {
    relevantAgents.push('marketing')
  }
  if (lowerMessage.includes('operation') || lowerMessage.includes('process') || 
      lowerMessage.includes('workflow') || lowerMessage.includes('efficiency') ||
      lowerMessage.includes('schedule') || lowerMessage.includes('staff')) {
    relevantAgents.push('operations')
  }
  if (lowerMessage.includes('brand') || lowerMessage.includes('reputation') || 
      lowerMessage.includes('image') || lowerMessage.includes('position')) {
    relevantAgents.push('brand')
  }
  if (lowerMessage.includes('expand') || lowerMessage.includes('scale') || 
      lowerMessage.includes('grow') || lowerMessage.includes('location') ||
      lowerMessage.includes('franchise')) {
    relevantAgents.push('growth')
  }

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

function DashboardContent({ devMode = false }) {
  const { user, logout } = useAuth()
  const router = useRouter()
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'system',
      content: 'Welcome! I\'m your unified AI assistant that coordinates multiple specialized agents to help grow your barbershop business. Ask me anything about marketing, operations, finances, or strategy.',
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
    if (isChatOpen) {
      scrollToBottom()
    }
  }, [messages, isChatOpen])

  const handleLogout = async () => {
    if (devMode) {
      window.location.href = '/'
    } else {
      await logout()
    }
  }

  const handleStartChat = () => {
    setIsChatOpen(true)
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    const relevantAgents = determineRelevantAgents(inputMessage)
    
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat/unified', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          agents: relevantAgents,
          conversation_history: messages.slice(-10)
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

  // Mock user data for dev mode
  const displayUser = devMode ? {
    full_name: 'Dev User',
    email: 'dev@6fb.local',
    barbershop_name: 'Development Shop',
    barbershop_id: 'dev-shop-001'
  } : user

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {displayUser?.full_name || 'User'}!
              {devMode && <span className="ml-2 text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded">DEV MODE</span>}
            </h1>
            <p className="mt-2 text-gray-600">
              {displayUser?.barbershop_name ? `Managing ${displayUser.barbershop_name}` : 'Your AI Agent Dashboard'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {devMode ? 'Exit Dev Mode' : 'Sign Out'}
          </button>
        </div>
      </div>

      {/* User Info Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <p className="mt-1 text-sm text-gray-900">{displayUser?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <p className="mt-1 text-sm text-gray-900">{displayUser?.full_name}</p>
          </div>
          {displayUser?.barbershop_name && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">Barbershop</label>
                <p className="mt-1 text-sm text-gray-900">{displayUser.barbershop_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Barbershop ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{displayUser.barbershop_id}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Unified AI Chat Interface */}
      <div className="mb-8">
        {!isChatOpen ? (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">🤖 Unified AI Business Assistant</h2>
            <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
              Chat with one intelligent interface that automatically coordinates all your AI agents. 
              Ask about marketing, finances, operations, strategy, or anything business-related.
            </p>
            <button 
              onClick={handleStartChat}
              className="bg-white text-blue-600 font-bold py-3 px-8 rounded-lg hover:bg-blue-50 transition-colors text-lg"
            >
              🚀 Start AI Conversation
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Chat Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">🤖 AI Business Assistant</h3>
                <p className="text-blue-100 text-sm">Coordinating all your AI agents</p>
              </div>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div className="h-96 overflow-y-auto p-4 space-y-4">
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
                      <div className="flex gap-1 mb-2 flex-wrap">
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
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
            <div className="border-t border-gray-200 p-4">
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
        )}
      </div>

      {/* AI Agents Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your AI Business Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Master Coach Agent */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Master Coach</h3>
            <p className="text-sm text-gray-600">
              Strategic business guidance and growth optimization
            </p>
          </div>

          {/* Financial Agent */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">💰</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Financial Agent</h3>
            <p className="text-sm text-gray-600">
              Revenue optimization and financial planning
            </p>
          </div>

          {/* Marketing Agent */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📈</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Marketing Agent</h3>
            <p className="text-sm text-gray-600">
              Customer acquisition and marketing strategies
            </p>
          </div>

          {/* Operations Agent */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Operations Agent</h3>
            <p className="text-sm text-gray-600">
              Workflow optimization and efficiency improvements
            </p>
          </div>

          {/* Brand Development Agent */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🏆</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Brand Agent</h3>
            <p className="text-sm text-gray-600">
              Brand positioning and reputation management
            </p>
          </div>

          {/* Growth Agent */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🚀</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Growth Agent</h3>
            <p className="text-sm text-gray-600">
              Scaling strategies and expansion planning
            </p>
          </div>
        </div>
      </div>

      {/* Booking Management */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Booking Management</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">📅</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Customer Booking Page</h3>
                <p className="text-sm text-gray-600">Public booking interface for your customers</p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => window.open('/book/a0952714-3185-4776-aa8d-0cd8857ef607', '_blank')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                🔗 Open Booking Page
              </button>
              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-xs text-gray-500 mb-1">Share this link with customers:</p>
                <code className="text-xs bg-gray-100 p-1 rounded block break-all">
                  {typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9999'}/book/a0952714-3185-4776-aa8d-0cd8857ef607
                </code>
                <button
                  onClick={() => {
                    const url = `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:9999'}/book/a0952714-3185-4776-aa8d-0cd8857ef607`;
                    navigator.clipboard.writeText(url);
                    alert('Booking link copied to clipboard!');
                  }}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-xs font-medium"
                >
                  📋 Copy Link
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border border-green-200">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                <span className="text-2xl">⚙️</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Booking Features</h3>
                <p className="text-sm text-gray-600">Advanced booking system capabilities</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Barber-specific service pricing</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Different durations per barber</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>"No preference" option available</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-600 mr-2">✅</span>
                <span>Guest booking (no account needed)</span>
              </div>
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⏳</span>
                <span>Google Calendar integration</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">7</div>
            <div className="text-sm text-gray-600">AI Agents</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">24/7</div>
            <div className="text-sm text-gray-600">Availability</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">95%+</div>
            <div className="text-sm text-gray-600">Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">∞</div>
            <div className="text-sm text-gray-600">Possibilities</div>
          </div>
        </div>
      </div>
    </div>
  )
}
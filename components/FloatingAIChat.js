'use client'

import { 
  SparklesIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'

export default function FloatingAIChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hi! I'm your AI business assistant. Ask me about your barbershop's performance, bookings, or how to improve your business!",
      timestamp: new Date()
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [showRating, setShowRating] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const messagesEndRef = useRef(null)

  // Initialize persistent session ID (same as main chat)
  useEffect(() => {
    let existingSession = null
    try {
      existingSession = localStorage.getItem('ai_chat_session_id')
    } catch (e) {
      console.warn('LocalStorage not available')
    }
    
    if (existingSession) {
      setSessionId(existingSession)
    } else {
      const newSessionId = `persistent_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      setSessionId(newSessionId)
      try {
        localStorage.setItem('ai_chat_session_id', newSessionId)
      } catch (e) {
        console.warn('Could not save session ID to localStorage')
      }
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading || !sessionId) return

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentMessage = message
    setMessage('')
    setIsLoading(true)

    try {
      const startTime = Date.now()
      
      // Call the AI chat API with persistent session
      const response = await fetch('/api/ai/analytics-enhanced-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          session_id: sessionId,
          business_context: {
            shop_name: 'Demo Barbershop',
            customer_count: 150,
            monthly_revenue: 5000,
            location: 'Downtown',
            staff_count: 3,
            barbershop_id: 'demo'
          },
          barbershop_id: 'demo'
        })
      })

      const data = await response.json()
      const responseTime = (Date.now() - startTime) / 1000 // Convert to seconds
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.response || data.message || "I'm here to help! What would you like to know about your business?",
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiMessage])
      
      // Track analytics
      try {
        await fetch('/api/ai/analytics/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track_conversation',
            data: {
              agent: data.agent_details?.primary_agent || 'FloatingChat',
              topic: data.message_type || 'general',
              userId: 'demo_user',
              sessionId: `floating_${Date.now()}`
            }
          })
        })
        
        await fetch('/api/ai/analytics/usage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'track_response_time',
            data: {
              responseTime: responseTime,
              agent: data.agent_details?.primary_agent || 'FloatingChat'
            }
          })
        })
      } catch (analyticsError) {
        console.warn('Analytics tracking failed:', analyticsError)
      }
    } catch (error) {
      console.error('AI Chat error:', error)
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: "I'm having trouble connecting right now. Try asking me about your bookings, revenue, or customer insights!",
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
      handleSendMessage()
    }
  }

  const handleRating = async (messageId, rating) => {
    try {
      await fetch('/api/ai/analytics/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'track_satisfaction',
          data: {
            rating: rating,
            agent: 'FloatingChat',
            topic: 'general'
          }
        })
      })
      
      setShowRating(null)
      
      // Update the message to show it was rated
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, rated: rating }
          : msg
      ))
    } catch (error) {
      console.warn('Rating tracking failed:', error)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-amber-600 hover:bg-amber-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 z-40 group"
        >
          <SparklesIcon className="h-6 w-6" />
          <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
            AI
          </div>
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Chat with AI Assistant
          </div>
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-t-xl">
            <div className="flex items-center space-x-2">
              <SparklesIcon className="h-5 w-5" />
              <h3 className="font-semibold">AI Assistant</h3>
              <div className="bg-green-400 text-green-900 text-xs px-2 py-0.5 rounded-full font-bold">
                Online
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                    msg.type === 'user'
                      ? 'bg-amber-600 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                  {msg.type === 'assistant' && msg.id > 1 && !msg.rated && showRating !== msg.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => setShowRating(msg.id)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Rate this response
                      </button>
                    </div>
                  )}
                  {showRating === msg.id && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-600 mb-2">How helpful was this response?</p>
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            onClick={() => handleRating(msg.id, rating)}
                            className="text-lg hover:text-yellow-500 transition-colors"
                          >
                            ⭐
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {msg.rated && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Rated: {Array(msg.rated).fill('⭐').join('')} Thanks for your feedback!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg rounded-bl-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your business..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading}
                className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white rounded-lg p-2 transition-colors"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 text-center">
              <button 
                onClick={() => window.location.href = '/ai-agents'}
                className="text-xs text-amber-600 hover:text-amber-700 flex items-center justify-center space-x-1"
              >
                <ChatBubbleLeftRightIcon className="h-3 w-3" />
                <span>Open Full AI Chat</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
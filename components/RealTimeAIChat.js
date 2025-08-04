'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAIAgent } from '../hooks/useAIAgent'
import { 
  subscribeToChannel, 
  unsubscribeFromChannel,
  CHANNELS,
  EVENTS,
  triggerClientEvent
} from '../lib/pusher-client'
import LoadingSpinner from './LoadingSpinner'
import { PaperAirplaneIcon, BellIcon } from '@heroicons/react/24/outline'

export default function RealTimeAIChat() {
  const { user } = useUser()
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const messagesEndRef = useRef(null)
  const channelRef = useRef(null)
  
  const {
    loading,
    error,
    messages,
    insights,
    sessionId,
    sendMessage,
  } = useAIAgent()

  // Set up Pusher channel
  useEffect(() => {
    if (!sessionId) return

    const channelName = CHANNELS.SESSION_UPDATES(sessionId)
    
    channelRef.current = subscribeToChannel(channelName, {
      [EVENTS.AI_TYPING]: () => setIsTyping(true),
      [EVENTS.AI_RESPONSE]: (data) => {
        setIsTyping(false)
        // Response is already handled by useAIAgent hook
      },
      [EVENTS.AI_INSIGHT]: (data) => {
        // Show notification for new insight
        showInsightNotification(data.insight)
      },
    })

    return () => {
      if (channelRef.current) {
        unsubscribeFromChannel(channelName)
      }
    }
  }, [sessionId])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const showInsightNotification = (insight) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New Business Insight! 💡', {
        body: insight,
        icon: '/icon-192x192.png',
      })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    // Trigger typing indicator for other users
    if (channelRef.current) {
      triggerClientEvent(channelRef.current, 'user-typing', {
        userId: user.id,
        userName: user.firstName || 'User'
      })
    }

    await sendMessage(input)
    setInput('')
  }

  const quickActions = [
    { emoji: '📈', text: 'Revenue tips' },
    { emoji: '👥', text: 'Client retention' },
    { emoji: '📅', text: 'Scheduling help' },
    { emoji: '💰', text: 'Pricing strategy' },
  ]

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header with real-time status */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              Real-Time AI Business Coach
              <span className="inline-flex h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
            </h2>
            <p className="text-sm opacity-90">
              {sessionId ? 'Connected' : 'Connecting...'} • Powered by Pusher + AI
            </p>
          </div>
          <button
            onClick={() => Notification.requestPermission()}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Enable notifications"
          >
            <BellIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full mx-auto flex items-center justify-center">
                <span className="text-4xl">🤖</span>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              I'm your real-time AI business coach. Ask me anything!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {quickActions.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(`Help me with ${action.text}`)}
                  className="px-4 py-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <span>{action.emoji}</span>
                  <span className="text-sm">{action.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-100 text-gray-900 border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(message.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {(loading || isTyping) && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 border border-gray-200">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-pink-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span className="text-sm text-gray-600">AI is thinking...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Real-time insights */}
      {insights.length > 0 && (
        <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-t">
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Latest Insight</p>
              <p className="text-sm text-amber-800">{insights[insights.length - 1]}</p>
            </div>
          </div>
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}

<style jsx>{`
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out;
  }
`}</style>
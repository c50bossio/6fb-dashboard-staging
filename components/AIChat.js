'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { 
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function AIChat({ agentId = 'business_coach', onClose }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const wsRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Agent info
  const agents = {
    business_coach: {
      name: 'Business Coach',
      avatar: '💼',
      color: 'blue'
    },
    marketing_expert: {
      name: 'Marketing Expert', 
      avatar: '📣',
      color: 'purple'
    },
    financial_advisor: {
      name: 'Financial Advisor',
      avatar: '💰',
      color: 'green'
    }
  }

  const currentAgent = agents[agentId] || agents.business_coach

  useEffect(() => {
    // Generate session ID
    const newSessionId = `${user?.id}_${Date.now()}`
    setSessionId(newSessionId)

    // Try to connect to WebSocket, but fallback to HTTP if it fails
    connectWebSocket()

    // Add initial welcome message
    const welcomeMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `Hello! I'm your ${currentAgent.name}. How can I help you with your barbershop business today?`,
      timestamp: new Date().toISOString()
    }
    setMessages([welcomeMessage])

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [agentId])

  useEffect(() => {
    // Scroll to bottom when messages change
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const connectWebSocket = () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      console.error('No authentication token found')
      // Fallback to HTTP mode
      setIsConnected(true)
      return
    }

    const wsUrl = `ws://localhost:8001/ws/${token}`
    console.log('Attempting to connect to:', wsUrl)
    
    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.type) {
          case 'connection':
            console.log('Connected:', data.message)
            break
            
          case 'typing':
            setIsTyping(true)
            break
            
          case 'response':
            setIsTyping(false)
            const aiMessage = {
              id: Date.now(),
              role: 'assistant',
              content: data.message,
              agent: data.agent_name,
              timestamp: data.timestamp,
              model: data.model
            }
            setMessages(prev => [...prev, aiMessage])
            break
            
          case 'notification':
            console.log('Notification:', data)
            break
            
          case 'error':
            console.error('WebSocket error:', data.message)
            setIsTyping(false)
            break
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        // Fallback to HTTP mode
        setIsConnected(true)
        console.log('Falling back to HTTP API mode')
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected, using HTTP fallback')
        // Enable HTTP fallback mode
        setIsConnected(true)
      }

      wsRef.current = ws
    } catch (error) {
      console.error('WebSocket not supported or failed to connect:', error)
      // Fallback to HTTP mode
      setIsConnected(true)
    }
  }

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim()) return

    // Add user message to chat
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])

    // Clear input immediately
    setInputMessage('')
    setIsTyping(true)

    // Try WebSocket first, then fallback to HTTP
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // WebSocket mode
      const wsMessage = {
        type: 'chat',
        agent_id: agentId,
        message: messageText,
        session_id: sessionId
      }
      wsRef.current.send(JSON.stringify(wsMessage))
    } else {
      // HTTP fallback mode
      try {
        const response = await fetch('/api/chat/unified', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          body: JSON.stringify({
            message: messageText,
            agent_id: agentId,
            context: { 
              barbershop_name: user?.barbershop_name || 'Your Barbershop',
              agent_type: currentAgent.name
            }
          })
        })

        const data = await response.json()
        setIsTyping(false)

        if (response.ok) {
          const aiMessage = {
            id: Date.now(),
            role: 'assistant',
            content: data.response || data.message || 'Thank you for your message. I\'m here to help with your barbershop business questions.',
            timestamp: new Date().toISOString(),
            model: 'http-api'
          }
          setMessages(prev => [...prev, aiMessage])
        } else {
          throw new Error(data.detail || 'Failed to get response')
        }
      } catch (error) {
        console.error('HTTP chat error:', error)
        setIsTyping(false)
        
        const errorMessage = {
          id: Date.now(),
          role: 'assistant',
          content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment, or check that the backend service is running.',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage()
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-xl">
      {/* Header */}
      <div className={`bg-${currentAgent.color}-600 text-white p-4 rounded-t-lg flex items-center justify-between`}>
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{currentAgent.avatar}</div>
          <div>
            <h3 className="font-semibold">{currentAgent.name}</h3>
            <p className="text-sm opacity-90">
              {isConnected ? 'Online' : 'Connecting...'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <SparklesIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Start a conversation with your AI {currentAgent.name}</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex items-start space-x-2 max-w-[80%] ${
              message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' 
                  ? 'bg-gray-600' 
                  : `bg-${currentAgent.color}-100`
              }`}>
                {message.role === 'user' ? (
                  <UserIcon className="h-5 w-5 text-white" />
                ) : (
                  <span className="text-lg">{currentAgent.avatar}</span>
                )}
              </div>
              
              <div>
                <div className={`rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                  <p className="text-sm">{message.content}</p>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(message.timestamp)}
                  {message.model && message.model !== 'mock' && (
                    <span className="ml-2 text-green-600">AI</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full bg-${currentAgent.color}-100 flex items-center justify-center`}>
                <span className="text-lg">{currentAgent.avatar}</span>
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask ${currentAgent.name} anything...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !inputMessage.trim()}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isConnected && inputMessage.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
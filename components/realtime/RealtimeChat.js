'use client'

import { useState, useEffect, useRef } from 'react'
import { usePusher, usePresenceChannel } from '@/hooks/usePusher'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function RealtimeChat({ roomId = 'general' }) {
  const { user } = useAuth()
  const { subscribe, unsubscribe, trigger, isConnected, CHANNELS, EVENTS } = usePusher()
  const { members } = usePresenceChannel(roomId)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState({})
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef({})
  const channelRef = useRef(null)

  useEffect(() => {
    if (!user || !isConnected) return

    const channelName = CHANNELS.chatRoom(roomId)
    
    channelRef.current = subscribe(channelName, {
      [EVENTS.MESSAGE_SENT]: (message) => {
        setMessages(prev => [...prev, message])
        scrollToBottom()
      },
      [EVENTS.USER_TYPING]: (data) => {
        if (data.userId !== user.id) {
          setTyping(prev => ({ ...prev, [data.userId]: data.userName }))
          
          // Clear typing indicator after 3 seconds
          clearTimeout(typingTimeoutRef.current[data.userId])
          typingTimeoutRef.current[data.userId] = setTimeout(() => {
            setTyping(prev => {
              const newTyping = { ...prev }
              delete newTyping[data.userId]
              return newTyping
            })
          }, 3000)
        }
      },
      [EVENTS.USER_STOPPED_TYPING]: (data) => {
        if (data.userId !== user.id) {
          setTyping(prev => {
            const newTyping = { ...prev }
            delete newTyping[data.userId]
            return newTyping
          })
        }
      },
    })

    return () => {
      unsubscribe(channelName)
    }
  }, [user, roomId, isConnected, subscribe, unsubscribe, CHANNELS, EVENTS])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (!input.trim() || !channelRef.current) return

    const message = {
      id: Date.now(),
      userId: user.id,
      userName: user.email,
      content: input,
      timestamp: new Date().toISOString(),
    }

    // Trigger message event
    channelRef.current.trigger('client-message-sent', message)
    
    // Add to local state immediately
    setMessages(prev => [...prev, message])
    setInput('')
    
    // Stop typing indicator
    channelRef.current.trigger('client-stopped-typing', {
      userId: user.id,
      userName: user.email,
    })
  }

  const handleTyping = (e) => {
    setInput(e.target.value)
    
    if (channelRef.current && e.target.value) {
      channelRef.current.trigger('client-typing', {
        userId: user.id,
        userName: user.email,
      })
    } else if (channelRef.current && !e.target.value) {
      channelRef.current.trigger('client-stopped-typing', {
        userId: user.id,
        userName: user.email,
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Chat Room: {roomId}</h3>
          <p className="text-xs text-gray-500">
            {isConnected ? `${members.length} online` : 'Connecting...'}
          </p>
        </div>
        <div className="flex -space-x-2">
          {members.slice(0, 5).map((member, index) => (
            <div
              key={member.id}
              className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-xs font-medium text-gray-700 border-2 border-white"
              title={member.info.name}
            >
              {member.info.name?.[0]?.toUpperCase() || '?'}
            </div>
          ))}
          {members.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 border-2 border-white">
              +{members.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.userId === user.id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.userId === user.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.userId !== user.id && (
                <p className="text-xs opacity-70 mb-1">{message.userName}</p>
              )}
              <p className="text-sm">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {/* Typing indicators */}
        {Object.entries(typing).map(([userId, userName]) => (
          <div key={userId} className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <p className="text-xs text-gray-600">{userName} is typing...</p>
              <div className="flex space-x-1 mt-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!isConnected}
          />
          <button
            type="submit"
            disabled={!isConnected || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
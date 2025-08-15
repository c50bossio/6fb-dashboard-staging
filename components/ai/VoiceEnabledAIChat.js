'use client'

import { 
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'
import ModelSelector from './ModelSelector'
import VoiceAssistant from '../voice/VoiceAssistant'
import { detectAgentFromCommand, formatForSpeech } from '../../lib/voice-personalities'

export default function VoiceEnabledAIChat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hello! I'm your AI business assistant. You can type or use voice commands. Try saying 'Hey Marcus, what's my revenue today?' 🎤",
      agent: 'Marcus',
      timestamp: new Date(Date.now() - 60000)
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  const [businessContext, setBusinessContext] = useState(null)
  const [selectedModel, setSelectedModel] = useState('gpt-5')
  const [currentAgent, setCurrentAgent] = useState('marcus')
  const [isListening, setIsListening] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [lastAIResponse, setLastAIResponse] = useState(null)
  const messagesEndRef = useRef(null)

  // Check API connection on mount
  useEffect(() => {
    checkAPIConnection()
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const checkAPIConnection = async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        setApiConnected(true)
        setMessages(prev => prev.map(msg => 
          msg.id === 1 
            ? { ...msg, content: "✅ Internal API connection detected! I can access your live booking calendar, appointments, and analytics. You can type or use voice commands. Try saying 'Hey Marcus' or click the microphone button! 🎤" }
            : msg
        ))
      }
    } catch (error) {
      console.error('API connection failed:', error)
      setApiConnected(false)
    }
  }

  const handleVoiceTranscript = async (transcript, confidence) => {
    // Detect which agent should respond based on the command
    const detectedAgent = detectAgentFromCommand(transcript)
    setCurrentAgent(detectedAgent)
    
    // Add user message to chat
    const voiceMessage = {
      id: Date.now(),
      type: 'user',
      content: transcript,
      isVoice: true,
      confidence: confidence,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, voiceMessage])
    
    // Process the message
    await processMessage(transcript, detectedAgent)
  }

  const processMessage = async (text, agentType = currentAgent) => {
    setIsLoading(true)

    try {
      // Call the real AI API with business context
      const response = await fetch('/api/ai/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text,
          businessContext: businessContext || {},
          sessionId: `voice_session_${Date.now()}`,
          request_collaboration: text.length > 100 // Long queries trigger multi-agent
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Map agent response
      const agentName = data.primary_agent || data.agent_id || getAgentName(agentType)
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.message || data.response || "I'll help you with that. Let me analyze your business data.",
        agent: agentName,
        agentType: agentType,
        timestamp: new Date(),
        confidence: data.confidence || data.total_confidence || 0.9,
        dataSources: data.data_sources || [],
        actionsTaken: data.actions_taken || []
      }

      setMessages(prev => [...prev, aiResponse])
      
      // Store for voice synthesis
      if (autoSpeak) {
        const speechText = formatForSpeech(aiResponse.content, agentType)
        setLastAIResponse(speechText)
      }
      
    } catch (error) {
      console.error('AI response error:', error)
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: apiConnected 
          ? "I'm having trouble processing your request right now. Please try again."
          : "⚠️ I'm having trouble connecting to your business data. Please check your API connection.",
        agent: getAgentName(agentType),
        agentType: agentType,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorResponse])
      
      if (autoSpeak) {
        setLastAIResponse(errorResponse.content)
      }
    } finally {
      setIsLoading(false)
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
    
    await processMessage(message)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getAgentName = (agentType) => {
    const names = {
      marcus: 'Marcus',
      sophia: 'Sophia',
      david: 'David',
      master_coach: 'Master Coach'
    }
    return names[agentType] || 'AI Assistant'
  }

  const getAgentIcon = (agentType) => {
    switch(agentType) {
      case 'marcus':
        return '💰' // Financial
      case 'sophia':
        return '📱' // Marketing
      case 'david':
        return '📋' // Operations
      case 'master_coach':
        return '🎯' // Strategy
      default:
        return '🤖'
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
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <CpuChipIcon className="h-8 w-8" />
            {apiConnected && (
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-400 rounded-full animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-semibold">AI Business Assistant</h3>
            <p className="text-xs opacity-90">
              {apiConnected ? '🟢 Connected to live data' : '🔴 Offline mode'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Auto-speak toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`p-2 rounded-lg transition-colors ${
              autoSpeak 
                ? 'bg-white/20 hover:bg-white/30' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
            title={autoSpeak ? 'Voice responses ON' : 'Voice responses OFF'}
          >
            {autoSpeak ? (
              <SpeakerWaveIcon className="h-5 w-5" />
            ) : (
              <SpeakerXMarkIcon className="h-5 w-5" />
            )}
          </button>
          
          <ModelSelector selectedModel={selectedModel} onModelChange={setSelectedModel} />
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[70%] ${msg.type === 'user' ? 'order-2' : 'order-1'}`}>
              {msg.type === 'assistant' && (
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{getAgentIcon(msg.agentType)}</span>
                  <span className="text-sm font-medium text-gray-600">{msg.agent}</span>
                  <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                </div>
              )}
              
              <div className={`rounded-lg px-4 py-2 ${
                msg.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {msg.isVoice && (
                  <div className="flex items-center space-x-1 mb-1">
                    <MicrophoneIcon className="h-3 w-3" />
                    <span className="text-xs opacity-75">
                      Voice ({Math.round((msg.confidence || 0.9) * 100)}% confidence)
                    </span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {msg.dataSources && msg.dataSources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs opacity-75">
                      Data sources: {msg.dataSources.join(', ')}
                    </p>
                  </div>
                )}
              </div>
              
              {msg.type === 'user' && (
                <div className="text-xs text-gray-400 mt-1 text-right">
                  {formatTime(msg.timestamp)}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Assistant Integration */}
      <div className="border-t border-gray-200 p-2 bg-gray-50">
        <VoiceAssistant
          onTranscript={handleVoiceTranscript}
          onListeningChange={setIsListening}
          agentType={currentAgent}
          autoSpeak={autoSpeak}
          agentResponse={lastAIResponse}
        />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "Listening..." : "Type a message or use voice..."}
            disabled={isListening}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading || isListening}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* Voice command hints */}
        <div className="mt-2 text-xs text-gray-500">
          Try: "Hey Marcus, what's my revenue?" • "Sophia, marketing ideas" • "David, today's schedule"
        </div>
      </div>
    </div>
  )
}
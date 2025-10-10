'use client'

import { 
  PaperAirplaneIcon,
  SparklesIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  HeartIcon,
  MegaphoneIcon,
  BanknotesIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef } from 'react'

// Agent configurations with specialized capabilities
const AI_AGENTS = {
  'master_coach': {
    name: 'Marcus (Master Coach)',
    shortName: 'Marcus',
    icon: <LightBulbIcon className="h-5 w-5" />,
    color: 'blue',
    colorClasses: {
      bg: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      text: 'text-blue-900',
      border: 'border-blue-200'
    },
    description: 'Strategic business coaching and leadership development',
    specialties: ['Strategy', 'Leadership', 'Growth', 'Operations', 'Vision']
  },
  'technical_operations': {
    name: 'Sophia (Technical Operations)',
    shortName: 'Sophia',
    icon: <WrenchScrewdriverIcon className="h-5 w-5" />,
    color: 'purple',
    colorClasses: {
      bg: 'bg-purple-500',
      bgLight: 'bg-purple-50',
      text: 'text-purple-900',
      border: 'border-purple-200'
    },
    description: 'System optimization and operational efficiency',
    specialties: ['Systems', 'Efficiency', 'Technology', 'Automation', 'Quality']
  },
  'customer_success': {
    name: 'David (Customer Success)',
    shortName: 'David',
    icon: <HeartIcon className="h-5 w-5" />,
    color: 'green',
    colorClasses: {
      bg: 'bg-green-500',
      bgLight: 'bg-green-50',
      text: 'text-green-900',
      border: 'border-green-200'
    },
    description: 'Client relationships and customer retention strategies',
    specialties: ['Retention', 'Service', 'Communication', 'Satisfaction', 'Loyalty']
  },
  'marketing': {
    name: 'Emma (Marketing)',
    shortName: 'Emma',
    icon: <MegaphoneIcon className="h-5 w-5" />,
    color: 'orange',
    colorClasses: {
      bg: 'bg-orange-500',
      bgLight: 'bg-orange-50',
      text: 'text-orange-900',
      border: 'border-orange-200'
    },
    description: 'Marketing strategies and customer acquisition',
    specialties: ['Marketing', 'Branding', 'Social Media', 'Advertising', 'Growth']
  },
  'financial': {
    name: 'Alex (Financial)',
    shortName: 'Alex',
    icon: <BanknotesIcon className="h-5 w-5" />,
    color: 'emerald',
    colorClasses: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      text: 'text-emerald-900',
      border: 'border-emerald-200'
    },
    description: 'Financial analysis and profit optimization',
    specialties: ['Finance', 'Analytics', 'ROI', 'Pricing', 'Budgeting']
  }
}

export default function EnhancedAIAgentChat() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: "Hello! I'm your AI business intelligence team. We have 5 specialized agents ready to help with different aspects of your barbershop business. Select an agent below or ask any question and I'll route it to the right specialist!",
      agent: 'system',
      agentType: 'master_coach',
      timestamp: new Date(Date.now() - 60000)
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [apiConnected, setApiConnected] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState('master_coach')
  const [showAgentSelector, setShowAgentSelector] = useState(false)
  const messagesEndRef = useRef(null)

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Check API connection on mount
  useEffect(() => {
    checkAPIConnection()
  }, [])

  const checkAPIConnection = async () => {
    try {
      // Check both our internal API and the AI agent system
      const [internalResponse, agentResponse] = await Promise.all([
        fetch('/api/health').catch(() => null),
        fetch('http://localhost:8002/health').catch(() => null)
      ])
      
      const internalConnected = internalResponse?.ok
      const agentSystemConnected = agentResponse?.ok
      
      if (agentSystemConnected) {
        setApiConnected(true)
        // Update initial message to show AI system connection
        setMessages(prev => prev.map(msg => 
          msg.id === 1 
            ? { ...msg, content: "✅ AI Agent System Connected! All 5 specialized agents are ready to help with your business. I have access to comprehensive business intelligence including Six Figure Barber methodology, customer analytics, financial optimization, and operational excellence strategies. What can I help you with today?" }
            : msg
        ))
      } else if (internalConnected) {
        setApiConnected(true)
        setMessages(prev => prev.map(msg => 
          msg.id === 1 
            ? { ...msg, content: "✅ Internal API connected! I can access your business data. However, the specialized AI agents may have limited functionality. What business insights can I help you with?" }
            : msg
        ))
      } else {
        setApiConnected(false)
      }
    } catch (error) {
      console.error('API connection failed:', error)
      setApiConnected(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

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
      // First try to use the specialized AI agent system
      let response = await fetch(`http://localhost:8002/agents/${selectedAgent}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentMessage,
          context: {
            business_type: 'barbershop',
            user_preference: 'comprehensive_insights',
            session_id: 'web_chat_' + Date.now()
          },
          request_type: 'analysis',
          structured_output: false,
          user_id: 'web_user'
        }),
      })

      let aiResponseContent = ""
      let responseAgent = AI_AGENTS[selectedAgent]

      if (response.ok) {
        const data = await response.json()
        aiResponseContent = data.result || data.message || "I understand your question, but I'm having trouble generating a response right now."
      } else {
        // Fallback to internal API
        response = await fetch('/api/ai/unified-chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: `You are ${responseAgent.shortName}, a ${responseAgent.description} specialist. Focus on ${responseAgent.specialties.join(', ')} when providing advice.`
              },
              ...messages.filter(msg => msg.type !== 'system').slice(-5).map(msg => ({
                role: msg.type === 'user' ? 'user' : 'assistant',
                content: msg.content
              })),
              {
                role: 'user',
                content: currentMessage
              }
            ],
            provider: 'openai',
            model: 'gpt-4o-mini',
            stream: false,
            includeBusinessContext: true
          }),
        })

        if (response.ok) {
          const data = await response.json()
          aiResponseContent = data.content || "I'm having trouble processing your request with the specialized agents. Please try again."
        } else {
          aiResponseContent = `I'm currently experiencing connection issues with the AI agent system. ${responseAgent.shortName} would normally help with ${responseAgent.specialties.join(', ')}, but I can't access the specialized knowledge right now.`
        }
      }

      const aiResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: aiResponseContent,
        agent: responseAgent.shortName,
        agentType: selectedAgent,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, aiResponse])
    } catch (error) {
      console.error('AI response error:', error)
      
      const errorResponse = {
        id: Date.now() + 1,
        type: 'assistant',
        content: "I apologize, but I'm experiencing technical difficulties connecting to the AI agents. Please check the connection and try again.",
        agent: AI_AGENTS[selectedAgent].shortName,
        agentType: selectedAgent,
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

  const handleQuickAction = (question, agentType = selectedAgent) => {
    setSelectedAgent(agentType)
    setMessage(question)
  }

  const currentAgent = AI_AGENTS[selectedAgent]

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-lg">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className={`h-10 w-10 ${currentAgent.colorClasses.bg} rounded-full flex items-center justify-center text-white`}>
            {currentAgent.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">AI Business Intelligence</h3>
            <p className="text-sm text-gray-500">5 Specialized Agents • {currentAgent.shortName} Active</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            apiConnected 
              ? 'bg-green-100 text-green-900' 
              : 'bg-amber-100 text-amber-900'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
              apiConnected ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            {apiConnected ? 'AI System Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Agent Selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Active Agent:</span>
          <button
            onClick={() => setShowAgentSelector(!showAgentSelector)}
            className={`flex items-center space-x-2 px-3 py-2 ${currentAgent.colorClasses.bgLight} ${currentAgent.colorClasses.text} rounded-lg hover:bg-opacity-80 transition-colors`}
          >
            {currentAgent.icon}
            <span className="font-medium">{currentAgent.shortName}</span>
            {showAgentSelector ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
          </button>
        </div>
        
        {showAgentSelector && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            {Object.entries(AI_AGENTS).map(([key, agent]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedAgent(key)
                  setShowAgentSelector(false)
                }}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                  selectedAgent === key
                    ? `${agent.colorClasses.bgLight} ${agent.colorClasses.border} ${agent.colorClasses.text}`
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className={`${agent.colorClasses.bg} p-2 rounded-full text-white mb-2`}>
                  {agent.icon}
                </div>
                <span className="text-xs font-medium text-center">{agent.shortName}</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {agent.specialties.slice(0, 2).map(specialty => (
                    <span key={specialty} className="text-xs px-1 py-0.5 bg-white bg-opacity-50 rounded">
                      {specialty}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
        
        <div className="mt-2">
          <p className="text-xs text-gray-500">{currentAgent.description}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              msg.type === 'user' 
                ? `${currentAgent.colorClasses.bg} text-white` 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.type === 'assistant' && (
                <div className="flex items-center space-x-2 mb-1">
                  {msg.agentType && AI_AGENTS[msg.agentType] ? (
                    <div className={`${AI_AGENTS[msg.agentType].colorClasses.bg} p-1 rounded-full text-white`}>
                      {AI_AGENTS[msg.agentType].icon}
                    </div>
                  ) : (
                    <CpuChipIcon className="h-4 w-4 text-gray-500" />
                  )}
                  <span className="text-xs font-medium text-gray-500">{msg.agent}</span>
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              <p className={`text-xs mt-1 ${
                msg.type === 'user' ? 'text-white text-opacity-70' : 'text-gray-500'
              }`}>
                {formatTime(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
              <div className="flex items-center space-x-2 mb-1">
                <div className={`${currentAgent.colorClasses.bg} p-1 rounded-full text-white`}>
                  {currentAgent.icon}
                </div>
                <span className="text-xs font-medium text-gray-500">{currentAgent.shortName}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-gray-500">Analyzing with business intelligence...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-3">
          <div className="flex-1">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${currentAgent.shortName} about ${currentAgent.specialties.slice(0, 2).join(', ').toLowerCase()}...`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!message.trim() || isLoading}
            className={`px-4 py-2 ${currentAgent.colorClasses.bg} text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleQuickAction("Create a comprehensive business growth strategy for my barbershop", 'master_coach')}
              className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100"
            >
              📈 Growth Strategy (Marcus)
            </button>
            <button
              onClick={() => handleQuickAction("Analyze my booking system efficiency and suggest improvements", 'technical_operations')}
              className="px-3 py-1 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100"
            >
              ⚙️ System Optimization (Sophia)
            </button>
            <button
              onClick={() => handleQuickAction("How can I improve customer retention and satisfaction?", 'customer_success')}
              className="px-3 py-1 text-xs bg-green-50 text-green-700 rounded-full hover:bg-green-100"
            >
              💚 Customer Success (David)
            </button>
            <button
              onClick={() => handleQuickAction("Develop a social media marketing strategy for my barbershop", 'marketing')}
              className="px-3 py-1 text-xs bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100"
            >
              📢 Marketing Plan (Emma)
            </button>
            <button
              onClick={() => handleQuickAction("Analyze my pricing strategy and profit margins for optimization", 'financial')}
              className="px-3 py-1 text-xs bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100"
            >
              💰 Financial Analysis (Alex)
            </button>
          </div>
          
          <div className="text-center">
            <span className="text-xs text-gray-500">
              {apiConnected ? '🟢 All agents connected with business intelligence' : '🔴 Limited functionality - check AI system connection'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
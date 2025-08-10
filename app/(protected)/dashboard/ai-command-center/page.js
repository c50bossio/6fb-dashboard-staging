'use client'

import { 
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  BanknotesIcon,
  MegaphoneIcon,
  UserGroupIcon,
  LightBulbIcon,
  FireIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef, useCallback } from 'react'

import ProtectedRoute from '../../../../components/ProtectedRoute'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { Card } from '../../../../components/ui'
import ExecutableActionButton from '../../../../components/ExecutableActionButton'

// Agent Personality Icons
const AGENT_ICONS = {
  'financial_coach': BanknotesIcon,
  'marketing_expert': MegaphoneIcon,
  'operations_manager': Cog6ToothIcon,
  'customer_relations': UserGroupIcon,
  'growth_strategy': ChartBarIcon,
  'strategic_mindset': LightBulbIcon
}

const AGENT_COLORS = {
  'financial_coach': 'bg-green-50 text-green-600 border-green-200',
  'marketing_expert': 'bg-purple-50 text-purple-600 border-purple-200',
  'operations_manager': 'bg-blue-50 text-blue-600 border-blue-200',
  'customer_relations': 'bg-pink-50 text-pink-600 border-pink-200',
  'growth_strategy': 'bg-orange-50 text-orange-600 border-orange-200',
  'strategic_mindset': 'bg-indigo-50 text-indigo-600 border-indigo-200'
}

// Quick Actions Component
function QuickActions({ onQuickAction, isLoading }) {
  const quickActions = [
    {
      id: 'revenue_analysis',
      label: 'Analyze Revenue',
      icon: ChartBarIcon,
      color: 'bg-green-100 text-green-700 hover:bg-green-200',
      prompt: 'Analyze my current revenue performance and provide recommendations to increase monthly revenue'
    },
    {
      id: 'marketing_campaign',
      label: 'Launch Campaign',
      icon: RocketLaunchIcon,
      color: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
      prompt: 'Help me create and launch a marketing campaign to attract new customers'
    },
    {
      id: 'staff_optimization',
      label: 'Optimize Operations',
      icon: Cog6ToothIcon,
      color: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
      prompt: 'Review my current operations and suggest improvements for efficiency and customer satisfaction'
    },
    {
      id: 'customer_retention',
      label: 'Improve Retention',
      icon: UserGroupIcon,
      color: 'bg-pink-100 text-pink-700 hover:bg-pink-200',
      prompt: 'Analyze customer retention and create a strategy to increase loyalty and repeat visits'
    },
    {
      id: 'pricing_strategy',
      label: 'Strategic Pricing',
      icon: BanknotesIcon,
      color: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
      prompt: 'Review my pricing strategy and recommend optimizations for maximum profitability'
    },
    {
      id: 'social_media',
      label: 'Social Media',
      icon: MegaphoneIcon,
      color: 'bg-red-100 text-red-700 hover:bg-red-200',
      prompt: 'Create a social media strategy to increase online presence and attract customers'
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
      {quickActions.map((action) => {
        const IconComponent = action.icon
        return (
          <button
            key={action.id}
            onClick={() => onQuickAction(action.prompt)}
            disabled={isLoading}
            className={`${action.color} p-3 rounded-lg border transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <div className="flex flex-col items-center space-y-1">
              <IconComponent className="h-5 w-5" />
              <span className="text-xs font-medium text-center">{action.label}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// Message Bubble Component
function MessageBubble({ message, isUser, agent, isLoading = false, handleExecuteAction }) {
  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2 max-w-xs lg:max-w-md">
          <p className="text-sm">{message}</p>
        </div>
      </div>
    )
  }

  // AI Agent Message
  const AgentIcon = agent?.personality ? AGENT_ICONS[agent.personality] || SparklesIcon : SparklesIcon
  const agentColor = agent?.personality ? AGENT_COLORS[agent.personality] || 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <div className="flex justify-start mb-6">
      <div className="flex space-x-3 max-w-4xl">
        {/* Agent Avatar */}
        <div className={`${agentColor} w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0`}>
          {isLoading ? (
            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
          ) : (
            <AgentIcon className="h-5 w-5" />
          )}
        </div>

        {/* Message Content */}
        <div className="bg-gray-50 rounded-2xl rounded-tl-md px-4 py-3 border border-gray-200">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-gray-500">AI is thinking...</span>
            </div>
          ) : (
            <div>
              {/* Agent Header */}
              {agent && (
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold text-sm text-gray-700">
                    {agent.name || 'AI Agent'}
                  </span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                    {agent.confidence ? `${(agent.confidence * 100).toFixed(0)}% confident` : 'AI Response'}
                  </span>
                </div>
              )}

              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{message}</div>
              </div>

              {/* Recommendations */}
              {agent?.recommendations && agent.recommendations.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">💡 Recommendations:</h4>
                  <ul className="space-y-1">
                    {agent.recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx} className="text-xs text-gray-600 flex items-start space-x-2">
                        <span className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {agent?.action_items && agent.action_items.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">🎯 Action Items:</h4>
                  <div className="space-y-2">
                    {agent.action_items.slice(0, 2).map((action, idx) => (
                      <ExecutableActionButton
                        key={idx}
                        action={{
                          ...action,
                          type: action.type || 'general_action',
                          label: action.task,
                          priority: action.priority || 'medium'
                        }}
                        onExecute={handleExecuteAction}
                        size="small"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Conversation History Sidebar
function ConversationHistory({ conversations, activeConversation, onSelectConversation, onNewConversation }) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
          <button
            onClick={onNewConversation}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start chatting to see history</p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onSelectConversation(conversation.id)}
                className={`w-full p-3 text-left rounded-lg border transition-colors ${
                  activeConversation === conversation.id
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="font-medium text-sm truncate">
                  {conversation.title || 'New Conversation'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {conversation.messages?.length || 0} messages
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(conversation.updated_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Main AI Command Center Component
function AICommandCenter() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [showHistory, setShowHistory] = useState(true)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
    
    // Save conversation when messages update
    if (messages.length > 0 && messages[messages.length - 1].id !== 'welcome') {
      saveCurrentConversation()
    }
  }, [messages])

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem('ai-conversations')
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations)
        setConversations(parsed)
        // Load the most recent conversation
        if (parsed.length > 0) {
          const mostRecent = parsed[0]
          setActiveConversation(mostRecent.id)
          setMessages(mostRecent.messages || [])
        }
      } catch (e) {
        console.error('Failed to load conversations:', e)
      }
    }
  }, [])

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        text: `🚀 **Welcome to the AI Command Center!**

I'm your AI-powered business intelligence system. I have access to all your barbershop agents:

**💰 Marcus** - Financial Coach (revenue, pricing, profitability)
**📱 Sophia** - Marketing Expert (social media, customer acquisition)  
**⚙️ David** - Operations Manager (scheduling, staff, workflows)
**👥 Sarah** - Customer Relations (satisfaction, retention, reviews)
**📈 Alex** - Growth Strategist (expansion, performance, analytics)
**🧠 Emma** - Strategic Mindset (long-term planning, decision support)

**How to use me:**
• Ask questions about your business: *"How can I increase revenue?"*
• Request specific actions: *"Launch a social media campaign"*
• Get strategic advice: *"What's my next growth priority?"*
• Execute tasks: *"Send follow-up messages to lapsed customers"*

Try the quick actions below or just start chatting! 💬`,
        isUser: false,
        agent: {
          name: 'AI Command Center',
          personality: 'strategic_mindset',
          confidence: 1.0
        },
        timestamp: new Date().toISOString()
      }])
    }
  }, [])

  // Send message to AI agents
  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isUser: true,
      timestamp: new Date().toISOString()
    }

    console.log('Adding user message:', userMessage)
    setMessages(prev => {
      console.log('Previous messages:', prev)
      const newMessages = [...prev, userMessage]
      console.log('New messages:', newMessages)
      return newMessages
    })
    setInputMessage('')
    setIsLoading(true)

    try {
      // Add loading message
      const loadingMessage = {
        id: `loading-${Date.now()}`,
        text: '',
        isUser: false,
        isLoading: true,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, loadingMessage])

      // Send to AI orchestrator
      const response = await fetch('/api/ai/orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          context: {
            user_id: user?.id,
            business_name: 'Elite Cuts Barbershop',
            conversation_id: activeConversation || `conv_${Date.now()}`,
            timestamp: new Date().toISOString()
          }
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()

      // Remove loading message and add AI response
      console.log('AI Response received:', data)
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading)
        const aiMessage = {
          id: `ai-${Date.now()}`,
          text: data.response || data.message || 'I apologize, but I encountered an issue processing your request. Please try again.',
          isUser: false,
          agent: {
            name: data.agent_name || 'AI Agent',
            personality: data.agent_personality || 'strategic_mindset',
            confidence: data.confidence || 0.8,
            recommendations: data.recommendations || [],
            action_items: data.action_items || [],
            follow_up_questions: data.follow_up_questions || []
          },
          timestamp: new Date().toISOString()
        }
        console.log('Adding AI message:', aiMessage)
        const newMessages = [...filtered, aiMessage]
        console.log('Updated messages after AI response:', newMessages)
        return newMessages
      })

    } catch (error) {
      console.error('Error sending message:', error)
      
      // Remove loading message and add error message
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading)
        return [...filtered, {
          id: `error-${Date.now()}`,
          text: `I apologize, but I'm experiencing technical difficulties right now. Here are some things you can try while I get back online:

💡 **Quick Business Tips:**
• Focus on customer retention - it's 5x cheaper than acquiring new customers
• Track your daily revenue targets - aim for consistent $500+ days
• Optimize your peak hours (10am-2pm, 5pm-7pm) for maximum revenue
• Gather customer reviews immediately after great experiences

Please try your question again in a moment!`,
          isUser: false,
          agent: {
            name: 'System Assistant',
            personality: 'strategic_mindset',
            confidence: 0.7
          },
          timestamp: new Date().toISOString()
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (prompt) => {
    sendMessage(prompt)
  }

  // Execute action handler
  const handleExecuteAction = async (action) => {
    try {
      // Add user message showing action being executed
      const executionMessage = {
        id: `exec-${Date.now()}`,
        text: `🎯 Executing: ${action.label || action.task}`,
        isUser: true,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, executionMessage])

      // Call executable action API
      const response = await fetch('/api/ai/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action_type: action.type,
          parameters: {
            task: action.task,
            priority: action.priority,
            context: {
              user_id: user?.id,
              business_name: 'Elite Cuts Barbershop'
            }
          }
        }),
      })

      const data = await response.json()

      // Add AI response about the execution
      const resultMessage = {
        id: `exec-result-${Date.now()}`,
        text: data.success 
          ? `✅ **Action Completed Successfully!**\n\n${data.message}\n\n${data.details || ''}`
          : `❌ **Action Failed**\n\n${data.error || 'Unknown error occurred'}\n\nPlease try again or contact support.`,
        isUser: false,
        agent: {
          name: 'Action Executor',
          personality: 'operations_manager',
          confidence: data.success ? 0.95 : 0.6
        },
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, resultMessage])

      return {
        success: data.success,
        message: data.success ? 'Action completed!' : 'Action failed',
        error: data.success ? null : data.error
      }

    } catch (error) {
      console.error('Action execution error:', error)
      
      // Add error message
      const errorMessage = {
        id: `exec-error-${Date.now()}`,
        text: `❌ **Execution Error**\n\nI encountered an issue while executing "${action.label || action.task}". This might be due to temporary connectivity issues.\n\n**What you can try:**\n• Check your connection and try again\n• Try the action manually for now\n• Contact support if this persists`,
        isUser: false,
        agent: {
          name: 'System Assistant',
          personality: 'operations_manager',
          confidence: 0.5
        },
        timestamp: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, errorMessage])
      
      return {
        success: false,
        error: error.message || 'Network error'
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputMessage)
  }

  const saveCurrentConversation = () => {
    if (messages.length === 0) return
    
    const conversationId = activeConversation || `conv-${Date.now()}`
    const title = messages.find(m => m.isUser)?.text.substring(0, 50) || 'New Conversation'
    
    const currentConversation = {
      id: conversationId,
      title,
      messages,
      created_at: activeConversation 
        ? conversations.find(c => c.id === activeConversation)?.created_at || new Date().toISOString()
        : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    let updatedConversations = [...conversations]
    const existingIndex = updatedConversations.findIndex(c => c.id === conversationId)
    
    if (existingIndex >= 0) {
      updatedConversations[existingIndex] = currentConversation
    } else {
      updatedConversations.unshift(currentConversation)
      setActiveConversation(conversationId)
    }
    
    // Sort by updated_at (most recent first)
    updatedConversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    
    // Keep only last 20 conversations
    updatedConversations = updatedConversations.slice(0, 20)
    
    setConversations(updatedConversations)
    localStorage.setItem('ai-conversations', JSON.stringify(updatedConversations))
  }

  const handleNewConversation = () => {
    setMessages([])
    setActiveConversation(null)
    // Re-trigger welcome message
    setTimeout(() => {
      setMessages([{
        id: 'welcome',
        text: `🚀 **Welcome to the AI Command Center!**

I'm your AI-powered business intelligence system. Ready to help you grow your barbershop business!

**Available Agents:**
💰 **Marcus** (Financial), 📱 **Sophia** (Marketing), ⚙️ **David** (Operations), 👥 **Sarah** (Customer Relations), 📈 **Alex** (Growth), 🧠 **Emma** (Strategy)

What would you like to work on today?`,
        isUser: false,
        agent: {
          name: 'AI Command Center',
          personality: 'strategic_mindset',
          confidence: 1.0
        },
        timestamp: new Date().toISOString()
      }])
    }, 100)
  }

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Conversation History Sidebar */}
      {showHistory && (
        <ConversationHistory
          conversations={conversations}
          activeConversation={activeConversation}
          onSelectConversation={(conversationId) => {
            const conversation = conversations.find(c => c.id === conversationId)
            if (conversation) {
              setActiveConversation(conversationId)
              setMessages(conversation.messages || [])
            }
          }}
          onNewConversation={handleNewConversation}
        />
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Command Center</h1>
                <p className="text-sm text-gray-500">Your intelligent business assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
              >
                <ClockIcon className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>AI Agents Online</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Quick Actions */}
          <QuickActions onQuickAction={handleQuickAction} isLoading={isLoading} />

          {/* Messages */}
          <div className="space-y-4">
            {/* Debug: Show message count */}
            <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
              Debug: {messages.length} messages in state
            </div>
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.text}
                isUser={message.isUser}
                agent={message.agent}
                isLoading={message.isLoading}
                handleExecuteAction={handleExecuteAction}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about your business, request actions, or get strategic advice..."
                rows={1}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                style={{
                  minHeight: '50px',
                  maxHeight: '120px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </form>
          
          <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>💡 Try: "Analyze my revenue" or "Launch a marketing campaign"</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Press Enter to send, Shift+Enter for new line</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AICommandCenterPage() {
  return (
    <ProtectedRoute>
      <AICommandCenter />
    </ProtectedRoute>
  )
}
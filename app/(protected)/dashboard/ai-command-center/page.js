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
  BoltIcon,
  TrashIcon,
  XMarkIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

import ModelSelector from '../../../../components/chat/ModelSelector'
import ExecutableActionButton from '../../../../components/ExecutableActionButton'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { Card } from '../../../../components/ui'

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
  'marketing_expert': 'bg-gold-50 text-gold-600 border-gold-200',
  'operations_manager': 'bg-olive-50 text-olive-600 border-olive-200',
  'customer_relations': 'bg-pink-50 text-pink-600 border-pink-200',
  'growth_strategy': 'bg-orange-50 text-orange-600 border-orange-200',
  'strategic_mindset': 'bg-indigo-50 text-olive-600 border-indigo-200'
}

function QuickActions({ onQuickAction, isLoading }) {
  const quickActions = [
    {
      id: 'revenue_analysis',
      label: 'Analyze Revenue',
      icon: ChartBarIcon,
      color: 'bg-moss-100 text-moss-800 hover:bg-green-200',
      prompt: 'Analyze my current revenue performance and provide recommendations to increase monthly revenue'
    },
    {
      id: 'marketing_campaign',
      label: 'Launch Campaign',
      icon: RocketLaunchIcon,
      color: 'bg-gold-100 text-gold-700 hover:bg-gold-200',
      prompt: 'Help me create and launch a marketing campaign to attract new customers'
    },
    {
      id: 'staff_optimization',
      label: 'Optimize Operations',
      icon: Cog6ToothIcon,
      color: 'bg-olive-100 text-olive-700 hover:bg-olive-200',
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
      color: 'bg-amber-100 text-amber-900 hover:bg-yellow-200',
      prompt: 'Review my pricing strategy and recommend optimizations for maximum profitability'
    },
    {
      id: 'social_media',
      label: 'Social Media',
      icon: MegaphoneIcon,
      color: 'bg-softred-100 text-softred-800 hover:bg-red-200',
      prompt: 'Create a social media strategy to increase online presence and attract customers'
    }
  ]

  return (
    <div className="mb-8">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center">
        <BoltIcon className="h-4 w-4 mr-2 text-olive-600" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const IconComponent = action.icon
          return (
            <button
              key={action.id}
              onClick={() => onQuickAction(action.prompt)}
              disabled={isLoading}
              className={`${action.color} p-4 rounded-xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group relative focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2`}
              aria-label={`Quick action: ${action.label}. ${action.prompt}`}
              role="button"
              tabIndex={isLoading ? -1 : 0}
            >
              <div className="flex flex-col items-center space-y-2">
                <div className="p-2 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
                  <IconComponent className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold text-center leading-tight">{action.label}</span>
              </div>
              
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MessageBubble({ message, isUser, agent, isLoading = false, handleExecuteAction, isError = false, onRetry }) {
  if (isUser) {
    return (
      <div className="flex justify-end mb-6" role="article" aria-label="User message">
        <div className="bg-gradient-to-br from-olive-600 to-olive-700 text-white rounded-2xl rounded-br-md px-5 py-3 max-w-xs lg:max-w-md shadow-lg">
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    )
  }

  const AgentIcon = agent?.personality ? AGENT_ICONS[agent.personality] || SparklesIcon : SparklesIcon
  const agentColor = agent?.personality ? AGENT_COLORS[agent.personality] || 'bg-gray-50 text-gray-600 border-gray-200' : 'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <div className="flex justify-start mb-6" role="article" aria-label={`AI Agent message from ${agent?.name || 'AI Agent'}`}>
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
        <div className="bg-white rounded-2xl rounded-tl-md px-5 py-4 border border-gray-200 shadow-sm">
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-gray-800">
                      {agent.name || 'AI Agent'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agent.confidence >= 0.8 
                        ? 'bg-moss-100 text-moss-800' 
                        : agent.confidence >= 0.6 
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {agent.confidence ? `${(agent.confidence * 100).toFixed(0)}% confident` : 'AI Response'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              )}

              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{message}</div>
              </div>

              {/* Recommendations */}
              {agent?.recommendations && agent.recommendations.length > 0 && (
                <div className="mt-4 p-3 bg-olive-50 rounded-lg border-l-4 border-olive-400">
                  <h4 className="font-semibold text-sm text-olive-800 mb-2 flex items-center">
                    <LightBulbIcon className="h-4 w-4 mr-1" />
                    Key Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {agent.recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx} className="text-sm text-olive-700 flex items-start space-x-2">
                        <CheckCircleIcon className="h-4 w-4 mt-0.5 text-olive-500 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {agent?.action_items && agent.action_items.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <h4 className="font-semibold text-sm text-green-800 mb-3 flex items-center">
                    <RocketLaunchIcon className="h-4 w-4 mr-1" />
                    Action Items
                  </h4>
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
              
              {/* Retry button for error messages */}
              {isError && onRetry && (
                <div className="mt-4 pt-3 border-t border-red-200">
                  <button
                    onClick={onRetry}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    aria-label="Retry last message"
                  >
                    <span>🔄</span>
                    <span className="text-sm font-medium">Try Again</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ConversationHistory({ conversations, activeConversation, onSelectConversation, onNewConversation, onDeleteConversation, onDeleteAll }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent') // recent, oldest, alphabetical
  const [showDropdown, setShowDropdown] = useState(null) // Track which conversation dropdown is open
  
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(null)
    }
    
    if (showDropdown) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])
  
  const handleDelete = (e, conversationId) => {
    e.stopPropagation()
    setDeleteTarget(conversationId)
    setShowDeleteConfirm(true)
  }
  
  const confirmDelete = () => {
    if (deleteTarget === 'all') {
      onDeleteAll()
    } else if (deleteTarget) {
      onDeleteConversation(deleteTarget)
    }
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }
  
  const exportConversation = (conversation, format = 'json') => {
    let content = ''
    let filename = `conversation-${conversation.id}`
    
    if (format === 'json') {
      content = JSON.stringify(conversation, null, 2)
      filename += '.json'
    } else if (format === 'txt') {
      const title = conversation.title || 'Conversation'
      const date = new Date(conversation.created_at).toLocaleString()
      
      content = `${title}\n${date}\n${'='.repeat(50)}\n\n`
      
      conversation.messages?.forEach(msg => {
        const sender = msg.isUser ? 'You' : (msg.agent?.name || 'AI Agent')
        const timestamp = new Date(msg.timestamp).toLocaleTimeString()
        content += `[${timestamp}] ${sender}:\n${msg.text}\n\n`
      })
      
      filename += '.txt'
    }
    
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = conversations.filter(conv => 
        conv.title?.toLowerCase().includes(query) ||
        conv.messages?.some(msg => msg.text?.toLowerCase().includes(query))
      )
    }
    
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.updated_at) - new Date(b.updated_at)
        case 'alphabetical':
          return (a.title || '').localeCompare(b.title || '')
        case 'recent':
        default:
          return new Date(b.updated_at) - new Date(a.updated_at)
      }
    })
    
    return sorted
  }, [conversations, searchQuery, sortBy])
  
  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Conversations</h2>
          <div className="flex space-x-2">
            {conversations.length > 0 && (
              <button
                onClick={() => {
                  setDeleteTarget('all')
                  setShowDeleteConfirm(true)
                }}
                className="text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                title="Delete All"
                aria-label="Delete all conversations"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={onNewConversation}
              className="bg-olive-600 text-white p-2 rounded-lg hover:bg-olive-700 transition-colors"
              title="New Conversation"
              aria-label="Start new conversation"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Search and Sort Controls */}
        {conversations.length > 0 && (
          <div className="space-y-2">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                aria-label="Search conversations"
              />
              <div className="absolute left-2.5 top-2.5 text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
              aria-label="Sort conversations by"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="alphabetical">A-Z</option>
            </select>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start chatting to see history</p>
          </div>
        ) : filteredAndSortedConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <p className="text-sm">No conversations found</p>
            <p className="text-xs">Try a different search term</p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-xs text-olive-600 hover:text-olive-700 underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredAndSortedConversations.map((conversation) => (
              <div key={conversation.id} className="relative group">
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full p-3 text-left rounded-lg border transition-colors ${
                    activeConversation === conversation.id
                      ? 'bg-olive-50 border-olive-200 text-olive-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium text-sm truncate pr-16">
                    {conversation.title || 'New Conversation'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {conversation.messages?.length || 0} messages
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(conversation.updated_at).toLocaleDateString()}
                  </div>
                </button>
                
                {/* Action Buttons */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                  {/* More Actions Dropdown */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowDropdown(showDropdown === conversation.id ? null : conversation.id)
                      }}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                      title="More actions"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4 text-gray-600" />
                    </button>
                    
                    {/* Dropdown Menu */}
                    {showDropdown === conversation.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            exportConversation(conversation, 'txt')
                            setShowDropdown(null)
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          <span>Export as TXT</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            exportConversation(conversation, 'json')
                            setShowDropdown(null)
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          <span>Export as JSON</span>
                        </button>
                        <div className="border-t border-gray-200"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(e, conversation.id)
                            setShowDropdown(null)
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-700 hover:bg-red-50 rounded-b-lg"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Confirm Delete</h3>
            <p className="text-gray-600 mb-4">
              {deleteTarget === 'all' 
                ? 'Are you sure you want to delete all conversations? This cannot be undone.'
                : 'Are you sure you want to delete this conversation?'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AICommandCenter() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [showHistory, setShowHistory] = useState(true)
  const [retryCount, setRetryCount] = useState(0)
  const [lastFailedMessage, setLastFailedMessage] = useState(null)
  const [modelConfig, setModelConfig] = useState({
    model: 'gpt-4o',
    provider: 'openai'
  })
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const debouncedSaveConversations = useCallback((conversationsToSave) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem('ai-conversations', JSON.stringify(conversationsToSave))
      } catch (error) {
        console.error('Failed to save conversations to localStorage:', error)
        if (error.name === 'QuotaExceededError') {
          const recentConversations = conversationsToSave.slice(0, 10)
          try {
            localStorage.setItem('ai-conversations', JSON.stringify(recentConversations))
          } catch (retryError) {
            console.error('Failed to save even reduced conversations:', retryError)
          }
        }
      }
    }, 500)
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
    
    if (messages.length > 0 && messages[messages.length - 1].id !== 'welcome') {
      saveCurrentConversation()
    }
  }, [messages])

  useEffect(() => {
    const savedConversations = localStorage.getItem('ai-conversations')
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations)
        setConversations(parsed)
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

  const sendMessage = async (messageText) => {
    if (!messageText.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      text: messageText.trim(),
      isUser: true,
      timestamp: new Date().toISOString()
    }

    setLastFailedMessage(messageText.trim())

    setInputMessage('')
    setIsLoading(true)
    
    setMessages(prev => [...prev, userMessage])

    try {
      const loadingMessage = {
        id: `loading-${Date.now()}`,
        text: '',
        isUser: false,
        isLoading: true,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, loadingMessage])

      const response = await fetch('/api/ai/orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          model: modelConfig.model,
          provider: modelConfig.provider,
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

      setRetryCount(0)
      setLastFailedMessage(null)
      
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
        return [...filtered, aiMessage]
      })

    } catch (error) {
      console.error('Error sending message:', error)
      
      const isNetworkError = error.message.includes('fetch') || error.message.includes('network') || error.name === 'NetworkError'
      const isServerError = error.message.includes('500') || error.message.includes('server')
      const isTimeoutError = error.message.includes('timeout') || error.message.includes('Timeout')
      
      let errorMessage = `🚨 **Connection Issue**\n\nI'm having trouble connecting right now. `
      let helpfulTips = `\n\n💡 **While I reconnect, here's what you can do:**\n• Check your internet connection\n• Try refreshing the page\n• Wait 30 seconds and try again\n\n**Quick Business Insights:**\n• Customer retention is 5x cheaper than acquisition\n• Aim for consistent $500+ daily revenue\n• Peak hours: 10am-2pm, 5pm-7pm are gold\n• Collect reviews immediately after great experiences`
      
      if (isNetworkError) {
        errorMessage = `🌐 **Network Connection Lost**\n\nYour internet connection seems to be interrupted. `
        helpfulTips = `\n\n🔧 **Quick fixes:**\n• Check your WiFi connection\n• Try switching to mobile data temporarily\n• Refresh the page when connected\n\n**Meanwhile, consider these business actions:**\n• Review yesterday's appointments\n• Plan tomorrow's schedule\n• Follow up with recent customers`
      } else if (isServerError) {
        errorMessage = `⚙️ **Service Temporarily Unavailable**\n\nOur AI services are experiencing high demand. `
        helpfulTips = `\n\n⏱️ **Expected resolution:**\n• Usually resolves within 2-3 minutes\n• Try again shortly\n• Your conversation history is saved\n\n**Productive alternatives:**\n• Review customer feedback\n• Plan your marketing strategy\n• Analyze this week's performance`
      } else if (isTimeoutError) {
        errorMessage = `⏰ **Request Timed Out**\n\nYour request is taking longer than usual. `
        helpfulTips = `\n\n🔄 **What to try:**\n• Simplify your question\n• Try again in a moment\n• Break complex requests into smaller parts\n\n**Quick wins while waiting:**\n• Check Google My Business reviews\n• Update social media\n• Review appointment schedule`
      }
      
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isLoading)
        return [...filtered, {
          id: `error-${Date.now()}`,
          text: errorMessage + helpfulTips,
          isUser: false,
          agent: {
            name: 'System Assistant',
            personality: 'strategic_mindset',
            confidence: 0.6,
            recommendations: [
              'Check your internet connection',
              'Try refreshing the page if issues persist',
              'Consider asking simpler questions first'
            ]
          },
          timestamp: new Date().toISOString(),
          isError: true,
          canRetry: true
        }]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = (prompt) => {
    sendMessage(prompt)
  }

  const retryLastMessage = () => {
    if (lastFailedMessage) {
      setRetryCount(prev => prev + 1)
      sendMessage(lastFailedMessage)
    }
  }

  const handleExecuteAction = async (action) => {
    try {
      const executionMessage = {
        id: `exec-${Date.now()}`,
        text: `🎯 Executing: ${action.label || action.task}`,
        isUser: true,
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, executionMessage])

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

  const saveCurrentConversation = useCallback(() => {
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
    
    updatedConversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    
    updatedConversations = updatedConversations.slice(0, 20)
    
    setConversations(updatedConversations)
    
    debouncedSaveConversations(updatedConversations)
  }, [messages, activeConversation, conversations, debouncedSaveConversations])

  const handleDeleteConversation = useCallback((conversationId) => {
    const updatedConversations = conversations.filter(c => c.id !== conversationId)
    setConversations(updatedConversations)
    debouncedSaveConversations(updatedConversations)
    
    if (conversationId === activeConversation) {
      handleNewConversation()
    }
  }, [conversations, activeConversation, debouncedSaveConversations])
  
  const handleDeleteAll = useCallback(() => {
    setConversations([])
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    localStorage.removeItem('ai-conversations')
    
    handleNewConversation()
  }, [])

  const handleNewConversation = () => {
    setMessages([])
    setActiveConversation(null)
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
        <aside 
          className="conversation-history" 
          aria-label="Conversation History"
          role="complementary"
        >
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
            onDeleteConversation={handleDeleteConversation}
            onDeleteAll={handleDeleteAll}
          />
        </aside>
      )}

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col" role="main" aria-label="AI Command Center Chat Interface">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-olive-500 to-gold-600 w-10 h-10 rounded-lg flex items-center justify-center">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Command Center</h1>
                <p className="text-sm text-gray-500">Your intelligent business assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Model Selector */}
              <div className="w-60">
                <ModelSelector 
                  selectedModel={modelConfig.model}
                  onModelChange={setModelConfig}
                />
              </div>
              
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title="Toggle conversation history"
              >
                <ClockIcon className="h-5 w-5" />
              </button>
              
              {/* Enhanced Status Indicator */}
              <div className={`flex items-center space-x-2 text-sm transition-colors duration-300 ${
                isLoading 
                  ? 'text-olive-600' 
                  : 'text-green-600'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isLoading 
                    ? 'bg-olive-500 animate-pulse' 
                    : 'bg-green-500 animate-pulse'
                }`}></div>
                <span>
                  {isLoading ? 'AI Processing...' : 'AI Agents Online'}
                </span>
                {isLoading && (
                  <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full"></div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <section 
          className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white"
          aria-label="Conversation messages"
          role="region"
          aria-live="polite"
          aria-relevant="additions"
        >
          {/* Quick Actions */}
          <QuickActions onQuickAction={handleQuickAction} isLoading={isLoading} />

          {/* Messages */}
          <div className="max-w-4xl mx-auto space-y-6" role="log" aria-label="Chat messages">
            {/* Debug info removed for production */}
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message.text}
                isUser={message.isUser}
                agent={message.agent}
                isLoading={message.isLoading}
                isError={message.isError}
                onRetry={message.canRetry ? retryLastMessage : null}
                handleExecuteAction={handleExecuteAction}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end space-x-3" role="form">
            <div className="flex-1">
              <label htmlFor="message-input" className="sr-only">
                Message to AI Command Center
              </label>
              <textarea
                id="message-input"
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isLoading ? "AI is processing your request..." : "Ask about your business, request actions, or get strategic advice..."}
                rows={1}
                className={`w-full px-4 py-3 border rounded-xl resize-none transition-all duration-200 ${
                  isLoading 
                    ? 'border-olive-300 bg-olive-50 text-gray-600 cursor-wait' 
                    : 'border-gray-300 bg-white focus:ring-2 focus:ring-olive-500 focus:border-transparent'
                }`}
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
                aria-describedby="message-input-help"
                aria-invalid={false}
                aria-required={true}
              />
            </div>
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="bg-olive-600 text-white p-3 rounded-xl hover:bg-olive-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-olive-500 focus:ring-offset-2"
              aria-label={isLoading ? "AI is processing your message" : "Send message to AI Command Center"}
              aria-describedby="send-button-help"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
            </form>
            
            {/* Accessibility help text */}
            <div className="sr-only">
              <div id="message-input-help">
                Type your message to the AI Command Center. You can ask about your business, request actions, or get strategic advice.
              </div>
              <div id="send-button-help">
                Send your message to get AI assistance with your business needs.
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>💡 Try: "Analyze my revenue" or "Launch a marketing campaign"</span>
              </div>
              <div className="flex items-center space-x-2">
                <span>Press Enter to send, Shift+Enter for new line</span>
              </div>
            </div>
          </div>
        </div>
      </main>
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
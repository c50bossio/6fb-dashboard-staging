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
  EllipsisVerticalIcon,
  ArrowPathIcon,
  Bars3Icon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { useSearchParams } from 'next/navigation'

import ProtectedRoute from '../../../../components/ProtectedRoute'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { Card } from '../../../../components/ui'
import ExecutableActionButton from '../../../../components/ExecutableActionButton'
import ModelSelector from '../../../../components/ai/ModelSelector'
import { csrfFetch } from '../../../../lib/csrf-fetch'

// Performance Metrics Widget from AI Intelligent
function AIPerformanceMetricsWidget({ onRefresh, loading }) {
  const [metrics, setMetrics] = useState(null)
  const [widgetLoading, setWidgetLoading] = useState(true)

  const fetchOptimizationMetrics = useCallback(async () => {
    try {
      setWidgetLoading(true)
      const response = await fetch('/api/ai/performance?type=realtime')
      
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Optimization metrics error:', error)
    } finally {
      setWidgetLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOptimizationMetrics()
    const interval = setInterval(fetchOptimizationMetrics, 30000) // Update every 30s
    return () => clearInterval(interval)
  }, [fetchOptimizationMetrics, onRefresh])

  return (
    <Card className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2 text-emerald-600" />
          AI Performance Metrics
        </h3>
        <button
          onClick={fetchOptimizationMetrics}
          disabled={widgetLoading}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowPathIcon className={`h-4 w-4 ${widgetLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {widgetLoading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : metrics ? (
        <div className="space-y-4">
          {/* Response Time Improvement */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-emerald-800">Response Time</span>
              <span className="text-xs text-emerald-600">
                {metrics.optimization_results?.response_time_improvement?.target_achieved ? '✅ Optimized' : '⏳ Processing'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-emerald-600 font-bold text-lg">
                  {metrics.optimization_results?.response_time_improvement?.current_avg_ms || 126}ms
                </div>
                <div className="text-gray-600">Current Avg</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-emerald-600 font-bold text-lg">
                  {metrics.optimization_results?.response_time_improvement?.improvement_percentage || 85}%
                </div>
                <div className="text-gray-600">Improvement</div>
              </div>
            </div>
          </div>

          {/* Cache Performance */}
          <div className="bg-olive-50 border border-olive-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-olive-800">Caching System</span>
              <span className="text-xs text-olive-600">
                {metrics.optimization_results?.cache_performance?.strategies_active || 6} Active
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2">
                <div className="text-olive-600 font-bold text-lg">
                  {metrics.optimization_results?.cache_performance?.hit_rate || 78.5}%
                </div>
                <div className="text-gray-600">Hit Rate</div>
              </div>
              <div className="bg-white rounded p-2">
                <div className="text-olive-600 font-bold text-lg">
                  {metrics.optimization_results?.cache_performance?.cost_savings_percentage || 82.3}%
                </div>
                <div className="text-gray-600">Cost Savings</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <ChartBarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading AI metrics...</p>
        </div>
      )}
    </Card>
  )
}

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
  'marketing_expert': 'bg-gold-50 text-gold-600 border-gold-200',
  'operations_manager': 'bg-olive-50 text-olive-600 border-olive-200',
  'customer_relations': 'bg-pink-50 text-pink-600 border-pink-200',
  'growth_strategy': 'bg-orange-50 text-orange-600 border-orange-200',
  'strategic_mindset': 'bg-indigo-50 text-olive-600 border-indigo-200'
}

// Available AI Agents
const AVAILABLE_AGENTS = [
  {
    id: 'auto',
    name: 'Auto-Select',
    personality: 'strategic_mindset',
    description: 'Let AI choose the best agent for your question',
    icon: SparklesIcon,
    color: 'bg-purple-50 text-purple-600 border-purple-200'
  },
  {
    id: 'master_coach',
    name: 'Marcus - Master Coach',
    personality: 'strategic_mindset', 
    description: 'Strategic business coaching and leadership development',
    icon: LightBulbIcon,
    color: 'bg-indigo-50 text-indigo-600 border-indigo-200'
  },
  {
    id: 'financial',
    name: 'Marcus - Financial Coach',
    personality: 'financial_coach',
    description: 'Revenue optimization and financial strategy',
    icon: BanknotesIcon,
    color: 'bg-green-50 text-green-600 border-green-200'
  },
  {
    id: 'marketing',
    name: 'Sophia - Marketing Expert',
    personality: 'marketing_expert',
    description: 'Social media, customer acquisition, and branding',
    icon: MegaphoneIcon,
    color: 'bg-gold-50 text-gold-600 border-gold-200'
  },
  {
    id: 'technical_operations',
    name: 'David - Operations Manager',
    personality: 'operations_manager',
    description: 'Scheduling, workflow optimization, and efficiency',
    icon: Cog6ToothIcon,
    color: 'bg-olive-50 text-olive-600 border-olive-200'
  },
  {
    id: 'customer_success',
    name: 'Sarah - Customer Relations',
    personality: 'customer_relations',
    description: 'Customer satisfaction, retention, and service excellence',
    icon: UserGroupIcon,
    color: 'bg-pink-50 text-pink-600 border-pink-200'
  }
]

// Agent Selector Component
function AgentSelector({ selectedAgent, onAgentChange, isLoading }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const currentAgent = AVAILABLE_AGENTS.find(agent => agent.id === selectedAgent) || AVAILABLE_AGENTS[0]
  const CurrentIcon = currentAgent.icon
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isLoading}
        className={`${currentAgent.color} px-4 py-2 rounded-lg border-2 flex items-center space-x-2 transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed min-w-[200px]`}
        aria-label={`Current agent: ${currentAgent.name}`}
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="text-sm font-medium truncate">{currentAgent.name}</span>
        <svg className={`h-4 w-4 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showDropdown && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {AVAILABLE_AGENTS.map((agent) => {
            const AgentIcon = agent.icon
            return (
              <button
                key={agent.id}
                onClick={() => {
                  onAgentChange(agent.id)
                  setShowDropdown(false)
                }}
                className={`w-full p-3 text-left hover:bg-gray-50 flex items-start space-x-3 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                  selectedAgent === agent.id ? 'bg-olive-50' : ''
                }`}
              >
                <div className={`${agent.color} w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <AgentIcon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 mb-1">{agent.name}</div>
                  <div className="text-xs text-gray-600 line-clamp-2">{agent.description}</div>
                </div>
                {selectedAgent === agent.id && (
                  <div className="text-olive-600 mt-1">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Quick Actions Component
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

// Message Bubble Component
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

  // AI Agent Message
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
        <div className="bg-card dark:bg-card rounded-2xl rounded-tl-md px-5 py-4 border border-border dark:border-border shadow-sm">
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground dark:bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground dark:bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground dark:bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              <span className="text-sm text-muted-foreground dark:text-muted-foreground">AI is thinking...</span>
            </div>
          ) : (
            <div>
              {/* Agent Header */}
              {agent && (
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-sm text-foreground dark:text-foreground">
                      {agent.name || 'AI Agent'}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agent.confidence >= 0.8
                        ? 'bg-moss-100 dark:bg-moss-900/30 text-moss-800 dark:text-moss-300'
                        : agent.confidence >= 0.6
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-300'
                          : 'bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground'
                    }`}>
                      {agent.confidence ? `${(agent.confidence * 100).toFixed(0)}% confident` : 'AI Response'}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground/70 dark:text-muted-foreground/70">
                    {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              )}

              {/* Message Content */}
              <div className="prose prose-sm max-w-none">
                <div className="text-sm text-foreground dark:text-foreground whitespace-pre-wrap leading-relaxed">{message}</div>
              </div>

              {/* Recommendations */}
              {agent?.recommendations && agent.recommendations.length > 0 && (
                <div className="mt-4 p-3 bg-olive-50 dark:bg-olive-900/20 rounded-lg border-l-4 border-olive-400 dark:border-olive-600">
                  <h4 className="font-semibold text-sm text-olive-800 dark:text-olive-300 mb-2 flex items-center">
                    <LightBulbIcon className="h-4 w-4 mr-1" />
                    Key Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {agent.recommendations.slice(0, 3).map((rec, idx) => (
                      <li key={idx} className="text-sm text-olive-700 dark:text-olive-400 flex items-start space-x-2">
                        <CheckCircleIcon className="h-4 w-4 mt-0.5 text-olive-500 dark:text-olive-500 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {agent?.action_items && agent.action_items.length > 0 && (
                <div className="mt-4 p-3 bg-moss-50 dark:bg-moss-900/20 rounded-lg border-l-4 border-moss-400 dark:border-moss-600">
                  <h4 className="font-semibold text-sm text-moss-800 dark:text-moss-300 mb-3 flex items-center">
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
                <div className="mt-4 pt-3 border-t border-red-200 dark:border-red-800">
                  <button
                    onClick={onRetry}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
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

// Conversation History Sidebar
function ConversationHistory({ conversations, activeConversation, onSelectConversation, onNewConversation, onDeleteConversation, onDeleteAll }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent') // recent, oldest, alphabetical
  const [showDropdown, setShowDropdown] = useState(null) // Track which conversation dropdown is open
  
  // Close dropdown when clicking outside
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
  
  // Export conversation as JSON or text
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
    
    // Create and download file
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
  
  // Filter and sort conversations
  const filteredAndSortedConversations = useMemo(() => {
    let filtered = conversations
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = conversations.filter(conv => 
        conv.title?.toLowerCase().includes(query) ||
        conv.messages?.some(msg => msg.text?.toLowerCase().includes(query))
      )
    }
    
    // Sort conversations
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
    <div className="w-64 bg-card dark:bg-card border-r border-border dark:border-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border dark:border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground dark:text-foreground">Conversations</h2>
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
                className="w-full pl-8 pr-3 py-2 text-sm border border-border dark:border-border rounded-lg bg-background dark:bg-background text-foreground dark:text-foreground focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                aria-label="Search conversations"
              />
              <div className="absolute left-2.5 top-2.5 text-muted-foreground dark:text-muted-foreground">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full py-2 px-3 text-sm border border-border dark:border-border rounded-lg bg-background dark:bg-background text-foreground dark:text-foreground focus:ring-2 focus:ring-olive-500 focus:border-transparent"
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
          <div className="p-4 text-center text-muted-foreground dark:text-muted-foreground">
            <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto text-muted-foreground/50 dark:text-muted-foreground/50 mb-2" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start chatting to see history</p>
          </div>
        ) : filteredAndSortedConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground dark:text-muted-foreground">
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
                      ? 'bg-olive-50 dark:bg-olive-900/20 border-olive-200 dark:border-olive-700 text-olive-700 dark:text-olive-400'
                      : 'bg-muted dark:bg-muted border-border dark:border-border text-foreground dark:text-foreground hover:bg-accent dark:hover:bg-accent'
                  }`}
                >
                  <div className="font-medium text-sm truncate pr-16">
                    {conversation.title || 'New Conversation'}
                  </div>
                  <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    {conversation.messages?.length || 0} messages
                  </div>
                  <div className="text-xs text-muted-foreground/70 dark:text-muted-foreground/70 mt-1">
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
                      <div className="absolute right-0 top-full mt-1 w-36 bg-card dark:bg-card border border-border dark:border-border rounded-lg shadow-lg z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            exportConversation(conversation, 'txt')
                            setShowDropdown(null)
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted rounded-t-lg"
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
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          <span>Export as JSON</span>
                        </button>
                        <div className="border-t border-border dark:border-border"></div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(e, conversation.id)
                            setShowDropdown(null)
                          }}
                          className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
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
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-card dark:bg-card rounded-lg p-6 max-w-sm border border-border dark:border-border shadow-xl">
            <h3 className="text-lg font-semibold mb-2 text-foreground dark:text-foreground">Confirm Delete</h3>
            <p className="text-muted-foreground dark:text-muted-foreground mb-4">
              {deleteTarget === 'all'
                ? 'Are you sure you want to delete all conversations? This cannot be undone.'
                : 'Are you sure you want to delete this conversation?'}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-foreground dark:text-foreground hover:bg-muted dark:hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 dark:bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-700 rounded-lg transition-colors"
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

// Main AI Command Center Component
function AICommandCenter() {
  const { user } = useAuth()
  const { theme, resolvedTheme } = useTheme()
  const searchParams = useSearchParams()
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [showHistory, setShowHistory] = useState(false) // Start false, will be set based on screen size
  const [showInsights, setShowInsights] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastFailedMessage, setLastFailedMessage] = useState(null)
  const [selectedAgent, setSelectedAgent] = useState('auto')
  const [modelConfig, setModelConfig] = useState({
    model: 'gpt-4o',
    provider: 'openai'
  })
  const [syncNotification, setSyncNotification] = useState(null) // For showing sync success message
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Get user-scoped storage key (SECURITY FIX)
  const getStorageKey = useCallback(() => {
    if (!user?.id) {
      console.warn('[Command Center] No user ID, using fallback key')
      return 'ai-conversations' // Fallback for unauthenticated (should not happen)
    }

    // User-scoped key for conversation isolation
    return `ai-conversations-${user.id}`
  }, [user?.id])

  // Set initial sidebar visibility based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Show sidebar by default on desktop (>= 768px), hide on mobile
      setShowHistory(window.innerWidth >= 768)
    }

    // Set initial state
    handleResize()

    // Listen for window resize
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Cleanup on logout - Remove all user-scoped conversations
  useEffect(() => {
    if (!user) {
      // User logged out - clear all conversation data
      try {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('ai-conversations-')) {
            localStorage.removeItem(key)
            console.log(`[Command Center] Cleared conversation key on logout: ${key}`)
          }
        })

        // Also clear any legacy global key
        localStorage.removeItem('ai-conversations')

        console.log('[Command Center] All conversation data cleared on logout')
      } catch (error) {
        console.error('[Command Center] Error cleaning up on logout:', error)
      }
    }
  }, [user])

  // Migrate legacy conversations to user-scoped storage (ONE-TIME MIGRATION)
  useEffect(() => {
    if (user?.id) {
      try {
        const legacyKey = 'ai-conversations'
        const legacyConversations = localStorage.getItem(legacyKey)

        if (legacyConversations) {
          const userKey = `ai-conversations-${user.id}`

          // Only migrate if user doesn't have scoped conversations yet
          if (!localStorage.getItem(userKey)) {
            localStorage.setItem(userKey, legacyConversations)
            console.log(`[Command Center] Migrated ${JSON.parse(legacyConversations).length} conversations to user-scoped storage`)
          }

          // Remove legacy global key
          localStorage.removeItem(legacyKey)
          console.log('[Command Center] Removed legacy global conversation key')
        }
      } catch (error) {
        console.error('[Command Center] Error during conversation migration:', error)
      }
    }
  }, [user?.id])

  // Debounced localStorage save function (NOW USER-SCOPED)
  const debouncedSaveConversations = useCallback((conversationsToSave) => {
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for 500ms debounce
    saveTimeoutRef.current = setTimeout(() => {
      try {
        const storageKey = getStorageKey()
        localStorage.setItem(storageKey, JSON.stringify(conversationsToSave))
      } catch (error) {
        console.error('Failed to save conversations to localStorage:', error)
        // Handle localStorage quota exceeded or other errors
        if (error.name === 'QuotaExceededError') {
          // Keep only the most recent 10 conversations if quota exceeded
          const recentConversations = conversationsToSave.slice(0, 10)
          try {
            const storageKey = getStorageKey()
            localStorage.setItem(storageKey, JSON.stringify(recentConversations))
          } catch (retryError) {
            console.error('Failed to save even reduced conversations:', retryError)
          }
        }
      }
    }, 500)
  }, [getStorageKey])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
    
    // Save conversation when messages update
    if (messages.length > 0 && messages[messages.length - 1].id !== 'welcome') {
      saveCurrentConversation()
    }
  }, [messages])

  // Load conversations from localStorage on mount (NOW USER-SCOPED)
  useEffect(() => {
    if (!user?.id) {
      // Don't load until we have user ID
      console.log('[Command Center] Waiting for user authentication...')
      return
    }

    const storageKey = getStorageKey()
    const savedConversations = localStorage.getItem(storageKey)

    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations)
        setConversations(parsed)

        // Load the most recent conversation
        if (parsed.length > 0) {
          const mostRecent = parsed[0]
          setActiveConversation(mostRecent.id)
          setMessages(mostRecent.messages || [])

          console.log(`[Command Center] Loaded ${parsed.length} conversations for user ${user.id}`)
        }
      } catch (e) {
        console.error('[Command Center] Failed to load conversations:', e)
      }
    } else {
      console.log(`[Command Center] No saved conversations found for user ${user.id}`)
    }
  }, [user?.id, getStorageKey])

  // Load synced conversation from query parameter (Phase 4: Shared Context)
  useEffect(() => {
    const conversationIdFromQuery = searchParams?.get('conversation');

    if (!conversationIdFromQuery || conversations.length === 0) {
      return;
    }

    // Find the synced conversation
    const syncedConversation = conversations.find(c => c.id === conversationIdFromQuery);

    if (syncedConversation) {
      console.log(`[Command Center] Loading synced conversation: ${conversationIdFromQuery}`);

      // Load the synced conversation
      setActiveConversation(syncedConversation.id);
      setMessages(syncedConversation.messages || []);

      // Show sync notification
      setSyncNotification({
        message: `✨ Conversation synced from AI Widget`,
        timestamp: new Date().toISOString()
      });

      // Auto-dismiss notification after 5 seconds
      setTimeout(() => {
        setSyncNotification(null);
      }, 5000);

      // Clear query parameter from URL (clean up)
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else {
      console.warn(`[Command Center] Synced conversation not found: ${conversationIdFromQuery}`);
    }
  }, [searchParams, conversations]);

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

    // Store message for retry functionality
    setLastFailedMessage(messageText.trim())

    // Clear input immediately and set loading state
    setInputMessage('')
    setIsLoading(true)
    
    // Add user message to the conversation
    setMessages(prev => [...prev, userMessage])

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

      // Send to AI orchestrator with CSRF protection
      const response = await csrfFetch('/api/ai/orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          model: modelConfig.model,
          provider: modelConfig.provider,
          selectedAgent: selectedAgent !== 'auto' ? selectedAgent : undefined,
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

      // Clear error state on successful response
      setRetryCount(0)
      setLastFailedMessage(null)
      
      // Remove loading message and add AI response
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
      
      // Determine error type for better user messaging
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
      
      // Remove loading message and add enhanced error message
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

  // Retry last failed message
  const retryLastMessage = () => {
    if (lastFailedMessage) {
      setRetryCount(prev => prev + 1)
      sendMessage(lastFailedMessage)
    }
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

      // Call executable action API with CSRF protection
      const response = await csrfFetch('/api/ai/actions/execute', {
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
    
    // Sort by updated_at (most recent first)
    updatedConversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    
    // Keep only last 20 conversations for memory optimization
    updatedConversations = updatedConversations.slice(0, 20)
    
    setConversations(updatedConversations)
    
    // Use debounced save instead of immediate localStorage write
    debouncedSaveConversations(updatedConversations)
  }, [messages, activeConversation, conversations, debouncedSaveConversations])

  const handleDeleteConversation = useCallback((conversationId) => {
    const updatedConversations = conversations.filter(c => c.id !== conversationId)
    setConversations(updatedConversations)
    debouncedSaveConversations(updatedConversations)
    
    // If deleting active conversation, reset to new conversation
    if (conversationId === activeConversation) {
      handleNewConversation()
    }
  }, [conversations, activeConversation, debouncedSaveConversations])
  
  const handleDeleteAll = useCallback(() => {
    setConversations([])
    
    // Clear localStorage immediately for delete all
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    localStorage.removeItem('ai-conversations')
    
    handleNewConversation()
  }, [])

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
    <div className="h-screen flex bg-background dark:bg-background relative safe-top safe-bottom">
      {/* Conversation History Sidebar - Desktop: Always visible, Mobile: Overlay */}
      {showHistory && (
        <>
          {/* Mobile: Dark overlay when sidebar open */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setShowHistory(false)}
            aria-hidden="true"
          />

          <aside
            className={`
              conversation-history

              /* Desktop: Normal sidebar */
              md:relative md:z-auto

              /* Mobile: Slide-over panel */
              max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50
              max-md:w-80 max-md:shadow-xl
              max-md:animate-in max-md:slide-in-from-left
            `}
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
                  // Auto-close sidebar on mobile after selection
                  if (window.innerWidth < 768) {
                    setShowHistory(false)
                  }
                }
              }}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onDeleteAll={handleDeleteAll}
            />
          </aside>
        </>
      )}

      {/* Main Chat Interface */}
      <main className="flex-1 flex flex-col" role="main" aria-label="AI Command Center Chat Interface">
        {/* Header - Responsive: Horizontal on desktop, stacked on mobile */}
        <div className="bg-card dark:bg-card border-b border-border dark:border-border px-4 md:px-6 py-3 md:py-4">
          {/* Mobile: Single row with hamburger + title + status */}
          <div className="flex items-center justify-between md:hidden mb-3">
            {/* Hamburger menu button */}
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`
                p-2 rounded-lg transition-colors
                text-muted-foreground dark:text-muted-foreground
                hover:bg-muted dark:hover:bg-muted
                min-h-[44px] min-w-[44px] flex items-center justify-center
              `}
              aria-label="Toggle conversation history"
              title="Toggle conversation history"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Title */}
            <div className="flex items-center space-x-2 flex-1 justify-center">
              <div className="bg-gradient-to-r from-olive-500 to-gold-600 dark:from-olive-600 dark:to-gold-700 w-8 h-8 rounded-lg flex items-center justify-center shadow-sm">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-foreground dark:text-foreground">AI Command Center</h1>
            </div>

            {/* Status indicator (compact on mobile) */}
            <div className={`${isLoading ? 'text-olive-600' : 'text-green-600'}`}>
              <div className={`w-3 h-3 rounded-full ${
                isLoading ? 'bg-olive-500 animate-pulse' : 'bg-green-500 animate-pulse'
              }`}></div>
            </div>
          </div>

          {/* Mobile: Agent and Model selectors (full width) */}
          <div className="md:hidden space-y-2">
            <AgentSelector
              selectedAgent={selectedAgent}
              onAgentChange={setSelectedAgent}
              isLoading={isLoading}
            />
            <ModelSelector
              selectedModel={modelConfig.model}
              onModelChange={setModelConfig}
            />
          </div>

          {/* Desktop: Original horizontal layout */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-olive-500 to-gold-600 dark:from-olive-600 dark:to-gold-700 w-10 h-10 rounded-lg flex items-center justify-center shadow-sm">
                <SparklesIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground dark:text-foreground">AI Command Center</h1>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Your intelligent business assistant</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Agent Selector */}
              <AgentSelector
                selectedAgent={selectedAgent}
                onAgentChange={setSelectedAgent}
                isLoading={isLoading}
              />

              {/* Model Selector */}
              <div className="w-60">
                <ModelSelector
                  selectedModel={modelConfig.model}
                  onModelChange={setModelConfig}
                />
              </div>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`
                  text-muted-foreground dark:text-muted-foreground
                  hover:text-foreground dark:hover:text-foreground
                  p-2 rounded-lg hover:bg-muted dark:hover:bg-muted
                  transition-colors
                `}
                title="Toggle conversation history"
                aria-label="Toggle conversation history"
              >
                <ClockIcon className="h-5 w-5" />
              </button>

              <button
                onClick={() => setShowInsights(!showInsights)}
                className={`
                  text-muted-foreground dark:text-muted-foreground
                  hover:text-foreground dark:hover:text-foreground
                  p-2 rounded-lg hover:bg-muted dark:hover:bg-muted
                  transition-colors
                `}
                title="Toggle AI insights"
                aria-label="Toggle AI insights"
              >
                <ChartBarIcon className="h-5 w-5" />
              </button>

              {/* Enhanced Status Indicator */}
              <div className={`flex items-center space-x-2 text-sm transition-colors duration-300 ${
                isLoading
                  ? 'text-olive-600 dark:text-olive-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isLoading
                    ? 'bg-olive-500 dark:bg-olive-400 animate-pulse'
                    : 'bg-green-500 dark:bg-green-400 animate-pulse'
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
          className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-background/50 to-background dark:from-background dark:to-background"
          aria-label="Conversation messages"
          role="region"
          aria-live="polite"
          aria-relevant="additions"
        >
          {/* Sync Notification (Phase 4: Shared Context) */}
          {syncNotification && (
            <div className="max-w-4xl mx-auto mb-6">
              <div className="bg-gradient-to-r from-moss-50 to-green-50 dark:from-moss-900/20 dark:to-green-900/20 border border-moss-200 dark:border-moss-700 rounded-xl p-4 flex items-start space-x-3 shadow-sm animate-in slide-in-from-top">
                <div className="bg-moss-600 dark:bg-moss-700 rounded-full p-2 flex-shrink-0">
                  <CheckCircleIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground dark:text-foreground font-medium">
                    {syncNotification.message}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    Your conversation has been transferred from the AI Widget. Continue where you left off!
                  </p>
                </div>
                <button
                  onClick={() => setSyncNotification(null)}
                  className="text-moss-600 dark:text-moss-400 hover:text-moss-700 dark:hover:text-moss-300 flex-shrink-0 transition-colors"
                  aria-label="Dismiss notification"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Widget Discovery Tip */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="bg-gradient-to-r from-olive-50 to-gold-50 dark:from-olive-900/20 dark:to-gold-900/20 border border-olive-200 dark:border-olive-700 rounded-xl p-4 flex items-start space-x-3 shadow-sm">
              <div className="bg-olive-600 dark:bg-olive-700 rounded-full p-2 flex-shrink-0">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground dark:text-foreground">
                  <span className="font-semibold">💡 Pro Tip:</span> For quick queries while browsing other pages, look for the{' '}
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-olive-600 dark:bg-olive-700 text-white text-xs font-medium">
                    <SparklesIcon className="h-3 w-3 mr-1" />
                    AI Widget
                  </span>
                  {' '}button in the bottom-right corner. Perfect for fast insights without leaving your current page!
                </p>
              </div>
              <button
                onClick={(e) => e.currentTarget.parentElement.style.display = 'none'}
                className="text-olive-600 dark:text-olive-400 hover:text-olive-700 dark:hover:text-olive-300 flex-shrink-0 transition-colors"
                aria-label="Dismiss tip"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

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
        <div className="bg-card dark:bg-card border-t border-border dark:border-border p-6 shadow-lg">
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
                    ? 'border-olive-300 dark:border-olive-700 bg-olive-50 dark:bg-olive-900/20 text-muted-foreground dark:text-muted-foreground cursor-wait'
                    : 'border-border dark:border-border bg-background dark:bg-background text-foreground dark:text-foreground focus:ring-2 focus:ring-olive-500 focus:border-transparent'
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

            <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground dark:text-muted-foreground">
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

      {/* AI Insights Sidebar */}
      {showInsights && (
        <aside className="w-80 bg-card dark:bg-card border-l border-border dark:border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border dark:border-border">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground dark:text-foreground">AI Insights</h2>
              <button
                onClick={() => setShowInsights(false)}
                className="text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-foreground transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/50 dark:bg-background/50">
            <AIPerformanceMetricsWidget onRefresh={0} loading={false} />
          </div>
        </aside>
      )}
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
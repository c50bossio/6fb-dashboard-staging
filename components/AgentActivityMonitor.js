'use client'

import { 
  SparklesIcon, 
  ChartBarIcon, 
  MegaphoneIcon, 
  CogIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

const AGENT_ICONS = {
  'Marcus': ChartBarIcon,  // Financial Coach
  'Sophia': MegaphoneIcon, // Marketing Expert  
  'David': CogIcon,        // Operations Manager
  'Strategic Mindset': SparklesIcon,
  'Client Acquisition': MegaphoneIcon,
  'Financial Coach': ChartBarIcon,
  'Marketing Expert': MegaphoneIcon,
  'Operations Manager': CogIcon
}

const AGENT_COLORS = {
  'Marcus': 'text-green-600 bg-green-50 border-green-200',
  'Sophia': 'text-gold-600 bg-gold-50 border-gold-200',
  'David': 'text-olive-600 bg-olive-50 border-olive-200',
  'Financial Coach': 'text-green-600 bg-green-50 border-green-200',
  'Marketing Expert': 'text-gold-600 bg-gold-50 border-gold-200',
  'Operations Manager': 'text-olive-600 bg-olive-50 border-olive-200'
}

export default function AgentActivityMonitor({ className = '', showHeader = true }) {
  const [agentStatus, setAgentStatus] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [activeCollaborations, setActiveCollaborations] = useState([])

  useEffect(() => {
    // Fetch agent status
    fetchAgentStatus()
    
    // Set up polling for real-time updates
    const interval = setInterval(fetchAgentStatus, 10000) // Every 10 seconds
    
    return () => clearInterval(interval)
  }, [])

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch('/api/ai/agents/status')
      if (response.ok) {
        const data = await response.json()
        setAgentStatus(data)
        setLastUpdate(new Date())
        
        // Simulate some active collaborations for demo
        setActiveCollaborations([
          {
            id: 'collab_1',
            agents: ['Marcus', 'Sophia'],
            topic: 'revenue_optimization',
            status: 'active',
            confidence: 0.87,
            started_at: new Date(Date.now() - 45000).toISOString()
          }
        ])
      }
    } catch (error) {
      console.error('Failed to fetch agent status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAgentIcon = (agentName) => {
    const IconComponent = AGENT_ICONS[agentName] || SparklesIcon
    return IconComponent
  }

  const getAgentColors = (agentName) => {
    return AGENT_COLORS[agentName] || 'text-gray-600 bg-gray-50 border-gray-200'
  }

  const formatTimeSince = (timestamp) => {
    if (!timestamp) return 'Never'
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000)
    
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-white rounded-lg border p-4">
          <div className="h-4 bg-gray-200 rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  const agents = agentStatus?.agent_details || {}
  const systemStatus = agentStatus?.system_status || 'unknown'
  const activeAgents = agentStatus?.active_agents || 0
  const totalAgents = agentStatus?.total_agents || 0

  return (
    <div className={`bg-white rounded-lg border shadow-sm ${className}`}>
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
              <SparklesIcon className="h-4 w-4 text-olive-500" />
              <span>AI Agent Activity</span>
            </h3>
            <div className="flex items-center space-x-2">
              <div className={`h-2 w-2 rounded-full ${
                systemStatus === 'operational' ? 'bg-green-400' : 
                systemStatus === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
              } ${systemStatus === 'operational' ? 'animate-pulse' : ''}`}></div>
              <span className="text-xs text-gray-600">
                {activeAgents}/{totalAgents} active
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Individual Agent Status */}
        <div className="space-y-2">
          {Object.entries(agents).map(([agentId, status]) => {
            const agentName = status.name || agentId.replace('_', ' ')
              .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
            const IconComponent = getAgentIcon(agentName)
            const colors = getAgentColors(agentName)
            
            return (
              <div key={agentId} className={`flex items-center justify-between p-2 rounded-lg border ${colors}`}>
                <div className="flex items-center space-x-2">
                  <IconComponent className="h-4 w-4" />
                  <div>
                    <div className="text-sm font-medium">{agentName}</div>
                    <div className="text-xs opacity-75">
                      {status.expertise_area || status.domain || 'General AI'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {status.active ? (
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  ) : (
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="text-right">
                    <div className="text-xs font-medium">
                      {status.queries_handled || 0} queries
                    </div>
                    <div className="text-xs opacity-75">
                      {formatTimeSince(status.last_activity)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Active Collaborations */}
        {activeCollaborations.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">
              Active Collaborations
            </h4>
            <div className="space-y-2">
              {activeCollaborations.map((collab) => (
                <div key={collab.id} className="bg-gradient-to-r from-indigo-50 to-gold-50 border border-indigo-200 rounded-lg p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-1">
                        {collab.agents.map((agentName, index) => {
                          const IconComponent = getAgentIcon(agentName)
                          return (
                            <div key={index} className="h-6 w-6 bg-white border-2 border-indigo-200 rounded-full flex items-center justify-center">
                              <IconComponent className="h-3 w-3 text-olive-600" />
                            </div>
                          )
                        })}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-indigo-900">
                          {collab.agents.join(' + ')}
                        </div>
                        <div className="text-xs text-olive-700">
                          {collab.topic.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs font-medium text-indigo-800">
                        {(collab.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-olive-600">
                        {formatTimeSince(collab.started_at)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Stats */}
        <div className="border-t pt-3 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center space-x-2">
            <ArrowPathIcon className="h-3 w-3" />
            <span>Last updated: {lastUpdate ? formatTimeSince(lastUpdate.toISOString()) : 'Never'}</span>
          </div>
          <button
            onClick={fetchAgentStatus}
            className="text-olive-600 hover:text-indigo-800 font-medium"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}

// Minimal version for sidebar or header
export function MiniAgentActivityIndicator({ className = '' }) {
  const [activeAgents, setActiveAgents] = useState(3)
  const [hasCollaboration, setHasCollaboration] = useState(true)

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative">
        <SparklesIcon className="h-4 w-4 text-olive-500" />
        {hasCollaboration && (
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-gold-400 rounded-full animate-pulse"></div>
        )}
      </div>
      <span className="text-sm text-gray-700">
        {activeAgents} agents
      </span>
      {hasCollaboration && (
        <span className="text-xs bg-gold-100 text-gold-700 px-1.5 py-0.5 rounded-full">
          collaborating
        </span>
      )}
    </div>
  )
}
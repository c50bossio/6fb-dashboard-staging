'use client'

import { useState, useEffect } from 'react'
import { 
  XMarkIcon,
  SparklesIcon,
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { getAgentRouter } from '@/lib/ai-agent-router'

/**
 * Agent Selector Modal
 * Allows manual agent selection with routing insights
 */
export default function AgentSelectorModal({ 
  isOpen, 
  onClose, 
  onSelectAgent, 
  currentMessage = '',
  currentAgent = null 
}) {
  const [agents, setAgents] = useState([])
  const [routingSuggestion, setRoutingSuggestion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMetrics, setShowMetrics] = useState(false)
  const agentRouter = getAgentRouter()

  useEffect(() => {
    if (isOpen) {
      loadAgentData()
      if (currentMessage) {
        generateRoutingSuggestion()
      }
    }
  }, [isOpen, currentMessage])

  const loadAgentData = async () => {
    try {
      setLoading(true)
      
      // Get agent metrics from router
      const metrics = agentRouter.getAgentMetrics()
      const agentList = Array.from(agentRouter.agents.values())
      
      // Combine agent data with metrics
      const enrichedAgents = agentList.map(agent => ({
        ...agent,
        metrics: metrics[agent.id] || {}
      }))
      
      setAgents(enrichedAgents)
      
    } catch (error) {
      console.error('Failed to load agent data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateRoutingSuggestion = async () => {
    if (!currentMessage) return
    
    try {
      const routing = await agentRouter.routeQuery(currentMessage, {
        previousAgent: currentAgent
      })
      
      setRoutingSuggestion(routing)
      
    } catch (error) {
      console.error('Failed to generate routing suggestion:', error)
    }
  }

  const handleSelectAgent = (agent) => {
    onSelectAgent(agent)
    onClose()
  }

  const getAgentIcon = (agentId) => {
    const icons = {
      'marcus': ChartBarIcon,
      'sophia': SparklesIcon,
      'david': CpuChipIcon,
      'elena': ChartBarIcon,
      'alex': CheckCircleIcon,
      'jordan': SparklesIcon,
      'taylor': ArrowPathIcon
    }
    return icons[agentId] || CpuChipIcon
  }

  const getPerformanceColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50'
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const formatResponseTime = (ms) => {
    return `${Math.round(ms)}ms`
  }

  const formatPercentage = (value) => {
    return `${Math.round(value * 100)}%`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-8 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <SparklesIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Select AI Agent</h3>
              <p className="text-sm text-gray-500">
                Choose the best agent for your query or use our recommendation
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="px-3 py-1 text-sm text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
            >
              {showMetrics ? 'Hide Metrics' : 'Show Metrics'}
            </button>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Routing Suggestion */}
        {routingSuggestion && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <SparklesIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  AI Recommendation
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Suggested Agent:</span>
                    <span className="font-medium text-blue-900 ml-2">
                      {routingSuggestion.agent.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Confidence:</span>
                    <span className="font-medium text-blue-900 ml-2">
                      {formatPercentage(routingSuggestion.confidence)}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-blue-700">Reason:</span>
                    <span className="text-blue-800 ml-2">
                      {routingSuggestion.routing.reason}
                    </span>
                  </div>
                </div>
                
                <button
                  onClick={() => handleSelectAgent(routingSuggestion.agent)}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Use Recommendation
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading agents...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map(agent => {
              const IconComponent = getAgentIcon(agent.id)
              const isRecommended = routingSuggestion?.agent.id === agent.id
              const isCurrentAgent = currentAgent === agent.id
              
              return (
                <div
                  key={agent.id}
                  className={`
                    relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                    ${isRecommended ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}
                    ${isCurrentAgent ? 'ring-2 ring-green-500' : ''}
                  `}
                  onClick={() => handleSelectAgent(agent)}
                >
                  {isRecommended && (
                    <div className="absolute -top-2 -right-2">
                      <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        Recommended
                      </div>
                    </div>
                  )}
                  
                  {isCurrentAgent && (
                    <div className="absolute -top-2 -left-2">
                      <div className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                        Current
                      </div>
                    </div>
                  )}

                  {/* Agent Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-10 w-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                      <IconComponent className="h-6 w-6 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{agent.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className={`
                          inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                          ${getPerformanceColor(agent.performanceScore)}
                        `}>
                          {formatPercentage(agent.performanceScore)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {agent.currentLoad}/{agent.maxConcurrent}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Specialties */}
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {agent.specialties.slice(0, 3).map(specialty => (
                        <span
                          key={specialty}
                          className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {specialty}
                        </span>
                      ))}
                      {agent.specialties.length > 3 && (
                        <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                          +{agent.specialties.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Basic Metrics */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Response Time:</span>
                      <span className="font-medium text-gray-900">
                        {formatResponseTime(agent.averageResponseTime)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="font-medium text-gray-900">
                        {formatPercentage(agent.metrics.successRate || agent.accuracy)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cost:</span>
                      <span className="font-medium text-gray-900">
                        ${agent.cost.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Detailed Metrics (if enabled) */}
                  {showMetrics && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Availability:</span>
                          <span className="text-gray-700">
                            {formatPercentage(agent.availability)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total Queries:</span>
                          <span className="text-gray-700">
                            {agent.totalQueries || 0}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-gray-500">Load:</span>
                          <span className="text-gray-700">
                            {Math.round((agent.currentLoad / agent.maxConcurrent) * 100)}%
                          </span>
                        </div>
                        
                        {agent.lastUsed && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Last Used:</span>
                            <span className="text-gray-700">
                              {new Date(agent.lastUsed).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Load Indicator */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Current Load</span>
                      <span>{agent.currentLoad}/{agent.maxConcurrent}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full ${
                          agent.currentLoad / agent.maxConcurrent < 0.5 
                            ? 'bg-green-500' 
                            : agent.currentLoad / agent.maxConcurrent < 0.8
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                        style={{ 
                          width: `${Math.min((agent.currentLoad / agent.maxConcurrent) * 100, 100)}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>💡 Tip: Recommended agents are selected based on query analysis and performance</span>
            </div>
            
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
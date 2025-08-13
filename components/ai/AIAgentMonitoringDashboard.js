'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ChartBarIcon,
  CpuChipIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  SignalIcon,
  BoltIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  FireIcon
} from '@heroicons/react/24/outline'
import { getWebSocketManager } from '@/lib/ai-websocket-manager'
import { getStreamingClient } from '@/lib/ai-streaming-client'

/**
 * AI Agent Status Monitoring Dashboard
 * Real-time monitoring of agent performance, health, and metrics
 */
export default function AIAgentMonitoringDashboard({ 
  className = '',
  refreshInterval = 5000,
  showDetailedMetrics = true 
}) {
  const [agentStatuses, setAgentStatuses] = useState([])
  const [systemMetrics, setSystemMetrics] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [alertsCount, setAlertsCount] = useState(0)
  
  const wsManager = useRef(null)
  const streamingClient = useRef(null)
  const refreshTimer = useRef(null)
  const metricsHistory = useRef(new Map())

  // Initialize connections and start monitoring
  useEffect(() => {
    initializeMonitoring()
    return cleanup
  }, [])

  const initializeMonitoring = async () => {
    try {
      setIsLoading(true)
      
      // Initialize WebSocket connection
      wsManager.current = getWebSocketManager()
      streamingClient.current = getStreamingClient()
      
      // Set up WebSocket event listeners
      wsManager.current.on('connected', handleWebSocketConnected)
      wsManager.current.on('disconnected', handleWebSocketDisconnected)
      wsManager.current.on('agent_status', handleAgentStatusUpdate)
      wsManager.current.on('agent_message', handleAgentMessage)
      wsManager.current.on('collaboration', handleCollaborationUpdate)
      wsManager.current.on('error', handleWebSocketError)
      
      // Connect to WebSocket
      await wsManager.current.connect({
        userId: 'dashboard_monitor',
        sessionId: `monitor_${Date.now()}`
      })
      
      // Start periodic refresh
      startPeriodicRefresh()
      
      // Initial data load
      await loadSystemMetrics()
      
    } catch (error) {
      console.error('Failed to initialize monitoring:', error)
      setError('Failed to initialize monitoring system')
    } finally {
      setIsLoading(false)
    }
  }

  const cleanup = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current)
    }
    
    if (wsManager.current) {
      wsManager.current.disconnect()
    }
  }

  // WebSocket event handlers
  const handleWebSocketConnected = useCallback(() => {
    setConnectionStatus('connected')
    setError(null)
  }, [])

  const handleWebSocketDisconnected = useCallback(() => {
    setConnectionStatus('disconnected')
  }, [])

  const handleAgentStatusUpdate = useCallback((data) => {
    const { agent, status, metrics } = data
    
    setAgentStatuses(prev => {
      const updated = prev.filter(a => a.id !== agent)
      return [...updated, {
        id: agent,
        name: getAgentDisplayName(agent),
        status,
        metrics: {
          ...metrics,
          lastUpdate: Date.now()
        },
        icon: getAgentIcon(agent),
        color: getStatusColor(status)
      }].sort((a, b) => a.name.localeCompare(b.name))
    })
    
    // Store metrics history
    if (!metricsHistory.current.has(agent)) {
      metricsHistory.current.set(agent, [])
    }
    
    const history = metricsHistory.current.get(agent)
    history.push({
      timestamp: Date.now(),
      status,
      metrics
    })
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift()
    }
  }, [])

  const handleAgentMessage = useCallback((data) => {
    // Update agent activity indicators
    setAgentStatuses(prev => prev.map(agent => 
      agent.id === data.agent 
        ? { ...agent, lastActivity: Date.now() }
        : agent
    ))
  }, [])

  const handleCollaborationUpdate = useCallback((data) => {
    // Handle multi-agent collaboration updates
    const { agents, task, progress } = data
    
    setSystemMetrics(prev => ({
      ...prev,
      activeCollaborations: prev?.activeCollaborations || 0,
      collaborationProgress: progress
    }))
  }, [])

  const handleWebSocketError = useCallback((error) => {
    setError(`WebSocket error: ${error.message}`)
    setConnectionStatus('error')
  }, [])

  // Load system-wide metrics
  const loadSystemMetrics = async () => {
    try {
      // Get cache statistics
      const cacheStats = streamingClient.current?.getCacheStats() || {}
      
      // Get connection status
      const wsStatus = wsManager.current?.getConnectionStatus() || {}
      
      // Simulate system metrics (in production, these would come from actual monitoring)
      const systemMetrics = {
        totalAgents: 7,
        activeAgents: agentStatuses.filter(a => a.status === 'active').length,
        averageResponseTime: 850,
        requestsPerMinute: 12,
        errorRate: 2.1,
        cacheHitRate: parseFloat(cacheStats.hitRate) || 0,
        uptime: '99.8%',
        memoryUsage: 67,
        cpuUsage: 23,
        activeConnections: 1,
        queuedMessages: wsStatus.queuedMessages || 0,
        lastHealthCheck: Date.now()
      }
      
      setSystemMetrics(systemMetrics)
      setLastUpdated(Date.now())
      
      // Check for alerts
      checkForAlerts(systemMetrics)
      
    } catch (error) {
      console.error('Failed to load system metrics:', error)
    }
  }

  // Check for system alerts
  const checkForAlerts = (metrics) => {
    let alertCount = 0
    
    if (metrics.errorRate > 5) alertCount++
    if (metrics.averageResponseTime > 3000) alertCount++
    if (metrics.memoryUsage > 85) alertCount++
    if (metrics.cpuUsage > 80) alertCount++
    if (connectionStatus === 'disconnected') alertCount++
    
    setAlertsCount(alertCount)
  }

  // Start periodic refresh
  const startPeriodicRefresh = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current)
    }
    
    refreshTimer.current = setInterval(() => {
      loadSystemMetrics()
    }, refreshInterval)
  }

  // Manual refresh
  const handleRefresh = async () => {
    setIsLoading(true)
    await loadSystemMetrics()
    setIsLoading(false)
  }

  // Helper functions
  const getAgentDisplayName = (agentId) => {
    const names = {
      'marcus': 'Marcus (Strategy)',
      'sophia': 'Sophia (Marketing)',
      'david': 'David (Operations)',
      'elena': 'Elena (Finance)',
      'alex': 'Alex (Client Relations)',
      'jordan': 'Jordan (Brand)',
      'taylor': 'Taylor (Growth)',
      'auto': 'Auto Router'
    }
    return names[agentId] || agentId
  }

  const getAgentIcon = (agentId) => {
    const icons = {
      'marcus': ChartBarIcon,
      'sophia': ChatBubbleLeftRightIcon,
      'david': CpuChipIcon,
      'elena': BoltIcon,
      'alex': UserGroupIcon,
      'jordan': FireIcon,
      'taylor': SignalIcon,
      'auto': ArrowPathIcon
    }
    return icons[agentId] || CpuChipIcon
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50'
      case 'busy': return 'text-amber-800 bg-yellow-50'
      case 'idle': return 'text-olive-600 bg-olive-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'offline': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'disconnected':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-amber-800" />
      default:
        return <ArrowPathIcon className="h-5 w-5 text-gray-500 animate-spin" />
    }
  }

  const formatUptime = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const seconds = Math.floor((Date.now() - timestamp) / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  if (isLoading && !systemMetrics) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600 mr-3" />
          <span className="text-lg text-gray-600">Initializing monitoring dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-gradient-to-br from-gold-500 to-olive-600 rounded-full flex items-center justify-center">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">AI Agent Monitoring</h2>
              <p className="text-sm text-gray-500">
                Real-time agent status and system metrics
                {lastUpdated && (
                  <span className="ml-2">
                    • Updated {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Alerts */}
            {alertsCount > 0 && (
              <div className="flex items-center space-x-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{alertsCount} Alert{alertsCount > 1 ? 's' : ''}</span>
              </div>
            )}
            
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {getConnectionStatusIcon()}
              <span className="text-sm font-medium text-gray-700 capitalize">
                {connectionStatus}
              </span>
            </div>
            
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              {error}
            </div>
          </div>
        )}
      </div>

      {/* System Overview */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-gradient-to-r from-olive-50 to-olive-100 p-4 rounded-lg">
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-olive-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-olive-900">Active Agents</p>
                <p className="text-2xl font-bold text-olive-700">
                  {systemMetrics?.activeAgents || 0}/{systemMetrics?.totalAgents || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Avg Response</p>
                <p className="text-2xl font-bold text-green-700">
                  {systemMetrics?.averageResponseTime || 0}ms
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gold-50 to-gold-100 p-4 rounded-lg">
            <div className="flex items-center">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-gold-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gold-900">Requests/min</p>
                <p className="text-2xl font-bold text-gold-700">
                  {systemMetrics?.requestsPerMinute || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-800" />
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-900">Error Rate</p>
                <p className="text-2xl font-bold text-yellow-700">
                  {systemMetrics?.errorRate || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-4 rounded-lg">
            <div className="flex items-center">
              <BoltIcon className="h-8 w-8 text-olive-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-indigo-900">Cache Hit</p>
                <p className="text-2xl font-bold text-olive-700">
                  {systemMetrics?.cacheHitRate || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-gray-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Uptime</p>
                <p className="text-2xl font-bold text-gray-700">
                  {systemMetrics?.uptime || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Status</h3>
        
        {agentStatuses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CpuChipIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No agents detected</p>
            <p className="text-sm">Agent statuses will appear here once connected</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agentStatuses.map(agent => {
              const IconComponent = agent.icon
              return (
                <div key={agent.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{agent.name}</h4>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${agent.color}`}>
                          {agent.status}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {showDetailedMetrics && agent.metrics && (
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Response Time:</span>
                        <span className="font-medium">{agent.metrics.responseTime || 'N/A'}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Requests:</span>
                        <span className="font-medium">{agent.metrics.totalRequests || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Active:</span>
                        <span className="font-medium">
                          {agent.lastActivity ? formatUptime(agent.lastActivity) : 'Never'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
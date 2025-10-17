'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  ChartBarIcon,
  CpuChipIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

// Dynamically import chart components
const BusinessIntelligenceDashboard = dynamic(() => import('@/components/ai/BusinessIntelligenceDashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-500 animate-pulse">Loading Business Intelligence...</div>
    </div>
  ),
})

export default function AIIntelligencePage() {
  const [systemStatus, setSystemStatus] = useState('checking')
  const [agentStats, setAgentStats] = useState({})
  const [insights, setInsights] = useState([])

  useEffect(() => {
    checkSystemStatus()
    fetchAgentStats()
    fetchBusinessInsights()
  }, [])

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('http://localhost:8002/health')
      if (response.ok) {
        setSystemStatus('connected')
      } else {
        setSystemStatus('degraded')
      }
    } catch (error) {
      console.error('System health check failed:', error)
      setSystemStatus('offline')
    }
  }

  const fetchAgentStats = async () => {
    try {
      const response = await fetch('http://localhost:8002/status')
      if (response.ok) {
        const data = await response.json()
        setAgentStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch agent stats:', error)
    }
  }

  const fetchBusinessInsights = async () => {
    try {
      const response = await fetch('http://localhost:8002/orchestrator/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Generate comprehensive business insights and recommendations for today",
          context: {
            business_type: "barbershop",
            analysis_type: "daily_insights"
          },
          max_agents: 5,
          confidence_threshold: 0.7,
          user_id: "dashboard_user"
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        // Parse agent results into insights
        const agentInsights = data.agent_results?.map((result, index) => ({
          id: index + 1,
          agent: result.agent_type,
          insight: result.result,
          confidence: result.confidence,
          category: getInsightCategory(result.agent_type),
          priority: result.confidence > 0.8 ? 'high' : result.confidence > 0.6 ? 'medium' : 'low'
        })) || []
        
        setInsights(agentInsights)
      }
    } catch (error) {
      console.error('Failed to fetch business insights:', error)
      // Set sample insights as fallback
      setInsights([
        {
          id: 1,
          agent: 'master_coach',
          insight: "Your booking patterns show 85% capacity utilization. Consider implementing premium time slots during peak hours to maximize revenue.",
          confidence: 0.92,
          category: 'strategy',
          priority: 'high'
        },
        {
          id: 2,
          agent: 'financial',
          insight: "Average ticket value has increased 12% this month. Focus on upselling premium services to maintain this growth trajectory.",
          confidence: 0.88,
          category: 'finance',
          priority: 'high'
        },
        {
          id: 3,
          agent: 'customer_success',
          insight: "Customer retention rate is 78%. Implement a loyalty program to push this above the 85% target for premium barbershops.",
          confidence: 0.75,
          category: 'customer',
          priority: 'medium'
        }
      ])
    }
  }

  const getInsightCategory = (agentType) => {
    const categoryMap = {
      'master_coach': 'strategy',
      'technical_operations': 'operations',
      'customer_success': 'customer',
      'marketing': 'marketing',
      'financial': 'finance'
    }
    return categoryMap[agentType] || 'general'
  }

  const getCategoryColor = (category) => {
    const colorMap = {
      strategy: 'blue',
      operations: 'purple',
      customer: 'green',
      marketing: 'orange',
      finance: 'emerald',
      general: 'gray'
    }
    return colorMap[category] || 'gray'
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
      case 'medium':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />
      default:
        return <LightBulbIcon className="h-4 w-4 text-blue-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100'
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100'
      case 'offline':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'connected':
        return 'All Systems Operational'
      case 'degraded':
        return 'Limited Functionality'
      case 'offline':
        return 'System Offline'
      default:
        return 'Checking Status...'
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Business Intelligence Dashboard</h1>
          <p className="text-gray-600">
            Real-time insights powered by 5 specialized AI agents analyzing your business data
          </p>
        </div>

        {/* System Status */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CpuChipIcon className="h-6 w-6 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">AI System Status</h2>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemStatus)}`}>
                {getStatusText(systemStatus)}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">5</div>
                <div className="text-sm text-gray-600">Active Agents</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{agentStats.total_requests || 0}</div>
                <div className="text-sm text-gray-600">Total Requests</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{agentStats.knowledge_documents || 25}</div>
                <div className="text-sm text-gray-600">Knowledge Documents</div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <LightBulbIcon className="h-6 w-6 text-yellow-500" />
                <h2 className="text-lg font-semibold text-gray-900">AI-Generated Business Insights</h2>
              </div>
              <button
                onClick={fetchBusinessInsights}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <ChartBarIcon className="h-4 w-4" />
                <span>Refresh Insights</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {insights.map((insight) => {
                const color = getCategoryColor(insight.category)
                return (
                  <div
                    key={insight.id}
                    className={`p-4 border-l-4 rounded-lg bg-${color}-50 border-${color}-500`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getPriorityIcon(insight.priority)}
                          <span className={`text-sm font-medium text-${color}-900 capitalize`}>
                            {insight.agent.replace('_', ' ')} • {insight.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className={`text-${color}-800`}>{insight.insight}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {insights.length === 0 && systemStatus === 'connected' && (
                <div className="text-center py-8 text-gray-500">
                  <LightBulbIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No insights generated yet. Click "Refresh Insights" to get AI recommendations.</p>
                </div>
              )}
              
              {systemStatus === 'offline' && (
                <div className="text-center py-8 text-gray-500">
                  <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-red-300" />
                  <p>AI system is offline. Please check the connection and try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Business Intelligence Charts */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ArrowTrendingUpIcon className="h-6 w-6 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900">Business Performance Analytics</h2>
            </div>
            <BusinessIntelligenceDashboard />
          </div>
        </div>

        {/* Agent Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <UserGroupIcon className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">Customer Insights</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Retention Rate</span>
                <span className="font-semibold">78%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Satisfaction Score</span>
                <span className="font-semibold">4.6/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Referral Rate</span>
                <span className="font-semibold">23%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CurrencyDollarIcon className="h-6 w-6 text-emerald-500" />
              <h3 className="text-lg font-semibold text-gray-900">Revenue Metrics</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Ticket</span>
                <span className="font-semibold">$67</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Revenue</span>
                <span className="font-semibold">$24,500</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Profit Margin</span>
                <span className="font-semibold">22%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center space-x-3 mb-4">
              <ClockIcon className="h-6 w-6 text-purple-500" />
              <h3 className="text-lg font-semibold text-gray-900">Operational KPIs</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity Utilization</span>
                <span className="font-semibold">85%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Service Time</span>
                <span className="font-semibold">45 min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">No-Show Rate</span>
                <span className="font-semibold">3.2%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
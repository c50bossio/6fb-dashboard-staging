'use client'

import { useState, useEffect } from 'react'
import {
  CogIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  BoltIcon,
  PlusIcon,
  ArrowPathIcon,
  ChartBarIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

export default function WorkflowAutomationDashboard({ barbershop_id = 'demo', compact = false }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [executingWorkflow, setExecutingWorkflow] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [barbershop_id])

  const loadDashboard = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/ai/workflow-automation?barbershop_id=${barbershop_id}`)
      const data = await response.json()
      
      if (data.success) {
        setDashboard(data.dashboard)
      }
    } catch (error) {
      console.error('Failed to load automation dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerWorkflow = async (workflowId, workflowName) => {
    setExecutingWorkflow(workflowId)
    try {
      const response = await fetch('/api/ai/workflow-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'trigger_workflow',
          barbershop_id,
          parameters: {
            workflow_id: workflowId,
            override_conditions: true
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Workflow "${workflowName}" executed successfully!\n\n${data.summary?.impact_summary || 'Actions completed'}`)
        loadDashboard() // Refresh dashboard
      } else {
        alert(`❌ Failed to execute workflow: ${data.error}`)
      }
    } catch (error) {
      console.error('Workflow execution failed:', error)
      alert('❌ Failed to execute workflow')
    } finally {
      setExecutingWorkflow(null)
    }
  }

  const createAutomation = async (suggestion) => {
    try {
      const response = await fetch('/api/ai/workflow-automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: 'create_automation',
          barbershop_id,
          parameters: {
            name: suggestion.title,
            description: suggestion.description,
            trigger_type: 'manual', // For demo purposes
            conditions: {},
            actions: [{ type: 'automated_action', parameters: suggestion }]
          }
        })
      })

      const data = await response.json()
      
      if (data.success) {
        alert(`✅ Automation "${suggestion.title}" created successfully!`)
        loadDashboard()
      }
    } catch (error) {
      console.error('Failed to create automation:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load automation dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <BoltIcon className="h-5 w-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Workflow Automation</h3>
          <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
            {dashboard.active_workflows} active
          </span>
        </div>
        
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center space-x-1"
        >
          <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      {!compact && (
        <div className="border-b">
          <nav className="flex space-x-6 px-4">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'workflows', name: 'Active Workflows', icon: CogIcon },
              { id: 'suggestions', name: 'Suggestions', icon: LightBulbIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      <div className="p-6">
        {/* Overview Tab */}
        {(activeTab === 'overview' || compact) && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg p-4 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-amber-600">Active Workflows</div>
                    <div className="text-2xl font-bold text-amber-900">
                      {dashboard.active_workflows}
                    </div>
                    <div className="text-xs text-amber-600">of {dashboard.total_automations} total</div>
                  </div>
                  <BoltIcon className="h-8 w-8 text-amber-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-green-600">Actions Today</div>
                    <div className="text-2xl font-bold text-green-900">
                      {dashboard.actions_executed_today}
                    </div>
                    <div className="text-xs text-green-600">automated actions</div>
                  </div>
                  <PlayIcon className="h-8 w-8 text-green-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-olive-50 to-indigo-50 rounded-lg p-4 border border-olive-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-olive-600">Time Saved</div>
                    <div className="text-2xl font-bold text-olive-900">
                      {dashboard.time_saved}
                    </div>
                    <div className="text-xs text-olive-600">today</div>
                  </div>
                  <ClockIcon className="h-8 w-8 text-olive-400" />
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-gold-50 to-pink-50 rounded-lg p-4 border border-gold-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gold-600">Success Rate</div>
                    <div className="text-2xl font-bold text-gold-900">
                      {Math.round(Object.values(dashboard.workflow_categories).reduce((acc, cat) => 
                        acc + parseInt(cat.success_rate), 0) / Object.keys(dashboard.workflow_categories).length)}%
                    </div>
                    <div className="text-xs text-gold-600">average</div>
                  </div>
                  <CheckCircleIcon className="h-8 w-8 text-gold-400" />
                </div>
              </div>
            </div>

            {/* Recent Automations */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recent Automated Actions</h4>
              <div className="space-y-3">
                {dashboard.recent_automations.map((automation, idx) => (
                  <div key={idx} className={`border-l-4 rounded-r-lg p-4 ${
                    automation.success 
                      ? 'border-l-green-500 bg-green-50' 
                      : 'border-l-red-500 bg-red-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{automation.type}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            automation.success 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {automation.success ? 'Success' : 'Failed'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-1">{automation.action}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Trigger: {automation.trigger}</span>
                          <span>Result: {automation.result}</span>
                          <span>{new Date(automation.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Active Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(dashboard.workflow_categories).map(([category, data]) => (
                <div key={category} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {category.replace('_', ' ')}
                    </h4>
                    <div className={`w-3 h-3 rounded-full ${
                      data.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                    }`}></div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Active Workflows:</span>
                      <span className="font-medium">{data.count}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Success Rate:</span>
                      <span className="font-medium text-green-600">{data.success_rate}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Last Triggered:</span>
                      <span className="font-medium">{data.last_triggered}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => triggerWorkflow(category, category.replace('_', ' '))}
                    disabled={executingWorkflow === category}
                    className="mt-3 w-full bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 px-3 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {executingWorkflow === category ? (
                      <div className="flex items-center justify-center space-x-2">
                        <ArrowPathIcon className="h-4 w-4 animate-spin" />
                        <span>Executing...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-2">
                        <PlayIcon className="h-4 w-4" />
                        <span>Trigger Now</span>
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Available Triggers */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Available Trigger Types</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.available_triggers.map((trigger, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{trigger.name}</h5>
                      <span className="bg-olive-100 text-olive-800 text-xs px-2 py-1 rounded-full">
                        {trigger.active_workflows} active
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{trigger.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h4 className="font-medium text-gray-900 mb-2">Recommended Automations</h4>
              <p className="text-sm text-gray-600">
                AI-suggested automations to boost your business efficiency
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {dashboard.automation_suggestions.map((suggestion, idx) => (
                <div key={idx} className="border border-green-200 rounded-lg p-6 bg-green-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <LightBulbIcon className="h-5 w-5 text-green-600" />
                        <h5 className="font-semibold text-green-900">{suggestion.title}</h5>
                      </div>
                      <p className="text-green-800 mb-3">{suggestion.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-600 font-medium">Impact:</span>
                          <span className="text-green-800 ml-1">{suggestion.potential_impact}</span>
                        </div>
                        <div>
                          <span className="text-green-600 font-medium">Setup Time:</span>
                          <span className="text-green-800 ml-1">{suggestion.setup_time}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => createAutomation(suggestion)}
                      className="ml-4 bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Create</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
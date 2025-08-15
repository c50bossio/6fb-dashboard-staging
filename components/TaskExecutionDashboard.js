/**
 * 🤖 Task Execution Dashboard
 * 
 * Comprehensive monitoring and approval system for automated task execution:
 * - View active executions and approval queue
 * - Approve or reject pending tasks
 * - Monitor execution history and statistics
 * - Real-time updates of task status
 */

'use client'

import React, { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  EyeIcon,
  ChartBarIcon,
  BoltIcon,
  UserIcon,
  CalendarIcon,
  CogIcon,
  HeartIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function TaskExecutionDashboard({ userId }) {
  const [activeView, setActiveView] = useState('overview') // overview, approval, history, stats
  const [approvalQueue, setApprovalQueue] = useState([])
  const [activeExecutions, setActiveExecutions] = useState([])
  const [executionHistory, setExecutionHistory] = useState([])
  const [systemStats, setSystemStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    fetchTaskData()
    
    const interval = setInterval(fetchTaskData, 5000)
    return () => clearInterval(interval)
  }, [])

  const fetchTaskData = async () => {
    try {
      const [approvalResponse, activeResponse, historyResponse, statsResponse] = await Promise.allSettled([
        fetch('/api/ai/task-execution?action=approval_queue'),
        fetch('/api/ai/task-execution?action=active'),
        fetch('/api/ai/task-execution?action=history&limit=20'),
        fetch('/api/ai/task-execution?action=stats')
      ])

      if (approvalResponse.status === 'fulfilled') {
        const data = await approvalResponse.value.json()
        if (data.success) setApprovalQueue(data.result.tasks || [])
      }

      if (activeResponse.status === 'fulfilled') {
        const data = await activeResponse.value.json()
        if (data.success) setActiveExecutions(data.result.executions || [])
      }

      if (historyResponse.status === 'fulfilled') {
        const data = await historyResponse.value.json()
        if (data.success) setExecutionHistory(data.result.executions || [])
      }

      if (statsResponse.status === 'fulfilled') {
        const data = await statsResponse.value.json()
        if (data.success) setSystemStats(data.result)
      }

      setLastUpdated(new Date())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching task data:', error)
      setLoading(false)
    }
  }

  const approveTask = async (taskId) => {
    try {
      const response = await fetch('/api/ai/task-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_task',
          context: { taskId },
          approvedBy: userId
        })
      })

      const result = await response.json()
      if (result.success) {
        console.log('✅ Task approved:', taskId)
        await fetchTaskData() // Refresh data
      }
    } catch (error) {
      console.error('Error approving task:', error)
    }
  }

  const rejectTask = async (taskId, reason) => {
    try {
      const response = await fetch('/api/ai/task-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_task',
          context: { taskId, reason },
          approvedBy: userId
        })
      })

      const result = await response.json()
      if (result.success) {
        console.log('❌ Task rejected:', taskId)
        await fetchTaskData() // Refresh data
      }
    } catch (error) {
      console.error('Error rejecting task:', error)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      executing: 'text-blue-600 bg-blue-100',
      completed: 'text-green-600 bg-green-100',
      failed: 'text-red-600 bg-red-100',
      rejected: 'text-gray-600 bg-gray-100'
    }
    return colors[status] || 'text-gray-600 bg-gray-100'
  }

  const getEmotionIcon = (emotion) => {
    const icons = {
      happy: '😊',
      satisfied: '😌',
      excited: '🤩',
      frustrated: '😤',
      angry: '😠',
      confused: '😕',
      anxious: '😰',
      neutral: '😐'
    }
    return icons[emotion] || '😐'
  }

  const getUrgencyColor = (urgency) => {
    const colors = {
      high: 'text-red-600',
      medium: 'text-yellow-600',
      low: 'text-green-600'
    }
    return colors[urgency] || 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <BoltIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Automated Task Execution</h1>
            <p className="text-gray-600">Monitor and manage AI-driven automated actions</p>
          </div>
        </div>
        
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'approval', name: `Approval Queue (${approvalQueue.length})`, icon: ShieldCheckIcon },
            { id: 'history', name: 'Execution History', icon: ClockIcon },
            { id: 'stats', name: 'Statistics', icon: ChartBarIcon }
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-semibold text-gray-900">{approvalQueue.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <PlayIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Active Executions</p>
                    <p className="text-2xl font-semibold text-gray-900">{activeExecutions.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-semibold text-gray-900">{systemStats?.success_rate || '0%'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {executionHistory.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getEmotionIcon(task.trigger)}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {task.actions.join(', ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(task.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Active Executions Sidebar */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Active Executions</h3>
            {activeExecutions.length > 0 ? (
              <div className="space-y-3">
                {activeExecutions.map((task) => (
                  <div key={task.id} className="p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900">Task {task.id.slice(-6)}</span>
                      <span className="text-xs text-blue-600">
                        {Math.round(task.elapsed_time / 1000)}s
                      </span>
                    </div>
                    <p className="text-xs text-blue-700">
                      {task.actions.join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active executions</p>
            )}
          </div>
        </div>
      )}

      {/* Approval Queue Tab */}
      {activeView === 'approval' && (
        <div className="space-y-6">
          {approvalQueue.length > 0 ? (
            approvalQueue.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        Task Requires Approval
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Created: {new Date(task.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getUrgencyColor(task.urgency)}`}>
                      {task.urgency} priority
                    </span>
                    <span className="text-lg">{getEmotionIcon(task.trigger?.emotion)}</span>
                  </div>
                </div>

                {/* Task Details */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Trigger Context</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Emotion:</span>
                        <div className="flex items-center space-x-1">
                          <span>{getEmotionIcon(task.trigger?.emotion)}</span>
                          <span className="capitalize">{task.trigger?.emotion}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">User:</span>
                        <span>{task.context_summary?.user_id?.slice(-8) || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Safety Level:</span>
                        <span className="capitalize">{task.safety_level}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Proposed Actions</h4>
                    <ul className="space-y-1">
                      {task.actions.map((action, index) => (
                        <li key={index} className="text-sm text-gray-700 flex items-center space-x-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span className="capitalize">{action.replace(/_/g, ' ')}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* User Message Preview */}
                {task.context_summary?.message_preview && (
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">User Message</h4>
                    <p className="text-sm text-gray-700">"{task.context_summary.message_preview}"</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => rejectTask(task.id, 'Manual rejection by admin')}
                    className="px-4 py-2 text-red-700 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approveTask(task.id)}
                    className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve & Execute
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending approvals</h3>
              <p className="text-gray-600">All automated tasks are running smoothly</p>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeView === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Execution History</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trigger
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Started
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {executionHistory.map((task) => (
                  <tr key={task.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {task.id.slice(-8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>{getEmotionIcon(task.trigger)}</span>
                        <span className="capitalize">{task.trigger}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="max-w-xs truncate">
                        {task.actions.join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {task.duration ? `${Math.round(task.duration / 1000)}s` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(task.started_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistics Tab */}
      {activeView === 'stats' && systemStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Executions:</span>
                <span className="font-semibold">{systemStats.total_executions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Successful:</span>
                <span className="font-semibold text-green-600">{systemStats.successful}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-semibold text-red-600">{systemStats.failed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Success Rate:</span>
                <span className="font-semibold">{systemStats.success_rate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Duration:</span>
                <span className="font-semibold">{systemStats.avg_duration}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Most Common Triggers</h3>
            <div className="space-y-3">
              {systemStats.most_common_triggers?.map((trigger, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">{trigger.trigger}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{trigger.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
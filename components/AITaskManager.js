'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  XMarkIcon,
  PlusIcon,
  ArrowPathIcon,
  FireIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  CheckCircleIcon as CheckCircleSolid
} from '@heroicons/react/24/solid'

export default function AITaskManager({ barbershop_id = 'demo', compact = false }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [completingTask, setCompletingTask] = useState(null)
  const [lastGenerated, setLastGenerated] = useState(null)
  const [showCompleted, setShowCompleted] = useState(false)

  useEffect(() => {
    loadTasks()
    generateTasks() // Auto-generate tasks on load
  }, [barbershop_id])

  const loadTasks = async (status = null) => {
    try {
      setLoading(true)
      const statusParam = status || filter
      const response = await fetch(`/api/ai/task-manager?barbershop_id=${barbershop_id}&status=${statusParam}`)
      const data = await response.json()
      
      if (data.success) {
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateTasks = async () => {
    try {
      const response = await fetch('/api/ai/task-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_tasks',
          barbershop_id
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setLastGenerated(new Date())
        // If we generated new tasks and we're viewing pending tasks, reload
        if (filter === 'pending' && data.tasks_generated > 0) {
          loadTasks()
        }
      }
    } catch (error) {
      console.error('Failed to generate tasks:', error)
    }
  }

  const completeTask = async (task) => {
    if (completingTask === task.id) return
    
    setCompletingTask(task.id)
    try {
      const response = await fetch('/api/ai/task-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_task',
          task_data: { task_id: task.id, barbershop_id }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Show success message
        if (data.reward) {
          alert(`🎉 Task Completed! ${data.reward}`)
        }
        
        // Remove from current list and reload
        setTasks(prev => prev.filter(t => t.id !== task.id))
        setTimeout(() => loadTasks(), 500)
      }
    } catch (error) {
      console.error('Failed to complete task:', error)
    } finally {
      setCompletingTask(null)
    }
  }

  const snoozeTask = async (task) => {
    try {
      const response = await fetch('/api/ai/task-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'snooze_task',
          task_data: { task_id: task.id, barbershop_id }
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setTasks(prev => prev.filter(t => t.id !== task.id))
      }
    } catch (error) {
      console.error('Failed to snooze task:', error)
    }
  }

  const dismissTask = async (task) => {
    if (confirm('Are you sure you want to dismiss this task permanently?')) {
      try {
        const response = await fetch('/api/ai/task-manager', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'dismiss_task',
            task_data: { task_id: task.id, barbershop_id }
          })
        })
        
        const data = await response.json()
        if (data.success) {
          setTasks(prev => prev.filter(t => t.id !== task.id))
        }
      } catch (error) {
        console.error('Failed to dismiss task:', error)
      }
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-50'
      case 'medium': return 'border-l-yellow-500 bg-yellow-50'
      case 'low': return 'border-l-green-500 bg-green-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <FireIcon className="h-4 w-4 text-red-500" />
      case 'medium': return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
      case 'low': return <ClockIcon className="h-4 w-4 text-green-500" />
      default: return <ClockIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getTaskIcon = (task) => {
    if (task.alert_based) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
    }
    if (task.template_id?.includes('revenue') || task.template_id?.includes('upsell')) {
      return <span className="text-green-500">💰</span>
    }
    if (task.template_id?.includes('customer') || task.template_id?.includes('retention')) {
      return <span className="text-blue-500">👥</span>
    }
    if (task.template_id?.includes('social') || task.template_id?.includes('marketing')) {
      return <span className="text-purple-500">📱</span>
    }
    return <LightBulbIcon className="h-5 w-5 text-gray-500" />
  }

  if (compact && tasks.length === 0) {
    return null
  }

  if (loading && tasks.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const highPriorityTasks = pendingTasks.filter(t => t.priority === 'high')

  return (
    <div className="bg-white rounded-lg shadow-md border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold text-gray-900">AI Task Manager</h3>
          {pendingTasks.length > 0 && (
            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
              {pendingTasks.length} pending
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {!compact && (
            <>
              <button
                onClick={() => {
                  setFilter(filter === 'pending' ? 'completed' : 'pending')
                  setShowCompleted(!showCompleted)
                  loadTasks(filter === 'pending' ? 'completed' : 'pending')
                }}
                className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded"
              >
                {filter === 'pending' ? 'View Completed' : 'View Pending'}
              </button>
              <div className="h-4 w-px bg-gray-300"></div>
            </>
          )}
          <button
            onClick={generateTasks}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* High Priority Alert */}
      {highPriorityTasks.length > 0 && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="flex items-center space-x-2">
            <FireIcon className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">
              {highPriorityTasks.length} high priority task{highPriorityTasks.length > 1 ? 's' : ''} need{highPriorityTasks.length === 1 ? 's' : ''} attention
            </span>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <LightBulbIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No tasks available</p>
            <p className="text-sm">AI will generate tasks based on your business needs</p>
          </div>
        ) : (
          <div className="divide-y">
            {tasks.slice(0, compact ? 3 : 10).map((task) => (
              <div key={task.id} className={`p-4 border-l-4 ${getPriorityColor(task.priority)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {getTaskIcon(task)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{task.title}</h4>
                        {getPriorityIcon(task.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      
                      {/* Actions */}
                      {task.actions && task.actions.length > 0 && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">Action items:</div>
                          <ul className="text-xs space-y-1">
                            {task.actions.slice(0, 2).map((action, idx) => (
                              <li key={idx} className="flex items-start space-x-1">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span className="text-gray-700">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {/* Task Metadata */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        {task.estimated_impact && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            {task.estimated_impact}
                          </span>
                        )}
                        {task.estimated_time && (
                          <span className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3" />
                            <span>{task.estimated_time}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Task Actions */}
                  <div className="flex items-center space-x-1 ml-2">
                    {task.status === 'pending' && (
                      <>
                        <button
                          onClick={() => completeTask(task)}
                          disabled={completingTask === task.id}
                          className="text-green-600 hover:text-green-800 p-1 rounded"
                          title="Mark as completed"
                        >
                          {completingTask === task.id ? (
                            <ArrowPathIcon className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => snoozeTask(task)}
                          className="text-yellow-600 hover:text-yellow-800 p-1 rounded"
                          title="Snooze for 4 hours"
                        >
                          <ClockIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => dismissTask(task)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded"
                          title="Dismiss task"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    
                    {task.status === 'completed' && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircleSolid className="h-4 w-4" />
                        <span className="text-xs">Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {lastGenerated && (
        <div className="p-3 border-t bg-gray-50 text-xs text-gray-500 text-center">
          Last updated: {lastGenerated.toLocaleTimeString()}
          {!compact && (
            <span className="ml-2">
              • AI analyzes your business and generates relevant tasks automatically
            </span>
          )}
        </div>
      )}
    </div>
  )
}
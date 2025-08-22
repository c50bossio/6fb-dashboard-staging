'use client'

import {
  ClipboardDocumentCheckIcon,
  PhoneIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BellAlertIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  FlagIcon,
  CameraIcon,
  WrenchScrewdriverIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function ActionCenter({ data }) {
  const [activeTask, setActiveTask] = useState(null)
  const [completedTasks, setCompletedTasks] = useState([])
  const [priorityTasks, setPriorityTasks] = useState([])
  const [loadingActions, setLoadingActions] = useState(true)
  const [actionsError, setActionsError] = useState(null)
  
  const appointments = data?.appointments || []
  const alerts = data?.alerts || []
  const realtime = data?.realtime || {}
  const barbershopId = data?.barbershop_id
  
  if (!barbershopId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <p>Action Center requires barbershop context</p>
          <p className="text-sm mt-1">Please contact support</p>
        </div>
      </div>
    )
  }

  // Load dynamic priority actions from API
  useEffect(() => {
    loadPriorityActions()
  }, [barbershopId])

  const loadPriorityActions = async () => {
    try {
      setLoadingActions(true)
      setActionsError(null)
      
      const response = await fetch(`/api/operations/priority-actions?barbershop_id=${barbershopId}`)
      const result = await response.json()
      
      if (result.success && result.data?.actions) {
        // Map API response to component format
        const formattedActions = result.data.actions.map(action => ({
          id: action.id,
          title: action.title,
          description: action.description,
          priority: action.priority,
          estimatedTime: action.estimatedTime,
          icon: getIconComponent(action.icon),
          color: action.color,
          actions: action.actions,
          urgencyScore: action.urgencyScore,
          data: action.data
        }))
        
        setPriorityTasks(formattedActions)
        console.log('📋 Priority actions loaded:', {
          count: formattedActions.length,
          source: 'AI-generated from real data',
          barbershop_id: barbershopId
        })
      } else {
        throw new Error(result.error || 'Failed to load priority actions')
      }
    } catch (error) {
      console.error('Error loading priority actions:', error)
      setActionsError(error.message)
      
      // Fallback to basic actions if API fails
      setPriorityTasks(getFallbackActions())
    } finally {
      setLoadingActions(false)
    }
  }

  // Map icon strings to components
  const getIconComponent = (iconName) => {
    const iconMap = {
      PhoneIcon,
      CalendarDaysIcon,
      ChatBubbleLeftIcon,
      CameraIcon,
      ClockIcon,
      WrenchScrewdriverIcon,
      BellAlertIcon,
      UserGroupIcon
    }
    return iconMap[iconName] || BellAlertIcon
  }

  // Fallback actions if API fails
  const getFallbackActions = () => [
    {
      id: 'fallback_1',
      title: 'Check appointment status',
      description: 'Review today\'s schedule and confirm appointments',
      priority: 'medium',
      estimatedTime: '10 minutes',
      icon: CalendarDaysIcon,
      color: 'blue',
      actions: ['Review schedule', 'Contact customers']
    },
    {
      id: 'fallback_2', 
      title: 'Update social media',
      description: 'Share recent work and engage with customers',
      priority: 'low',
      estimatedTime: '15 minutes',
      icon: CameraIcon,
      color: 'purple',
      actions: ['Create post', 'Upload photos']
    }
  ]

  const handleTaskAction = (task, action) => {
    setActiveTask(task)
    
    setTimeout(() => {
      setCompletedTasks([...completedTasks, task.id])
      setActiveTask(null)
    }, 2000)
  }

  const getRealtimeStatus = () => {
    const status = []
    if (realtime.active_appointments > 0) {
      status.push(`${realtime.active_appointments} appointments in progress`)
    }
    if (realtime.waiting_customers > 0) {
      status.push(`${realtime.waiting_customers} customers waiting`)
    }
    if (realtime.available_barbers > 0) {
      status.push(`${realtime.available_barbers} barbers available`)
    }
    return status.length > 0 ? status.join(' • ') : 'No current activity'
  }

  const hasCurrentActivity = () => {
    return realtime.active_appointments > 0 || realtime.waiting_customers > 0 || realtime.available_barbers > 0
  }

  return (
    <div className="space-y-6">
      {/* Current Activity - Only show if there's actual business activity */}
      {hasCurrentActivity() && (
        <div className="bg-gradient-to-r from-green-50 to-olive-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse"></div>
              <div>
                <h3 className="font-semibold text-gray-900">Current Activity</h3>
                <p className="text-sm text-gray-600 mt-1">{getRealtimeStatus()}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ClockIcon className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">Next available: {realtime.next_available || '11:30 AM'}</span>
              </div>
              <button className="p-2 rounded-lg bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                <ArrowPathIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Priority Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-green-500" />
            Priority Actions for Today
            {!loadingActions && !actionsError && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-normal">
                AI-Generated
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {loadingActions ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span>{completedTasks.length}/{priorityTasks.length} completed</span>
                <div className="w-24 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-green-500 rounded-full transition-all"
                    style={{ width: `${priorityTasks.length ? (completedTasks.length / priorityTasks.length) * 100 : 0}%` }}
                  />
                </div>
                <button 
                  onClick={loadPriorityActions}
                  className="ml-2 p-1 hover:bg-gray-100 rounded"
                  title="Refresh priority actions"
                >
                  <ArrowPathIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {loadingActions ? (
            <div className="text-center py-8">
              <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Analyzing business data to generate priority actions...</p>
            </div>
          ) : actionsError ? (
            <div className="text-center py-8 bg-yellow-50 rounded-lg border border-yellow-200">
              <ExclamationTriangleIcon className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
              <p className="text-yellow-800 font-medium">Unable to generate AI actions</p>
              <p className="text-yellow-700 text-sm mt-1">{actionsError}</p>
              <button 
                onClick={loadPriorityActions}
                className="mt-3 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : priorityTasks.length === 0 ? (
            <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
              <CheckCircleIcon className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <p className="text-green-800 font-medium">No urgent actions needed</p>
              <p className="text-green-700 text-sm mt-1">Your business is running smoothly!</p>
            </div>
          ) : (
            priorityTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isActive={activeTask?.id === task.id}
                isCompleted={completedTasks.includes(task.id)}
                onAction={(action) => handleTaskAction(task, action)}
              />
            ))
          )}
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BellAlertIcon className="h-6 w-6 text-amber-700" />
            Active Alerts
          </h3>
          
          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <AlertCard key={index} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionButton
          icon={CalendarDaysIcon}
          label="New Walk-in"
          color="blue"
          onClick={() => window.location.href = '/dashboard/bookings'}
        />
        <QuickActionButton
          icon={PhoneIcon}
          label="Call Queue"
          color="green"
          badge="3"
          onClick={() => {
            // Navigate to call queue management
            window.location.href = '/dashboard/call-queue'
          }}
        />
        <QuickActionButton
          icon={UserGroupIcon}
          label="Customer List"
          color="purple"
          onClick={() => window.location.href = '/dashboard/customers'}
        />
        <QuickActionButton
          icon={ClockIcon}
          label="Today's Schedule"
          color="amber"
          onClick={() => window.location.href = '/dashboard/calendar'}
        />
      </div>

      {/* Appointment Queue */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Upcoming Appointments
        </h3>
        
        <div className="space-y-3">
          {appointments.slice(0, 5).map((apt, index) => (
            <AppointmentCard key={index} appointment={apt} />
          ))}
          
          {appointments.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No upcoming appointments
            </p>
          )}
        </div>
        
        {appointments.length > 5 && (
          <button className="w-full mt-4 py-2 text-sm font-medium text-olive-600 hover:text-olive-800 border-t border-gray-100 pt-4">
            View all {appointments.length} appointments →
          </button>
        )}
      </div>
    </div>
  )
}

const TaskCard = ({ task, isActive, isCompleted, onAction }) => {
  const [showDetails, setShowDetails] = useState(false)
  const Icon = task.icon
  const priorityColors = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-amber-200 bg-amber-50',
    low: 'border-olive-200 bg-olive-50'
  }

  if (isCompleted) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-gray-500 line-through">{task.title}</p>
              <p className="text-sm text-gray-400">Completed</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-lg border ${priorityColors[task.priority]} ${isActive ? 'ring-2 ring-indigo-500' : ''}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 bg-${task.color}-100 rounded-lg`}>
            <Icon className={`h-5 w-5 text-${task.color}-600`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{task.title}</h4>
              {task.urgencyScore && task.urgencyScore > 80 && (
                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                  URGENT
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">{task.description}</p>
            
            {/* Enhanced details for AI-generated actions */}
            {task.data && showDetails && (
              <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200 text-xs">
                {task.data.count && (
                  <div className="mb-2">
                    <span className="font-medium">Count: </span>
                    <span className="text-gray-600">{task.data.count} items</span>
                  </div>
                )}
                {task.data.customers && (
                  <div className="mb-2">
                    <span className="font-medium">Recent customers: </span>
                    <span className="text-gray-600">
                      {task.data.customers.slice(0, 3).map(c => c.name).join(', ')}
                      {task.data.customers.length > 3 && ` +${task.data.customers.length - 3} more`}
                    </span>
                  </div>
                )}
                {task.data.appointments && (
                  <div className="mb-2">
                    <span className="font-medium">Next appointments: </span>
                    <span className="text-gray-600">
                      {task.data.appointments.slice(0, 2).map(a => `${a.time} (${a.customer_name})`).join(', ')}
                    </span>
                  </div>
                )}
                {task.data.recent_reviews && (
                  <div className="mb-2">
                    <span className="font-medium">Recent review: </span>
                    <span className="text-gray-600">
                      "{task.data.recent_reviews[0]?.text}" - {task.data.recent_reviews[0]?.customer}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {task.estimatedTime}
              </span>
              <span className={`px-2 py-0.5 rounded-full font-medium ${
                task.priority === 'high' ? 'bg-softred-100 text-softred-800' :
                task.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-olive-100 text-olive-700'
              }`}>
                {task.priority} priority
              </span>
              {task.data && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showDetails ? 'Hide' : 'Show'} details
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {isActive ? (
            <div className="px-3 py-1 bg-olive-500 text-white rounded-lg text-sm flex items-center gap-2">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              Processing...
            </div>
          ) : (
            task.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => onAction(action)}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                {action}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

const AlertCard = ({ alert }) => {
  const typeStyles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-olive-50 border-olive-200 text-olive-800',
    success: 'bg-green-50 border-green-200 text-green-800'
  }

  const typeIcons = {
    warning: ExclamationTriangleIcon,
    error: ExclamationTriangleIcon,
    info: BellAlertIcon,
    success: CheckCircleIcon
  }

  const Icon = typeIcons[alert.type] || BellAlertIcon

  return (
    <div className={`p-3 rounded-lg border ${typeStyles[alert.type]}`}>
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm font-medium flex-1">{alert.message}</p>
        <ChevronRightIcon className="h-4 w-4" />
      </div>
    </div>
  )
}

const QuickActionButton = ({ icon: Icon, label, color, badge, onClick }) => (
  <button
    onClick={onClick}
    className={`relative p-4 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all hover:border-${color}-300`}
  >
    {badge && (
      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
        {badge}
      </div>
    )}
    <div className={`p-3 bg-${color}-50 rounded-lg mb-3 inline-block`}>
      <Icon className={`h-6 w-6 text-${color}-500`} />
    </div>
    <div className="text-sm font-medium text-gray-900">{label}</div>
  </button>
)

const AppointmentCard = ({ appointment }) => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
    <div className="flex items-center gap-3">
      <div className="text-sm font-bold text-gray-600 w-16">
        {appointment.time || '10:30 AM'}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {appointment.customer_name || 'Customer'}
        </p>
        <p className="text-xs text-gray-500">
          {appointment.service_name || "Unknown Service"} with {appointment.barber_name || 'Barber'}
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${
        appointment.status === 'confirmed' ? 'bg-green-500' : 
        appointment.status === 'pending' ? 'bg-amber-500' : 
        'bg-gray-400'
      }`} />
      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
    </div>
  </div>
)
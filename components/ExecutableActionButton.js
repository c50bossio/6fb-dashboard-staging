'use client'

import { 
  PlayIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'
import { useState } from 'react'

const ACTION_ICONS = {
  'sms_campaign': '📱',
  'email_campaign': '✉️', 
  'customer_followup': '👥',
  'social_media_post': '📱',
  'review_request': '⭐',
  'appointment_reminder': '📅',
  'pricing_update': '💰',
  'staff_notification': '👨‍💼'
}

const ACTION_COLORS = {
  'high': 'bg-red-50 border-red-200 text-red-700',
  'medium': 'bg-yellow-50 border-yellow-200 text-yellow-700', 
  'low': 'bg-green-50 border-green-200 text-green-700'
}

const ExecutableActionButton = ({ 
  action, 
  onExecute, 
  disabled = false,
  size = 'medium' 
}) => {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionResult, setExecutionResult] = useState(null)
  
  const handleExecute = async () => {
    if (disabled || isExecuting) return
    
    setIsExecuting(true)
    setExecutionResult(null)
    
    try {
      const result = await onExecute(action)
      setExecutionResult(result)
      
      if (result.success) {
        setTimeout(() => {
          setExecutionResult(null)
        }, 3000)
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        error: error.message || 'Action failed'
      })
    } finally {
      setIsExecuting(false)
    }
  }
  
  const getButtonClasses = () => {
    const baseClasses = "flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200 hover:scale-105"
    const sizeClasses = size === 'small' ? 'text-xs' : size === 'large' ? 'text-base px-4 py-3' : 'text-sm'
    const priorityClasses = ACTION_COLORS[action.priority] || ACTION_COLORS['medium']
    
    if (executionResult?.success) {
      return `${baseClasses} ${sizeClasses} bg-green-100 border-green-300 text-green-800`
    }
    
    if (executionResult?.error) {
      return `${baseClasses} ${sizeClasses} bg-red-100 border-red-300 text-red-800`
    }
    
    if (disabled || isExecuting) {
      return `${baseClasses} ${sizeClasses} ${priorityClasses} opacity-50 cursor-not-allowed`
    }
    
    return `${baseClasses} ${sizeClasses} ${priorityClasses} hover:shadow-md cursor-pointer`
  }
  
  const getIcon = () => {
    if (executionResult?.success) {
      return <CheckCircleIcon className="h-4 w-4" />
    }
    
    if (executionResult?.error) {
      return <ExclamationTriangleIcon className="h-4 w-4" />
    }
    
    if (isExecuting) {
      return <ClockIcon className="h-4 w-4 animate-spin" />
    }
    
    return <PlayIcon className="h-4 w-4" />
  }
  
  const getLabel = () => {
    if (executionResult?.success) {
      return executionResult.message || 'Completed!'
    }
    
    if (executionResult?.error) {
      return `Failed: ${executionResult.error}`
    }
    
    if (isExecuting) {
      return 'Executing...'
    }
    
    return action.label || action.task || action.type?.replace('_', ' ')
  }
  
  const actionEmoji = ACTION_ICONS[action.type] || '⚡'
  
  return (
    <button
      onClick={handleExecute}
      disabled={disabled || isExecuting}
      className={getButtonClasses()}
      title={action.description || `Execute ${action.type}`}
    >
      <span className="text-base">{actionEmoji}</span>
      {getIcon()}
      <span className="font-medium">{getLabel()}</span>
      {action.priority && (
        <span className={`
          px-2 py-1 text-xs rounded-full 
          ${action.priority === 'high' ? 'bg-red-200 text-red-800' : 
            action.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' : 
            'bg-green-200 text-green-800'}
        `}>
          {action.priority}
        </span>
      )}
    </button>
  )
}

export default ExecutableActionButton
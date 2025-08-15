'use client'

/**
 * Standardized Notification components for consistent messaging across the dashboard
 * Replaces scattered notification implementations with reusable, accessible components
 */

import { 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline'
import { useEffect, useState } from 'react'

export function Notification({ 
  type = 'info', 
  message, 
  isVisible = false, 
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
  position = 'top-right',
  className = ''
}) {
  const [show, setShow] = useState(isVisible)

  useEffect(() => {
    setShow(isVisible)
  }, [isVisible])

  useEffect(() => {
    if (show && autoClose) {
      const timer = setTimeout(() => {
        setShow(false)
        onClose?.()
      }, autoCloseDelay)
      
      return () => clearTimeout(timer)
    }
  }, [show, autoClose, autoCloseDelay, onClose])

  const typeConfig = {
    success: {
      bg: 'bg-moss-50 border-moss-200',
      text: 'text-moss-800',
      icon: CheckCircleIcon,
      iconColor: 'text-moss-600'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
      icon: ExclamationCircleIcon,
      iconColor: 'text-red-600'
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: ExclamationTriangleIcon,
      iconColor: 'text-amber-600'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: InformationCircleIcon,
      iconColor: 'text-blue-600'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  const positionClasses = {
    'top-right': 'fixed top-4 right-4',
    'top-left': 'fixed top-4 left-4',
    'top-center': 'fixed top-4 left-1/2 transform -translate-x-1/2',
    'bottom-right': 'fixed bottom-4 right-4',
    'bottom-left': 'fixed bottom-4 left-4',
    'bottom-center': 'fixed bottom-4 left-1/2 transform -translate-x-1/2'
  }

  if (!show) return null

  return (
    <div 
      className={`
        ${positionClasses[position]} p-4 rounded-md shadow-lg z-50 border
        ${config.bg} ${config.text} ${className}
        transition-all duration-300 ease-in-out
        animate-in slide-in-from-top-2 fade-in-0
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <Icon className={`h-5 w-5 ${config.iconColor} mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={() => {
              setShow(false)
              onClose()
            }}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notification"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Notification provider for managing multiple notifications
 */
export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])

  const addNotification = (notification) => {
    const id = Date.now() + Math.random()
    const newNotification = { ...notification, id }
    setNotifications(prev => [...prev, newNotification])
    
    // Auto-remove after delay
    if (notification.autoClose !== false) {
      setTimeout(() => {
        removeNotification(id)
      }, notification.autoCloseDelay || 5000)
    }
    
    return id
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notification, index) => (
          <Notification
            key={notification.id}
            {...notification}
            isVisible={true}
            onClose={() => removeNotification(notification.id)}
            position="static"
            className={`transform transition-all duration-300 ${
              index > 0 ? `translate-y-${index * 2}` : ''
            }`}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

/**
 * Hook for using notifications
 */
import { createContext, useContext } from 'react'

const NotificationContext = createContext()

export function useNotification() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

/**
 * Toast notification component for quick inline notifications
 */
export function Toast({ 
  type = 'info', 
  message, 
  isVisible = false, 
  onClose,
  duration = 3000 
}) {
  const [show, setShow] = useState(isVisible)

  useEffect(() => {
    setShow(isVisible)
  }, [isVisible])

  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setShow(false)
        onClose?.()
      }, duration)
      
      return () => clearTimeout(timer)
    }
  }, [show, duration, onClose])

  const config = {
    success: 'bg-moss-600 text-white',
    error: 'bg-red-600 text-white', 
    warning: 'bg-amber-600 text-white',
    info: 'bg-blue-600 text-white'
  }

  if (!show) return null

  return (
    <div 
      className={`
        fixed bottom-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50
        ${config[type]}
        transition-all duration-300 ease-in-out
        animate-in slide-in-from-bottom-2 fade-in-0
      `}
      role="alert"
    >
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XMarkIcon,
  InformationCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

export default function BookedBarberNotification() {
  const [notifications, setNotifications] = useState([])

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    if (notifications.length > 0) {
      const timer = setTimeout(() => {
        setNotifications(prev => prev.slice(1))
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notifications])

  const addNotification = (notification) => {
    const id = Date.now() + Math.random()
    setNotifications(prev => [...prev, { ...notification, id }])
  }

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // Global function to show notifications
  if (typeof window !== 'undefined') {
    window.showBookedBarberNotification = addNotification
  }

  if (notifications.length === 0) return null

  const getNotificationStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 border-green-200',
          text: 'text-green-800',
          icon: CheckCircleIcon,
          iconColor: 'text-green-600'
        }
      case 'error':
        return {
          bg: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: XCircleIcon,
          iconColor: 'text-red-600'
        }
      case 'warning':
        return {
          bg: 'bg-amber-50 border-amber-200',
          text: 'text-amber-800',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-amber-600'
        }
      case 'info':
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: InformationCircleIcon,
          iconColor: 'text-blue-600'
        }
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => {
        const styles = getNotificationStyles(notification.type)
        const IconComponent = styles.icon

        return (
          <div
            key={notification.id}
            className={`
              ${styles.bg} ${styles.text} border rounded-xl p-4 shadow-lg
              animate-in slide-in-from-right-5 duration-300
              backdrop-blur-sm
            `}
          >
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0">
                <IconComponent className={`h-6 w-6 ${styles.iconColor}`} />
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                {notification.title && (
                  <h4 className="font-semibold text-sm mb-1">
                    {notification.title}
                  </h4>
                )}
                <p className="text-sm leading-5">
                  {notification.message}
                </p>
                {notification.details && (
                  <p className="text-xs mt-2 opacity-75">
                    {notification.details}
                  </p>
                )}
              </div>
              
              {/* Close button */}
              <button
                onClick={() => removeNotification(notification.id)}
                className={`
                  flex-shrink-0 p-1 rounded-md transition-colors
                  hover:bg-black hover:bg-opacity-10
                  ${styles.iconColor}
                `}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Helper functions for easy use
export const showSuccess = (title, message, details) => {
  if (typeof window !== 'undefined' && window.showBookedBarberNotification) {
    window.showBookedBarberNotification({
      type: 'success',
      title,
      message,
      details
    })
  }
}

export const showError = (title, message, details) => {
  if (typeof window !== 'undefined' && window.showBookedBarberNotification) {
    window.showBookedBarberNotification({
      type: 'error',
      title,
      message,
      details
    })
  }
}

export const showWarning = (title, message, details) => {
  if (typeof window !== 'undefined' && window.showBookedBarberNotification) {
    window.showBookedBarberNotification({
      type: 'warning',
      title,
      message,
      details
    })
  }
}

export const showInfo = (title, message, details) => {
  if (typeof window !== 'undefined' && window.showBookedBarberNotification) {
    window.showBookedBarberNotification({
      type: 'info',
      title,
      message,
      details
    })
  }
}
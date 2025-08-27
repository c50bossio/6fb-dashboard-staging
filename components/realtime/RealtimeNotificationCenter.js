/**
 * Real-time Notification Center Component
 * Displays and manages live notifications from the WebSocket system
 */

import React, { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Info, CheckCircle, AlertTriangle } from 'lucide-react'
import { useRealtimeNotifications } from '@/hooks/useEnhancedWebSocket'

const NotificationIcon = ({ type, priority }) => {
  const iconProps = { size: 16, className: "notification-icon" }
  
  switch (type) {
    case 'success':
      return <CheckCircle {...iconProps} className="notification-icon text-green-500" />
    case 'error':
      return <AlertCircle {...iconProps} className="notification-icon text-red-500" />
    case 'warning':
      return <AlertTriangle {...iconProps} className="notification-icon text-yellow-500" />
    case 'info':
    default:
      return <Info {...iconProps} className="notification-icon text-blue-500" />
  }
}

const NotificationItem = ({ notification, onMarkAsRead, onRemove }) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isRemoving, setIsRemoving] = useState(false)

  const handleRemove = () => {
    setIsRemoving(true)
    setTimeout(() => {
      setIsVisible(false)
      onRemove(notification.id)
    }, 300)
  }

  const handleMarkAsRead = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id)
    }
  }

  const priorityClasses = {
    high: 'border-l-red-500 bg-red-50',
    normal: 'border-l-blue-500 bg-blue-50',
    low: 'border-l-gray-500 bg-gray-50'
  }

  if (!isVisible) return null

  return (
    <div
      className={`
        notification-item border-l-4 p-3 mb-2 rounded-r-lg shadow-sm transition-all duration-300
        ${priorityClasses[notification.priority] || priorityClasses.normal}
        ${notification.read ? 'opacity-75' : 'opacity-100'}
        ${isRemoving ? 'transform scale-95 opacity-0' : ''}
        hover:shadow-md cursor-pointer
      `}
      onClick={handleMarkAsRead}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2 flex-1">
          <NotificationIcon type={notification.type} priority={notification.priority} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className={`
                text-sm font-medium truncate
                ${notification.read ? 'text-gray-600' : 'text-gray-900'}
              `}>
                {notification.title}
              </h4>
              
              {!notification.read && (
                <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
              )}
            </div>
            
            <p className={`
              text-sm mt-1 break-words
              ${notification.read ? 'text-gray-500' : 'text-gray-700'}
            `}>
              {notification.message}
            </p>
            
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </span>
              
              {notification.priority === 'high' && (
                <span className="text-xs text-red-600 font-medium">
                  High Priority
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 ml-2">
          {!notification.read && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleMarkAsRead()
              }}
              className="p-1 text-gray-400 hover:text-green-600 transition-colors"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
            title="Remove notification"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function RealtimeNotificationCenter({ className = '', maxHeight = '400px' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  } = useRealtimeNotifications({ maxNotifications: 50 })

  // Play notification sound for new notifications
  useEffect(() => {
    if (soundEnabled && unreadCount > 0) {
      const audio = new Audio('/notification-sound.mp3')
      audio.volume = 0.3
      audio.play().catch(e => console.log('Could not play notification sound:', e))
    }
  }, [unreadCount, soundEnabled])

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleToggle = () => {
    setIsOpen(!isOpen)
  }

  const handleClearAll = () => {
    clearAll()
    setIsOpen(false)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title={`${unreadCount} unread notifications`}
      >
        <Bell size={20} />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-25"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel */}
          <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Notifications
                </h3>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1 rounded transition-colors ${
                      soundEnabled ? 'text-blue-600' : 'text-gray-400'
                    }`}
                    title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
                  >
                    🔔
                  </button>
                  
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              {unreadCount > 0 && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">
                    {unreadCount} unread
                  </span>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Mark all read
                    </button>
                    
                    <button
                      onClick={handleClearAll}
                      className="text-xs text-red-600 hover:text-red-800 font-medium"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div 
              className="overflow-y-auto p-2"
              style={{ maxHeight }}
            >
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell size={32} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkAsRead={markAsRead}
                      onRemove={removeNotification}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Toast-style notification display
 */
export function NotificationToasts({ position = 'top-right', maxToasts = 5 }) {
  const [toasts, setToasts] = useState([])
  
  const { notifications } = useRealtimeNotifications()

  // Show new notifications as toasts
  useEffect(() => {
    const newNotifications = notifications.filter(n => 
      !n.read && !toasts.find(t => t.id === n.id)
    ).slice(0, maxToasts)

    if (newNotifications.length > 0) {
      setToasts(prev => [...newNotifications, ...prev].slice(0, maxToasts))

      // Auto-remove toasts after 5 seconds
      newNotifications.forEach(notification => {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== notification.id))
        }, 5000)
      })
    }
  }, [notifications, maxToasts])

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  if (toasts.length === 0) return null

  return (
    <div className={`fixed z-50 space-y-2 ${positionClasses[position]}`}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <NotificationIcon type={toast.type} priority={toast.priority} />
              
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900">
                  {toast.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {toast.message}
                </p>
              </div>
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default RealtimeNotificationCenter
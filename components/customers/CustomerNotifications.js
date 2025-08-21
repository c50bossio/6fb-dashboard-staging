/**
 * Customer Notifications Component
 * 
 * Provides beautiful success/error animations and feedback for customer operations
 * Includes toast notifications, inline alerts, and animated confirmations
 */

'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { customerDesignTokens } from './CustomerDesignSystem'

/**
 * Animated checkmark for success states
 */
export function AnimatedCheckmark({ size = 'default', className = '' }) {
  const sizes = {
    small: 'w-6 h-6',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  return (
    <div className={`${sizes[size]} ${className} relative`}>
      <svg
        viewBox="0 0 50 50"
        className="w-full h-full"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          className="animate-[checkmark-circle_0.6s_ease-in-out_forwards]"
          style={{
            strokeDasharray: '126',
            strokeDashoffset: '126'
          }}
        />
        <path
          d="M16 25l6 6 12-12"
          fill="none"
          stroke="#22c55e"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-[checkmark-check_0.4s_ease-in-out_0.3s_forwards]"
          style={{
            strokeDasharray: '20',
            strokeDashoffset: '20'
          }}
        />
      </svg>

      <style jsx>{`
        @keyframes checkmark-circle {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes checkmark-check {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Animated error X for error states
 */
export function AnimatedErrorX({ size = 'default', className = '' }) {
  const sizes = {
    small: 'w-6 h-6',
    default: 'w-12 h-12',
    large: 'w-16 h-16'
  }

  return (
    <div className={`${sizes[size]} ${className} relative`}>
      <svg viewBox="0 0 50 50" className="w-full h-full">
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
          className="animate-[error-circle_0.6s_ease-in-out_forwards]"
          style={{
            strokeDasharray: '126',
            strokeDashoffset: '126'
          }}
        />
        <path
          d="M18 18l14 14M32 18l-14 14"
          fill="none"
          stroke="#ef4444"
          strokeWidth="3"
          strokeLinecap="round"
          className="animate-[error-x_0.4s_ease-in-out_0.3s_forwards]"
          style={{
            strokeDasharray: '20',
            strokeDashoffset: '20'
          }}
        />
      </svg>

      <style jsx>{`
        @keyframes error-circle {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes error-x {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Toast notification component with animations
 */
export function CustomerToast({
  type = 'success', // 'success', 'error', 'warning', 'info'
  title,
  message,
  isVisible = true,
  onClose,
  duration = 5000,
  position = 'top-right', // 'top-right', 'top-left', 'bottom-right', 'bottom-left'
  showIcon = true,
  showCloseButton = true,
  className = ''
}) {
  const [isShowing, setIsShowing] = useState(false)
  const timeoutRef = useRef(null)

  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-500',
      progressColor: 'bg-green-500'
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500',
      progressColor: 'bg-red-500'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500',
      progressColor: 'bg-yellow-500'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500',
      progressColor: 'bg-blue-500'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true)
      
      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          handleClose()
        }, duration)
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isVisible, duration])

  const handleClose = () => {
    setIsShowing(false)
    setTimeout(() => {
      onClose?.()
    }, 300) // Match exit animation duration
  }

  if (!isVisible) return null

  return (
    <div
      className={`
        fixed z-50 ${positions[position]} max-w-sm w-full pointer-events-auto
        ${isShowing ? 'animate-in slide-in-from-right-full' : 'animate-out slide-out-to-right-full'}
        ${className}
      `}
    >
      <div className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border rounded-lg shadow-lg p-4 relative overflow-hidden
      `}>
        {/* Progress bar for auto-dismiss */}
        {duration > 0 && (
          <div
            className={`absolute bottom-0 left-0 h-1 ${config.progressColor} rounded-full`}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`
            }}
          />
        )}

        <div className="flex items-start space-x-3">
          {/* Icon */}
          {showIcon && (
            <div className="flex-shrink-0">
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-semibold mb-1">
                {title}
              </h4>
            )}
            <p className="text-sm leading-relaxed">
              {message}
            </p>
          </div>

          {/* Close button */}
          {showCloseButton && (
            <button
              onClick={handleClose}
              className={`
                flex-shrink-0 p-1 rounded-md transition-colors duration-200
                hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black/20
              `}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes toast-progress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Inline notification component
 */
export function InlineNotification({
  type = 'info',
  title,
  message,
  showIcon = true,
  dismissible = false,
  onDismiss,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(true)

  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-500'
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-500'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => {
      onDismiss?.()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div className={`
      ${config.bgColor} ${config.borderColor} ${config.textColor}
      border rounded-lg p-4 animate-in fade-in-0 slide-in-from-top-2
      ${className}
    `}>
      <div className="flex items-start space-x-3">
        {showIcon && (
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <h4 className="text-sm font-semibold mb-1">
              {title}
            </h4>
          )}
          <p className="text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {dismissible && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md transition-colors duration-200 hover:bg-black/10"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Confirmation modal with animations
 */
export function AnimatedConfirmation({
  isOpen = false,
  type = 'success',
  title,
  message,
  primaryAction,
  secondaryAction,
  onClose,
  showIcon = true,
  className = ''
}) {
  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      iconColor: 'text-green-500',
      bgGradient: 'from-green-50 to-emerald-50',
      primaryButtonColor: 'bg-green-600 hover:bg-green-700'
    },
    error: {
      icon: XCircleIcon,
      iconColor: 'text-red-500',
      bgGradient: 'from-red-50 to-pink-50',
      primaryButtonColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-500',
      bgGradient: 'from-yellow-50 to-orange-50',
      primaryButtonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: 'text-blue-500',
      bgGradient: 'from-blue-50 to-indigo-50',
      primaryButtonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  }

  const config = typeConfig[type]
  const Icon = config.icon

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`
        relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6
        animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4
        ${className}
      `}>
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${config.bgGradient} rounded-2xl opacity-50`} />
        
        {/* Content */}
        <div className="relative z-10">
          {showIcon && (
            <div className="flex justify-center mb-4">
              {type === 'success' ? (
                <AnimatedCheckmark size="large" />
              ) : type === 'error' ? (
                <AnimatedErrorX size="large" />
              ) : (
                <div className="p-3 rounded-full bg-white shadow-lg">
                  <Icon className={`h-8 w-8 ${config.iconColor}`} />
                </div>
              )}
            </div>
          )}

          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            {secondaryAction && (
              <button
                onClick={secondaryAction.onClick}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className={`
                  flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-all duration-200
                  transform hover:scale-105 focus:ring-2 focus:ring-offset-2
                  ${config.primaryButtonColor}
                `}
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Progress notification for long operations
 */
export function ProgressNotification({
  title = 'Processing...',
  message,
  progress = 0, // 0-100
  isVisible = true,
  onCancel,
  className = ''
}) {
  if (!isVisible) return null

  return (
    <div className={`
      bg-white border border-gray-200 rounded-lg shadow-lg p-4
      animate-in fade-in-0 slide-in-from-bottom-2
      ${className}
    `}>
      <div className="flex items-center space-x-3">
        {/* Animated spinner */}
        <div className="flex-shrink-0">
          <div className="w-6 h-6 border-2 border-olive-200 border-t-olive-600 rounded-full animate-spin" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            {title}
          </h4>
          {message && (
            <p className="text-sm text-gray-600 mb-2">
              {message}
            </p>
          )}
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className="bg-olive-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{Math.round(progress)}% complete</span>
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600 underline"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Floating success message with confetti effect
 */
export function SuccessConfetti({
  message = 'Success!',
  isVisible = true,
  onComplete,
  duration = 3000
}) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    if (isVisible) {
      // Generate confetti particles
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        color: ['#22c55e', '#10b981', '#059669', '#047857'][Math.floor(Math.random() * 4)],
        delay: Math.random() * 500
      }))
      setParticles(newParticles)

      const timer = setTimeout(() => {
        onComplete?.()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [isVisible, duration, onComplete])

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Confetti particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 animate-bounce"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            animationDelay: `${particle.delay}ms`,
            animationDuration: '2s'
          }}
        />
      ))}

      {/* Success message */}
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4 animate-in zoom-in-95 fade-in-0">
        <div className="text-center">
          <AnimatedCheckmark size="large" className="mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {message}
          </h3>
          <div className="flex justify-center">
            <SparklesIcon className="h-5 w-5 text-yellow-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default {
  AnimatedCheckmark,
  AnimatedErrorX,
  CustomerToast,
  InlineNotification,
  AnimatedConfirmation,
  ProgressNotification,
  SuccessConfetti
}
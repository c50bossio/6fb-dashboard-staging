'use client'

import {
  InformationCircleIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useState, useRef, useEffect } from 'react'

export default function ContextualTooltip({ 
  children, 
  content, 
  type = 'info', 
  position = 'top',
  trigger = 'hover',
  delay = 500,
  maxWidth = 'max-w-sm',
  showArrow = true,
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [actualPosition, setActualPosition] = useState(position)
  const tooltipRef = useRef(null)
  const triggerRef = useRef(null)
  const timeoutRef = useRef(null)

  // Icon and styling based on tooltip type
  const getTooltipStyles = () => {
    switch (type) {
      case 'info':
        return {
          icon: InformationCircleIcon,
          bgColor: 'bg-blue-600',
          textColor: 'text-white',
          borderColor: 'border-blue-600'
        }
      case 'tip':
        return {
          icon: LightBulbIcon,
          bgColor: 'bg-amber-500',
          textColor: 'text-white',
          borderColor: 'border-amber-500'
        }
      case 'warning':
        return {
          icon: ExclamationTriangleIcon,
          bgColor: 'bg-orange-500',
          textColor: 'text-white',
          borderColor: 'border-orange-500'
        }
      case 'success':
        return {
          icon: CheckCircleIcon,
          bgColor: 'bg-green-600',
          textColor: 'text-white',
          borderColor: 'border-green-600'
        }
      case 'magic':
        return {
          icon: SparklesIcon,
          bgColor: 'bg-purple-600',
          textColor: 'text-white',
          borderColor: 'border-purple-600'
        }
      default:
        return {
          icon: InformationCircleIcon,
          bgColor: 'bg-gray-800',
          textColor: 'text-white',
          borderColor: 'border-gray-800'
        }
    }
  }

  const styles = getTooltipStyles()
  const Icon = styles.icon

  // Position calculation
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current
      const trigger = triggerRef.current
      const rect = trigger.getBoundingClientRect()
      const tooltipRect = tooltip.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      let newPosition = position

      // Auto-adjust position if tooltip would go off-screen
      if (position === 'top' && rect.top - tooltipRect.height < 10) {
        newPosition = 'bottom'
      } else if (position === 'bottom' && rect.bottom + tooltipRect.height > viewportHeight - 10) {
        newPosition = 'top'
      } else if (position === 'left' && rect.left - tooltipRect.width < 10) {
        newPosition = 'right'
      } else if (position === 'right' && rect.right + tooltipRect.width > viewportWidth - 10) {
        newPosition = 'left'
      }

      setActualPosition(newPosition)
    }
  }, [isVisible, position])

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, trigger === 'hover' ? delay : 0)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  const handleTriggerEvent = (eventType) => {
    if (trigger === 'hover') {
      if (eventType === 'enter') showTooltip()
      if (eventType === 'leave') hideTooltip()
    } else if (trigger === 'click') {
      if (eventType === 'click') {
        isVisible ? hideTooltip() : showTooltip()
      }
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getPositionClasses = () => {
    switch (actualPosition) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2'
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2'
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2'
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2'
    }
  }

  const getArrowClasses = () => {
    if (!showArrow) return ''
    
    const arrowBase = 'absolute w-3 h-3 transform rotate-45'
    switch (actualPosition) {
      case 'top':
        return `${arrowBase} ${styles.bgColor} top-full left-1/2 -translate-x-1/2 -mt-1.5`
      case 'bottom':
        return `${arrowBase} ${styles.bgColor} bottom-full left-1/2 -translate-x-1/2 -mb-1.5`
      case 'left':
        return `${arrowBase} ${styles.bgColor} left-full top-1/2 -translate-y-1/2 -ml-1.5`
      case 'right':
        return `${arrowBase} ${styles.bgColor} right-full top-1/2 -translate-y-1/2 -mr-1.5`
      default:
        return `${arrowBase} ${styles.bgColor} top-full left-1/2 -translate-x-1/2 -mt-1.5`
    }
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div
        ref={triggerRef}
        onMouseEnter={() => handleTriggerEvent('enter')}
        onMouseLeave={() => handleTriggerEvent('leave')}
        onClick={() => handleTriggerEvent('click')}
        className={`${trigger === 'click' ? 'cursor-pointer' : ''}`}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 ${getPositionClasses()} ${maxWidth}
            ${styles.bgColor} ${styles.textColor} text-sm rounded-lg shadow-lg
            p-3 transition-all duration-200 ease-out
            opacity-100 scale-100 animate-in fade-in-0 zoom-in-95
          `}
          style={{
            animation: 'fadeInScale 0.2s ease-out'
          }}
        >
          {/* Arrow */}
          {showArrow && (
            <div className={getArrowClasses()}></div>
          )}

          {/* Content */}
          <div className="flex items-start gap-2">
            <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {typeof content === 'string' ? (
                <p className="text-sm leading-relaxed">{content}</p>
              ) : (
                content
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add custom CSS for animation */}
      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

// Preset tooltip components for common use cases
export function InfoTooltip({ children, content, ...props }) {
  return (
    <ContextualTooltip type="info" content={content} {...props}>
      {children}
    </ContextualTooltip>
  )
}

export function TipTooltip({ children, content, ...props }) {
  return (
    <ContextualTooltip type="tip" content={content} {...props}>
      {children}
    </ContextualTooltip>
  )
}

export function SuccessTooltip({ children, content, ...props }) {
  return (
    <ContextualTooltip type="success" content={content} {...props}>
      {children}
    </ContextualTooltip>
  )
}

export function MagicTooltip({ children, content, ...props }) {
  return (
    <ContextualTooltip type="magic" content={content} {...props}>
      {children}
    </ContextualTooltip>
  )
}
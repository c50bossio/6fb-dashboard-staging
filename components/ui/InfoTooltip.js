'use client'

import { InformationCircleIcon } from '@heroicons/react/24/outline'
import React, { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * InfoTooltip - Reusable tooltip component for explaining features
 * Provides hover and click interactions with educational content
 */
export function InfoTooltip({ 
  content, 
  title,
  position = 'top',
  size = 'sm',
  trigger = 'hover', // 'hover', 'click', or 'both'
  className = '',
  iconClassName = '',
  maxWidth = 'max-w-xs',
  persistent = false // Keep tooltip open when clicked
}) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClickOpen, setIsClickOpen] = useState(false)

  const showTooltip = () => {
    if (trigger === 'hover' || trigger === 'both') {
      setIsVisible(true)
    }
  }

  const hideTooltip = () => {
    if (!isClickOpen) {
      setIsVisible(false)
    }
  }

  const toggleClick = () => {
    if (trigger === 'click' || trigger === 'both') {
      setIsClickOpen(!isClickOpen)
      setIsVisible(!isClickOpen)
    }
  }

  const handleClickOutside = (e) => {
    if (isClickOpen && !e.currentTarget.contains(e.relatedTarget)) {
      setIsClickOpen(false)
      setIsVisible(false)
    }
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    'top-left': 'bottom-full right-0 mb-2',
    'top-right': 'bottom-full left-0 mb-2',
    'bottom-left': 'top-full right-0 mt-2',
    'bottom-right': 'top-full left-0 mt-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-t-8 border-l-transparent border-r-transparent border-l-8 border-r-8',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800 border-b-8 border-l-transparent border-r-transparent border-l-8 border-r-8',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-800 border-l-8 border-t-transparent border-b-transparent border-t-8 border-b-8',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-800 border-r-8 border-t-transparent border-b-transparent border-t-8 border-b-8',
    'top-left': 'top-full right-4 border-t-gray-800 border-t-8 border-l-transparent border-r-transparent border-l-8 border-r-8',
    'top-right': 'top-full left-4 border-t-gray-800 border-t-8 border-l-transparent border-r-transparent border-l-8 border-r-8',
    'bottom-left': 'bottom-full right-4 border-b-gray-800 border-b-8 border-l-transparent border-r-transparent border-l-8 border-r-8',
    'bottom-right': 'bottom-full left-4 border-b-gray-800 border-b-8 border-l-transparent border-r-transparent border-l-8 border-r-8'
  }

  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-full',
          'text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600',
          'transition-colors duration-150'
        )}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={toggleClick}
        onBlur={handleClickOutside}
        aria-label={title ? `Information about ${title}` : 'More information'}
      >
        <InformationCircleIcon className={cn(sizeClasses[size], iconClassName)} />
      </button>

      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-3 py-2 text-sm text-white bg-gray-800 rounded-lg shadow-lg',
            'transform transition-all duration-200 ease-in-out',
            positionClasses[position],
            maxWidth
          )}
          role="tooltip"
        >
          {/* Arrow */}
          <div className={cn('absolute w-0 h-0', arrowClasses[position])}></div>
          
          {/* Content */}
          <div className="relative">
            {title && (
              <div className="font-medium text-white mb-1 text-xs">
                {title}
              </div>
            )}
            <div className="text-gray-200 text-xs leading-relaxed">
              {typeof content === 'string' ? (
                <p>{content}</p>
              ) : (
                content
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * InfoCard - Expandable info card for more detailed explanations
 */
export function InfoCard({ 
  title, 
  children, 
  icon: Icon,
  defaultExpanded = false,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className={cn('bg-blue-50 border border-blue-200 rounded-lg', className)}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-100 rounded-lg transition-colors"
      >
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-4 w-4 text-blue-600" />}
          <span className="text-sm font-medium text-blue-800">{title}</span>
        </div>
        <InformationCircleIcon 
          className={cn(
            'h-4 w-4 text-blue-600 transition-transform duration-200',
            isExpanded ? 'rotate-180' : ''
          )} 
        />
      </button>
      
      {isExpanded && (
        <div className="px-3 pb-3 text-sm text-blue-700">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * LegendCard - For explaining color-coded systems
 */
export function LegendCard({ title, items, className = '' }) {
  return (
    <div className={cn('bg-gray-50 border border-gray-200 rounded-lg p-3', className)}>
      <h4 className="text-sm font-medium text-gray-900 mb-2">{title}</h4>
      <div className="space-y-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2 text-xs">
            <div 
              className={cn('w-3 h-3 rounded', item.colorClass)}
              style={item.style}
            />
            <span className="text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default InfoTooltip
'use client'

import { 
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react'

/**
 * Optimized CustomizationSection component with React.memo and performance optimizations
 * Prevents unnecessary re-renders and provides smooth animations
 */
const CustomizationSection = memo(function CustomizationSection({ 
  title, 
  description, 
  icon: Icon, 
  isExpanded, 
  onToggle, 
  children, 
  color = 'blue',
  badge,
  hasChanges = false,
  disabled = false,
  className = ''
}) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef(null)
  const animationTimeoutRef = useRef()

  // Memoized color classes to prevent object recreation
  const colorClasses = useMemo(() => ({
    blue: {
      bg: 'bg-blue-50 border-blue-200 text-blue-800',
      accent: 'border-blue-300',
      hover: 'hover:bg-blue-100',
      gradient: 'from-blue-500 to-blue-600'
    },
    purple: {
      bg: 'bg-purple-50 border-purple-200 text-purple-800',
      accent: 'border-purple-300',
      hover: 'hover:bg-purple-100',
      gradient: 'from-purple-500 to-purple-600'
    },
    green: {
      bg: 'bg-green-50 border-green-200 text-green-800',
      accent: 'border-green-300',
      hover: 'hover:bg-green-100',
      gradient: 'from-green-500 to-green-600'
    },
    gold: {
      bg: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      accent: 'border-yellow-300',
      hover: 'hover:bg-yellow-100',
      gradient: 'from-yellow-500 to-yellow-600'
    }
  }), [])

  // Memoized section ID for accessibility
  const sectionId = useMemo(() => 
    `section-${title.toLowerCase().replace(/\s+/g, '-')}`,
    [title]
  )

  // Optimized toggle handler with animation
  const handleToggle = useCallback(() => {
    if (disabled) return

    setIsAnimating(true)
    onToggle()

    // Clear existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }

    // Set animation complete timeout
    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, 300)
  }, [disabled, onToggle])

  // Optimized height calculation for smooth animation
  const updateContentHeight = useCallback(() => {
    if (!contentRef.current) return

    if (isExpanded) {
      // Use scrollHeight for accurate measurement
      const height = contentRef.current.scrollHeight
      setContentHeight(height)
    } else {
      setContentHeight(0)
    }
  }, [isExpanded])

  // Effect for height updates with ResizeObserver for better performance
  useEffect(() => {
    const element = contentRef.current
    if (!element) return

    // Use ResizeObserver for more efficient height tracking
    const resizeObserver = new ResizeObserver((entries) => {
      if (isExpanded && entries[0]) {
        const newHeight = entries[0].contentRect.height
        if (newHeight !== contentHeight) {
          setContentHeight(newHeight)
        }
      }
    })

    // Initial height calculation
    updateContentHeight()

    // Observe content changes
    if (isExpanded) {
      resizeObserver.observe(element)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [isExpanded, children, updateContentHeight, contentHeight])

  // Cleanup animation timeout
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  // Memoized inline styles for content height
  const contentStyles = useMemo(() => ({
    maxHeight: isExpanded ? `${contentHeight}px` : '0px',
    transition: 'max-height 300ms cubic-bezier(0.4, 0, 0.2, 1)'
  }), [isExpanded, contentHeight])

  // Memoized container classes
  const containerClasses = useMemo(() => {
    const baseClasses = 'border rounded-xl overflow-hidden shadow-sm transition-all duration-300'
    const expandedClasses = isExpanded 
      ? `${colorClasses[color].accent} shadow-md` 
      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
    const changeClasses = hasChanges ? 'ring-2 ring-orange-200 ring-opacity-50' : ''
    const disabledClasses = disabled ? 'opacity-60 pointer-events-none' : ''
    
    return `${baseClasses} ${expandedClasses} ${changeClasses} ${disabledClasses} ${className}`
  }, [isExpanded, colorClasses, color, hasChanges, disabled, className])

  // Memoized header button classes
  const buttonClasses = useMemo(() => {
    const baseClasses = 'w-full px-4 sm:px-6 py-4 sm:py-5 bg-white transition-all duration-200 text-left'
    const expandedClasses = isExpanded 
      ? colorClasses[color].hover 
      : 'hover:bg-gray-50'
    const animatingClasses = isAnimating ? 'scale-[0.98]' : 'scale-100'
    const interactionClasses = 'active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
    
    return `${baseClasses} ${expandedClasses} ${animatingClasses} ${interactionClasses}`
  }, [isExpanded, colorClasses, color, isAnimating])

  // Memoized icon container classes
  const iconContainerClasses = useMemo(() => {
    const baseClasses = `relative p-2 sm:p-2.5 rounded-xl transition-all duration-200 ${colorClasses[color].bg}`
    const expandedClasses = isExpanded ? 'scale-110' : ''
    
    return `${baseClasses} ${expandedClasses}`
  }, [colorClasses, color, isExpanded])

  return (
    <div className={containerClasses}>
      {/* Header */}
      <button
        onClick={handleToggle}
        className={buttonClasses}
        aria-expanded={isExpanded}
        aria-controls={sectionId}
        disabled={disabled}
        type="button"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
            <div className={iconContainerClasses}>
              <Icon 
                className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200" 
                aria-hidden="true"
              />
              {hasChanges && (
                <div 
                  className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full border-2 border-white animate-pulse"
                  aria-label="Unsaved changes indicator"
                />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                  {title}
                </h3>
                {badge && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 rounded-full whitespace-nowrap">
                    {badge}
                  </span>
                )}
                {hasChanges && (
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                    <ClockIcon className="w-3 h-3 mr-1" aria-hidden="true" />
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2 sm:line-clamp-1">
                {description}
              </p>
            </div>
          </div>
          
          <div className="flex-shrink-0 ml-2" aria-hidden="true">
            {isExpanded ? (
              <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isAnimating ? 'rotate-180' : ''
              }`} />
            ) : (
              <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isAnimating ? 'rotate-90' : ''
              }`} />
            )}
          </div>
        </div>
      </button>
      
      {/* Content with optimized animation */}
      <div
        ref={contentRef}
        id={sectionId}
        className="overflow-hidden"
        style={contentStyles}
        aria-hidden={!isExpanded}
      >
        <div className="border-t border-gray-200 bg-gradient-to-br from-gray-50 to-white">
          {/* Only render children when expanded or animating */}
          {(isExpanded || isAnimating) && (
            <div className="p-4 sm:p-6">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// Display name for debugging
CustomizationSection.displayName = 'CustomizationSection'

export default CustomizationSection
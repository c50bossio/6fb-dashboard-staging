/**
 * Customer Mobile Optimizations Component
 * 
 * Provides mobile-first responsive components and touch-optimized interactions
 * Ensures excellent UX across all device sizes following iOS/Android patterns
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  EllipsisVerticalIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline'
import { customerDesignTokens } from './CustomerDesignSystem'

/**
 * Mobile-optimized customer card with swipe actions
 */
export function MobileCustomerCard({
  customer,
  onEdit,
  onCall,
  onEmail,
  onDelete,
  onView,
  className = ''
}) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isActionVisible, setIsActionVisible] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const cardRef = useRef(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isDragging = useRef(false)

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX
    startY.current = e.touches[0].clientY
    isDragging.current = true
  }

  const handleTouchMove = (e) => {
    if (!isDragging.current) return

    const currentX = e.touches[0].clientX
    const currentY = e.touches[0].clientY
    const deltaX = currentX - startX.current
    const deltaY = currentY - startY.current

    // Only allow horizontal swipe if it's primarily horizontal movement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      e.preventDefault()
      const newOffset = Math.max(-120, Math.min(0, deltaX))
      setSwipeOffset(newOffset)
      setIsActionVisible(newOffset < -60)
    }
  }

  const handleTouchEnd = () => {
    isDragging.current = false
    
    if (swipeOffset < -60) {
      setSwipeOffset(-120)
      setIsActionVisible(true)
    } else {
      setSwipeOffset(0)
      setIsActionVisible(false)
    }
  }

  const resetSwipe = () => {
    setSwipeOffset(0)
    setIsActionVisible(false)
  }

  const formatPhone = (phone) => {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  return (
    <div className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Swipe actions background */}
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-red-500 flex items-center justify-center">
        <div className="flex space-x-2">
          <button
            onClick={() => {
              onCall?.(customer)
              resetSwipe()
            }}
            className="p-2 bg-green-600 rounded-full text-white"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <PhoneIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              onDelete?.(customer)
              resetSwipe()
            }}
            className="p-2 bg-red-600 rounded-full text-white"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <UserIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main card content */}
      <div
        ref={cardRef}
        className="relative z-10 bg-white transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={isActionVisible ? resetSwipe : undefined}
      >
        <div className="p-4">
          {/* Main info row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-olive-100 to-moss-100 rounded-full flex items-center justify-center">
                  <span className="text-olive-700 font-semibold text-lg">
                    {customer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Customer info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-base font-semibold text-gray-900 truncate">
                    {customer.name}
                  </h3>
                  {customer.segment && (
                    <span className={`
                      inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                      ${customer.segment === 'vip' ? 'bg-gold-100 text-gold-800' :
                        customer.segment === 'new' ? 'bg-green-100 text-green-800' :
                        customer.segment === 'lapsed' ? 'bg-orange-100 text-orange-800' :
                        'bg-olive-100 text-olive-800'}
                    `}>
                      {customer.segment.toUpperCase()}
                    </span>
                  )}
                </div>
                
                {/* Contact info - responsive visibility */}
                <div className="space-y-1">
                  {customer.phone && (
                    <p className="text-sm text-gray-600 flex items-center">
                      <PhoneIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{formatPhone(customer.phone)}</span>
                    </p>
                  )}
                  {customer.email && (
                    <p className="text-sm text-gray-600 flex items-center sm:hidden">
                      <EnvelopeIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Expand/collapse button */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-5 w-5" />
              ) : (
                <ChevronRightIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Quick stats - always visible */}
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
            <span className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              {customer.totalVisits} visits
            </span>
            <span>${customer.totalSpent}</span>
            <span className="text-xs">
              Last: {customer.lastVisit === 'Never' ? 'Never' : new Date(customer.lastVisit).toLocaleDateString()}
            </span>
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="border-t border-gray-100 pt-3 space-y-3 animate-in slide-in-from-top-2">
              {/* Full email on mobile when expanded */}
              {customer.email && (
                <div className="sm:hidden">
                  <p className="text-sm text-gray-600 flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="break-all">{customer.email}</span>
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onCall?.(customer)}
                  className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium transition-colors hover:bg-green-700"
                  style={{ minHeight: '44px' }}
                >
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Call
                </button>
                <button
                  onClick={() => onEmail?.(customer)}
                  className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium transition-colors hover:bg-blue-700"
                  style={{ minHeight: '44px' }}
                >
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  Email
                </button>
              </div>

              {/* Secondary actions */}
              <div className="flex space-x-3">
                <button
                  onClick={() => onView?.(customer)}
                  className="flex-1 px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg font-medium transition-colors hover:bg-gray-200"
                  style={{ minHeight: '44px' }}
                >
                  View Details
                </button>
                <button
                  onClick={() => onEdit?.(customer)}
                  className="flex-1 px-4 py-2 text-sm text-olive-700 bg-olive-100 rounded-lg font-medium transition-colors hover:bg-olive-200"
                  style={{ minHeight: '44px' }}
                >
                  Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Mobile-optimized search component with suggestions
 */
export function MobileSearchBar({
  value,
  onChange,
  onFocus,
  onBlur,
  suggestions = [],
  placeholder = 'Search customers...',
  className = ''
}) {
  const [isFocused, setIsFocused] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const handleFocus = (e) => {
    setIsFocused(true)
    setShowSuggestions(true)
    onFocus?.(e)
  }

  const handleBlur = (e) => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setIsFocused(false)
      setShowSuggestions(false)
      onBlur?.(e)
    }, 150)
  }

  const handleSuggestionSelect = (suggestion) => {
    onChange({ target: { value: suggestion } })
    setShowSuggestions(false)
  }

  return (
    <div className={`relative ${className}`}>
      {/* Search input */}
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`
            w-full pl-4 pr-4 py-3 text-base border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-olive-500 focus:border-olive-500
            transition-all duration-200 ease-out
            ${isFocused ? 'shadow-lg' : 'shadow-sm'}
          `}
          style={{ minHeight: '44px' }}
        />
        
        {/* Search icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Clear button */}
        {value && (
          <button
            onClick={() => onChange({ target: { value: '' } })}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
              style={{ minHeight: '44px' }}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Mobile-optimized filter drawer
 */
export function MobileFilterDrawer({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onClearAll,
  className = ''
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className={`
        fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50
        max-h-[80vh] overflow-y-auto
        animate-in slide-in-from-bottom-full
        ${className}
      `}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <button
            onClick={onClearAll}
            className="text-sm text-olive-600 hover:text-olive-700 font-medium"
          >
            Clear All
          </button>
        </div>

        {/* Filter content */}
        <div className="px-6 py-4 space-y-6">
          {/* Customer segment filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Customer Segment</h4>
            <div className="space-y-2">
              {['all', 'vip', 'regular', 'new', 'lapsed'].map(segment => (
                <label key={segment} className="flex items-center space-x-3 py-2">
                  <input
                    type="radio"
                    name="segment"
                    value={segment}
                    checked={filters.segment === segment}
                    onChange={(e) => onFilterChange('segment', e.target.value)}
                    className="h-4 w-4 text-olive-600 border-gray-300 focus:ring-olive-500"
                  />
                  <span className="text-sm text-gray-700 capitalize">
                    {segment === 'all' ? 'All Segments' : segment}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Visit frequency filter */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Visit Frequency</h4>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All Customers' },
                { value: 'frequent', label: 'Frequent (5+ visits)' },
                { value: 'occasional', label: 'Occasional (2-4 visits)' },
                { value: 'new', label: 'New (1 visit)' }
              ].map(option => (
                <label key={option.value} className="flex items-center space-x-3 py-2">
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={filters.frequency === option.value}
                    onChange={(e) => onFilterChange('frequency', e.target.value)}
                    className="h-4 w-4 text-olive-600 border-gray-300 focus:ring-olive-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Apply button */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-olive-600 text-white py-3 rounded-lg font-semibold hover:bg-olive-700 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Apply Filters
          </button>
        </div>
      </div>
    </>
  )
}

/**
 * Mobile-optimized stats grid
 */
export function MobileStatsGrid({ stats, className = '' }) {
  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${stat.bgColor || 'bg-olive-100'}`}>
              <stat.icon className={`h-5 w-5 ${stat.iconColor || 'text-olive-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-gray-900 truncate">
                {stat.value}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {stat.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Mobile-optimized action sheet
 */
export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions = [],
  destructiveIndex = -1,
  className = ''
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 animate-in fade-in-0"
        onClick={onClose}
      />

      {/* Action sheet */}
      <div className={`
        fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50
        animate-in slide-in-from-bottom-full
        ${className}
      `}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Title */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              {title}
            </h3>
          </div>
        )}

        {/* Actions */}
        <div className="pb-safe">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onPress?.()
                onClose()
              }}
              disabled={action.disabled}
              className={`
                w-full px-6 py-4 text-left border-b border-gray-100 last:border-b-0
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                ${index === destructiveIndex 
                  ? 'text-red-600 hover:bg-red-50' 
                  : 'text-gray-900 hover:bg-gray-50'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              <div className="flex items-center space-x-3">
                {action.icon && (
                  <action.icon className={`h-5 w-5 ${
                    index === destructiveIndex ? 'text-red-500' : 'text-gray-500'
                  }`} />
                )}
                <span className="font-medium">{action.title}</span>
              </div>
            </button>
          ))}
          
          {/* Cancel button */}
          <button
            onClick={onClose}
            className="w-full px-6 py-4 text-center font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
            style={{ minHeight: '44px' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  )
}

export default {
  MobileCustomerCard,
  MobileSearchBar,
  MobileFilterDrawer,
  MobileStatsGrid,
  MobileActionSheet
}
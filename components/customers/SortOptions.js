'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  ChevronDownIcon,
  ChevronUpIcon,
  Bars3BottomLeftIcon,
  Bars3BottomRightIcon,
  TagIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  StarIcon,
  ClockIcon,
  AdjustmentsVerticalIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui'

/**
 * SortOptions Component
 * 
 * Provides comprehensive sorting capabilities for customer lists
 * with visual indicators and smooth transitions.
 * 
 * Features:
 * - Multiple sort criteria
 * - Ascending/descending toggle
 * - Visual sort indicators
 * - Dropdown and inline variants
 * - Keyboard navigation
 * - Sort direction persistence
 * - Custom sort functions
 */

// Sort configuration with metadata
export const SORT_CONFIGURATIONS = {
  name: {
    key: 'name',
    label: 'Name',
    icon: TagIcon,
    field: 'name',
    type: 'string',
    defaultDirection: 'asc',
    description: 'Sort alphabetically by customer name'
  },
  email: {
    key: 'email',
    label: 'Email',
    icon: TagIcon,
    field: 'email',
    type: 'string',
    defaultDirection: 'asc',
    description: 'Sort alphabetically by email address'
  },
  last_visit: {
    key: 'last_visit',
    label: 'Last Visit',
    icon: CalendarDaysIcon,
    field: 'last_visit',
    type: 'date',
    defaultDirection: 'desc',
    description: 'Sort by most recent visit date'
  },
  created_at: {
    key: 'created_at',
    label: 'Customer Since',
    icon: ClockIcon,
    field: 'created_at',
    type: 'date',
    defaultDirection: 'desc',
    description: 'Sort by when customer first registered'
  },
  total_spent: {
    key: 'total_spent',
    label: 'Total Spent',
    icon: CurrencyDollarIcon,
    field: 'total_spent',
    type: 'number',
    defaultDirection: 'desc',
    description: 'Sort by total amount spent'
  },
  visit_count: {
    key: 'visit_count',
    label: 'Visit Count',
    icon: UserGroupIcon,
    field: 'visit_count',
    type: 'number',
    defaultDirection: 'desc',
    description: 'Sort by number of visits'
  },
  health_score: {
    key: 'health_score',
    label: 'Health Score',
    icon: StarIcon,
    field: 'health_score',
    type: 'number',
    defaultDirection: 'desc',
    description: 'Sort by customer health score'
  },
  loyalty_tier: {
    key: 'loyalty_tier',
    label: 'Loyalty Tier',
    icon: StarIcon,
    field: 'loyalty_tier',
    type: 'tier',
    defaultDirection: 'desc',
    description: 'Sort by loyalty tier level'
  },
  days_since_last_visit: {
    key: 'days_since_last_visit',
    label: 'Days Since Visit',
    icon: ClockIcon,
    field: 'days_since_last_visit',
    type: 'number',
    defaultDirection: 'asc',
    description: 'Sort by days since last visit'
  },
  churn_risk: {
    key: 'churn_risk',
    label: 'Churn Risk',
    icon: StarIcon,
    field: 'churn_risk',
    type: 'risk',
    defaultDirection: 'desc',
    description: 'Sort by churn risk level'
  }
}

// Tier and risk level orders for sorting
const TIER_ORDER = { bronze: 1, silver: 2, gold: 3, platinum: 4 }
const RISK_ORDER = { low: 1, medium: 2, high: 3, critical: 4 }

/**
 * Sort function that handles different data types intelligently
 */
export function sortCustomers(customers, sortKey, direction = 'asc') {
  const config = SORT_CONFIGURATIONS[sortKey]
  if (!config) return customers

  return [...customers].sort((a, b) => {
    let aVal = a[config.field]
    let bVal = b[config.field]

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0
    if (aVal == null) return direction === 'asc' ? 1 : -1
    if (bVal == null) return direction === 'asc' ? -1 : 1

    // Type-specific sorting
    switch (config.type) {
      case 'string':
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
        break
        
      case 'date':
        aVal = new Date(aVal)
        bVal = new Date(bVal)
        break
        
      case 'number':
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
        break
        
      case 'tier':
        aVal = TIER_ORDER[aVal] || 0
        bVal = TIER_ORDER[bVal] || 0
        break
        
      case 'risk':
        aVal = RISK_ORDER[aVal] || 0
        bVal = RISK_ORDER[bVal] || 0
        break
        
      default:
        aVal = String(aVal).toLowerCase()
        bVal = String(bVal).toLowerCase()
    }

    // Compare values
    let result
    if (aVal < bVal) result = -1
    else if (aVal > bVal) result = 1
    else result = 0

    return direction === 'desc' ? -result : result
  })
}

/**
 * Dropdown Sort Component
 */
export default function SortOptions({
  currentSort = 'last_visit',
  currentDirection = 'desc',
  onSortChange,
  availableSorts = Object.keys(SORT_CONFIGURATIONS),
  showDirection = true,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentConfig = SORT_CONFIGURATIONS[currentSort]

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSortSelect = (sortKey) => {
    const config = SORT_CONFIGURATIONS[sortKey]
    const newDirection = sortKey === currentSort 
      ? (currentDirection === 'asc' ? 'desc' : 'asc')
      : config.defaultDirection
    
    onSortChange(sortKey, newDirection)
    setIsOpen(false)
  }

  const toggleDirection = () => {
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc'
    onSortChange(currentSort, newDirection)
  }

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Sort Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          inline-flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 
          rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 
          focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500
          transition-all duration-200
        "
        aria-label="Sort options"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <AdjustmentsVerticalIcon className="h-4 w-4" />
        
        <span className="flex items-center space-x-1">
          {currentConfig && (
            <>
              <currentConfig.icon className="h-4 w-4" />
              <span>{currentConfig.label}</span>
            </>
          )}
        </span>

        {showDirection && (
          <div className="flex items-center space-x-1">
            {currentDirection === 'asc' ? (
              <Bars3BottomLeftIcon className="h-4 w-4" />
            ) : (
              <Bars3BottomRightIcon className="h-4 w-4" />
            )}
          </div>
        )}

        <ChevronDownIcon 
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="
            absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg
            animate-in fade-in-0 slide-in-from-top-2 duration-200
          "
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            {availableSorts.map(sortKey => {
              const config = SORT_CONFIGURATIONS[sortKey]
              if (!config) return null

              const Icon = config.icon
              const isActive = sortKey === currentSort

              return (
                <button
                  key={sortKey}
                  onClick={() => handleSortSelect(sortKey)}
                  className={`
                    w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50
                    transition-colors duration-150 ${isActive ? 'bg-olive-50 text-olive-700' : 'text-gray-700'}
                  `}
                  role="menuitem"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{config.label}</span>
                      {isActive && (
                        <div className="flex items-center space-x-1 text-xs">
                          {currentDirection === 'asc' ? (
                            <ChevronUpIcon className="h-3 w-3" />
                          ) : (
                            <ChevronDownIcon className="h-3 w-3" />
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {config.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Direction Toggle */}
          {showDirection && currentConfig && (
            <>
              <div className="border-t border-gray-200"></div>
              <div className="py-1">
                <button
                  onClick={toggleDirection}
                  className="
                    w-full px-4 py-2 text-left flex items-center space-x-3 hover:bg-gray-50
                    text-gray-700 transition-colors duration-150
                  "
                >
                  {currentDirection === 'asc' ? (
                    <Bars3BottomLeftIcon className="h-4 w-4" />
                  ) : (
                    <Bars3BottomRightIcon className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {currentDirection === 'asc' ? 'Ascending' : 'Descending'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Inline Sort Component (simpler version)
 */
export function InlineSortOptions({
  currentSort = 'last_visit',
  currentDirection = 'desc',
  onSortChange,
  availableSorts = ['name', 'last_visit', 'total_spent', 'visit_count'],
  className = ''
}) {
  const handleSortClick = (sortKey) => {
    const config = SORT_CONFIGURATIONS[sortKey]
    const newDirection = sortKey === currentSort 
      ? (currentDirection === 'asc' ? 'desc' : 'asc')
      : config.defaultDirection
    
    onSortChange(sortKey, newDirection)
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-sm text-gray-600 font-medium">Sort by:</span>
      
      {availableSorts.map(sortKey => {
        const config = SORT_CONFIGURATIONS[sortKey]
        if (!config) return null

        const Icon = config.icon
        const isActive = sortKey === currentSort

        return (
          <button
            key={sortKey}
            onClick={() => handleSortClick(sortKey)}
            className={`
              inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-all duration-200 hover:bg-gray-100
              ${isActive 
                ? 'bg-olive-100 text-olive-800 ring-1 ring-olive-300' 
                : 'text-gray-600 hover:text-gray-800'
              }
            `}
            title={config.description}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{config.label}</span>
            {isActive && (
              currentDirection === 'asc' ? (
                <ChevronUpIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              )
            )}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Quick Sort Toggle Buttons
 */
export function QuickSortButtons({
  currentSort = 'last_visit',
  currentDirection = 'desc',
  onSortChange,
  className = ''
}) {
  const quickSorts = ['name', 'last_visit', 'total_spent', 'health_score']

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {quickSorts.map(sortKey => {
        const config = SORT_CONFIGURATIONS[sortKey]
        if (!config) return null

        const Icon = config.icon
        const isActive = sortKey === currentSort

        return (
          <Button
            key={sortKey}
            variant={isActive ? 'primary' : 'ghost'}
            size="small"
            onClick={() => onSortChange(sortKey, config.defaultDirection)}
            icon={Icon}
            className="transition-all duration-200"
            title={`Sort by ${config.label}`}
          >
            {isActive && (
              currentDirection === 'asc' ? (
                <ChevronUpIcon className="h-3 w-3 ml-1" />
              ) : (
                <ChevronDownIcon className="h-3 w-3 ml-1" />
              )
            )}
          </Button>
        )
      })}
    </div>
  )
}

/**
 * Sort indicator for table headers
 */
export function SortIndicator({ 
  field, 
  currentSort, 
  currentDirection, 
  onClick,
  children,
  className = '' 
}) {
  const isActive = field === currentSort
  const isAscending = currentDirection === 'asc'

  return (
    <button
      onClick={() => onClick?.(field)}
      className={`
        flex items-center space-x-1 font-medium transition-colors duration-200
        ${isActive ? 'text-olive-700' : 'text-gray-600 hover:text-gray-800'}
        ${className}
      `}
    >
      <span>{children}</span>
      <div className="flex flex-col">
        <ChevronUpIcon 
          className={`h-3 w-3 ${isActive && isAscending ? 'text-olive-600' : 'text-gray-300'}`}
        />
        <ChevronDownIcon 
          className={`h-3 w-3 -mt-1 ${isActive && !isAscending ? 'text-olive-600' : 'text-gray-300'}`}
        />
      </div>
    </button>
  )
}
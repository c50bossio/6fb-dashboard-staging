'use client'

import React from 'react'
import { 
  XMarkIcon,
  MagnifyingGlassIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  StarIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  TagIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

/**
 * FilterTags Component
 * 
 * Displays active search and filter criteria as removable tags
 * with smooth animations and intuitive UX.
 * 
 * Features:
 * - Visual representation of active filters
 * - Easy removal with click or keyboard
 * - Animated transitions
 * - Accessible keyboard navigation
 * - Smart truncation for long values
 * - Color-coded by filter type
 * - Batch operations (clear all)
 */

// Icon mapping for different filter types
const FILTER_ICONS = {
  search: MagnifyingGlassIcon,
  spending: CurrencyDollarIcon,
  visitCount: UserGroupIcon,
  visitFrequency: UserGroupIcon,
  daysSinceLastVisit: ClockIcon,
  daysSinceFirstVisit: CalendarDaysIcon,
  healthScore: StarIcon,
  loyaltyTier: StarIcon,
  churnRisk: ExclamationTriangleIcon,
  dateRange: CalendarDaysIcon,
  tags: TagIcon,
  preset: AdjustmentsHorizontalIcon
}

// Color schemes for different filter types
const FILTER_COLORS = {
  search: 'bg-blue-100 text-blue-800 border-blue-200',
  spending: 'bg-green-100 text-green-800 border-green-200',
  visitCount: 'bg-purple-100 text-purple-800 border-purple-200',
  visitFrequency: 'bg-purple-100 text-purple-800 border-purple-200',
  daysSinceLastVisit: 'bg-orange-100 text-orange-800 border-orange-200',
  daysSinceFirstVisit: 'bg-orange-100 text-orange-800 border-orange-200',
  healthScore: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  loyaltyTier: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  churnRisk: 'bg-red-100 text-red-800 border-red-200',
  dateRange: 'bg-gray-100 text-gray-800 border-gray-200',
  tags: 'bg-pink-100 text-pink-800 border-pink-200',
  preset: 'bg-olive-100 text-olive-800 border-olive-200'
}

// Format filter values for display
const formatFilterValue = (key, value) => {
  switch (key) {
    case 'spending':
      if (typeof value === 'object') {
        const { min, max } = value
        if (min && max) return `$${min} - $${max}`
        if (min) return `≥ $${min}`
        if (max) return `≤ $${max}`
      }
      return String(value)
    
    case 'visitCount':
      if (typeof value === 'object') {
        const { min, max } = value
        if (min && max) return `${min} - ${max} visits`
        if (min) return `≥ ${min} visits`
        if (max) return `≤ ${max} visits`
      }
      return `${value} visits`
    
    case 'healthScore':
      if (typeof value === 'object') {
        const { min, max } = value
        if (min && max) return `${min} - ${max}%`
        if (min) return `≥ ${min}%`
        if (max) return `≤ ${max}%`
      }
      return `${value}%`
    
    case 'daysSinceLastVisit':
    case 'daysSinceFirstVisit':
      if (typeof value === 'object') {
        const { min, max } = value
        const label = key === 'daysSinceLastVisit' ? 'days ago' : 'days since first'
        if (min && max) return `${min} - ${max} ${label}`
        if (min) return `≥ ${min} ${label}`
        if (max) return `≤ ${max} ${label}`
      }
      return `${value} days`
    
    case 'visitFrequency':
      return value.charAt(0).toUpperCase() + value.slice(1)
    
    case 'loyaltyTier':
      if (Array.isArray(value)) {
        return value.map(tier => tier.charAt(0).toUpperCase() + tier.slice(1)).join(', ')
      }
      return value.charAt(0).toUpperCase() + value.slice(1)
    
    case 'churnRisk':
      if (Array.isArray(value)) {
        return value.map(risk => risk.charAt(0).toUpperCase() + risk.slice(1)).join(', ')
      }
      return value.charAt(0).toUpperCase() + value.slice(1)
    
    case 'dateRange':
      if (typeof value === 'object') {
        const { start, end } = value
        if (start && end) {
          return `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`
        }
        if (start) return `After ${new Date(start).toLocaleDateString()}`
        if (end) return `Before ${new Date(end).toLocaleDateString()}`
      }
      return String(value)
    
    default:
      if (Array.isArray(value)) {
        return value.join(', ')
      }
      return String(value)
  }
}

// Get human-readable filter names
const getFilterLabel = (key) => {
  const labels = {
    spending: 'Spending',
    visitCount: 'Visits',
    visitFrequency: 'Frequency',
    daysSinceLastVisit: 'Last Visit',
    daysSinceFirstVisit: 'Customer Since',
    healthScore: 'Health Score',
    loyaltyTier: 'Loyalty Tier',
    churnRisk: 'Churn Risk',
    dateRange: 'Date Range',
    tags: 'Tags'
  }
  
  return labels[key] || key.charAt(0).toUpperCase() + key.slice(1)
}

// Individual filter tag component
const FilterTag = ({ 
  type, 
  label, 
  value, 
  onRemove, 
  className = '',
  maxLength = 30 
}) => {
  const Icon = FILTER_ICONS[type] || TagIcon
  const colorClass = FILTER_COLORS[type] || FILTER_COLORS.tags
  
  const displayValue = formatFilterValue(type, value)
  const truncatedValue = displayValue.length > maxLength 
    ? `${displayValue.substring(0, maxLength)}...`
    : displayValue

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onRemove()
    }
  }

  return (
    <div
      className={`
        inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium 
        border transition-all duration-200 hover:shadow-sm focus-within:ring-2 
        focus-within:ring-olive-500 focus-within:ring-offset-1 group
        ${colorClass} ${className}
      `}
      role="group"
      aria-label={`Filter: ${label} ${displayValue}`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      
      <span className="flex items-center space-x-1">
        <span className="font-medium">{label}:</span>
        <span 
          title={displayValue !== truncatedValue ? displayValue : undefined}
          className="truncate"
        >
          {truncatedValue}
        </span>
      </span>
      
      <button
        onClick={onRemove}
        onKeyDown={handleKeyDown}
        className="
          flex-shrink-0 ml-1 p-0.5 rounded-full hover:bg-black hover:bg-opacity-10 
          focus:outline-none focus:bg-black focus:bg-opacity-10 transition-colors
          group-hover:bg-black group-hover:bg-opacity-5
        "
        aria-label={`Remove ${label} filter`}
        tabIndex={0}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// Search tag component (special styling)
const SearchTag = ({ query, onRemove, className = '' }) => {
  const truncatedQuery = query.length > 40 ? `${query.substring(0, 40)}...` : query

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onRemove()
    }
  }

  return (
    <div
      className={`
        inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium 
        border transition-all duration-200 hover:shadow-sm focus-within:ring-2 
        focus-within:ring-blue-500 focus-within:ring-offset-1 group
        ${FILTER_COLORS.search} ${className}
      `}
      role="group"
      aria-label={`Search query: ${query}`}
    >
      <MagnifyingGlassIcon className="h-3.5 w-3.5 flex-shrink-0" />
      
      <span className="flex items-center space-x-1">
        <span className="font-medium">Search:</span>
        <span 
          title={query !== truncatedQuery ? query : undefined}
          className="truncate font-mono"
        >
          "{truncatedQuery}"
        </span>
      </span>
      
      <button
        onClick={onRemove}
        onKeyDown={handleKeyDown}
        className="
          flex-shrink-0 ml-1 p-0.5 rounded-full hover:bg-blue-200 
          focus:outline-none focus:bg-blue-200 transition-colors
          group-hover:bg-blue-100
        "
        aria-label="Clear search"
        tabIndex={0}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// Preset tag component (special styling)
const PresetTag = ({ presetName, onRemove, className = '' }) => {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onRemove()
    }
  }

  return (
    <div
      className={`
        inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium 
        border transition-all duration-200 hover:shadow-sm focus-within:ring-2 
        focus-within:ring-olive-500 focus-within:ring-offset-1 group
        ${FILTER_COLORS.preset} ${className}
      `}
      role="group"
      aria-label={`Active preset: ${presetName}`}
    >
      <AdjustmentsHorizontalIcon className="h-3.5 w-3.5 flex-shrink-0" />
      
      <span className="flex items-center space-x-1">
        <span className="font-medium">Preset:</span>
        <span className="truncate">
          {presetName}
        </span>
      </span>
      
      <button
        onClick={onRemove}
        onKeyDown={handleKeyDown}
        className="
          flex-shrink-0 ml-1 p-0.5 rounded-full hover:bg-olive-200 
          focus:outline-none focus:bg-olive-200 transition-colors
          group-hover:bg-olive-100
        "
        aria-label={`Remove ${presetName} preset`}
        tabIndex={0}
      >
        <XMarkIcon className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// Main FilterTags component
export default function FilterTags({
  searchQuery = '',
  activeFilters = {},
  activePreset = null,
  presetName = '',
  onRemoveSearch,
  onRemoveFilter,
  onRemovePreset,
  onClearAll,
  className = '',
  maxTags = 10,
  showCount = true
}) {
  const hasSearch = Boolean(searchQuery)
  const hasFilters = Object.keys(activeFilters).length > 0
  const hasPreset = Boolean(activePreset && presetName)
  const hasAnyFilters = hasSearch || hasFilters || hasPreset

  if (!hasAnyFilters) {
    return null
  }

  // Calculate total number of active filters
  const totalFilters = (hasSearch ? 1 : 0) + Object.keys(activeFilters).length + (hasPreset ? 1 : 0)
  const filterEntries = Object.entries(activeFilters).slice(0, maxTags)
  const hasMoreFilters = Object.keys(activeFilters).length > maxTags

  return (
    <div 
      className={`flex flex-wrap items-center gap-2 animate-in fade-in-0 duration-300 ${className}`}
      role="region"
      aria-label="Active search and filter criteria"
    >
      {/* Label */}
      <span className="text-sm text-gray-600 font-medium flex-shrink-0">
        Active filters:
        {showCount && (
          <span className="ml-1 px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
            {totalFilters}
          </span>
        )}
      </span>

      {/* Search query tag */}
      {hasSearch && (
        <SearchTag 
          query={searchQuery}
          onRemove={onRemoveSearch}
          className="animate-in slide-in-from-left-2 duration-200"
        />
      )}

      {/* Preset tag */}
      {hasPreset && (
        <PresetTag 
          presetName={presetName}
          onRemove={onRemovePreset}
          className="animate-in slide-in-from-left-2 duration-200"
        />
      )}

      {/* Filter tags */}
      {filterEntries.map(([key, value], index) => (
        <FilterTag
          key={key}
          type={key}
          label={getFilterLabel(key)}
          value={value}
          onRemove={() => onRemoveFilter(key)}
          className={`animate-in slide-in-from-left-2 duration-200`}
          style={{ animationDelay: `${index * 50}ms` }}
        />
      ))}

      {/* More filters indicator */}
      {hasMoreFilters && (
        <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
          +{Object.keys(activeFilters).length - maxTags} more
        </div>
      )}

      {/* Clear all button */}
      {hasAnyFilters && (
        <button
          onClick={onClearAll}
          className="
            inline-flex items-center space-x-1 px-3 py-1.5 text-sm font-medium
            text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full
            transition-colors duration-200 focus:outline-none focus:ring-2 
            focus:ring-gray-500 focus:ring-offset-1
            animate-in slide-in-from-right-2 duration-200
          "
          aria-label="Clear all filters and search"
        >
          <XMarkIcon className="h-3.5 w-3.5" />
          <span>Clear All</span>
        </button>
      )}
    </div>
  )
}

/**
 * Compact version of FilterTags for smaller spaces
 */
export function CompactFilterTags({
  searchQuery = '',
  activeFilters = {},
  activePreset = null,
  onClearAll,
  className = ''
}) {
  const hasSearch = Boolean(searchQuery)
  const hasFilters = Object.keys(activeFilters).length > 0
  const hasPreset = Boolean(activePreset)
  const totalFilters = (hasSearch ? 1 : 0) + Object.keys(activeFilters).length + (hasPreset ? 1 : 0)

  if (totalFilters === 0) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
        <AdjustmentsHorizontalIcon className="h-4 w-4" />
        <span className="font-medium">{totalFilters} filter{totalFilters !== 1 ? 's' : ''}</span>
      </div>
      
      <button
        onClick={onClearAll}
        className="text-gray-500 hover:text-gray-700 transition-colors"
        aria-label="Clear all filters"
      >
        <XMarkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * Filter summary component showing key metrics
 */
export function FilterSummary({
  totalCustomers = 0,
  filteredCustomers = 0,
  searchQuery = '',
  activeFilters = {},
  className = ''
}) {
  const filterCount = Object.keys(activeFilters).length + (searchQuery ? 1 : 0)
  const filterPercentage = totalCustomers > 0 ? ((filteredCustomers / totalCustomers) * 100).toFixed(1) : 0

  return (
    <div className={`flex items-center space-x-4 text-sm text-gray-600 ${className}`}>
      <div className="flex items-center space-x-1">
        <UserGroupIcon className="h-4 w-4" />
        <span>
          <span className="font-semibold text-gray-900">{filteredCustomers.toLocaleString()}</span>
          {' of '}
          <span className="font-medium">{totalCustomers.toLocaleString()}</span>
          {' customers'}
        </span>
      </div>
      
      {filterCount > 0 && (
        <>
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center space-x-1">
            <AdjustmentsHorizontalIcon className="h-4 w-4" />
            <span>{filterCount} filter{filterCount !== 1 ? 's' : ''} applied</span>
          </div>
          
          <div className="w-px h-4 bg-gray-300" />
          <div className="flex items-center space-x-1">
            <span className="text-gray-500">({filterPercentage}% shown)</span>
          </div>
        </>
      )}
    </div>
  )
}
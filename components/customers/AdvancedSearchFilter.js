'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  ChevronDownIcon,
  BookmarkIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  StarIcon,
  TagIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Button, Input } from '../ui'
import SearchHighlight from './SearchHighlight'

// Utility function for fuzzy search with typo tolerance
const fuzzyMatch = (text, pattern) => {
  if (!text || !pattern) return { score: 0, matches: [] }
  
  const textLower = text.toLowerCase()
  const patternLower = pattern.toLowerCase()
  
  // Exact match gets highest score
  if (textLower.includes(patternLower)) {
    const startIndex = textLower.indexOf(patternLower)
    return {
      score: 100,
      matches: [{ start: startIndex, end: startIndex + pattern.length }]
    }
  }
  
  // Fuzzy matching with typo tolerance
  let score = 0
  let matches = []
  let patternIndex = 0
  let textIndex = 0
  
  while (patternIndex < pattern.length && textIndex < text.length) {
    if (textLower[textIndex] === patternLower[patternIndex]) {
      matches.push({ start: textIndex, end: textIndex + 1 })
      score += 10
      patternIndex++
    }
    textIndex++
  }
  
  // Bonus for completing the pattern
  if (patternIndex === pattern.length) {
    score += 50
  }
  
  // Penalty for length difference
  score -= Math.abs(text.length - pattern.length) * 2
  
  return { score: Math.max(0, score), matches }
}

// Predefined filter presets
const FILTER_PRESETS = {
  'high-value': {
    name: 'High-Value Customers',
    icon: CurrencyDollarIcon,
    filters: {
      spending: { min: 500, max: null },
      visitFrequency: 'high',
      loyaltyTier: ['gold', 'platinum']
    },
    color: 'text-yellow-600 bg-yellow-50'
  },
  'at-risk': {
    name: 'At-Risk Customers',
    icon: ClockIcon,
    filters: {
      daysSinceLastVisit: { min: 60, max: null },
      churnRisk: ['medium', 'high', 'critical']
    },
    color: 'text-red-600 bg-red-50'
  },
  'new-customers': {
    name: 'New Customers',
    icon: SparklesIcon,
    filters: {
      daysSinceFirstVisit: { min: 0, max: 30 },
      visitCount: { min: 1, max: 3 }
    },
    color: 'text-green-600 bg-green-50'
  },
  'vip-customers': {
    name: 'VIP Customers',
    icon: StarIcon,
    filters: {
      loyaltyTier: ['platinum'],
      healthScore: { min: 90, max: 100 }
    },
    color: 'text-purple-600 bg-purple-50'
  },
  'frequent-visitors': {
    name: 'Frequent Visitors',
    icon: UserGroupIcon,
    filters: {
      visitFrequency: 'high',
      visitCount: { min: 10, max: null }
    },
    color: 'text-blue-600 bg-blue-50'
  }
}

// Sort options configuration
const SORT_OPTIONS = [
  { key: 'name', label: 'Name (A-Z)', icon: TagIcon },
  { key: 'name_desc', label: 'Name (Z-A)', icon: TagIcon },
  { key: 'last_visit', label: 'Last Visit (Recent)', icon: CalendarDaysIcon },
  { key: 'last_visit_desc', label: 'Last Visit (Oldest)', icon: CalendarDaysIcon },
  { key: 'total_spent', label: 'Total Spent (High-Low)', icon: CurrencyDollarIcon },
  { key: 'total_spent_desc', label: 'Total Spent (Low-High)', icon: CurrencyDollarIcon },
  { key: 'visit_count', label: 'Visit Count (High-Low)', icon: UserGroupIcon },
  { key: 'visit_count_desc', label: 'Visit Count (Low-High)', icon: UserGroupIcon },
  { key: 'health_score', label: 'Health Score (High-Low)', icon: StarIcon },
  { key: 'health_score_desc', label: 'Health Score (Low-High)', icon: StarIcon },
  { key: 'created_at', label: 'Customer Since (Recent)', icon: ClockIcon },
  { key: 'created_at_desc', label: 'Customer Since (Oldest)', icon: ClockIcon }
]

export default function AdvancedSearchFilter({ 
  customers = [],
  onFilteredResults,
  onExportCSV,
  className = ''
}) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFields, setSearchFields] = useState(['name', 'email', 'phone'])
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  
  // Filter state
  const [activeFilters, setActiveFilters] = useState({})
  const [showFilters, setShowFilters] = useState(false)
  const [sortOption, setSortOption] = useState('last_visit')
  
  // Preset state
  const [activePreset, setActivePreset] = useState(null)
  const [savedPresets, setSavedPresets] = useState({})
  
  // UI state
  const [isExporting, setIsExporting] = useState(false)
  const searchInputRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Generate search suggestions based on current input
  const generateSuggestions = useCallback((query) => {
    if (!query || query.length < 2) return []
    
    const suggestions = new Set()
    
    customers.forEach(customer => {
      // Name suggestions
      if (customer.name?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(customer.name)
      }
      
      // Email suggestions
      if (customer.email?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(customer.email)
      }
      
      // Phone suggestions
      if (customer.phone?.includes(query)) {
        suggestions.add(customer.phone)
      }
      
      // Service suggestions
      if (customer.preferred_services) {
        customer.preferred_services.forEach(service => {
          if (service.toLowerCase().includes(query.toLowerCase())) {
            suggestions.add(service)
          }
        })
      }
      
      // Location suggestions
      if (customer.location?.toLowerCase().includes(query.toLowerCase())) {
        suggestions.add(customer.location)
      }
    })
    
    return Array.from(suggestions).slice(0, 8)
  }, [customers])

  // Debounced search with suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        const newSuggestions = generateSuggestions(searchQuery)
        setSuggestions(newSuggestions)
      } else {
        setSuggestions([])
      }
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchQuery, generateSuggestions])

  // Apply fuzzy search across multiple fields
  const searchCustomers = useCallback((customers, query, fields) => {
    if (!query) return customers
    
    return customers
      .map(customer => {
        let bestScore = 0
        let searchMatches = {}
        
        fields.forEach(field => {
          const fieldValue = customer[field]
          if (fieldValue) {
            const result = fuzzyMatch(String(fieldValue), query)
            if (result.score > bestScore) {
              bestScore = result.score
            }
            if (result.score > 0) {
              searchMatches[field] = result.matches
            }
          }
        })
        
        return {
          ...customer,
          _searchScore: bestScore,
          _searchMatches: searchMatches
        }
      })
      .filter(customer => customer._searchScore > 20)
      .sort((a, b) => b._searchScore - a._searchScore)
  }, [])

  // Apply advanced filters
  const applyFilters = useCallback((customers, filters) => {
    return customers.filter(customer => {
      // Spending range filter
      if (filters.spending) {
        const totalSpent = customer.total_spent || 0
        if (filters.spending.min && totalSpent < filters.spending.min) return false
        if (filters.spending.max && totalSpent > filters.spending.max) return false
      }
      
      // Visit frequency filter
      if (filters.visitFrequency) {
        const frequency = customer.visit_frequency || 'low'
        if (Array.isArray(filters.visitFrequency)) {
          if (!filters.visitFrequency.includes(frequency)) return false
        } else {
          if (frequency !== filters.visitFrequency) return false
        }
      }
      
      // Days since last visit filter
      if (filters.daysSinceLastVisit) {
        const daysSince = customer.days_since_last_visit || 0
        if (filters.daysSinceLastVisit.min && daysSince < filters.daysSinceLastVisit.min) return false
        if (filters.daysSinceLastVisit.max && daysSince > filters.daysSinceLastVisit.max) return false
      }
      
      // Days since first visit filter
      if (filters.daysSinceFirstVisit) {
        const daysSince = customer.days_since_first_visit || 0
        if (filters.daysSinceFirstVisit.min && daysSince < filters.daysSinceFirstVisit.min) return false
        if (filters.daysSinceFirstVisit.max && daysSince > filters.daysSinceFirstVisit.max) return false
      }
      
      // Visit count filter
      if (filters.visitCount) {
        const visits = customer.visit_count || 0
        if (filters.visitCount.min && visits < filters.visitCount.min) return false
        if (filters.visitCount.max && visits > filters.visitCount.max) return false
      }
      
      // Health score filter
      if (filters.healthScore) {
        const score = customer.health_score || 0
        if (filters.healthScore.min && score < filters.healthScore.min) return false
        if (filters.healthScore.max && score > filters.healthScore.max) return false
      }
      
      // Loyalty tier filter
      if (filters.loyaltyTier) {
        const tier = customer.loyalty_tier || 'bronze'
        if (Array.isArray(filters.loyaltyTier)) {
          if (!filters.loyaltyTier.includes(tier)) return false
        } else {
          if (tier !== filters.loyaltyTier) return false
        }
      }
      
      // Churn risk filter
      if (filters.churnRisk) {
        const risk = customer.churn_risk || 'low'
        if (Array.isArray(filters.churnRisk)) {
          if (!filters.churnRisk.includes(risk)) return false
        } else {
          if (risk !== filters.churnRisk) return false
        }
      }
      
      // Date range filters
      if (filters.dateRange) {
        const customerDate = new Date(customer.created_at)
        if (filters.dateRange.start && customerDate < new Date(filters.dateRange.start)) return false
        if (filters.dateRange.end && customerDate > new Date(filters.dateRange.end)) return false
      }
      
      return true
    })
  }, [])

  // Apply sorting
  const applySorting = useCallback((customers, sortKey) => {
    const [field, direction] = sortKey.includes('_desc') 
      ? [sortKey.replace('_desc', ''), 'desc']
      : [sortKey, 'asc']
    
    return [...customers].sort((a, b) => {
      let aVal = a[field]
      let bVal = b[field]
      
      // Handle different data types
      if (field === 'name') {
        aVal = (aVal || '').toLowerCase()
        bVal = (bVal || '').toLowerCase()
      } else if (field === 'last_visit' || field === 'created_at') {
        aVal = new Date(aVal || 0)
        bVal = new Date(bVal || 0)
      } else {
        aVal = aVal || 0
        bVal = bVal || 0
      }
      
      if (direction === 'desc') {
        return bVal > aVal ? 1 : bVal < aVal ? -1 : 0
      } else {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
      }
    })
  }, [])

  // Main filtering logic with memoization
  const filteredCustomers = useMemo(() => {
    let result = customers
    
    // Apply search
    if (searchQuery) {
      result = searchCustomers(result, searchQuery, searchFields)
    }
    
    // Apply filters
    if (Object.keys(activeFilters).length > 0) {
      result = applyFilters(result, activeFilters)
    }
    
    // Apply sorting
    result = applySorting(result, sortOption)
    
    return result
  }, [customers, searchQuery, searchFields, activeFilters, sortOption, searchCustomers, applyFilters, applySorting])

  // Notify parent component of filtered results
  useEffect(() => {
    onFilteredResults?.(filteredCustomers)
  }, [filteredCustomers, onFilteredResults])

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchQuery(value)
    setShowSuggestions(value.length > 0)
  }

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    searchInputRef.current?.focus()
  }

  // Handle preset application
  const applyPreset = (presetKey) => {
    const preset = FILTER_PRESETS[presetKey]
    if (preset) {
      setActiveFilters(preset.filters)
      setActivePreset(presetKey)
      setShowFilters(false)
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    setSearchQuery('')
    setActiveFilters({})
    setActivePreset(null)
    setShowSuggestions(false)
  }

  // Export to CSV
  const handleExportCSV = async () => {
    setIsExporting(true)
    try {
      await onExportCSV?.(filteredCustomers)
    } finally {
      setIsExporting(false)
    }
  }

  // Remove specific filter
  const removeFilter = (filterKey) => {
    const newFilters = { ...activeFilters }
    delete newFilters[filterKey]
    setActiveFilters(newFilters)
    
    // Clear preset if filters don't match
    if (activePreset) {
      const presetFilters = FILTER_PRESETS[activePreset]?.filters || {}
      const filtersMatch = JSON.stringify(presetFilters) === JSON.stringify(newFilters)
      if (!filtersMatch) {
        setActivePreset(null)
      }
    }
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar with Suggestions */}
      <div className="relative" ref={suggestionsRef}>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search customers by name, email, phone, or notes..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 pr-4 py-3 text-lg border-2 border-gray-200 focus:border-olive-500 transition-colors"
            onFocus={() => setShowSuggestions(searchQuery.length > 0)}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setShowSuggestions(false)
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionSelect(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-center space-x-2"
              >
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                <SearchHighlight text={suggestion} searchQuery={searchQuery} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Controls Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filter Toggle */}
        <Button
          variant={showFilters ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
          icon={FunnelIcon}
          className="transition-all duration-200"
        >
          Filters
          {Object.keys(activeFilters).length > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-olive-100 text-olive-800 rounded-full text-xs">
              {Object.keys(activeFilters).length}
            </span>
          )}
        </Button>

        {/* Sort Dropdown */}
        <div className="relative">
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        {/* Export Button */}
        <Button
          variant="secondary"
          onClick={handleExportCSV}
          icon={DocumentArrowDownIcon}
          loading={isExporting}
          disabled={filteredCustomers.length === 0}
        >
          Export ({filteredCustomers.length})
        </Button>

        {/* Results Count */}
        <div className="text-sm text-gray-600 ml-auto">
          {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>

      {/* Filter Presets */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(FILTER_PRESETS).map(([key, preset]) => {
          const Icon = preset.icon
          return (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activePreset === key
                  ? 'bg-olive-100 text-olive-800 ring-2 ring-olive-300'
                  : `${preset.color} hover:bg-opacity-75`
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{preset.name}</span>
            </button>
          )
        })}
      </div>

      {/* Active Filter Tags */}
      {(searchQuery || Object.keys(activeFilters).length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Active filters:</span>
          
          {searchQuery && (
            <div className="inline-flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              <MagnifyingGlassIcon className="h-3 w-3" />
              <span>Search: "{searchQuery}"</span>
              <button
                onClick={() => setSearchQuery('')}
                className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          )}
          
          {Object.entries(activeFilters).map(([key, value]) => (
            <div
              key={key}
              className="inline-flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
            >
              <span>{key}: {JSON.stringify(value)}</span>
              <button
                onClick={() => removeFilter(key)}
                className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
          
          <Button
            variant="ghost"
            size="small"
            onClick={clearAllFilters}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Advanced Filters</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Spending Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Total Spending</label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Min $"
                  value={activeFilters.spending?.min || ''}
                  onChange={(e) => setActiveFilters(prev => ({
                    ...prev,
                    spending: { ...prev.spending, min: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max $"
                  value={activeFilters.spending?.max || ''}
                  onChange={(e) => setActiveFilters(prev => ({
                    ...prev,
                    spending: { ...prev.spending, max: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Visit Frequency */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Visit Frequency</label>
              <select
                value={activeFilters.visitFrequency || ''}
                onChange={(e) => setActiveFilters(prev => ({
                  ...prev,
                  visitFrequency: e.target.value || undefined
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <option value="">All frequencies</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Days Since Last Visit */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Days Since Last Visit</label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder="Min days"
                  value={activeFilters.daysSinceLastVisit?.min || ''}
                  onChange={(e) => setActiveFilters(prev => ({
                    ...prev,
                    daysSinceLastVisit: { ...prev.daysSinceLastVisit, min: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="text-sm"
                />
                <Input
                  type="number"
                  placeholder="Max days"
                  value={activeFilters.daysSinceLastVisit?.max || ''}
                  onChange={(e) => setActiveFilters(prev => ({
                    ...prev,
                    daysSinceLastVisit: { ...prev.daysSinceLastVisit, max: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Health Score Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Health Score</label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Min score"
                  value={activeFilters.healthScore?.min || ''}
                  onChange={(e) => setActiveFilters(prev => ({
                    ...prev,
                    healthScore: { ...prev.healthScore, min: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="text-sm"
                />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Max score"
                  value={activeFilters.healthScore?.max || ''}
                  onChange={(e) => setActiveFilters(prev => ({
                    ...prev,
                    healthScore: { ...prev.healthScore, max: e.target.value ? Number(e.target.value) : undefined }
                  }))}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Loyalty Tier */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Loyalty Tier</label>
              <select
                value={activeFilters.loyaltyTier || ''}
                onChange={(e) => setActiveFilters(prev => ({
                  ...prev,
                  loyaltyTier: e.target.value || undefined
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <option value="">All tiers</option>
                <option value="bronze">Bronze</option>
                <option value="silver">Silver</option>
                <option value="gold">Gold</option>
                <option value="platinum">Platinum</option>
              </select>
            </div>

            {/* Churn Risk */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Churn Risk</label>
              <select
                value={activeFilters.churnRisk || ''}
                onChange={(e) => setActiveFilters(prev => ({
                  ...prev,
                  churnRisk: e.target.value || undefined
                }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
              >
                <option value="">All risk levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => setActiveFilters({})}
              className="text-sm"
            >
              Clear Filters
            </Button>
            
            <Button
              onClick={() => setShowFilters(false)}
              className="text-sm"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
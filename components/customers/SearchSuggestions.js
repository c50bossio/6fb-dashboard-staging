'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  MagnifyingGlassIcon,
  ClockIcon,
  StarIcon,
  UserIcon,
  TagIcon,
  AtSymbolIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  ArrowTrendingUpIcon
} from '@heroicons/react/24/outline'
import SearchHighlight from './SearchHighlight'
import { generateSearchSuggestions, fuzzyMatch } from '../../utils/fuzzySearch'

/**
 * SearchSuggestions Component
 * 
 * Provides intelligent, real-time search suggestions with categorization,
 * recent searches, and popular searches functionality.
 * 
 * Features:
 * - Real-time suggestion generation
 * - Categorized suggestions (customers, services, tags, etc.)
 * - Recent search history
 * - Popular/trending searches
 * - Keyboard navigation
 * - Click and keyboard selection
 * - Fuzzy matching with highlighting
 * - Performance optimized with debouncing
 * - Accessibility compliant
 */

// Suggestion categories with metadata
const SUGGESTION_CATEGORIES = {
  customers: {
    name: 'Customers',
    icon: UserIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    limit: 5
  },
  services: {
    name: 'Services',
    icon: StarIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    limit: 3
  },
  tags: {
    name: 'Tags',
    icon: TagIcon,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    limit: 3
  },
  locations: {
    name: 'Locations',
    icon: BuildingOfficeIcon,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    limit: 2
  },
  recent: {
    name: 'Recent Searches',
    icon: ClockIcon,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    limit: 3
  },
  popular: {
    name: 'Popular Searches',
    icon: ArrowTrendingUpIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    limit: 2
  }
}

/**
 * Generate categorized suggestions from customer data
 */
function generateCategorizedSuggestions(customers, query, options = {}) {
  const { maxPerCategory = 5, minQueryLength = 1 } = options
  
  if (!query || query.length < minQueryLength) return {}
  
  const suggestions = {
    customers: [],
    services: [],
    tags: [],
    locations: []
  }
  
  const queryLower = query.toLowerCase()
  const seenValues = new Set()
  
  customers.forEach(customer => {
    // Customer name suggestions
    if (customer.name && !seenValues.has(customer.name.toLowerCase())) {
      const nameMatch = fuzzyMatch(customer.name, query)
      if (nameMatch.score > 30) {
        suggestions.customers.push({
          type: 'customer',
          value: customer.name,
          label: customer.name,
          subtitle: customer.email || customer.phone,
          customer: customer,
          score: nameMatch.score,
          matches: nameMatch.matches
        })
        seenValues.add(customer.name.toLowerCase())
      }
    }
    
    // Email suggestions
    if (customer.email && !seenValues.has(customer.email.toLowerCase())) {
      if (customer.email.toLowerCase().includes(queryLower)) {
        suggestions.customers.push({
          type: 'email',
          value: customer.email,
          label: customer.email,
          subtitle: customer.name,
          customer: customer,
          score: 80,
          icon: AtSymbolIcon
        })
        seenValues.add(customer.email.toLowerCase())
      }
    }
    
    // Phone suggestions
    if (customer.phone && !seenValues.has(customer.phone)) {
      if (customer.phone.includes(query.replace(/\D/g, ''))) {
        suggestions.customers.push({
          type: 'phone',
          value: customer.phone,
          label: customer.phone,
          subtitle: customer.name,
          customer: customer,
          score: 75,
          icon: PhoneIcon
        })
        seenValues.add(customer.phone)
      }
    }
    
    // Service suggestions
    if (customer.preferred_services && Array.isArray(customer.preferred_services)) {
      customer.preferred_services.forEach(service => {
        if (!seenValues.has(service.toLowerCase())) {
          const serviceMatch = fuzzyMatch(service, query)
          if (serviceMatch.score > 40) {
            suggestions.services.push({
              type: 'service',
              value: service,
              label: service,
              subtitle: 'Service',
              score: serviceMatch.score,
              matches: serviceMatch.matches
            })
            seenValues.add(service.toLowerCase())
          }
        }
      })
    }
    
    // Tag suggestions
    if (customer.tags && Array.isArray(customer.tags)) {
      customer.tags.forEach(tag => {
        if (!seenValues.has(tag.toLowerCase())) {
          const tagMatch = fuzzyMatch(tag, query)
          if (tagMatch.score > 40) {
            suggestions.tags.push({
              type: 'tag',
              value: tag,
              label: tag,
              subtitle: 'Tag',
              score: tagMatch.score,
              matches: tagMatch.matches
            })
            seenValues.add(tag.toLowerCase())
          }
        }
      })
    }
    
    // Location suggestions
    if (customer.location && !seenValues.has(customer.location.toLowerCase())) {
      const locationMatch = fuzzyMatch(customer.location, query)
      if (locationMatch.score > 40) {
        suggestions.locations.push({
          type: 'location',
          value: customer.location,
          label: customer.location,
          subtitle: 'Location',
          score: locationMatch.score,
          matches: locationMatch.matches
        })
        seenValues.add(customer.location.toLowerCase())
      }
    }
  })
  
  // Sort by score and limit results
  Object.keys(suggestions).forEach(category => {
    suggestions[category] = suggestions[category]
      .sort((a, b) => b.score - a.score)
      .slice(0, maxPerCategory)
  })
  
  return suggestions
}

/**
 * Individual suggestion item component
 */
function SuggestionItem({ 
  suggestion, 
  query, 
  isSelected, 
  onClick, 
  onMouseEnter 
}) {
  const Icon = suggestion.icon || SUGGESTION_CATEGORIES[suggestion.type]?.icon || MagnifyingGlassIcon
  
  return (
    <button
      onClick={() => onClick(suggestion)}
      onMouseEnter={onMouseEnter}
      className={`
        w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors duration-150
        ${isSelected ? 'bg-olive-50 text-olive-700' : 'hover:bg-gray-50'}
      `}
      role="option"
      aria-selected={isSelected}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${
        isSelected ? 'text-olive-600' : 'text-gray-400'
      }`} />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <SearchHighlight
            text={suggestion.label}
            searchQuery={query}
            className="font-medium text-sm truncate"
          />
          {suggestion.customer?.health_score && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <StarIcon className="h-3 w-3" />
              <span>{suggestion.customer.health_score}%</span>
            </div>
          )}
        </div>
        
        {suggestion.subtitle && (
          <p className="text-xs text-gray-500 truncate mt-0.5">
            {suggestion.subtitle}
          </p>
        )}
        
        {suggestion.customer && (
          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
            {suggestion.customer.visit_count && (
              <span>{suggestion.customer.visit_count} visits</span>
            )}
            {suggestion.customer.loyalty_tier && (
              <span className="capitalize">{suggestion.customer.loyalty_tier}</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

/**
 * Main SearchSuggestions Component
 */
export default function SearchSuggestions({
  customers = [],
  query = '',
  isVisible = false,
  onSelect,
  onClose,
  maxSuggestions = 15,
  showRecentSearches = true,
  showPopularSearches = true,
  recentSearches = [],
  popularSearches = ['haircut', 'beard trim', 'VIP customers', 'high value'],
  className = ''
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [categorizedSuggestions, setCategorizedSuggestions] = useState({})
  
  // Generate suggestions with debouncing
  const suggestions = useMemo(() => {
    if (!query || query.length < 2) {
      // Show recent and popular searches when no query
      const suggestions = {}
      
      if (showRecentSearches && recentSearches.length > 0) {
        suggestions.recent = recentSearches.slice(0, SUGGESTION_CATEGORIES.recent.limit).map(search => ({
          type: 'recent',
          value: search,
          label: search,
          subtitle: 'Recent search',
          score: 100
        }))
      }
      
      if (showPopularSearches && popularSearches.length > 0) {
        suggestions.popular = popularSearches.slice(0, SUGGESTION_CATEGORIES.popular.limit).map(search => ({
          type: 'popular',
          value: search,
          label: search,
          subtitle: 'Popular search',
          score: 90
        }))
      }
      
      return suggestions
    }
    
    return generateCategorizedSuggestions(customers, query, {
      maxPerCategory: 5
    })
  }, [customers, query, recentSearches, popularSearches, showRecentSearches, showPopularSearches])
  
  // Flatten suggestions for keyboard navigation
  const flatSuggestions = useMemo(() => {
    const flat = []
    Object.entries(suggestions).forEach(([category, items]) => {
      if (items && items.length > 0) {
        items.forEach(item => flat.push({ ...item, category }))
      }
    })
    return flat.slice(0, maxSuggestions)
  }, [suggestions, maxSuggestions])
  
  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [flatSuggestions])
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isVisible || flatSuggestions.length === 0) return
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev < flatSuggestions.length - 1 ? prev + 1 : 0
          )
          break
          
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : flatSuggestions.length - 1
          )
          break
          
        case 'Enter':
          e.preventDefault()
          if (flatSuggestions[selectedIndex]) {
            onSelect(flatSuggestions[selectedIndex].value)
          }
          break
          
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, flatSuggestions, selectedIndex, onSelect, onClose])
  
  // Handle suggestion selection
  const handleSelect = (suggestion) => {
    onSelect(suggestion.value)
  }
  
  if (!isVisible || flatSuggestions.length === 0) return null
  
  return (
    <div 
      className={`
        absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg 
        max-h-96 overflow-y-auto animate-in fade-in-0 slide-in-from-top-2 duration-200
        ${className}
      `}
      role="listbox"
      aria-label="Search suggestions"
    >
      {Object.entries(suggestions).map(([category, items]) => {
        if (!items || items.length === 0) return null
        
        const categoryConfig = SUGGESTION_CATEGORIES[category]
        const Icon = categoryConfig?.icon || MagnifyingGlassIcon
        
        return (
          <div key={category} className="border-b border-gray-100 last:border-b-0">
            {/* Category Header */}
            <div className={`
              px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50 
              flex items-center space-x-2 border-b border-gray-100
            `}>
              <Icon className="h-3 w-3" />
              <span>{categoryConfig?.name || category}</span>
              <span className="text-gray-400">({items.length})</span>
            </div>
            
            {/* Category Items */}
            {items.map((suggestion, index) => {
              const flatIndex = flatSuggestions.findIndex(
                s => s.value === suggestion.value && s.category === category
              )
              
              return (
                <SuggestionItem
                  key={`${category}-${index}`}
                  suggestion={suggestion}
                  query={query}
                  isSelected={flatIndex === selectedIndex}
                  onClick={handleSelect}
                  onMouseEnter={() => setSelectedIndex(flatIndex)}
                />
              )
            })}
          </div>
        )
      })}
      
      {/* No results message */}
      {flatSuggestions.length === 0 && query && (
        <div className="px-4 py-6 text-center text-gray-500">
          <MagnifyingGlassIcon className="h-6 w-6 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No suggestions found for "{query}"</p>
        </div>
      )}
      
      {/* Keyboard hint */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Use ↑ ↓ to navigate, Enter to select, Esc to close
        </p>
      </div>
    </div>
  )
}

/**
 * Hook for managing search suggestions state
 */
export function useSearchSuggestions({
  customers = [],
  onSearchHistoryAdd,
  maxRecentSearches = 10
}) {
  const [recentSearches, setRecentSearches] = useState([])
  const [popularSearches, setPopularSearches] = useState([
    'high value customers',
    'frequent visitors',
    'VIP customers',
    'at risk customers',
    'new customers'
  ])
  
  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customer-search-history')
      if (saved) {
        setRecentSearches(JSON.parse(saved))
      }
    } catch (error) {
      console.warn('Failed to load search history:', error)
    }
  }, [])
  
  // Add to recent searches
  const addToRecentSearches = useCallback((query) => {
    if (!query || query.length < 2) return
    
    setRecentSearches(prev => {
      const filtered = prev.filter(search => search !== query)
      const updated = [query, ...filtered].slice(0, maxRecentSearches)
      
      try {
        localStorage.setItem('customer-search-history', JSON.stringify(updated))
      } catch (error) {
        console.warn('Failed to save search history:', error)
      }
      
      onSearchHistoryAdd?.(query)
      return updated
    })
  }, [maxRecentSearches, onSearchHistoryAdd])
  
  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([])
    try {
      localStorage.removeItem('customer-search-history')
    } catch (error) {
      console.warn('Failed to clear search history:', error)
    }
  }, [])
  
  return {
    recentSearches,
    popularSearches,
    addToRecentSearches,
    clearRecentSearches,
    setPopularSearches
  }
}
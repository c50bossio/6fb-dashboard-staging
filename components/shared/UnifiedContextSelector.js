'use client'

import { Menu, Transition } from '@headlessui/react'
import {
  ChevronDownIcon,
  BuildingOfficeIcon,
  UserIcon,
  ChartBarIcon,
  CalendarDaysIcon,
  CheckIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { Fragment, useState } from 'react'
import { useUnifiedContext, UNIFIED_CONTEXT_LEVELS } from '../../contexts/UnifiedContextProvider'

export default function UnifiedContextSelector({ 
  className = "",
  size = "default", // "compact" | "default" | "large"
  showBreadcrumb = false
}) {
  const { 
    context,
    availableContexts,
    loading,
    setContext
  } = useUnifiedContext()
  
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter contexts by search term
  const filteredContexts = availableContexts.filter(contextItem =>
    contextItem.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contextItem.metadata?.locationName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contextItem.metadata?.organizationName?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Group contexts by level for better organization
  const groupedContexts = filteredContexts.reduce((groups, contextItem) => {
    const levelKey = contextItem.level
    if (!groups[levelKey]) {
      groups[levelKey] = []
    }
    groups[levelKey].push(contextItem)
    return groups
  }, {})
  
  // Get icon for context level
  const getContextIcon = (contextLevel) => {
    const iconMap = {
      [UNIFIED_CONTEXT_LEVELS.ORGANIZATION]: BuildingOfficeIcon,
      [UNIFIED_CONTEXT_LEVELS.LOCATION]: MapPinIcon,
      [UNIFIED_CONTEXT_LEVELS.RESOURCE]: UserIcon
    }
    return iconMap[contextLevel] || CalendarDaysIcon
  }
  
  // Size variants
  const sizeClasses = {
    compact: "text-sm px-3 py-1.5",
    default: "text-sm px-4 py-2", 
    large: "text-base px-5 py-3"
  }
  
  const currentDisplayName = context?.displayName || 'Select Context'
  const CurrentIcon = context ? getContextIcon(context.level) : CalendarDaysIcon
  
  // Get level display name
  const getLevelDisplayName = (level) => {
    switch (level) {
      case UNIFIED_CONTEXT_LEVELS.ORGANIZATION:
        return 'Organizations'
      case UNIFIED_CONTEXT_LEVELS.LOCATION:
        return 'Locations'
      case UNIFIED_CONTEXT_LEVELS.RESOURCE:
        return 'Resources'
      default:
        return 'Contexts'
    }
  }
  
  return (
    <div className={`${className}`}>
      {/* Main Context Selector */}
      <Menu as="div" className="relative inline-block text-left w-full">
        <div>
          <Menu.Button 
            className={`inline-flex w-full justify-between items-center rounded-lg bg-white shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-colors ${sizeClasses[size]} ${loading ? 'opacity-50 cursor-wait' : ''}`}
            disabled={loading}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <CurrentIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-900 truncate">
                {currentDisplayName}
              </span>
              {loading && (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-olive-600 ml-2"></div>
              )}
            </div>
            <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-500 flex-shrink-0" />
          </Menu.Button>
        </div>
        
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute left-0 z-50 mt-2 w-80 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-hidden">
            <div className="py-1">
              {/* Search Bar */}
              {availableContexts.length > 5 && (
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search locations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-olive-500 focus:border-olive-500"
                    />
                  </div>
                </div>
              )}
              
              {/* Context Groups by Level */}
              <div className="max-h-80 overflow-y-auto">
                {[UNIFIED_CONTEXT_LEVELS.ORGANIZATION, UNIFIED_CONTEXT_LEVELS.LOCATION, UNIFIED_CONTEXT_LEVELS.RESOURCE].map((level, levelIdx) => {
                  const contextsForLevel = groupedContexts[level]
                  if (!contextsForLevel || contextsForLevel.length === 0) return null
                  
                  return (
                    <div key={level}>
                      {levelIdx > 0 && <div className="border-t border-gray-100 my-1" />}
                      
                      {/* Level Header */}
                      <div className="px-3 py-2 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          {getLevelDisplayName(level)}
                        </p>
                      </div>
                      
                      {/* Context Options for this level */}
                      {contextsForLevel.map((contextItem) => {
                        const ContextIcon = getContextIcon(contextItem.level)
                        const isActive = context && 
                          context.level === contextItem.level &&
                          context.organizationId === contextItem.organizationId &&
                          context.locationId === contextItem.locationId &&
                          context.resourceId === contextItem.resourceId
                        
                        return (
                          <Menu.Item key={`${contextItem.level}-${contextItem.organizationId || 'none'}-${contextItem.locationId || 'none'}-${contextItem.resourceId || 'none'}`}>
                            {({ active }) => (
                              <button
                                onClick={() => setContext(contextItem)}
                                disabled={loading}
                                className={`
                                  ${active ? 'bg-olive-50 text-olive-900' : 'text-gray-700'}
                                  ${isActive ? 'bg-olive-100 text-olive-900 border-l-2 border-olive-500' : ''}
                                  ${loading ? 'opacity-50 cursor-wait' : ''}
                                  group flex items-center w-full py-2 text-sm hover:bg-olive-50 transition-colors
                                  ${contextItem.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION ? 'pl-3' : ''}
                                  ${contextItem.level === UNIFIED_CONTEXT_LEVELS.LOCATION ? 'pl-6' : ''}
                                  ${contextItem.level === UNIFIED_CONTEXT_LEVELS.RESOURCE ? 'pl-9' : ''}
                                `}
                              >
                                <ContextIcon className="mr-3 h-4 w-4 text-gray-500 group-hover:text-olive-500 flex-shrink-0" />
                                <div className="flex-1 text-left min-w-0">
                                  <div className={`truncate ${contextItem.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION ? 'font-semibold' : 'font-medium'}`}>
                                    {contextItem.level === UNIFIED_CONTEXT_LEVELS.ORGANIZATION && '🏢 '}
                                    {contextItem.level === UNIFIED_CONTEXT_LEVELS.LOCATION && '📍 '}
                                    {contextItem.level === UNIFIED_CONTEXT_LEVELS.RESOURCE && '👤 '}
                                    {contextItem.displayName}
                                  </div>
                                  
                                  {/* Show parent context for nested levels */}
                                  {contextItem.level === UNIFIED_CONTEXT_LEVELS.LOCATION && contextItem.metadata?.organizationName && (
                                    <div className="text-xs text-gray-500 truncate">
                                      under {contextItem.metadata.organizationName}
                                    </div>
                                  )}
                                  {contextItem.level === UNIFIED_CONTEXT_LEVELS.RESOURCE && contextItem.metadata?.locationName && (
                                    <div className="text-xs text-gray-500 truncate">
                                      at {contextItem.metadata.locationName}
                                    </div>
                                  )}
                                  
                                  {contextItem.metadata?.fallback && (
                                    <div className="text-xs text-amber-600">
                                      (Setup in progress)
                                    </div>
                                  )}
                                </div>
                                {isActive && (
                                  <CheckIcon className="ml-2 h-4 w-4 text-olive-600 flex-shrink-0" />
                                )}
                              </button>
                            )}
                          </Menu.Item>
                        )
                      })}
                    </div>
                  )
                })}
                
                {filteredContexts.length === 0 && (
                  <div className="px-3 py-4 text-center text-gray-500">
                    <CalendarDaysIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                    <p className="text-sm">No contexts found</p>
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="text-xs text-olive-600 hover:text-olive-700 mt-1"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
      
      {/* Optional Breadcrumb */}
      {showBreadcrumb && context && (
        <div className="mt-2">
          <ContextBreadcrumb context={context} />
        </div>
      )}
    </div>
  )
}

// Loading state component
export function ContextSelectorSkeleton({ size = "default" }) {
  const sizeClasses = {
    compact: "h-8",
    default: "h-10",
    large: "h-12"
  }
  
  return (
    <div className={`bg-gray-200 rounded-lg animate-pulse ${sizeClasses[size]} w-64`}>
      <div className="flex items-center justify-between h-full px-4">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="w-32 h-3 bg-gray-300 rounded"></div>
        </div>
        <div className="w-4 h-4 bg-gray-300 rounded"></div>
      </div>
    </div>
  )
}

// Context breadcrumb component to show hierarchy path
export function ContextBreadcrumb({ context, className = "" }) {
  if (!context) return null
  
  const getBreadcrumbPath = () => {
    const parts = []
    
    if (context.metadata?.organizationName) {
      parts.push({
        label: context.metadata.organizationName,
        icon: '🏢',
        level: 'organization'
      })
    }
    
    if (context.metadata?.locationName && context.level !== UNIFIED_CONTEXT_LEVELS.ORGANIZATION) {
      parts.push({
        label: context.metadata.locationName,
        icon: '📍',
        level: 'location'
      })
    }
    
    if (context.level === UNIFIED_CONTEXT_LEVELS.RESOURCE) {
      parts.push({
        label: context.displayName,
        icon: '👤',
        level: 'resource'
      })
    }
    
    return parts
  }
  
  const breadcrumbs = getBreadcrumbPath()
  
  if (breadcrumbs.length === 0) return null
  
  return (
    <div className={`text-xs text-gray-600 ${className}`}>
      {breadcrumbs.map((crumb, index) => (
        <span key={index}>
          {index > 0 && <span className="mx-1 text-gray-400">→</span>}
          <span className="inline-flex items-center">
            <span className="mr-1">{crumb.icon}</span>
            <span className="font-medium">{crumb.label}</span>
          </span>
        </span>
      ))}
    </div>
  )
}

// Context indicator for mobile
export function MobileContextIndicator() {
  const { context } = useUnifiedContext()
  
  if (!context) return null
  
  return (
    <div className="md:hidden px-4 py-2 bg-olive-50 border-b border-olive-100">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-olive-500 rounded-full"></div>
        <span className="text-sm font-medium text-olive-800 truncate">
          {context.displayName}
        </span>
      </div>
    </div>
  )
}
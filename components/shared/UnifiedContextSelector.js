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
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { Fragment, useState } from 'react'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'

export default function UnifiedContextSelector({ 
  showQuickActions = true,
  quickActions = null,
  className = "",
  size = "default" // "compact" | "default" | "large"
}) {
  const { 
    activeContext,
    availableContexts,
    contextLoading,
    switchContext,
    getPageDefaults
  } = useGlobalDashboard()
  
  const [searchTerm, setSearchTerm] = useState('')
  
  // Filter contexts by search term
  const filteredContexts = availableContexts.filter(context =>
    context.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    context.locationAddress?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  
  // Group contexts by location for better organization
  const groupedContexts = filteredContexts.reduce((groups, context) => {
    const locationKey = context.locationName
    if (!groups[locationKey]) {
      groups[locationKey] = []
    }
    groups[locationKey].push(context)
    return groups
  }, {})
  
  // Get icon for context type
  const getContextIcon = (contextType) => {
    const iconMap = {
      'executive': ChartBarIcon,
      'manager': BuildingOfficeIcon,
      'personal': UserIcon,
      'booking': CalendarDaysIcon
    }
    return iconMap[contextType] || CalendarDaysIcon
  }
  
  // Size variants
  const sizeClasses = {
    compact: "text-sm px-3 py-1.5",
    default: "text-sm px-4 py-2", 
    large: "text-base px-5 py-3"
  }
  
  const currentDisplayName = activeContext?.displayName || 'Select Context'
  const CurrentIcon = activeContext ? getContextIcon(activeContext.contextType) : CalendarDaysIcon
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Main Context Selector */}
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button 
            className={`inline-flex w-full justify-between items-center rounded-lg bg-white shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-olive-500 transition-colors ${sizeClasses[size]} ${contextLoading ? 'opacity-50 cursor-wait' : ''}`}
            disabled={contextLoading}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <CurrentIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span className="font-medium text-gray-900 truncate">
                {currentDisplayName}
              </span>
              {contextLoading && (
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
              
              {/* Context Groups */}
              <div className="max-h-80 overflow-y-auto">
                {Object.entries(groupedContexts).map(([locationName, contexts], locationIdx) => (
                  <div key={locationName}>
                    {locationIdx > 0 && <div className="border-t border-gray-100 my-1" />}
                    
                    {/* Location Header */}
                    {Object.keys(groupedContexts).length > 1 && (
                      <div className="px-3 py-2 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          📍 {locationName}
                        </p>
                      </div>
                    )}
                    
                    {/* Context Options for this location */}
                    {contexts.map((context) => {
                      const ContextIcon = getContextIcon(context.contextType)
                      const isActive = activeContext?.id === context.id
                      
                      return (
                        <Menu.Item key={context.id}>
                          {({ active }) => (
                            <button
                              onClick={() => switchContext(context)}
                              disabled={contextLoading}
                              className={`
                                ${active ? 'bg-olive-50 text-olive-900' : 'text-gray-700'}
                                ${isActive ? 'bg-olive-100 text-olive-900' : ''}
                                ${contextLoading ? 'opacity-50 cursor-wait' : ''}
                                group flex items-center w-full px-3 py-2 text-sm hover:bg-olive-50 transition-colors
                              `}
                            >
                              <ContextIcon className="mr-3 h-4 w-4 text-gray-500 group-hover:text-olive-500" />
                              <div className="flex-1 text-left">
                                <div className="font-medium">
                                  {context.contextType === 'executive' && '📊 '}
                                  {context.contextType === 'manager' && '🏪 '}
                                  {context.contextType === 'personal' && '👤 '}
                                  {context.contextType === 'booking' && '📅 '}
                                  {context.displayName.split(' - ')[1] || context.displayName}
                                </div>
                                {context.locationAddress && (
                                  <div className="text-xs text-gray-500">
                                    {context.locationAddress}
                                  </div>
                                )}
                              </div>
                              {isActive && (
                                <CheckIcon className="ml-2 h-4 w-4 text-olive-600" />
                              )}
                            </button>
                          )}
                        </Menu.Item>
                      )
                    })}
                  </div>
                ))}
                
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
      
      {/* Quick Actions */}
      {showQuickActions && activeContext && (
        <div className="hidden md:flex items-center space-x-2">
          {(quickActions || getPageDefaults('calendar')?.quickActions || []).slice(0, 3).map((action, index) => (
            <button
              key={index}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-olive-500 transition-colors"
            >
              {action === 'Today' && <ClockIcon className="w-3 h-3 mr-1" />}
              {action}
            </button>
          ))}
          
          {/* More Options */}
          <Menu as="div" className="relative inline-block">
            <Menu.Button className="inline-flex items-center px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 focus:outline-none">
              <span className="sr-only">More options</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
              </svg>
            </Menu.Button>
            
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 z-50 mt-1 w-48 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        🔍 Advanced Search & Filters
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        📊 Custom Reports
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        📤 Export Data
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                      >
                        ⚙️ Page Settings
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
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

// Context indicator for mobile
export function MobileContextIndicator() {
  const { activeContext } = useGlobalDashboard()
  
  if (!activeContext) return null
  
  return (
    <div className="md:hidden px-4 py-2 bg-olive-50 border-b border-olive-100">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-olive-500 rounded-full"></div>
        <span className="text-sm font-medium text-olive-800 truncate">
          {activeContext.displayName}
        </span>
      </div>
    </div>
  )
}
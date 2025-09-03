'use client'

import { Fragment, useState } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  CogIcon
} from '@heroicons/react/24/outline'

export default function TimeFiltersBar({ 
  onFilterChange,
  activeFilter = 'Today',
  className = "",
  showAdvanced = true 
}) {
  const [selectedFilter, setSelectedFilter] = useState(activeFilter)
  
  const timeFilters = [
    { label: 'Today', icon: ClockIcon },
    { label: 'This Week', icon: CalendarDaysIcon },
    { label: 'This Month', icon: CalendarDaysIcon },
    { label: 'Calendar', icon: CalendarDaysIcon }
  ]
  
  const handleFilterClick = (filter) => {
    setSelectedFilter(filter.label)
    if (onFilterChange) {
      onFilterChange(filter.label)
    }
  }
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Time Filter Buttons */}
      <div className="hidden md:flex items-center space-x-2">
        {timeFilters.slice(0, 3).map((filter) => {
          const Icon = filter.icon
          const isActive = selectedFilter === filter.label
          
          return (
            <button
              key={filter.label}
              onClick={() => handleFilterClick(filter)}
              className={`
                inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md
                focus:outline-none focus:ring-1 focus:ring-olive-500 transition-colors
                ${isActive 
                  ? 'bg-olive-100 text-olive-800 border border-olive-300' 
                  : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{filter.label}</span>
            </button>
          )
        })}
      </div>
      
      {/* Mobile: Compact Filter Dropdown */}
      <div className="md:hidden">
        <Menu as="div" className="relative inline-block">
          <Menu.Button className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-olive-500">
            <ClockIcon className="w-3 h-3 mr-1" />
            {selectedFilter}
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
            <Menu.Items className="absolute left-0 z-50 mt-1 w-32 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {timeFilters.map((filter) => (
                  <Menu.Item key={filter.label}>
                    {({ active }) => (
                      <button
                        onClick={() => handleFilterClick(filter)}
                        className={`${
                          active ? 'bg-gray-50' : ''
                        } flex w-full items-center px-3 py-2 text-xs text-gray-700`}
                      >
                        <filter.icon className="w-3 h-3 mr-2" />
                        {filter.label}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>
      
      {/* Advanced Options */}
      {showAdvanced && (
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
                      <MagnifyingGlassIcon className="w-4 h-4 mr-3" />
                      Advanced Filters
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                    >
                      <ChartBarIcon className="w-4 h-4 mr-3" />
                      Custom Reports
                    </button>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export Data
                    </button>
                  )}
                </Menu.Item>
                <div className="border-t border-gray-100 my-1" />
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${active ? 'bg-gray-50' : ''} flex w-full items-center px-4 py-2 text-sm text-gray-700`}
                    >
                      <CogIcon className="w-4 h-4 mr-3" />
                      View Settings
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
    </div>
  )
}

// Optional: Context breadcrumb component to show current hierarchy path
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
    
    if (context.metadata?.locationName && context.level !== 'ORGANIZATION') {
      parts.push({
        label: context.metadata.locationName,
        icon: '📍',
        level: 'location'
      })
    }
    
    if (context.level === 'RESOURCE') {
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
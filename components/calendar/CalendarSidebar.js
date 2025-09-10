'use client'

import { memo } from 'react'
import { 
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  UserIcon,
  BuildingStorefrontIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

/**
 * Calendar Sidebar Component
 * Contains search and filter functionality for the calendar
 */
const CalendarSidebar = memo(function CalendarSidebar({
  searchTerm,
  onSearchChange,
  filterBarber,
  onFilterBarberChange,
  filterService,
  onFilterServiceChange,
  filterStatus,
  onFilterStatusChange,
  filterLocation,
  onFilterLocationChange,
  resources = [],
  services = [],
  showDiagnostics,
  onToggleDiagnostics
}) {
  const handleSearchChange = (e) => {
    onSearchChange(e.target.value)
  }

  const handleBarberChange = (e) => {
    onFilterBarberChange(e.target.value)
  }

  const handleServiceChange = (e) => {
    onFilterServiceChange(e.target.value)
  }

  const handleStatusChange = (e) => {
    onFilterStatusChange(e.target.value)
  }

  const handleLocationChange = (e) => {
    onFilterLocationChange(e.target.value)
  }

  const clearAllFilters = () => {
    onSearchChange('')
    onFilterBarberChange('all')
    onFilterServiceChange('all')
    onFilterStatusChange('all')
    onFilterLocationChange('all')
  }

  const hasActiveFilters = searchTerm || 
    filterBarber !== 'all' || 
    filterService !== 'all' || 
    filterStatus !== 'all' || 
    filterLocation !== 'all'

  return (
    <div className="bg-gray-50 border-b px-3 sm:px-6 py-3">
      {/* Search and Filter Bar - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            placeholder="Search appointments, customers..."
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center space-x-2 sm:space-x-4">
          {/* Filter Icon for mobile */}
          <div className="sm:hidden flex items-center">
            <FunnelIcon className="h-4 w-4 text-gray-500 mr-1" />
            <span className="text-sm text-gray-500">Filters:</span>
          </div>

          {/* Barber Filter */}
          <div className="flex items-center space-x-1">
            <UserIcon className="h-4 w-4 text-gray-400 hidden sm:block" />
            <select
              value={filterBarber}
              onChange={handleBarberChange}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            >
              <option value="all">All Barbers</option>
              {resources.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.title}
                </option>
              ))}
            </select>
          </div>

          {/* Service Filter */}
          <div className="flex items-center space-x-1">
            <BuildingStorefrontIcon className="h-4 w-4 text-gray-400 hidden sm:block" />
            <select
              value={filterService}
              onChange={handleServiceChange}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            >
              <option value="all">All Services</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1">
            <select
              value={filterStatus}
              onChange={handleStatusChange}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no-show">No Show</option>
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center space-x-1">
            <MapPinIcon className="h-4 w-4 text-gray-400 hidden sm:block" />
            <select
              value={filterLocation}
              onChange={handleLocationChange}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
            >
              <option value="all">All Locations</option>
              <option value="main">Main Location</option>
              <option value="downtown">Downtown</option>
              <option value="uptown">Uptown</option>
            </select>
          </div>
        </div>

        {/* Clear Filters and Debug Toggle */}
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear All
            </button>
          )}
          
          {/* Development Diagnostics Toggle */}
          {process.env.NODE_ENV === 'development' && (
            <button
              onClick={onToggleDiagnostics}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                showDiagnostics 
                  ? 'bg-olive-100 text-olive-800 hover:bg-olive-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Debug
            </button>
          )}
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap items-center space-x-2">
          <span className="text-xs text-gray-500">Active filters:</span>
          
          {searchTerm && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-olive-100 text-olive-800">
              Search: "{searchTerm}"
              <button 
                onClick={() => onSearchChange('')}
                className="ml-1 text-olive-600 hover:text-olive-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filterBarber !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              Barber: {resources.find(r => r.id === filterBarber)?.title || filterBarber}
              <button 
                onClick={() => onFilterBarberChange('all')}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filterService !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              Service: {services.find(s => s.id === filterService)?.name || filterService}
              <button 
                onClick={() => onFilterServiceChange('all')}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filterStatus !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              Status: {filterStatus}
              <button 
                onClick={() => onFilterStatusChange('all')}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
          
          {filterLocation !== 'all' && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              Location: {filterLocation}
              <button 
                onClick={() => onFilterLocationChange('all')}
                className="ml-1 text-yellow-600 hover:text-yellow-800"
              >
                <XMarkIcon className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
})

CalendarSidebar.displayName = 'CalendarSidebar'

export default CalendarSidebar
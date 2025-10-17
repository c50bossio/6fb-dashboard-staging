'use client'

import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDownIcon,
  BuildingStorefrontIcon,
  PlusIcon,
  CheckIcon,
  ArrowPathIcon,
  SparklesIcon,
  Cog6ToothIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect, Fragment } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import AddLocationModal from '../modals/AddLocationModal'

export default function LocationSelector({ 
  selectedLocation, 
  onLocationSelect, 
  showContextOptions = true,
  compact = false 
}) {
  const { user, profile } = useAuth()
  const { 
    activeContext, 
    availableContexts, 
    switchContext, 
    contextLoading,
    availableLocations,
    isLoading: dashboardLoading
  } = useGlobalDashboard()
  
  // Debug logging for LocationSelector
  useEffect(() => {
    console.log('[LocationSelector] Context data updated:', {
      availableContextsCount: availableContexts?.length || 0,
      availableLocationsCount: availableLocations?.length || 0,
      activeContextId: activeContext?.id || 'None',
      contextLoading,
      userRole
    })
  }, [availableContexts, availableLocations, activeContext, contextLoading, userRole])
  
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'

  // Sync locations from GlobalDashboardContext
  useEffect(() => {
    if (availableLocations && availableLocations.length > 0) {
      setLocations(availableLocations)
    }
  }, [availableLocations])

  // Auto-select from active context if no selection
  useEffect(() => {
    if (activeContext && !selectedLocation && onLocationSelect) {
      const contextLocation = availableLocations?.find(loc => loc.id === activeContext.locationId)
      if (contextLocation) {
        onLocationSelect(contextLocation)
      }
    }
  }, [activeContext, selectedLocation, availableLocations, onLocationSelect])

  const loadLocations = async () => {
    // This is now handled by GlobalDashboardContext
    // Just trigger a refresh if needed
    return Promise.resolve()
  }

  const handleAddLocation = () => {
    setShowAddModal(true)
  }

  const handleLocationCreated = (newLocation) => {
    setLocations(prev => [...prev, newLocation])
    onLocationSelect(newLocation)
    setShowAddModal(false)
  }

  // Handle context switching when a location is selected
  const handleLocationContextSwitch = async (location, context) => {
    if (switchContext && context) {
      await switchContext(context)
    }
    if (onLocationSelect) {
      onLocationSelect(location)
    }
  }

  // Get context icon based on context type
  const getContextIcon = (contextType) => {
    const iconMap = {
      'executive': SparklesIcon,
      'manager': Cog6ToothIcon, 
      'personal': UserGroupIcon,
      'booking': BuildingStorefrontIcon
    }
    return iconMap[contextType] || BuildingStorefrontIcon
  }

  // Get context color based on context type
  const getContextColor = (contextType) => {
    const colorMap = {
      'executive': 'text-purple-600',
      'manager': 'text-blue-600',
      'personal': 'text-green-600', 
      'booking': 'text-amber-600'
    }
    return colorMap[contextType] || 'text-gray-600'
  }

  if (!user || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)) {
    return null
  }

  const isLoading = loading || dashboardLoading || contextLoading
  const currentLocationName = activeContext?.locationName || selectedLocation?.name || 'Select Location'

  return (
    <>
      <div className={`relative ${compact ? 'flex-initial' : 'flex-1 sm:flex-initial'}`}>
        {!compact && (
          <label className="block text-xs font-medium text-gray-700 mb-1">
            {showContextOptions ? 'Location & Context' : 'Select Location'}
          </label>
        )}
        <Menu as="div" className="relative w-full">
          <div>
            <Menu.Button className={`inline-flex items-center justify-between w-full ${compact ? 'sm:min-w-[180px]' : 'sm:min-w-[200px]'} px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500`}>
              <div className="flex items-center space-x-2 min-w-0">
                {isLoading ? (
                  <ArrowPathIcon className="h-4 w-4 text-gray-500 animate-spin flex-shrink-0" />
                ) : activeContext && showContextOptions ? (
                  React.createElement(getContextIcon(activeContext.contextType), { 
                    className: `h-4 w-4 flex-shrink-0 ${getContextColor(activeContext.contextType)}` 
                  })
                ) : (
                  <BuildingStorefrontIcon className="h-4 w-4 text-gray-500 flex-shrink-0" />
                )}
                <div className="flex flex-col items-start min-w-0">
                  <span className="truncate text-sm">
                    {isLoading ? 'Loading...' : currentLocationName}
                  </span>
                  {activeContext && showContextOptions && !compact && (
                    <span className={`truncate text-xs ${getContextColor(activeContext.contextType)}`}>
                      {activeContext.contextType.charAt(0).toUpperCase() + activeContext.contextType.slice(1)} View
                    </span>
                  )}
                </div>
              </div>
              <ChevronDownIcon className="ml-2 -mr-1 h-4 w-4 text-gray-400 flex-shrink-0" />
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
            <Menu.Items className={`absolute left-0 sm:left-auto sm:right-0 z-50 mt-1 w-full ${showContextOptions ? 'sm:w-80' : 'sm:w-64'} origin-top-left sm:origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-y-auto`}>
              <div className="py-1">
                {showContextOptions ? (
                  // Context-aware view: Group by location, show context options
                  <>
                    {availableLocations.map((location) => {
                      const locationContexts = availableContexts.filter(ctx => ctx.locationId === location.id)
                      
                      return (
                        <div key={location.id} className="border-b border-gray-50 last:border-b-0">
                          {/* Location Header */}
                          <div className="px-4 py-2 bg-gray-50">
                            <div className="flex items-center">
                              <BuildingStorefrontIcon className="h-4 w-4 text-gray-500 mr-2" />
                              <span className="text-sm font-medium text-gray-700">{location.name}</span>
                              <span className="ml-2 text-xs text-gray-500">
                                {location.city}, {location.state}
                              </span>
                            </div>
                          </div>
                          
                          {/* Context Options for this Location */}
                          <div className="px-2 py-1">
                            {locationContexts.map((context) => {
                              const ContextIcon = getContextIcon(context.contextType)
                              const isActiveContext = activeContext?.id === context.id
                              
                              return (
                                <Menu.Item key={context.id}>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleLocationContextSwitch(location, context)}
                                      disabled={isLoading}
                                      className={`
                                        ${active ? 'bg-blue-50' : ''}
                                        ${isActiveContext ? 'bg-blue-100 border-l-2 border-blue-500' : ''}
                                        group flex w-full items-center px-3 py-2 text-sm rounded-md transition-colors
                                        disabled:cursor-not-allowed disabled:opacity-50
                                      `}
                                    >
                                      <ContextIcon className={`mr-3 h-4 w-4 ${isActiveContext ? getContextColor(context.contextType) : 'text-gray-400'}`} />
                                      <div className="flex-1 text-left min-w-0">
                                        <p className={`font-medium truncate ${isActiveContext ? 'text-gray-900' : 'text-gray-700'}`}>
                                          {context.contextType.charAt(0).toUpperCase() + context.contextType.slice(1)} View
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                          {context.contextType === 'executive' && 'Full analytics & management'}
                                          {context.contextType === 'manager' && 'Shop operations & staff'}
                                          {context.contextType === 'personal' && 'Your schedule & clients'}
                                          {context.contextType === 'booking' && 'Customer booking flow'}
                                        </p>
                                      </div>
                                      {isActiveContext && (
                                        <CheckIcon className="ml-2 h-4 w-4 text-blue-600 flex-shrink-0" />
                                      )}
                                    </button>
                                  )}
                                </Menu.Item>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    
                    {/* Add Location Option */}
                    <div className="border-t border-gray-100 mt-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleAddLocation}
                            disabled={isLoading}
                            className={`
                              ${active ? 'bg-gray-50' : ''}
                              group flex w-full items-center px-4 py-3 text-sm text-gray-600
                              disabled:cursor-not-allowed disabled:opacity-50
                            `}
                          >
                            <PlusIcon className="mr-3 h-4 w-4 text-gray-400" />
                            <div className="flex-1 text-left">
                              <p className="font-medium">Add Location</p>
                              <p className="text-xs text-gray-500">Expand your business</p>
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </>
                ) : (
                  // Simple location selection view (legacy mode)
                  <>
                    {locations.map((location) => (
                      <Menu.Item key={location.id}>
                        {({ active }) => (
                          <button
                            onClick={() => onLocationSelect && onLocationSelect(location)}
                            className={`
                              ${active ? 'bg-gray-100' : ''}
                              group flex w-full items-center px-4 py-3 text-sm text-gray-700
                            `}
                          >
                            <BuildingStorefrontIcon className="mr-3 h-4 w-4 text-gray-400" />
                            <div className="flex-1 text-left">
                              <p className="font-medium">{location.name}</p>
                              <p className="text-xs text-gray-500">{location.city || location.location || 'Location not set'}</p>
                            </div>
                            {selectedLocation?.id === location.id && (
                              <CheckIcon className="ml-2 h-4 w-4 text-green-500" />
                            )}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                    
                    {/* Add Location Option */}
                    <div className="border-t border-gray-100 mt-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={handleAddLocation}
                            disabled={isLoading}
                            className={`
                              ${active ? 'bg-gray-50' : ''}
                              group flex w-full items-center px-4 py-3 text-sm text-gray-600
                              disabled:cursor-not-allowed
                            `}
                          >
                            <PlusIcon className="mr-3 h-4 w-4 text-gray-400" />
                            <div className="flex-1 text-left">
                              <p className="font-medium">Add Location</p>
                              <p className="text-xs text-gray-500">Expand your business</p>
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Add Location Modal */}
      <AddLocationModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onLocationCreated={handleLocationCreated}
      />
    </>
  )
}
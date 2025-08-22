'use client'

import { Fragment, useState, useEffect } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  ChevronDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PlusIcon,
  CheckIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import { useAuth } from '../SupabaseAuthProvider'
import AddLocationModal from '../modals/AddLocationModal'
import AddBarberModal from '../modals/AddBarberModal'

export default function GlobalContextSelector() {
  const { userRole } = useAuth()
  const {
    selectedLocations,
    selectedBarbers,
    availableLocations,
    availableBarbers,
    isLoading,
    permissions,
    isMultiLocation,
    viewMode,
    setSelectedLocations,
    setSelectedBarbers,
    selectAllLocations,
    clearLocationSelection,
    selectAllBarbers,
    clearBarberSelection,
    isLocationSelected,
    isBarberSelected,
    getSelectedLocations,
    getSelectedBarbers,
    setViewMode
  } = useGlobalDashboard()
  
  const [showAddLocationModal, setShowAddLocationModal] = useState(false)
  const [showAddBarberModal, setShowAddBarberModal] = useState(false)
  
  // Don't show selectors for individual barbers or customers
  if (userRole === 'BARBER' || userRole === 'CLIENT' || userRole === 'CUSTOMER') {
    return null
  }
  
  // Format location display text
  const getLocationDisplayText = () => {
    if (selectedLocations.length === 0) {
      return 'Select Location'
    }
    if (selectedLocations.length === 1) {
      const location = availableLocations.find(l => l.id === selectedLocations[0])
      return location?.name || 'Location'
    }
    if (selectedLocations.length === availableLocations.length) {
      return 'All Locations'
    }
    return `${selectedLocations.length} Locations`
  }
  
  // Format barber display text
  const getBarberDisplayText = () => {
    if (selectedBarbers.length === 0) {
      return 'All Barbers'
    }
    if (selectedBarbers.length === 1) {
      const barber = availableBarbers.find(b => b.id === selectedBarbers[0])
      return barber?.name || 'Barber'
    }
    return `${selectedBarbers.length} Barbers`
  }
  
  // Calculate barber count for locations
  const getBarberCountForLocation = (locationId) => {
    return availableBarbers.filter(b => b.barbershop_id === locationId).length
  }
  
  return (
    <div className="flex items-center space-x-3">
      {/* Location Selector - Show for multi-location users */}
      {(isMultiLocation || permissions.canSeeAllLocations) && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex items-center justify-between min-w-[200px] rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <BuildingOfficeIcon className="mr-2 h-4 w-4 text-gray-400" />
                <span>{getLocationDisplayText()}</span>
              </div>
              <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
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
            <Menu.Items className="absolute left-0 z-50 mt-2 w-80 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {/* Quick Actions */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Locations ({availableLocations.length})
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          if (selectedLocations.length === availableLocations.length) {
                            clearLocationSelection()
                          } else {
                            selectAllLocations()
                          }
                        }}
                        className="text-xs font-medium text-olive-600 hover:text-olive-700"
                      >
                        {selectedLocations.length === availableLocations.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Location List */}
                <div className="max-h-64 overflow-y-auto">
                  {availableLocations.map((location) => {
                    const barberCount = getBarberCountForLocation(location.id)
                    const isSelected = isLocationSelected(location.id)
                    
                    return (
                      <Menu.Item key={location.id}>
                        {({ active }) => (
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedLocations(selectedLocations.filter(id => id !== location.id))
                              } else {
                                setSelectedLocations([...selectedLocations, location.id])
                              }
                            }}
                            className={`
                              ${active ? 'bg-gray-50' : ''}
                              ${isSelected ? 'bg-olive-50' : ''}
                              group flex items-center w-full px-3 py-2 text-sm
                            `}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <div className={`
                                  mr-3 h-4 w-4 rounded border-2 flex items-center justify-center
                                  ${isSelected ? 'border-olive-600 bg-olive-600' : 'border-gray-300'}
                                `}>
                                  {isSelected && (
                                    <CheckIcon className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-900">{location.name}</div>
                                  <div className="text-xs text-gray-500">
                                    {location.city}, {location.state} • {barberCount} barbers
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    )
                  })}
                </div>
                
                {/* Add Location Button */}
                {permissions.canAddLocations && (
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => {
                        setShowAddLocationModal(true)
                      }}
                      className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-olive-600 hover:bg-olive-50 rounded-md transition-colors"
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add New Location
                    </button>
                  </div>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
      
      {/* Barber Selector - Show when locations are selected */}
      {selectedLocations.length > 0 && availableBarbers.length > 0 && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex items-center justify-between min-w-[180px] rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
              <div className="flex items-center">
                <UserGroupIcon className="mr-2 h-4 w-4 text-gray-400" />
                <span>{getBarberDisplayText()}</span>
              </div>
              <ChevronDownIcon className="ml-2 h-4 w-4 text-gray-400" />
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
            <Menu.Items className="absolute left-0 z-50 mt-2 w-72 origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {/* Quick Actions */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Barbers ({availableBarbers.length})
                    </span>
                    <button
                      onClick={() => {
                        if (selectedBarbers.length === 0) {
                          selectAllBarbers()
                        } else {
                          clearBarberSelection()
                        }
                      }}
                      className="text-xs font-medium text-olive-600 hover:text-olive-700"
                    >
                      {selectedBarbers.length === 0 ? 'Select All' : 'Show All'}
                    </button>
                  </div>
                </div>
                
                {/* Barber List */}
                <div className="max-h-64 overflow-y-auto">
                  {availableBarbers.map((barber) => {
                    const isSelected = isBarberSelected(barber.id)
                    
                    return (
                      <Menu.Item key={barber.id}>
                        {({ active }) => (
                          <button
                            onClick={() => {
                              if (isSelected) {
                                setSelectedBarbers(selectedBarbers.filter(id => id !== barber.id))
                              } else {
                                setSelectedBarbers([...selectedBarbers, barber.id])
                              }
                            }}
                            className={`
                              ${active ? 'bg-gray-50' : ''}
                              ${isSelected ? 'bg-olive-50' : ''}
                              group flex items-center w-full px-3 py-2 text-sm
                            `}
                          >
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center">
                                <div className={`
                                  mr-3 h-4 w-4 rounded border-2 flex items-center justify-center
                                  ${isSelected ? 'border-olive-600 bg-olive-600' : 'border-gray-300'}
                                `}>
                                  {isSelected && (
                                    <CheckIcon className="h-3 w-3 text-white" />
                                  )}
                                </div>
                                <div className="text-left">
                                  <div className="font-medium text-gray-900">{barber.name}</div>
                                  {isMultiLocation && (
                                    <div className="text-xs text-gray-500">{barber.location}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </button>
                        )}
                      </Menu.Item>
                    )
                  })}
                </div>
                
                {/* Add Barber Button */}
                {permissions.canAddBarbers && (
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => {
                        setShowAddBarberModal(true)
                      }}
                      className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-olive-600 hover:bg-olive-50 rounded-md transition-colors"
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Add New Barber
                    </button>
                  </div>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
      
      {/* View Mode Toggle - Only show for multi-location users with multiple locations selected */}
      {isMultiLocation && selectedLocations.length > 1 && (
        <div className="flex items-center bg-white rounded-lg shadow-sm ring-1 ring-inset ring-gray-300">
          <button
            onClick={() => setViewMode('consolidated')}
            className={`px-3 py-2 text-xs font-medium rounded-l-lg transition-colors ${
              viewMode === 'consolidated'
                ? 'bg-olive-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="View aggregated data across all selected locations"
          >
            Consolidated
          </button>
          <button
            onClick={() => setViewMode('individual')}
            className={`px-3 py-2 text-xs font-medium border-x border-gray-300 transition-colors ${
              viewMode === 'individual'
                ? 'bg-olive-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="View each location separately"
          >
            Individual
          </button>
          <button
            onClick={() => setViewMode('comparison')}
            className={`px-3 py-2 text-xs font-medium rounded-r-lg transition-colors ${
              viewMode === 'comparison'
                ? 'bg-olive-600 text-white'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
            title="Compare locations side-by-side"
          >
            Compare
          </button>
        </div>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center text-sm text-gray-500">
          <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      )}
      
      {/* Modals */}
      {showAddLocationModal && (
        <AddLocationModal
          isOpen={showAddLocationModal}
          onClose={() => setShowAddLocationModal(false)}
        />
      )}
      
      {showAddBarberModal && (
        <AddBarberModal
          isOpen={showAddBarberModal}
          onClose={() => setShowAddBarberModal(false)}
        />
      )}
    </div>
  )
}
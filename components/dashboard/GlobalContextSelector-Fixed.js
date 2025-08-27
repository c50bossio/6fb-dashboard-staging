'use client'

import { Menu, Transition } from '@headlessui/react'
import {
  ChevronDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PlusIcon,
  CheckIcon,
  MapPinIcon,
  CogIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { Fragment, useState, useEffect } from 'react'
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'
import AddLocationModal from '../modals/AddLocationModal'
import AddStaffModal from '../staff/AddStaffModal'
import { useAuth } from '../SupabaseAuthProvider'

export default function GlobalContextSelector() {
  const router = useRouter()
  const { userRole, profile } = useAuth()
  const {
    selectedLocations = [],
    selectedBarbers = [],
    availableLocations = [],
    availableBarbers = [],
    isLoading,
    permissions = {},
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
  const [showAddStaffModal, setShowAddStaffModal] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(null)
  
  // Don't show selectors for individual barbers or customers
  if (userRole === 'BARBER' || userRole === 'CLIENT' || userRole === 'CUSTOMER') {
    return null
  }
  
  // Quick navigation links for shop management
  const shopManagementLinks = [
    { 
      name: 'Staff Management', 
      href: '/shop/settings/staff', 
      icon: UsersIcon,
      description: 'Manage staff, schedules, and permissions'
    },
    { 
      name: 'Payroll System', 
      href: '/shop/payroll', 
      icon: CurrencyDollarIcon,
      description: 'Commission tracking and automated payouts'
    },
    { 
      name: 'Performance Analytics', 
      href: '/shop/performance', 
      icon: ChartBarIcon,
      description: 'Staff performance metrics and insights'
    },
    { 
      name: 'Shop Settings', 
      href: '/shop/settings', 
      icon: CogIcon,
      description: 'Configure shop preferences and integrations'
    }
  ]
  
  // Format location display text
  const getLocationDisplayText = () => {
    if (!availableLocations || availableLocations.length === 0) {
      return 'No Locations'
    }
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
  
  // Show simplified dropdown with navigation links if no locations
  if (!availableLocations || availableLocations.length === 0) {
    return (
      <div className="flex items-center space-x-2 sm:space-x-3 max-w-full overflow-hidden">
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex items-center justify-between w-full xs:w-32 sm:w-40 md:w-48 lg:min-w-[200px] max-w-[200px] rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
              <div className="flex items-center min-w-0 flex-1">
                <BuildingOfficeIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">Shop Management</span>
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
            <Menu.Items className="absolute left-0 z-50 mt-2 w-screen max-w-xs sm:w-80 sm:max-w-sm origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {/* Quick Navigation Header */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Quick Navigation
                  </span>
                </div>
                
                {/* Shop Management Links */}
                <div className="py-1">
                  {shopManagementLinks.map((link) => (
                    <Menu.Item key={link.href}>
                      {({ active }) => (
                        <button
                          onClick={() => router.push(link.href)}
                          className={`
                            ${active ? 'bg-gray-50' : ''}
                            group flex items-start w-full px-3 py-2 text-sm hover:bg-olive-50
                          `}
                        >
                          <link.icon className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{link.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{link.description}</div>
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
                
                {/* Setup Barbershop Button */}
                {(userRole === 'SHOP_OWNER' || userRole === 'ENTERPRISE_OWNER' || userRole === 'SUPER_ADMIN') && (
                  <div className="border-t border-gray-100 p-2">
                    <button
                      onClick={() => router.push('/shop/settings/general')}
                      className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-olive-600 hover:bg-olive-50 rounded-md transition-colors"
                    >
                      <PlusIcon className="mr-2 h-4 w-4" />
                      Setup Your Barbershop
                    </button>
                  </div>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
        
        {/* Status Indicator */}
        <div className="text-xs text-gray-500 hidden sm:block">
          {userRole === 'SHOP_OWNER' ? 'Shop Owner' : userRole === 'ENTERPRISE_OWNER' ? 'Enterprise' : 'Manager'}
        </div>
      </div>
    )
  }
  
  // Standard multi-location selector
  return (
    <div className="flex items-center space-x-2 sm:space-x-3 max-w-full overflow-hidden">
      {/* Location Selector - Show for multi-location users */}
      {(isMultiLocation || permissions.canSeeAllLocations) && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex items-center justify-between w-full xs:w-32 sm:w-40 md:w-48 lg:min-w-[200px] max-w-[200px] rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
              <div className="flex items-center min-w-0 flex-1">
                <BuildingOfficeIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{getLocationDisplayText()}</span>
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
            <Menu.Items className="absolute left-0 z-50 mt-2 w-screen max-w-xs sm:w-80 sm:max-w-sm origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                                <div className="text-left min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate">{location.name}</div>
                                  <div className="text-xs text-gray-500 truncate">
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
                
                {/* Navigation Links */}
                <div className="border-t border-gray-100 py-1">
                  <div className="px-3 py-2">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Management
                    </span>
                  </div>
                  {shopManagementLinks.map((link) => (
                    <button
                      key={link.href}
                      onClick={() => router.push(link.href)}
                      className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <link.icon className="mr-2 h-4 w-4 text-gray-400" />
                      {link.name}
                    </button>
                  ))}
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
      
      {/* Single Location Quick Nav */}
      {!isMultiLocation && availableLocations.length === 1 && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex items-center justify-between w-full xs:w-32 sm:w-40 md:w-48 lg:min-w-[200px] max-w-[200px] rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
              <div className="flex items-center min-w-0 flex-1">
                <BuildingOfficeIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{availableLocations[0]?.name || 'Shop Management'}</span>
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
            <Menu.Items className="absolute left-0 z-50 mt-2 w-screen max-w-xs sm:w-80 sm:max-w-sm origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {/* Shop Info */}
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="font-medium text-gray-900">{availableLocations[0]?.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {availableLocations[0]?.city}, {availableLocations[0]?.state}
                  </div>
                </div>
                
                {/* Management Links */}
                <div className="py-1">
                  {shopManagementLinks.map((link) => (
                    <Menu.Item key={link.href}>
                      {({ active }) => (
                        <button
                          onClick={() => router.push(link.href)}
                          className={`
                            ${active ? 'bg-gray-50' : ''}
                            group flex items-start w-full px-3 py-2 text-sm hover:bg-olive-50
                          `}
                        >
                          <link.icon className="mr-3 h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="text-left">
                            <div className="font-medium text-gray-900">{link.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{link.description}</div>
                          </div>
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
      
      {/* Barber Selector - Show when locations are selected */}
      {selectedLocations.length > 0 && availableBarbers.length > 0 && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex items-center justify-between w-full xs:w-28 sm:w-36 md:w-44 lg:min-w-[180px] max-w-[180px] rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors">
              <div className="flex items-center min-w-0 flex-1">
                <UserGroupIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{getBarberDisplayText()}</span>
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
            <Menu.Items className="absolute left-0 z-50 mt-2 w-screen max-w-sm sm:w-72 sm:max-w-md origin-top-left rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
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
                                <div className="text-left min-w-0 flex-1">
                                  <div className="font-medium text-gray-900 truncate">{barber.name}</div>
                                  {isMultiLocation && (
                                    <div className="text-xs text-gray-500 truncate">{barber.location}</div>
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
                        setShowAddStaffModal(true)
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
      
      {showAddStaffModal && (
        <AddStaffModal
          onClose={() => setShowAddStaffModal(false)}
          onSuccess={() => {
            setShowAddStaffModal(false)
            // Refresh barbers list through GlobalDashboard context
          }}
        />
      )}
    </div>
  )
}
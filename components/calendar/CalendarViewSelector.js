'use client'

import { Fragment, useState, useEffect } from 'react'
import { Menu, Transition } from '@headlessui/react'
import {
  ChevronDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  UserIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  MapPinIcon,
  ClockIcon,
  StarIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../SupabaseAuthProvider'

export default function CalendarViewSelector({
  onViewChange,
  onLocationChange,
  onBarberChange,
  currentView = 'personal',
  selectedLocations = [],
  selectedBarbers = []
}) {
  const { user, profile, isEnterprise, isShopOwner, userRole } = useAuth()
  const [locations, setLocations] = useState([])
  const [barbers, setBarbers] = useState([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Fetch user's accessible locations
  useEffect(() => {
    fetchUserLocations()
  }, [user, userRole])
  
  const fetchUserLocations = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/calendar/user-locations', {
        headers: {
          'Authorization': `Bearer ${user.access_token || ''}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
        
        // Auto-select first location if none selected
        if (data.locations?.length > 0 && selectedLocations.length === 0) {
          onLocationChange?.([data.locations[0].id])
        }
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Fetch barbers for selected locations
  useEffect(() => {
    if (selectedLocations.length > 0) {
      fetchBarbersForLocations()
    }
  }, [selectedLocations])
  
  const fetchBarbersForLocations = async () => {
    try {
      const response = await fetch('/api/calendar/location-barbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.access_token || ''}`
        },
        body: JSON.stringify({ locationIds: selectedLocations })
      })
      
      if (response.ok) {
        const data = await response.json()
        setBarbers(data.barbers || [])
      }
    } catch (error) {
      console.error('Error fetching barbers:', error)
    }
  }
  
  // Get view options based on user role
  const getViewOptions = () => {
    const options = []
    
    // Enterprise Admin Views
    if (isEnterprise || userRole === 'SUPER_ADMIN' || userRole === 'ENTERPRISE_OWNER') {
      options.push({
        group: 'Enterprise Views',
        icon: BuildingOfficeIcon,
        views: [
          { id: 'all-locations', label: 'All Locations Overview', icon: MapPinIcon },
          { id: 'consolidated', label: 'Consolidated Schedule', icon: CalendarDaysIcon },
          { id: 'resource-utilization', label: 'Resource Utilization', icon: ChartBarIcon },
          { id: 'revenue-by-location', label: 'Revenue by Location', icon: ChartBarIcon },
          { id: 'cross-location', label: 'Cross-Location Management', icon: UserGroupIcon }
        ]
      })
    }
    
    // Shop Owner / Location Manager Views
    if (isShopOwner || userRole === 'SHOP_OWNER' || userRole === 'LOCATION_MANAGER') {
      options.push({
        group: 'Shop Management',
        icon: BuildingOfficeIcon,
        views: [
          { id: 'shop-overview', label: 'Shop Overview', icon: BuildingOfficeIcon },
          { id: 'all-barbers', label: 'All Barbers Schedule', icon: UserGroupIcon },
          { id: 'daily-operations', label: 'Daily Operations', icon: CalendarDaysIcon },
          { id: 'weekly-planning', label: 'Weekly Planning', icon: CalendarDaysIcon },
          { id: 'staff-scheduling', label: 'Staff Scheduling', icon: ClockIcon }
        ]
      })
    }
    
    // Barber Views (always available for barbers)
    if (userRole === 'BARBER' || userRole === 'SHOP_OWNER' || isShopOwner) {
      options.push({
        group: 'Personal Views',
        icon: UserIcon,
        views: [
          { id: 'personal', label: 'My Schedule', icon: CalendarDaysIcon },
          { id: 'my-clients', label: 'My Clients', icon: UserGroupIcon },
          { id: 'availability', label: 'Availability Management', icon: ClockIcon },
          { id: 'commission-tracking', label: 'Commission Tracking', icon: ChartBarIcon }
        ]
      })
    }
    
    // Customer Views
    if (userRole === 'CLIENT' || userRole === 'CUSTOMER') {
      options.push({
        group: 'Booking',
        icon: CalendarDaysIcon,
        views: [
          { id: 'book-appointment', label: 'Book Appointment', icon: CalendarDaysIcon },
          { id: 'my-appointments', label: 'My Appointments', icon: CalendarDaysIcon },
          { id: 'preferred-barber', label: 'My Preferred Barber', icon: StarIcon }
        ]
      })
    }
    
    return options
  }
  
  const viewOptions = getViewOptions()
  const currentViewLabel = viewOptions
    .flatMap(g => g.views)
    .find(v => v.id === currentView)?.label || 'Select View'
  
  return (
    <div className="flex items-center space-x-4">
      {/* View Selector Dropdown */}
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
            <CalendarDaysIcon className="mr-2 h-5 w-5 text-gray-400" />
            <span className="flex-1 text-left">{currentViewLabel}</span>
            <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
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
          <Menu.Items className="absolute left-0 z-10 mt-2 w-72 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {viewOptions.map((group, groupIdx) => (
                <div key={groupIdx}>
                  {groupIdx > 0 && <div className="border-t border-gray-100 my-1" />}
                  <div className="px-4 py-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {group.group}
                    </p>
                  </div>
                  {group.views.map((view) => (
                    <Menu.Item key={view.id}>
                      {({ active }) => (
                        <button
                          onClick={() => onViewChange?.(view.id)}
                          className={`
                            ${active ? 'bg-olive-50 text-olive-900' : 'text-gray-700'}
                            ${currentView === view.id ? 'bg-olive-100' : ''}
                            group flex items-center w-full px-4 py-2 text-sm
                          `}
                        >
                          <view.icon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-olive-500" />
                          <span className="flex-1 text-left">{view.label}</span>
                          {currentView === view.id && (
                            <CheckIcon className="ml-2 h-4 w-4 text-olive-600" />
                          )}
                        </button>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
      
      {/* Location Selector (for multi-location users) */}
      {locations.length > 1 && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              <MapPinIcon className="mr-2 h-5 w-5 text-gray-400" />
              <span className="flex-1 text-left">
                {selectedLocations.length === 0
                  ? 'Select Locations'
                  : selectedLocations.length === 1
                  ? locations.find(l => l.id === selectedLocations[0])?.name
                  : `${selectedLocations.length} locations`}
              </span>
              <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
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
            <Menu.Items className="absolute left-0 z-10 mt-2 w-64 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                <div className="px-4 py-2">
                  <button
                    onClick={() => {
                      const allLocationIds = locations.map(l => l.id)
                      onLocationChange?.(
                        selectedLocations.length === locations.length
                          ? []
                          : allLocationIds
                      )
                    }}
                    className="text-xs font-medium text-olive-600 hover:text-olive-700"
                  >
                    {selectedLocations.length === locations.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="border-t border-gray-100">
                  {locations.map((location) => (
                    <Menu.Item key={location.id}>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            const isSelected = selectedLocations.includes(location.id)
                            onLocationChange?.(
                              isSelected
                                ? selectedLocations.filter(id => id !== location.id)
                                : [...selectedLocations, location.id]
                            )
                          }}
                          className={`
                            ${active ? 'bg-gray-100' : ''}
                            group flex items-center w-full px-4 py-2 text-sm text-gray-700
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes(location.id)}
                            onChange={() => {}}
                            className="mr-3 h-4 w-4 text-olive-600 rounded focus:ring-olive-500"
                          />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{location.name}</div>
                            <div className="text-xs text-gray-500">
                              {location.city}, {location.state}
                            </div>
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
      
      {/* Barber Filter (when applicable) */}
      {barbers.length > 0 && currentView !== 'personal' && (
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50">
              <UserGroupIcon className="mr-2 h-5 w-5 text-gray-400" />
              <span className="flex-1 text-left">
                {selectedBarbers.length === 0
                  ? 'All Barbers'
                  : selectedBarbers.length === 1
                  ? barbers.find(b => b.id === selectedBarbers[0])?.name
                  : `${selectedBarbers.length} barbers`}
              </span>
              <ChevronDownIcon className="ml-2 h-5 w-5 text-gray-400" />
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
            <Menu.Items className="absolute left-0 z-10 mt-2 w-64 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none max-h-96 overflow-y-auto">
              <div className="py-1">
                <div className="px-4 py-2">
                  <button
                    onClick={() => onBarberChange?.([])}
                    className="text-xs font-medium text-olive-600 hover:text-olive-700"
                  >
                    Show All Barbers
                  </button>
                </div>
                <div className="border-t border-gray-100">
                  {barbers.map((barber) => (
                    <Menu.Item key={barber.id}>
                      {({ active }) => (
                        <button
                          onClick={() => {
                            const isSelected = selectedBarbers.includes(barber.id)
                            onBarberChange?.(
                              isSelected
                                ? selectedBarbers.filter(id => id !== barber.id)
                                : [...selectedBarbers, barber.id]
                            )
                          }}
                          className={`
                            ${active ? 'bg-gray-100' : ''}
                            group flex items-center w-full px-4 py-2 text-sm text-gray-700
                          `}
                        >
                          <input
                            type="checkbox"
                            checked={selectedBarbers.includes(barber.id)}
                            onChange={() => {}}
                            className="mr-3 h-4 w-4 text-olive-600 rounded focus:ring-olive-500"
                          />
                          <div className="flex-1 text-left">
                            <div className="font-medium">{barber.name}</div>
                            {barber.location && (
                              <div className="text-xs text-gray-500">{barber.location}</div>
                            )}
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
    </div>
  )
}
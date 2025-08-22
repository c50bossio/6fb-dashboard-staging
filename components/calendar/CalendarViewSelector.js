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
import { useGlobalDashboard } from '../../contexts/GlobalDashboardContext'

export default function CalendarViewSelector({
  onViewChange,
  currentView = 'personal'
}) {
  const { user, profile, isEnterprise, isShopOwner, userRole } = useAuth()
  const { 
    selectedLocations,
    selectedBarbers,
    availableLocations,
    availableBarbers,
    permissions 
  } = useGlobalDashboard()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
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
    </div>
  )
}
'use client'

import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDownIcon,
  UserCircleIcon,
  PlusIcon,
  CheckIcon,
  UserPlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, Fragment } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import AddBarberModal from './AddBarberModal'
import unifiedStaffService from '@/lib/unified-staff-service'

export default function PerspectiveSelector({ selectedLocation, selectedPerspective, onPerspectiveSelect }) {
  const { user, profile } = useAuth()
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddBarberModal, setShowAddBarberModal] = useState(false)

  const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'

  useEffect(() => {
    if (selectedLocation) {
      loadStaff(selectedLocation.id)
    }
  }, [selectedLocation])

  const loadStaff = async (locationId) => {
    try {
      setLoading(true)
      
      console.log('🔄 PerspectiveSelector: Loading staff for location', locationId)
      
      // Use unified staff service with location ID as barbershop ID
      const staffData = await unifiedStaffService.getStaff(locationId, {
        useCache: true,
        includeAvailability: false,
        includeServices: false
      })
      
      if (staffData.staff && staffData.staff.length > 0) {
        console.log(`✅ PerspectiveSelector: Found ${staffData.staff.length} staff members via ${staffData.source} endpoint`)
        
        // Transform staff data for perspective selector format
        const perspectiveStaff = staffData.staff.map(member => ({
          id: member.user_id || member.id,
          name: member.display_name || member.name || member.full_name,
          role: member.role || 'BARBER',
          location_id: locationId,
          user_id: member.user_id || member.id
        }))
        
        setStaff(perspectiveStaff)
        
        // Auto-select "My Dashboard" perspective if no perspective selected
        if (!selectedPerspective && perspectiveStaff.length > 0) {
          onPerspectiveSelect({
            type: 'owner',
            label: 'My Dashboard'
          })
        }
        
        setLoading(false)
        return
      }
      
      // Fallback to dev mock data if no real staff found
      console.log('⚠️ PerspectiveSelector: No staff found, using fallback mock data')
      const mockStaff = [
        {
          id: 'dev-barber-1',
          name: 'John Barber',
          role: 'BARBER',
          location_id: locationId
        }
      ]
      
      setStaff(mockStaff)
      
      // Auto-select "My Dashboard" perspective
      if (!selectedPerspective) {
        onPerspectiveSelect({
          type: 'owner',
          label: 'My Dashboard'
        })
      }
      
      setLoading(false)
      
    } catch (error) {
      console.error('❌ PerspectiveSelector: Error loading staff:', error)
      
      // Final fallback to mock data on any error
      const mockStaff = [
        {
          id: 'dev-barber-1', 
          name: 'John Barber',
          role: 'BARBER',
          location_id: locationId
        }
      ]
      
      setStaff(mockStaff)
      
      if (!selectedPerspective && mockStaff.length > 0) {
        onPerspectiveSelect({
          type: 'owner',
          label: 'My Dashboard'
        })
      }
      
      setLoading(false)
    }
  }

  const handleAddBarber = () => {
    setShowAddBarberModal(true)
  }

  const handleBarberAdded = (newBarber) => {
    setStaff(prev => [...prev, newBarber])
    setShowAddBarberModal(false)
    
    // Invalidate staff cache to ensure fresh data on next load
    if (selectedLocation?.id) {
      unifiedStaffService.invalidateCache(selectedLocation.id)
    }
  }

  const getPerspectiveOptions = () => {
    const options = []
    
    // Always include "My Dashboard" for owners
    options.push({
      id: 'owner',
      type: 'owner',
      name: 'My Dashboard',
      role: userRole === 'ENTERPRISE_OWNER' ? 'Enterprise Owner' : 'Shop Owner',
      isPrimary: true
    })
    
    // Add staff members if any exist
    staff.forEach(member => {
      options.push({
        id: member.id,
        type: 'staff',
        name: member.name || 'Unnamed Staff',
        role: member.role || 'Staff',
        email: member.email,
        avatar: member.avatar
      })
    })
    
    return options
  }

  if (!user || !selectedLocation) {
    return null
  }

  const perspectiveOptions = getPerspectiveOptions()

  return (
    <>
      <div className="relative flex-1 sm:flex-initial">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          View As
        </label>
        <Menu as="div" className="relative w-full">
          <div>
            <Menu.Button className="inline-flex items-center justify-between w-full sm:min-w-[200px] px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
              <div className="flex items-center space-x-2">
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 text-gray-500 animate-spin" />
                ) : (
                  <UserCircleIcon className="h-4 w-4 text-gray-500" />
                )}
                <span className="truncate">
                  {loading ? 'Loading staff...' : selectedPerspective ? selectedPerspective.name : 'My Dashboard'}
                </span>
              </div>
              <ChevronDownIcon className="ml-2 -mr-1 h-4 w-4 text-gray-400" />
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
            <Menu.Items className="absolute left-0 sm:left-auto sm:right-0 z-50 mt-1 w-full sm:w-64 origin-top-left sm:origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {/* Perspective Options */}
                {perspectiveOptions.map((perspective) => (
                  <Menu.Item key={perspective.id}>
                    {({ active }) => (
                      <button
                        onClick={() => onPerspectiveSelect(perspective)}
                        className={`
                          ${active ? 'bg-gray-100' : ''}
                          group flex w-full items-center px-4 py-3 text-sm text-gray-700
                        `}
                      >
                        <UserCircleIcon className="mr-3 h-4 w-4 text-gray-400" />
                        <div className="flex-1 text-left">
                          <p className="font-medium">{perspective.name}</p>
                          <p className="text-xs text-gray-500">
                            {perspective.isPrimary ? 'Owner view' : `View as ${perspective.role}`}
                          </p>
                        </div>
                        {(!selectedPerspective && perspective.isPrimary) || 
                         (selectedPerspective?.id === perspective.id) ? (
                          <CheckIcon className="ml-2 h-4 w-4 text-green-500" />
                        ) : null}
                      </button>
                    )}
                  </Menu.Item>
                ))}
                
                {/* Add Barber Option */}
                <div className="border-t border-gray-100 mt-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleAddBarber}
                        disabled={loading}
                        className={`
                          ${active ? 'bg-gray-50' : ''}
                          group flex w-full items-center px-4 py-3 text-sm text-gray-600
                          disabled:cursor-not-allowed
                        `}
                      >
                        <UserPlusIcon className="mr-3 h-4 w-4 text-gray-400" />
                        <div className="flex-1 text-left">
                          <p className="font-medium">
                            {staff.length === 0 ? 'Add Barber' : 'Add Team Member'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {staff.length === 0 ? 'Invite your first barber' : 'Grow your team'}
                          </p>
                        </div>
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </div>

      {/* Add Barber Modal */}
      <AddBarberModal 
        isOpen={showAddBarberModal}
        onClose={() => setShowAddBarberModal(false)}
        onBarberAdded={handleBarberAdded}
        locationId={selectedLocation?.id}
      />
    </>
  )
}
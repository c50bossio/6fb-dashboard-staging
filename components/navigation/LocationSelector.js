'use client'

import { Menu, Transition } from '@headlessui/react'
import { 
  ChevronDownIcon,
  BuildingStorefrontIcon,
  PlusIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, Fragment } from 'react'
import { useAuth } from '../SupabaseAuthProvider'
import AddLocationModal from './AddLocationModal'

export default function LocationSelector({ selectedLocation, onLocationSelect }) {
  const { user, profile: _profile } = useAuth()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const userRole = profile?.role || user?.user_metadata?.role || 'CLIENT'

  useEffect(() => {
    if (userRole && ['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)) {
      loadLocations()
    }
  }, [userRole])

  const loadLocations = async () => {
    try {
      setLoading(true)
      
      
      // Production API calls - only for appropriate roles
      let response
      let apiCallFailed = false
      
      try {
        // Only try enterprise API for actual enterprise owners
        if (userRole === 'ENTERPRISE_OWNER' || userRole === 'SUPER_ADMIN') {
          response = await fetch('/api/enterprise/locations/')
        } else if (userRole === 'SHOP_OWNER') {
          // Regular shop owners use user-shops endpoint
          response = await fetch('/api/barbershops/user-shops/')
        } else {
          // Other roles get mock data immediately
          apiCallFailed = true
        }
        
        if (response && response.ok) {
          const data = await response.json()
          const locationList = data.shops || data.locations || []
          setLocations(locationList)
          
          // Auto-select user's current location based on barbershop_id
          if (!selectedLocation && locationList.length > 0) {
            const userLocation = locationList.find(loc => 
              loc.id === profile?.shop_id || 
              loc.slug === profile?.shop_id ||
              loc.name.toLowerCase().includes('tomb45')
            ) || locationList[0] // Fallback to first location
            
            onLocationSelect(userLocation)
          }
        } else {
          // Silent fallback - no console spam
          apiCallFailed = true
        }
      } catch (error) {
        // Silent fallback - no console spam
        apiCallFailed = true
      }
      
      // Handle API failure properly
      if (apiCallFailed) {
        console.error('Failed to load locations from API')
        setLocations([])
        setLoading(false)
        return
      }
      
    } catch (error) {
      // Handle errors without mock data
      console.error('Error loading locations:', error)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocation = () => {
    setShowAddModal(true)
  }

  const handleLocationCreated = (newLocation) => {
    setLocations(prev => [...prev, newLocation])
    onLocationSelect(newLocation)
    setShowAddModal(false)
  }

  if (!user || !['SHOP_OWNER', 'ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(userRole)) {
    return null
  }

  return (
    <>
      <div className="relative flex-1 sm:flex-initial">
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Select Location
        </label>
        <Menu as="div" className="relative w-full">
          <div>
            <Menu.Button className="inline-flex items-center justify-between w-full sm:min-w-[200px] px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500">
              <div className="flex items-center space-x-2">
                {loading ? (
                  <ArrowPathIcon className="h-4 w-4 text-gray-500 animate-spin" />
                ) : (
                  <BuildingStorefrontIcon className="h-4 w-4 text-gray-500" />
                )}
                <span className="truncate">
                  {loading ? 'Loading...' : selectedLocation ? selectedLocation.name : 'Select Location'}
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
                {/* Existing Locations */}
                {locations.map((location) => (
                  <Menu.Item key={location.id}>
                    {({ active }) => (
                      <button
                        onClick={() => onLocationSelect(location)}
                        className={`
                          ${active ? 'bg-gray-100' : ''}
                          group flex w-full items-center px-4 py-3 text-sm text-gray-700
                        `}
                      >
                        <BuildingStorefrontIcon className="mr-3 h-4 w-4 text-gray-400" />
                        <div className="flex-1 text-left">
                          <p className="font-medium">{location.name}</p>
                          <p className="text-xs text-gray-500">{location.location || 'Location not set'}</p>
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
                        disabled={loading}
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
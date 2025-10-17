'use client'

import { 
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  CogIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useUnifiedContext } from '@/contexts/UnifiedContextProvider'
import { toast, useToast } from '@/hooks/use-toast'
import Toast from '@/components/Toast'
// Removed GlobalDashboardContext dependency - using own API endpoint
import AddLocationModal from '@/components/modals/AddLocationModal'

export default function EnterpriseLocations() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { refreshAvailableContexts } = useUnifiedContext()
  const { toasts, dismiss } = useToast()
  
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState(null)
  const [deletingLocation, setDeletingLocation] = useState(null)

  // Load locations using our own API endpoint with enhanced error handling
  const loadLocations = async (retryCount = 0) => {
    if (!user) return
    
    const maxRetries = 3
    
    try {
      setLoading(true)
      if (retryCount === 0) {
        setError(null) // Only clear error on first attempt
      }
      
      console.log(`[Enterprise Locations Page] Loading locations for user: ${user.id} (attempt ${retryCount + 1})`)
      
      // Enhanced permission check with profile validation
      if (!profile) {
        console.log('[Enterprise Locations Page] Profile not loaded yet, waiting...')
        // If profile isn't loaded, wait a bit and retry (unless we've exceeded retries)
        if (retryCount < maxRetries) {
          setTimeout(() => loadLocations(retryCount + 1), 1000 * (retryCount + 1))
        } else {
          throw new Error('Unable to load user profile after multiple attempts. Please refresh the page.')
        }
        return
      }

      if (!['ENTERPRISE_OWNER', 'SUPER_ADMIN'].includes(profile.role)) {
        setError('You do not have permission to access enterprise location management.')
        setLoading(false)
        return
      }
      
      console.log(`[Enterprise Locations Page] User has ${profile.role} role, proceeding with unified API call`)
      
      const response = await fetch('/api/user/locations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'  // Include cookies for server-side authentication
      })
      
      console.log('[Enterprise Locations Page] Unified API response status:', response.status)
      
      const result = await response.json()
      console.log('[Enterprise Locations Page] Unified API result:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        error: result.error,
        meta: result.meta,
        accessMethod: result.meta?.accessMethod
      })
      
      if (!response.ok) {
        // Provide specific error messages based on status code and response
        let errorMessage = result.error || `Failed to load locations (HTTP ${response.status})`
        
        if (response.status === 401) {
          errorMessage = 'Your session has expired. Please log in again.'
        } else if (response.status === 403) {
          errorMessage = 'You do not have permission to access enterprise locations. Please contact your administrator.'
        } else if (response.status === 503) {
          errorMessage = 'The enterprise location system is temporarily unavailable. Please try again later.'
        } else if (response.status >= 500) {
          errorMessage = 'Server error occurred while loading locations. Please try again or contact support.'
          
          // Retry server errors
          if (retryCount < maxRetries) {
            console.log(`[Enterprise Locations Page] Server error, retrying in ${(retryCount + 1) * 2} seconds...`)
            setTimeout(() => loadLocations(retryCount + 1), 2000 * (retryCount + 1))
            return
          } else {
            errorMessage += ` (Failed after ${maxRetries + 1} attempts)`
          }
        } else if (result.details) {
          errorMessage += `: ${result.details}`
        }
        
        throw new Error(errorMessage)
      }
      
      if (result.success) {
        setLocations(result.data || [])
        console.log(`[Enterprise Locations Page] Successfully loaded ${result.data?.length || 0} locations using ${result.meta?.accessMethod || 'unknown'} access method`)
        
        // Clear any previous errors on successful load
        setError(null)
      } else {
        throw new Error(result.error || 'API returned unsuccessful response')
      }
      
    } catch (err) {
      console.error(`[Enterprise Locations Page] Error loading locations (attempt ${retryCount + 1}):`, err)
      
      // For network errors, retry if we haven't exceeded max attempts
      if ((err.name === 'TypeError' || err.message.includes('fetch')) && retryCount < maxRetries) {
        console.log(`[Enterprise Locations Page] Network error, retrying in ${(retryCount + 1) * 2} seconds...`)
        setTimeout(() => loadLocations(retryCount + 1), 2000 * (retryCount + 1))
        return
      }
      
      // Set error message
      let displayError = err.message
      if (retryCount > 0) {
        displayError += ` (After ${retryCount + 1} attempts)`
      }
      setError(displayError)
    } finally {
      setLoading(false)
    }
  }

  // Load locations when component mounts or user/profile changes
  useEffect(() => {
    if (user && profile) {
      loadLocations()
    }
  }, [user, profile])

  // Refresh locations when needed
  const handleRefreshLocations = async () => {
    await loadLocations()
  }

  const handleEditLocation = (location) => {
    setEditingLocation(location)
    setShowEditModal(true)
  }

  const handleDeleteLocation = (location) => {
    setDeletingLocation(location)
    setShowDeleteModal(true)
  }

  const handleLocationSettings = (location) => {
    // Navigate to location settings with context
    router.push(`/shop/settings/location?location_id=${location.id}&location_name=${encodeURIComponent(location.name)}`)
  }

  const handleBusinessHours = (location) => {
    // Navigate to business hours settings with context
    router.push(`/shop/settings/hours?location_id=${location.id}&location_name=${encodeURIComponent(location.name)}`)
  }

  const confirmDelete = async () => {
    if (!deletingLocation) return
    
    const locationName = deletingLocation.name
    
    try {
      setLoading(true)
      console.log(`[Location Delete] Starting delete for: ${locationName}`)
      
      const response = await fetch('/api/user/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',  // Include cookies for server-side authentication
        body: JSON.stringify({
          action: 'deleteLocation',
          locationId: deletingLocation.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete location')
      }

      console.log(`[Location Delete] ✅ Successfully deleted: ${locationName}`)
      
      // Show success toast
      toast({
        title: 'Location Deleted Successfully!',
        description: `"${locationName}" has been permanently deleted.`,
        variant: 'success',
        duration: 4000
      })

      // Close modal and clear state first for immediate feedback
      setShowDeleteModal(false)
      setDeletingLocation(null)
      
      // Then refresh locations list
      await loadLocations()
      
    } catch (err) {
      console.error('Error deleting location:', err)
      
      // Show error toast instead of alert
      toast({
        title: 'Failed to Delete Location',
        description: err.message || 'An unexpected error occurred while deleting the location.',
        variant: 'destructive',
        duration: 6000
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'maintenance':
        return <ExclamationCircleIcon className="h-5 w-5 text-yellow-500" />
      case 'inactive':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <CheckCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'maintenance':
        return 'bg-yellow-100 text-yellow-800'
      case 'inactive':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Show loading while authentication is being established
  if (!user || !profile || loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && locations.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Locations</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={handleRefreshLocations}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Location Management</h1>
          <p className="text-gray-600 mt-1">Manage all barbershop locations and their settings</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 text-sm font-medium flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add Location</span>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <BuildingStorefrontIcon className="h-8 w-8 text-olive-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Locations</p>
              <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.filter(l => l.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.reduce((total, location) => total + (location.staff?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-gray-900">
                {locations.length > 0 ? 
                  (locations.reduce((total, location) => total + (location.metrics?.rating || 0), 0) / locations.length).toFixed(1)
                  : '0.0'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {locations.map((location) => (
          <div key={location.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Location Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-olive-100 rounded-lg flex items-center justify-center">
                    <BuildingStorefrontIcon className="h-6 w-6 text-olive-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{location.name}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon(location.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(location.status)}`}>
                        {location.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button 
                    onClick={() => setSelectedLocation(location)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    title="View location details and metrics"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleEditLocation(location)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" 
                    title="Quick edit basic info (name, address, phone)"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleLocationSettings(location)}
                    className="p-2 text-blue-400 hover:text-blue-600 rounded-lg hover:bg-blue-50" 
                    title="Advanced location settings (coordinates, timezone, accessibility)"
                  >
                    <CogIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleBusinessHours(location)}
                    className="p-2 text-green-400 hover:text-green-600 rounded-lg hover:bg-green-50" 
                    title="Manage business hours and scheduling"
                  >
                    <CalendarDaysIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteLocation(location)}
                    className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50" 
                    title="Delete location (cannot be undone)"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Location Details */}
            <div className="p-6 space-y-4">
              <div className="flex items-start space-x-3">
                <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                <span className="text-sm text-gray-600">{location.address}</span>
              </div>
              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{location.phone}</span>
              </div>
              <div className="flex items-center space-x-3">
                <UserGroupIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600">{location.staff?.length || 0} staff members</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">Manager: {location.manager}</span>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-gray-900">${location.metrics?.revenue?.toLocaleString() || '0'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Appointments</p>
                  <p className="text-lg font-semibold text-gray-900">{location.metrics?.bookings || 0}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Location Detail Modal */}
      {selectedLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedLocation.name}</h2>
                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Location Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mt-0.5" />
                    <span className="text-gray-700">{selectedLocation.address}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">{selectedLocation.phone}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <UserGroupIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-700">Manager: {selectedLocation.manager}</span>
                  </div>
                </div>
              </div>

              {/* Business Hours */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Business Hours</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(selectedLocation.hours || {}).map(([day, hours]) => (
                    <div key={day} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="capitalize font-medium text-gray-700">{day}</span>
                      <span className="text-gray-600">
                        {typeof hours === 'object' && hours ? 
                          `${hours.open} - ${hours.close}` : 
                          hours || 'Not set'
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Monthly Revenue</p>
                    <p className="text-xl font-semibold text-gray-900">${selectedLocation.metrics?.revenue?.toLocaleString() || '0'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Appointments</p>
                    <p className="text-xl font-semibold text-gray-900">{selectedLocation.metrics?.bookings || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Staff Count</p>
                    <p className="text-xl font-semibold text-gray-900">{selectedLocation.staff?.length || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="text-xl font-semibold text-gray-900">{selectedLocation.metrics?.rating || 0} ⭐</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button 
                onClick={() => {
                  setEditingLocation(selectedLocation)
                  setShowEditModal(true) 
                  setSelectedLocation(null)  // Close detail modal
                }}
                className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
              >
                Edit Location
              </button>
              <button 
                onClick={() => setSelectedLocation(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Location Modal */}
      <AddLocationModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onLocationCreated={async (newLocation) => {
          await loadLocations()
          setShowAddModal(false)
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                  <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-base font-semibold leading-6 text-gray-900">
                    Delete Location
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to delete "{deletingLocation.name}"? This action cannot be undone and will remove all associated data.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex space-x-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingLocation(null)
                }}
                className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={loading}
                className="inline-flex justify-center items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && editingLocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Location</h2>
            </div>
            <div className="p-6">
              <form onSubmit={async (e) => {
                e.preventDefault()
                console.log('🚀 [Location Edit Form] Form submission started')
                
                const formData = new FormData(e.target)
                const locationName = formData.get('name') || editingLocation.name
                
                console.log('📋 [Location Edit Form] Form data extracted:', {
                  name: formData.get('name'),
                  address: formData.get('address'),
                  city: formData.get('city'),
                  state: formData.get('state'),
                  zipCode: formData.get('zipCode'),
                  phone: formData.get('phone'),
                  email: formData.get('email'),
                  editingLocationId: editingLocation.id,
                  locationName
                })
                
                // Prepare updated data
                const updatedData = {
                  name: formData.get('name'),
                  address: formData.get('address'),
                  city: formData.get('city'),
                  state: formData.get('state'),
                  zipCode: formData.get('zipCode'),
                  phone: formData.get('phone'),
                  email: formData.get('email')
                }
                
                console.log('📦 [Location Edit Form] Prepared update data:', updatedData)

                // 1. OPTIMISTIC UPDATE - Update UI immediately for better UX
                console.log('⚡ [Location Edit Form] Starting optimistic update')
                const optimisticLocation = { ...editingLocation, ...updatedData }
                const previousLocations = locations // Store for potential rollback
                
                console.log('🔄 [Location Edit Form] Applying optimistic location update:', {
                  originalLocation: editingLocation,
                  optimisticLocation,
                  previousLocationsCount: previousLocations.length
                })
                
                setLocations(prevLocations =>
                  prevLocations.map(loc =>
                    loc.id === editingLocation.id ? optimisticLocation : loc
                  )
                )
                
                // 2. IMMEDIATE UI FEEDBACK - Close modal right away
                console.log('🚪 [Location Edit Form] Closing modal for immediate feedback')
                setShowEditModal(false)
                setEditingLocation(null)
                
                console.log(`✅ [Location Edit Form] Optimistic update completed for: ${locationName}`)

                // 3. BACKGROUND SERVER SYNC
                try {
                  setLoading(true)
                  console.log(`🌐 [Location Edit Form] Starting server sync for: ${locationName}`)
                  
                  const requestBody = {
                    action: 'updateLocation',
                    locationId: editingLocation.id,
                    data: {
                      name: updatedData.name,
                      address: updatedData.address,
                      city: updatedData.city,
                      state: updatedData.state,
                      zip_code: updatedData.zipCode,
                      phone: updatedData.phone,
                      email: updatedData.email
                    }
                  }
                  
                  console.log('📤 [Location Edit Form] Sending POST request to /api/user/locations:', requestBody)
                  
                  const response = await fetch('/api/user/locations', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify(requestBody)
                  })
                  
                  console.log('📥 [Location Edit Form] API Response received:', {
                    status: response.status,
                    statusText: response.statusText,
                    ok: response.ok,
                    headers: Object.fromEntries(response.headers.entries())
                  })

                  const result = await response.json()
                  console.log('📋 [Location Edit Form] API Response body:', result)

                  if (!response.ok) {
                    console.error('❌ [Location Edit Form] API request failed:', {
                      status: response.status,
                      statusText: response.statusText,
                      error: result.error,
                      details: result.details
                    })
                    throw new Error(result.error || 'Failed to update location')
                  }

                  console.log(`✅ [Location Edit Form] Server sync successful: ${locationName}`)
                  
                  // 4. REFRESH CONTEXT - Update context selector
                  try {
                    console.log('🔄 [Location Edit Form] Refreshing context selector...')
                    await refreshAvailableContexts()
                    console.log(`✅ [Location Edit Form] Context refreshed for unified state`)
                  } catch (contextError) {
                    console.warn(`⚠️ [Location Edit Form] Context refresh failed (non-critical):`, contextError)
                  }
                  
                  // Show success toast
                  console.log('🎉 [Location Edit Form] Showing success toast')
                  toast({
                    title: 'Location Updated Successfully!',
                    description: `"${locationName}" has been updated with your changes.`,
                    variant: 'success',
                    duration: 4000
                  })
                  
                } catch (err) {
                  console.error('💥 [Location Edit Form] Server sync failed:', {
                    error: err,
                    message: err.message,
                    stack: err.stack,
                    name: err.name
                  })
                  
                  // 5. ROLLBACK OPTIMISTIC UPDATE on error
                  console.log(`🔄 [Location Edit Form] Rolling back optimistic update due to error`)
                  setLocations(previousLocations)
                  console.log('↩️ [Location Edit Form] Optimistic update rolled back')
                  
                  // Show error toast
                  console.log('🚨 [Location Edit Form] Showing error toast')
                  toast({
                    title: 'Failed to Update Location',
                    description: err.message || 'An unexpected error occurred. Your changes have been reverted.',
                    variant: 'destructive',
                    duration: 6000
                  })
                  
                  // Reopen modal for retry
                  console.log('🔄 [Location Edit Form] Reopening modal for retry')
                  setEditingLocation(editingLocation)
                  setShowEditModal(true)
                } finally {
                  setLoading(false)
                  console.log('🏁 [Location Edit Form] Form submission completed')
                }
              }} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Location Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    defaultValue={editingLocation.name}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    defaultValue={editingLocation.address}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City *
                    </label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      defaultValue={editingLocation.city}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                      required
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State *
                    </label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      defaultValue={editingLocation.state}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                      maxLength="2"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      id="zipCode"
                      name="zipCode"
                      defaultValue={editingLocation.zip_code}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      defaultValue={editingLocation.phone}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    defaultValue={editingLocation.email}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  />
                </div>
                
                <div className="flex space-x-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false)
                      setEditingLocation(null)
                    }}
                    className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center items-center rounded-md bg-olive-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading && (
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {loading ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div 
        aria-live="assertive"
        className="fixed inset-0 flex items-end justify-center px-4 py-6 pointer-events-none sm:p-6 sm:items-start sm:justify-end z-50"
      >
        <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
          {toasts.map((toastData) => (
            <Toast
              key={toastData.id}
              id={toastData.id}
              type={toastData.variant === 'success' ? 'success' : toastData.variant === 'destructive' ? 'error' : 'info'}
              title={toastData.title}
              message={toastData.description}
              show={toastData.open}
              onClose={dismiss}
              duration={toastData.duration || 5000}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
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
  XCircleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function EnterpriseLocations() {
  const { user, profile } = useAuth()
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/enterprise/locations')
      const result = await response.json()
      
      if (result.success) {
        setLocations(result.data)
      } else {
        throw new Error(result.error || 'Failed to load locations')
      }
    } catch (err) {
      console.error('Error loading locations:', err)
      setError(err.message)
      // Set mock data for development
      setLocations([
        {
          id: 1,
          name: 'Downtown Location',
          address: '123 Main St, Downtown, NY 10001',
          phone: '(555) 123-4567',
          status: 'active',
          manager: 'John Smith',
          staff_count: 8,
          revenue: 15420,
          appointments: 89,
          rating: 4.8,
          hours: {
            mon: '9:00 AM - 8:00 PM',
            tue: '9:00 AM - 8:00 PM',
            wed: '9:00 AM - 8:00 PM',
            thu: '9:00 AM - 8:00 PM',
            fri: '9:00 AM - 9:00 PM',
            sat: '8:00 AM - 9:00 PM',
            sun: '10:00 AM - 6:00 PM'
          }
        },
        {
          id: 2,
          name: 'Mall Location',
          address: '456 Shopping Blvd, Mall Plaza, NY 10002',
          phone: '(555) 234-5678',
          status: 'active',
          manager: 'Sarah Johnson',
          staff_count: 6,
          revenue: 12380,
          appointments: 67,
          rating: 4.6,
          hours: {
            mon: '10:00 AM - 9:00 PM',
            tue: '10:00 AM - 9:00 PM',
            wed: '10:00 AM - 9:00 PM',
            thu: '10:00 AM - 9:00 PM',
            fri: '10:00 AM - 10:00 PM',
            sat: '9:00 AM - 10:00 PM',
            sun: '11:00 AM - 8:00 PM'
          }
        },
        {
          id: 3,
          name: 'Uptown Branch',
          address: '789 Uptown Ave, Uptown, NY 10003',
          phone: '(555) 345-6789',
          status: 'maintenance',
          manager: 'Mike Wilson',
          staff_count: 4,
          revenue: 9850,
          appointments: 54,
          rating: 4.7,
          hours: {
            mon: 'Closed',
            tue: 'Closed',
            wed: 'Closed',
            thu: 'Closed',
            fri: 'Closed',
            sat: 'Closed',
            sun: 'Closed'
          }
        }
      ])
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

  if (loading) {
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
            onClick={loadLocations}
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
                {locations.reduce((total, location) => total + (location.staff_count || 0), 0)}
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
                  (locations.reduce((total, location) => total + (location.rating || 0), 0) / locations.length).toFixed(1)
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
                    title="View Details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100" title="Edit">
                    <PencilIcon className="h-4 w-4" />
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
                <span className="text-sm text-gray-600">{location.staff_count} staff members</span>
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
                  <p className="text-lg font-semibold text-gray-900">${location.revenue?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Appointments</p>
                  <p className="text-lg font-semibold text-gray-900">{location.appointments}</p>
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
                      <span className="text-gray-600">{hours}</span>
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
                    <p className="text-xl font-semibold text-gray-900">${selectedLocation.revenue?.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Appointments</p>
                    <p className="text-xl font-semibold text-gray-900">{selectedLocation.appointments}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Staff Count</p>
                    <p className="text-xl font-semibold text-gray-900">{selectedLocation.staff_count}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Rating</p>
                    <p className="text-xl font-semibold text-gray-900">{selectedLocation.rating} ⭐</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button className="flex-1 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
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
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Add New Location</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">This feature will allow you to add a new barbershop location to your enterprise.</p>
              <div className="text-center py-8">
                <BuildingStorefrontIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Add Location feature coming soon</p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex space-x-3">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
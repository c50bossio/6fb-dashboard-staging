'use client'

import { 
  ScissorsIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import ServiceManager from '@/components/services/ServiceManager'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { getBarberPermissions, getPermissionLevel } from '@/lib/permissions'

export default function BarberServices() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState(null)
  const [barbershopId, setBarbershopId] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadBarberData()
  }, [user])

  const loadBarberData = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      const shopId = await getBarberBarbershop()
      if (!shopId) {
        setError('No barbershop association found. Please contact your shop owner.')
        return
      }
      
      setBarbershopId(shopId)
      
      const perms = await getBarberPermissions(user.id, shopId)
      setPermissions(perms)
      
    } catch (error) {
      console.error('Error loading barber data:', error)
      setError('Failed to load barber information.')
    } finally {
      setLoading(false)
    }
  }

  const getBarberBarbershop = async () => {
    
    if (profile?.barbershop_id) {
      return profile.barbershop_id
    }
    
    return null
  }

  const permissionLevel = permissions ? getPermissionLevel(permissions) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Access Error</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-gold-100 flex items-center justify-center">
              <ScissorsIcon className="h-8 w-8 text-gold-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Services</h1>
              <p className="text-gray-600">Manage your personal service offerings and pricing</p>
            </div>
          </div>
          
          {/* Permission Level Badge */}
          {permissionLevel && (
            <div className="flex items-center space-x-2">
              <ShieldCheckIcon className={`h-6 w-6 text-${permissionLevel.color}-600`} />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{permissionLevel.description}</p>
                <p className="text-xs text-gray-500">Permission Level</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Permission Info Panel */}
      {permissions && !permissions.is_active && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start">
            <InformationCircleIcon className="h-6 w-6 text-amber-800 mt-1 mr-3" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900">Limited Access</h3>
              <p className="text-yellow-800 mb-3">
                You currently have basic permissions. Contact your shop owner to request additional service management permissions.
              </p>
              <div className="text-sm text-yellow-700">
                <p><strong>What you can do:</strong></p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>View your schedule and availability</li>
                  <li>Manage your personal calendar</li>
                  <li>View your performance analytics</li>
                  <li>See your commission details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Summary for Active Users */}
      {permissions && permissions.is_active && (
        <div className="mb-6 bg-olive-50 border border-olive-200 rounded-lg p-6">
          <div className="flex items-start">
            <ShieldCheckIcon className="h-6 w-6 text-olive-600 mt-1 mr-3" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-olive-900">Your Service Permissions</h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Service Management */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900 mb-2">Service Management</h4>
                  <ul className="text-sm space-y-1">
                    <li className={permissions.can_create_services ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_create_services ? '✓' : '✗'} Create new services
                    </li>
                    <li className={permissions.can_modify_services ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_modify_services ? '✓' : '✗'} Modify existing services
                    </li>
                    <li className={permissions.can_modify_service_descriptions ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_modify_service_descriptions ? '✓' : '✗'} Edit descriptions
                    </li>
                  </ul>
                </div>

                {/* Pricing Control */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900 mb-2">Pricing Control</h4>
                  <ul className="text-sm space-y-1">
                    <li className={permissions.can_set_pricing ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_set_pricing ? '✓' : '✗'} Set custom pricing
                    </li>
                    {permissions.can_set_pricing && (
                      <li className="text-olive-600">
                        ±{permissions.pricing_variance_percent}% variance allowed
                      </li>
                    )}
                    <li className={permissions.can_set_service_duration ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_set_service_duration ? '✓' : '✗'} Adjust duration
                    </li>
                  </ul>
                </div>

                {/* Advanced Features */}
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h4 className="font-medium text-gray-900 mb-2">Advanced Features</h4>
                  <ul className="text-sm space-y-1">
                    <li className={permissions.can_upload_portfolio_images ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_upload_portfolio_images ? '✓' : '✗'} Upload portfolio images
                    </li>
                    <li className={permissions.can_create_promotions ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_create_promotions ? '✓' : '✗'} Create promotions
                    </li>
                    <li className={permissions.can_modify_booking_rules ? 'text-green-600' : 'text-gray-400'}>
                      {permissions.can_modify_booking_rules ? '✓' : '✗'} Modify booking rules
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Manager Component */}
      {barbershopId && (
        <ServiceManager
          userRole="BARBER"
          userId={user?.id}
          barbershopId={barbershopId}
          permissions={permissions}
          onServiceUpdate={loadBarberData}
        />
      )}

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need More Access?</h3>
        <p className="text-gray-600 mb-4">
          If you need additional permissions to manage your services, pricing, or schedule, 
          contact your shop owner. They can grant you expanded access based on your role and experience.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Basic Level</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• View schedule</li>
              <li>• Set availability</li>
              <li>• View analytics</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Intermediate Level</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Modify services</li>
              <li>• Limited pricing (±10%)</li>
              <li>• Client management</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Advanced Level</h4>
            <ul className="text-gray-600 space-y-1">
              <li>• Full service control</li>
              <li>• Flexible pricing (±20%)</li>
              <li>• Promotion creation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
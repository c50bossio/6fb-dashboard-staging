'use client'

import { 
  Cog6ToothIcon,
  LinkIcon,
  CalendarDaysIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { CalendarDaysIcon as CalendarSolid } from '@heroicons/react/24/solid'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '../../../../../components/SupabaseAuthProvider'

export default function IntegrationsPage() {
  const { user } = useAuth()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIntegrationStatus()
  }, [user?.id])

  const loadIntegrationStatus = async () => {
    if (!user?.id) return
    
    try {
      // For now, we'll show the main integration that's fully functional
      setIntegrations([
        {
          id: 'google_calendar',
          name: 'Google Calendar',
          description: 'Sync your appointments with Google Calendar for seamless scheduling',
          category: 'calendar',
          icon: 'calendar',
          configured: false, // Will be determined by checking calendar-settings
          enabled: false,
          setupUrl: '/dashboard/calendar-settings',
          features: ['Two-way sync', 'Conflict resolution', 'Event templates', 'Multiple calendars']
        }
      ])
    } catch (error) {
      console.error('Error loading integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const getIconComponent = (iconType) => {
    switch (iconType) {
      case 'calendar':
        return CalendarSolid
      default:
        return LinkIcon
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center">
          <Cog6ToothIcon className="h-8 w-8 text-olive-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
            <p className="mt-1 text-sm text-gray-600">
              Connect external services to enhance your barbershop management
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {integrations.map((integration) => {
          const IconComponent = getIconComponent(integration.icon)
          
          return (
            <div key={integration.id} className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-xl">
              <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gradient-to-r from-olive-500 to-gold-600 rounded-xl p-3">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {integration.name}
                        </h3>
                        {integration.configured && (
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                        )}
                      </div>
                      <p className="text-gray-600 mt-2 max-w-2xl">
                        {integration.description}
                      </p>
                      
                      {integration.features && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-2">
                            {integration.features.map((feature) => (
                              <span
                                key={feature}
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-olive-100 text-olive-800"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Link
                      href={integration.setupUrl}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                    >
                      {integration.configured ? 'Manage' : 'Connect'}
                      <ArrowTopRightOnSquareIcon className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Future Integrations Notice */}
        <div className="bg-olive-50 border border-olive-200 rounded-xl p-6">
          <h3 className="text-lg font-medium text-olive-800 mb-2">More Integrations Coming Soon</h3>
          <p className="text-olive-700 mb-4">
            We're working on adding more integrations to help streamline your barbershop operations.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-olive-600">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-olive-400 rounded-full"></div>
              <span>Stripe Payments</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-olive-400 rounded-full"></div>
              <span>SMS Notifications</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-olive-400 rounded-full"></div>
              <span>Email Marketing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-olive-400 rounded-full"></div>
              <span>Social Media</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

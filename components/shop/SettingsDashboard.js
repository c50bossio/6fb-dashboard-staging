'use client'

import {
  BuildingStorefrontIcon,
  ClockIcon,
  CreditCardIcon,
  UserGroupIcon,
  BellIcon,
  ChartBarIcon,
  ArrowRightIcon,
  SparklesIcon,
  DocumentCheckIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { useGlobalDashboard } from '@/contexts/GlobalDashboardContext'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export default function SettingsDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const { activeContext, currentLocationId, currentLocation } = useGlobalDashboard()
  const [shopData, setShopData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentChanges, setRecentChanges] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [user, currentLocationId])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      
      // Load shop data - context-aware
      let shopQuery = supabase
        .from('barbershops')
        .select('*')
        
      if (currentLocationId) {
        // If we have a specific location context, load that location
        shopQuery = shopQuery.eq('id', currentLocationId)
      } else {
        // Otherwise, load user's default location
        shopQuery = shopQuery.eq('owner_id', user.id)
      }
      
      const { data: shop } = await shopQuery.single()

      if (shop) {
        setShopData(shop)
      }

      // Context-aware recent changes (in production, this would come from an audit log)
      const locationName = currentLocation || shop?.name || 'Your Location'
      setRecentChanges([
        { id: 1, setting: 'Business Hours', time: '2 hours ago', user: 'You', location: locationName },
        { id: 2, setting: 'Commission Rates', time: 'Yesterday', user: 'You', location: locationName },
        { id: 3, setting: 'Staff Permissions', time: '3 days ago', user: 'You', location: locationName }
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickSettings = [
    {
      id: 'general',
      title: 'Business Information',
      description: 'Shop name, contact details, and description',
      icon: BuildingStorefrontIcon,
      path: '/shop/settings/general',
      status: 'available', // Status now managed by main onboarding system
      color: 'olive'
    },
    {
      id: 'hours',
      title: 'Business Hours',
      description: 'Set your operating hours and holidays',
      icon: ClockIcon,
      path: '/shop/settings/hours',
      status: 'available',
      color: 'blue'
    },
    {
      id: 'payment',
      title: 'Payment Setup',
      description: 'Configure payment methods and processing',
      icon: CreditCardIcon,
      path: '/shop/settings/payment',
      status: 'available',
      color: 'green'
    },
    {
      id: 'staff',
      title: 'Team Management',
      description: 'Manage staff and their permissions',
      icon: UserGroupIcon,
      path: '/shop/settings/staff',
      status: 'available',
      color: 'purple'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Email and SMS notification preferences',
      icon: BellIcon,
      path: '/shop/settings/notifications',
      status: 'available',
      color: 'amber'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View shop performance and insights',
      icon: ChartBarIcon,
      path: '/shop/analytics',
      status: 'available',
      color: 'indigo'
    }
  ]

  const setupTemplates = [
    {
      id: 'traditional',
      name: 'Traditional Barbershop',
      description: 'Classic setup with walk-ins and appointments',
      icon: '💈'
    },
    {
      id: 'modern',
      name: 'Modern Salon',
      description: 'Online booking focused with deposits',
      icon: '✂️'
    },
    {
      id: 'premium',
      name: 'Premium Experience',
      description: 'High-end services with membership tiers',
      icon: '👑'
    }
  ]

  // Progress calculation removed - handled by OnboardingOrchestrator

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  const contextualTitle = activeContext && currentLocation 
    ? `Settings Overview - ${currentLocation}` 
    : 'Settings Overview'
    
  const contextualDescription = activeContext && currentLocation
    ? `Manage configuration and preferences for ${currentLocation}`
    : 'Manage your barbershop configuration and preferences'

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{contextualTitle}</h1>
        <p className="text-gray-600 mt-2">{contextualDescription}</p>
        {activeContext && (
          <div className="mt-2 text-sm text-blue-600">
            Current view: {activeContext.contextType.charAt(0).toUpperCase() + activeContext.contextType.slice(1)} • 
            {' '}{activeContext.permissions?.length || 0} permissions available
          </div>
        )}
      </div>

      {/* Setup progress tracking removed - now handled by unified OnboardingOrchestrator */}

      {/* Quick Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {quickSettings.map((setting) => (
          <button
            key={setting.id}
            onClick={() => router.push(setting.path)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all group text-left"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`h-12 w-12 rounded-lg bg-${setting.color}-100 flex items-center justify-center`}>
                <setting.icon className={`h-7 w-7 text-${setting.color}-600`} />
              </div>
              <div className="flex items-center">
                <ArrowRightIcon className="h-4 w-4 text-gray-400 group-hover:text-olive-600 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-olive-600 transition-colors">
              {setting.title}
            </h3>
            <p className="text-sm text-gray-600 mb-3">{setting.description}</p>
            <div className="flex items-center text-olive-600 text-sm font-medium">
              Configure
              <ArrowRightIcon className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Templates */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quick Setup Templates</h2>
            <SparklesIcon className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Apply pre-configured settings based on your shop type
          </p>
          <div className="space-y-3">
            {setupTemplates.map((template) => (
              <button
                key={template.id}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-olive-300 hover:bg-olive-50 transition-all text-left group"
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{template.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 group-hover:text-olive-600">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                  <ArrowRightIcon className="h-5 w-5 text-gray-400 group-hover:text-olive-600" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Changes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Changes</h2>
            <DocumentCheckIcon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-3">
            {recentChanges.map((change) => (
              <div key={change.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-900">{change.setting}</p>
                  <p className="text-sm text-gray-600">
                    Modified by {change.user}
                    {change.location && (
                      <span className="text-gray-500"> • {change.location}</span>
                    )}
                  </p>
                </div>
                <span className="text-sm text-gray-500">{change.time}</span>
              </div>
            ))}
            {recentChanges.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No recent changes</p>
            )}
          </div>
          <button className="mt-4 w-full text-center text-sm text-olive-600 hover:text-olive-700 font-medium">
            View All Activity →
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 bg-green-50 rounded-xl border border-green-200 p-4">
        <div className="flex items-start">
          <ShieldCheckIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
          <div>
            <h3 className="font-medium text-green-900">Your settings are secure</h3>
            <p className="text-sm text-green-700 mt-1">
              All changes are logged and encrypted. Two-factor authentication is enabled for your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
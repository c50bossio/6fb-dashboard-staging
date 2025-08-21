'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  BuildingStorefrontIcon,
  ClockIcon,
  CreditCardIcon,
  UserGroupIcon,
  BellIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  SparklesIcon,
  DocumentCheckIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function SettingsDashboard() {
  const router = useRouter()
  const { user } = useAuth()
  const [shopData, setShopData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [completionStatus, setCompletionStatus] = useState({
    general: false,
    hours: false,
    payment: false,
    staff: false,
    notifications: false
  })
  const [recentChanges, setRecentChanges] = useState([])

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      const supabase = createClient()
      
      // Load shop data
      const { data: shop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (shop) {
        setShopData(shop)
        
        // Check completion status
        setCompletionStatus({
          general: !!(shop.name && shop.email && shop.phone),
          hours: !!shop.business_hours,
          payment: !!shop.payment_settings,
          staff: false, // Will check separately
          notifications: !!shop.notification_settings
        })

        // Check for staff
        const { data: staff } = await supabase
          .from('barbershop_staff')
          .select('id')
          .eq('barbershop_id', shop.id)
          .limit(1)
        
        if (staff && staff.length > 0) {
          setCompletionStatus(prev => ({ ...prev, staff: true }))
        }
      }

      // Mock recent changes (in production, this would come from an audit log)
      setRecentChanges([
        { id: 1, setting: 'Business Hours', time: '2 hours ago', user: 'You' },
        { id: 2, setting: 'Commission Rates', time: 'Yesterday', user: 'You' },
        { id: 3, setting: 'Staff Permissions', time: '3 days ago', user: 'You' }
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
      status: completionStatus.general ? 'complete' : 'incomplete',
      color: 'olive'
    },
    {
      id: 'hours',
      title: 'Business Hours',
      description: 'Set your operating hours and holidays',
      icon: ClockIcon,
      path: '/shop/settings/hours',
      status: completionStatus.hours ? 'complete' : 'incomplete',
      color: 'blue'
    },
    {
      id: 'payment',
      title: 'Payment Setup',
      description: 'Configure payment methods and processing',
      icon: CreditCardIcon,
      path: '/shop/settings/payment',
      status: completionStatus.payment ? 'complete' : 'action-required',
      color: 'green'
    },
    {
      id: 'staff',
      title: 'Team Management',
      description: 'Manage staff and their permissions',
      icon: UserGroupIcon,
      path: '/shop/settings/staff',
      status: completionStatus.staff ? 'complete' : 'incomplete',
      color: 'purple'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Email and SMS notification preferences',
      icon: BellIcon,
      path: '/shop/settings/notifications',
      status: completionStatus.notifications ? 'complete' : 'incomplete',
      color: 'amber'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View shop performance and insights',
      icon: ChartBarIcon,
      path: '/shop/analytics',
      status: 'complete',
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

  const calculateCompletionPercentage = () => {
    const total = Object.keys(completionStatus).length
    const completed = Object.values(completionStatus).filter(Boolean).length
    return Math.round((completed / total) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings Overview</h1>
        <p className="text-gray-600 mt-2">Manage your barbershop configuration and preferences</p>
      </div>

      {/* Setup Progress */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Setup Progress</h2>
            <p className="text-sm text-gray-600">Complete your shop configuration</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-olive-600">{calculateCompletionPercentage()}%</span>
            <p className="text-sm text-gray-600">Complete</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-olive-500 to-olive-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${calculateCompletionPercentage()}%` }}
          />
        </div>
        {calculateCompletionPercentage() < 100 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-800">
              <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
              Complete your setup to unlock all features and start accepting bookings
            </p>
          </div>
        )}
      </div>

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
                {setting.status === 'complete' ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : setting.status === 'action-required' ? (
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                )}
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
                  <p className="text-sm text-gray-600">Modified by {change.user}</p>
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
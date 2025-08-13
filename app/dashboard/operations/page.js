'use client'

import { 
  ChartBarIcon,
  UserGroupIcon,
  ScissorsIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellIcon,
  CogIcon,
  HomeIcon,
  KeyIcon,
  BuildingStorefrontIcon,
  LightBulbIcon,
  WifiIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import Link from 'next/link'

import ProtectedRoute from '../../../components/ProtectedRoute'
import GlobalNavigation from '../../../components/GlobalNavigation'
import { useAuth } from '../../../components/SupabaseAuthProvider'

// Quick action items
const QUICK_ACTIONS = [
  { 
    name: 'Open Shop', 
    icon: KeyIcon, 
    color: 'bg-green-500 hover:bg-green-600',
    description: 'Start daily operations',
    href: '#'
  },
  { 
    name: 'Staff Check-in', 
    icon: UserGroupIcon, 
    color: 'bg-olive-500 hover:bg-olive-600',
    description: 'Mark staff attendance',
    href: '/dashboard/staff'
  },
  { 
    name: 'Capacity Planning', 
    icon: LightBulbIcon, 
    color: 'bg-olive-500 hover:bg-olive-600',
    description: 'AI-powered capacity optimization',
    href: '/dashboard/capacity-planning'
  },
  { 
    name: 'Daily Report', 
    icon: ChartBarIcon, 
    color: 'bg-amber-500 hover:bg-amber-600',
    description: 'View today\'s metrics',
    href: '/dashboard/analytics'
  }
]

// NO MOCK DATA - Operations data comes from real API calls

export default function OperationsPage() {
  const { user, profile } = useAuth()
  const [operationalData, setOperationalData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // Load real operations data from database
  useEffect(() => {
    loadOperationsData()
  }, [])

  const loadOperationsData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/operations/dashboard')
      const data = await response.json()
      
      if (data.success) {
        setOperationalData(data.data)
      } else {
        // NO MOCK DATA - show empty state when API fails
        setOperationalData({
          shopStatus: 'unknown',
          openTime: 'N/A',
          closeTime: 'N/A',
          currentStaff: 0,
          totalStaff: 0,
          todayAppointments: 0,
          completedAppointments: 0,
          upcomingAppointments: 0,
          walkInsToday: 0,
          todayRevenue: 0,
          yesterdayRevenue: 0,
          weekRevenue: 0,
          monthRevenue: 0,
          averageServiceTime: 0,
          customerSatisfaction: 0,
          staffUtilization: 0,
          chairUtilization: 0,
          lowStockItems: 0,
          pendingTasks: 0,
          unreadNotifications: 0,
          systemHealth: 'unknown',
          lastBackup: 'Unknown',
          peakHours: [],
          alerts: [],
          recentActivity: []
        })
      }
    } catch (error) {
      console.error('Failed to load operations data:', error)
      // Same empty state on error
      setOperationalData({
        shopStatus: 'error',
        openTime: 'N/A',
        closeTime: 'N/A',
        currentStaff: 0,
        totalStaff: 0,
        todayAppointments: 0,
        completedAppointments: 0,
        upcomingAppointments: 0,
        walkInsToday: 0,
        todayRevenue: 0,
        yesterdayRevenue: 0,
        weekRevenue: 0,
        monthRevenue: 0,
        averageServiceTime: 0,
        customerSatisfaction: 0,
        staffUtilization: 0,
        chairUtilization: 0,
        lowStockItems: 0,
        pendingTasks: 0,
        unreadNotifications: 0,
        systemHealth: 'error',
        lastBackup: 'Unknown',
        peakHours: [],
        alerts: [],
        recentActivity: []
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getRevenueChange = (current, previous) => {
    const change = ((current - previous) / previous) * 100
    return change.toFixed(1)
  }

  const getAlertIcon = (type) => {
    switch(type) {
      case 'warning': return ExclamationCircleIcon
      case 'success': return CheckCircleIcon
      default: return BellIcon
    }
  }

  const getAlertColor = (type) => {
    switch(type) {
      case 'warning': return 'text-amber-700 bg-amber-50'
      case 'success': return 'text-green-600 bg-green-50'
      default: return 'text-olive-600 bg-olive-50'
    }
  }

  // Show loading state
  if (loading) {
    return (
      <ProtectedRoute>
        <GlobalNavigation />
        <div className="min-h-screen bg-gray-50">
          <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
            <div className="py-8">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="bg-white rounded-lg p-6">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-8 bg-gray-200 rounded mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <GlobalNavigation />
      <div className="min-h-screen bg-gray-50">
        {/* Main Content - adjusting for sidebar */}
        <div className="lg:ml-80 transition-all duration-300 ease-in-out pt-16 lg:pt-0">
          <div className="py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Header */}
              <div className="mb-8">
                <div className="md:flex md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                      Operations Dashboard
                    </h1>
                    <p className="mt-2 text-lg text-gray-600">
                      Daily operations management and shop oversight
                    </p>
                  </div>
                  <div className="mt-4 flex items-center space-x-4 md:mt-0">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Current Time</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${
                      operationalData?.shopStatus === 'open' 
                        ? 'bg-moss-100 text-moss-900' 
                        : 'bg-softred-100 text-softred-900'
                    }`}>
                      <p className="text-sm font-medium">Shop Status</p>
                      <p className="text-lg font-bold uppercase">{operationalData?.shopStatus || 'Unknown'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {QUICK_ACTIONS.map((action) => (
                    <Link
                      key={action.name}
                      href={action.href}
                      className={`${action.color} rounded-lg p-4 text-white transition-colors hover:shadow-lg`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <action.icon className="h-8 w-8" />
                      </div>
                      <h3 className="font-semibold">{action.name}</h3>
                      <p className="text-sm opacity-90">{action.description}</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                    <span className={`text-sm font-medium flex items-center ${
                      getRevenueChange(operationalData?.todayRevenue || 0, operationalData?.yesterdayRevenue || 0) > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getRevenueChange(operationalData?.todayRevenue || 0, operationalData?.yesterdayRevenue || 0) > 0 ? (
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(getRevenueChange(operationalData?.todayRevenue || 0, operationalData?.yesterdayRevenue || 0))}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(operationalData?.todayRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Yesterday: {formatCurrency(operationalData?.yesterdayRevenue)}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CalendarIcon className="h-8 w-8 text-olive-600" />
                    <span className="text-sm font-medium text-gray-500">
                      {operationalData?.completedAppointments}/{operationalData?.todayAppointments}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{operationalData?.upcomingAppointments}</p>
                  <p className="text-xs text-gray-500 mt-1">Upcoming today</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <UserGroupIcon className="h-8 w-8 text-gold-600" />
                    <span className="text-sm font-medium text-gray-500">
                      {operationalData?.currentStaff}/{operationalData?.totalStaff}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Staff on Duty</p>
                  <p className="text-2xl font-bold text-gray-900">{operationalData?.staffUtilization}%</p>
                  <p className="text-xs text-gray-500 mt-1">Utilization rate</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <BuildingStorefrontIcon className="h-8 w-8 text-amber-700" />
                    <span className="text-sm font-medium text-gray-500">
                      {operationalData?.chairUtilization}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Shop Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">{operationalData?.walkInsToday}</p>
                  <p className="text-xs text-gray-500 mt-1">Walk-ins today</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Alerts & Notifications */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Alerts & Notifications</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      {operationalData?.alerts.map((alert, index) => {
                        const AlertIcon = getAlertIcon(alert.type)
                        return (
                          <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${getAlertColor(alert.type)}`}>
                            <AlertIcon className="h-5 w-5 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{alert.message}</p>
                              <p className="text-xs opacity-75 mt-1">{alert.time}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {operationalData?.recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-2 w-2 bg-olive-600 rounded-full mt-1.5"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                              <p className="text-sm text-gray-500">{activity.details}</p>
                              <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Status */}
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <WifiIcon className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-gray-700">Network</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">Online</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CogIcon className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-gray-700">System Health</span>
                        </div>
                        <span className="text-sm font-medium text-green-600">Good</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="h-5 w-5 text-olive-600" />
                          <span className="text-sm text-gray-700">Last Backup</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600">{operationalData?.lastBackup}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ScissorsIcon className="h-5 w-5 text-amber-700" />
                          <span className="text-sm text-gray-700">Low Stock Items</span>
                        </div>
                        <span className="text-sm font-medium text-amber-700">{operationalData?.lowStockItems}</span>
                      </div>
                    </div>
                  </div>

                  {/* Shop Hours */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Shop Hours</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Open</span>
                        <span className="text-sm font-medium text-gray-900">{operationalData?.openTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Close</span>
                        <span className="text-sm font-medium text-gray-900">{operationalData?.closeTime}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">Peak Hours</p>
                        {operationalData?.peakHours.map((hour, index) => (
                          <p key={index} className="text-sm text-gray-700">{hour}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">Avg Service Time</span>
                          <span className="text-sm font-medium text-gray-900">{operationalData?.averageServiceTime} min</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-olive-600 h-2 rounded-full" style={{width: '70%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">Customer Satisfaction</span>
                          <span className="text-sm font-medium text-gray-900">⭐ {operationalData?.customerSatisfaction}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: `${operationalData?.customerSatisfaction * 20}%`}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
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
    color: 'bg-blue-500 hover:bg-blue-600',
    description: 'Mark staff attendance',
    href: '/dashboard/staff'
  },
  { 
    name: 'Inventory Check', 
    icon: ScissorsIcon, 
    color: 'bg-purple-500 hover:bg-purple-600',
    description: 'Review stock levels',
    href: '/dashboard/inventory'
  },
  { 
    name: 'Daily Report', 
    icon: ChartBarIcon, 
    color: 'bg-amber-500 hover:bg-amber-600',
    description: 'View today\'s metrics',
    href: '/dashboard/analytics'
  }
]

// Mock operational data
const mockOperationalData = {
  shopStatus: 'open',
  openTime: '09:00 AM',
  closeTime: '07:00 PM',
  currentStaff: 3,
  totalStaff: 4,
  todayAppointments: 24,
  completedAppointments: 12,
  upcomingAppointments: 8,
  walkInsToday: 4,
  todayRevenue: 1420.00,
  yesterdayRevenue: 1285.00,
  weekRevenue: 6750.00,
  monthRevenue: 28450.00,
  averageServiceTime: 35,
  customerSatisfaction: 4.8,
  staffUtilization: 78,
  chairUtilization: 82,
  lowStockItems: 3,
  pendingTasks: 5,
  unreadNotifications: 2,
  systemHealth: 'good',
  lastBackup: '2 hours ago',
  peakHours: ['11:00 AM - 1:00 PM', '4:00 PM - 6:00 PM'],
  alerts: [
    { type: 'warning', message: 'Low stock: Hair gel (3 units left)', time: '30 min ago' },
    { type: 'info', message: 'Staff meeting scheduled for tomorrow 8:30 AM', time: '1 hour ago' },
    { type: 'success', message: 'Daily backup completed successfully', time: '2 hours ago' }
  ],
  recentActivity: [
    { action: 'Appointment completed', details: 'John Smith - Premium Haircut', time: '5 min ago' },
    { action: 'Walk-in registered', details: 'New customer - Mike Brown', time: '15 min ago' },
    { action: 'Payment processed', details: '$55.00 - Card payment', time: '20 min ago' },
    { action: 'Staff clocked in', details: 'Sarah Johnson started shift', time: '45 min ago' }
  ]
}

export default function OperationsPage() {
  const { user, profile } = useAuth()
  const [operationalData, setOperationalData] = useState(mockOperationalData)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

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
      case 'warning': return 'text-amber-600 bg-amber-50'
      case 'success': return 'text-green-600 bg-green-50'
      default: return 'text-blue-600 bg-blue-50'
    }
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
                      operationalData.shopStatus === 'open' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      <p className="text-sm font-medium">Shop Status</p>
                      <p className="text-lg font-bold uppercase">{operationalData.shopStatus}</p>
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
                      getRevenueChange(operationalData.todayRevenue, operationalData.yesterdayRevenue) > 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {getRevenueChange(operationalData.todayRevenue, operationalData.yesterdayRevenue) > 0 ? (
                        <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
                      )}
                      {Math.abs(getRevenueChange(operationalData.todayRevenue, operationalData.yesterdayRevenue))}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Today's Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(operationalData.todayRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Yesterday: {formatCurrency(operationalData.yesterdayRevenue)}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <CalendarIcon className="h-8 w-8 text-blue-600" />
                    <span className="text-sm font-medium text-gray-500">
                      {operationalData.completedAppointments}/{operationalData.todayAppointments}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Appointments</p>
                  <p className="text-2xl font-bold text-gray-900">{operationalData.upcomingAppointments}</p>
                  <p className="text-xs text-gray-500 mt-1">Upcoming today</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <UserGroupIcon className="h-8 w-8 text-purple-600" />
                    <span className="text-sm font-medium text-gray-500">
                      {operationalData.currentStaff}/{operationalData.totalStaff}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Staff on Duty</p>
                  <p className="text-2xl font-bold text-gray-900">{operationalData.staffUtilization}%</p>
                  <p className="text-xs text-gray-500 mt-1">Utilization rate</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <BuildingStorefrontIcon className="h-8 w-8 text-amber-600" />
                    <span className="text-sm font-medium text-gray-500">
                      {operationalData.chairUtilization}%
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-500">Shop Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">{operationalData.walkInsToday}</p>
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
                      {operationalData.alerts.map((alert, index) => {
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
                        {operationalData.recentActivity.map((activity, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-2 w-2 bg-blue-600 rounded-full mt-1.5"></div>
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
                          <ClockIcon className="h-5 w-5 text-blue-600" />
                          <span className="text-sm text-gray-700">Last Backup</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600">{operationalData.lastBackup}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <ScissorsIcon className="h-5 w-5 text-amber-600" />
                          <span className="text-sm text-gray-700">Low Stock Items</span>
                        </div>
                        <span className="text-sm font-medium text-amber-600">{operationalData.lowStockItems}</span>
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
                        <span className="text-sm font-medium text-gray-900">{operationalData.openTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Close</span>
                        <span className="text-sm font-medium text-gray-900">{operationalData.closeTime}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 mb-2">Peak Hours</p>
                        {operationalData.peakHours.map((hour, index) => (
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
                          <span className="text-sm font-medium text-gray-900">{operationalData.averageServiceTime} min</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{width: '70%'}}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">Customer Satisfaction</span>
                          <span className="text-sm font-medium text-gray-900">⭐ {operationalData.customerSatisfaction}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{width: `${operationalData.customerSatisfaction * 20}%`}}></div>
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
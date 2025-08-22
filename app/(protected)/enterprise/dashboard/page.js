'use client'

import { useState, useEffect } from 'react'
import { 
  ChartPieIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentChartBarIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function EnterpriseDashboard() {
  const { user, profile } = useAuth()
  const [enterpriseData, setEnterpriseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadEnterpriseData()
  }, [])

  const loadEnterpriseData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/enterprise/dashboard')
      const result = await response.json()
      
      if (result.success) {
        setEnterpriseData(result.data)
      } else {
        throw new Error(result.error || 'Failed to load enterprise data')
      }
    } catch (err) {
      console.error('Error loading enterprise data:', err)
      setError(err.message)
      // Set mock data for development
      setEnterpriseData({
        locations: [
          { id: 1, name: 'Downtown Location', revenue: 15420, appointments: 89, status: 'active' },
          { id: 2, name: 'Mall Location', revenue: 12380, appointments: 67, status: 'active' },
          { id: 3, name: 'Uptown Branch', revenue: 9850, appointments: 54, status: 'active' }
        ],
        totalRevenue: 37650,
        totalAppointments: 210,
        averageRating: 4.7,
        activeLocations: 3
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !enterpriseData) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Enterprise Dashboard</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
          <button 
            onClick={loadEnterpriseData}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const stats = [
    {
      name: 'Total Revenue',
      value: `$${enterpriseData?.totalRevenue?.toLocaleString() || '0'}`,
      icon: CurrencyDollarIcon,
      change: '+12%',
      changeType: 'positive'
    },
    {
      name: 'Active Locations',
      value: enterpriseData?.activeLocations || '0',
      icon: BuildingStorefrontIcon,
      change: '+1',
      changeType: 'positive'
    },
    {
      name: 'Total Appointments',
      value: enterpriseData?.totalAppointments || '0',
      icon: ClockIcon,
      change: '+8%',
      changeType: 'positive'
    },
    {
      name: 'Average Rating',
      value: enterpriseData?.averageRating || '0.0',
      icon: ArrowTrendingUpIcon,
      change: '+0.2',
      changeType: 'positive'
    }
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Dashboard</h1>
          <p className="text-gray-600 mt-1">Multi-location overview and analytics</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium">
            Export Report
          </button>
          <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 text-sm font-medium">
            Add Location
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className="h-12 w-12 bg-olive-100 rounded-lg flex items-center justify-center">
                <stat.icon className="h-6 w-6 text-olive-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">from last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Locations Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Location Performance</h2>
            <button className="text-sm text-olive-600 hover:text-olive-700 font-medium">
              View All Locations
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enterpriseData?.locations?.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BuildingStorefrontIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{location.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${location.revenue?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.appointments}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {location.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-olive-600 hover:text-olive-900 mr-3">
                      Manage
                    </button>
                    <button className="text-gray-600 hover:text-gray-900">
                      Analytics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New location added: Westside Branch</span>
              <span className="text-xs text-gray-400">2 hours ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Revenue milestone reached</span>
              <span className="text-xs text-gray-400">1 day ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="h-2 w-2 bg-amber-500 rounded-full"></div>
              <span className="text-sm text-gray-600">System maintenance scheduled</span>
              <span className="text-xs text-gray-400">3 days ago</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <span className="flex items-center space-x-2">
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium">Generate Report</span>
              </span>
              <ChartPieIcon className="h-4 w-4 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <span className="flex items-center space-x-2">
                <UserGroupIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium">Manage Staff</span>
              </span>
              <ChartPieIcon className="h-4 w-4 text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
              <span className="flex items-center space-x-2">
                <DocumentChartBarIcon className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium">View Analytics</span>
              </span>
              <ChartPieIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
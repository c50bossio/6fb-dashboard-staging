'use client'

import {
  BuildingOffice2Icon,
  ChartBarIcon,
  MapPinIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'

export default function EnterpriseDashboard() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/enterprise/dashboard')
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You must be an Enterprise Owner to access this dashboard')
        }
        throw new Error(`Failed to load dashboard: ${response.status}`)
      }

      const result = await response.json()
      setDashboardData(result.data)
    } catch (err) {
      console.error('Dashboard load error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ title, value, change, icon: Icon, color = 'blue' }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {change >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              <span>{Math.abs(change)}% vs last month</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}-50`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  )

  const LocationCard = ({ location }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{location.name}</h3>
          <p className="text-sm text-gray-600 flex items-center mt-1">
            <MapPinIcon className="h-4 w-4 mr-1" />
            {location.location}
          </p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center text-sm text-gray-600">
              <CalendarDaysIcon className="h-4 w-4 mr-1" />
              {location.performance?.bookings_this_month || 0} bookings
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <CurrencyDollarIcon className="h-4 w-4 mr-1" />
              ${(location.performance?.revenue_this_month || 0).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
            location.status === 'active' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {location.status}
          </span>
          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
            View Details
          </button>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-96"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
          <div className="h-96 bg-gray-200 rounded-xl animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">Dashboard Error</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const overview = dashboardData?.overview || {}
  const locations = dashboardData?.locations || []

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BuildingOffice2Icon className="h-8 w-8 text-blue-600 mr-3" />
              Enterprise Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Multi-location overview and management for your barbershop chain
            </p>
          </div>
          <div className="flex gap-3">
            <button className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              <EyeIcon className="h-4 w-4" />
              View Portal
            </button>
            <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              <PlusIcon className="h-4 w-4" />
              Add Location
            </button>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Locations"
          value={overview.total_locations || 0}
          icon={BuildingOffice2Icon}
          color="blue"
        />
        <StatCard
          title="Total Barbers"
          value={overview.total_barbers || 0}
          icon={UsersIcon}
          color="green"
        />
        <StatCard
          title="Total Customers"
          value={overview.total_customers || 0}
          icon={UsersIcon}
          color="purple"
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${(overview.monthly_revenue || 0).toLocaleString()}`}
          change={overview.revenue_change}
          icon={CurrencyDollarIcon}
          color="emerald"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Locations Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Your Locations</h2>
            <span className="text-sm text-gray-600">
              {locations.length} location{locations.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {locations.length === 0 ? (
            <div className="text-center py-8">
              <BuildingOffice2Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Locations Yet</h3>
              <p className="text-gray-600 mb-4">
                Add your first barbershop location to get started with enterprise management.
              </p>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Add Your First Location
              </button>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {locations.map((location) => (
                <LocationCard key={location.id} location={location} />
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats & Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Performance Overview</h2>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View Analytics
            </button>
          </div>
          
          <div className="space-y-6">
            {/* Monthly Performance */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">This Month</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Bookings</span>
                  <span className="font-semibold">{overview.monthly_bookings || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Avg Revenue/Location</span>
                  <span className="font-semibold">${(overview.avg_revenue_per_location || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Active Locations</span>
                  <span className="font-semibold">{dashboardData?.quick_stats?.locations_active || 0}</span>
                </div>
              </div>
            </div>

            {/* Growth Metrics */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Growth</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Revenue Growth</span>
                  <span className={`font-semibold ${
                    (dashboardData?.quick_stats?.revenue_change || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {(dashboardData?.quick_stats?.revenue_change || 0) >= 0 ? '+' : ''}
                    {dashboardData?.quick_stats?.revenue_change || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Customer Growth</span>
                  <span className={`font-semibold ${
                    (dashboardData?.quick_stats?.customer_growth || 0) >= 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {(dashboardData?.quick_stats?.customer_growth || 0) >= 0 ? '+' : ''}
                    {dashboardData?.quick_stats?.customer_growth || 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1">
                  → View Enterprise Website
                </button>
                <button className="w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1">
                  → Manage All Locations
                </button>
                <button className="w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1">
                  → Enterprise Analytics
                </button>
                <button className="w-full text-left text-sm text-gray-600 hover:text-blue-600 py-1">
                  → Settings & Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
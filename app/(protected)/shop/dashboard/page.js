'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  StarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UserPlusIcon,
  ScissorsIcon,
  BuildingStorefrontIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function ShopDashboard() {
  const { user, profile } = useAuth()
  const [shopData, setShopData] = useState(null)
  const [barbers, setBarbers] = useState([])
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalBookings: 0,
    todayBookings: 0,
    activeBarbers: 0,
    totalClients: 0,
    avgRating: 0,
    revenueChange: 0,
    bookingsChange: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadShopData()
  }, [user])

  const loadShopData = async () => {
    try {
      // Load shop information
      const shopResponse = await fetch('/api/shop/info')
      if (shopResponse.ok) {
        const shop = await shopResponse.json()
        setShopData(shop)
      }

      // Load barbers
      const barbersResponse = await fetch('/api/shop/barbers')
      if (barbersResponse.ok) {
        const { barbers } = await barbersResponse.json()
        setBarbers(barbers)
      }

      // Load metrics
      const metricsResponse = await fetch('/api/shop/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData)
      }
    } catch (error) {
      console.error('Error loading shop data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Shop Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 rounded-lg bg-indigo-100 flex items-center justify-center">
              <BuildingStorefrontIcon className="h-10 w-10 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {shopData?.name || 'My Barbershop'}
              </h1>
              <p className="text-gray-600">
                {shopData?.address && `${shopData.address}, ${shopData.city}, ${shopData.state}`}
              </p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <Link
              href="/shop/settings"
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Shop Settings
            </Link>
            <Link
              href="/shop/barbers/add"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Barber
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
            </div>
            <span className={`text-sm font-medium flex items-center ${
              metrics.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.revenueChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(metrics.revenueChange)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            ${metrics.monthlyRevenue.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-1">Monthly Revenue</p>
        </div>

        {/* Today's Bookings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
            </div>
            <span className={`text-sm font-medium flex items-center ${
              metrics.bookingsChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.bookingsChange >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />
              )}
              {Math.abs(metrics.bookingsChange)}%
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.todayBookings}</p>
          <p className="text-sm text-gray-600 mt-1">Today's Bookings</p>
        </div>

        {/* Active Barbers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ScissorsIcon className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.activeBarbers}</p>
          <p className="text-sm text-gray-600 mt-1">Active Barbers</p>
        </div>

        {/* Average Rating */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <StarIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.avgRating.toFixed(1)}</p>
          <p className="text-sm text-gray-600 mt-1">Average Rating</p>
        </div>
      </div>

      {/* Barbers Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Barbers</h2>
            <span className="text-sm text-gray-400">
              View All (Coming Soon)
            </span>
          </div>
        </div>
        
        <div className="p-6">
          {barbers.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {barbers.slice(0, 6).map((barber) => (
                <div key={barber.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {barber.users?.avatar_url ? (
                        <img 
                          src={barber.users.avatar_url} 
                          alt={barber.users.full_name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <UserGroupIcon className="h-6 w-6 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {barber.users?.full_name || 'Unnamed Barber'}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {barber.users?.email}
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs">
                        <span className="flex items-center text-gray-500">
                          <CalendarDaysIcon className="h-3 w-3 mr-1" />
                          {barber.bookings_today || 0} today
                        </span>
                        <span className="flex items-center text-gray-500">
                          <CurrencyDollarIcon className="h-3 w-3 mr-1" />
                          ${barber.revenue_today || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex space-x-2">
                    <button
                      className="flex-1 text-center py-1.5 text-sm text-gray-400 bg-gray-100 rounded cursor-not-allowed"
                      disabled
                    >
                      View Details
                    </button>
                    <button
                      className="flex-1 text-center py-1.5 text-sm text-gray-600 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      Schedule
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No barbers added yet</p>
              <Link
                href="/shop/barbers/add"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Add Your First Barber
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/shop/bookings"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center space-x-3"
        >
          <CalendarDaysIcon className="h-8 w-8 text-indigo-600" />
          <div>
            <p className="font-medium text-gray-900">Manage Bookings</p>
            <p className="text-sm text-gray-600">View and manage appointments</p>
          </div>
        </Link>

        <Link
          href="/shop/financial"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center space-x-3"
        >
          <CreditCardIcon className="h-8 w-8 text-green-600" />
          <div>
            <p className="font-medium text-gray-900">Financial Overview</p>
            <p className="text-sm text-gray-600">Track revenue & commissions</p>
          </div>
        </Link>

        <Link
          href="/shop/services"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center space-x-3"
        >
          <ScissorsIcon className="h-8 w-8 text-purple-600" />
          <div>
            <p className="font-medium text-gray-900">Services & Pricing</p>
            <p className="text-sm text-gray-600">Manage shop services</p>
          </div>
        </Link>

        <Link
          href="/shop/analytics"
          className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex items-center space-x-3"
        >
          <ChartBarIcon className="h-8 w-8 text-orange-600" />
          <div>
            <p className="font-medium text-gray-900">Analytics</p>
            <p className="text-sm text-gray-600">View detailed insights</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
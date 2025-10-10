'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChartBarIcon, CalendarIcon, ArrowPathIcon, LinkIcon } from '@heroicons/react/24/outline'
import { CurrencyDollarIcon } from '@heroicons/react/24/solid'
import BookingSourceBreakdown from '@/components/staff/BookingSourceBreakdown'

/**
 * Barber Analytics Page
 * Barbers can view their own booking performance (RBAC enforced)
 */
export default function BarberAnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState(null)
  const [profile, setProfile] = useState(null)
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    })
  }, [])

  // Fetch analytics data
  const fetchAnalytics = async () => {
    if (!dateRange.start || !dateRange.end) return

    setIsLoading(true)
    setError(null)

    try {
      // Get user profile first
      const profileResponse = await fetch('/api/profile')
      const profileData = await profileResponse.json()

      if (!profileResponse.ok) {
        throw new Error(profileData.error || 'Failed to fetch profile')
      }

      // Verify user is a barber
      if (profileData.profile.role !== 'BARBER') {
        router.push('/dashboard')
        return
      }

      setProfile(profileData.profile)

      // Fetch analytics (will only return barber's own data due to RLS)
      const analyticsResponse = await fetch(
        `/api/admin/staff/analytics?start_date=${dateRange.start}&end_date=${dateRange.end}`
      )

      const analyticsData = await analyticsResponse.json()

      if (!analyticsResponse.ok) {
        throw new Error(analyticsData.error || 'Failed to fetch analytics')
      }

      // Find own analytics from the array (should only have one item due to RLS)
      const ownAnalytics = analyticsData.analytics.find(
        (a) => a.staff_id === profileData.profile.id
      )

      setAnalytics(ownAnalytics || null)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch when date range changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchAnalytics()
    }
  }, [dateRange.start, dateRange.end])

  const handleDateRangeChange = (field, value) => {
    setDateRange((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleViewBookingPage = () => {
    if (analytics?.booking_slug) {
      window.open(`/book/${analytics.booking_slug}`, '_blank')
    }
  }

  const handleCopyBookingUrl = () => {
    if (analytics?.booking_slug) {
      const url = `${window.location.origin}/book/${analytics.booking_slug}`
      navigator.clipboard.writeText(url)
      alert('Booking URL copied to clipboard!')
    }
  }

  const handleRefresh = () => {
    fetchAnalytics()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3 text-olive-600" />
                My Performance
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                View your booking metrics and performance
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-background disabled:opacity-50 flex items-center"
            >
              <ArrowPathIcon
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Your Booking Link Banner */}
        {analytics?.booking_slug && (
          <div className="mb-6 bg-gradient-to-r from-olive-600 to-olive-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-2">Your Booking Link</h3>
                <p className="text-olive-100 font-mono text-sm">
                  {window.location.origin}/book/{analytics.booking_slug}
                </p>
                <p className="text-olive-200 text-sm mt-2">
                  Share this link with your clients so they can book directly with you
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCopyBookingUrl}
                  className="px-4 py-2 bg-white text-olive-700 rounded-lg hover:bg-olive-50 flex items-center"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy Link
                </button>
                <button
                  onClick={handleViewBookingPage}
                  className="px-4 py-2 bg-olive-800 text-white rounded-lg hover:bg-olive-900"
                >
                  View Page
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Quick Date Ranges */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => {
                  const end = new Date()
                  const start = new Date()
                  start.setDate(start.getDate() - days)
                  setDateRange({
                    start: start.toISOString().split('T')[0],
                    end: end.toISOString().split('T')[0],
                  })
                }}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Last {days} Days
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Analytics Display */}
        {!isLoading && !error && analytics && (
          <>
            {/* Key Metrics */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Bookings</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {analytics.total_bookings}
                    </p>
                  </div>
                  <CalendarIcon className="h-10 w-10 text-blue-400" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      ${analytics.total_revenue.toFixed(2)}
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-10 w-10 text-green-400" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Avg. Booking</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      ${analytics.average_booking_value.toFixed(2)}
                    </p>
                  </div>
                  <ChartBarIcon className="h-10 w-10 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Detailed Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Booking Sources */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Booking Sources
                </h3>
                <BookingSourceBreakdown sourceBreakdown={analytics.source_breakdown} />
              </div>

              {/* Top Services */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Your Top Services
                </h3>
                {analytics.top_services && analytics.top_services.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.top_services.map((service, index) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 bg-background rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-olive-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-olive-700">
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {service.name}
                            </p>
                            <p className="text-xs text-gray-600">
                              ${parseFloat(service.price).toFixed(2)} per service
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            {service.booking_count} bookings
                          </p>
                          <p className="text-xs text-gray-600">
                            ${service.revenue.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 italic">No services booked yet</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* No Data State */}
        {!isLoading && !error && !analytics && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Yet</h3>
            <p className="text-gray-600">
              Your booking analytics will appear here once you start receiving bookings
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

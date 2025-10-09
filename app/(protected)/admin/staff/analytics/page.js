'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import StaffAnalyticsCard from '@/components/staff/StaffAnalyticsCard'
import { ChartBarIcon, CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

/**
 * Admin Staff Analytics Dashboard
 * View booking performance metrics for all staff members
 */
export default function StaffAnalyticsPage() {
  const router = useRouter()
  const [analytics, setAnalytics] = useState([])
  const [summary, setSummary] = useState(null)
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
      const response = await fetch(
        `/api/admin/staff/analytics?start_date=${dateRange.start}&end_date=${dateRange.end}`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics')
      }

      setAnalytics(data.analytics)
      setSummary(data.summary)
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

  const handleViewBookingUrl = (slug) => {
    window.open(`/book/${slug}`, '_blank')
  }

  const handleRefresh = () => {
    fetchAnalytics()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white dark:bg-card border-b border-gray-200 dark:border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-card-foreground flex items-center">
                <ChartBarIcon className="h-8 w-8 mr-3 text-olive-600" />
                Staff Performance Analytics
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                View booking metrics and performance for your team
              </p>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="px-4 py-2 bg-white dark:bg-card border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-background disabled:opacity-50 flex items-center"
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
        {/* Date Range Filter */}
        <div className="mb-6 bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
          <div className="flex items-center space-x-4">
            <CalendarIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <button
              onClick={() => {
                const end = new Date()
                const start = new Date()
                start.setDate(start.getDate() - 7)
                setDateRange({
                  start: start.toISOString().split('T')[0],
                  end: end.toISOString().split('T')[0],
                })
              }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => {
                const end = new Date()
                const start = new Date()
                start.setDate(start.getDate() - 30)
                setDateRange({
                  start: start.toISOString().split('T')[0],
                  end: end.toISOString().split('T')[0],
                })
              }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
            >
              Last 30 Days
            </button>
            <button
              onClick={() => {
                const end = new Date()
                const start = new Date()
                start.setDate(start.getDate() - 90)
                setDateRange({
                  start: start.toISOString().split('T')[0],
                  end: end.toISOString().split('T')[0],
                })
              }}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
            >
              Last 90 Days
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && !isLoading && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Staff</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-card-foreground mt-2">
                {summary.total_staff}
              </p>
            </div>
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-card-foreground mt-2">
                {summary.total_bookings}
              </p>
            </div>
            <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-6">
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">Total Revenue</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-card-foreground mt-2">
                ${summary.total_revenue.toFixed(2)}
              </p>
            </div>
          </div>
        )}

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

        {/* Analytics Cards */}
        {!isLoading && !error && analytics.length === 0 && (
          <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-gray-200 dark:border-border p-12 text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-card-foreground mb-2">
              No Staff Members Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Add your first barber to start tracking booking analytics
            </p>
            <button
              onClick={() => router.push('/admin/staff/onboard')}
              className="px-6 py-3 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
            >
              Add New Barber
            </button>
          </div>
        )}

        {!isLoading && !error && analytics.length > 0 && (
          <div className="space-y-4">
            {analytics.map((staffAnalytics) => (
              <StaffAnalyticsCard
                key={staffAnalytics.staff_id}
                analytics={staffAnalytics}
                onViewBookingUrl={handleViewBookingUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

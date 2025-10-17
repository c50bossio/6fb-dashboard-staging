'use client'

import {
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useMemo } from 'react'
import { format, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns'

export default function RevenueTracker({ barbershopId, compact = false, autoRefresh = true }) {
  const [revenueData, setRevenueData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('today')

  // Load revenue data
  const loadRevenueData = async () => {
    if (!barbershopId) return
    
    try {
      if (!loading) setRefreshing(true)
      setError(null)

      const response = await fetch(`/api/analytics/revenue?barbershop_id=${barbershopId}&period=${selectedPeriod}&live=true`)
      
      if (!response.ok) {
        throw new Error('Failed to load revenue data')
      }
      
      const result = await response.json()
      
      if (result.success && result.data) {
        setRevenueData(result.data)
      } else {
        throw new Error(result.error || 'No revenue data available')
      }
    } catch (error) {
      console.error('Error loading revenue data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Auto-refresh setup
  useEffect(() => {
    loadRevenueData()
    
    if (autoRefresh) {
      // Refresh every 5 minutes for real-time updates
      const interval = setInterval(loadRevenueData, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [barbershopId, selectedPeriod, autoRefresh])

  // Calculate revenue metrics
  const metrics = useMemo(() => {
    if (!revenueData) return null

    const {
      current_revenue = 0,
      previous_revenue = 0,
      projected_revenue = 0,
      completed_appointments = 0,
      total_appointments = 0,
      average_service_price = 0,
      hourly_breakdown = [],
      payment_methods = {}
    } = revenueData

    const growthAmount = current_revenue - previous_revenue
    const growthPercent = previous_revenue > 0 ? (growthAmount / previous_revenue) * 100 : 0
    const completionRate = total_appointments > 0 ? (completed_appointments / total_appointments) * 100 : 0
    const projectedGrowth = projected_revenue - current_revenue

    return {
      current: current_revenue,
      previous: previous_revenue,
      projected: projected_revenue,
      growth: {
        amount: growthAmount,
        percent: growthPercent,
        isPositive: growthAmount >= 0
      },
      appointments: {
        completed: completed_appointments,
        total: total_appointments,
        completionRate
      },
      averagePrice: average_service_price,
      projectedGrowth,
      hourlyBreakdown: hourly_breakdown,
      paymentMethods: payment_methods
    }
  }, [revenueData])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0)
  }

  const formatPercent = (percent) => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`
  }

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return 'Today'
      case 'yesterday': return 'Yesterday'
      case 'week': return 'This Week'
      case 'month': return 'This Month'
      default: return 'Today'
    }
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 bg-gray-200 rounded w-32"></div>
            <div className="h-4 w-4 bg-gray-200 rounded"></div>
          </div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded w-24"></div>
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center">
          <CurrencyDollarIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">Failed to load revenue data</p>
          <p className="text-gray-600 text-sm mt-1">{error}</p>
          <button
            onClick={loadRevenueData}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Revenue {getPeriodLabel()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics?.current)}
              </span>
              {metrics?.growth.amount !== 0 && (
                <div className={`flex items-center text-sm ${
                  metrics?.growth.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metrics?.growth.isPositive ? (
                    <ArrowUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {formatPercent(metrics?.growth.percent)}
                </div>
              )}
            </div>
          </div>
          {refreshing && (
            <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <CurrencyDollarIcon className="h-6 w-6 text-green-500" />
          <span className="hidden sm:inline">Revenue Tracking</span>
          <span className="sm:hidden">Revenue</span>
        </h3>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="flex-1 sm:flex-none text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <button
            onClick={loadRevenueData}
            disabled={refreshing}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors border border-gray-300 rounded-lg"
            title="Refresh data"
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Current Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start mb-2">
              <CurrencyDollarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600">{getPeriodLabel()} Revenue</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(metrics?.current)}
            </p>
            {metrics?.growth.amount !== 0 && (
              <div className={`flex items-center justify-center sm:justify-start text-xs sm:text-sm mt-1 ${
                metrics?.growth.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics?.growth.isPositive ? (
                  <ArrowUpIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                ) : (
                  <ArrowDownIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                )}
                <span className="hidden sm:inline">{formatPercent(metrics?.growth.percent)} vs previous</span>
                <span className="sm:hidden">{formatPercent(metrics?.growth.percent)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Projected Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start mb-2">
              <ChartBarIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600">Projected</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
              {formatCurrency(metrics?.projected)}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              <span className="hidden sm:inline">+{formatCurrency(metrics?.projectedGrowth)} potential</span>
              <span className="sm:hidden">+{formatCurrency(metrics?.projectedGrowth)}</span>
            </p>
          </div>
        </div>

        {/* Completed Appointments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start mb-2">
              <CalendarDaysIcon className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600">Appointments</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {metrics?.appointments.completed}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              <span className="hidden sm:inline">{metrics?.appointments.completionRate.toFixed(0)}% completion rate</span>
              <span className="sm:hidden">{metrics?.appointments.completionRate.toFixed(0)}%</span>
            </p>
          </div>
        </div>

        {/* Average Service Price */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start mb-2">
              <ClockIcon className="h-6 w-6 sm:h-8 sm:w-8 text-amber-500" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-gray-600">Avg. Service</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(metrics?.averagePrice)}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              <span className="hidden sm:inline">per appointment</span>
              <span className="sm:hidden">per appt</span>
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Breakdown Chart (if not compact) */}
      {metrics?.hourlyBreakdown.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Hourly Revenue Breakdown</h4>
          <div className="space-y-2">
            {metrics.hourlyBreakdown.map((hour, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600 w-16">
                  {format(new Date(`2000-01-01 ${hour.hour}:00`), 'h a')}
                </span>
                <div className="flex-1 mx-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((hour.revenue / Math.max(...metrics.hourlyBreakdown.map(h => h.revenue))) * 100, 100)}%` 
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-16 text-right">
                  {formatCurrency(hour.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Methods Breakdown */}
      {metrics?.paymentMethods && Object.keys(metrics.paymentMethods).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Payment Methods</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(metrics.paymentMethods).map(([method, amount]) => (
              <div key={method} className="text-center">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(amount)}</p>
                <p className="text-sm text-gray-600 capitalize">{method.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
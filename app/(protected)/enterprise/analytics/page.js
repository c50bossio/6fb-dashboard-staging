'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  StarIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function EnterpriseAnalyticsPage() {
  const { profile } = useAuth()
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('30d')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadAnalyticsData()
  }, [selectedTimeRange])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/enterprise/analytics?range=${selectedTimeRange}&compare=previous`)
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You must be an Enterprise Owner to access analytics')
        }
        throw new Error('Failed to load analytics data')
      }

      const result = await response.json()
      
      if (result.success) {
        setAnalytics(result.data)
      } else {
        throw new Error(result.error || 'Failed to load analytics')
      }

    } catch (err) {
      console.error('Error loading analytics:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await loadAnalyticsData()
    setRefreshing(false)
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value) => {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />
    if (growth < 0) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />
    return <div className="h-4 w-4" />
  }

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Analytics Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadAnalyticsData} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return <div>No analytics data available</div>
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enterprise Analytics</h1>
          <p className="text-gray-600 mt-2">Cross-location business intelligence and performance insights</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={refreshData} variant="outline" disabled={refreshing}>
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button variant="outline">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.overview.total_revenue)}</p>
              </div>
              <BanknotesIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="flex items-center mt-2">
              {getGrowthIcon(analytics.overview.revenue_growth)}
              <span className={`text-sm ml-1 ${getGrowthColor(analytics.overview.revenue_growth)}`}>
                {formatPercentage(analytics.overview.revenue_growth)} vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.total_bookings.toLocaleString()}</p>
              </div>
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="flex items-center mt-2">
              {getGrowthIcon(analytics.overview.booking_growth)}
              <span className={`text-sm ml-1 ${getGrowthColor(analytics.overview.booking_growth)}`}>
                {formatPercentage(analytics.overview.booking_growth)} vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Customers</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.overview.total_customers}</p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="flex items-center mt-2">
              {getGrowthIcon(analytics.overview.customer_growth)}
              <span className={`text-sm ml-1 ${getGrowthColor(analytics.overview.customer_growth)}`}>
                {formatPercentage(analytics.overview.customer_growth)} vs previous period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Booking Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.overview.avg_booking_value)}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="flex items-center mt-2">
              <span className="text-sm text-gray-600">
                {analytics.overview.total_locations} active locations
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Location Performance</TabsTrigger>
          <TabsTrigger value="trends">Revenue Trends</TabsTrigger>
          <TabsTrigger value="services">Top Services</TabsTrigger>
          <TabsTrigger value="insights">Customer Insights</TabsTrigger>
        </TabsList>

        {/* Location Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Location Performance Comparison</CardTitle>
              <CardDescription>Revenue and booking performance across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.location_performance.map((location, index) => (
                  <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                        <span className="text-sm font-semibold text-blue-600">#{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{location.name}</h4>
                        <p className="text-sm text-gray-600">{location.location}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-8 text-center">
                      <div>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(location.revenue)}</p>
                        <p className="text-xs text-gray-600">Revenue</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-blue-600">{location.bookings}</p>
                        <p className="text-xs text-gray-600">Bookings</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(location.avg_booking_value)}</p>
                        <p className="text-xs text-gray-600">Avg Value</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-purple-600">{location.staff_count}</p>
                        <p className="text-xs text-gray-600">Staff</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-1">
                  {analytics.revenue_trends.map((day, index) => {
                    const maxRevenue = Math.max(...analytics.revenue_trends.map(d => d.revenue))
                    const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 200 : 0
                    
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div 
                          className="bg-green-500 rounded-t w-6 transition-all hover:bg-green-600"
                          style={{ height: `${height}px` }}
                          title={`${day.formatted_date}: ${formatCurrency(day.revenue)}`}
                        ></div>
                        <span className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                          {day.formatted_date}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Trend</CardTitle>
                <CardDescription>Daily bookings over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-1">
                  {analytics.booking_trends.map((day, index) => {
                    const maxBookings = Math.max(...analytics.booking_trends.map(d => d.bookings))
                    const height = maxBookings > 0 ? (day.bookings / maxBookings) * 200 : 0
                    
                    return (
                      <div key={index} className="flex flex-col items-center">
                        <div 
                          className="bg-blue-500 rounded-t w-6 transition-all hover:bg-blue-600"
                          style={{ height: `${height}px` }}
                          title={`${day.formatted_date}: ${day.bookings} bookings`}
                        ></div>
                        <span className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-left">
                          {day.formatted_date}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Top Services Tab */}
        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Services</CardTitle>
              <CardDescription>Most popular services across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.top_services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                        <StarIcon className="h-4 w-4 text-yellow-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{service.name}</h4>
                        <p className="text-sm text-gray-600">{service.bookings} bookings</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{formatCurrency(service.revenue)}</p>
                      <p className="text-sm text-gray-600">{formatCurrency(service.avg_price)} avg</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Growth</CardTitle>
                <CardDescription>Customer acquisition trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">New Customers (Current Period)</span>
                    <span className="text-lg font-bold text-gray-900">
                      {analytics.customer_insights.new_customers_current}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600">New Customers (Previous Period)</span>
                    <span className="text-lg font-bold text-gray-900">
                      {analytics.customer_insights.new_customers_previous}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-600">Total Customers</span>
                    <span className="text-lg font-bold text-blue-900">
                      {analytics.customer_insights.total_customers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-600">Avg per Location</span>
                    <span className="text-lg font-bold text-green-900">
                      {analytics.customer_insights.avg_customers_per_location}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Performance Times</CardTitle>
                <CardDescription>Optimal business hours and days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-5 w-5 text-orange-600" />
                      <span className="text-sm font-medium text-orange-600">Peak Hour</span>
                    </div>
                    <span className="text-lg font-bold text-orange-900">
                      {analytics.time_analysis.peak_hour_formatted}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">Peak Day</span>
                    </div>
                    <span className="text-lg font-bold text-blue-900">
                      {analytics.time_analysis.peak_day}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Weekly Distribution</h4>
                    <div className="grid grid-cols-7 gap-1">
                      {analytics.time_analysis.day_names.map((day, index) => {
                        const count = analytics.time_analysis.daily_distribution[index]
                        const maxCount = Math.max(...analytics.time_analysis.daily_distribution)
                        const intensity = maxCount > 0 ? count / maxCount : 0
                        
                        return (
                          <div key={index} className="text-center">
                            <div 
                              className="h-12 bg-blue-500 rounded mb-1"
                              style={{ opacity: intensity * 0.8 + 0.2 }}
                              title={`${day}: ${count} bookings`}
                            ></div>
                            <span className="text-xs text-gray-600">{day.slice(0, 3)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
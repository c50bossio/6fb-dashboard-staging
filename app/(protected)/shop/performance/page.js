'use client'

import { 
  BarChart3Icon as ChartBarIcon, 
  ClockIcon, 
  StarIcon,
  UsersIcon,
  CalendarIcon,
  DollarSignIcon 
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { staffService } from '@/lib/staff-service'
import { formatCurrency } from '@/lib/utils'

export default function PerformancePage() {
  const [performanceData, setPerformanceData] = useState([])
  const [dashboardMetrics, setDashboardMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeframe, setTimeframe] = useState(30)

  useEffect(() => {
    loadPerformanceData()
  }, [timeframe])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load both performance metrics and dashboard metrics
      const [performance, staffResult] = await Promise.all([
        staffService.getPerformanceMetrics(null, timeframe),
        staffService.loadStaffData()
      ])
      
      setPerformanceData(performance)
      setDashboardMetrics(staffResult.metrics)
    } catch (err) {
      setError(err.message)
      console.error('Error loading performance data:', err)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceLevel = (efficiency) => {
    if (efficiency >= 80) return { label: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (efficiency >= 60) return { label: 'Good', color: 'bg-blue-100 text-blue-800' }
    if (efficiency >= 40) return { label: 'Average', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Needs Attention', color: 'bg-red-100 text-red-800' }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Loading performance data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Performance</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={loadPerformanceData} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
            <p className="text-gray-600 mt-1">
              Staff performance metrics and insights
            </p>
          </div>
          <div className="flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                variant={timeframe === days ? "default" : "outline"}
                onClick={() => setTimeframe(days)}
                size="sm"
              >
                {days} days
              </Button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <UsersIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardMetrics?.activeStaff || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {dashboardMetrics?.activeToday || 0} working today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Revenue</CardTitle>
              <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboardMetrics?.revenuePerStaff || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per staff member
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Bookings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dashboardMetrics?.avgBookingsPerStaff || 0).toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per staff member
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <StarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardMetrics?.avgRating ? dashboardMetrics.avgRating.toFixed(1) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Customer satisfaction
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Details */}
        <Tabs defaultValue="individual" className="w-full">
          <TabsList>
            <TabsTrigger value="individual">Individual Performance</TabsTrigger>
            <TabsTrigger value="trends">Trends & Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="individual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance Breakdown</CardTitle>
                <CardDescription>
                  Individual metrics for the selected time period ({timeframe} days)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {performanceData.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No performance data available</p>
                    <Button variant="outline" onClick={loadPerformanceData}>
                      Refresh Data
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {performanceData.map((staff) => {
                      const performanceLevel = getPerformanceLevel(staff.efficiency)
                      return (
                        <div key={staff.staffId} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <h4 className="font-medium">{staff.name}</h4>
                              <Badge className={performanceLevel.color}>
                                {performanceLevel.label}
                              </Badge>
                              <Badge variant="secondary">
                                {staff.compensationModel.display}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {staff.efficiency.toFixed(1)}% efficiency
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                            <div>
                              <div className="text-gray-600">Bookings</div>
                              <div className="font-medium flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {staff.totalBookings}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Revenue</div>
                              <div className="font-medium flex items-center gap-1">
                                <DollarSignIcon className="h-3 w-3" />
                                {formatCurrency(staff.totalRevenue)}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Weekly Hours</div>
                              <div className="font-medium flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                                {staff.weeklyHours}h
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Rating</div>
                              <div className="font-medium flex items-center gap-1">
                                <StarIcon className="h-3 w-3" />
                                {staff.averageRating ? staff.averageRating.toFixed(1) : 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-600">Trend</div>
                              <div className="font-medium flex items-center gap-1">
                                <ChartBarIcon className="h-3 w-3" />
                                {staff.growthTrend >= 0 ? '+' : ''}{staff.growthTrend}%
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Performance Insights</CardTitle>
                <CardDescription>
                  Key trends and recommendations based on staff performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Top Performers</h4>
                    <div className="space-y-2">
                      {performanceData
                        .sort((a, b) => b.efficiency - a.efficiency)
                        .slice(0, 3)
                        .map((staff, index) => (
                          <div key={staff.staffId} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <span className="font-medium">{staff.name}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                {staff.efficiency.toFixed(1)}% efficiency
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatCurrency(staff.totalRevenue)}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Areas for Improvement</h4>
                    <div className="space-y-2">
                      {performanceData
                        .sort((a, b) => a.efficiency - b.efficiency)
                        .slice(0, 3)
                        .map((staff) => (
                          <div key={staff.staffId} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                            <div className="flex-1">
                              <span className="font-medium">{staff.name}</span>
                              <span className="text-sm text-gray-600 ml-2">
                                {staff.efficiency.toFixed(1)}% efficiency
                              </span>
                            </div>
                            <div className="text-sm text-yellow-700">
                              Consider training or schedule optimization
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Recommendations</h4>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <strong>Schedule Optimization:</strong> Consider adjusting schedules for staff working excessive hours without proportional bookings.
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <strong>Training Focus:</strong> Staff with low efficiency ratings may benefit from additional training or mentoring.
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <strong>Recognition Program:</strong> Consider implementing incentives for top performers to maintain motivation.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
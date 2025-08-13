'use client'

import { TrendingUp, TrendingDown, MapPin, Users, Calendar, DollarSign, Star, BarChart3, Building2, Zap } from 'lucide-react'
import { useState, useEffect } from 'react'

import { Alert, AlertDescription, Badge, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui'

export default function FranchiseDashboard() {
  const [franchiseData, setFranchiseData] = useState(null)
  const [locationData, setLocationData] = useState([])
  const [performanceData, setPerformanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchFranchiseData()
  }, [])

  const fetchFranchiseData = async () => {
    try {
      setLoading(true)
      
      // Fetch franchise overview data
      const [franchiseRes, locationsRes, performanceRes] = await Promise.all([
        fetch('/api/franchise/overview'),
        fetch('/api/franchise/locations'),
        fetch('/api/franchise/performance')
      ])

      if (!franchiseRes.ok || !locationsRes.ok || !performanceRes.ok) {
        throw new Error('Failed to fetch franchise data')
      }

      const franchise = await franchiseRes.json()
      const locations = await locationsRes.json()
      const performance = await performanceRes.json()

      setFranchiseData(franchise)
      setLocationData(locations)
      setPerformanceData(performance)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching franchise data:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading franchise dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <Alert variant="destructive">
          <AlertDescription>
            Error loading franchise data: {error}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {franchiseData?.franchise_name || 'Franchise Dashboard'}
              </h1>
              <p className="text-gray-600 mt-1">
                {franchiseData?.franchise_code} • {franchiseData?.current_location_count || 0} Locations
              </p>
            </div>
            <Badge
              variant={franchiseData?.status === 'ACTIVE' ? 'success' : 'warning'}
              className="px-3 py-1"
            >
              {franchiseData?.status || 'Unknown'}
            </Badge>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Revenue (MTD)</p>
                  <div className="flex items-center">
                    <p className="text-2xl font-bold text-gray-900">
                      ${performanceData?.current_month_analytics?.total_revenue?.toLocaleString() || '0'}
                    </p>
                    {performanceData?.growth_metrics?.revenue_growth_percentage > 0 && (
                      <div className="flex items-center ml-2 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {performanceData.growth_metrics.revenue_growth_percentage.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-olive-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-olive-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Appointments (MTD)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performanceData?.current_month_analytics?.total_appointments?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gold-100 rounded-lg">
                  <Users className="h-6 w-6 text-gold-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">New Customers (MTD)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performanceData?.current_month_analytics?.new_customers?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Star className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Satisfaction</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {performanceData?.current_month_analytics?.average_satisfaction_score?.toFixed(1) || '0.0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Franchise Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Building2 className="h-5 w-5 mr-2" />
                    Franchise Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Legal Entity</p>
                    <p className="text-gray-900">{franchiseData?.legal_entity_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Primary Region</p>
                    <p className="text-gray-900">{franchiseData?.primary_region || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Subscription Tier</p>
                    <Badge variant="secondary">{franchiseData?.subscription_tier}</Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Max Locations</p>
                    <p className="text-gray-900">
                      {franchiseData?.current_location_count} / {franchiseData?.max_locations}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="font-medium text-gray-900">Add Location</div>
                      <div className="text-sm text-gray-600">Expand your franchise</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="font-medium text-gray-900">View Reports</div>
                      <div className="text-sm text-gray-600">Detailed analytics</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="font-medium text-gray-900">Staff Management</div>
                      <div className="text-sm text-gray-600">Manage team members</div>
                    </button>
                    <button className="p-4 text-left border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="font-medium text-gray-900">Settings</div>
                      <div className="text-sm text-gray-600">Franchise configuration</div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest updates across your franchise network</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Sample activities - would come from API */}
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">New location "Downtown Manhattan" went live</p>
                      <p className="text-xs text-gray-500">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-olive-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">Monthly performance report generated</p>
                      <p className="text-xs text-gray-500">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <div>
                      <p className="text-sm text-gray-900">New staff member onboarded at Brooklyn location</p>
                      <p className="text-xs text-gray-500">3 days ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Location Management</h3>
              <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors">
                Add New Location
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locationData.map((location, index) => (
                <Card key={location.id || index}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{location.location_name}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {location.city}, {location.state_province}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={location.status === 'ACTIVE' ? 'success' : 'warning'}
                        className="text-xs"
                      >
                        {location.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Monthly Revenue</span>
                        <span className="text-sm font-medium">${location.monthly_revenue?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Customers</span>
                        <span className="text-sm font-medium">{location.total_customers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Average Rating</span>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                          <span className="text-sm font-medium">{location.average_rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Chairs</span>
                        <span className="text-sm font-medium">{location.total_chairs || 0}</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <button className="w-full text-sm text-olive-600 hover:text-olive-700 font-medium">
                        View Details →
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Rankings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Location Rankings
                  </CardTitle>
                  <CardDescription>Ranked by monthly revenue performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {performanceData?.location_rankings?.slice(0, 5).map((location, index) => (
                      <div key={location.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-olive-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{location.location_name}</p>
                            <p className="text-sm text-gray-600">{location.city}, {location.state_province}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">${location.total_revenue?.toLocaleString() || '0'}</p>
                          <div className="flex items-center">
                            <Star className="h-3 w-3 text-yellow-500 mr-1" />
                            <span className="text-sm text-gray-600">{location.customer_satisfaction_score?.toFixed(1) || '0.0'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Growth Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Growth Metrics</CardTitle>
                  <CardDescription>Month-over-month performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-green-800">Revenue Growth</span>
                        <div className="flex items-center">
                          {performanceData?.growth_metrics?.revenue_growth_percentage >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                          )}
                          <span className="font-medium text-green-800">
                            {Math.abs(performanceData?.growth_metrics?.revenue_growth_percentage || 0).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Previous month: ${performanceData?.growth_metrics?.previous_month_revenue?.toLocaleString() || '0'}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-olive-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-olive-800">Customer Retention</span>
                        <span className="font-medium text-olive-800">
                          {((performanceData?.current_month_analytics?.returning_customers / 
                            (performanceData?.current_month_analytics?.new_customers + performanceData?.current_month_analytics?.returning_customers)) * 100 || 0).toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-xs text-olive-600 mt-1">
                        Returning vs new customer ratio
                      </p>
                    </div>

                    <div className="p-4 bg-gold-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gold-800">Active Locations</span>
                        <span className="font-medium text-gold-800">
                          {performanceData?.current_month_analytics?.reporting_locations || 0}
                        </span>
                      </div>
                      <p className="text-xs text-gold-600 mt-1">
                        Locations with activity this month
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Analytics</CardTitle>
                <CardDescription>Comprehensive franchise performance insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="text-gray-600 mb-4">
                    Detailed charts, reports, and AI-powered insights will be available here.
                  </p>
                  <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 transition-colors">
                    Request Demo
                  </button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
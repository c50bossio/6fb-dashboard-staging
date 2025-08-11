'use client'

import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MapPinIcon,
  UserGroupIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ClockIcon,
  StarIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
  BuildingStorefrontIcon,
  UsersIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect, useMemo } from 'react'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer
} from 'recharts'

import ProtectedRoute from '../../../../components/ProtectedRoute'
import { Card } from '../../../../components/ui'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

// Navigation Breadcrumb Component
function AnalyticsBreadcrumb({ level, levelData, onNavigate }) {
  const levels = [
    { id: 'enterprise', name: 'Enterprise Overview', icon: BuildingStorefrontIcon },
    { id: 'location', name: 'Location Analysis', icon: MapPinIcon },
    { id: 'barber', name: 'Individual Performance', icon: ScissorsIcon }
  ]

  return (
    <div className="flex items-center space-x-2 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
      <FunnelIcon className="h-5 w-5 text-blue-600" />
      <span className="text-sm font-medium text-gray-700">Analytics Navigation:</span>
      
      {levels.map((levelItem, index) => {
        const isActive = level === levelItem.id
        const isClickable = index <= levels.findIndex(l => l.id === level)
        const IconComponent = levelItem.icon
        
        return (
          <div key={levelItem.id} className="flex items-center">
            {index > 0 && <span className="text-gray-400 mx-2">→</span>}
            <button
              onClick={() => isClickable && onNavigate(levelItem.id)}
              disabled={!isClickable}
              className={`flex items-center px-3 py-2 rounded-lg transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : isClickable 
                    ? 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200' 
                    : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <IconComponent className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">
                {levelItem.name}
                {levelData && isActive && (
                  <span className="ml-2 text-xs opacity-80">
                    ({levelData.name})
                  </span>
                )}
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}

// AI-Enhanced Insights Widget
function AIAnalyticsInsights({ level, levelData }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAIInsights = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/ai/agents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Analyze ${level} level performance data and provide strategic insights for improvement`,
            businessContext: {
              analysis_level: level,
              entity_data: levelData,
              focus_areas: ['revenue_trends', 'efficiency', 'growth_opportunities'],
              insight_type: 'strategic_analytics'
            }
          })
        })

        if (response.ok) {
          const data = await response.json()
          setInsights(data)
        }
      } catch (error) {
        console.error('AI Analytics insights error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAIInsights()
  }, [level, levelData])

  return (
    <Card className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-600" />
          AI Strategic Insights - {level.charAt(0).toUpperCase() + level.slice(1)} Level
        </h3>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-600">AI Enhanced</span>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      ) : insights ? (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-sm text-gray-700 mb-3">
              {insights.response?.substring(0, 200)}...
            </p>
            
            {insights.agent_details?.recommendations && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-indigo-800">Strategic Recommendations:</h4>
                {insights.agent_details.recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">
                      {idx + 1}
                    </span>
                    <span className="text-gray-600">{rec}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          <ChartBarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Loading AI insights...</p>
        </div>
      )}
    </Card>
  )
}

// Enterprise Level Analytics
function EnterpriseAnalytics({ onDrillDown }) {
  const [enterpriseData, setEnterpriseData] = useState({
    locations: [],
    totalRevenue: 0,
    totalCustomers: 0,
    totalBarbers: 0,
    avgRating: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEnterpriseData = async () => {
      try {
        // Fetch location performance data from real database
        const response = await fetch('/api/analytics/live-data?format=json')
        const result = await response.json()
        
        if (result.success && result.data) {
          // Process real data into enterprise format
          setEnterpriseData({
            locations: result.data.locations || [],
            totalRevenue: result.data.total_revenue || 0,
            totalCustomers: result.data.total_customers || 0,
            totalBarbers: result.data.total_barbers || 0,
            avgRating: result.data.average_rating || 0
          })
        }
      } catch (error) {
        console.error('Failed to fetch enterprise data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEnterpriseData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchEnterpriseData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const revenueByLocation = enterpriseData.locations.map(loc => ({
    name: loc.name.replace(' Elite Cuts', '').replace(' Barber Co', '').replace(' Style Shop', '').replace(' Cuts', ''),
    revenue: loc.revenue,
    customers: loc.customers,
    efficiency: (loc.revenue / loc.barbers).toFixed(0)
  }))

  return (
    <div className="space-y-6">
      {/* Enterprise KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ${enterpriseData.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-green-500 flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                +12.5% vs last month
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Customers</p>
              <p className="text-2xl font-bold text-blue-600">{enterpriseData.totalCustomers}</p>
              <p className="text-xs text-blue-500 flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                +8.3% vs last month
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Locations</p>
              <p className="text-2xl font-bold text-purple-600">{enterpriseData.locations.length}</p>
              <p className="text-xs text-purple-500 flex items-center mt-1">
                <BuildingStorefrontIcon className="h-3 w-3 mr-1" />
                All operational
              </p>
            </div>
            <MapPinIcon className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Rating</p>
              <p className="text-2xl font-bold text-yellow-600">{enterpriseData.avgRating}</p>
              <p className="text-xs text-yellow-500 flex items-center mt-1">
                <StarIcon className="h-3 w-3 mr-1" />
                Excellent performance
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
      </div>

      {/* Location Performance Chart */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2 text-gray-700" />
          Location Performance Overview
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueByLocation}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#10B981" name="Revenue ($)" />
              <Bar yAxisId="right" dataKey="customers" fill="#3B82F6" name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Location Drill-Down Table */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <BuildingStorefrontIcon className="h-5 w-5 mr-2 text-gray-700" />
          Location Details - Click to Analyze
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barbers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {enterpriseData.locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">{location.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${location.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.customers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {location.barbers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-900">{location.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${(location.revenue / location.barbers).toFixed(0)}/barber
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onDrillDown('location', location)}
                      className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Analyze Location
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Location Level Analytics
function LocationAnalytics({ locationData, onDrillDown, onNavigateUp }) {
  const [barberData, setBarberData] = useState([])
  const [weeklyTrends, setWeeklyTrends] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        // Fetch barber performance data from real database
        const response = await fetch(`/api/analytics/live-data?barbershop_id=${locationData.id}&format=json`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setBarberData(result.data.barbers || [])
          setWeeklyTrends(result.data.weekly_trends || [])
        }
      } catch (error) {
        console.error('Failed to fetch location data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchLocationData()
  }, [locationData])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Location KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Location Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ${locationData.revenue.toLocaleString()}
              </p>
              <p className="text-xs text-green-500 flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                +{((locationData.revenue - 42000) / 42000 * 100).toFixed(1)}% vs last month
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Customers</p>
              <p className="text-2xl font-bold text-blue-600">{locationData.customers}</p>
              <p className="text-xs text-blue-500 flex items-center mt-1">
                <UserGroupIcon className="h-3 w-3 mr-1" />
                {Math.round(locationData.customers / locationData.barbers)} per barber
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Team Size</p>
              <p className="text-2xl font-bold text-purple-600">{locationData.barbers}</p>
              <p className="text-xs text-purple-500 flex items-center mt-1">
                <ScissorsIcon className="h-3 w-3 mr-1" />
                Professional barbers
              </p>
            </div>
            <UsersIcon className="h-8 w-8 text-purple-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Customer Rating</p>
              <p className="text-2xl font-bold text-yellow-600">{locationData.rating}</p>
              <p className="text-xs text-yellow-500 flex items-center mt-1">
                <StarIcon className="h-3 w-3 mr-1" />
                {locationData.rating >= 4.7 ? 'Excellent' : locationData.rating >= 4.5 ? 'Great' : 'Good'} service
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
      </div>

      {/* Weekly Trends */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <CalendarDaysIcon className="h-5 w-5 mr-2 text-gray-700" />
          Weekly Performance Trends
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#10B981" name="Revenue ($)" strokeWidth={3} />
              <Line yAxisId="right" type="monotone" dataKey="customers" stroke="#3B82F6" name="Customers" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="bookings" stroke="#8B5CF6" name="Bookings" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Barber Performance Table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <ScissorsIcon className="h-5 w-5 mr-2 text-gray-700" />
            Individual Barber Performance
          </h3>
          <button
            onClick={onNavigateUp}
            className="text-blue-600 text-sm hover:text-blue-800 flex items-center"
          >
            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            Back to Enterprise View
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Barber</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Efficiency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {barberData.map((barber) => (
                <tr key={barber.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ScissorsIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">{barber.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${barber.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barber.customers}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <StarIcon className="h-4 w-4 text-yellow-400 mr-1" />
                      <span className="text-sm text-gray-900">{barber.rating}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {barber.bookings}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      barber.efficiency >= 90 ? 'bg-green-100 text-green-800' :
                      barber.efficiency >= 85 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {barber.efficiency}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => onDrillDown('barber', barber)}
                      className="bg-purple-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-purple-700 transition-colors"
                    >
                      Analyze Barber
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// Individual Barber Analytics
function BarberAnalytics({ barberData, onNavigateUp }) {
  const [performanceData, setPerformanceData] = useState([])
  const [serviceBreakdown, setServiceBreakdown] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBarberData = async () => {
      try {
        // Fetch individual barber performance from real database
        const response = await fetch(`/api/analytics/live-data?barber_id=${barberData.id}&format=json`)
        const result = await response.json()
        
        if (result.success && result.data) {
          setPerformanceData(result.data.daily_performance || [])
          setServiceBreakdown(result.data.service_breakdown || [])
        }
      } catch (error) {
        console.error('Failed to fetch barber data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchBarberData()
  }, [barberData])

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Barber KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                ${barberData.revenue.toLocaleString()}
              </p>
              <p className="text-xs text-green-500 flex items-center mt-1">
                <BanknotesIcon className="h-3 w-3 mr-1" />
                ${(barberData.revenue / 30).toFixed(0)}/day average
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Regular Customers</p>
              <p className="text-2xl font-bold text-blue-600">{barberData.customers}</p>
              <p className="text-xs text-blue-500 flex items-center mt-1">
                <UserGroupIcon className="h-3 w-3 mr-1" />
                {Math.round(barberData.customers * 0.75)} returning clients
              </p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Customer Rating</p>
              <p className="text-2xl font-bold text-yellow-600">{barberData.rating}</p>
              <p className="text-xs text-yellow-500 flex items-center mt-1">
                <StarIcon className="h-3 w-3 mr-1" />
                Based on {Math.round(barberData.customers * 0.6)} reviews
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Efficiency Score</p>
              <p className="text-2xl font-bold text-purple-600">{barberData.efficiency}%</p>
              <p className="text-xs text-purple-500 flex items-center mt-1">
                <ClockIcon className="h-3 w-3 mr-1" />
                {barberData.efficiency >= 90 ? 'Excellent' : barberData.efficiency >= 85 ? 'Good' : 'Needs improvement'}
              </p>
            </div>
            <AdjustmentsHorizontalIcon className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Daily Performance */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <ChartBarIcon className="h-5 w-5 mr-2 text-gray-700" />
            Daily Performance - {barberData.name}
          </h3>
          <button
            onClick={onNavigateUp}
            className="text-blue-600 text-sm hover:text-blue-800 flex items-center"
          >
            <ArrowTrendingUpIcon className="h-4 w-4 mr-1" />
            Back to Location View
          </button>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="revenue" fill="#10B981" name="Revenue ($)" />
              <Bar yAxisId="right" dataKey="customers" fill="#3B82F6" name="Customers" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Service Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <ScissorsIcon className="h-5 w-5 mr-2 text-gray-700" />
            Service Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceBreakdown}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                >
                  {serviceBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <StarIcon className="h-5 w-5 mr-2 text-gray-700" />
            Performance Insights
          </h3>
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h4 className="font-medium text-green-800 mb-2">✨ Top Strengths</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• High customer satisfaction ({barberData.rating}/5.0)</li>
                <li>• Consistent revenue performance</li>
                <li>• Excellent weekend productivity</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-medium text-yellow-800 mb-2">📈 Growth Opportunities</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Increase Tuesday/Wednesday bookings</li>
                <li>• Expand premium service offerings</li>
                <li>• Implement customer referral program</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Main Analytics Component
function KnowledgeEnhancedAnalytics() {
  const [currentLevel, setCurrentLevel] = useState('enterprise')
  const [currentData, setCurrentData] = useState(null)
  
  const handleDrillDown = (level, data) => {
    setCurrentLevel(level)
    setCurrentData(data)
  }
  
  const handleNavigate = (level) => {
    if (level === 'enterprise') {
      setCurrentLevel('enterprise')
      setCurrentData(null)
    }
  }
  
  const handleNavigateUp = () => {
    if (currentLevel === 'barber') {
      setCurrentLevel('location')
    } else if (currentLevel === 'location') {
      setCurrentLevel('enterprise')
      setCurrentData(null)
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <ChartBarIcon className="h-8 w-8 mr-3 text-blue-600" />
          Knowledge-Enhanced Analytics
        </h1>
        <p className="text-gray-600 mt-2">
          Multi-dimensional business intelligence with AI-powered insights
        </p>
      </div>
      
      {/* Navigation Breadcrumb */}
      <AnalyticsBreadcrumb 
        level={currentLevel} 
        levelData={currentData}
        onNavigate={handleNavigate}
      />
      
      {/* AI Insights for Current Level */}
      <AIAnalyticsInsights level={currentLevel} levelData={currentData} />
      
      {/* Dynamic Content Based on Level */}
      {currentLevel === 'enterprise' && (
        <EnterpriseAnalytics onDrillDown={handleDrillDown} />
      )}
      
      {currentLevel === 'location' && currentData && (
        <LocationAnalytics 
          locationData={currentData} 
          onDrillDown={handleDrillDown}
          onNavigateUp={handleNavigateUp}
        />
      )}
      
      {currentLevel === 'barber' && currentData && (
        <BarberAnalytics 
          barberData={currentData}
          onNavigateUp={handleNavigateUp}
        />
      )}
    </div>
  )
}

export default function KnowledgeEnhancedAnalyticsPage() {
  return (
    <ProtectedRoute>
      <KnowledgeEnhancedAnalytics />
    </ProtectedRoute>
  )
}
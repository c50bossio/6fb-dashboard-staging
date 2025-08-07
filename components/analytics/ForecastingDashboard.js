'use client'

import { 
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarIcon, 
  ChartBarIcon, CurrencyDollarIcon, UsersIcon,
  ExclamationTriangleIcon, InformationCircleIcon,
  ArrowUpIcon, ArrowDownIcon, ClockIcon, StarIcon
} from '@heroicons/react/24/outline'
import React, { useState, useEffect, useMemo } from 'react'
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, PieChart, Pie, Cell, RadialBarChart, RadialBar
} from 'recharts'

// Color palette for charts
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981', 
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#6366F1',
  success: '#059669',
  muted: '#6B7280'
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6']

export default function ForecastingDashboard({ barbershopId }) {
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedTimeframe, setSelectedTimeframe] = useState('1_month')
  const [refreshInterval, setRefreshInterval] = useState(null)

  // Fetch forecasting data
  useEffect(() => {
    const fetchForecastData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch data from all forecasting endpoints
        const [revenueResponse, bookingsResponse, trendsResponse] = await Promise.all([
          fetch(`/api/forecasting/revenue?barbershop_id=${barbershopId}&time_horizons=1_day,1_week,1_month,3_months,6_months,1_year`),
          fetch(`/api/forecasting/bookings?barbershop_id=${barbershopId}&forecast_days=30&granularity=daily`),
          fetch(`/api/forecasting/trends?barbershop_id=${barbershopId}&analysis_type=comprehensive&timeframe=1_year&projections=true`)
        ])

        if (!revenueResponse.ok || !bookingsResponse.ok || !trendsResponse.ok) {
          throw new Error('Failed to fetch forecasting data')
        }

        const [revenueData, bookingsData, trendsData] = await Promise.all([
          revenueResponse.json(),
          bookingsResponse.json(),
          trendsResponse.json()
        ])

        setForecastData({
          revenue: revenueData.data,
          bookings: bookingsData.data,
          trends: trendsData.data
        })

      } catch (err) {
        console.error('Error fetching forecast data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchForecastData()

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchForecastData, 5 * 60 * 1000)
    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [barbershopId])

  // Process data for charts
  const chartData = useMemo(() => {
    if (!forecastData) return {}

    return {
      revenueChart: processRevenueChartData(forecastData.revenue),
      bookingsChart: processBookingsChartData(forecastData.bookings),
      trendsChart: processTrendsChartData(forecastData.trends),
      seasonalChart: processSeasonalChartData(forecastData.trends),
      utilization: processUtilizationData(forecastData.bookings)
    }
  }, [forecastData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-lg text-gray-600">Loading forecasting insights...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-6">
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-400" />
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">Forecasting Error</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!forecastData) {
    return (
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No Forecasting Data</h3>
        <p className="mt-1 text-gray-500">Unable to generate forecasts with current data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Predictive Forecasting Dashboard</h2>
            <p className="text-gray-600 mt-1">Advanced AI-powered business forecasting and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-500">
              <ClockIcon className="h-4 w-4 mr-1" />
              Last updated: {new Date(forecastData.revenue.generated_at).toLocaleTimeString()}
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceColor(forecastData.revenue.overall_confidence)}`}>
              {Math.round(forecastData.revenue.overall_confidence * 100)}% Confidence
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Revenue Forecast"
          value={`$${Math.round(forecastData.revenue.forecasts['1_month']?.predicted_revenue || 0)}`}
          change={calculateChange(forecastData.revenue.forecasts)}
          icon={CurrencyDollarIcon}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Booking Demand"
          value={forecastData.bookings.summary?.total_predicted_bookings || 0}
          change={`${Math.round((forecastData.bookings.summary?.overall_utilization || 0) * 100)}% utilization`}
          icon={CalendarIcon}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Growth Trend"
          value={`${(forecastData.trends.trend_analysis?.overall_trend?.growthRate * 100 || 0).toFixed(1)}%`}
          change={forecastData.trends.trend_analysis?.overall_trend?.direction || 'stable'}
          icon={ArrowTrendingUpIcon}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <MetricCard
          title="Seasonal Impact"
          value={`${Math.round((forecastData.trends.seasonal_patterns?.seasonal_strength || 0) * 100)}%`}
          change="Peak season approaching"
          icon={StarIcon}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'revenue', name: 'Revenue Forecasting', icon: CurrencyDollarIcon },
              { id: 'bookings', name: 'Booking Demand', icon: CalendarIcon },
              { id: 'trends', name: 'Seasonal Trends', icon: ArrowTrendingUpIcon },
              { id: 'insights', name: 'AI Insights', icon: InformationCircleIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab data={forecastData} chartData={chartData} />}
          {activeTab === 'revenue' && <RevenueTab data={forecastData.revenue} chartData={chartData} />}
          {activeTab === 'bookings' && <BookingsTab data={forecastData.bookings} chartData={chartData} />}
          {activeTab === 'trends' && <TrendsTab data={forecastData.trends} chartData={chartData} />}
          {activeTab === 'insights' && <InsightsTab data={forecastData} />}
        </div>
      </div>
    </div>
  )
}

// Tab Components
function OverviewTab({ data, chartData }) {
  return (
    <div className="space-y-6">
      {/* Revenue and Bookings Combined Chart */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Booking Forecast</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData.revenueChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" stroke="#6b7280" />
              <YAxis yAxisId="revenue" orientation="left" stroke="#3b82f6" />
              <YAxis yAxisId="bookings" orientation="right" stroke="#10b981" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value, name) => [
                  name === 'revenue' ? `$${Math.round(value)}` : `${Math.round(value)} bookings`,
                  name === 'revenue' ? 'Revenue' : 'Bookings'
                ]}
              />
              <Legend />
              <Area
                yAxisId="revenue"
                type="monotone"
                dataKey="revenue"
                fill="#3b82f6"
                fillOpacity={0.1}
                stroke="#3b82f6"
                strokeWidth={2}
                name="Revenue"
              />
              <Line
                yAxisId="bookings"
                type="monotone"
                dataKey="bookings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Bookings"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightCard
          title="Peak Demand Forecast"
          insight={data.bookings.business_insights?.[0]}
          color="bg-blue-50 border-blue-200"
        />
        <InsightCard
          title="Revenue Opportunity"
          insight={data.revenue.business_insights?.[0]}
          color="bg-green-50 border-green-200"
        />
      </div>

      {/* Utilization Chart */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacity Utilization Forecast</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.utilization}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => `${Math.round(value * 100)}%`} />
              <Tooltip 
                formatter={(value) => [`${Math.round(value * 100)}%`, 'Utilization']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Bar dataKey="utilization" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function RevenueTab({ data, chartData }) {
  return (
    <div className="space-y-6">
      {/* Revenue Forecast Chart */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Revenue Forecasting</h3>
          <div className="text-sm text-gray-500">
            Model: {data.forecasts?.['1_month']?.model_details?.model_type || 'Statistical'}
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.revenueChart}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => `$${Math.round(value)}`} />
              <Tooltip 
                formatter={(value) => [`$${Math.round(value)}`, 'Revenue']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#revenueGradient)"
              />
              <Area
                type="monotone"
                dataKey="confidenceUpper"
                stroke="#93c5fd"
                strokeDasharray="5 5"
                fillOpacity={0}
              />
              <Area
                type="monotone"
                dataKey="confidenceLower"
                stroke="#93c5fd"
                strokeDasharray="5 5"
                fillOpacity={0}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Forecast Accuracy</h4>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Model Confidence</span>
              <span className="font-semibold text-green-600">
                {Math.round(data.overall_confidence * 100)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">R² Score</span>
              <span className="font-semibold">
                {data.forecasts?.['1_month']?.accuracy_metrics?.r2_score?.toFixed(3) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Mean Absolute Error</span>
              <span className="font-semibold">
                ${Math.round(data.forecasts?.['1_month']?.accuracy_metrics?.mae || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h4>
          <div className="space-y-3">
            {data.risk_analysis?.risk_factors?.map((risk, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-600">{risk.factor}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  risk.impact === 'high' ? 'bg-red-100 text-red-800' :
                  risk.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {risk.impact}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function BookingsTab({ data, chartData }) {
  return (
    <div className="space-y-6">
      {/* Booking Demand Chart */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Demand Forecast</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.bookingsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value, name) => [
                  `${Math.round(value)} ${name === 'bookings' ? 'bookings' : '%'}`,
                  name === 'bookings' ? 'Predicted Bookings' : 'Utilization'
                ]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="bookings"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Predicted Bookings"
              />
              <Line
                type="monotone"
                dataKey="utilization"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Utilization %"
                yAxisId="right"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Demand Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Service Demand Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={processServiceDemandData(data.demand_patterns?.service_demand_breakdown)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {processServiceDemandData(data.demand_patterns?.service_demand_breakdown).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Peak Hours Analysis</h4>
          <div className="space-y-3">
            {Object.entries(data.demand_patterns?.hourly_distribution || {}).slice(0, 6).map(([hour, demand]) => (
              <div key={hour} className="flex items-center">
                <span className="w-16 text-sm text-gray-600">{hour}</span>
                <div className="flex-1 mx-3 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(demand.demand || 0) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round((demand.demand || 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capacity Optimization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Capacity Optimization Recommendations</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.capacity_insights?.underutilized_periods?.map((period, index) => (
            <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="font-medium text-yellow-800">{period.day}</h5>
              <p className="text-sm text-yellow-700 mt-1">
                Underutilized: {period.hours.join(', ')}
              </p>
              <p className="text-xs text-yellow-600 mt-2">
                Consider promotional pricing
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function TrendsTab({ data, chartData }) {
  return (
    <div className="space-y-6">
      {/* Seasonal Patterns Chart */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Seasonal Patterns Analysis</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.seasonalChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => `${Math.round(value * 100)}%`} />
              <Tooltip 
                formatter={(value) => [`${Math.round(value * 100)}%`, 'Seasonal Factor']}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Area
                type="monotone"
                dataKey="factor"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Growth Trends</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Overall Trend</span>
              <div className="flex items-center">
                {data.trend_analysis?.overall_trend?.direction === 'increasing' ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                ) : data.trend_analysis?.overall_trend?.direction === 'decreasing' ? (
                  <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                ) : (
                  <div className="h-4 w-4 bg-gray-400 rounded-full mr-1"></div>
                )}
                <span className="font-semibold capitalize">
                  {data.trend_analysis?.overall_trend?.direction || 'stable'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Monthly Growth Rate</span>
              <span className="font-semibold text-green-600">
                {((data.trend_analysis?.overall_trend?.growthRate || 0) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Trend Strength</span>
              <div className="flex items-center">
                <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(data.trend_analysis?.trend_strength || 0) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {Math.round((data.trend_analysis?.trend_strength || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Peak Seasons</h4>
          <div className="space-y-3">
            {data.seasonal_patterns?.peak_seasons?.map((season, index) => (
              <div key={index} className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900">{season.season}</span>
                  <p className="text-sm text-gray-500">
                    Next: {new Date(season.nextOccurrence).toLocaleDateString()}
                  </p>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  +{Math.round((season.multiplier - 1) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Projections */}
      {data.projections && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Future Projections</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProjectionCard
              title="Next 3 Months"
              data={data.projections.next_3_months}
              confidence={data.projections.projection_confidence}
            />
            <ProjectionCard
              title="Next 6 Months"
              data={data.projections.next_6_months}
              confidence={data.projections.projection_confidence}
            />
            <ProjectionCard
              title="Next 12 Months"
              data={data.projections.next_12_months}
              confidence={data.projections.projection_confidence}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function InsightsTab({ data }) {
  const allInsights = [
    ...(data.revenue.business_insights || []),
    ...(data.bookings.business_insights || []),
    ...(data.trends.business_insights || [])
  ].sort((a, b) => (b.impact_score || 0) - (a.impact_score || 0))

  return (
    <div className="space-y-6">
      {/* Strategic Recommendations */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Strategic Recommendations</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {data.trends.strategic_recommendations?.map((rec, index) => (
            <div key={index} className="bg-white rounded-lg p-4 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 capitalize">
                  {rec.category.replace('_', ' ')}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                  rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {rec.priority}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">{rec.expected_impact}</p>
              <ul className="text-xs text-gray-500 space-y-1">
                {rec.actions?.map((action, actionIndex) => (
                  <li key={actionIndex} className="flex items-center">
                    <div className="w-1 h-1 bg-blue-400 rounded-full mr-2"></div>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* AI Insights */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">AI-Generated Business Insights</h3>
        {allInsights.map((insight, index) => (
          <InsightCard
            key={index}
            title={insight.title}
            insight={insight}
            color={getInsightColor(insight.type)}
          />
        ))}
      </div>

      {/* Performance Benchmarks */}
      {data.trends.performance_benchmarks && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Performance Benchmarks</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(data.trends.performance_benchmarks.industry_comparison).map(([metric, data]) => (
              <div key={metric} className="text-center">
                <h5 className="font-medium text-gray-900 capitalize mb-2">
                  {metric.replace('_', ' ')}
                </h5>
                <div className="relative">
                  <div className="text-2xl font-bold text-blue-600">
                    {data.percentile}th
                  </div>
                  <div className="text-sm text-gray-500">percentile</div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  You: {typeof data.your_business === 'number' ? 
                    `${(data.your_business * 100).toFixed(1)}%` : 
                    data.your_business}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper Components
function MetricCard({ title, value, change, icon: Icon, color, bgColor }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`${bgColor} rounded-lg p-3`}>
          <Icon className={`h-6 w-6 ${color}`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{change}</p>
        </div>
      </div>
    </div>
  )
}

function InsightCard({ title, insight, color }) {
  return (
    <div className={`border rounded-lg p-6 ${color}`}>
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-semibold text-gray-900">{title}</h4>
        <div className="flex items-center space-x-2">
          {insight.confidence && (
            <span className="text-xs text-gray-500">
              {Math.round(insight.confidence * 100)}% confidence
            </span>
          )}
          {insight.priority && (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              insight.priority === 'high' ? 'bg-red-100 text-red-800' :
              insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {insight.priority}
            </span>
          )}
        </div>
      </div>
      <p className="text-gray-700 mb-4">{insight.description}</p>
      {insight.recommendations && (
        <div>
          <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
          <ul className="text-sm text-gray-600 space-y-1">
            {insight.recommendations.map((rec, index) => (
              <li key={index} className="flex items-center">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></div>
                {typeof rec === 'string' ? rec : rec.action || rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ProjectionCard({ title, data, confidence }) {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-lg p-4">
      <h5 className="font-medium text-gray-900 mb-2">{title}</h5>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Projected Revenue</span>
          <span className="text-sm font-semibold text-gray-900">
            ${Math.round(data?.projected_revenue || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Confidence</span>
          <span className="text-sm font-semibold text-blue-600">
            {Math.round((data?.confidence || confidence || 0) * 100)}%
          </span>
        </div>
      </div>
      <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
        <div
          className="bg-blue-600 h-1 rounded-full"
          style={{ width: `${Math.round((data?.confidence || confidence || 0) * 100)}%` }}
        ></div>
      </div>
    </div>
  )
}

// Helper Functions
function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return 'bg-green-100 text-green-800'
  if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
  return 'bg-red-100 text-red-800'
}

function getInsightColor(type) {
  const colors = {
    'revenue_opportunity': 'bg-green-50 border-green-200',
    'demand_optimization': 'bg-blue-50 border-blue-200',
    'seasonal_opportunity': 'bg-purple-50 border-purple-200',
    'growth_trend': 'bg-indigo-50 border-indigo-200',
    'market_positioning': 'bg-orange-50 border-orange-200',
    'utilization_improvement': 'bg-cyan-50 border-cyan-200'
  }
  return colors[type] || 'bg-gray-50 border-gray-200'
}

function calculateChange(forecasts) {
  if (!forecasts || !forecasts['1_week'] || !forecasts['1_day']) return 'N/A'
  
  const weekRevenue = forecasts['1_week'].predicted_revenue
  const dayRevenue = forecasts['1_day'].predicted_revenue
  const change = ((weekRevenue - dayRevenue) / dayRevenue) * 100
  
  return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`
}

function processRevenueChartData(revenueData) {
  if (!revenueData || !revenueData.forecasts) return []
  
  return Object.entries(revenueData.forecasts).map(([period, data]) => ({
    period: period.replace('_', ' '),
    revenue: data.predicted_revenue,
    confidenceUpper: data.confidence_interval?.upper_bound,
    confidenceLower: data.confidence_interval?.lower_bound
  }))
}

function processBookingsChartData(bookingsData) {
  if (!bookingsData || !bookingsData.daily_forecasts) return []
  
  return bookingsData.daily_forecasts.slice(0, 14).map(forecast => ({
    date: new Date(forecast.forecast_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    bookings: forecast.predicted_bookings,
    utilization: forecast.utilization_rate * 100
  }))
}

function processTrendsChartData(trendsData) {
  if (!trendsData || !trendsData.seasonal_patterns) return []
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return months.map((month, index) => ({
    month,
    trend: Math.sin((index / 12) * 2 * Math.PI) * 0.2 + 1
  }))
}

function processSeasonalChartData(trendsData) {
  if (!trendsData) return []
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const seasonalFactors = [0.88, 0.92, 1.02, 1.08, 1.12, 1.18, 1.15, 1.10, 1.05, 1.08, 1.14, 1.20]
  
  return months.map((month, index) => ({
    month,
    factor: seasonalFactors[index]
  }))
}

function processUtilizationData(bookingsData) {
  if (!bookingsData || !bookingsData.daily_forecasts) return []
  
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const utilizationByDay = {}
  
  // Group by day of week
  bookingsData.daily_forecasts.forEach(forecast => {
    const date = new Date(forecast.forecast_date)
    const dayName = weekdays[date.getDay() === 0 ? 6 : date.getDay() - 1]
    
    if (!utilizationByDay[dayName]) {
      utilizationByDay[dayName] = []
    }
    utilizationByDay[dayName].push(forecast.utilization_rate)
  })
  
  // Calculate averages
  return weekdays.map(day => ({
    day,
    utilization: utilizationByDay[day] ? 
      utilizationByDay[day].reduce((a, b) => a + b, 0) / utilizationByDay[day].length : 
      0.7
  }))
}

function processServiceDemandData(serviceDemand) {
  if (!serviceDemand) {
    return [
      { name: 'Classic Haircut', value: 45 },
      { name: 'Beard Trim', value: 25 },
      { name: 'Hair Styling', value: 20 },
      { name: 'Hair Wash', value: 10 }
    ]
  }
  
  return Object.entries(serviceDemand).map(([service, data]) => ({
    name: service,
    value: (data.percentage || 0) * 100
  }))
}
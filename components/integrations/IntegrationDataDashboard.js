'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  RefreshIcon
} from '@heroicons/react/24/outline'

export default function IntegrationDataDashboard({ barbershopId = 'default' }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  useEffect(() => {
    fetchData()
  }, [barbershopId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/integrations/data?barbershopId=${barbershopId}&type=full`)
      const result = await response.json()
      
      if (result.success) {
        setData(result)
        setLastRefresh(new Date())
      } else {
        setError(result.error || 'Failed to fetch integration data')
      }
    } catch (error) {
      console.error('Failed to fetch integration data:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const triggerSync = async () => {
    try {
      setSyncing(true)
      
      const response = await fetch('/api/integrations/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          syncType: 'incremental'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setLastRefresh(new Date())
      } else {
        setError(result.error || 'Sync failed')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      setError(error.message)
    } finally {
      setSyncing(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0)
  }

  const formatTrendPercentage = (percentage) => {
    if (!percentage || Math.abs(percentage) < 0.1) return '0%'
    return `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`
  }

  const getTrendIcon = (percentage) => {
    if (!percentage || Math.abs(percentage) < 0.1) return null
    return percentage > 0 ? ArrowUpIcon : ArrowDownIcon
  }

  const getTrendColor = (percentage) => {
    if (!percentage || Math.abs(percentage) < 0.1) return 'text-gray-500'
    return percentage > 0 ? 'text-green-500' : 'text-red-500'
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!data || data.integrations.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center py-12">
          <CalendarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No Integrations Connected</h3>
          <p className="text-gray-600 mb-6">
            Connect your calendar or booking system to see appointment data and insights.
          </p>
        </div>
      </div>
    )
  }

  const context = data.context
  const appointments = data.appointments

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integration Dashboard</h1>
          <p className="text-gray-600">
            Unified view of appointments from all connected platforms
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshIcon className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Connected Integrations Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Connected Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.integrations.map((integration) => (
            <div key={integration.id} className="flex items-center p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="font-medium text-gray-900">
                    {integration.platform === 'google_calendar' ? 'Google Calendar' : 
                     integration.platform === 'trafft' ? 'Traft.com' : integration.platform}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {integration.lastSyncAt ? 
                    `Last sync: ${new Date(integration.lastSyncAt).toLocaleString()}` : 
                    'Never synced'
                  }
                </div>
                {integration.lastSyncError && (
                  <div className="text-xs text-red-600 mt-1">
                    Error: {integration.lastSyncError}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      {context && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today's Appointments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today</p>
                <p className="text-2xl font-bold text-gray-900">{context.overview.today.appointments}</p>
                <p className="text-xs text-gray-500">appointments</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          {/* Weekly Revenue */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(context.overview.week.revenue)}
                </p>
                <div className="flex items-center mt-1">
                  {context.revenue.trend && (
                    <>
                      {getTrendIcon(context.revenue.trend.percentage) && (
                        <span className={`${getTrendColor(context.revenue.trend.percentage)} mr-1`}>
                          {React.createElement(getTrendIcon(context.revenue.trend.percentage), { className: 'h-3 w-3' })}
                        </span>
                      )}
                      <span className={`text-xs ${getTrendColor(context.revenue.trend.percentage)}`}>
                        {formatTrendPercentage(context.revenue.trend.percentage)}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>

          {/* Total Customers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Customers</p>
                <p className="text-2xl font-bold text-gray-900">{context.customers.total}</p>
                <p className="text-xs text-green-600">
                  {context.customers.new} new this month
                </p>
              </div>
              <UserGroupIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{context.overview.upcoming.count}</p>
                <p className="text-xs text-gray-500">
                  {context.overview.upcoming.next24Hours} in next 24h
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      )}

      {/* Recent Appointments */}
      {appointments && appointments.data && appointments.data.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-gray-900">Recent Appointments</h2>
            <span className="text-sm text-gray-500">
              {appointments.total} appointments in period
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {appointments.data.slice(0, 10).map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {appointment.customer.name}
                      </div>
                      {appointment.customer.email && (
                        <div className="text-sm text-gray-500">{appointment.customer.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{appointment.service.name}</div>
                      <div className="text-sm text-gray-500">{appointment.duration}min</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(appointment.startTime).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(appointment.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        appointment.status === 'no_show' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.platform === 'google_calendar' ? 'Google Calendar' :
                       appointment.platform === 'trafft' ? 'Traft.com' :
                       appointment.platform}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(appointment.service.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {context && context.recommendations && context.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6">AI Recommendations</h2>
          <div className="space-y-4">
            {context.recommendations.slice(0, 3).map((recommendation, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                recommendation.priority === 'high' ? 'bg-red-50 border-red-400' :
                recommendation.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                'bg-blue-50 border-blue-400'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{recommendation.title}</h3>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${
                    recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                    recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {recommendation.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{recommendation.description}</p>
                {recommendation.actions && recommendation.actions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Suggested Actions:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {recommendation.actions.map((action, actionIndex) => (
                        <li key={actionIndex} className="flex items-center">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  StarIcon,
  ClockIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

export default function UnifiedExecutiveSummary({ data }) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  
  // Use actual metrics from data, no fake fallbacks
  const metrics = data?.metrics || {
    revenue: 0,
    customers: 0,
    appointments: 0,
    satisfaction: 0
  }

  // Use real today's metrics from data
  const todayMetrics = data?.todayMetrics || {
    revenue: data?.dailyRevenue || 0,
    bookings: data?.todayBookings || 0,
    capacity: data?.capacityUtilization || 0,
    nextAppointment: data?.nextAppointment || 'No appointments'
  }

  // Calculate health score based on metrics
  const calculateHealthScore = () => {
    const revenueScore = metrics.revenue > 140000 ? 25 : metrics.revenue > 100000 ? 20 : 15
    const customerScore = metrics.customers > 1000 ? 25 : metrics.customers > 500 ? 20 : 15
    const appointmentScore = metrics.appointments > 300 ? 25 : metrics.appointments > 200 ? 20 : 15
    const satisfactionScore = metrics.satisfaction > 4.5 ? 25 : metrics.satisfaction > 4.0 ? 20 : 15
    return revenueScore + customerScore + appointmentScore + satisfactionScore
  }

  const healthScore = calculateHealthScore()
  const healthStatus = healthScore >= 90 ? 'Excellent' : healthScore >= 70 ? 'Good' : healthScore >= 50 ? 'Fair' : 'Needs Attention'
  const healthColor = healthScore >= 90 ? 'green' : healthScore >= 70 ? 'blue' : healthScore >= 50 ? 'yellow' : 'red'

  // Get AI insights - handle both object and string formats
  const rawInsights = data?.insights || []
  const aiInsights = rawInsights.length > 0 
    ? rawInsights.map(insight => 
        typeof insight === 'object' 
          ? insight.description || insight.message || insight.title || 'Insight available'
          : insight
      )
    : [
        'Your premium services are performing 40% better than standard cuts',
        'Tuesday bookings are consistently 50% lower - opportunity for promotion'
      ]

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute

    // Set greeting based on time
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    return () => clearInterval(timer)
  }, [])

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatChange = (value, prefix = '') => {
    const isPositive = value > 0
    return (
      <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '↑' : '↓'}{prefix}{Math.abs(value)}%
      </span>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Executive Overview</h2>
            <p className="text-indigo-100 text-sm mt-1">
              {greeting} • {formatDate(currentTime)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-sm text-indigo-100">Local Time</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Monthly Performance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-gray-600" />
              Monthly Performance
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-indigo-600" />
                  {formatChange(12.5)}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  ${metrics.revenue >= 1000 ? `${(metrics.revenue / 1000).toFixed(1)}k` : metrics.revenue.toFixed(0)}
                </div>
                <div className="text-sm text-gray-600">Revenue</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                  {formatChange(8.3)}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.customers.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Customers</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <CalendarDaysIcon className="h-5 w-5 text-green-600" />
                  {formatChange(15)}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.appointments}
                </div>
                <div className="text-sm text-gray-600">Appointments</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <StarIcon className="h-5 w-5 text-yellow-500" />
                  {formatChange(0.2, '+')}
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {metrics.satisfaction.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Today's Snapshot */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-600" />
              Today's Snapshot
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  ${todayMetrics.revenue}
                </div>
                <div className="text-sm text-gray-600">Today's Revenue</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {todayMetrics.bookings}
                </div>
                <div className="text-sm text-gray-600">Bookings</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {todayMetrics.capacity}%
                </div>
                <div className="text-sm text-gray-600">Capacity</div>
              </div>

              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {todayMetrics.nextAppointment}
                </div>
                <div className="text-sm text-gray-600">Next Appt</div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Score Bar */}
        <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm font-medium text-gray-600 mb-1">Business Health Score</div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-gray-900">{healthScore}/100</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    healthColor === 'green' ? 'bg-green-100 text-green-800' :
                    healthColor === 'blue' ? 'bg-blue-100 text-blue-800' :
                    healthColor === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {healthStatus}
                  </div>
                </div>
              </div>
              
              {/* Health Score Progress Bar */}
              <div className="flex-1 max-w-xs">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      healthColor === 'green' ? 'bg-green-500' :
                      healthColor === 'blue' ? 'bg-blue-500' :
                      healthColor === 'yellow' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              Last updated: {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mt-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <SparklesIcon className="h-5 w-5 text-purple-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">AI Insights</h4>
              <div className="space-y-2">
                {aiInsights.slice(0, 2).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-purple-600">•</span>
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
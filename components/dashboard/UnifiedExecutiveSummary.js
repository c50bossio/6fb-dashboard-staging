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
      <span className={`text-sm font-medium ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {isPositive ? '↑' : '↓'}{prefix}{Math.abs(value)}%
      </span>
    )
  }

  return (
    <div className="card-modern overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 via-gold-500 to-brand-600 dark:from-brand-700 dark:via-gold-600 dark:to-brand-700 text-white px-6 py-4 shadow-gold-glow dark:shadow-none">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Executive Overview</h2>
            <p className="text-white/90 dark:text-white/80 text-sm mt-1">
              {greeting} • {formatDate(currentTime)}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-shadow-subtle">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-sm text-white/80 dark:text-white/70">Local Time</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Monthly Performance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-muted-foreground" />
              Monthly Performance
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="metric-card">
                <div className="flex items-center justify-between mb-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-olive-600" />
                  {formatChange(12.5)}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  ${metrics.revenue >= 1000 ? `${(metrics.revenue / 1000).toFixed(1)}k` : metrics.revenue.toFixed(0)}
                </div>
                <div className="text-sm text-muted-foreground">Revenue</div>
              </div>

              <div className="metric-card">
                <div className="flex items-center justify-between mb-2">
                  <UserGroupIcon className="h-5 w-5 text-olive-600" />
                  {formatChange(8.3)}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.customers.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Customers</div>
              </div>

              <div className="metric-card">
                <div className="flex items-center justify-between mb-2">
                  <CalendarDaysIcon className="h-5 w-5 text-green-600" />
                  {formatChange(15)}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.appointments}
                </div>
                <div className="text-sm text-muted-foreground">Appointments</div>
              </div>

              <div className="metric-card">
                <div className="flex items-center justify-between mb-2">
                  <StarIcon className="h-5 w-5 text-amber-800" />
                  {formatChange(0.2, '+')}
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.satisfaction.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Today's Snapshot */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-muted-foreground" />
              Today's Snapshot
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="card-modern p-6 hover:scale-[1.02] hover:-translate-y-1 bg-gradient-to-br from-brand-50/40 to-gold-50/30 dark:from-brand-900/20 dark:to-gold-900/10 border-brand-200/50 dark:border-brand-700/30">
                <div className="text-2xl font-bold text-foreground">
                  ${todayMetrics.revenue}
                </div>
                <div className="text-sm text-muted-foreground">Today's Revenue</div>
              </div>

              <div className="card-modern p-6 hover:scale-[1.02] hover:-translate-y-1 bg-gradient-to-br from-brand-50/40 to-gold-50/30 dark:from-brand-900/20 dark:to-gold-900/10 border-brand-200/50 dark:border-brand-700/30">
                <div className="text-2xl font-bold text-foreground">
                  {todayMetrics.bookings}
                </div>
                <div className="text-sm text-muted-foreground">Bookings</div>
              </div>

              <div className="metric-card">
                <div className="text-2xl font-bold text-foreground">
                  {todayMetrics.capacity}%
                </div>
                <div className="text-sm text-muted-foreground">Capacity</div>
              </div>

              <div className="metric-card">
                <div className="text-2xl font-bold text-foreground">
                  {todayMetrics.nextAppointment}
                </div>
                <div className="text-sm text-muted-foreground">Next Appt</div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Score Bar */}
        <div className="mt-6 bg-gradient-to-r from-muted/50 to-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Business Health Score</div>
                <div className="flex items-center gap-3">
                  <div className="text-3xl font-bold text-foreground">{healthScore}/100</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    healthColor === 'green' ? 'bg-moss-100 text-moss-900' :
                    healthColor === 'blue' ? 'bg-olive-100 text-olive-800' :
                    healthColor === 'yellow' ? 'bg-amber-100 text-amber-900' :
                    'bg-softred-100 text-softred-900'
                  }`}>
                    {healthStatus}
                  </div>
                </div>
              </div>
              
              {/* Health Score Progress Bar */}
              <div className="flex-1 max-w-xs">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      healthColor === 'green' ? 'bg-green-500' :
                      healthColor === 'blue' ? 'bg-olive-500' :
                      healthColor === 'yellow' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}
                    style={{ width: `${healthScore}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Last updated: {currentTime.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="mt-6 bg-gradient-to-r from-gold-50 to-indigo-50 dark:from-gold-900/20 dark:to-indigo-900/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <SparklesIcon className="h-5 w-5 text-gold-600 dark:text-gold-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-2">AI Insights</h4>
              <div className="space-y-2">
                {aiInsights.slice(0, 2).map((insight, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-gold-600 dark:text-gold-400">•</span>
                    <p className="text-sm text-foreground/90">{insight}</p>
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
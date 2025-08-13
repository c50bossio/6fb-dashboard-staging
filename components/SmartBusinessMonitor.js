'use client'

import { useState, useEffect } from 'react'
import { 
  BellIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  XMarkIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

export default function SmartBusinessMonitor({ barbershop_id = 'demo' }) {
  const [businessHealth, setBusinessHealth] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [dailyPulse, setDailyPulse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)

  useEffect(() => {
    loadBusinessData()
    
    // Update every 5 minutes
    const interval = setInterval(() => {
      loadBusinessData()
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [barbershop_id])

  const loadBusinessData = async () => {
    try {
      setLoading(true)
      
      // Load business health status
      const healthResponse = await fetch(`/api/ai/business-monitor?barbershop_id=${barbershop_id}`)
      const healthData = await healthResponse.json()
      
      if (healthData.success) {
        setBusinessHealth(healthData.data.overall_health)
        setAlerts(healthData.data.alerts || [])
      }
      
      // Load daily business pulse
      const pulseResponse = await fetch(`/api/ai/daily-report?barbershop_id=${barbershop_id}&type=business_pulse`)
      const pulseData = await pulseResponse.json()
      
      if (pulseData.success) {
        setDailyPulse(pulseData.pulse)
      }
      
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load business data:', error)
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = async (alertId) => {
    try {
      await fetch('/api/ai/business-monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss_alert',
          alert_id: alertId,
          barbershop_id
        })
      })
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  const getHealthColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-olive-600 bg-olive-50 border-olive-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getHealthIcon = (status) => {
    switch (status) {
      case 'excellent': return <CheckCircleIcon className="h-5 w-5" />
      case 'good': return <ChartBarIcon className="h-5 w-5" />
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5" />
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5" />
      default: return <ChartBarIcon className="h-5 w-5" />
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'opportunity': return <LightBulbIcon className="h-5 w-5 text-olive-500" />
      default: return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getAlertBorderColor = (type) => {
    switch (type) {
      case 'critical': return 'border-l-red-500 bg-red-50'
      case 'warning': return 'border-l-yellow-500 bg-yellow-50'
      case 'opportunity': return 'border-l-blue-500 bg-olive-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  if (loading && !dailyPulse) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 border animate-pulse">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="h-6 bg-gray-200 rounded w-48"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Business Health Overview */}
      {businessHealth && (
        <div className={`rounded-lg p-6 border-2 ${getHealthColor(businessHealth.status)}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              {getHealthIcon(businessHealth.status)}
              <div>
                <h3 className="text-lg font-semibold">Business Health Score</h3>
                <p className="text-2xl font-bold">{businessHealth.score}/100</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm opacity-75">Status</div>
              <div className="font-semibold capitalize">{businessHealth.status}</div>
            </div>
          </div>
          <p className="mt-3 text-sm">{businessHealth.description}</p>
          {lastUpdate && (
            <div className="mt-3 text-xs opacity-60">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}

      {/* Daily Business Pulse */}
      {dailyPulse && (
        <div className="bg-gradient-to-r from-olive-50 to-indigo-50 rounded-lg p-6 border border-olive-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-olive-900">{dailyPulse.greeting}</h3>
            <div className="text-sm text-olive-700">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* Today's Snapshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-olive-900">{dailyPulse.todays_snapshot.revenue}</div>
              <div className="text-sm text-olive-700">Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-olive-900">{dailyPulse.todays_snapshot.bookings}</div>
              <div className="text-sm text-olive-700">Bookings</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-olive-900">{dailyPulse.todays_snapshot.capacity_utilization}</div>
              <div className="text-sm text-olive-700">Capacity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-olive-900">{dailyPulse.todays_snapshot.next_appointment}</div>
              <div className="text-sm text-olive-700">Next Appt</div>
            </div>
          </div>

          {/* Quick Insights */}
          {dailyPulse.quick_insights && dailyPulse.quick_insights.length > 0 && (
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="font-medium text-olive-900 mb-2">💡 AI Insights</h4>
              <div className="space-y-1">
                {dailyPulse.quick_insights.slice(0, 2).map((insight, idx) => (
                  <div key={idx} className="text-sm text-olive-800">{insight}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Smart Alerts */}
      {alerts.length > 0 && showAlerts && (
        <div className="bg-white rounded-lg shadow-md border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-2">
              <BellIcon className="h-5 w-5 text-amber-500" />
              <h3 className="font-semibold">Smart Alerts</h3>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                {alerts.length}
              </span>
            </div>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
          
          <div className="divide-y">
            {alerts.map((alert, idx) => (
              <div key={alert.id || idx} className={`p-4 border-l-4 ${getAlertBorderColor(alert.type)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{alert.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      {alert.actions && alert.actions.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs text-gray-500 mb-1">Suggested actions:</div>
                          <ul className="text-xs space-y-1">
                            {alert.actions.slice(0, 2).map((action, actionIdx) => (
                              <li key={actionIdx} className="flex items-center space-x-1">
                                <span className="text-green-600">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {alert.impact && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        alert.impact === 'high' ? 'bg-red-100 text-red-800' :
                        alert.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {alert.impact} impact
                      </span>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Actions */}
      {dailyPulse?.priority_actions && dailyPulse.priority_actions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span>Priority Actions for Today</span>
            </h3>
          </div>
          <div className="divide-y">
            {dailyPulse.priority_actions.map((action, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{action.action}</div>
                  <div className="text-sm text-gray-600">Estimated time: {action.estimated_time}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    action.urgency === 'high' ? 'bg-red-100 text-red-800' :
                    action.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {action.urgency}
                  </span>
                  <button className="text-sm text-olive-600 hover:text-olive-800 font-medium">
                    Mark Done
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
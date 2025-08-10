'use client'

import { useState, useEffect } from 'react'
import {
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ArrowRightIcon,
  XMarkIcon,
  ChevronRightIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

export default function SmartAlertsPanel({ barbershop_id = 'demo' }) {
  const [alerts, setAlerts] = useState([])
  const [priorityActions, setPriorityActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [barbershop_id])

  const loadAlerts = async () => {
    try {
      const response = await fetch(`/api/ai/business-monitor?barbershop_id=${barbershop_id}`)
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.data.alerts || generateMockAlerts())
        setPriorityActions(data.data.priority_actions || generateMockPriorityActions())
      } else {
        // Use mock data as fallback
        setAlerts(generateMockAlerts())
        setPriorityActions(generateMockPriorityActions())
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
      // Use mock data as fallback
      setAlerts(generateMockAlerts())
      setPriorityActions(generateMockPriorityActions())
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

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
      case 'info': return <InformationCircleIcon className="h-5 w-5 text-blue-500" />
      case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      default: return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getAlertBorderColor = (type) => {
    switch (type) {
      case 'critical': return 'border-l-red-500 bg-red-50'
      case 'warning': return 'border-l-amber-500 bg-amber-50'
      case 'info': return 'border-l-blue-500 bg-blue-50'
      case 'success': return 'border-l-green-500 bg-green-50'
      default: return 'border-l-gray-500 bg-gray-50'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-amber-600 bg-amber-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="text-gray-600 mt-2">Loading alerts...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Smart Alerts */}
      {alerts.length > 0 && showAlerts && (
        <div className="bg-white rounded-lg shadow-sm border">
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
                      
                      {alert.recommendation && (
                        <div className="mt-3 flex items-start space-x-2">
                          <LightBulbIcon className="h-4 w-4 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Recommendation:</p>
                            <p className="text-sm text-gray-600">{alert.recommendation}</p>
                          </div>
                        </div>
                      )}
                      
                      {alert.action_required && (
                        <button className="mt-3 text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center">
                          {alert.action_text || 'Take Action'}
                          <ArrowRightIcon className="h-3 w-3 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-gray-400 hover:text-gray-600 ml-4"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Actions */}
      {priorityActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex items-center space-x-2">
              <ClockIcon className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold">Priority Actions</h3>
            </div>
          </div>
          <div className="divide-y">
            {priorityActions.map((action, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(action.priority)}`}>
                      {action.priority}
                    </span>
                    <h4 className="font-medium text-gray-900">{action.title}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  {action.deadline && (
                    <p className="text-xs text-gray-500 mt-1">Due: {action.deadline}</p>
                  )}
                </div>
                <ChevronRightIcon className="h-5 w-5 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {alerts.length === 0 && priorityActions.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900">All Clear!</h3>
          <p className="text-gray-600 mt-1">No alerts or priority actions at the moment.</p>
        </div>
      )}
    </div>
  )
}

// Mock data generators
function generateMockAlerts() {
  return [
    {
      id: 'alert_1',
      type: 'warning',
      title: 'Low Tuesday Bookings',
      message: 'Bookings for Tuesday are 50% below average',
      recommendation: 'Consider offering a Tuesday special promotion',
      action_required: true,
      action_text: 'Create Promotion'
    },
    {
      id: 'alert_2',
      type: 'info',
      title: 'Premium Services Trending',
      message: 'Premium services bookings increased by 40% this week',
      recommendation: 'Stock up on premium products'
    }
  ]
}

function generateMockPriorityActions() {
  return [
    {
      priority: 'high',
      title: 'Follow up with VIP customers',
      description: '5 VIP customers haven\'t booked in 30+ days',
      deadline: 'Today'
    },
    {
      priority: 'medium',
      title: 'Review weekend staffing',
      description: 'High demand expected this weekend',
      deadline: 'Tomorrow'
    }
  ]
}
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
      // Use the new intelligent alerts system
      const response = await fetch(`/api/alerts/intelligent?barbershop_id=${barbershop_id}`)
      const data = await response.json()
      
      if (data.success) {
        setAlerts(data.alerts || [])
        setPriorityActions(data.priorityActions || [])
        console.log('📊 Intelligent alerts loaded:', {
          alertsCount: data.alerts?.length || 0,
          actionsCount: data.priorityActions?.length || 0,
          insights: data.insights?.length || 0
        })
      } else {
        console.warn('Intelligent alerts API failed:', data.error)
        // Fall back to business monitor API
        const fallbackResponse = await fetch(`/api/ai/business-monitor?barbershop_id=${barbershop_id}`)
        const fallbackData = await fallbackResponse.json()
        
        if (fallbackData.success) {
          setAlerts(fallbackData.data.alerts || [])
          setPriorityActions(fallbackData.data.priority_actions || [])
        } else {
          setAlerts([])
          setPriorityActions([])
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
      setAlerts([])
      setPriorityActions([])
    } finally {
      setLoading(false)
    }
  }

  const dismissAlert = async (alertId) => {
    try {
      // Use the new intelligent alerts management
      await fetch('/api/alerts/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dismiss_alert',
          alertId: alertId,
          barbershopId: barbershop_id
        })
      })
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      console.log('✅ Alert dismissed:', alertId)
    } catch (error) {
      console.error('Failed to dismiss alert:', error)
    }
  }

  const snoozeAlert = async (alertId) => {
    try {
      await fetch('/api/alerts/intelligent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'snooze_alert',
          alertId: alertId,
          barbershopId: barbershop_id
        })
      })
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      console.log('⏰ Alert snoozed:', alertId)
    } catch (error) {
      console.error('Failed to snooze alert:', error)
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'critical': return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'warning': return <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
      case 'info': return <InformationCircleIcon className="h-5 w-5 text-olive-500" />
      case 'success': return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      default: return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getAlertBorderColor = (type) => {
    switch (type) {
      case 'critical': return 'border-l-red-500 bg-red-50'
      case 'warning': return 'border-l-amber-500 bg-amber-50'
      case 'info': return 'border-l-blue-500 bg-olive-50'
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600 mx-auto"></div>
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
                        <button className="mt-3 text-sm text-olive-600 hover:text-indigo-800 font-medium flex items-center">
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
              <ClockIcon className="h-5 w-5 text-olive-500" />
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

// NO MOCK DATA - All data comes from real API calls
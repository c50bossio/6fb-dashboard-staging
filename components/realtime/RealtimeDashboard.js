'use client'

import { useEffect, useState } from 'react'
import { usePusher } from '@/hooks/usePusher'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { 
  BoltIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  BellAlertIcon 
} from '@heroicons/react/24/outline'

export default function RealtimeDashboard() {
  const { user } = useAuth()
  const { subscribe, unsubscribe, isConnected, CHANNELS, EVENTS } = usePusher()
  const [metrics, setMetrics] = useState({
    activeUsers: 0,
    todayBookings: 0,
    agentTasks: 0,
    revenue: 0,
  })
  const [alerts, setAlerts] = useState([])
  const [activities, setActivities] = useState([])

  useEffect(() => {
    if (!user || !isConnected) return

    const dashboardChannel = CHANNELS.dashboardLive(user.id)
    
    subscribe(dashboardChannel, {
      [EVENTS.METRICS_UPDATE]: (data) => {
        setMetrics(prev => ({ ...prev, ...data }))
      },
      [EVENTS.ALERT_TRIGGERED]: (alert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 5)) // Keep last 5 alerts
      },
      [EVENTS.BOOKING_CREATED]: (booking) => {
        setActivities(prev => [{
          id: Date.now(),
          type: 'booking',
          message: `New booking: ${booking.serviceName}`,
          timestamp: new Date(),
        }, ...prev].slice(0, 10))
        
        // Update booking count
        setMetrics(prev => ({ ...prev, todayBookings: prev.todayBookings + 1 }))
      },
      [EVENTS.AGENT_COMPLETED]: (task) => {
        setActivities(prev => [{
          id: Date.now(),
          type: 'agent',
          message: `Agent completed: ${task.taskName}`,
          timestamp: new Date(),
        }, ...prev].slice(0, 10))
        
        // Update agent task count
        setMetrics(prev => ({ ...prev, agentTasks: prev.agentTasks + 1 }))
      },
    })

    return () => {
      unsubscribe(dashboardChannel)
    }
  }, [user, isConnected, subscribe, unsubscribe, CHANNELS, EVENTS])

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2">
          <BoltIcon className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
          <span className="text-sm font-medium">
            Real-time: {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        {isConnected && (
          <span className="text-xs text-gray-500">Live updates enabled</span>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={UserGroupIcon}
          label="Active Users"
          value={metrics.activeUsers}
          color="blue"
        />
        <MetricCard
          icon={ChartBarIcon}
          label="Today's Bookings"
          value={metrics.todayBookings}
          color="green"
        />
        <MetricCard
          icon={BoltIcon}
          label="Agent Tasks"
          value={metrics.agentTasks}
          color="purple"
        />
        <MetricCard
          icon={ChartBarIcon}
          label="Revenue"
          value={`$${metrics.revenue.toFixed(2)}`}
          color="yellow"
        />
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <BellAlertIcon className="h-5 w-5 text-red-600" />
            <h3 className="font-semibold text-red-900">System Alerts</h3>
          </div>
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <div key={index} className="text-sm text-red-700">
                <span className="font-medium">{alert.title}:</span> {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b">
          <h3 className="font-semibold text-gray-900">Live Activity</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-64 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No recent activity
            </div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${
                    activity.type === 'booking' ? 'bg-green-400' : 'bg-purple-400'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  )
}
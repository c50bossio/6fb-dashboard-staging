'use client'

import { BellIcon, ChatBubbleLeftRightIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useState } from 'react'

import { useRealtimeNotifications } from '@/hooks/useRealtimeDatabase'
import { useAuth } from '@/components/SupabaseAuthProvider'


const RealtimeDashboard = dynamic(
  () => import('@/components/realtime/RealtimeDashboard'),
  { ssr: false }
)

const RealtimeChat = dynamic(
  () => import('@/components/realtime/RealtimeChat'),
  { ssr: false }
)

export default function RealtimePage() {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  
  const barbershopId = profile?.barbershop_id || user?.barbershop_id
  const { data: notifications = [], refresh } = useRealtimeNotifications(barbershopId)
  
  if (!barbershopId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No barbershop associated with your account.</p>
          <p className="text-sm text-gray-500 mt-1">Please contact support.</p>
        </div>
      </div>
    )
  }
  
  const clearNotifications = () => {
    refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Real-time Features</h1>
            <p className="text-gray-600">Live updates powered by Pusher</p>
          </div>
          
          {/* Notification Badge */}
          <div className="relative">
            <button className="p-2 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <BellIcon className="h-6 w-6 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'dashboard'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChartBarIcon className="h-5 w-5" />
              <span>Live Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'chat'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              <span>Real-time Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                activeTab === 'notifications'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BellIcon className="h-5 w-5" />
              <span>Notifications ({notifications.length})</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && (
          <RealtimeDashboard />
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">General Chat</h3>
              <div style={{ height: '600px' }}>
                <RealtimeChat roomId="general" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Support Chat</h3>
              <div style={{ height: '600px' }}>
                <RealtimeChat roomId="support" />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Real-time Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-sm text-olive-600 hover:text-olive-800"
                >
                  Clear all
                </button>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No real-time notifications yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Notifications will appear here as events happen
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        notification.type === 'booking' ? 'bg-green-400' :
                        notification.type === 'agent' ? 'bg-gold-400' :
                        'bg-olive-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test Triggers */}
        <div className="mt-8 bg-gray-100 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Test Real-time Events</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={async () => {
                await fetch('/api/pusher/trigger', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'metrics_update',
                    data: {
                      activeUsers: Math.floor(Math.random() * 100),
                      todayBookings: Math.floor(Math.random() * 50),
                      agentTasks: Math.floor(Math.random() * 20),
                      revenue: Math.random() * 1000,
                    }
                  })
                })
              }}
              className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
            >
              Update Metrics
            </button>
            
            <button
              onClick={async () => {
                await fetch('/api/pusher/trigger', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'system_alert',
                    data: {
                      title: 'Test Alert',
                      message: 'This is a test system alert',
                      severity: 'warning',
                    }
                  })
                })
              }}
              className="px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-yellow-700"
            >
              Trigger Alert
            </button>
            
            <button
              onClick={async () => {
                await fetch('/api/pusher/trigger', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'agent_progress',
                    data: {
                      agentName: 'Test Agent',
                      taskName: 'Test Task',
                      progress: Math.floor(Math.random() * 100),
                      status: 'running',
                    }
                  })
                })
              }}
              className="px-4 py-2 bg-gold-700 text-charcoal-800 rounded-lg hover:bg-gold-800 hover:text-white"
            >
              Agent Progress
            </button>
            
            <button
              onClick={async () => {
                await fetch('/api/pusher/trigger', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    type: 'booking_update',
                    data: {
                      shopId: 'test-shop',
                      bookingId: Date.now(),
                      serviceName: 'Test Service',
                      status: 'confirmed',
                    }
                  })
                })
              }}
              className="px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700"
            >
              Booking Update
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
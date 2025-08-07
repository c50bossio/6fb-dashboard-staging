'use client'

import { 
  BellIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import dynamic from 'next/dynamic'
import { useState } from 'react'

import { useNotifications } from '@/hooks/useNotifications'


// Dynamically import Novu components
const NotificationCenter = dynamic(
  () => import('@/components/notifications/NotificationCenter'),
  { ssr: false }
)

export default function NotificationsPage() {
  const { notifications, unseenCount, loading, markAsRead, markAllAsRead, deleteNotification } = useNotifications()
  const [activeTab, setActiveTab] = useState('inbox')
  const [testResult, setTestResult] = useState(null)
  const [sendingTest, setSendingTest] = useState(false)

  const sendTestNotification = async (type) => {
    setSendingTest(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          type: type === 'email' ? 'welcome' : 'agent_task_completed',
          data: type === 'email' ? {
            firstName: 'Test User',
            email: 'test@example.com',
          } : {
            agentName: 'Test Agent',
            taskName: 'Test Task',
            summary: 'This is a test notification',
            completedAt: new Date().toISOString(),
          }
        })
      })
      
      const result = await response.json()
      setTestResult({
        success: response.ok,
        message: response.ok ? 'Test notification sent successfully!' : result.error
      })
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to send test notification'
      })
    } finally {
      setSendingTest(false)
    }
  }

  const getNotificationIcon = (notification) => {
    if (notification.channel === 'email') {
      return <EnvelopeIcon className="h-5 w-5 text-blue-500" />
    } else if (notification.channel === 'sms') {
      return <PhoneIcon className="h-5 w-5 text-purple-500" />
    } else {
      return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Page Header with Novu Bell */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
            <p className="text-gray-600">Manage your notifications and preferences</p>
          </div>
          <div className="flex items-center space-x-4">
            {unseenCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-1">
                {unseenCount} new
              </span>
            )}
            <NotificationCenter />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inbox'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Inbox {unseenCount > 0 && `(${unseenCount})`}
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'test'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test Notifications
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'preferences'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Preferences
            </button>
          </nav>
        </div>

        {/* Inbox Tab */}
        {activeTab === 'inbox' && (
          <div className="bg-white rounded-lg shadow-md">
            {unseenCount > 0 && (
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-600">{unseenCount} unread notifications</span>
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Mark all as read
                </button>
              </div>
            )}
            
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <BellIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {getNotificationIcon(notification)}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-gray-900`}>
                          {notification.content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Mark as read"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Test Notifications Tab */}
        {activeTab === 'test' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Test Notification</h2>
            
            {testResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <p className="font-medium">{testResult.message}</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => sendTestNotification('email')}
                disabled={sendingTest}
                className="flex items-center justify-center space-x-3 p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <EnvelopeIcon className="h-8 w-8 text-blue-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Test Email</p>
                  <p className="text-sm text-gray-600">Welcome email notification</p>
                </div>
              </button>
              
              <button
                onClick={() => sendTestNotification('inapp')}
                disabled={sendingTest}
                className="flex items-center justify-center space-x-3 p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
              >
                <BellIcon className="h-8 w-8 text-purple-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Test In-App</p>
                  <p className="text-sm text-gray-600">Agent task notification</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">Email Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Booking confirmations</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Payment receipts</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Agent task completions</span>
                  </label>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-3">In-App Notifications</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">Real-time updates</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded text-blue-600" defaultChecked />
                    <span className="ml-2 text-sm text-gray-700">System alerts</span>
                  </label>
                </div>
              </div>
              
              <div className="pt-4">
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Save Preferences
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
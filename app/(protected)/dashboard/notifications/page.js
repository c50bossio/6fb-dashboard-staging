'use client'

import { 
  BellIcon,
  EnvelopeIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function NotificationsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [queueStatus, setQueueStatus] = useState(null)
  const [testResult, setTestResult] = useState(null)
  const [activeTab, setActiveTab] = useState('test')

  useEffect(() => {
    fetchHistory()
    fetchQueueStatus()
  }, [])

  const fetchHistory = async () => {
    try {
      const response = await fetch('/api/v1/notifications/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setHistory(data.notifications || [])
      }
    } catch (error) {
      console.error('Error fetching notification history:', error)
    }
  }

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/v1/notifications/queue/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setQueueStatus(data)
      }
    } catch (error) {
      console.error('Error fetching queue status:', error)
    }
  }

  const sendTestNotification = async (type) => {
    setLoading(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/v1/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ type })
      })
      
      const result = await response.json()
      setTestResult(result)
      
      // Refresh history after sending
      setTimeout(fetchHistory, 1000)
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to send test notification'
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-amber-800" />
      default:
        return <ExclamationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getTypeIcon = (type) => {
    return type === 'email' ? 
      <EnvelopeIcon className="h-5 w-5 text-olive-500" /> : 
      <PhoneIcon className="h-5 w-5 text-gold-500" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">Test and monitor your notification system</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('test')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'test'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Test Notifications
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'queue'
                  ? 'border-olive-500 text-olive-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Queue Status
            </button>
          </nav>
        </div>

        {/* Test Notifications Tab */}
        {activeTab === 'test' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Send Test Notification</h2>
            
            {testResult && (
              <div className={`mb-6 p-4 rounded-lg ${
                testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <p className="font-medium">{testResult.message}</p>
                {testResult.recipient && (
                  <p className="text-sm mt-1">Sent to: {testResult.recipient}</p>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => sendTestNotification('email')}
                disabled={loading}
                className="flex items-center justify-center space-x-3 p-4 border-2 border-olive-200 rounded-lg hover:bg-olive-50 transition-colors disabled:opacity-50"
              >
                <EnvelopeIcon className="h-8 w-8 text-olive-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Test Email</p>
                  <p className="text-sm text-gray-600">Send to {user?.email}</p>
                </div>
              </button>
              
              <button
                onClick={() => sendTestNotification('sms')}
                disabled={loading}
                className="flex items-center justify-center space-x-3 p-4 border-2 border-gold-200 rounded-lg hover:bg-gold-50 transition-colors disabled:opacity-50"
              >
                <PhoneIcon className="h-8 w-8 text-gold-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Test SMS</p>
                  <p className="text-sm text-gray-600">Send to phone on file</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification History</h2>
            
            {history.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No notifications sent yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recipient
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.map((notification) => (
                      <tr key={notification.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getTypeIcon(notification.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {notification.recipient}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {notification.subject || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getStatusIcon(notification.status)}
                            <span className="ml-2 text-sm text-gray-900">
                              {notification.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(notification.sent_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Queue Status Tab */}
        {activeTab === 'queue' && queueStatus && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Queue Status</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {queueStatus.processing ? 'Active' : 'Inactive'}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Total in Queue</p>
                <p className="text-2xl font-bold text-gray-900">{queueStatus.total || 0}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-500">Next Scheduled</p>
                <p className="text-sm font-bold text-gray-900">
                  {queueStatus.next_scheduled ? 
                    new Date(queueStatus.next_scheduled).toLocaleString() : 
                    'None'
                  }
                </p>
              </div>
            </div>
            
            {queueStatus.status_counts && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Queue Breakdown</h3>
                <div className="space-y-2">
                  {Object.entries(queueStatus.status_counts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center">
                        {getStatusIcon(status)}
                        <span className="ml-2 text-sm text-gray-700 capitalize">{status}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
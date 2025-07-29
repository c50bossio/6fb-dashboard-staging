/**
 * Trafft Integration Dashboard Component
 * Comprehensive management interface for Trafft booking system integration
 */

'use client'

import { useState, useEffect } from 'react'

export default function TrafftIntegrationDashboard({ barbershopId }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Integration data
  const [integrationStatus, setIntegrationStatus] = useState(null)
  const [syncHistory, setSyncHistory] = useState([])
  const [businessAnalytics, setBusinessAnalytics] = useState(null)
  const [systemHealth, setSystemHealth] = useState(null)
  
  // UI state
  const [syncInProgress, setSyncInProgress] = useState(false)
  const [selectedSyncType, setSelectedSyncType] = useState('incremental')

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [barbershopId])

  /**
   * Load all dashboard data
   */
  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load integration status
      const statusResponse = await fetch(`/api/integrations/trafft/auth?barbershopId=${barbershopId}`)
      const statusData = await statusResponse.json()
      setIntegrationStatus(statusData.integration)
      
      if (statusData.isConnected) {
        // Load sync history
        const syncResponse = await fetch(`/api/integrations/trafft/sync?barbershopId=${barbershopId}&limit=10`)
        const syncData = await syncResponse.json()
        setSyncHistory(syncData.syncHistory || [])
        
        // Load recent business analytics from last sync
        if (syncData.syncHistory && syncData.syncHistory.length > 0) {
          const lastSync = syncData.syncHistory[0]
          if (lastSync.summary) {
            setBusinessAnalytics(lastSync.summary)
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Trigger manual sync
   */
  const triggerSync = async (syncType = 'incremental') => {
    try {
      setSyncInProgress(true)
      setError('')
      
      const response = await fetch('/api/integrations/trafft/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          syncType
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        // Refresh data after successful sync
        await loadDashboardData()
      } else {
        setError(data.error || 'Sync failed')
      }
      
    } catch (error) {
      setError('Failed to trigger sync')
    } finally {
      setSyncInProgress(false)
    }
  }

  /**
   * Disconnect integration
   */
  const disconnectIntegration = async () => {
    if (!confirm('Are you sure you want to disconnect the Trafft integration? This will stop all data synchronization.')) {
      return
    }

    try {
      setLoading(true)
      
      const response = await fetch('/api/integrations/trafft/auth', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ barbershopId })
      })
      
      if (response.ok) {
        setIntegrationStatus(null)
        setSyncHistory([])
        setBusinessAnalytics(null)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to disconnect integration')
      }
      
    } catch (error) {
      setError('Failed to disconnect integration')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !integrationStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!integrationStatus) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Trafft Integration Not Connected
        </h3>
        <p className="text-gray-600 mb-6">
          Connect your Trafft booking system to enable AI-powered business insights and automated data synchronization.
        </p>
        <button 
          onClick={() => window.location.href = '/integrations/trafft/setup'}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Connect Trafft Integration
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trafft Integration</h1>
            <p className="text-gray-600 mt-2">
              Manage your Trafft booking system integration and view business insights
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              integrationStatus.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {integrationStatus.status === 'active' ? '✅ Connected' : '❌ Disconnected'}
            </div>
            <button
              onClick={() => triggerSync(selectedSyncType)}
              disabled={syncInProgress}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {syncInProgress ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Syncing...
                </>
              ) : (
                '🔄 Sync Now'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'analytics', label: 'Business Analytics', icon: '📈' },
            { key: 'sync', label: 'Sync History', icon: '🔄' },
            { key: 'settings', label: 'Settings', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                      <span className="text-green-600 font-medium">✓</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Integration Status
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {integrationStatus.status === 'active' ? 'Active' : 'Inactive'}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                      <span className="text-blue-600 font-medium">📅</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Last Sync
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {integrationStatus.lastSyncAt 
                          ? new Date(integrationStatus.lastSyncAt).toLocaleDateString()
                          : 'Never'
                        }
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                      <span className="text-purple-600 font-medium">🔗</span>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Connected Since
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {new Date(integrationStatus.authenticatedAt).toLocaleDateString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Sync Activity</h3>
              </div>
              <div className="p-6">
                {syncHistory.length > 0 ? (
                  <div className="space-y-4">
                    {syncHistory.slice(0, 3).map((sync) => (
                      <div key={sync.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">
                            {sync.syncType} sync
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(sync.startedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sync.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {sync.status}
                          </div>
                          {sync.summary && (
                            <p className="text-sm text-gray-500 mt-1">
                              {sync.summary.appointments || 0} appointments
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    No sync history available. Trigger a sync to see activity.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {businessAnalytics ? (
              <>
                {/* Revenue Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-gray-500">Total Revenue</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">
                      ${businessAnalytics.totalRevenue?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-gray-500">Appointments</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">
                      {businessAnalytics.appointments || 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-gray-500">Customers</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">
                      {businessAnalytics.customers || 0}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-sm font-medium text-gray-500">Avg Ticket</div>
                    <div className="mt-2 text-3xl font-bold text-gray-900">
                      ${businessAnalytics.avgTicket?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>

                {/* Business Insights */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">AI Business Insights</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">📈 Growth Opportunities</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li>• Increase marketing during low-booking periods</li>
                          <li>• Consider premium services for higher margins</li>
                          <li>• Optimize scheduling to reduce gaps</li>
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3">⚠️ Areas for Improvement</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li>• Client retention could be improved</li>
                          <li>• Consider implementing deposit requirements</li>
                          <li>• Peak hour pricing optimization</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No analytics data available</p>
                <button 
                  onClick={() => triggerSync('analytics')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Generate Analytics
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sync History Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-6">
            {/* Sync Controls */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Manual Sync</h3>
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedSyncType}
                    onChange={(e) => setSelectedSyncType(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="incremental">Incremental Sync</option>
                    <option value="full">Full Sync</option>
                    <option value="appointments">Appointments Only</option>
                    <option value="customers">Customers Only</option>
                    <option value="analytics">Analytics Only</option>
                  </select>
                  <button
                    onClick={() => triggerSync(selectedSyncType)}
                    disabled={syncInProgress}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {syncInProgress ? 'Syncing...' : 'Start Sync'}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Manually trigger a sync to pull the latest data from your Trafft booking system.
              </p>
            </div>

            {/* Sync History Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Sync History</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Records
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {syncHistory.map((sync) => (
                      <tr key={sync.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sync.syncType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sync.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : sync.status === 'failed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {sync.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sync.recordsSuccess || 0} / {sync.recordsProcessed || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sync.startedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sync.duration ? `${sync.duration}s` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Integration Settings */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Integration Settings</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Sync Configuration</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-700">Auto Sync</p>
                        <p className="text-sm text-gray-500">Automatically sync data on schedule</p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked={integrationStatus.syncSettings?.autoSync}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Sync Interval
                      </label>
                      <select 
                        defaultValue={integrationStatus.syncSettings?.syncInterval || '1h'}
                        className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="15m">Every 15 minutes</option>
                        <option value="30m">Every 30 minutes</option>
                        <option value="1h">Every hour</option>
                        <option value="6h">Every 6 hours</option>
                        <option value="24h">Daily</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Features</h4>
                  <div className="space-y-3">
                    {Object.entries(integrationStatus.features || {}).map(([feature, enabled]) => (
                      <div key={feature} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-700 capitalize">
                            {feature.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          defaultChecked={enabled}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-900 mb-3 text-red-700">Danger Zone</h4>
                  <div className="bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <span className="text-red-400">⚠️</span>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-red-800">
                          Disconnect Integration
                        </h4>
                        <div className="mt-2 text-sm text-red-700">
                          <p>
                            This will permanently disconnect your Trafft integration and stop all data synchronization.
                            This action cannot be undone.
                          </p>
                        </div>
                        <div className="mt-4">
                          <button
                            onClick={disconnectIntegration}
                            className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                          >
                            Disconnect Integration
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
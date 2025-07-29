/**
 * Integration Dashboard Component
 * Manage all connected booking platform integrations
 */

'use client'

import { useState, useEffect } from 'react'

export default function IntegrationDashboard({ barbershopId = 'default' }) {
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncingIntegrations, setSyncingIntegrations] = useState(new Set())

  useEffect(() => {
    loadIntegrations()
    
    // Set up periodic refresh for sync status
    const interval = setInterval(loadIntegrations, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [barbershopId])

  /**
   * Load all integrations for this barbershop
   */
  const loadIntegrations = async () => {
    try {
      const response = await fetch(`/api/integrations/list?barbershopId=${barbershopId}`)
      const data = await response.json()
      
      if (response.ok) {
        setIntegrations(data.integrations || [])
      } else {
        setError(data.error || 'Failed to load integrations')
      }
    } catch (error) {
      console.error('Error loading integrations:', error)
      setError('Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Trigger manual sync for an integration
   */
  const triggerSync = async (integrationId, platform) => {
    setSyncingIntegrations(prev => new Set([...prev, integrationId]))
    
    try {
      const response = await fetch(`/api/integrations/${platform}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          integrationId,
          syncType: 'incremental'
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        // Show success message
        showNotification(`${platform} sync completed: ${data.summary?.appointments || 0} appointments updated`, 'success')
        
        // Refresh integrations list
        await loadIntegrations()
      } else {
        showNotification(`${platform} sync failed: ${data.error}`, 'error')
      }
    } catch (error) {
      console.error('Sync error:', error)
      showNotification(`${platform} sync failed: ${error.message}`, 'error')
    } finally {
      setSyncingIntegrations(prev => {
        const newSet = new Set(prev)
        newSet.delete(integrationId)
        return newSet
      })
    }
  }

  /**
   * Disconnect an integration
   */
  const disconnectIntegration = async (integrationId, platform) => {
    if (!confirm(`Are you sure you want to disconnect this ${platform} integration? This will stop data synchronization.`)) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/${platform}/auth`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barbershopId,
          integrationId
        })
      })

      if (response.ok) {
        showNotification(`${platform} integration disconnected successfully`, 'success')
        await loadIntegrations()
      } else {
        const data = await response.json()
        showNotification(`Failed to disconnect ${platform}: ${data.error}`, 'error')
      }
    } catch (error) {
      console.error('Disconnect error:', error)
      showNotification(`Failed to disconnect ${platform}: ${error.message}`, 'error')
    }
  }

  /**
   * Show notification (placeholder - would integrate with toast system)
   */
  const showNotification = (message, type) => {
    // In a real app, this would show a toast notification
    console.log(`${type.toUpperCase()}: ${message}`)
    
    // Simple alert for now
    if (type === 'error') {
      alert(`Error: ${message}`)
    }
  }

  /**
   * Get status color and text
   */
  const getStatusDisplay = (integration) => {
    if (!integration.isActive) {
      return {
        color: 'text-red-600 bg-red-100',
        text: 'Disconnected',
        icon: '❌'
      }
    }
    
    if (integration.lastSyncError) {
      return {
        color: 'text-yellow-600 bg-yellow-100',
        text: 'Sync Error',
        icon: '⚠️'
      }
    }
    
    const lastSync = new Date(integration.lastSyncAt)
    const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60)
    
    if (hoursSinceSync > 24) {
      return {
        color: 'text-yellow-600 bg-yellow-100',
        text: 'Stale Data',
        icon: '⏰'
      }
    }
    
    return {
      color: 'text-green-600 bg-green-100',
      text: 'Active',
      icon: '✅'
    }
  }

  /**
   * Get platform icon and name
   */
  const getPlatformDisplay = (platform) => {
    const platforms = {
      trafft: { name: 'Trafft', icon: '📋' },
      google: { name: 'Google Calendar', icon: '📅' },
      acuity: { name: 'Acuity Scheduling', icon: '🗓️' },
      square: { name: 'Square Appointments', icon: '⬜' },
      booksy: { name: 'Booksy', icon: '📱' },
      generic: { name: 'Generic Import', icon: '📁' }
    }
    
    return platforms[platform] || { name: platform, icon: '🔗' }
  }

  /**
   * Format date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = (now - date) / (1000 * 60 * 60)
    
    if (diffHours < 1) {
      return 'Just now'
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} hours ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading integrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Connected Integrations</h2>
            <p className="text-sm text-gray-600">
              Manage your booking platform connections and data sync
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard/integrations/add'}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Add Integration
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Integrations List */}
      <div className="p-6">
        {integrations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Integrations Connected</h3>
            <p className="text-gray-600 mb-6">
              Connect your booking platform to start getting AI-powered business insights
            </p>
            <button
              onClick={() => window.location.href = '/dashboard/integrations/add'}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Connect Your First Platform
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {integrations.map((integration) => {
              const platform = getPlatformDisplay(integration.platform)
              const status = getStatusDisplay(integration)
              const isSyncing = syncingIntegrations.has(integration.id)
              
              return (
                <div
                  key={integration.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    {/* Platform Info */}
                    <div className="flex items-center space-x-4">
                      <div className="text-3xl">{platform.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {platform.name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.icon} {status.text}
                          </span>
                          <span className="text-sm text-gray-500">
                            Connected {formatDate(integration.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => triggerSync(integration.id, integration.platform)}
                        disabled={isSyncing || !integration.isActive}
                        className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        {isSyncing ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Syncing...
                          </>
                        ) : (
                          'Sync Now'
                        )}
                      </button>
                      <button
                        onClick={() => disconnectIntegration(integration.id, integration.platform)}
                        className="px-3 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 text-sm font-medium"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>

                  {/* Integration Stats */}
                  <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {integration.stats?.totalAppointments || 0}
                      </div>
                      <div className="text-sm text-gray-600">Appointments</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {integration.stats?.totalCustomers || 0}
                      </div>
                      <div className="text-sm text-gray-600">Customers</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        ${(integration.stats?.totalRevenue || 0).toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-600">Revenue</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">
                        {formatDate(integration.lastSyncAt)}
                      </div>
                      <div className="text-sm text-gray-600">Last Sync</div>
                    </div>
                  </div>

                  {/* Sync Error */}
                  {integration.lastSyncError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <div className="text-sm font-medium text-red-800">Last Sync Error:</div>
                      <div className="text-sm text-red-600 mt-1">{integration.lastSyncError}</div>
                    </div>
                  )}

                  {/* Sync Schedule */}
                  <div className="mt-4 text-sm text-gray-600">
                    <strong>Sync Schedule:</strong> {integration.syncSchedule || 'Every 4 hours'}
                    {integration.nextSyncAt && (
                      <span className="ml-2">
                        • Next sync: {formatDate(integration.nextSyncAt)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {integrations.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{integrations.length}</div>
              <div className="text-sm text-gray-600">Connected Platforms</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {integrations.filter(i => i.isActive).length}
              </div>
              <div className="text-sm text-gray-600">Active Integrations</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {integrations.reduce((sum, i) => sum + (i.stats?.totalAppointments || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Total Appointments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                ${integrations.reduce((sum, i) => sum + (i.stats?.totalRevenue || 0), 0).toFixed(0)}
              </div>
              <div className="text-sm text-gray-600">Total Revenue Tracked</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
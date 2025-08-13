'use client'

import { 
  CalendarDaysIcon,
  LinkIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { CalendarDaysIcon as CalendarSolid } from '@heroicons/react/24/solid'
import { useState, useEffect } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function CalendarSettings() {
  const { user } = useAuth()
  const [connectedAccounts, setConnectedAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState('')
  const [syncSettings, setSyncSettings] = useState({
    autoCreateEvents: true,
    syncDirection: 'both',
    eventTitleTemplate: '{customer_name} - {service_name}',
    eventDescriptionTemplate: 'Service: {service_name}\nCustomer: {customer_name}\nPhone: {customer_phone}\nNotes: {notes}',
    bufferTimeMinutes: 5,
    conflictResolution: 'manual'
  })

  useEffect(() => {
    loadConnectedAccounts()
    loadSyncSettings()
  }, [])

  const loadConnectedAccounts = async () => {
    try {
      const response = await fetch(`/api/calendar/accounts?barber_id=${user?.id}`)
      const data = await response.json()
      
      if (data.success) {
        setConnectedAccounts(data.accounts)
      }
    } catch (error) {
      console.error('Error loading connected accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSyncSettings = async () => {
    try {
      const response = await fetch(`/api/calendar/settings?barber_id=${user?.id}`)
      const data = await response.json()
      
      if (data.success) {
        setSyncSettings({ ...syncSettings, ...data.settings })
      }
    } catch (error) {
      console.error('Error loading sync settings:', error)
    }
  }

  const connectGoogleCalendar = async () => {
    setConnecting('google')
    try {
      const response = await fetch(`/api/calendar/google/auth?barber_id=${user?.id}`)
      const data = await response.json()
      
      if (data.success && data.auth_url) {
        // Open OAuth flow in popup
        const popup = window.open(
          data.auth_url,
          'google-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )
        
        // Listen for popup messages
        const handleMessage = (event) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            popup.close()
            loadConnectedAccounts() // Refresh the list
            setConnecting('')
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            popup.close()
            alert(`Google Calendar connection failed: ${event.data.error}`)
            setConnecting('')
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Cleanup listener when popup closes
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            setConnecting('')
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
      setConnecting('')
    }
  }

  const connectOutlookCalendar = async () => {
    setConnecting('outlook')
    try {
      const response = await fetch(`/api/calendar/outlook/auth?barber_id=${user?.id}`)
      const data = await response.json()
      
      if (data.success && data.auth_url) {
        // Open OAuth flow in popup
        const popup = window.open(
          data.auth_url,
          'outlook-auth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )
        
        // Listen for popup messages
        const handleMessage = (event) => {
          if (event.origin !== window.location.origin) return
          
          if (event.data.type === 'OUTLOOK_AUTH_SUCCESS') {
            popup.close()
            loadConnectedAccounts() // Refresh the list
            setConnecting('')
          } else if (event.data.type === 'OUTLOOK_AUTH_ERROR') {
            popup.close()
            alert(`Outlook Calendar connection failed: ${event.data.error}`)
            setConnecting('')
          }
        }
        
        window.addEventListener('message', handleMessage)
        
        // Cleanup listener when popup closes
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            setConnecting('')
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error connecting Outlook Calendar:', error)
      setConnecting('')
    }
  }

  const disconnectAccount = async (accountId) => {
    if (!confirm('Are you sure you want to disconnect this calendar? This will stop syncing appointments.')) {
      return
    }

    try {
      const response = await fetch(`/api/calendar/accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadConnectedAccounts()
      } else {
        alert('Failed to disconnect calendar account')
      }
    } catch (error) {
      console.error('Error disconnecting account:', error)
    }
  }

  const updateSyncSettings = async (newSettings) => {
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          barber_id: user?.id,
          ...newSettings
        })
      })
      
      if (response.ok) {
        setSyncSettings(newSettings)
      }
    } catch (error) {
      console.error('Error updating sync settings:', error)
    }
  }

  const syncAppointment = async (accountId) => {
    // Demo sync - in real implementation this would sync a specific appointment
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          booking_id: 'demo_booking_123',
          account_id: accountId
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert('Test appointment synced successfully!')
      } else {
        alert(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error('Error syncing appointment:', error)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-olive-500 to-gold-600 rounded-xl p-3">
              <CalendarSolid className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Calendar Integration</h1>
              <p className="text-gray-600">Sync your appointments with Google Calendar and Outlook</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Connected Accounts */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <LinkIcon className="h-6 w-6 mr-2 text-olive-600" />
              Connected Calendars
            </h2>
          </div>

          <div className="space-y-4">
            {connectedAccounts.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No calendars connected yet</p>
                <p className="text-sm text-gray-400">Connect your calendar to automatically sync appointments</p>
              </div>
            ) : (
              connectedAccounts.map((account) => (
                <div key={account.account_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        account.provider === 'google' ? 'bg-red-100' : 'bg-olive-100'
                      }`}>
                        {account.provider === 'google' ? (
                          <span className="text-red-600 font-bold text-sm">G</span>
                        ) : (
                          <span className="text-olive-600 font-bold text-sm">O</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center">
                          {account.display_name}
                          {account.is_primary && (
                            <span className="ml-2 bg-moss-100 text-moss-900 text-xs font-medium px-2 py-1 rounded-full">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{account.email}</div>
                        <div className="text-xs text-gray-400 flex items-center space-x-4 mt-1">
                          <span>{account.sync_stats.total_syncs} syncs</span>
                          <span className={`flex items-center ${
                            account.sync_stats.success_rate >= 95 ? 'text-green-600' : 
                            account.sync_stats.success_rate >= 80 ? 'text-amber-800' : 'text-red-600'
                          }`}>
                            {account.sync_stats.success_rate >= 95 ? (
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                            ) : account.sync_stats.success_rate >= 80 ? (
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            ) : (
                              <XCircleIcon className="h-3 w-3 mr-1" />
                            )}
                            {account.sync_stats.success_rate.toFixed(0)}% success
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => syncAppointment(account.account_id)}
                        className="text-sm bg-olive-50 text-olive-700 px-3 py-1 rounded-md hover:bg-olive-100"
                      >
                        Test Sync
                      </button>
                      <button
                        onClick={() => disconnectAccount(account.account_id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Connect Buttons */}
            <div className="border-t border-gray-200 pt-4 space-y-3">
              <button
                onClick={connectGoogleCalendar}
                disabled={connecting === 'google'}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-5 h-5 bg-red-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">G</span>
                </div>
                <span className="font-medium text-gray-700">
                  {connecting === 'google' ? 'Connecting...' : 'Connect Google Calendar'}
                </span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
              </button>

              <button
                onClick={connectOutlookCalendar}
                disabled={connecting === 'outlook'}
                className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 rounded-lg px-4 py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-5 h-5 bg-olive-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">O</span>
                </div>
                <span className="font-medium text-gray-700">
                  {connecting === 'outlook' ? 'Connecting...' : 'Connect Outlook Calendar'}
                </span>
                <ArrowTopRightOnSquareIcon className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Sync Settings */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Cog6ToothIcon className="h-6 w-6 mr-2 text-gray-600" />
              Sync Settings
            </h2>
          </div>

          <div className="space-y-6">
            {/* Auto-create Events */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={syncSettings.autoCreateEvents}
                  onChange={(e) => updateSyncSettings({ ...syncSettings, autoCreateEvents: e.target.checked })}
                  className="rounded border-gray-300 text-olive-600 shadow-sm focus:border-olive-300 focus:ring focus:ring-olive-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Automatically create calendar events for new appointments
                </span>
              </label>
            </div>

            {/* Sync Direction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync Direction
              </label>
              <select
                value={syncSettings.syncDirection}
                onChange={(e) => updateSyncSettings({ ...syncSettings, syncDirection: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-olive-500 focus:outline-none focus:ring-olive-500"
              >
                <option value="both">Both directions (recommended)</option>
                <option value="push_only">6FB to Calendar only</option>
                <option value="pull_only">Calendar to 6FB only</option>
              </select>
            </div>

            {/* Event Title Template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Title Template
              </label>
              <input
                type="text"
                value={syncSettings.eventTitleTemplate}
                onChange={(e) => updateSyncSettings({ ...syncSettings, eventTitleTemplate: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-olive-500 focus:outline-none focus:ring-olive-500"
                placeholder="{customer_name} - {service_name}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Available: {'{customer_name}'}, {'{service_name}'}, {'{barber_name}'}
              </p>
            </div>

            {/* Buffer Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buffer Time (minutes)
              </label>
              <select
                value={syncSettings.bufferTimeMinutes}
                onChange={(e) => updateSyncSettings({ ...syncSettings, bufferTimeMinutes: parseInt(e.target.value) })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-olive-500 focus:outline-none focus:ring-olive-500"
              >
                <option value="0">No buffer</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>

            {/* Conflict Resolution */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conflict Resolution
              </label>
              <select
                value={syncSettings.conflictResolution}
                onChange={(e) => updateSyncSettings({ ...syncSettings, conflictResolution: e.target.value })}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-olive-500 focus:outline-none focus:ring-olive-500"
              >
                <option value="manual">Ask me what to do</option>
                <option value="6fb_wins">6FB appointment takes priority</option>
                <option value="calendar_wins">Calendar event takes priority</option>
                <option value="latest_wins">Most recent change wins</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {connectedAccounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Sync Activity</h2>
          <div className="space-y-3">
            {connectedAccounts.map((account) => (
              <div key={account.account_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    account.sync_stats.success_rate >= 95 ? 'bg-green-500' : 
                    account.sync_stats.success_rate >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="text-sm text-gray-700">{account.display_name}</span>
                </div>
                <div className="text-sm text-gray-500">
                  Last sync: {account.last_sync || 'Never'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
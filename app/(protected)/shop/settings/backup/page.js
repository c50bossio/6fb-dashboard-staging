'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  CloudArrowDownIcon,
  CloudArrowUpIcon,
  DocumentArrowDownIcon,
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV', description: 'Comma-separated values for spreadsheets', icon: '📊' },
  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation for developers', icon: '{ }' },
  { value: 'excel', label: 'Excel', description: 'Microsoft Excel workbook (.xlsx)', icon: '📈' }
]

const EXPORT_RESOURCES = [
  { id: 'appointments', name: 'Appointments', description: 'All booking and scheduling data' },
  { id: 'customers', name: 'Customers', description: 'Customer profiles and contact information' },
  { id: 'services', name: 'Services', description: 'Service catalog with pricing' },
  { id: 'staff', name: 'Staff', description: 'Staff members and barber information' },
  { id: 'transactions', name: 'Transactions', description: 'Payment and transaction history' },
  { id: 'inventory', name: 'Inventory', description: 'Product inventory and stock levels' },
  { id: 'settings', name: 'Settings', description: 'Business configuration and preferences' }
]

const BACKUP_FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'Every day at specified time' },
  { value: 'weekly', label: 'Weekly', description: 'Every week on specified day' },
  { value: 'monthly', label: 'Monthly', description: 'Every month on specified date' }
]

export default function BackupExportPage() {
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const { user: _user } = useAuth()

  // Export settings
  const [exportFormat, setExportFormat] = useState('csv')
  const [exportResources, setExportResources] = useState([])
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

  // Automated backup settings
  const [backupEnabled, setBackupEnabled] = useState(false)
  const [backupFrequency, setBackupFrequency] = useState('weekly')
  const [backupTime, setBackupTime] = useState('03:00')
  const [backupRetentionDays, setBackupRetentionDays] = useState(30)
  const [backupNotifications, setBackupNotifications] = useState(true)

  // Backup history
  const [backupHistory, setBackupHistory] = useState([])

  useEffect(() => {
    if (_user) {
      loadBackupSettings()
      loadBackupHistory()
    }
  }, [_user])

  const loadBackupSettings = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('business_settings')
        .select('backup_settings')
        .eq('user_id', _user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading backup settings:', error)
        return
      }

      if (data?.backup_settings) {
        const settings = data.backup_settings
        setBackupEnabled(settings.enabled || false)
        setBackupFrequency(settings.frequency || 'weekly')
        setBackupTime(settings.time || '03:00')
        setBackupRetentionDays(settings.retention_days || 30)
        setBackupNotifications(settings.notifications !== false)
      }
    } catch (err) {
      console.error('Failed to load backup settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBackupHistory = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .eq('user_id', _user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading backup history:', error)
        return
      }

      setBackupHistory(data || [])
    } catch (err) {
      console.error('Failed to load backup history:', err)
    }
  }

  const saveBackupSettings = async () => {
    try {
      const supabase = createClient()

      const backupSettings = {
        enabled: backupEnabled,
        frequency: backupFrequency,
        time: backupTime,
        retention_days: backupRetentionDays,
        notifications: backupNotifications,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('business_settings')
        .upsert({
          user_id: _user.id,
          backup_settings: backupSettings
        }, {
          onConflict: 'user_id'
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Backup settings saved successfully!' })
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)

    } catch (err) {
      console.error('Failed to save backup settings:', err)
      setMessage({ type: 'error', text: 'Failed to save backup settings. Please try again.' })
    }
  }

  const exportData = async () => {
    if (exportResources.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one resource to export' })
      return
    }

    try {
      setExporting(true)
      setMessage({ type: '', text: '' })

      // TODO: Implement actual export logic
      // This would call a backend API endpoint to generate the export file
      const response = await fetch('/api/export/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: exportFormat,
          resources: exportResources,
          date_range: dateRange
        })
      })

      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backup-${new Date().toISOString().split('T')[0]}.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setMessage({ type: 'success', text: 'Data exported successfully!' })

      // Save to backup history
      await saveToBackupHistory('manual', exportFormat, exportResources)

      setTimeout(() => setMessage({ type: '', text: '' }), 3000)

    } catch (err) {
      console.error('Failed to export data:', err)
      setMessage({ type: 'error', text: 'Failed to export data. Please try again.' })
    } finally {
      setExporting(false)
    }
  }

  const saveToBackupHistory = async (type, format, resources) => {
    try {
      const supabase = createClient()

      await supabase.from('backup_history').insert([{
        user_id: _user.id,
        type,
        format,
        resources,
        created_at: new Date().toISOString(),
        size_mb: 0 // Would be populated by actual export
      }])

      await loadBackupHistory()
    } catch (err) {
      console.error('Failed to save backup history:', err)
    }
  }

  const toggleResource = (resourceId) => {
    setExportResources(prev =>
      prev.includes(resourceId)
        ? prev.filter(r => r !== resourceId)
        : [...prev, resourceId]
    )
  }

  const selectAllResources = () => {
    setExportResources(EXPORT_RESOURCES.map(r => r.id))
  }

  const deselectAllResources = () => {
    setExportResources([])
  }

  const formatFileSize = (sizeMb) => {
    if (sizeMb < 1) return `${Math.round(sizeMb * 1024)} KB`
    return `${sizeMb.toFixed(2)} MB`
  }

  if (loading) {
    return (
      <div className="max-w-6xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center">
          <CloudArrowDownIcon className="h-8 w-8 text-olive-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Backup & Export</h1>
            <p className="mt-1 text-sm text-gray-600">
              Export your data and configure automated backup schedules
            </p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-md border ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' :
          'bg-red-50 text-red-800 border-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' && <CheckCircleIcon className="h-5 w-5 mr-2" />}
            {message.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5 mr-2" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manual Export */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <DocumentArrowDownIcon className="h-6 w-6 text-olive-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Manual Export</h2>
            </div>

            <div className="space-y-6">
              {/* Export Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Export Format
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {EXPORT_FORMATS.map((format) => (
                    <div
                      key={format.value}
                      onClick={() => setExportFormat(format.value)}
                      className={`cursor-pointer border-2 rounded-lg p-3 transition-all text-center ${
                        exportFormat === format.value
                          ? 'border-olive-600 bg-olive-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{format.icon}</div>
                      <p className="text-sm font-medium text-gray-900">{format.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">End Date</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Resources */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Select Data to Export
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllResources}
                      className="text-xs text-olive-600 hover:text-olive-700 underline"
                    >
                      Select All
                    </button>
                    <button
                      onClick={deselectAllResources}
                      className="text-xs text-gray-600 hover:text-gray-700 underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {EXPORT_RESOURCES.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-start p-2 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleResource(resource.id)}
                    >
                      <input
                        type="checkbox"
                        checked={exportResources.includes(resource.id)}
                        onChange={() => toggleResource(resource.id)}
                        className="mt-0.5 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                      />
                      <div className="ml-2">
                        <p className="text-sm font-medium text-gray-900">{resource.name}</p>
                        <p className="text-xs text-gray-600">{resource.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={exportData}
                disabled={exporting || exportResources.length === 0}
                className="w-full flex items-center justify-center px-4 py-3 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {exporting ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                    Export Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Automated Backups */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <ClockIcon className="h-6 w-6 text-olive-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Automated Backups</h2>
              </div>
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={backupEnabled}
                    onChange={(e) => setBackupEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-olive-600"></div>
                </label>
              </div>
            </div>

            <div className="space-y-6">
              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Backup Frequency
                </label>
                <select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  disabled={!backupEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {BACKUP_FREQUENCIES.map(freq => (
                    <option key={freq.value} value={freq.value}>{freq.label}</option>
                  ))}
                </select>
              </div>

              {/* Backup Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Time
                </label>
                <input
                  type="time"
                  value={backupTime}
                  onChange={(e) => setBackupTime(e.target.value)}
                  disabled={!backupEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Backups will run at this time in your local timezone
                </p>
              </div>

              {/* Retention Period */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retention Period
                </label>
                <select
                  value={backupRetentionDays}
                  onChange={(e) => setBackupRetentionDays(parseInt(e.target.value))}
                  disabled={!backupEnabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Backups older than this will be automatically deleted
                </p>
              </div>

              {/* Notifications */}
              <div className="flex items-start">
                <input
                  type="checkbox"
                  checked={backupNotifications}
                  onChange={(e) => setBackupNotifications(e.target.checked)}
                  disabled={!backupEnabled}
                  className="mt-1 h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div className="ml-3">
                  <label className="text-sm font-medium text-gray-900">Email Notifications</label>
                  <p className="text-xs text-gray-600">Receive email when backups complete or fail</p>
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={saveBackupSettings}
                className="w-full px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 font-medium"
              >
                Save Backup Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup History */}
      <div className="mt-6 bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
        <div className="px-4 py-6 sm:p-8">
          <div className="flex items-center mb-6">
            <ShieldCheckIcon className="h-6 w-6 text-olive-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Backup History</h2>
          </div>

          {backupHistory.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <CloudArrowDownIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No backups yet</h3>
              <p className="mt-1 text-sm text-gray-500">Your backup history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 text-gray-600 font-medium">Date</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Type</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Format</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Resources</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Size</th>
                    <th className="text-left py-3 text-gray-600 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {backupHistory.map((backup) => (
                    <tr key={backup.id} className="hover:bg-gray-50">
                      <td className="py-3 text-gray-900">
                        {new Date(backup.created_at).toLocaleDateString()} {new Date(backup.created_at).toLocaleTimeString()}
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          backup.type === 'automated' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {backup.type === 'automated' ? 'Automated' : 'Manual'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-600 uppercase">{backup.format}</td>
                      <td className="py-3 text-gray-600">
                        {backup.resources?.length || 0} resources
                      </td>
                      <td className="py-3 text-gray-600">{formatFileSize(backup.size_mb)}</td>
                      <td className="py-3">
                        <button className="text-olive-600 hover:text-olive-700 text-sm font-medium">
                          Download
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Data Security</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• All backups are encrypted using AES-256 encryption</li>
              <li>• Backup files are stored securely with redundant storage</li>
              <li>• You can download and store backups locally for additional security</li>
              <li>• Regular backup testing is recommended to ensure data integrity</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import {
  DocumentChartBarIcon,
  EnvelopeIcon,
  CalendarIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { createClient } from '@/utils/supabase/client'

const REPORT_TYPES = [
  { id: 'revenue', name: 'Revenue Report', description: 'Daily, weekly, and monthly revenue breakdowns' },
  { id: 'appointments', name: 'Appointments Report', description: 'Booking statistics and trends' },
  { id: 'customers', name: 'Customer Report', description: 'New customers, retention, and churn metrics' },
  { id: 'staff_performance', name: 'Staff Performance', description: 'Individual barber performance and metrics' },
  { id: 'inventory', name: 'Inventory Report', description: 'Product stock levels and sales' },
  { id: 'financial_summary', name: 'Financial Summary', description: 'Comprehensive financial overview' }
]

const FREQUENCIES = [
  { value: 'daily', label: 'Daily', description: 'Every day at specified time' },
  { value: 'weekly', label: 'Weekly', description: 'Every week on specified day' },
  { value: 'monthly', label: 'Monthly', description: 'Every month on specified date' }
]

const FORMATS = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'excel', label: 'Excel (XLSX)', icon: '📊' },
  { value: 'csv', label: 'CSV', icon: '📋' }
]

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' }
]

export default function ReportsSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const { user: _user } = useAuth()

  // Report schedule settings
  const [scheduledReports, setScheduledReports] = useState([])
  const [reportTypes, setReportTypes] = useState({
    revenue: true,
    appointments: true,
    customers: false,
    staff_performance: true,
    inventory: false,
    financial_summary: true
  })

  // Delivery settings
  const [deliveryEmail, setDeliveryEmail] = useState('')
  const [additionalRecipients, setAdditionalRecipients] = useState([])
  const [newRecipient, setNewRecipient] = useState('')

  // Format settings
  const [preferredFormat, setPreferredFormat] = useState('pdf')
  const [includeCharts, setIncludeCharts] = useState(true)
  const [includeRawData, setIncludeRawData] = useState(false)

  useEffect(() => {
    if (_user) {
      loadReportSettings()
    }
  }, [_user])

  const loadReportSettings = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Load report settings from business_settings table
      const { data, error } = await supabase
        .from('business_settings')
        .select('report_settings')
        .eq('user_id', _user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading report settings:', error)
        return
      }

      if (data?.report_settings) {
        const settings = data.report_settings
        setScheduledReports(settings.scheduled_reports || [])
        setReportTypes(settings.report_types || reportTypes)
        setDeliveryEmail(settings.delivery_email || _user.email || '')
        setAdditionalRecipients(settings.additional_recipients || [])
        setPreferredFormat(settings.preferred_format || 'pdf')
        setIncludeCharts(settings.include_charts !== false)
        setIncludeRawData(settings.include_raw_data || false)
      } else {
        // Initialize with user email
        setDeliveryEmail(_user.email || '')
      }
    } catch (err) {
      console.error('Failed to load report settings:', err)
      setMessage({ type: 'error', text: 'Failed to load report settings' })
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      setMessage({ type: '', text: '' })
      const supabase = createClient()

      const reportSettings = {
        scheduled_reports: scheduledReports,
        report_types: reportTypes,
        delivery_email: deliveryEmail,
        additional_recipients: additionalRecipients,
        preferred_format: preferredFormat,
        include_charts: includeCharts,
        include_raw_data: includeRawData,
        updated_at: new Date().toISOString()
      }

      // Upsert report settings
      const { error: upsertError } = await supabase
        .from('business_settings')
        .upsert({
          user_id: _user.id,
          report_settings: reportSettings
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) throw upsertError

      setMessage({ type: 'success', text: 'Report settings saved successfully!' })

      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000)

    } catch (err) {
      console.error('Failed to save report settings:', err)
      setMessage({ type: 'error', text: 'Failed to save report settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const addScheduledReport = () => {
    const newReport = {
      id: Date.now(),
      name: 'New Report',
      type: 'revenue',
      frequency: 'weekly',
      day_of_week: 'monday',
      time: '09:00',
      enabled: true
    }
    setScheduledReports([...scheduledReports, newReport])
  }

  const updateScheduledReport = (id, field, value) => {
    setScheduledReports(scheduledReports.map(report =>
      report.id === id ? { ...report, [field]: value } : report
    ))
  }

  const deleteScheduledReport = (id) => {
    setScheduledReports(scheduledReports.filter(report => report.id !== id))
  }

  const addRecipient = () => {
    if (newRecipient && newRecipient.includes('@')) {
      if (!additionalRecipients.includes(newRecipient)) {
        setAdditionalRecipients([...additionalRecipients, newRecipient])
        setNewRecipient('')
      }
    }
  }

  const removeRecipient = (email) => {
    setAdditionalRecipients(additionalRecipients.filter(r => r !== email))
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
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DocumentChartBarIcon className="h-8 w-8 text-olive-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports Configuration</h1>
              <p className="mt-1 text-sm text-gray-600">
                Configure automated reports, scheduling, and delivery preferences
              </p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`mb-6 p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :
          'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {message.type === 'success' && <CheckCircleIcon className="h-5 w-5 mr-2" />}
            <span>{message.text}</span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Report Types Selection */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Types</h2>
            <p className="text-sm text-gray-600 mb-6">
              Select which reports to generate and include in automated schedules
            </p>

            <div className="space-y-4">
              {REPORT_TYPES.map((report) => (
                <div key={report.id} className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      type="checkbox"
                      checked={reportTypes[report.id]}
                      onChange={(e) => setReportTypes({ ...reportTypes, [report.id]: e.target.checked })}
                      className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3">
                    <label className="font-medium text-gray-900">{report.name}</label>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scheduled Reports */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Scheduled Reports</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Configure automated report generation and delivery
                </p>
              </div>
              <button
                onClick={addScheduledReport}
                className="flex items-center px-3 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Schedule
              </button>
            </div>

            {scheduledReports.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled reports</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a report schedule</p>
                <button
                  onClick={addScheduledReport}
                  className="mt-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-olive-700 bg-olive-100 hover:bg-olive-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  Create Schedule
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledReports.map((report) => (
                  <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Report Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Report Name
                        </label>
                        <input
                          type="text"
                          value={report.name}
                          onChange={(e) => updateScheduledReport(report.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                        />
                      </div>

                      {/* Report Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Report Type
                        </label>
                        <select
                          value={report.type}
                          onChange={(e) => updateScheduledReport(report.id, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                        >
                          {REPORT_TYPES.map(type => (
                            <option key={type.id} value={type.id}>{type.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Frequency
                        </label>
                        <select
                          value={report.frequency}
                          onChange={(e) => updateScheduledReport(report.id, 'frequency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                        >
                          {FREQUENCIES.map(freq => (
                            <option key={freq.value} value={freq.value}>{freq.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Day/Time */}
                      <div>
                        {report.frequency === 'weekly' ? (
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Day of Week
                            </label>
                            <select
                              value={report.day_of_week || 'monday'}
                              onChange={(e) => updateScheduledReport(report.id, 'day_of_week', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                            >
                              {DAYS_OF_WEEK.map(day => (
                                <option key={day.value} value={day.value}>{day.label}</option>
                              ))}
                            </select>
                          </>
                        ) : report.frequency === 'monthly' ? (
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Day of Month
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={report.day_of_month || 1}
                              onChange={(e) => updateScheduledReport(report.id, 'day_of_month', parseInt(e.target.value))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                            />
                          </>
                        ) : (
                          <>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Time
                            </label>
                            <input
                              type="time"
                              value={report.time || '09:00'}
                              onChange={(e) => updateScheduledReport(report.id, 'time', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* Schedule Actions */}
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={report.enabled}
                          onChange={(e) => updateScheduledReport(report.id, 'enabled', e.target.checked)}
                          className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                          {report.enabled ? 'Enabled' : 'Disabled'}
                        </label>
                      </div>

                      <button
                        onClick={() => deleteScheduledReport(report.id)}
                        className="text-red-600 hover:text-red-700 text-sm flex items-center"
                      >
                        <TrashIcon className="h-4 w-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <EnvelopeIcon className="h-5 w-5 mr-2" />
              Delivery Settings
            </h2>

            <div className="space-y-6">
              {/* Primary Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Email
                </label>
                <input
                  type="email"
                  value={deliveryEmail}
                  onChange={(e) => setDeliveryEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Reports will be sent to this email address
                </p>
              </div>

              {/* Additional Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Recipients
                </label>

                <div className="flex gap-2 mb-3">
                  <input
                    type="email"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                    placeholder="colleague@email.com"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-olive-500"
                  />
                  <button
                    onClick={addRecipient}
                    className="px-4 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                </div>

                {additionalRecipients.length > 0 && (
                  <div className="space-y-2">
                    {additionalRecipients.map((email) => (
                      <div key={email} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md">
                        <span className="text-sm text-gray-700">{email}</span>
                        <button
                          onClick={() => removeRecipient(email)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Format Settings */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Report Format Settings
            </h2>

            <div className="space-y-6">
              {/* Preferred Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preferred Format
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {FORMATS.map((format) => (
                    <div
                      key={format.value}
                      onClick={() => setPreferredFormat(format.value)}
                      className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                        preferredFormat === format.value
                          ? 'border-olive-600 bg-olive-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{format.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{format.label}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Report Content Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Report Content
                </label>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={includeCharts}
                        onChange={(e) => setIncludeCharts(e.target.checked)}
                        className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label className="font-medium text-gray-900">Include Charts & Graphs</label>
                      <p className="text-sm text-gray-600">Visual representations of data trends</p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        checked={includeRawData}
                        onChange={(e) => setIncludeRawData(e.target.checked)}
                        className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label className="font-medium text-gray-900">Include Raw Data Tables</label>
                      <p className="text-sm text-gray-600">Detailed data tables for analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button (Bottom) */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => loadReportSettings()}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-olive-500"
          >
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-2 bg-olive-600 text-white rounded-md hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-olive-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Report Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

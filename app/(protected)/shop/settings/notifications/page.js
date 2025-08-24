'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  BellIcon,
  EnvelopeIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function NotificationsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  
  const [formData, setFormData] = useState({
    // Email notifications
    email_new_booking: true,
    email_booking_cancelled: true,
    email_booking_reminder: false,
    email_daily_summary: true,
    email_weekly_report: false,
    
    // SMS notifications
    sms_new_booking: false,
    sms_booking_cancelled: false,
    sms_booking_reminder: true,
    
    // Push notifications
    push_new_booking: true,
    push_booking_cancelled: true,
    push_booking_reminder: true,
    
    // Customer notifications
    customer_booking_confirmation: true,
    customer_booking_reminder: true,
    customer_booking_cancelled: true,
    
    // Timing
    reminder_hours_before: 24,
    daily_summary_time: '18:00',
    weekly_report_day: 'sunday'
  })

  const [originalData, setOriginalData] = useState(null)
  const initialValues = useRef(null)

  useEffect(() => {
    loadSettings()
  }, [user])

  // Capture initial state on first render
  useEffect(() => {
    if (!initialValues.current) {
      initialValues.current = JSON.parse(JSON.stringify(formData))
    }
  }, [])

  useEffect(() => {
    // Always check if data has changed against initial values
    if (initialValues.current) {
      const changed = JSON.stringify(formData) !== JSON.stringify(initialValues.current)
      setHasChanges(changed)
    }
  }, [formData])

  const loadSettings = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const { data: settings } = await supabase
        .from('business_settings')
        .select('notification_preferences')
        .eq('user_id', user.id)
        .single()
      
      if (settings?.notification_preferences) {
        const prefs = settings.notification_preferences
        setFormData({
          email_new_booking: prefs.email_new_booking !== false,
          email_booking_cancelled: prefs.email_booking_cancelled !== false,
          email_booking_reminder: prefs.email_booking_reminder || false,
          email_daily_summary: prefs.email_daily_summary !== false,
          email_weekly_report: prefs.email_weekly_report || false,
          sms_new_booking: prefs.sms_new_booking || false,
          sms_booking_cancelled: prefs.sms_booking_cancelled || false,
          sms_booking_reminder: prefs.sms_booking_reminder !== false,
          push_new_booking: prefs.push_new_booking !== false,
          push_booking_cancelled: prefs.push_booking_cancelled !== false,
          push_booking_reminder: prefs.push_booking_reminder !== false,
          customer_booking_confirmation: prefs.customer_booking_confirmation !== false,
          customer_booking_reminder: prefs.customer_booking_reminder !== false,
          customer_booking_cancelled: prefs.customer_booking_cancelled !== false,
          reminder_hours_before: prefs.reminder_hours_before || 24,
          daily_summary_time: prefs.daily_summary_time || '18:00',
          weekly_report_day: prefs.weekly_report_day || 'sunday'
        })
        setOriginalData(prefs)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load notification settings'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const { data: existing } = await supabase
        .from('business_settings')
        .select('id')
        .eq('user_id', user.id)
        .single()
      
      if (existing) {
        await supabase
          .from('business_settings')
          .update({
            notification_preferences: formData,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('business_settings')
          .insert({
            user_id: user.id,
            notification_preferences: formData
          })
      }
      
      setOriginalData(formData)
      setHasChanges(false)
      setNotification({
        type: 'success',
        message: 'Notification settings saved successfully'
      })
    } catch (error) {
      console.error('Error saving:', error)
      setNotification({
        type: 'error',
        message: 'Failed to save settings'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-olive-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure how and when you receive notifications about your business
        </p>
      </div>

      {notification && (
        <div className={`mb-6 p-4 rounded-lg flex items-start ${
          notification.type === 'success' ? 'bg-green-50' : 'bg-red-50'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircleIcon className="h-5 w-5 text-green-400 mt-0.5 mr-2" />
          ) : (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
          )}
          <span className={`text-sm ${
            notification.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {notification.message}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Email Notifications */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <EnvelopeIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Email Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.email_new_booking}
                  onChange={(e) => setFormData({...formData, email_new_booking: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  New booking notifications
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.email_booking_cancelled}
                  onChange={(e) => setFormData({...formData, email_booking_cancelled: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Booking cancellation notifications
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.email_daily_summary}
                  onChange={(e) => setFormData({...formData, email_daily_summary: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Daily summary reports
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.email_weekly_report}
                  onChange={(e) => setFormData({...formData, email_weekly_report: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Weekly business reports
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <DevicePhoneMobileIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">SMS Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sms_new_booking}
                  onChange={(e) => setFormData({...formData, sms_new_booking: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  New booking SMS alerts
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.sms_booking_reminder}
                  onChange={(e) => setFormData({...formData, sms_booking_reminder: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Appointment reminder SMS
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Customer Notifications */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <BellIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Customer Notifications</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.customer_booking_confirmation}
                  onChange={(e) => setFormData({...formData, customer_booking_confirmation: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Send booking confirmations to customers
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.customer_booking_reminder}
                  onChange={(e) => setFormData({...formData, customer_booking_reminder: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Send appointment reminders to customers
                </span>
              </label>

              <div className="ml-6">
                <label className="block text-sm font-medium text-gray-700">
                  Send reminders (hours before appointment)
                </label>
                <input
                  type="number"
                  value={formData.reminder_hours_before}
                  onChange={(e) => setFormData({...formData, reminder_hours_before: parseInt(e.target.value)})}
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="1"
                  max="168"
                  disabled={!formData.customer_booking_reminder}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          {hasChanges && (
            <button
              type="button"
              onClick={() => {
                setFormData(originalData)
                setHasChanges(false)
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!hasChanges || saving}
            className={`px-4 py-2 rounded-lg transition-colors ${
              !hasChanges || saving
                ? 'bg-gray-400 text-gray-500 cursor-not-allowed'
                : 'bg-olive-600 text-white hover:bg-olive-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
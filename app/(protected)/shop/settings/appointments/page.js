'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import {
  ClockIcon,
  CalendarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

export default function AppointmentSettingsPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  
  const [formData, setFormData] = useState({
    default_duration: 30,
    buffer_time: 15,
    max_advance_booking: 30,
    min_advance_booking: 60,
    allow_back_to_back: false,
    allow_double_booking: false,
    auto_confirm: true,
    reminder_hours: 24,
    late_threshold: 15,
    no_show_threshold: 30
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
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (settings?.booking_rules) {
        const appointmentSettings = {
          default_duration: settings.booking_rules.default_duration || 30,
          buffer_time: settings.booking_rules.buffer_time || 15,
          max_advance_booking: settings.booking_rules.maxAdvanceBooking || 30,
          min_advance_booking: settings.booking_rules.minAdvanceBooking || 60,
          allow_back_to_back: settings.booking_rules.allow_back_to_back || false,
          allow_double_booking: settings.booking_rules.allowDoubleBooking || false,
          auto_confirm: settings.booking_rules.auto_confirm !== false,
          reminder_hours: settings.booking_rules.reminder_hours || 24,
          late_threshold: settings.booking_rules.late_threshold || 15,
          no_show_threshold: settings.booking_rules.no_show_threshold || 30
        }
        setFormData(appointmentSettings)
        setOriginalData(appointmentSettings)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setNotification({
        type: 'error',
        message: 'Failed to load appointment settings'
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
        .select('id, booking_rules')
        .eq('user_id', user.id)
        .single()
      
      const updatedBookingRules = {
        ...(existing?.booking_rules || {}),
        ...formData
      }
      
      if (existing) {
        await supabase
          .from('business_settings')
          .update({
            booking_rules: updatedBookingRules,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('business_settings')
          .insert({
            user_id: user.id,
            booking_rules: updatedBookingRules
          })
      }
      
      setOriginalData(formData)
      setHasChanges(false)
      setNotification({
        type: 'success',
        message: 'Appointment settings saved successfully'
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
        <h1 className="text-2xl font-bold text-gray-900">Appointment Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Configure appointment durations, scheduling rules, and booking policies
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
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <ClockIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Time Settings</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Default Appointment Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.default_duration}
                  onChange={(e) => setFormData({...formData, default_duration: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="15"
                  step="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Buffer Time Between Appointments (minutes)
                </label>
                <input
                  type="number"
                  value={formData.buffer_time}
                  onChange={(e) => setFormData({...formData, buffer_time: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="0"
                  step="5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Advance Booking (minutes)
                </label>
                <input
                  type="number"
                  value={formData.min_advance_booking}
                  onChange={(e) => setFormData({...formData, min_advance_booking: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="0"
                  step="30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Maximum Advance Booking (days)
                </label>
                <input
                  type="number"
                  value={formData.max_advance_booking}
                  onChange={(e) => setFormData({...formData, max_advance_booking: parseInt(e.target.value)})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-olive-500 focus:ring-olive-500 sm:text-sm"
                  min="1"
                  max="365"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl">
          <div className="px-4 py-6 sm:p-8">
            <div className="flex items-center mb-6">
              <CalendarIcon className="h-6 w-6 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Scheduling Rules</h2>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_back_to_back}
                  onChange={(e) => setFormData({...formData, allow_back_to_back: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Allow back-to-back appointments
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.allow_double_booking}
                  onChange={(e) => setFormData({...formData, allow_double_booking: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Allow double booking
                </span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.auto_confirm}
                  onChange={(e) => setFormData({...formData, auto_confirm: e.target.checked})}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Auto-confirm appointments
                </span>
              </label>
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
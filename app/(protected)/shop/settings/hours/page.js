'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/client'
import OnboardingStepBanner from '@/components/onboarding/OnboardingStepBanner'
import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function BusinessHoursPage() {
  const { user } = useAuth()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  
  const [hours, setHours] = useState({
    monday: { open: '09:00', close: '18:00', closed: false },
    tuesday: { open: '09:00', close: '18:00', closed: false },
    wednesday: { open: '09:00', close: '18:00', closed: false },
    thursday: { open: '09:00', close: '18:00', closed: false },
    friday: { open: '09:00', close: '19:00', closed: false },
    saturday: { open: '10:00', close: '17:00', closed: false },
    sunday: { open: '00:00', close: '00:00', closed: true }
  })

  const [originalHours, setOriginalHours] = useState(null)
  const [specialDates, setSpecialDates] = useState([])

  useEffect(() => {
    loadBusinessHours()
  }, [user])

  useEffect(() => {
    const changed = originalHours === null 
      ? Object.keys(hours).some(day => 
          hours[day].open !== '09:00' || 
          hours[day].close !== (day === 'friday' ? '19:00' : day === 'saturday' ? '17:00' : '18:00') ||
          hours[day].closed !== (day === 'sunday')
        )
      : JSON.stringify(hours) !== JSON.stringify(originalHours)
    setHasChanges(changed)
  }, [hours, originalHours])

  const loadBusinessHours = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      const { data: shop, error } = await supabase
        .from('barbershops')
        .select('business_hours')
        .eq('owner_id', user.id)
        .single()
      
      if (shop && shop.business_hours) {
        setHours(shop.business_hours)
        setOriginalHours(shop.business_hours)
      }
    } catch (error) {
      console.error('Error loading hours:', error)
      showNotification('error', 'Failed to load business hours')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setNotification(null)
    
    try {
      const { error } = await supabase
        .from('barbershops')
        .update({
          business_hours: hours,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', user?.id)
      
      if (error) throw error
      
      setOriginalHours(hours)
      setHasChanges(false)
      showNotification('success', 'Business hours saved successfully!')
    } catch (error) {
      console.error('Error saving:', error)
      showNotification('error', 'Failed to save business hours')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setHours(originalHours)
    setHasChanges(false)
    showNotification('info', 'Changes discarded')
  }

  const updateHours = (day, field, value) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
  }

  const applyToWeekdays = () => {
    const mondayHours = hours.monday
    const weekdays = ['tuesday', 'wednesday', 'thursday', 'friday']
    
    const newHours = { ...hours }
    weekdays.forEach(day => {
      newHours[day] = { ...mondayHours }
    })
    
    setHours(newHours)
    showNotification('info', 'Monday hours applied to all weekdays')
  }

  const applyToAllDays = () => {
    const mondayHours = hours.monday
    const allDays = ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    
    const newHours = { ...hours }
    allDays.forEach(day => {
      newHours[day] = { ...mondayHours }
    })
    
    setHours(newHours)
    showNotification('info', 'Monday hours applied to all days')
  }

  const showNotification = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
      </div>
    )
  }

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ]

  // Validation function for onboarding completion
  const validateHoursCompletion = async () => {
    try {
      const response = await fetch('/api/onboarding/status', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        const hoursComplete = data.steps?.hours?.complete || false
        return {
          valid: hoursComplete,
          message: hoursComplete 
            ? 'Business hours have been set successfully!' 
            : 'Please set operating hours for at least one day'
        }
      }
    } catch (error) {
      console.error('Error validating hours completion:', error)
    }
    
    // Fallback: Check local state if API fails
    // This ensures users aren't blocked by API issues
    const hasLocalHours = Object.values(hours).some(dayHours => 
      dayHours && !dayHours.closed && dayHours.open && dayHours.close
    )
    
    return {
      valid: hasLocalHours,
      message: hasLocalHours 
        ? 'Business hours have been set successfully!' 
        : 'Please set operating hours for at least one day.'
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Onboarding Step Banner */}
      <OnboardingStepBanner 
        stepId="schedule"
        validateCompletion={validateHoursCompletion}
        completionMessage="Business hours configured successfully!"
      />
      
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-gray-400 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Business Hours</h1>
                <p className="text-sm text-gray-600">Set your shop's operating hours</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <button
                  onClick={handleDiscard}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Discard
                </button>
              )}
              <button
                onClick={handleSave}
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
          </div>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`px-6 py-3 ${
            notification.type === 'success' ? 'bg-green-50 border-b border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border-b border-red-200' :
            'bg-blue-50 border-b border-blue-200'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              ) : notification.type === 'error' ? (
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              ) : (
                <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
              )}
              <span className={`text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </span>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Quick Actions:</span>
            <div className="flex space-x-2">
              <button
                onClick={applyToWeekdays}
                className="text-sm text-olive-600 hover:text-olive-700 font-medium"
              >
                Apply Monday to Weekdays
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={applyToAllDays}
                className="text-sm text-olive-600 hover:text-olive-700 font-medium"
              >
                Apply Monday to All Days
              </button>
            </div>
          </div>
        </div>

        {/* Hours Table */}
        <div className="p-6">
          <div className="space-y-4">
            {days.map(({ key, label }) => (
              <div key={key} className="flex items-center space-x-4 py-3 border-b last:border-0">
                <div className="w-32">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!hours[key].closed}
                    onChange={(e) => updateHours(key, 'closed', !e.target.checked)}
                    className="h-4 w-4 text-olive-600 rounded focus:ring-olive-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Open</span>
                </label>
                
                {!hours[key].closed ? (
                  <>
                    <div className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={hours[key].open}
                        onChange={(e) => updateHours(key, 'open', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="time"
                        value={hours[key].close}
                        onChange={(e) => updateHours(key, 'close', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                      />
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-500 italic">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Special Hours Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Special Hours & Holidays</h2>
          <p className="text-sm text-gray-600">Set custom hours for specific dates</p>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No special hours configured</p>
            <button className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700">
              Add Special Hours
            </button>
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 p-4 bg-olive-50 rounded-lg">
        <div className="flex items-start">
          <InformationCircleIcon className="h-5 w-5 text-olive-600 mt-0.5 mr-2" />
          <div>
            <p className="text-sm text-olive-800">
              <strong>Pro Tip:</strong> Keep your hours up-to-date to help customers know when they can visit. 
              Consider setting special hours for holidays or events to avoid confusion.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
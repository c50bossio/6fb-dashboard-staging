'use client'

import {
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PencilIcon,
  TrashIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import OnboardingStepBanner from '@/components/onboarding/OnboardingStepBanner'
import { useAuth } from '@/components/SupabaseAuthProvider'
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'
import SpecialHoursModal from '@/components/shop/SpecialHoursModal'

// Helper function to get default hours structure
const getDefaultHours = () => ({
  monday: { open: '09:00', close: '18:00', closed: false },
  tuesday: { open: '09:00', close: '18:00', closed: false },
  wednesday: { open: '09:00', close: '18:00', closed: false },
  thursday: { open: '09:00', close: '18:00', closed: false },
  friday: { open: '09:00', close: '19:00', closed: false },
  saturday: { open: '10:00', close: '17:00', closed: false },
  sunday: { open: '00:00', close: '00:00', closed: true }
})

// Helper function to validate and merge hours data from database
const validateAndMergeHours = (dbHours) => {
  const defaults = getDefaultHours()
  
  // If no data or invalid data, return defaults
  if (!dbHours || typeof dbHours !== 'object') {
    return defaults
  }
  
  // Merge with defaults to ensure all days exist with proper structure
  const merged = { ...defaults }
  Object.keys(defaults).forEach(day => {
    if (dbHours[day] && typeof dbHours[day] === 'object') {
      merged[day] = {
        open: dbHours[day].open || defaults[day].open,
        close: dbHours[day].close || defaults[day].close,
        closed: dbHours[day].closed !== undefined ? dbHours[day].closed : defaults[day].closed
      }
    }
  })
  
  return merged
}

export default function BusinessHoursPage() {
  const { user: _user } = useAuth()
  const _supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [notification, setNotification] = useState(null)
  
  const [hours, setHours] = useState(getDefaultHours())

  const [originalHours, setOriginalHours] = useState(null)
  const [specialDates, setSpecialDates] = useState([])
  
  // Special hours modal state
  const [showSpecialHoursModal, setShowSpecialHoursModal] = useState(false)
  const [editingSpecialHours, setEditingSpecialHours] = useState(null)
  const [loadingSpecialHours, setLoadingSpecialHours] = useState(false)
  const [specialHoursAvailable, setSpecialHoursAvailable] = useState(false)

  useEffect(() => {
    loadBusinessHours()
    loadSpecialHours()
  }, [_user])

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
    if (!_user) return
    
    try {
      setLoading(true)
      
      const { data: shop, error } = await _supabase
        .from('barbershops')
        .select('business_hours')
        .eq('owner_id', _user.id)
        .single()
      
      if (shop && shop.business_hours) {
        const validatedHours = validateAndMergeHours(shop.business_hours)
        setHours(validatedHours)
        setOriginalHours(validatedHours)
      } else {
        // No data from DB, use defaults
        const defaultHours = getDefaultHours()
        setHours(defaultHours)
        setOriginalHours(defaultHours)
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
      const { error } = await _supabase
        .from('barbershops')
        .update({
          business_hours: hours,
          updated_at: new Date().toISOString()
        })
        .eq('owner_id', _user?.id)
      
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
    setHours(originalHours || getDefaultHours())
    setHasChanges(false)
    showNotification('info', 'Changes discarded')
  }

  const updateHours = (day, field, value) => {
    setHours(prev => {
      // Ensure day exists with default structure if missing
      if (!prev[day]) {
        prev[day] = { open: '09:00', close: '18:00', closed: false }
      }
      
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [field]: value
        }
      }
    })
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

  const loadSpecialHours = async () => {
    if (!_user) return
    
    try {
      setLoadingSpecialHours(true)
      
      // First, get the user's shop ID
      const { data: profile, error: profileError } = await _supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', _user.id)
        .single()

      if (profileError) {
        console.error('Error loading profile:', profileError)
        setSpecialHoursAvailable(false)
        return
      }

      const shopId = profile.barbershop_id
      if (!shopId) {
        setSpecialHoursAvailable(false)
        return
      }
      
      // Load special hours from schedule_exceptions table
      const { data: exceptions, error } = await _supabase
        .from('schedule_exceptions')
        .select('*')
        .eq('barbershop_id', shopId)
        .gte('date', new Date().toISOString().split('T')[0]) // Only future dates
        .order('date', { ascending: true })
      
      if (error) {
        // Check if the error is due to missing table/relation
        if (error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log('Schedule exceptions table not yet created in database - special hours feature disabled')
          setSpecialHoursAvailable(false)
          setSpecialDates([])
          return
        }
        
        // For other errors (RLS, permissions, etc.), show error
        console.error('Error loading special hours:', error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        showNotification('error', `Failed to load special hours: ${error.message}`)
        setSpecialHoursAvailable(false)
        return
      }
      
      // Success - table exists and we got data
      setSpecialHoursAvailable(true)
      setSpecialDates(exceptions || [])
    } catch (error) {
      console.error('Error loading special hours:', error)
      // Don't show notification for system errors - just disable the feature
      setSpecialHoursAvailable(false)
      setSpecialDates([])
    } finally {
      setLoadingSpecialHours(false)
    }
  }

  // Special hours management functions
  const handleAddSpecialHours = () => {
    setEditingSpecialHours(null)
    setShowSpecialHoursModal(true)
  }

  const handleEditSpecialHours = (specialHour) => {
    setEditingSpecialHours(specialHour)
    setShowSpecialHoursModal(true)
  }

  const handleDeleteSpecialHours = async (specialHourId) => {
    if (!confirm('Are you sure you want to delete this special hour?')) return
    
    try {
      const { error } = await _supabase
        .from('schedule_exceptions')
        .delete()
        .eq('id', specialHourId)
      
      if (error) throw error
      
      // Reload special hours
      loadSpecialHours()
      showNotification('success', 'Special hours deleted successfully')
    } catch (error) {
      console.error('Error deleting special hours:', error)
      showNotification('error', 'Failed to delete special hours')
    }
  }

  const handleSaveSpecialHours = async (specialHourData, editingId = null) => {
    try {
      // Get the user's shop ID
      const { data: profile } = await _supabase
        .from('profiles')
        .select('barbershop_id')
        .eq('id', _user.id)
        .single()

      const shopId = profile.barbershop_id
      if (!shopId) {
        throw new Error('No shop ID found')
      }
      
      const dataToSave = {
        ...specialHourData,
        barbershop_id: shopId,
        barber_id: null // This is for shop-wide special hours
      }
      
      let error
      if (editingId) {
        // Update existing
        const result = await _supabase
          .from('schedule_exceptions')
          .update(dataToSave)
          .eq('id', editingId)
        error = result.error
      } else {
        // Create new
        const result = await _supabase
          .from('schedule_exceptions')
          .insert([dataToSave])
        error = result.error
      }
      
      if (error) throw error
      
      // Reload special hours
      loadSpecialHours()
      showNotification('success', `Special hours ${editingId ? 'updated' : 'added'} successfully`)
    } catch (error) {
      console.error('Error saving special hours:', error)
      console.error('Full error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        data: dataToSave
      })
      showNotification('error', `Failed to ${editingId ? 'update' : 'add'} special hours: ${error.message}`)
      throw error
    }
  }

  const formatSpecialHourDisplay = (specialHour) => {
    // Parse date as local date to avoid timezone shift
    const date = new Date(specialHour.date + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
    
    let timeDisplay = ''
    if (specialHour.all_day) {
      timeDisplay = specialHour.type === 'holiday' || specialHour.type === 'time_off' ? 'Closed' : 'All Day'
    } else if (specialHour.start_time && specialHour.end_time) {
      const formatTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':')
        const hour12 = ((parseInt(hours) + 11) % 12) + 1
        const ampm = parseInt(hours) >= 12 ? 'PM' : 'AM'
        return `${hour12}:${minutes} ${ampm}`
      }
      timeDisplay = `${formatTime(specialHour.start_time)} - ${formatTime(specialHour.end_time)}`
    } else {
      timeDisplay = 'Closed'
    }
    
    return { date, timeDisplay }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'holiday':
        return '🎉'
      case 'time_off':
        return '🏖️'
      case 'special_hours':
      default:
        return '⏰'
    }
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
            {days.map(({ key, label }) => {
              // Defensive check: Ensure day hours exist with defaults
              const dayHours = hours[key] || { open: '09:00', close: '18:00', closed: false }
              
              return (
                <div key={key} className="flex items-center space-x-4 py-3 border-b last:border-0">
                  <div className="w-32">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                  </div>
                  
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!dayHours.closed}
                      onChange={(e) => updateHours(key, 'closed', !e.target.checked)}
                      className="h-4 w-4 text-olive-600 rounded focus:ring-olive-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Open</span>
                  </label>
                  
                  {!dayHours.closed ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={dayHours.open}
                          onChange={(e) => updateHours(key, 'open', e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={dayHours.close}
                          onChange={(e) => updateHours(key, 'close', e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-olive-500"
                        />
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-gray-500 italic">Closed</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Special Hours Section - Only show if feature is available */}
      {specialHoursAvailable && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Special Hours & Holidays</h2>
                <p className="text-sm text-gray-600">Set custom hours for specific dates</p>
              </div>
              <button
                onClick={handleAddSpecialHours}
                className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 flex items-center"
              >
                <CalendarDaysIcon className="h-4 w-4 mr-2" />
                Add Special Hours
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {loadingSpecialHours ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-olive-600"></div>
              </div>
            ) : specialDates.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-4">No special hours configured</p>
                <p className="text-sm text-gray-500">Add holidays, special hours, or time off dates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {specialDates.map((specialHour) => {
                  const { date, timeDisplay } = formatSpecialHourDisplay(specialHour)
                  return (
                    <div key={specialHour.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getTypeIcon(specialHour.type)}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-medium text-gray-900">{date}</p>
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full capitalize">
                              {specialHour.type.replace('_', ' ')}
                            </span>
                            {/* Show recurring indicator */}
                            {specialHour.is_recurring && (
                              <span className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full font-medium flex items-center space-x-1" title="Recurring annually">
                                <span>🔄</span>
                                <span>Annual</span>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{timeDisplay}</p>
                          {specialHour.reason && (
                            <p className="text-sm text-olive-600 font-medium">{specialHour.reason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditSpecialHours(specialHour)}
                          className="p-2 text-gray-400 hover:text-olive-600 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSpecialHours(specialHour.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Special Hours Feature Not Available Notice */}
      {!specialHoursAvailable && !loadingSpecialHours && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-900 mb-1">Special Hours & Holidays Feature</h3>
              <p className="text-sm text-blue-800 mb-3">
                This feature allows you to set custom hours for holidays, special events, or time off. 
                It requires additional database setup to be fully functional.
              </p>
              <p className="text-xs text-blue-700">
                <strong>For setup:</strong> Run the Supabase migration or contact your administrator to enable this feature.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Special Hours Modal */}
      <SpecialHoursModal
        isOpen={showSpecialHoursModal}
        onClose={() => setShowSpecialHoursModal(false)}
        onSave={handleSaveSpecialHours}
        editingHours={editingSpecialHours}
      />

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
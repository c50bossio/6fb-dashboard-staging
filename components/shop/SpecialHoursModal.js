'use client'

import { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function SpecialHoursModal({ 
  isOpen, 
  onClose, 
  onSave, 
  editingHours = null 
}) {
  const [formData, setFormData] = useState({
    date: '',
    type: 'special_hours', // 'special_hours', 'holiday', 'time_off'
    startTime: '09:00',
    endTime: '17:00',
    allDay: false,
    isClosed: false,
    reason: '',
    isRecurring: false,
    recurrencePattern: 'annual' // 'annual', 'monthly', 'weekly'
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  // Initialize form when editing or opening
  useEffect(() => {
    if (editingHours) {
      setFormData({
        date: editingHours.date,
        type: editingHours.type || 'special_hours',
        startTime: editingHours.start_time || '09:00',
        endTime: editingHours.end_time || '17:00',
        allDay: editingHours.all_day || false,
        isClosed: editingHours.type === 'holiday' || editingHours.type === 'time_off',
        reason: editingHours.reason || '',
        isRecurring: editingHours.is_recurring || false,
        recurrencePattern: editingHours.recurrence_pattern || 'annual'
      })
    } else {
      // Reset form for new entry
      setFormData({
        date: '',
        type: 'special_hours',
        startTime: '09:00',
        endTime: '17:00',
        allDay: false,
        isClosed: false,
        reason: '',
        isRecurring: false,
        recurrencePattern: 'annual'
      })
    }
    setErrors({})
  }, [editingHours, isOpen])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  const handleTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      type,
      isClosed: type === 'holiday' || type === 'time_off',
      allDay: type === 'holiday',
      // Auto-enable recurring for holidays, keep existing setting for others
      isRecurring: type === 'holiday' ? true : prev.isRecurring
    }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }
    
    if (!formData.isClosed && !formData.allDay) {
      if (!formData.startTime) {
        newErrors.startTime = 'Start time is required'
      }
      if (!formData.endTime) {
        newErrors.endTime = 'End time is required'
      }
      if (formData.startTime && formData.endTime && formData.startTime >= formData.endTime) {
        newErrors.endTime = 'End time must be after start time'
      }
    }
    
    if (formData.type === 'holiday' && !formData.reason) {
      newErrors.reason = 'Holiday name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    
    setSaving(true)
    try {
      const baseSpecialHourData = {
        date: formData.date,
        type: formData.type,
        start_time: formData.isClosed || formData.allDay ? null : formData.startTime,
        end_time: formData.isClosed || formData.allDay ? null : formData.endTime,
        all_day: formData.allDay,
        reason: formData.reason || null,
        is_recurring: formData.isRecurring,
        recurrence_pattern: formData.isRecurring ? formData.recurrencePattern : 'none'
      }
      
      // If it's recurring and not editing, generate multiple years
      if (formData.isRecurring && !editingHours?.id && formData.recurrencePattern === 'annual') {
        await generateRecurringDates(baseSpecialHourData)
      } else {
        await onSave(baseSpecialHourData, editingHours?.id)
      }
      
      onClose()
    } catch (error) {
      console.error('Error saving special hours:', error)
    } finally {
      setSaving(false)
    }
  }

  const generateRecurringDates = async (baseData) => {
    const datesToCreate = []
    const baseDate = new Date(baseData.date + 'T12:00:00') // Force local noon
    const currentYear = baseDate.getFullYear()
    
    // Generate for current year + next 2 years (total of 3 years)
    for (let yearOffset = 0; yearOffset < 3; yearOffset++) {
      const targetYear = currentYear + yearOffset
      const yearDate = new Date(baseDate)
      yearDate.setFullYear(targetYear)
      
      // Only create if the date hasn't passed this year (for year 0)
      if (yearOffset === 0) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (yearDate < today) {
          continue // Skip this year if holiday already passed
        }
      }
      
      datesToCreate.push({
        ...baseData,
        date: yearDate.toISOString().split('T')[0]
      })
    }
    
    console.log(`🔄 Creating ${datesToCreate.length} recurring dates for ${baseData.reason}`)
    
    // Save all dates
    for (const dateData of datesToCreate) {
      await onSave(dateData, null) // null = create new, not editing
    }
    
    // Show success message
    if (datesToCreate.length > 1) {
      alert(`✅ Created recurring ${baseData.type} "${baseData.reason}" for ${datesToCreate.length} years`)
    }
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

  // Helper function to get next occurrence of a holiday (this year or next year)
  const getNextHolidayDate = (monthDay) => {
    const currentYear = new Date().getFullYear()
    const today = new Date()
    // Force local timezone at noon to avoid timezone shift issues
    const holidayThisYear = new Date(`${currentYear}-${monthDay}T12:00:00`)
    
    // If the holiday has already passed this year, use next year
    if (holidayThisYear < today) {
      return `${currentYear + 1}-${monthDay}`
    } else {
      return `${currentYear}-${monthDay}`
    }
  }

  const quickHolidayPresets = [
    { name: 'New Year\'s Day', date: getNextHolidayDate('01-01'), type: 'holiday', recurring: true },
    { name: 'Martin Luther King Jr. Day', date: getNextHolidayDate('01-15'), type: 'holiday', recurring: true, note: '3rd Monday in January' },
    { name: 'Presidents Day', date: getNextHolidayDate('02-19'), type: 'holiday', recurring: true, note: '3rd Monday in February' },
    { name: 'Memorial Day', date: getNextHolidayDate('05-27'), type: 'holiday', recurring: true, note: 'Last Monday in May' },
    { name: 'Independence Day', date: getNextHolidayDate('07-04'), type: 'holiday', recurring: true },
    { name: 'Labor Day', date: getNextHolidayDate('09-02'), type: 'holiday', recurring: true, note: '1st Monday in September' },
    { name: 'Thanksgiving Day', date: getNextHolidayDate('11-28'), type: 'holiday', recurring: true, note: '4th Thursday in November' },
    { name: 'Christmas Day', date: getNextHolidayDate('12-25'), type: 'holiday', recurring: true }
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-6 w-6 text-olive-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {editingHours ? 'Edit Special Hours' : 'Add Special Hours'}
              </h2>
              <p className="text-sm text-gray-600">Set custom hours for specific dates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type
            </label>
            <div className="space-y-2">
              {[
                { value: 'special_hours', label: 'Special Hours', desc: 'Different hours for this date' },
                { value: 'holiday', label: 'Holiday', desc: 'Closed for holiday' },
                { value: 'time_off', label: 'Time Off', desc: 'Personal time off' }
              ].map((option) => (
                <label key={option.value} className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={option.value}
                    checked={formData.type === option.value}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="mt-1 h-4 w-4 text-olive-600 focus:ring-olive-500"
                  />
                  <div className="ml-3">
                    <span className="text-lg mr-2">{getTypeIcon(option.value)}</span>
                    <span className="text-sm font-medium text-gray-900">{option.label}</span>
                    <p className="text-xs text-gray-600">{option.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Hours Configuration */}
          {!formData.isClosed && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Hours
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => handleInputChange('allDay', e.target.checked)}
                    className="h-4 w-4 text-olive-600 focus:ring-olive-500 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">All Day</span>
                </label>
              </div>

              {!formData.allDay && (
                <div className="flex items-center space-x-3">
                  <div className="flex-1">
                    <input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => handleInputChange('startTime', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 ${
                        errors.startTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.startTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
                    )}
                  </div>
                  <span className="text-gray-500">to</span>
                  <div className="flex-1">
                    <input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => handleInputChange('endTime', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 ${
                        errors.endTime ? 'border-red-300' : 'border-gray-300'
                      }`}
                    />
                    {errors.endTime && (
                      <p className="mt-1 text-sm text-red-600">{errors.endTime}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason/Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.type === 'holiday' ? 'Holiday Name' : 'Reason/Description'}
              {formData.type === 'holiday' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder={
                formData.type === 'holiday' ? 'e.g., Christmas Day' :
                formData.type === 'time_off' ? 'e.g., Personal day' :
                'e.g., Extended hours for event'
              }
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500 ${
                errors.reason ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.reason && (
              <p className="mt-1 text-sm text-red-600">{errors.reason}</p>
            )}
          </div>

          {/* Recurring Settings */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Recurring
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isRecurring}
                  onChange={(e) => handleInputChange('isRecurring', e.target.checked)}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 rounded"
                />
                <span className="ml-2 text-sm text-gray-600">
                  {formData.type === 'holiday' ? 'Every year' : 'Repeat'}
                </span>
              </label>
            </div>
            
            {formData.isRecurring && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recurrence Pattern
                </label>
                <select
                  value={formData.recurrencePattern}
                  onChange={(e) => handleInputChange('recurrencePattern', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-olive-500"
                >
                  <option value="annual">Every year</option>
                  <option value="monthly">Every month</option>
                  <option value="weekly">Every week</option>
                </select>
              </div>
            )}
            
            {formData.isRecurring && (
              <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-green-500 text-sm">✓</span>
                  <div className="text-sm text-green-800">
                    <p className="font-medium">
                      {formData.type === 'holiday' ? 'Annual Holiday' : 'Recurring Event'}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      {formData.recurrencePattern === 'annual' && 'This will be automatically applied every year on the same date'}
                      {formData.recurrencePattern === 'monthly' && 'This will be automatically applied every month on the same day'}
                      {formData.recurrencePattern === 'weekly' && 'This will be automatically applied every week on the same day'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Presets */}
          {!editingHours && formData.type === 'holiday' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 gap-2">
                {quickHolidayPresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      if (preset.date) {
                        setFormData(prev => ({
                          ...prev,
                          date: preset.date,
                          reason: preset.name,
                          isRecurring: preset.recurring || false,
                          recurrencePattern: preset.recurring ? 'annual' : 'none',
                          type: preset.type
                        }))
                      }
                    }}
                    disabled={!preset.date}
                    className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    title={preset.note}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">{preset.name}</span>
                      {preset.recurring && (
                        <span className="text-xs text-green-600 font-medium">↻</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start space-x-2 p-3 bg-blue-50 rounded-lg">
            <InformationCircleIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">How it works:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li>Special hours override your regular business hours</li>
                <li>Holidays and time off mark you as closed</li>
                <li>Customers will see these changes in booking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : (editingHours ? 'Update' : 'Add Special Hours')}
          </button>
        </div>
      </div>
    </div>
  )
}
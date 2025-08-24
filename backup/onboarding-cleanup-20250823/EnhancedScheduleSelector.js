'use client'

import { useState, useEffect } from 'react'
import { ClockIcon, DocumentDuplicateIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

/**
 * Enhanced Schedule Selector with Copy to Weekdays functionality
 * Allows users to set custom hours and copy them to similar days
 */
export default function EnhancedScheduleSelector({ value, onChange }) {
  // Define templates first so they can be used in initialization
  const scheduleTemplates = [
    {
      id: 'traditional',
      name: 'Traditional',
      description: 'Mon-Fri 9-6, Sat 9-5, Sun closed',
      hours: {
        monday: { open: '09:00', close: '18:00', closed: false },
        tuesday: { open: '09:00', close: '18:00', closed: false },
        wednesday: { open: '09:00', close: '18:00', closed: false },
        thursday: { open: '09:00', close: '18:00', closed: false },
        friday: { open: '09:00', close: '18:00', closed: false },
        saturday: { open: '09:00', close: '17:00', closed: false },
        sunday: { open: '09:00', close: '17:00', closed: true }
      }
    },
    {
      id: 'extended',
      name: 'Extended Hours',
      description: 'Mon-Sat 8-8, Sun 10-6',
      hours: {
        monday: { open: '08:00', close: '20:00', closed: false },
        tuesday: { open: '08:00', close: '20:00', closed: false },
        wednesday: { open: '08:00', close: '20:00', closed: false },
        thursday: { open: '08:00', close: '20:00', closed: false },
        friday: { open: '08:00', close: '20:00', closed: false },
        saturday: { open: '08:00', close: '20:00', closed: false },
        sunday: { open: '10:00', close: '18:00', closed: false }
      }
    },
    {
      id: 'weekend',
      name: 'Weekend Focus',
      description: 'Thu-Sun, closed Mon-Wed',
      hours: {
        monday: { open: '09:00', close: '17:00', closed: true },
        tuesday: { open: '09:00', close: '17:00', closed: true },
        wednesday: { open: '09:00', close: '17:00', closed: true },
        thursday: { open: '09:00', close: '19:00', closed: false },
        friday: { open: '09:00', close: '19:00', closed: false },
        saturday: { open: '08:00', close: '20:00', closed: false },
        sunday: { open: '09:00', close: '18:00', closed: false }
      }
    },
    {
      id: 'custom',
      name: 'Custom Hours',
      description: 'Set your own schedule',
      hours: null
    }
  ]

  // Initialize from saved value if it exists
  const [customMode, setCustomMode] = useState(value?.id === 'custom')
  const [customHours, setCustomHours] = useState(() => {
    // If we have custom hours saved, use them
    if (value?.id === 'custom' && value?.hours) {
      return value.hours
    }
    // Otherwise use defaults
    return {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '17:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: true }
    }
  })
  
  // Sync with prop changes (when navigating back)
  useEffect(() => {
    if (value?.id === 'custom' && value?.hours) {
      setCustomHours(value.hours)
      setCustomMode(true)
    } else if (value?.id && value?.id !== 'custom') {
      // If a template is selected, update customHours to match
      const template = scheduleTemplates.find(t => t.id === value.id)
      if (template?.hours) {
        setCustomHours(template.hours)
      }
    }
  }, [value]) // Remove scheduleTemplates from deps as it's recreated on each render

  const selectTemplate = (template) => {
    if (template.id === 'custom') {
      setCustomMode(true)
      onChange({ id: 'custom', hours: customHours })
    } else {
      setCustomMode(false)
      setCustomHours(template.hours)
      onChange(template)
    }
  }

  const updateDay = (day, field, value) => {
    const newHours = {
      ...customHours,
      [day]: {
        ...customHours[day],
        [field]: value
      }
    }
    setCustomHours(newHours)
    onChange({ id: 'custom', hours: newHours })
  }

  const toggleDayClosed = (day) => {
    updateDay(day, 'closed', !customHours[day].closed)
  }

  const copyToWeekdays = () => {
    const mondayHours = customHours.monday
    const newHours = {
      ...customHours,
      tuesday: { ...mondayHours },
      wednesday: { ...mondayHours },
      thursday: { ...mondayHours },
      friday: { ...mondayHours }
    }
    setCustomHours(newHours)
    onChange({ id: 'custom', hours: newHours })
  }

  const copyToWeekend = () => {
    const saturdayHours = customHours.saturday
    const newHours = {
      ...customHours,
      sunday: { ...saturdayHours }
    }
    setCustomHours(newHours)
    onChange({ id: 'custom', hours: newHours })
  }

  const copyToAll = () => {
    const mondayHours = customHours.monday
    const newHours = {}
    Object.keys(customHours).forEach(day => {
      newHours[day] = { ...mondayHours }
    })
    setCustomHours(newHours)
    onChange({ id: 'custom', hours: newHours })
  }

  const timeOptions = []
  for (let hour = 0; hour < 24; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      const display = new Date(`2000-01-01 ${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
      timeOptions.push({ value: time, label: display })
    }
  }

  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Hours</h3>
      
      {/* Template Selection */}
      {!customMode && (
        <div className="space-y-3 mb-6">
          {scheduleTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => selectTemplate(template)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                value?.id === template.id
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{template.name}</p>
                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                </div>
                {value?.id === template.id && (
                  <CheckCircleIcon className="w-5 h-5 text-yellow-600" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Custom Hours Editor */}
      {customMode && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">Custom Schedule</h4>
            <button
              onClick={() => setCustomMode(false)}
              className="text-sm text-gray-700 hover:text-gray-900 font-medium"
            >
              Back to templates
            </button>
          </div>

          {/* Copy Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              onClick={copyToWeekdays}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Copy Mon to Weekdays
            </button>
            <button
              onClick={copyToWeekend}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Copy Sat to Sun
            </button>
            <button
              onClick={copyToAll}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              Copy Mon to All
            </button>
          </div>

          {/* Day Schedule Grid */}
          <div className="space-y-2">
            {Object.entries(customHours).map(([day, hours]) => (
              <div key={day} className="flex items-center gap-3 bg-white p-3 rounded-lg">
                <input
                  type="checkbox"
                  checked={!hours.closed}
                  onChange={() => toggleDayClosed(day)}
                  className="rounded border-gray-300"
                />
                <span className="w-24 text-sm font-medium text-gray-700">
                  {dayNames[day]}
                </span>
                {!hours.closed ? (
                  <>
                    <select
                      value={hours.open}
                      onChange={(e) => updateDay(day, 'open', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      {timeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <span className="text-gray-500">to</span>
                    <select
                      value={hours.close}
                      onChange={(e) => updateDay(day, 'close', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      {timeOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </>
                ) : (
                  <span className="text-gray-500 text-sm">Closed</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
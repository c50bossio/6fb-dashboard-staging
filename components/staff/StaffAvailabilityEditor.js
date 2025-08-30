'use client'

import { ClockIcon, CalendarDaysIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import Button from '@/components/ui/Button'
import { Card } from "@/components/ui/card.jsx"
import { createClient } from '@/lib/supabase/UNIFIED_CLIENT'

export default function StaffAvailabilityEditor({ staffMember, currentAvailability, onSave, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [availability, setAvailability] = useState({
    regularHours: {
      monday: { isWorking: true, start: '09:00', end: '17:00' },
      tuesday: { isWorking: true, start: '09:00', end: '17:00' },
      wednesday: { isWorking: true, start: '09:00', end: '17:00' },
      thursday: { isWorking: true, start: '09:00', end: '17:00' },
      friday: { isWorking: true, start: '09:00', end: '18:00' },
      saturday: { isWorking: true, start: '10:00', end: '16:00' },
      sunday: { isWorking: false, start: '10:00', end: '16:00' }
    },
    breaks: [
      { start: '12:00', end: '13:00', name: 'Lunch Break' }
    ],
    bookingBuffer: 15, // Minutes between appointments
    slotDuration: 30 // Default appointment length in minutes
  })

  // Load existing availability on mount
  useEffect(() => {
    if (currentAvailability) {
      setAvailability(currentAvailability)
    }
  }, [currentAvailability])

  const handleDayToggle = (day) => {
    setAvailability(prev => ({
      ...prev,
      regularHours: {
        ...prev.regularHours,
        [day]: {
          ...prev.regularHours[day],
          isWorking: !prev.regularHours[day].isWorking
        }
      }
    }))
  }

  const handleTimeChange = (day, field, value) => {
    setAvailability(prev => ({
      ...prev,
      regularHours: {
        ...prev.regularHours,
        [day]: {
          ...prev.regularHours[day],
          [field]: value
        }
      }
    }))
  }

  const handleBreakChange = (index, field, value) => {
    const newBreaks = [...availability.breaks]
    newBreaks[index] = {
      ...newBreaks[index],
      [field]: value
    }
    setAvailability(prev => ({
      ...prev,
      breaks: newBreaks
    }))
  }

  const addBreak = () => {
    setAvailability(prev => ({
      ...prev,
      breaks: [
        ...prev.breaks,
        { start: '15:00', end: '15:15', name: 'Break' }
      ]
    }))
  }

  const removeBreak = (index) => {
    setAvailability(prev => ({
      ...prev,
      breaks: prev.breaks.filter((_, i) => i !== index)
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Update staff metadata with availability
      const { error } = await supabase
        .from('barbershop_staff')
        .update({
          metadata: {
            ...(staffMember?.metadata || {}),
            availability: availability
          }
        })
        .eq('id', staffMember.id)

      if (error) throw error

      toast.success('Availability updated successfully')
      if (onSave) onSave(availability)
    } catch (error) {
      console.error('Error saving availability:', error)
      toast.error('Failed to save availability')
    } finally {
      setLoading(false)
    }
  }

  const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayLabels = {
    monday: 'Mon',
    tuesday: 'Tue',
    wednesday: 'Wed',
    thursday: 'Thu',
    friday: 'Fri',
    saturday: 'Sat',
    sunday: 'Sun'
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <CalendarDaysIcon className="h-5 w-5 mr-2 text-olive-600" />
          Staff Availability Configuration
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Set your regular working hours. This determines when clients can book appointments.
        </p>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-900">Regular Weekly Schedule</h4>
        {dayNames.map(day => (
          <div key={day} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-20">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={availability.regularHours[day].isWorking}
                  onChange={() => handleDayToggle(day)}
                  className="h-4 w-4 text-olive-600 focus:ring-olive-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {dayLabels[day]}
                </span>
              </label>
            </div>
            
            {availability.regularHours[day].isWorking && (
              <>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Start:</label>
                  <input
                    type="time"
                    value={availability.regularHours[day].start}
                    onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">End:</label>
                  <input
                    type="time"
                    value={availability.regularHours[day].end}
                    onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                  />
                </div>
              </>
            )}
            
            {!availability.regularHours[day].isWorking && (
              <span className="text-sm text-gray-500 italic">Day Off</span>
            )}
          </div>
        ))}
      </div>

      {/* Breaks Configuration */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Daily Breaks</h4>
          <Button
            size="sm"
            variant="outline"
            onClick={addBreak}
          >
            Add Break
          </Button>
        </div>
        
        {availability.breaks.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No breaks configured</p>
        ) : (
          availability.breaks.map((breakTime, index) => (
            <div key={index} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={breakTime.name}
                onChange={(e) => handleBreakChange(index, 'name', e.target.value)}
                placeholder="Break name"
                className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-olive-500 focus:border-transparent"
              />
              
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Start:</label>
                <input
                  type="time"
                  value={breakTime.start}
                  onChange={(e) => handleBreakChange(index, 'start', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">End:</label>
                <input
                  type="time"
                  value={breakTime.end}
                  onChange={(e) => handleBreakChange(index, 'end', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              
              <button
                onClick={() => removeBreak(index)}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {/* Booking Settings */}
      <div className="space-y-4 mb-6">
        <h4 className="font-medium text-gray-900">Booking Settings</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default Appointment Duration
            </label>
            <select
              value={availability.slotDuration}
              onChange={(e) => setAvailability(prev => ({
                ...prev,
                slotDuration: parseInt(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buffer Between Appointments
            </label>
            <select
              value={availability.bookingBuffer}
              onChange={(e) => setAvailability(prev => ({
                ...prev,
                bookingBuffer: parseInt(e.target.value)
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
            >
              <option value="0">No buffer</option>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Important:</p>
            <p>Changes to your availability will affect future bookings only. Existing appointments will not be changed.</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          loading={loading}
          disabled={loading}
        >
          Save Availability
        </Button>
      </div>
    </Card>
  )
}
'use client'

import {
  ClockIcon,
  CalendarDaysIcon,
  PauseIcon,
  XMarkIcon,
  PlusIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  SunIcon,
  MoonIcon
} from '@heroicons/react/24/outline'
import { useState, useEffect } from 'react'

export default function ScheduleSetup({ data = {}, updateData, onComplete }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  // Default schedule template
  const defaultSchedule = {
    Monday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
    Tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
    Wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
    Thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00', breaks: [] },
    Friday: { isOpen: true, openTime: '09:00', closeTime: '20:00', breaks: [] },
    Saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00', breaks: [] },
    Sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00', breaks: [] }
  }

  const [schedule, setSchedule] = useState(data.schedule || defaultSchedule)
  const [timeZone, setTimeZone] = useState(data.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [appointmentDuration, setAppointmentDuration] = useState(data.appointmentDuration || 30)
  const [bufferTime, setBufferTime] = useState(data.bufferTime || 0)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [errors, setErrors] = useState({})

  // Schedule templates
  const scheduleTemplates = [
    {
      id: 'traditional',
      name: 'Traditional Barbershop',
      color: 'blue',
      description: 'Mon-Fri 9-6, Sat 9-5, Sun closed',
      schedule: {
        Monday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Friday: { isOpen: true, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00', breaks: [] },
        Sunday: { isOpen: false, openTime: '10:00', closeTime: '16:00', breaks: [] }
      }
    },
    {
      id: 'extended',
      name: 'Extended Hours',
      color: 'purple',
      description: 'Mon-Fri 8-8, Sat-Sun 10-6',
      schedule: {
        Monday: { isOpen: true, openTime: '08:00', closeTime: '20:00', breaks: [{ start: '13:00', end: '14:00' }] },
        Tuesday: { isOpen: true, openTime: '08:00', closeTime: '20:00', breaks: [{ start: '13:00', end: '14:00' }] },
        Wednesday: { isOpen: true, openTime: '08:00', closeTime: '20:00', breaks: [{ start: '13:00', end: '14:00' }] },
        Thursday: { isOpen: true, openTime: '08:00', closeTime: '20:00', breaks: [{ start: '13:00', end: '14:00' }] },
        Friday: { isOpen: true, openTime: '08:00', closeTime: '20:00', breaks: [{ start: '13:00', end: '14:00' }] },
        Saturday: { isOpen: true, openTime: '10:00', closeTime: '18:00', breaks: [] },
        Sunday: { isOpen: true, openTime: '10:00', closeTime: '18:00', breaks: [] }
      }
    },
    {
      id: 'weekend',
      name: 'Weekend Focus',
      color: 'amber',
      description: 'Thu-Fri 12-8, Sat-Sun 9-7',
      schedule: {
        Monday: { isOpen: false, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Tuesday: { isOpen: false, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Wednesday: { isOpen: false, openTime: '09:00', closeTime: '18:00', breaks: [] },
        Thursday: { isOpen: true, openTime: '12:00', closeTime: '20:00', breaks: [] },
        Friday: { isOpen: true, openTime: '12:00', closeTime: '20:00', breaks: [] },
        Saturday: { isOpen: true, openTime: '09:00', closeTime: '19:00', breaks: [] },
        Sunday: { isOpen: true, openTime: '09:00', closeTime: '19:00', breaks: [] }
      }
    }
  ]

  // Time slots for dropdowns (every 15 minutes)
  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }
  const timeSlots = generateTimeSlots()

  // Format time for display
  const formatTime = (time) => {
    const [hour, minute] = time.split(':')
    const h = parseInt(hour)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${displayHour}:${minute} ${ampm}`
  }

  // Calculate total hours
  const calculateTotalHours = () => {
    let totalMinutes = 0
    Object.entries(schedule).forEach(([day, daySchedule]) => {
      if (daySchedule.isOpen) {
        const [openHour, openMin] = daySchedule.openTime.split(':').map(Number)
        const [closeHour, closeMin] = daySchedule.closeTime.split(':').map(Number)
        const dayMinutes = (closeHour * 60 + closeMin) - (openHour * 60 + openMin)
        
        // Subtract break time
        daySchedule.breaks.forEach(breakTime => {
          const [breakStartHour, breakStartMin] = breakTime.start.split(':').map(Number)
          const [breakEndHour, breakEndMin] = breakTime.end.split(':').map(Number)
          const breakMinutes = (breakEndHour * 60 + breakEndMin) - (breakStartHour * 60 + breakStartMin)
          totalMinutes -= breakMinutes
        })
        
        totalMinutes += dayMinutes
      }
    })
    return Math.round(totalMinutes / 60)
  }

  // Toggle day open/closed
  const toggleDay = (day) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen
      }
    }))
  }

  // Update day hours
  const updateDayHours = (day, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }))
    
    // Validate times
    if (field === 'openTime' || field === 'closeTime') {
      validateDaySchedule(day)
    }
  }

  // Add break to day
  const addBreak = (day) => {
    const daySchedule = schedule[day]
    const newBreak = {
      start: '12:00',
      end: '13:00'
    }
    
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: [...prev[day].breaks, newBreak]
      }
    }))
  }

  // Remove break from day
  const removeBreak = (day, breakIndex) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks.filter((_, index) => index !== breakIndex)
      }
    }))
  }

  // Update break time
  const updateBreak = (day, breakIndex, field, value) => {
    setSchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        breaks: prev[day].breaks.map((breakTime, index) =>
          index === breakIndex
            ? { ...breakTime, [field]: value }
            : breakTime
        )
      }
    }))
  }

  // Apply template
  const applyTemplate = (template) => {
    setSchedule(template.schedule)
    setSelectedTemplate(template.id)
  }

  // Copy hours to other days
  const copyToAllWeekdays = (sourceDay) => {
    const sourceDaySchedule = schedule[sourceDay]
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    
    const newSchedule = { ...schedule }
    weekdays.forEach(day => {
      if (day !== sourceDay) {
        newSchedule[day] = { ...sourceDaySchedule }
      }
    })
    
    setSchedule(newSchedule)
  }

  // Validate day schedule
  const validateDaySchedule = (day) => {
    const daySchedule = schedule[day]
    const newErrors = { ...errors }
    
    if (daySchedule.isOpen) {
      const [openHour, openMin] = daySchedule.openTime.split(':').map(Number)
      const [closeHour, closeMin] = daySchedule.closeTime.split(':').map(Number)
      
      if (openHour * 60 + openMin >= closeHour * 60 + closeMin) {
        newErrors[day] = 'Closing time must be after opening time'
      } else {
        delete newErrors[day]
      }
      
      // Validate breaks
      daySchedule.breaks.forEach((breakTime, index) => {
        const [breakStartHour, breakStartMin] = breakTime.start.split(':').map(Number)
        const [breakEndHour, breakEndMin] = breakTime.end.split(':').map(Number)
        
        if (breakStartHour * 60 + breakStartMin >= breakEndHour * 60 + breakEndMin) {
          newErrors[`${day}_break_${index}`] = 'Break end time must be after start time'
        } else {
          delete newErrors[`${day}_break_${index}`]
        }
      })
    }
    
    setErrors(newErrors)
  }

  // Update parent data
  useEffect(() => {
    if (updateData) {
      updateData({
        schedule,
        timeZone,
        appointmentDuration,
        bufferTime
      })
    }
  }, [schedule, timeZone, appointmentDuration, bufferTime])

  // Handle completion
  const handleComplete = () => {
    if (Object.keys(errors).length === 0 && onComplete) {
      onComplete({
        schedule,
        timeZone,
        appointmentDuration,
        bufferTime
      })
    }
  }

  const totalHours = calculateTotalHours()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Business Hours</h3>
        <p className="text-sm text-gray-600 mt-1">
          Set your regular operating hours. You can always adjust these later.
        </p>
      </div>

      {/* Quick Templates */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Quick Templates
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scheduleTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                selectedTemplate === template.id
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="flex items-start">
                <span className="text-2xl mr-3">{template.icon}</span>
                <div>
                  <h4 className="font-medium text-gray-900">{template.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Time Zone
        </label>
        <select
          value={timeZone}
          onChange={(e) => setTimeZone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="America/New_York">Eastern Time (ET)</option>
          <option value="America/Chicago">Central Time (CT)</option>
          <option value="America/Denver">Mountain Time (MT)</option>
          <option value="America/Los_Angeles">Pacific Time (PT)</option>
          <option value="America/Phoenix">Arizona Time</option>
          <option value="Pacific/Honolulu">Hawaii Time</option>
        </select>
      </div>

      {/* Weekly Schedule */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-gray-700">
            Weekly Schedule
          </label>
          <span className="text-sm text-gray-500">
            {totalHours} hours/week
          </span>
        </div>

        {daysOfWeek.map((day) => {
          const daySchedule = schedule[day]
          const dayError = errors[day]
          
          return (
            <div
              key={day}
              className={`bg-white border rounded-lg p-4 ${
                dayError ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center">
                  <button
                    onClick={() => toggleDay(day)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      daySchedule.isOpen ? 'bg-brand-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        daySchedule.isOpen ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`ml-3 font-medium ${
                    daySchedule.isOpen ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {day}
                  </span>
                </div>

                {daySchedule.isOpen && (
                  <button
                    onClick={() => copyToAllWeekdays(day)}
                    className="text-sm text-brand-600 hover:text-brand-700 flex items-center"
                    title="Copy to all weekdays"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                    Copy to weekdays
                  </button>
                )}
              </div>

              {daySchedule.isOpen && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Opens at
                      </label>
                      <select
                        value={daySchedule.openTime}
                        onChange={(e) => updateDayHours(day, 'openTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                      >
                        {timeSlots.map(time => (
                          <option key={time} value={time}>
                            {formatTime(time)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Closes at
                      </label>
                      <select
                        value={daySchedule.closeTime}
                        onChange={(e) => updateDayHours(day, 'closeTime', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                      >
                        {timeSlots.map(time => (
                          <option key={time} value={time}>
                            {formatTime(time)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {dayError && (
                    <p className="text-sm text-red-600 flex items-center">
                      <ExclamationCircleIcon className="h-4 w-4 mr-1" />
                      {dayError}
                    </p>
                  )}

                  {/* Breaks */}
                  {daySchedule.breaks.length > 0 && (
                    <div className="space-y-2">
                      {daySchedule.breaks.map((breakTime, index) => {
                        const breakError = errors[`${day}_break_${index}`]
                        return (
                          <div key={index} className="flex items-center space-x-2">
                            <PauseIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600">Break:</span>
                            <select
                              value={breakTime.start}
                              onChange={(e) => updateBreak(day, index, 'start', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {timeSlots.map(time => (
                                <option key={time} value={time}>
                                  {formatTime(time)}
                                </option>
                              ))}
                            </select>
                            <span className="text-sm text-gray-600">to</span>
                            <select
                              value={breakTime.end}
                              onChange={(e) => updateBreak(day, index, 'end', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {timeSlots.map(time => (
                                <option key={time} value={time}>
                                  {formatTime(time)}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeBreak(day, index)}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Remove break"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                            {breakError && (
                              <span className="text-xs text-red-600">{breakError}</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {daySchedule.breaks.length < 2 && (
                    <button
                      onClick={() => addBreak(day)}
                      className="text-sm text-brand-600 hover:text-brand-700 flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Add break
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Appointment Settings */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Appointment Settings</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Appointment Duration
            </label>
            <select
              value={appointmentDuration}
              onChange={(e) => setAppointmentDuration(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buffer Time Between Appointments
            </label>
            <select
              value={bufferTime}
              onChange={(e) => setBufferTime(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
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

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">
              Schedule Tips
            </h3>
            <ul className="mt-1 text-sm text-blue-700 list-disc list-inside">
              <li>You can override these hours for holidays and special events</li>
              <li>Individual barbers can have their own schedules</li>
              <li>Buffer time helps prevent back-to-back bookings</li>
              <li>Breaks are automatically blocked from booking</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="flex justify-center items-center pt-4">
        <div className="text-sm text-gray-500">
          {Object.entries(schedule).filter(([_, s]) => s.isOpen).length} days open
        </div>
      </div>
    </div>
  )
}
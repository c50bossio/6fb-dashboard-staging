'use client'

import { useState, useEffect } from 'react'
import { 
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

export default function BarberSchedule() {
  const { user } = useAuth()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [availability, setAvailability] = useState({
    monday: { start: '09:00', end: '18:00', enabled: true },
    tuesday: { start: '09:00', end: '18:00', enabled: true },
    wednesday: { start: '09:00', end: '18:00', enabled: true },
    thursday: { start: '09:00', end: '18:00', enabled: true },
    friday: { start: '09:00', end: '19:00', enabled: true },
    saturday: { start: '10:00', end: '17:00', enabled: true },
    sunday: { start: '00:00', end: '00:00', enabled: false }
  })
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('day') // day, week, month

  useEffect(() => {
    loadScheduleData()
  }, [selectedDate])

  const loadScheduleData = async () => {
    try {
      setLoading(true)
      
      // Load appointments for selected date range
      const response = await fetch(`/api/appointments?barber_id=${user?.id || 'demo'}&date=${selectedDate.toISOString()}`)
      const data = await response.json()
      
      if (data.appointments) {
        setAppointments(data.appointments)
      }
    } catch (error) {
      console.error('Failed to load schedule:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAppointmentAction = async (appointmentId, action) => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      })
      
      if (response.ok) {
        // Reload appointments
        loadScheduleData()
      }
    } catch (error) {
      console.error('Failed to update appointment:', error)
    }
  }

  const handleAvailabilityUpdate = async (day, field, value) => {
    const newAvailability = {
      ...availability,
      [day]: {
        ...availability[day],
        [field]: value
      }
    }
    setAvailability(newAvailability)
    
    // Save to backend
    try {
      await fetch('/api/barber/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barber_id: user?.id || 'demo',
          availability: newAvailability
        })
      })
    } catch (error) {
      console.error('Failed to update availability:', error)
    }
  }

  const TimeSlot = ({ time, appointment }) => {
    const isBooked = !!appointment
    const isPast = new Date(`${selectedDate.toDateString()} ${time}`) < new Date()
    
    return (
      <div className={`border rounded-lg p-3 ${
        isBooked ? 'bg-amber-50 border-amber-200' : 
        isPast ? 'bg-gray-50 border-gray-200' : 
        'bg-white border-gray-200 hover:border-amber-300'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-900">{time}</span>
          {isBooked && (
            <span className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
              Booked
            </span>
          )}
        </div>
        {appointment && (
          <div className="mt-2">
            <p className="text-sm font-medium text-gray-900">{appointment.customer_name}</p>
            <p className="text-xs text-gray-600">{appointment.service_name}</p>
            <div className="flex items-center space-x-2 mt-2">
              <button
                onClick={() => handleAppointmentAction(appointment.id, 'completed')}
                className="text-green-600 hover:text-green-800"
                title="Mark as completed"
              >
                <CheckIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleAppointmentAction(appointment.id, 'cancelled')}
                className="text-red-600 hover:text-red-800"
                title="Cancel appointment"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
              <button className="text-olive-600 hover:text-olive-800" title="Contact client">
                <PhoneIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  const generateTimeSlots = () => {
    const slots = []
    const startHour = 9
    const endHour = 18
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        const appointment = appointments.find(apt => apt.start_time === time)
        slots.push({ time, appointment })
      }
    }
    
    return slots
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Schedule</h1>
              <p className="text-sm text-gray-600">Manage your appointments and availability</p>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="day">Day View</option>
                <option value="week">Week View</option>
                <option value="month">Month View</option>
              </select>
              <button className="flex items-center space-x-2 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700">
                <PlusIcon className="h-4 w-4" />
                <span>Block Time</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar & Time Slots */}
          <div className="lg:col-span-2">
            {/* Date Navigation */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setDate(newDate.getDate() - 1)
                    setSelectedDate(newDate)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ←
                </button>
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {appointments.length} appointments scheduled
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newDate = new Date(selectedDate)
                    newDate.setDate(newDate.getDate() + 1)
                    setSelectedDate(newDate)
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  →
                </button>
              </div>
            </div>

            {/* Time Slots Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Slots</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {generateTimeSlots().map(({ time, appointment }) => (
                  <TimeSlot
                    key={time}
                    time={time}
                    appointment={appointment}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Availability Settings */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Availability</h3>
              <div className="space-y-4">
                {Object.entries(availability).map(([day, settings]) => (
                  <div key={day} className="border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700 capitalize">
                        {day}
                      </label>
                      <input
                        type="checkbox"
                        checked={settings.enabled}
                        onChange={(e) => handleAvailabilityUpdate(day, 'enabled', e.target.checked)}
                        className="h-4 w-4 text-amber-700 rounded"
                      />
                    </div>
                    {settings.enabled && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={settings.start}
                          onChange={(e) => handleAvailabilityUpdate(day, 'start', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={settings.end}
                          onChange={(e) => handleAvailabilityUpdate(day, 'end', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-4 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-700">
                Save Availability
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Appointments</span>
                  <span className="text-sm font-medium text-gray-900">
                    {appointments.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Completed</span>
                  <span className="text-sm font-medium text-green-600">
                    {appointments.filter(a => a.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Upcoming</span>
                  <span className="text-sm font-medium text-olive-600">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Cancelled</span>
                  <span className="text-sm font-medium text-red-600">
                    {appointments.filter(a => a.status === 'cancelled').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
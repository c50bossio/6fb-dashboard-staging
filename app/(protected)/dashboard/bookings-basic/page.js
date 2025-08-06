'use client'

import { useState } from 'react'
import { CalendarDaysIcon, PlusIcon, ClockIcon } from '@heroicons/react/24/outline'

export default function BookingsBasicPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState([
    { id: 1, time: '9:00 AM', customer: 'John Doe', service: 'Haircut' },
    { id: 2, time: '10:00 AM', customer: 'Mike Smith', service: 'Beard Trim' },
    { id: 3, time: '2:00 PM', customer: 'David Johnson', service: 'Full Service' }
  ])

  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
  ]

  const handleAddAppointment = (time) => {
    const customerName = prompt('Customer name:')
    if (customerName) {
      const newAppointment = {
        id: Date.now(),
        time,
        customer: customerName,
        service: 'Haircut'
      }
      setAppointments([...appointments, newAppointment])
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Appointment Calendar</h1>
              <p className="text-sm text-gray-600">Simple booking system for your barbershop</p>
            </div>
          </div>
          <div className="text-lg font-medium text-gray-700">
            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6">
        <div className="h-full bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-2 h-full">
            {/* Time Slots */}
            <div className="border-r border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2" />
                Available Time Slots
              </h2>
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {timeSlots.map((time) => {
                  const hasAppointment = appointments.some(apt => apt.time === time)
                  return (
                    <div
                      key={time}
                      className={`p-3 rounded-lg border ${
                        hasAppointment 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer'
                      }`}
                      onClick={() => !hasAppointment && handleAddAppointment(time)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{time}</span>
                        {hasAppointment ? (
                          <span className="text-sm text-red-600">Booked</span>
                        ) : (
                          <PlusIcon className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Appointments */}
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Appointments</h2>
              <div className="space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {appointments.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
                ) : (
                  appointments.map((appointment) => (
                    <div key={appointment.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-900">{appointment.customer}</p>
                          <p className="text-sm text-gray-600">{appointment.service}</p>
                          <p className="text-sm text-blue-600 font-medium mt-1">{appointment.time}</p>
                        </div>
                        <button
                          onClick={() => setAppointments(appointments.filter(a => a.id !== appointment.id))}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-blue-600 text-white px-6 py-3 text-center">
        <p className="text-sm">
          💡 Click on any available time slot to book an appointment
        </p>
      </div>
    </div>
  )
}
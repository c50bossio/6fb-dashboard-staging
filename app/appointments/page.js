'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/SupabaseAuthProvider'
import ProtectedRoute from '../../components/ProtectedRoute'
import { 
  CalendarIcon, 
  PlusIcon, 
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'

// Mock data for demonstration
const mockAppointments = [
  {
    id: 1,
    customer_name: "John Smith",
    customer_phone: "(555) 123-4567",
    customer_email: "john@example.com",
    service: "Haircut & Beard Trim",
    barber: "Marcus Johnson",
    date: "2025-08-06",
    time: "10:00 AM",
    duration: "45 min",
    status: "confirmed",
    price: "$35"
  },
  {
    id: 2,
    customer_name: "Mike Davis",
    customer_phone: "(555) 987-6543",
    customer_email: "mike@example.com",
    service: "Classic Haircut",
    barber: "David Wilson",
    date: "2025-08-06",
    time: "2:30 PM",
    duration: "30 min",
    status: "pending",
    price: "$25"
  },
  {
    id: 3,
    customer_name: "Alex Rodriguez",
    customer_phone: "(555) 456-7890",
    customer_email: "alex@example.com",
    service: "Fade & Shave",
    barber: "Marcus Johnson",
    date: "2025-08-07",
    time: "11:15 AM",
    duration: "60 min",
    status: "confirmed",
    price: "$40"
  }
]

export default function AppointmentsPage() {
  const { user, profile } = useAuth()
  const [appointments, setAppointments] = useState(mockAppointments)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [view, setView] = useState('day') // day, week, month

  const filteredAppointments = appointments.filter(apt => apt.date === selectedDate)

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="md:flex md:items-center md:justify-between">
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                  Appointments
                </h1>
                <p className="mt-2 text-lg text-gray-600">
                  Manage your barbershop appointments and schedule
                </p>
              </div>
              <div className="mt-4 flex md:mt-0 md:ml-4">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  New Appointment
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Calendar/Date Selector */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Date</h3>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Stats</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Today:</span>
                      <span className="font-medium">{filteredAppointments.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Confirmed:</span>
                      <span className="font-medium text-green-600">
                        {filteredAppointments.filter(a => a.status === 'confirmed').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending:</span>
                      <span className="font-medium text-yellow-600">
                        {filteredAppointments.filter(a => a.status === 'pending').length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Appointments List */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Appointments for {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </h3>
                </div>

                {filteredAppointments.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No appointments</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No appointments scheduled for this date.
                    </p>
                    <div className="mt-6">
                      <button
                        type="button"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Schedule Appointment
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredAppointments.map((appointment) => (
                      <div key={appointment.id} className="px-6 py-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                                  <UserIcon className="h-6 w-6 text-gray-600" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {appointment.customer_name}
                                  </h4>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                                    {appointment.status}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <ClockIcon className="h-4 w-4" />
                                    <span>{appointment.time} ({appointment.duration})</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <PhoneIcon className="h-4 w-4" />
                                    <span>{appointment.customer_phone}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex sm:space-x-4">
                                <div className="text-sm text-gray-900">
                                  <strong>Service:</strong> {appointment.service}
                                </div>
                                <div className="text-sm text-gray-900">
                                  <strong>Barber:</strong> {appointment.barber}
                                </div>
                                <div className="text-sm font-medium text-green-600">
                                  {appointment.price}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                              Edit
                            </button>
                            <button className="text-gray-400 hover:text-red-600 text-sm font-medium">
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <CalendarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Full Appointment System Coming Soon
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>We're building a complete appointment booking system with:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Real-time calendar integration</li>
                    <li>Customer self-booking portal</li>
                    <li>SMS and email notifications</li>
                    <li>Recurring appointment scheduling</li>
                    <li>Payment processing integration</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../../lib/supabase/client'
import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
  PhoneIcon,
  ScissorsIcon,
  UserIcon
} from '@heroicons/react/24/outline'

// Service types with duration
const SERVICES = [
  { id: 'haircut', name: 'Haircut', duration: 30, price: 35, color: 'blue' },
  { id: 'beard', name: 'Beard Trim', duration: 20, price: 20, color: 'green' },
  { id: 'full', name: 'Full Service', duration: 50, price: 50, color: 'purple' },
  { id: 'kids', name: 'Kids Cut', duration: 20, price: 25, color: 'orange' }
]

// Sample barbers
const BARBERS = [
  { id: '1', name: 'Marcus', specialty: 'Modern Cuts', color: 'bg-blue-100' },
  { id: '2', name: 'David', specialty: 'Classic Styles', color: 'bg-green-100' },
  { id: '3', name: 'Mike', specialty: 'Beard Specialist', color: 'bg-purple-100' }
]

export default function BookingsEnhancedPage() {
  const [viewType, setViewType] = useState('day') // day, week, month
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingSlot, setBookingSlot] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const { user } = useAuth()
  const supabase = createClient()

  // Generate time slots
  const generateTimeSlots = () => {
    const slots = []
    const startHour = 9
    const endHour = 18
    
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        slots.push(time)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  // Load appointments from database
  useEffect(() => {
    loadAppointments()
  }, [currentDate, viewType])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      
      // Calculate date range based on view type
      const startDate = new Date(currentDate)
      const endDate = new Date(currentDate)
      
      if (viewType === 'day') {
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
      } else if (viewType === 'week') {
        const day = startDate.getDay()
        startDate.setDate(startDate.getDate() - day)
        endDate.setDate(startDate.getDate() + 6)
      } else if (viewType === 'month') {
        startDate.setDate(1)
        endDate.setMonth(endDate.getMonth() + 1)
        endDate.setDate(0)
      }

      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time')

      if (error) throw error
      
      setAppointments(data || [])
    } catch (error) {
      console.error('Error loading appointments:', error)
      // Use demo data if database fails
      setAppointments([
        {
          id: 1,
          barber_id: '1',
          customer_name: 'John Doe',
          customer_phone: '555-0123',
          service_type: 'haircut',
          start_time: new Date().toISOString(),
          status: 'confirmed',
          notes: 'Regular customer'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Handle appointment creation
  const handleCreateAppointment = async (appointmentData) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          shop_id: user?.profile?.shop_id || 'demo',
          barber_id: appointmentData.barberId,
          customer_name: appointmentData.customerName,
          customer_phone: appointmentData.customerPhone,
          service_type: appointmentData.serviceType,
          start_time: appointmentData.startTime,
          end_time: appointmentData.endTime,
          status: 'confirmed',
          notes: appointmentData.notes
        })
        .select()
        .single()

      if (error) throw error
      
      // Add to local state
      setAppointments([...appointments, data])
      setShowBookingModal(false)
      setBookingSlot(null)
    } catch (error) {
      console.error('Error creating appointment:', error)
      // Add to local state anyway for demo
      const newAppointment = {
        id: Date.now(),
        ...appointmentData,
        status: 'confirmed'
      }
      setAppointments([...appointments, newAppointment])
      setShowBookingModal(false)
      setBookingSlot(null)
    }
  }

  // Check if slot is available
  const isSlotAvailable = (barberId, time, date = currentDate) => {
    const slotStart = new Date(date)
    const [hours, minutes] = time.split(':')
    slotStart.setHours(parseInt(hours), parseInt(minutes), 0, 0)
    
    return !appointments.some(apt => {
      if (apt.barber_id !== barberId) return false
      const aptStart = new Date(apt.start_time)
      return aptStart.getTime() === slotStart.getTime()
    })
  }

  // Navigation handlers
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (viewType === 'day') {
      newDate.setDate(newDate.getDate() + direction)
    } else if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    } else if (viewType === 'month') {
      newDate.setMonth(newDate.getMonth() + direction)
    }
    setCurrentDate(newDate)
  }

  // Booking Modal Component
  const BookingModal = () => {
    const [formData, setFormData] = useState({
      customerName: '',
      customerPhone: '',
      serviceType: 'haircut',
      notes: ''
    })

    const selectedService = SERVICES.find(s => s.id === formData.serviceType)

    const handleSubmit = (e) => {
      e.preventDefault()
      
      const startTime = new Date(currentDate)
      const [hours, minutes] = bookingSlot.time.split(':')
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration)
      
      handleCreateAppointment({
        barberId: bookingSlot.barberId,
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        serviceType: formData.serviceType,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        notes: formData.notes
      })
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Book Appointment</h3>
            <button
              onClick={() => setShowBookingModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Customer Name
              </label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <PhoneIcon className="inline h-4 w-4 mr-1" />
                Phone Number
              </label>
              <input
                type="tel"
                required
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <ScissorsIcon className="inline h-4 w-4 mr-1" />
                Service
              </label>
              <select
                value={formData.serviceType}
                onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SERVICES.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.duration}min - ${service.price}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="bg-gray-50 p-3 rounded-md">
              <p className="text-sm text-gray-600">
                <strong>Barber:</strong> {BARBERS.find(b => b.id === bookingSlot?.barberId)?.name}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Time:</strong> {bookingSlot?.time}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Duration:</strong> {selectedService.duration} minutes
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Book Appointment
              </button>
              <button
                type="button"
                onClick={() => setShowBookingModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Enhanced Booking Calendar</h1>
              <p className="text-sm text-gray-600">Multi-barber scheduling with service selection</p>
            </div>
          </div>
          
          {/* View Type Selector */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewType('day')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                viewType === 'day' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewType('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                viewType === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewType('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                viewType === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => navigateDate(-1)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-medium text-gray-900">
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Barber Headers */}
          <div className="grid grid-cols-4 border-b border-gray-200">
            <div className="p-4 text-sm font-medium text-gray-600">
              <ClockIcon className="h-5 w-5 inline mr-2" />
              Time
            </div>
            {BARBERS.map(barber => (
              <div key={barber.id} className={`p-4 text-center ${barber.color}`}>
                <div className="font-semibold text-gray-900">{barber.name}</div>
                <div className="text-sm text-gray-600">{barber.specialty}</div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
            {timeSlots.map(time => (
              <div key={time} className="grid grid-cols-4 border-b border-gray-100">
                <div className="p-3 text-sm font-medium text-gray-700 bg-gray-50">
                  {time}
                </div>
                {BARBERS.map(barber => {
                  const isAvailable = isSlotAvailable(barber.id, time)
                  const appointment = appointments.find(apt => {
                    const aptTime = new Date(apt.start_time)
                    return apt.barber_id === barber.id && 
                           aptTime.getHours() === parseInt(time.split(':')[0]) &&
                           aptTime.getMinutes() === parseInt(time.split(':')[1])
                  })
                  
                  return (
                    <div
                      key={`${barber.id}-${time}`}
                      className={`p-2 border-l border-gray-100 ${
                        isAvailable 
                          ? 'hover:bg-green-50 cursor-pointer' 
                          : 'bg-gray-50'
                      }`}
                      onClick={() => {
                        if (isAvailable) {
                          setBookingSlot({ barberId: barber.id, time })
                          setShowBookingModal(true)
                        }
                      }}
                    >
                      {appointment ? (
                        <div className={`p-2 rounded text-xs bg-${SERVICES.find(s => s.id === appointment.service_type)?.color || 'gray'}-100`}>
                          <div className="font-medium">{appointment.customer_name}</div>
                          <div className="text-gray-600">
                            {SERVICES.find(s => s.id === appointment.service_type)?.name}
                          </div>
                        </div>
                      ) : isAvailable ? (
                        <div className="h-full flex items-center justify-center">
                          <PlusIcon className="h-4 w-4 text-gray-400" />
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Service Legend */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Services:</span>
            {SERVICES.map(service => (
              <div key={service.id} className="flex items-center space-x-1">
                <div className={`w-3 h-3 rounded bg-${service.color}-200`}></div>
                <span className="text-sm text-gray-600">
                  {service.name} ({service.duration}min)
                </span>
              </div>
            ))}
          </div>
          <div className="text-sm text-gray-500">
            <UserGroupIcon className="h-4 w-4 inline mr-1" />
            {appointments.length} appointments today
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && <BookingModal />}
    </div>
  )
}
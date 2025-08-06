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
  UserIcon,
  CalendarIcon,
  TrashIcon
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
  { id: '1', name: 'Marcus', specialty: 'Modern Cuts', color: 'blue' },
  { id: '2', name: 'David', specialty: 'Classic Styles', color: 'green' },
  { id: '3', name: 'Mike', specialty: 'Beard Specialist', color: 'purple' }
]

// Get service color classes
const getServiceColorClasses = (serviceId) => {
  const colors = {
    haircut: 'bg-blue-100 text-blue-800 border-blue-200',
    beard: 'bg-green-100 text-green-800 border-green-200',
    full: 'bg-purple-100 text-purple-800 border-purple-200',
    kids: 'bg-orange-100 text-orange-800 border-orange-200'
  }
  return colors[serviceId] || 'bg-gray-100 text-gray-800 border-gray-200'
}

export default function BookingsFixedPage() {
  const [viewType, setViewType] = useState('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
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

  // Generate days for week view
  const getWeekDays = () => {
    const days = []
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      days.push(date)
    }
    return days
  }

  // Generate calendar days for month view
  const getMonthDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    
    // Add previous month's trailing days
    const startDay = firstDay.getDay()
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }
    
    // Add current month's days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i)
      days.push({ date, isCurrentMonth: true })
    }
    
    // Add next month's leading days
    const remainingDays = 42 - days.length // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i)
      days.push({ date, isCurrentMonth: false })
    }
    
    return days
  }

  // Load appointments
  useEffect(() => {
    loadAppointments()
  }, [currentDate, viewType])

  const loadAppointments = async () => {
    // Use demo data for now
    const demoAppointments = [
      {
        id: 1,
        barber_id: '1',
        customer_name: 'John Doe',
        customer_phone: '555-0123',
        service_type: 'haircut',
        start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 10, 0).toISOString(),
        status: 'confirmed',
        notes: 'Regular customer'
      },
      {
        id: 2,
        barber_id: '2',
        customer_name: 'Mike Smith',
        customer_phone: '555-0124',
        service_type: 'beard',
        start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 14, 30).toISOString(),
        status: 'confirmed',
        notes: ''
      }
    ]
    setAppointments(demoAppointments)
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

  // Get appointments for a specific day
  const getDayAppointments = (date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === date.toDateString()
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

  // Handle appointment creation
  const handleCreateAppointment = (appointmentData) => {
    const newAppointment = {
      id: Date.now(),
      ...appointmentData,
      status: 'confirmed'
    }
    setAppointments([...appointments, newAppointment])
    setShowBookingModal(false)
    setBookingSlot(null)
  }

  // Handle appointment deletion
  const handleDeleteAppointment = (appointmentId) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      setAppointments(appointments.filter(apt => apt.id !== appointmentId))
    }
  }

  // Format date for display
  const formatDateDisplay = () => {
    if (viewType === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } else if (viewType === 'week') {
      const weekDays = getWeekDays()
      const start = weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const end = weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      return `${start} - ${end}`
    } else {
      return currentDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      })
    }
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
      
      const startTime = new Date(bookingSlot.date || currentDate)
      const [hours, minutes] = bookingSlot.time.split(':')
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration)
      
      handleCreateAppointment({
        barber_id: bookingSlot.barberId,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        service_type: formData.serviceType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
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
                <strong>Date:</strong> {(bookingSlot?.date || currentDate).toLocaleDateString()}
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

  // Render different views
  const renderDayView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Barber Headers */}
      <div className="grid grid-cols-4 border-b border-gray-200">
        <div className="p-4 text-sm font-medium text-gray-600">
          <ClockIcon className="h-5 w-5 inline mr-2" />
          Time
        </div>
        {BARBERS.map(barber => (
          <div key={barber.id} className={`p-4 text-center bg-${barber.color}-50`}>
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
                      : ''
                  }`}
                  onClick={() => {
                    if (isAvailable) {
                      setBookingSlot({ barberId: barber.id, time, date: currentDate })
                      setShowBookingModal(true)
                    }
                  }}
                >
                  {appointment ? (
                    <div className={`p-2 rounded text-xs border ${getServiceColorClasses(appointment.service_type)}`}>
                      <div className="font-medium">{appointment.customer_name}</div>
                      <div className="text-gray-600">
                        {SERVICES.find(s => s.id === appointment.service_type)?.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAppointment(appointment.id)
                        }}
                        className="mt-1 text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
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
  )

  const renderWeekView = () => {
    const weekDays = getWeekDays()
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="p-3 text-left text-sm font-medium text-gray-600">
                <UserGroupIcon className="h-5 w-5 inline mr-2" />
                Barber
              </th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className="p-3 text-center text-sm font-medium text-gray-600">
                  <div>{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className="text-lg">{day.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BARBERS.map(barber => (
              <tr key={barber.id} className="border-b border-gray-100">
                <td className={`p-3 font-medium text-gray-900 bg-${barber.color}-50`}>
                  {barber.name}
                </td>
                {weekDays.map(day => {
                  const dayAppointments = getDayAppointments(day).filter(apt => apt.barber_id === barber.id)
                  
                  return (
                    <td 
                      key={`${barber.id}-${day.toISOString()}`}
                      className="p-3 text-center align-top border-l border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setCurrentDate(day)
                        setViewType('day')
                      }}
                    >
                      <div className="space-y-1">
                        {dayAppointments.length > 0 ? (
                          <div className="text-xs">
                            <span className="font-medium">{dayAppointments.length}</span> bookings
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400">Available</div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const renderMonthView = () => {
    const monthDays = getMonthDays()
    const weeks = []
    for (let i = 0; i < monthDays.length; i += 7) {
      weeks.push(monthDays.slice(i, i + 7))
    }
    
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-gray-100">
            {week.map(({ date, isCurrentMonth }) => {
              const dayAppointments = getDayAppointments(date)
              const isToday = date.toDateString() === new Date().toDateString()
              
              return (
                <div
                  key={date.toISOString()}
                  className={`p-3 min-h-[100px] border-r border-gray-100 cursor-pointer ${
                    isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                  } ${isToday ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    setCurrentDate(date)
                    setViewType('day')
                  }}
                >
                  <div className={`text-sm font-medium ${
                    isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {date.getDate()}
                  </div>
                  {dayAppointments.length > 0 && (
                    <div className="mt-1 text-xs text-blue-600">
                      {dayAppointments.length} appointments
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
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
              <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
              <p className="text-sm text-gray-600">Manage appointments across all barbers</p>
            </div>
          </div>
          
          {/* View Type Selector */}
          <div className="flex items-center space-x-2">
            {['day', 'week', 'month'].map(view => (
              <button
                key={view}
                onClick={() => setViewType(view)}
                className={`px-4 py-2 rounded-md text-sm font-medium capitalize ${
                  viewType === view 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {view}
              </button>
            ))}
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
            {formatDateDisplay()}
          </h2>
          <button
            onClick={() => navigateDate(1)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Calendar View */}
      <div className="flex-1 p-6 overflow-auto">
        {viewType === 'day' && renderDayView()}
        {viewType === 'week' && renderWeekView()}
        {viewType === 'month' && renderMonthView()}
      </div>

      {/* Service Legend */}
      <div className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Services:</span>
            {SERVICES.map(service => (
              <div key={service.id} className="flex items-center space-x-1">
                <div className={`w-3 h-3 rounded ${getServiceColorClasses(service.id).split(' ')[0]}`}></div>
                <span className="text-sm text-gray-600">
                  {service.name} ({service.duration}min)
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            <CalendarIcon className="h-4 w-4 inline mr-1" />
            Today
          </button>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && <BookingModal />}
    </div>
  )
}
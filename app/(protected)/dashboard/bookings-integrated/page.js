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
  TrashIcon,
  MagnifyingGlassIcon,
  StarIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as ClockOutlineIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'

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

// Customer segments
const SEGMENTS = {
  vip: { name: 'VIP', color: 'purple', minVisits: 10 },
  regular: { name: 'Regular', color: 'blue', minVisits: 5 },
  new: { name: 'New', color: 'green', minVisits: 0 },
  inactive: { name: 'Inactive', color: 'gray', daysInactive: 60 }
}

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

export default function BookingsIntegratedPage() {
  const [viewType, setViewType] = useState('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [customers, setCustomers] = useState([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookingSlot, setBookingSlot] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [customerSearch, setCustomerSearch] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    todayTotal: 0,
    todayCompleted: 0,
    todayRevenue: 0,
    weekRevenue: 0
  })
  
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

  // Load customers and appointments
  useEffect(() => {
    loadCustomers()
    loadAppointments()
  }, [currentDate, viewType])

  const loadCustomers = async () => {
    // Demo customers with appointment history
    const demoCustomers = [
      {
        id: 1,
        name: 'John Smith',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        total_visits: 12,
        last_visit: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        total_spent: 480,
        preferred_contact: 'email',
        preferred_service: 'haircut',
        preferred_barber: '1',
        notes: 'Prefers morning appointments, asks for Marcus',
        rating: 5,
        created_at: '2024-03-15'
      },
      {
        id: 2,
        name: 'Sarah Johnson',
        email: 'sarah@example.com',
        phone: '+1 (555) 234-5678',
        total_visits: 6,
        last_visit: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        total_spent: 240,
        preferred_contact: 'sms',
        preferred_service: 'full',
        preferred_barber: '2',
        notes: 'Likes beard trim with haircut',
        rating: 4,
        created_at: '2024-06-20'
      },
      {
        id: 3,
        name: 'Mike Wilson',
        email: 'mike@example.com',
        phone: '+1 (555) 345-6789',
        total_visits: 15,
        last_visit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        total_spent: 750,
        preferred_contact: 'phone',
        preferred_service: 'full',
        preferred_barber: '1',
        notes: 'VIP customer, monthly full service',
        rating: 5,
        created_at: '2023-12-10'
      },
      {
        id: 4,
        name: 'Emily Davis',
        email: 'emily@example.com',
        phone: '+1 (555) 456-7890',
        total_visits: 3,
        last_visit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        total_spent: 105,
        preferred_contact: 'email',
        preferred_service: 'haircut',
        preferred_barber: '3',
        notes: 'New customer, referred by John Smith',
        rating: 4,
        created_at: '2024-11-01'
      }
    ]

    // Add segment to each customer
    const customersWithSegments = demoCustomers.map(customer => ({
      ...customer,
      segment: getCustomerSegment(customer)
    }))

    setCustomers(customersWithSegments)
  }

  const getCustomerSegment = (customer) => {
    const daysSinceLastVisit = Math.floor((new Date() - new Date(customer.last_visit)) / (1000 * 60 * 60 * 24))
    
    if (daysSinceLastVisit > SEGMENTS.inactive.daysInactive) {
      return 'inactive'
    } else if (customer.total_visits >= SEGMENTS.vip.minVisits) {
      return 'vip'
    } else if (customer.total_visits >= SEGMENTS.regular.minVisits) {
      return 'regular'
    } else {
      return 'new'
    }
  }

  const loadAppointments = async () => {
    // Enhanced demo appointments with customer details
    const demoAppointments = [
      {
        id: 1,
        barber_id: '1',
        customer_id: 1,
        customer_name: 'John Smith',
        customer_phone: '+1 (555) 123-4567',
        customer_email: 'john@example.com',
        service_type: 'haircut',
        start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 10, 0).toISOString(),
        status: 'confirmed',
        notes: 'Regular customer - prefers #3 guard on sides',
        price: 35,
        reminder_sent: true
      },
      {
        id: 2,
        barber_id: '2',
        customer_id: 2,
        customer_name: 'Sarah Johnson',
        customer_phone: '+1 (555) 234-5678',
        customer_email: 'sarah@example.com',
        service_type: 'full',
        start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 14, 30).toISOString(),
        status: 'confirmed',
        notes: 'Full service with beard trim',
        price: 50,
        reminder_sent: false
      },
      {
        id: 3,
        barber_id: '1',
        customer_id: 3,
        customer_name: 'Mike Wilson',
        customer_phone: '+1 (555) 345-6789',
        customer_email: 'mike@example.com',
        service_type: 'full',
        start_time: new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 11, 0).toISOString(),
        status: 'completed',
        notes: 'VIP customer - monthly appointment',
        price: 50,
        reminder_sent: true
      }
    ]
    
    setAppointments(demoAppointments)
    calculateStats(demoAppointments)
  }

  const calculateStats = (appointmentList) => {
    const today = new Date()
    const todayAppointments = appointmentList.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === today.toDateString()
    })

    const todayCompleted = todayAppointments.filter(apt => apt.status === 'completed').length
    const todayRevenue = todayAppointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    // Calculate week revenue
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const weekRevenue = appointmentList
      .filter(apt => {
        const aptDate = new Date(apt.start_time)
        return aptDate >= weekStart && apt.status === 'completed'
      })
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    setStats({
      todayTotal: todayAppointments.length,
      todayCompleted,
      todayRevenue,
      weekRevenue
    })
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

  // Get week days
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

  // Navigation handlers
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (viewType === 'day') {
      newDate.setDate(newDate.getDate() + direction)
    } else if (viewType === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7))
    }
    setCurrentDate(newDate)
  }

  // Handle appointment creation
  const handleCreateAppointment = (appointmentData) => {
    const newAppointment = {
      id: Date.now(),
      ...appointmentData,
      status: 'confirmed',
      reminder_sent: false
    }
    
    const updatedAppointments = [...appointments, newAppointment]
    setAppointments(updatedAppointments)
    calculateStats(updatedAppointments)
    
    // Update customer stats
    if (appointmentData.customer_id) {
      const updatedCustomers = customers.map(c => {
        if (c.id === appointmentData.customer_id) {
          return {
            ...c,
            total_visits: c.total_visits + 1,
            last_visit: appointmentData.start_time,
            total_spent: c.total_spent + (appointmentData.price || 0)
          }
        }
        return c
      })
      setCustomers(updatedCustomers)
    }
    
    setShowBookingModal(false)
    setBookingSlot(null)
    setSelectedCustomer(null)
  }

  // Handle appointment status update
  const handleUpdateAppointmentStatus = (appointmentId, newStatus) => {
    const updatedAppointments = appointments.map(apt => 
      apt.id === appointmentId ? { ...apt, status: newStatus } : apt
    )
    setAppointments(updatedAppointments)
    calculateStats(updatedAppointments)
  }

  // Handle appointment deletion
  const handleDeleteAppointment = (appointmentId) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      const updatedAppointments = appointments.filter(apt => apt.id !== appointmentId)
      setAppointments(updatedAppointments)
      calculateStats(updatedAppointments)
    }
  }

  // Send appointment reminder
  const handleSendReminder = (appointment) => {
    const updatedAppointments = appointments.map(apt =>
      apt.id === appointment.id ? { ...apt, reminder_sent: true } : apt
    )
    setAppointments(updatedAppointments)
    alert(`Reminder sent to ${appointment.customer_name} via ${customers.find(c => c.id === appointment.customer_id)?.preferred_contact || 'email'}`)
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
    }
  }

  // Enhanced Booking Modal with Customer Integration
  const BookingModal = () => {
    const [formData, setFormData] = useState({
      customerName: selectedCustomer?.name || '',
      customerPhone: selectedCustomer?.phone || '',
      customerEmail: selectedCustomer?.email || '',
      serviceType: selectedCustomer?.preferred_service || 'haircut',
      notes: ''
    })

    const selectedService = SERVICES.find(s => s.id === formData.serviceType)
    const filteredCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.phone.includes(customerSearch)
    )

    const handleSubmit = (e) => {
      e.preventDefault()
      
      const startTime = new Date(bookingSlot.date || currentDate)
      const [hours, minutes] = bookingSlot.time.split(':')
      startTime.setHours(parseInt(hours), parseInt(minutes), 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + selectedService.duration)
      
      handleCreateAppointment({
        barber_id: bookingSlot.barberId,
        customer_id: selectedCustomer?.id || null,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail,
        service_type: formData.serviceType,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        notes: formData.notes,
        price: selectedService.price
      })
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Book Appointment</h3>
            <button
              onClick={() => {
                setShowBookingModal(false)
                setSelectedCustomer(null)
                setCustomerSearch('')
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="inline h-4 w-4 mr-1" />
                Customer Search
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value)
                    setShowCustomerDropdown(true)
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder="Search existing customer or enter new details"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              
              {/* Customer Dropdown */}
              {showCustomerDropdown && customerSearch && filteredCustomers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200">
                  {filteredCustomers.slice(0, 5).map(customer => (
                    <div
                      key={customer.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                      onClick={() => {
                        setSelectedCustomer(customer)
                        setFormData({
                          customerName: customer.name,
                          customerPhone: customer.phone,
                          customerEmail: customer.email,
                          serviceType: customer.preferred_service || formData.serviceType,
                          notes: customer.notes || ''
                        })
                        setCustomerSearch(customer.name)
                        setShowCustomerDropdown(false)
                        
                        // Auto-select preferred barber if available
                        if (customer.preferred_barber === bookingSlot.barberId) {
                          // Barber matches preference
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-sm text-gray-600">{customer.email}</div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex px-2 py-1 text-xs rounded-full bg-${SEGMENTS[customer.segment].color}-100 text-${SEGMENTS[customer.segment].color}-800`}>
                            {SEGMENTS[customer.segment].name}
                          </div>
                          <div className="text-sm text-gray-600">{customer.total_visits} visits</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Customer Info */}
            {selectedCustomer && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">Customer Information</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setCustomerSearch('')
                      setFormData({
                        customerName: '',
                        customerPhone: '',
                        customerEmail: '',
                        serviceType: 'haircut',
                        notes: ''
                      })
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-600">Total Visits:</span> {selectedCustomer.total_visits}
                  </div>
                  <div>
                    <span className="text-gray-600">Total Spent:</span> ${selectedCustomer.total_spent}
                  </div>
                  <div>
                    <span className="text-gray-600">Last Visit:</span> {new Date(selectedCustomer.last_visit).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-gray-600">Preferred Contact:</span> {selectedCustomer.preferred_contact}
                  </div>
                </div>
                {selectedCustomer.notes && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Notes:</span> {selectedCustomer.notes}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <EnvelopeIcon className="inline h-4 w-4 mr-1" />
                Email (Optional)
              </label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
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
                placeholder="Special requests, preferences, etc."
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
              <p className="text-sm text-gray-600 font-medium">
                <strong>Price:</strong> ${selectedService.price}
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
                onClick={() => {
                  setShowBookingModal(false)
                  setSelectedCustomer(null)
                  setCustomerSearch('')
                }}
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

  // Enhanced appointment display with customer details
  const AppointmentCard = ({ appointment }) => {
    const customer = customers.find(c => c.id === appointment.customer_id)
    const service = SERVICES.find(s => s.id === appointment.service_type)
    
    return (
      <div className={`p-2 rounded text-xs border ${getServiceColorClasses(appointment.service_type)}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium">{appointment.customer_name}</div>
          {customer && customer.segment === 'vip' && (
            <StarIconSolid className="h-3 w-3 text-yellow-500" />
          )}
        </div>
        <div className="text-gray-600">{service?.name}</div>
        {appointment.customer_phone && (
          <div className="text-gray-500 flex items-center mt-1">
            <PhoneIcon className="h-3 w-3 mr-1" />
            {appointment.customer_phone}
          </div>
        )}
        {appointment.notes && (
          <div className="text-gray-500 italic mt-1">{appointment.notes}</div>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-1">
            {appointment.status === 'completed' && (
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
            )}
            {appointment.status === 'cancelled' && (
              <XCircleIcon className="h-4 w-4 text-red-600" />
            )}
            {appointment.status === 'no-show' && (
              <XCircleIcon className="h-4 w-4 text-orange-600" />
            )}
            {!appointment.reminder_sent && appointment.status === 'confirmed' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSendReminder(appointment)
                }}
                className="text-blue-600 hover:text-blue-800"
                title="Send reminder"
              >
                <BellIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center space-x-1">
            {appointment.status === 'confirmed' && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdateAppointmentStatus(appointment.id, 'completed')
                  }}
                  className="text-green-600 hover:text-green-800"
                  title="Mark as completed"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleUpdateAppointmentStatus(appointment.id, 'no-show')
                  }}
                  className="text-orange-600 hover:text-orange-800"
                  title="Mark as no-show"
                >
                  <XCircleIcon className="h-4 w-4" />
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteAppointment(appointment.id)
              }}
              className="text-red-600 hover:text-red-800"
              title="Cancel appointment"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render day view with enhanced appointment cards
  const renderDayView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Stats Cards */}
      <div className="lg:col-span-4 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayTotal}</p>
            </div>
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todayCompleted}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Today's Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.todayRevenue}</p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Week Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.weekRevenue}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="lg:col-span-4 bg-white rounded-lg shadow-sm border border-gray-200">
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
        <div className="max-h-[calc(100vh-500px)] overflow-y-auto">
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
                      <AppointmentCard appointment={appointment} />
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
                  const dayRevenue = dayAppointments
                    .filter(apt => apt.status === 'completed')
                    .reduce((sum, apt) => sum + (apt.price || 0), 0)
                  
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
                          <>
                            <div className="text-xs">
                              <span className="font-medium">{dayAppointments.length}</span> bookings
                            </div>
                            {dayRevenue > 0 && (
                              <div className="text-xs text-green-600">
                                ${dayRevenue}
                              </div>
                            )}
                          </>
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Smart Booking System</h1>
              <p className="text-sm text-gray-600">Integrated with customer management</p>
            </div>
          </div>
          
          {/* View Type Selector */}
          <div className="flex items-center space-x-2">
            {['day', 'week'].map(view => (
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
                  {service.name} ({service.duration}min - ${service.price})
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
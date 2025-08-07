'use client'

import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { 
  CalendarDaysIcon,
  UserGroupIcon,
  SparklesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BellIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  ArrowPathIcon,
  ChatBubbleLeftIcon,
  DevicePhoneMobileIcon,
  WifiIcon,
  ShieldCheckIcon,
  Bars3Icon,
  XMarkIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { useState, useEffect, useRef } from 'react'

import { useAuth } from '../../../../components/SupabaseAuthProvider'
import { createClient } from '../../../../lib/supabase/client'

// Service types
const SERVICES = [
  { id: 'haircut', name: 'Haircut', duration: 30, price: 35, color: '#3B82F6' },
  { id: 'beard', name: 'Beard Trim', duration: 20, price: 20, color: '#10B981' },
  { id: 'full', name: 'Full Service', duration: 50, price: 50, color: '#8B5CF6' },
  { id: 'kids', name: 'Kids Cut', duration: 20, price: 25, color: '#F59E0B' }
]

// Barbers
const BARBERS = [
  { id: '1', name: 'Marcus', title: 'Modern Cuts Specialist' },
  { id: '2', name: 'David', title: 'Classic Styles Expert' },
  { id: '3', name: 'Mike', title: 'Beard Specialist' }
]

export default function BookingsMobilePage() {
  const calendarRef = useRef(null)
  const [events, setEvents] = useState([])
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedBarber, setSelectedBarber] = useState('1')
  const [currentView, setCurrentView] = useState('timeGridDay')
  const [isMobile, setIsMobile] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false)
  const [confirmationStatus, setConfirmationStatus] = useState(null)
  const [realtimeStats, setRealtimeStats] = useState({
    availableToday: 0,
    utilization: 0,
    nextAvailable: null,
    conflictsPrevented: 0
  })
  
  const { user } = useAuth()
  const supabase = createClient()

  // Detect mobile and set appropriate view
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      
      // Set mobile-appropriate calendar view
      if (mobile && currentView !== 'listWeek') {
        setCurrentView('listWeek')
      } else if (!mobile && currentView === 'listWeek') {
        setCurrentView('timeGridDay')
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [currentView])

  // Load events and start real-time updates
  useEffect(() => {
    loadEvents()
    checkRealtimeAvailability()
    
    // Set up real-time subscription
    const subscription = supabase
      .channel('bookings-mobile')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'bookings' 
      }, handleRealtimeUpdate)
      .subscribe()
    
    // Check availability every 30 seconds
    const interval = setInterval(checkRealtimeAvailability, 30000)
    
    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [selectedBarber])

  const loadEvents = async () => {
    // Demo events with real-time status
    const demoEvents = [
      {
        id: '1',
        title: 'John Smith - Haircut',
        start: new Date(new Date().setHours(10, 0, 0, 0)),
        end: new Date(new Date().setHours(10, 30, 0, 0)),
        backgroundColor: '#3B82F6',
        barberId: '1',
        extendedProps: {
          customerName: 'John Smith',
          customerPhone: '+1 (555) 123-4567',
          service: 'haircut',
          reminderSent: true,
          confirmationSent: true,
          status: 'confirmed'
        }
      },
      {
        id: '2',
        title: 'Sarah Johnson - Full Service',
        start: new Date(new Date().setHours(14, 30, 0, 0)),
        end: new Date(new Date().setHours(15, 20, 0, 0)),
        backgroundColor: '#8B5CF6',
        barberId: '2',
        extendedProps: {
          customerName: 'Sarah Johnson',
          customerPhone: '+1 (555) 234-5678',
          service: 'full',
          reminderSent: false,
          confirmationSent: true,
          status: 'confirmed'
        }
      }
    ]
    
    const filteredEvents = demoEvents.filter(event => event.barberId === selectedBarber)
    setEvents(filteredEvents)
  }

  const checkRealtimeAvailability = async () => {
    // Simulate checking real-time availability
    const today = new Date()
    const availableCount = Math.floor(Math.random() * 10) + 5
    const utilization = Math.floor(Math.random() * 30) + 60
    
    setRealtimeStats({
      availableToday: availableCount,
      utilization: utilization,
      nextAvailable: new Date(today.getTime() + (Math.random() * 4 + 1) * 60 * 60 * 1000),
      conflictsPrevented: Math.floor(Math.random() * 5) + 1
    })
  }

  const handleRealtimeUpdate = (payload) => {
    console.log('Real-time update:', payload)
    
    // Update events based on real-time changes
    if (payload.eventType === 'INSERT') {
      showNotification('New booking added!', 'info')
    } else if (payload.eventType === 'DELETE') {
      setEvents(prev => prev.filter(e => e.id !== payload.old.id))
    }
    
    // Refresh availability
    checkRealtimeAvailability()
  }

  const checkSlotAvailability = async (startTime, duration) => {
    setIsCheckingAvailability(true)
    
    // Simulate API call to check availability
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Check for conflicts
    const endTime = new Date(startTime.getTime() + duration * 60000)
    const hasConflict = events.some(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      return (
        (startTime >= eventStart && startTime < eventEnd) ||
        (endTime > eventStart && endTime <= eventEnd) ||
        (startTime <= eventStart && endTime >= eventEnd)
      )
    })
    
    setIsCheckingAvailability(false)
    
    if (hasConflict) {
      const alternatives = findAlternativeSlots(startTime, duration)
      return {
        available: false,
        reason: 'Time slot already booked',
        alternatives
      }
    }
    
    return {
      available: true,
      reason: null,
      alternatives: []
    }
  }

  const findAlternativeSlots = (preferredTime, duration) => {
    const alternatives = []
    const baseTime = new Date(preferredTime)
    
    // Check slots before and after
    for (let i = -2; i <= 2; i++) {
      if (i === 0) continue
      
      const altTime = new Date(baseTime.getTime() + i * 30 * 60000)
      const altEnd = new Date(altTime.getTime() + duration * 60000)
      
      // Check if alternative slot is available
      const isAvailable = !events.some(event => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)
        return (
          (altTime >= eventStart && altTime < eventEnd) ||
          (altEnd > eventStart && altEnd <= eventEnd)
        )
      })
      
      if (isAvailable && altTime.getHours() >= 9 && altEnd.getHours() <= 18) {
        alternatives.push({
          time: altTime,
          label: altTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          })
        })
      }
    }
    
    return alternatives.slice(0, 3)
  }

  const handleDateSelect = async (selectInfo) => {
    // Check availability immediately
    const availability = await checkSlotAvailability(
      selectInfo.start,
      30 // default duration
    )
    
    setSelectedDate({
      start: selectInfo.start,
      end: selectInfo.end,
      availability
    })
    setShowBookingModal(true)
    setShowMobileMenu(false)
  }

  const handleEventDrop = async (dropInfo) => {
    const event = dropInfo.event
    const newStart = event.start
    
    // Check new slot availability
    const availability = await checkSlotAvailability(
      newStart,
      (event.end - event.start) / 60000
    )
    
    if (!availability.available) {
      dropInfo.revert()
      showNotification('That time slot is not available. Please choose another time.', 'error')
      return
    }
    
    // Update event
    setEvents(prevEvents => 
      prevEvents.map(e => 
        e.id === event.id 
          ? {
              ...e,
              start: newStart,
              end: new Date(newStart.getTime() + (e.end - e.start))
            }
          : e
      )
    )
    
    showNotification('Appointment rescheduled successfully!', 'success')
  }

  const handleCreateAppointment = async (formData) => {
    const service = SERVICES.find(s => s.id === formData.serviceType)
    const startTime = new Date(selectedDate.start)
    const endTime = new Date(startTime.getTime() + service.duration * 60000)
    
    // Final availability check
    const finalCheck = await checkSlotAvailability(startTime, service.duration)
    if (!finalCheck.available) {
      showNotification('This slot was just booked. Please select another time.', 'error')
      return
    }
    
    const newEvent = {
      id: Date.now().toString(),
      title: `${formData.customerName} - ${service.name}`,
      start: startTime,
      end: endTime,
      backgroundColor: service.color,
      barberId: selectedBarber,
      extendedProps: {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        customerEmail: formData.customerEmail,
        service: formData.serviceType,
        reminderSent: false,
        confirmationSent: false,
        status: 'confirmed'
      }
    }
    
    setEvents([...events, newEvent])
    setShowBookingModal(false)
    
    // Send confirmation
    sendBookingConfirmation(newEvent)
    
    // Schedule reminders
    scheduleReminders(newEvent)
    
    showNotification('Booking confirmed! Confirmation sent via SMS and email.', 'success')
  }

  const sendBookingConfirmation = async (booking) => {
    setConfirmationStatus('sending')
    
    // Simulate sending confirmation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setConfirmationStatus('sent')
    
    // Update event to show confirmation sent
    setEvents(prev => prev.map(e => 
      e.id === booking.id 
        ? { ...e, extendedProps: { ...e.extendedProps, confirmationSent: true } }
        : e
    ))
  }

  const scheduleReminders = async (booking) => {
    // Schedule 24h reminder
    const reminder24h = new Date(booking.start)
    reminder24h.setDate(reminder24h.getDate() - 1)
    
    // Schedule 2h reminder
    const reminder2h = new Date(booking.start)
    reminder2h.setHours(reminder2h.getHours() - 2)
    
    console.log('Reminders scheduled:', {
      '24h': reminder24h,
      '2h': reminder2h
    })
  }

  const showNotification = (message, type = 'info') => {
    // In production, use a proper notification system
    console.log(`[${type.toUpperCase()}] ${message}`)
  }

  // Mobile Stats Component
  const MobileStatsCard = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <WifiIcon className="h-5 w-5 mr-2 text-green-600 animate-pulse" />
          Today's Status
        </h3>
        <button 
          onClick={checkRealtimeAvailability}
          className="text-blue-600 hover:text-blue-800"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-sm text-gray-600">Available</p>
          <p className="text-xl font-bold text-green-600">{realtimeStats.availableToday}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Utilization</p>
          <p className="text-xl font-bold text-blue-600">{realtimeStats.utilization}%</p>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-sm text-gray-600">Next Available</p>
        <p className="text-sm font-medium text-gray-900">
          {realtimeStats.nextAvailable?.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit' 
          })}
        </p>
      </div>
      
      {isCheckingAvailability && (
        <div className="mt-3 flex items-center text-sm text-blue-600">
          <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
          Checking availability...
        </div>
      )}
    </div>
  )

  // Mobile Header Component
  const MobileHeader = () => (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
          >
            {showMobileMenu ? (
              <XMarkIcon className="h-6 w-6" />
            ) : (
              <Bars3Icon className="h-6 w-6" />
            )}
          </button>
          <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Bookings</h1>
        </div>
        
        <button 
          onClick={() => setShowBookingModal(true)}
          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="absolute top-14 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-lg">
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barber</label>
              <select
                value={selectedBarber}
                onChange={(e) => {
                  setSelectedBarber(e.target.value)
                  setShowMobileMenu(false)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BARBERS.map(barber => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name} - {barber.title}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setCurrentView('listWeek')
                    setShowMobileMenu(false)
                  }}
                  className={`flex-1 py-2 px-3 text-sm rounded-md ${
                    currentView === 'listWeek' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  List
                </button>
                <button
                  onClick={() => {
                    setCurrentView('timeGridDay')
                    setShowMobileMenu(false)
                  }}
                  className={`flex-1 py-2 px-3 text-sm rounded-md ${
                    currentView === 'timeGridDay' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Day
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Enhanced Booking Modal for Mobile
  const MobileBookingModal = () => {
    const [formData, setFormData] = useState({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      serviceType: 'haircut',
      enableSMS: true,
      enableEmail: true,
      notes: ''
    })
    const [alternativeSlots, setAlternativeSlots] = useState([])

    useEffect(() => {
      if (selectedDate?.availability && !selectedDate.availability.available) {
        setAlternativeSlots(selectedDate.availability.alternatives)
      }
    }, [selectedDate])

    const handleSubmit = async (e) => {
      e.preventDefault()
      await handleCreateAppointment(formData)
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50 md:items-center md:justify-center">
        <div className="bg-white rounded-t-lg md:rounded-lg p-4 w-full max-h-[90vh] overflow-y-auto md:max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Book Appointment</h3>
            <button onClick={() => setShowBookingModal(false)} className="text-gray-400 hover:text-gray-600">
              <XCircleIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Availability Status */}
          {selectedDate?.availability && (
            <div className={`mb-4 p-3 rounded-lg ${
              selectedDate.availability.available 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-start">
                {selectedDate.availability.available ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-900">Time slot available!</p>
                      <p className="text-sm text-green-700">Reserved for 5 minutes.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-red-900">Time slot not available</p>
                      <p className="text-sm text-red-700">{selectedDate.availability.reason}</p>
                      
                      {alternativeSlots.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-900">Try these times:</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {alternativeSlots.map((slot, idx) => (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedDate({
                                    ...selectedDate,
                                    start: slot.time,
                                    availability: { available: true }
                                  })
                                  setAlternativeSlots([])
                                }}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                              >
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
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

            {/* Reminder Preferences */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Reminders</p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enableSMS}
                    onChange={(e) => setFormData({...formData, enableSMS: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 flex items-center">
                    <DevicePhoneMobileIcon className="h-4 w-4 mr-1" />
                    SMS reminders
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.enableEmail}
                    onChange={(e) => setFormData({...formData, enableEmail: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700 flex items-center">
                    <EnvelopeIcon className="h-4 w-4 mr-1" />
                    Email reminders
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedDate && (
              <div className="bg-gray-50 p-3 rounded-md text-sm">
                <p><strong>Date:</strong> {selectedDate.start.toLocaleDateString()}</p>
                <p><strong>Time:</strong> {selectedDate.start.toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}</p>
                <p><strong>Barber:</strong> {BARBERS.find(b => b.id === selectedBarber)?.name}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <button 
                type="submit" 
                disabled={!selectedDate?.availability?.available}
                className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-medium"
              >
                {confirmationStatus === 'sending' ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Book & Send Confirmation
                  </>
                )}
              </button>
            </div>
            <button 
              type="button" 
              onClick={() => setShowBookingModal(false)} 
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-md hover:bg-gray-200 font-medium"
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Mobile Header */}
      {isMobile && <MobileHeader />}
      
      {/* Desktop Header */}
      {!isMobile && (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mobile-Optimized Booking</h1>
                <p className="text-sm text-gray-600 flex items-center">
                  <ShieldCheckIcon className="h-4 w-4 mr-1" />
                  Real-time availability • Mobile responsive • Touch optimized
                </p>
              </div>
            </div>
            
            {/* Desktop Barber Selector */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {BARBERS.map(barber => (
                  <option key={barber.id} value={barber.id}>
                    {barber.name} - {barber.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`flex-1 ${isMobile ? 'p-4' : 'p-6'} flex flex-col overflow-hidden`}>
        {/* Mobile Stats Card */}
        {isMobile && <MobileStatsCard />}
        
        {/* Desktop Top Stats Bar - Horizontal */}
        {!isMobile && (
          <div className="mb-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Real-time Stats - Horizontal Layout */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <WifiIcon className="h-5 w-5 mr-2 text-green-600 animate-pulse" />
                  Real-time Status
                </h3>
                <button 
                  onClick={checkRealtimeAvailability}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <ArrowPathIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Available Today</p>
                  <p className="text-2xl font-bold text-green-600">{realtimeStats.availableToday}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Utilization</p>
                  <p className="text-2xl font-bold text-blue-600">{realtimeStats.utilization}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Next Available</p>
                  <p className="text-sm font-medium text-gray-900">
                    {realtimeStats.nextAvailable?.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
                {isCheckingAvailability && (
                  <div className="flex items-center text-sm text-blue-600">
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </div>
                )}
              </div>
            </div>
            
            {/* Mobile Features Info - Horizontal */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2" />
                Premium Features Active
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                <div>• Resource scheduling</div>
                <div>• Timeline views</div>
                <div>• Drag & drop</div>
                <div>• Real-time sync</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Calendar Container - Full Width */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4 min-h-0">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
            headerToolbar={{
              left: isMobile ? 'prev,next' : 'prev,next today',
              center: 'title',
              right: isMobile ? 'today' : 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
            }}
            initialView={currentView}
            view={currentView}
            editable={true}
            selectable={true}
            selectMirror={true}
            events={events}
            select={handleDateSelect}
            eventDrop={handleEventDrop}
            slotMinTime="09:00"
            slotMaxTime="18:00"
            slotDuration="00:15:00"
            height="100%"
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5, 6],
              startTime: '09:00',
              endTime: '18:00'
            }}
            eventContent={(eventInfo) => {
              const { extendedProps } = eventInfo.event
              return (
                <div className={`p-2 ${isMobile ? 'text-xs' : 'text-sm'} cursor-move`}>
                  <div className="font-medium truncate">{extendedProps.customerName}</div>
                  <div className="opacity-90 truncate text-xs">{extendedProps.service}</div>
                  <div className="flex items-center mt-1 space-x-1">
                    {extendedProps.confirmationSent && (
                      <CheckCircleIcon className="h-3 w-3 text-green-500" title="Confirmed" />
                    )}
                    {extendedProps.reminderSent && (
                      <BellIcon className="h-3 w-3 text-blue-500" title="Reminder sent" />
                    )}
                  </div>
                </div>
              )
            }}
            // Enhanced display options for more space
            dayMaxEvents={false}
            moreLinkClick="popover"
            eventDisplay="block"
            // Better aspect ratio for full width
            aspectRatio={2.2}
            handleWindowResize={true}
            windowResizeDelay={100}
          />
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && <MobileBookingModal />}
    </div>
  )
}
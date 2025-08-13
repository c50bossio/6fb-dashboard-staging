'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { 
  CalendarIcon, 
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  QrCodeIcon,
  ShareIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import QRCode from 'qrcode'
import { useToast } from '../../../../components/ToastContainer'
import { useCalendarEvents } from '../../../../hooks/useCalendarEvents'
import { getCalendarConfig } from '../../../../components/calendar/CalendarConfig'
const TimezoneService = require('../../../../services/timezone.service')
import RealtimeIndicator from '../../../../components/calendar/RealtimeIndicator'

// Professional calendar component with RRule support
const ProfessionalCalendar = dynamic(
  () => import('../../../../components/calendar/EnhancedProfessionalCalendar'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600"></div>
        <p className="mt-4 text-gray-600">Loading Calendar...</p>
      </div>
    )
  }
)

// Import professional calendar styles
import '../../../../styles/professional-calendar.css'

// Import the appointment modal
const AppointmentBookingModal = dynamic(
  () => import('../../../../components/calendar/AppointmentBookingModal'),
  { ssr: false }
)

// Import the reschedule confirmation modal
const RescheduleConfirmationModal = dynamic(
  () => import('../../../../components/calendar/RescheduleConfirmationModal'),
  { ssr: false }
)

export default function CalendarPageV2() {
  const [mounted, setMounted] = useState(false)
  const [resources, setResources] = useState([])
  const [services, setServices] = useState([])
  const [currentTime, setCurrentTime] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [barbershopId] = useState('shop_001')
  const timezone = TimezoneService.getCurrentTimezone()
  
  const { success, error: showError, info } = useToast()
  
  // Use the new calendar events hook with server-side expansion
  const {
    events,
    loading,
    error,
    fetchEvents,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    convertToRecurring,
    checkConflicts,
    refresh,
    dateRange
  } = useCalendarEvents({
    barberId: null,
    shopId: barbershopId,
    timezone: timezone,
    useServerExpansion: true // Enable server-side expansion for performance
  })
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [pendingReschedule, setPendingReschedule] = useState(null)
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBarber, setFilterBarber] = useState('all')
  const [filterService, setFilterService] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  
  // Get calendar configuration with proper RRule support
  const calendarConfig = useMemo(() => getCalendarConfig(timezone), [timezone])
  
  // Initialize component
  useEffect(() => {
    setMounted(true)
    
    // Set up time display
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    
    updateTime()
    const timeInterval = setInterval(updateTime, 1000)
    
    // Fetch initial data
    fetchBarbers()
    fetchServices()
    
    // Fetch events for current month
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    fetchEvents(start, end)
    
    return () => clearInterval(timeInterval)
  }, [])
  
  // Fetch barbers from API
  const fetchBarbers = async () => {
    try {
      const response = await fetch('/api/calendar/barbers')
      const result = await response.json()
      
      if (response.ok && result.barbers?.length) {
        const resources = result.barbers.map(barber => ({
          id: barber.id,
          title: barber.title || barber.name,
          eventColor: barber.eventColor || barber.color || '#546355',
          ...barber
        }))
        setResources(resources)
      }
    } catch (error) {
      console.error('Error fetching barbers:', error)
    }
  }
  
  // Fetch services from API
  const fetchServices = async () => {
    try {
      const response = await fetch('/api/calendar/services')
      const result = await response.json()
      
      if (response.ok && result.services?.length) {
        setServices(result.services)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }
  
  // Handle calendar date navigation
  const handleDatesSet = useCallback((dateInfo) => {
    console.log('📅 Calendar view changed:', dateInfo)
    fetchEvents(dateInfo.start, dateInfo.end)
  }, [fetchEvents])
  
  // Handle event click
  const handleEventClick = useCallback((clickInfo) => {
    const event = clickInfo.event
    
    console.log('🔍 Event clicked:', {
      id: event.id,
      groupId: event.groupId,
      title: event.title,
      extendedProps: event.extendedProps
    })
    
    setSelectedEvent({
      id: event.groupId || event.id, // Use groupId for recurring series
      title: event.title,
      scheduled_at: event.start,
      end_time: event.end,
      start: event.start,
      barber_id: event.extendedProps.barber_id,
      service_id: event.extendedProps.service_id,
      service: event.extendedProps.service_name,
      client_name: event.extendedProps.customer_name,
      client_phone: event.extendedProps.customer_phone || '',
      client_email: event.extendedProps.customer_email || '',
      duration_minutes: event.extendedProps.service_duration || 60,
      service_price: event.extendedProps.service_price || 0,
      client_notes: event.extendedProps.notes || '',
      status: event.extendedProps.status || 'confirmed',
      isRecurring: event.extendedProps.is_recurring || false,
      recurringPattern: event.extendedProps.recurring_pattern,
      occurrenceDate: event.extendedProps.occurrenceDate,
      seriesId: event.extendedProps.series_id,
      extendedProps: event.extendedProps
    })
    setShowAppointmentModal(true)
  }, [])
  
  // Handle date/time slot selection
  const handleDateSelect = useCallback((selectInfo) => {
    console.log('📅 Slot selected:', selectInfo)
    
    const slotData = {
      start: selectInfo.start,
      end: selectInfo.end,
      barberId: selectInfo.resourceId || selectInfo.resource?.id,
      barberName: selectInfo.resource?.title || resources.find(r => r.id === selectInfo.resourceId)?.title,
      viewType: selectInfo.viewType,
      allDay: selectInfo.allDay
    }
    
    setSelectedSlot(slotData)
    setShowAppointmentModal(true)
  }, [resources])
  
  // Handle appointment save/create
  const handleAppointmentSave = async (appointmentData) => {
    try {
      // Handle deletion
      if (appointmentData?.isDeleted) {
        const deletionOptions = appointmentData.deletionOptions || { deletion_type: 'all' }
        
        await deleteAppointment(appointmentData.id, deletionOptions)
        
        success('Appointment deleted successfully!', {
          title: 'Success',
          duration: 3000
        })
        setShowAppointmentModal(false)
        return
      }
      
      // Handle conversion to recurring
      if (appointmentData?.id && appointmentData?.is_recurring && !appointmentData.wasRecurring) {
        await convertToRecurring(appointmentData.id, appointmentData.recurrence_pattern)
        
        success('Appointment converted to recurring series!', {
          title: 'Success',
          duration: 3000
        })
        setShowAppointmentModal(false)
        return
      }
      
      // Handle update
      if (appointmentData?.id && !appointmentData.isNew) {
        const modificationOptions = appointmentData.modificationOptions || {}
        await updateAppointment(appointmentData.id, appointmentData, modificationOptions)
        
        success('Appointment updated successfully!', {
          title: 'Success',
          duration: 3000
        })
        setShowAppointmentModal(false)
        return
      }
      
      // Handle new appointment creation
      const result = await createAppointment({
        ...appointmentData,
        shop_id: barbershopId,
        timezone: timezone
      })
      
      success('Appointment booked successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)
      
    } catch (error) {
      showError('Failed to save appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    }
  }
  
  // Handle appointment reschedule
  const handleRescheduleConfirm = async (rescheduleData) => {
    try {
      const modificationOptions = {
        modification_type: rescheduleData.modifyAll ? 'all' : 'this_only',
        occurrence_date: rescheduleData.occurrenceDate
      }
      
      await updateAppointment(
        rescheduleData.appointmentId,
        {
          start_time: rescheduleData.newTime.start,
          end_time: rescheduleData.newTime.end,
          barber_id: rescheduleData.newTime.barberId
        },
        modificationOptions
      )
      
      success('Appointment rescheduled successfully!', {
        title: 'Success',
        duration: 3000
      })
      
      setShowRescheduleModal(false)
      setPendingReschedule(null)
      
    } catch (error) {
      showError('Failed to reschedule appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    }
  }
  
  // Handle event drag and drop
  const handleEventDrop = async (dropInfo) => {
    const event = dropInfo.event
    const oldEvent = dropInfo.oldEvent
    
    // Check for conflicts
    const hasConflict = await checkConflicts(
      event.extendedProps.barber_id,
      event.start,
      event.end,
      event.id
    )
    
    if (hasConflict) {
      showError('This time slot has a conflict', {
        title: 'Scheduling Conflict',
        duration: 5000
      })
      dropInfo.revert()
      return
    }
    
    // Prepare reschedule data
    setPendingReschedule({
      appointmentId: event.groupId || event.id,
      oldTime: {
        start: oldEvent.start,
        end: oldEvent.end,
        barberId: oldEvent.extendedProps.barber_id
      },
      newTime: {
        start: event.start,
        end: event.end,
        barberId: event.resourceId || event.extendedProps.barber_id
      },
      customerName: event.extendedProps.customer_name,
      isRecurring: event.extendedProps.is_recurring,
      occurrenceDate: event.extendedProps.occurrenceDate
    })
    
    setShowRescheduleModal(true)
  }
  
  // Generate QR code for booking
  const generateQRCode = useCallback(async (resource) => {
    setSelectedResource(resource)
    
    const baseUrl = window.location.origin
    const bookingUrl = `${baseUrl}/book/${resource.id}?utm_source=qr&utm_medium=calendar`
    
    try {
      const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(qrDataUrl)
      setShowQRModal(true)
    } catch (error) {
      console.error('QR Code generation failed:', error)
    }
  }, [])
  
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-8 w-8 text-olive-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
                <p className="text-sm text-gray-600">Enhanced with Recurring Appointments</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Refresh Button */}
              <button
                onClick={refresh}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
                disabled={loading}
              >
                <ArrowPathIcon className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              
              {/* Time Display */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <ClockIcon className="h-4 w-4" />
                <span>{currentTime}</span>
                <span className="text-xs">({timezone})</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="p-6">
        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={filterBarber}
                onChange={(e) => setFilterBarber(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
              >
                <option value="all">All Barbers</option>
                {resources.map(barber => (
                  <option key={barber.id} value={barber.id}>{barber.title}</option>
                ))}
              </select>
              
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent"
              >
                <option value="all">All Services</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>{service.name}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={() => setShowAppointmentModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-olive-600 hover:bg-olive-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-olive-500"
            >
              <PlusCircleIcon className="h-5 w-5 mr-2" />
              New Appointment
            </button>
          </div>
        </div>
        
        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              Error loading calendar: {error}
            </div>
          )}
          
          <ProfessionalCalendar
            events={events}
            resources={resources}
            onEventClick={handleEventClick}
            onDateSelect={handleDateSelect}
            onEventDrop={handleEventDrop}
            onDatesSet={handleDatesSet}
            calendarConfig={calendarConfig}
            loading={loading}
          />
        </div>
      </div>
      
      {/* Modals */}
      {showAppointmentModal && (
        <AppointmentBookingModal
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false)
            setSelectedSlot(null)
            setSelectedEvent(null)
          }}
          onBookingComplete={handleAppointmentSave}
          selectedSlot={selectedSlot}
          selectedEvent={selectedEvent}
          resources={resources}
          services={services}
        />
      )}
      
      {showRescheduleModal && pendingReschedule && (
        <RescheduleConfirmationModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false)
            setPendingReschedule(null)
          }}
          onConfirm={handleRescheduleConfirm}
          rescheduleData={pendingReschedule}
        />
      )}
      
      {/* QR Code Modal */}
      {showQRModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium mb-4">
              Booking QR Code - {selectedResource.title}
            </h3>
            <div className="flex justify-center mb-4">
              <img src={qrCodeUrl} alt="Booking QR Code" />
            </div>
            <button
              onClick={() => setShowQRModal(false)}
              className="w-full px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
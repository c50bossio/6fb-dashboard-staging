'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { 
  CalendarIcon, 
  PlusCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  QrCodeIcon,
  LinkIcon,
  ShareIcon,
  ClipboardIcon,
  CheckIcon,
  MapPinIcon,
  UserIcon,
  BuildingStorefrontIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import QRCode from 'qrcode'
import { useToast } from '../../../../components/ToastContainer'
import { 
  DEFAULT_RESOURCES, 
  DEFAULT_SERVICES, 
  generateMockEvents,
  generateRecurringEvents,
  formatAppointment 
} from '../../../../lib/calendar-data'
import { useRealtimeAppointments } from '../../../../hooks/useRealtimeAppointments'
import RealtimeIndicator from '../../../../components/calendar/RealtimeIndicator'

// Professional calendar component with enhanced views and auto-population
const ProfessionalCalendar = dynamic(
  () => import('../../../../components/calendar/EnhancedProfessionalCalendar'), // Enhanced version with multiple views
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

// Import the booking confirmation modal
const BookingConfirmationModal = dynamic(
  () => import('../../../../components/calendar/BookingConfirmationModal'),
  { ssr: false }
)

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState({})
  const [quickLinks, setQuickLinks] = useState([])
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const { success, error: showError, info } = useToast()
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [pendingReschedule, setPendingReschedule] = useState(null)
  const [confirmedAppointment, setConfirmedAppointment] = useState(null)
  const [services, setServices] = useState([])
  const [barbershopId] = useState('demo-shop-001') // For production, get from context
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBarber, setFilterBarber] = useState('all')
  const [filterService, setFilterService] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')
  const [showTestData, setShowTestData] = useState(true)
  
  // Use realtime appointments hook
  const { 
    appointments: realtimeAppointments, 
    loading: realtimeLoading, 
    error: realtimeErrorMsg,
    isConnected: realtimeConnected,
    lastUpdate: lastRealtimeUpdate
  } = useRealtimeAppointments(barbershopId)

  // Initialize calendar with real data
  useEffect(() => {
    setMounted(true)
    
    // Set up time display
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    
    updateTime() // Set initial time
    const timeInterval = setInterval(updateTime, 1000)
    
    // Initialize resources and services
    setResources(DEFAULT_RESOURCES)
    setServices(DEFAULT_SERVICES)
    
    // Always fetch real barbers and services
    fetchRealBarbers()
    fetchServices()
    
    return () => clearInterval(timeInterval)
  }, [])
  
  // Update events when realtime appointments change
  useEffect(() => {
    if (realtimeAppointments && realtimeAppointments.length > 0) {
      console.log('🔄 Realtime appointments received:', realtimeAppointments.length)
      setEvents(realtimeAppointments)
      setRealtimeConnected(true)
      setLastRealtimeUpdate(new Date())
    } else if (!realtimeLoading) {
      // Only fetch via API if realtime isn't loading and has no data
      console.log('📡 No realtime data, fetching via API...')
      fetchRealAppointments()
    }
    
    // Update realtime error state
    if (realtimeErrorMsg) {
      setRealtimeError(realtimeErrorMsg)
      setRealtimeConnected(false)
    }
  }, [realtimeAppointments, realtimeLoading, realtimeErrorMsg])
  
  // Debug log resources when they change
  useEffect(() => {
    console.log('📅 Calendar resources updated:', resources)
    console.log('📅 Calendar events updated:', events)
  }, [resources, events])

  // Fetch real appointments from API
  const fetchRealAppointments = async () => {
    try {
      const params = new URLSearchParams()
      const now = new Date()
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      params.append('start_date', now.toISOString())
      params.append('end_date', oneWeekFromNow.toISOString())

      const response = await fetch(`/api/calendar/appointments?${params.toString()}`)
      const result = await response.json()
      
      console.log('📅 Fetched appointments:', result)
      
      if (response.ok && result.appointments?.length) {
        // Use the appointments directly as they're already formatted
        setEvents(result.appointments)
      } else {
        // Use centralized mock data generation
        const mockEvents = generateMockEvents(new Date(), resources, services)
        const recurring = generateRecurringEvents(new Date())
        setEvents([...mockEvents, ...recurring])
      }
    } catch (error) {
      console.error('Error fetching appointments:', error)
      // Use centralized mock data generation
      const mockEvents = generateMockEvents(new Date(), resources, services)
      const recurring = generateRecurringEvents(new Date())
      setEvents([...mockEvents, ...recurring])
    }
  }


  // Fetch services from API
  const fetchServices = async () => {
    try {
      const response = await fetch('/api/calendar/services')
      const result = await response.json()
      
      console.log('📅 Fetched services:', result)
      
      if (response.ok && result.services?.length) {
        setServices(result.services)
      } else {
        setServices(DEFAULT_SERVICES)
      }
    } catch (error) {
      console.error('Error fetching services:', error)
      setServices(DEFAULT_SERVICES)
    }
  }

  // Fetch barbers from API or use default data
  const fetchRealBarbers = async () => {
    try {
      const response = await fetch('/api/calendar/barbers')
      const result = await response.json()
      
      console.log('📅 Fetched barbers:', result)
      
      if (response.ok && result.barbers?.length) {
        // Transform to FullCalendar resource format if needed
        const resources = result.barbers.map(barber => ({
          id: barber.id,
          title: barber.title || barber.name,
          eventColor: barber.eventColor || barber.color || '#3b82f6',
          ...barber
        }))
        setResources(resources)
        generateQuickLinks(resources)
      } else {
        setResources(DEFAULT_RESOURCES)
        generateQuickLinks(DEFAULT_RESOURCES)
      }
    } catch (error) {
      console.error('Error fetching barbers:', error)
      setResources(DEFAULT_RESOURCES)
      generateQuickLinks(DEFAULT_RESOURCES)
    }
  }

  // Generate quick links for QR code sharing
  const generateQuickLinks = (barberResources) => {
    const baseUrl = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://6fb-ai.com'
    const mockQuickLinks = [
      {
        id: 'main-location',
        type: 'location',
        title: 'Main Barbershop',
        subtitle: 'Downtown Location',
        url: `${baseUrl}/book/location/main-downtown`,
        icon: BuildingStorefrontIcon,
        color: 'blue'
      },
      {
        id: 'north-location',
        type: 'location', 
        title: 'North Branch',
        subtitle: 'Uptown Location',
        url: `${baseUrl}/book/location/north-uptown`,
        icon: MapPinIcon,
        color: 'green'
      },
      ...(barberResources || resources).map(barber => ({
        id: barber.id,
        type: 'barber',
        title: barber.title,
        subtitle: 'Book directly',
        url: `${baseUrl}/book/${barber.id}`,
        icon: UserIcon,
        color: 'purple'
      }))
    ]
    
    setQuickLinks(mockQuickLinks)
  }


  // Click outside detection for share dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareDropdownOpen && !event.target.closest('.share-dropdown')) {
        setShareDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [shareDropdownOpen])

  // Organize quick links by type for dropdown
  const organizedLinks = useMemo(() => {
    const locations = quickLinks.filter(link => link.type === 'location')
    const barbers = quickLinks.filter(link => link.type === 'barber')
    return { locations, barbers }
  }, [quickLinks])
  
  // Filter events based on search and filter criteria
  const filteredEvents = useMemo(() => {
    console.log('Filtering events. Total events:', events.length);
    console.log('First few events:', events.slice(0, 3));
    return events.filter(event => {
      // Test data filter
      const isTestAppointment = event.id?.toString().startsWith('test-booking-')
      if (!showTestData && isTestAppointment) return false
      
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesSearch = 
          event.title?.toLowerCase().includes(searchLower) ||
          event.extendedProps?.customer?.toLowerCase().includes(searchLower) ||
          event.extendedProps?.service?.toLowerCase().includes(searchLower) ||
          event.extendedProps?.notes?.toLowerCase().includes(searchLower)
        
        if (!matchesSearch) return false
      }
      
      // Location filter
      if (filterLocation !== 'all') {
        const barber = resources.find(r => r.id === event.resourceId)
        const barberLocation = barber?.extendedProps?.location || 'Unknown'
        if (barberLocation !== filterLocation) {
          return false
        }
      }
      
      // Barber filter
      if (filterBarber !== 'all' && event.resourceId !== filterBarber) {
        return false
      }
      
      // Service filter
      if (filterService !== 'all') {
        const eventService = event.extendedProps?.service || event.title.split(' - ')[1] || ''
        if (!eventService.toLowerCase().includes(filterService.toLowerCase())) {
          return false
        }
      }
      
      // Status filter
      if (filterStatus !== 'all') {
        const eventStatus = event.extendedProps?.status || 'confirmed'
        if (eventStatus !== filterStatus) {
          return false
        }
      }
      
      return true
    })
  }, [events, searchTerm, filterBarber, filterService, filterStatus, filterLocation, resources, showTestData])
  
  // Get unique services for filter dropdown
  const uniqueServices = useMemo(() => {
    const services = new Set()
    events.forEach(event => {
      const service = event.extendedProps?.service || event.title.split(' - ')[1]
      if (service) services.add(service)
    })
    return Array.from(services).sort()
  }, [events])

  const handleEventClick = useCallback((clickInfo) => {
    const event = clickInfo.event
    
    // Debug logging to see what data we have
    console.log('🔍 Event clicked - Debug data:', {
      resourceId: event.resourceId,
      extendedProps: event.extendedProps,
      service_id: event.extendedProps.service_id,
      barber_id: event.extendedProps.barber_id
    })
    
    setSelectedEvent({
      id: event.id,
      title: event.title,
      scheduled_at: event.start,
      end_time: event.end,
      start: event.start, // Add start for delete handler
      barber_id: event.extendedProps.barber_id || event.resourceId, // Use extendedProps barber_id first, fallback to resourceId
      service_id: event.extendedProps.service_id || '',
      service: event.extendedProps.service,
      client_name: event.extendedProps.customer,
      client_phone: event.extendedProps.customerPhone || '',
      client_email: event.extendedProps.customerEmail || '',
      duration_minutes: event.extendedProps.duration || 30,
      service_price: event.extendedProps.price || 0,
      client_notes: event.extendedProps.notes || '',
      status: event.extendedProps.status || 'confirmed',
      isRecurring: event.extendedProps.isRecurring || false,
      extendedProps: event.extendedProps // Pass all extended props for delete handler
    })
    setShowAppointmentModal(true)
  }, [])

  const handleDateSelect = useCallback((selectInfo) => {
    console.log('📅 Enhanced slot clicked:', selectInfo)
    
    // Build comprehensive slot data based on view type
    const slotData = {
      start: selectInfo.start,
      end: selectInfo.end,
      barberId: selectInfo.resourceId || selectInfo.resource?.id,
      barberName: selectInfo.resource?.title || resources.find(r => r.id === selectInfo.resourceId)?.title,
      viewType: selectInfo.viewType,
      allDay: selectInfo.allDay
    }
    
    // Handle different view types
    if (selectInfo.isMonthView) {
      // Month view: Show time picker with suggested time
      slotData.needsTimePicker = true
      slotData.suggestedTime = selectInfo.suggestedTime || '09:00'
      slotData.selectedDate = selectInfo.selectedDate
      info(`Selected date: ${selectInfo.selectedDate}. Please choose a time.`)
    } else if (selectInfo.isListView) {
      // List view: Use smart suggestions
      slotData.nearbyEvents = selectInfo.nearbyEvents
      info('Smart booking mode - checking availability...')
    } else if (selectInfo.isTimeGrid && !selectInfo.resourceId) {
      // Time grid without resources: Use suggested barber
      if (selectInfo.suggestedBarber?.available) {
        slotData.barberId = selectInfo.suggestedBarber.id
        slotData.barberName = selectInfo.suggestedBarber.name
        info(`Auto-selected ${selectInfo.suggestedBarber.name} for this time slot`)
      } else {
        showError('No barbers available for this time slot')
        return
      }
    }
    
    // Add exact time for display
    if (selectInfo.exactTime) {
      slotData.displayTime = selectInfo.exactTime
    }
    
    setSelectedSlot(slotData)
    setShowAppointmentModal(true)
  }, [resources, info, showError])

  // Handle appointment save
  // Handle appointment reschedule confirmation
  const handleRescheduleConfirm = async (rescheduleData) => {
    try {
      // Update the appointment in the database
      const response = await fetch(`/api/calendar/appointments/${rescheduleData.appointmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          start_time: rescheduleData.newTime.start,
          end_time: rescheduleData.newTime.end,
          barber_id: rescheduleData.newTime.barberId,
          notify_customer: rescheduleData.notifyCustomer,
          notification_methods: rescheduleData.notificationMethods,
          custom_message: rescheduleData.customMessage
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Update the event in the calendar
        const eventIndex = events.findIndex(e => e.id === rescheduleData.appointmentId)
        if (eventIndex !== -1) {
          const updatedEvents = [...events]
          updatedEvents[eventIndex] = {
            ...updatedEvents[eventIndex],
            start: rescheduleData.newTime.start,
            end: rescheduleData.newTime.end,
            resourceId: rescheduleData.newTime.barberId
          }
          setEvents(updatedEvents)
        }
        
        success('Appointment rescheduled successfully!', {
          title: 'Success',
          duration: 3000
        })
        
        if (rescheduleData.notifyCustomer) {
          info('Customer notification sent', {
            duration: 3000
          })
        }
        
        // Refresh appointments
        fetchRealAppointments()
      } else {
        showError(result.error || 'Failed to reschedule appointment', {
          title: 'Reschedule Failed',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error)
      showError('Failed to reschedule appointment', {
        title: 'Error',
        duration: 5000
      })
    } finally {
      setShowRescheduleModal(false)
      setPendingReschedule(null)
    }
  }

  const handleAppointmentSave = async (appointmentData) => {
    // Handle deletion case - just refresh the calendar
    if (appointmentData?.isDeleted) {
      console.log('Appointment deleted, refreshing calendar...')
      success('Appointment deleted successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)
      // Refresh the calendar by fetching appointments again
      fetchRealAppointments()
      return
    }
    
    // Handle conversion to recurring case - appointment already exists in DB
    if (appointmentData?.id && appointmentData?.is_recurring) {
      console.log('Appointment converted to recurring, refreshing calendar...')
      
      // Store the appointment data for confirmation modal
      setConfirmedAppointment(appointmentData)
      
      // Close booking modal and show confirmation modal
      setShowAppointmentModal(false)
      setShowBookingConfirmation(true)
      
      // Refresh the calendar by fetching appointments again
      fetchRealAppointments()
      return
    }
    
    // Create optimistic appointment for immediate UI update
    const startDate = new Date(appointmentData.scheduled_at)
    const durationMinutes = appointmentData.duration_minutes || 60
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    
    // Validate dates before creating optimistic appointment
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date for optimistic appointment:', {
        scheduled_at: appointmentData.scheduled_at,
        startDate: startDate.toString(),
        endDate: endDate.toString()
      })
      // Skip optimistic update if dates are invalid
    } else {
      const optimisticAppointment = {
        id: `temp-${Date.now()}`, // Temporary ID
        title: `${appointmentData.client_name} - ${appointmentData.service_name || 'Service'}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        resourceId: appointmentData.barber_id,
        backgroundColor: resources.find(r => r.id === appointmentData.barber_id)?.eventColor || '#3b82f6',
        borderColor: resources.find(r => r.id === appointmentData.barber_id)?.eventColor || '#3b82f6',
        extendedProps: {
          customer_name: appointmentData.client_name,
          customer_phone: appointmentData.client_phone,
          service_name: appointmentData.service_name || 'Service',
          status: 'booking', // Special status for optimistic update
          isOptimistic: true // Flag to identify optimistic appointments
        }
      }
      
      // Add optimistic appointment immediately to calendar
      if (!realtimeConnected) {
        setEvents(prev => [...prev, optimisticAppointment])
        info('Booking appointment...', {
          title: 'Processing',
          duration: 2000
        })
      }
    }
    
    // Add optimistic appointment immediately to calendar
    if (!realtimeConnected) {
      setEvents(prev => [...prev, optimisticAppointment])
      info('Booking appointment...', {
        title: 'Processing',
        duration: 2000
      })
    }

    try {
      const response = await fetch('/api/calendar/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...appointmentData,
          shop_id: barbershopId, // Include shop ID
          customer_name: appointmentData.client_name,
          customer_email: appointmentData.client_email,
          customer_phone: appointmentData.client_phone
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        // Store the appointment data for confirmation modal
        setConfirmedAppointment(result.appointment || result)
        
        // Close booking modal and show confirmation modal
        setShowAppointmentModal(false)
        setShowBookingConfirmation(true)
        
        // Replace optimistic appointment with real appointment data
        if (!realtimeConnected) {
          setEvents(prev => prev.map(event => 
            event.id === optimisticAppointment.id 
              ? {
                  ...result.appointment,
                  // Keep the visual properties from optimistic update
                  backgroundColor: optimisticAppointment.backgroundColor,
                  borderColor: optimisticAppointment.borderColor
                }
              : event
          ))
        }
        
        // Update realtime status
        setLastRealtimeUpdate(new Date())
        
        // Refresh appointments from database if not using realtime (after a delay to avoid race conditions)
        if (!realtimeConnected) {
          setTimeout(() => fetchRealAppointments(), 1000)
        }
      } else {
        // Remove optimistic appointment on failure
        if (!realtimeConnected) {
          setEvents(prev => prev.filter(event => event.id !== optimisticAppointment.id))
        }
        
        showError(result.error || 'Failed to book appointment', {
          title: 'Booking Failed',
          duration: 5000
        })
      }
    } catch (error) {
      // Remove optimistic appointment on error
      if (!realtimeConnected) {
        setEvents(prev => prev.filter(event => event.id !== optimisticAppointment.id))
      }
      
      showError('Failed to book appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    }
  }

  const generateQRCode = useCallback(async (resource) => {
    setSelectedResource(resource)
    
    if (typeof window === 'undefined') return
    
    const baseUrl = window.location ? window.location.origin : 'https://6fb-ai.com'
    const bookingUrl = `${baseUrl}/book/${resource.id}?utm_source=qr&utm_medium=calendar&utm_campaign=booking`
    
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

  const copyToClipboard = async (text, key) => {
    if (typeof window === 'undefined' || !navigator.clipboard) return
    
    try {
      await navigator.clipboard.writeText(text)
      setCopied({ ...copied, [key]: true })
      setTimeout(() => setCopied({ ...copied, [key]: false }), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const downloadQRCode = () => {
    if (qrCodeUrl && selectedResource) {
      const link = document.createElement('a')
      link.download = `booking-qr-${selectedResource.title.replace(/\s+/g, '-').toLowerCase()}.png`
      link.href = qrCodeUrl
      link.click()
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
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
              <CalendarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
                <p className="text-sm text-gray-600">Stable FullCalendar Implementation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Realtime Status Indicator */}
              <RealtimeIndicator 
                isConnected={realtimeConnected}
                lastUpdate={lastRealtimeUpdate}
                errorMessage={realtimeErrorMsg}
              />
              
              <button 
                onClick={() => {
                  setSelectedSlot(null)
                  setSelectedEvent(null)
                  setShowAppointmentModal(true)
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusCircleIcon className="h-5 w-5" />
                <span>New Appointment</span>
              </button>
              
              {/* Share Dropdown */}
              <div className="relative share-dropdown">
                <button 
                  onClick={() => setShareDropdownOpen(!shareDropdownOpen)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ShareIcon className="h-5 w-5" />
                  <span>Share</span>
                  <ChevronDownIcon className="h-4 w-4" />
                </button>

                {/* Dropdown Menu */}
                {shareDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-screen sm:w-80 max-w-sm bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    {/* Locations Section */}
                    {organizedLinks.locations.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          📍 LOCATIONS
                        </div>
                        {organizedLinks.locations.map((link) => {
                          const IconComponent = link.icon
                          return (
                            <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50 border-b border-gray-100">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                  <div className="text-xs text-gray-500">{link.subtitle}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Generate QR Code"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(link.url, link.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Copy Link"
                                >
                                  {copied[link.id] ? (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Barbers Section */}
                    {organizedLinks.barbers.length > 0 && (
                      <div>
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                          👤 BARBERS
                        </div>
                        {organizedLinks.barbers.map((link) => {
                          const IconComponent = link.icon
                          return (
                            <div key={link.id} className="flex items-center justify-between px-3 py-3 hover:bg-gray-50">
                              <div className="flex items-center space-x-3">
                                <div className="h-8 w-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{link.title}</div>
                                  <div className="text-xs text-gray-500">{link.subtitle}</div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button 
                                  onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Generate QR Code"
                                >
                                  <QrCodeIcon className="h-4 w-4" />
                                </button>
                                <button 
                                  onClick={() => copyToClipboard(link.url, link.id)}
                                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                  title="Copy Link"
                                >
                                  {copied[link.id] ? (
                                    <CheckIcon className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <ClipboardIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {mounted && (
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  {currentTime}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Search and Filter Bar - Mobile Responsive */}
      <div className="bg-gray-50 border-b px-3 sm:px-6 py-3">
        {/* Mobile-First Layout: Stack on small screens, row on larger screens */}
        <div className="flex flex-col space-y-3 lg:flex-row lg:space-y-0 lg:space-x-4 lg:items-center">
          {/* Search Input */}
          <div className="flex-1 lg:max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search customers, services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* Filter Dropdowns - Horizontal scroll on mobile */}
          <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
            <FunnelIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
            
            {/* Location Filter */}
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">All Locations</option>
              <option value="Downtown">Downtown</option>
              <option value="Uptown">Uptown</option>
            </select>
            
            {/* Barber Filter */}
            <select
              value={filterBarber}
              onChange={(e) => setFilterBarber(e.target.value)}
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">All Barbers</option>
              {resources.map(barber => (
                <option key={barber.id} value={barber.id}>
                  {barber.title}
                </option>
              ))}
            </select>
            
            {/* Service Filter */}
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">All Services</option>
              {uniqueServices.map(service => (
                <option key={service} value={service}>
                  {service}
                </option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="recurring">Recurring</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            {/* Test Data Toggle */}
            <div className="flex items-center space-x-2 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 flex-shrink-0 min-h-[44px]">
              <input
                type="checkbox"
                id="test-data-toggle"
                checked={showTestData}
                onChange={(e) => setShowTestData(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="test-data-toggle" className="text-gray-700 font-medium whitespace-nowrap text-sm">
                <span className="hidden sm:inline">Show Test Data</span>
                <span className="sm:hidden">Test</span>
              </label>
            </div>
            
            {/* Test Edit Modal Button - Temporary for testing */}
            <button
              onClick={() => {
                // Use an actual appointment from the database
                if (filteredEvents.length > 0) {
                  const firstEvent = filteredEvents[0]
                  const testEvent = {
                    id: firstEvent.id,
                    title: firstEvent.title,
                    scheduled_at: firstEvent.start,
                    end_time: firstEvent.end,
                    barber_id: firstEvent.resourceId || firstEvent.extendedProps?.barber_id,
                    service_id: firstEvent.extendedProps?.service_id,
                    service: firstEvent.extendedProps?.service,
                    client_name: firstEvent.extendedProps?.customer || 'Test Customer',
                    client_phone: firstEvent.extendedProps?.customerPhone || '555-1234',
                    client_email: firstEvent.extendedProps?.customerEmail || 'test@example.com',
                    duration_minutes: firstEvent.extendedProps?.duration || 30,
                    service_price: firstEvent.extendedProps?.price || 35,
                    client_notes: firstEvent.extendedProps?.notes || 'Test appointment',
                    status: firstEvent.extendedProps?.status || 'confirmed'
                  }
                  console.log('🧪 Testing with real appointment:', testEvent)
                  setSelectedEvent(testEvent)
                  setShowAppointmentModal(true)
                } else {
                  // Fallback to fake appointment if no real appointments exist
                  const testEvent = {
                    id: 'test-1',
                    title: 'Test Customer - Haircut',
                    scheduled_at: new Date().toISOString(),
                    end_time: new Date(Date.now() + 30 * 60000).toISOString(),
                    barber_id: resources[0]?.id || 'test-barber-1',
                    service_id: services[0]?.id || 'test-service-1',
                    service: services[0]?.name || 'Haircut',
                    client_name: 'Test Customer',
                    client_phone: '555-1234',
                    client_email: 'test@example.com',
                    duration_minutes: 30,
                    service_price: services[0]?.price || 35,
                    client_notes: 'Test appointment to verify dropdowns work',
                    status: 'confirmed'
                  }
                  console.log('🧪 Testing with fake appointment (no real appointments found):', testEvent)
                  setSelectedEvent(testEvent)
                  setShowAppointmentModal(true)
                }
              }}
              className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Test Edit
            </button>
            
            {/* Clear Filters Button */}
            {(searchTerm || filterLocation !== 'all' || filterBarber !== 'all' || filterService !== 'all' || filterStatus !== 'all' || !showTestData) && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterLocation('all')
                  setFilterBarber('all')
                  setFilterService('all')
                  setFilterStatus('all')
                  setShowTestData(true)
                }}
                className="flex-shrink-0 px-2 sm:px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm flex items-center space-x-1 min-h-[44px]"
              >
                <XMarkIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
          </div>
          
          {/* Results Count */}
          <div className="text-sm text-gray-600">
            {filteredEvents.length !== events.length ? (
              <span>
                Showing <span className="font-semibold">{filteredEvents.length}</span> of {events.length} appointments
              </span>
            ) : (
              <span>
                <span className="font-semibold">{events.length}</span> appointments
              </span>
            )}
          </div>
        </div>
      </div>


      {/* Calendar Container */}
      <div className="px-6 pb-6">
        <div className="bg-white rounded-lg shadow-lg p-4" style={{ minHeight: '700px' }}>
          <ProfessionalCalendar
            resources={resources}
            events={filteredEvents} // Use filtered events
            onEventClick={handleEventClick}
            onSlotClick={handleDateSelect}
            onEventDrop={(dropInfo) => {
              console.log('Event dropped:', dropInfo)
              
              // Prepare reschedule data
              const appointment = {
                id: dropInfo.event.id,
                title: dropInfo.event.title,
                start: dropInfo.oldEvent.start,
                end: dropInfo.oldEvent.end,
                resourceId: dropInfo.oldEvent.resourceId || dropInfo.oldResource?.id,
                extendedProps: dropInfo.event.extendedProps
              }
              
              const newSlot = {
                start: dropInfo.event.start,
                end: dropInfo.event.end,
                resourceId: dropInfo.event.resourceId || dropInfo.newResource?.id,
                barberName: dropInfo.newResource?.title || resources.find(r => r.id === dropInfo.event.resourceId)?.title
              }
              
              // Revert the change immediately (will be applied after confirmation)
              dropInfo.revert()
              
              // Show confirmation modal
              setPendingReschedule({
                appointment,
                newSlot,
                dropInfo
              })
              setShowRescheduleModal(true)
            }}
            height="650px"
          />
        </div>

      </div>

      {/* QR Code Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedResource ? `QR Code - ${selectedResource.title}` : 'Booking QR Codes'}
              </h3>
              <button
                onClick={() => setShowQRModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {selectedResource && qrCodeUrl ? (
              <div className="text-center">
                <div className="mb-4 p-4 bg-gray-50 rounded-lg inline-block">
                  <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
                </div>
                
                <div className="space-y-3">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking URL
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={selectedResource.url}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg bg-gray-50 text-sm text-gray-600"
                      />
                      <button
                        onClick={() => copyToClipboard(selectedResource.url, 'modal')}
                        className="px-3 py-2 bg-blue-600 text-white rounded-r-lg hover:bg-blue-700 flex items-center"
                      >
                        {copied.modal ? (
                          <CheckIcon className="h-4 w-4" />
                        ) : (
                          <ClipboardIcon className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={downloadQRCode}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => window.open(selectedResource.url, '_blank')}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center space-x-2"
                    >
                      <ShareIcon className="h-4 w-4" />
                      <span>Test Link</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 text-center mb-4">
                  Select a barber or location to generate a QR code:
                </p>
                
                <div className="grid grid-cols-1 gap-3">
                  {quickLinks.map((link) => {
                    const IconComponent = link.icon
                    return (
                      <button
                        key={link.id}
                        onClick={() => generateQRCode({ id: link.id, title: link.title, url: link.url })}
                        className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                      >
                        <div className={`h-8 w-8 bg-gradient-to-r ${link.color === 'blue' ? 'from-blue-500 to-blue-600' : link.color === 'green' ? 'from-green-500 to-green-600' : 'from-purple-500 to-purple-600'} rounded flex items-center justify-center`}>
                          <IconComponent className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{link.title}</div>
                          <div className="text-sm text-gray-500">{link.subtitle}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Booking Modal */}
      {showAppointmentModal && (
        <AppointmentBookingModal
          isOpen={showAppointmentModal}
          onClose={() => {
            setShowAppointmentModal(false)
            setSelectedSlot(null)
            setSelectedEvent(null)
          }}
          selectedSlot={selectedSlot}
          barbershopId={barbershopId}
          barbers={resources.map(r => ({ id: r.id, name: r.title }))}
          services={services}
          onBookingComplete={handleAppointmentSave}
          editingAppointment={selectedEvent}
        />
      )}
      
      {/* Reschedule Confirmation Modal */}
      {showRescheduleModal && pendingReschedule && (
        <RescheduleConfirmationModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false)
            setPendingReschedule(null)
          }}
          onConfirm={handleRescheduleConfirm}
          appointmentDetails={pendingReschedule.appointment}
          newTimeSlot={pendingReschedule.newSlot}
        />
      )}

      {/* Booking Confirmation Modal */}
      {showBookingConfirmation && confirmedAppointment && (
        <BookingConfirmationModal
          isOpen={showBookingConfirmation}
          onClose={() => {
            setShowBookingConfirmation(false)
            setConfirmedAppointment(null)
            setSelectedSlot(null)
            setSelectedEvent(null)
          }}
          appointmentData={confirmedAppointment}
          barberName={
            resources.find(r => 
              r.id === confirmedAppointment.barber_id || 
              r.id === confirmedAppointment.resource_id
            )?.title || 'Unknown Barber'
          }
          serviceName={
            services.find(s => 
              s.id === confirmedAppointment.service_id
            )?.name || confirmedAppointment.service_name || 'Service'
          }
        />
      )}
      
    </div>
  )
}
'use client'

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
import dynamic from 'next/dynamic'
import QRCode from 'qrcode'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import AutoRefreshComponent from '../../../../components/calendar/AutoRefreshComponent'
import RealtimeIndicator from '../../../../components/calendar/RealtimeIndicator'
import RealtimeStatusIndicator from '../../../../components/calendar/RealtimeStatusIndicator'
import { useToast } from '../../../../components/ToastContainer'
import { useRealtimeAppointmentsSimple as useRealtimeAppointments } from '../../../../hooks/useRealtimeAppointmentsSimple' // Simplified version
import { 
  DEFAULT_RESOURCES, 
  DEFAULT_SERVICES, 
  formatAppointment,
  exportToCSV 
} from '../../../../lib/calendar-data'
import { useAuth } from '../../../../components/SupabaseAuthProvider'

const ProfessionalCalendar = dynamic(
  () => import('../../../../components/calendar/EnhancedProfessionalCalendar'), // Enhanced version with multiple views
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

import '../../../../styles/professional-calendar.css'
import '../../../../styles/cancelled-appointments.css'

const AppointmentBookingModal = dynamic(
  () => import('../../../../components/calendar/AppointmentBookingModal'),
  { ssr: false }
)

const RescheduleConfirmationModal = dynamic(
  () => import('../../../../components/calendar/RescheduleConfirmationModal'),
  { ssr: false }
)

const BookingConfirmationModal = dynamic(
  () => import('../../../../components/calendar/BookingConfirmationModal'),
  { ssr: false }
)

const CancelConfirmationModal = dynamic(
  () => import('../../../../components/calendar/CancelConfirmationModal'),
  { ssr: false }
)

export default function CalendarPage() {
  // Get auth context
  const { user, profile } = useAuth()
  
  const [mounted, setMounted] = useState(false)
  const [events, setEvents] = useState([])
  const [resources, setResources] = useState([])
  const [showQRModal, setShowQRModal] = useState(false)
  const [currentCalendarView, setCurrentCalendarView] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('calendarView') || 'resourceTimeGridDay'
    }
    return 'resourceTimeGridDay'
  })
  const [selectedResource, setSelectedResource] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [copied, setCopied] = useState({})
  const [quickLinks, setQuickLinks] = useState([])
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState('')
  const { success, error: showError, info } = useToast()
  
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showBookingConfirmation, setShowBookingConfirmation] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [pendingReschedule, setPendingReschedule] = useState(null)
  const [confirmedAppointment, setConfirmedAppointment] = useState(null)
  const [appointmentToCancel, setAppointmentToCancel] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [services, setServices] = useState([])
  // Get barbershop ID from auth context - required for production
  const barbershopId = profile?.barbershop_id || user?.barbershop_id || 'demo-shop-001'
  
  const [searchTerm, setSearchTerm] = useState('')
  const [filterBarber, setFilterBarber] = useState('all')
  const [filterService, setFilterService] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterLocation, setFilterLocation] = useState('all')
  
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  
  const [appointmentIds, setAppointmentIds] = useState(() => new Set())
  
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [realtimeError, setRealtimeError] = useState(null)
  
  
  const { 
    appointments: realtimeAppointments, 
    loading: realtimeLoading, 
    error: realtimeErrorMsg,
    isConnected: realtimeHookConnected,
    lastUpdate,
    stats: realtimeStats,
    refresh: refreshAppointments,
    log: websocketLog
  } = useRealtimeAppointments(barbershopId)
  
  const diagnostics = useMemo(() => ({
    subscriptionStatus: realtimeHookConnected ? 'connected' : 'disconnected',
    channelStatus: realtimeHookConnected ? 'SUBSCRIBED' : 'CLOSED',
    eventCounts: realtimeStats || { INSERT: 0, UPDATE: 0, DELETE: 0 },
    connectionTime: null,
    errorHistory: realtimeErrorMsg ? [{ error: realtimeErrorMsg, timestamp: new Date().toISOString() }] : [],
    subscriptionStatusHistory: [],
    connected: realtimeStats?.connected || false
  }), [realtimeHookConnected, realtimeStats, realtimeErrorMsg])
  
  const connectionAttempts = 1 // V2 always connects on first attempt
  

  const handleViewChange = useCallback((newView) => {
    console.log('📅 View changed to:', newView)
    setCurrentCalendarView(newView)
    if (typeof window !== 'undefined') {
      localStorage.setItem('calendarView', newView)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('componentDebugAfter', JSON.stringify({
        hookReturned: true,
        hasAppointments: !!realtimeAppointments,
        appointmentCount: realtimeAppointments?.length || 0,
        loading: realtimeLoading,
        error: realtimeErrorMsg,
        isConnected: realtimeHookConnected,
        timestamp: new Date().toISOString()
      }))
    }
    
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }
    
    updateTime() // Set initial time
    const timeInterval = setInterval(updateTime, 1000)
    
    setResources(DEFAULT_RESOURCES)
    setServices(DEFAULT_SERVICES)
    
    fetchRealBarbers()
    fetchServices()
    
    return () => clearInterval(timeInterval)
  }, [])
  
  const deduplicateAppointments = (appointments) => {
    const seen = new Map()
    const result = []
    
    const prioritized = [...appointments].sort((a, b) => {
      const aIsOptimistic = a.id?.toString().startsWith('temp-') || a.extendedProps?.isOptimistic
      const bIsOptimistic = b.id?.toString().startsWith('temp-') || b.extendedProps?.isOptimistic
      
      if (aIsOptimistic && !bIsOptimistic) return 1  // b comes first
      if (!aIsOptimistic && bIsOptimistic) return -1 // a comes first
      return 0 // same priority
    })
    
    for (const apt of prioritized) {
      if (!apt.id) continue // Skip invalid appointments
      
      const dedupKey = `${apt.start}-${apt.resourceId}-${apt.title?.replace(/^❌\s*/, '')}`
      
      const idKey = apt.id.toString()
      
      if (seen.has(idKey) || seen.has(dedupKey)) {
        console.log('🔄 DEDUP: Skipping duplicate appointment:', {
          id: apt.id,
          title: apt.title,
          reason: seen.has(idKey) ? 'same ID' : 'same time/barber/customer'
        })
        continue
      }
      
      seen.set(idKey, true)
      seen.set(dedupKey, true)
      result.push(apt)
    }
    
    console.log('🔄 DEDUP: Processed', appointments.length, 'appointments, kept', result.length)
    return result
  }

  useEffect(() => {
    console.log('🔍 CALENDAR PAGE: Realtime appointments changed:', {
      hasAppointments: !!realtimeAppointments,
      appointmentsLength: Array.isArray(realtimeAppointments) ? realtimeAppointments.length : 'not array',
      isConnected: realtimeHookConnected,
      lastUpdate: lastUpdate,
      timestamp: new Date().toISOString()
    })
    
    if (realtimeAppointments && Array.isArray(realtimeAppointments) && realtimeAppointments.length > 0) {
      // 🚨 CRITICAL FIX: Use WebSocket data directly instead of ignoring it
      console.log('📡 CALENDAR PAGE: Updating with', realtimeAppointments.length, 'appointments from WebSocket')
      
      const cancelledCount = realtimeAppointments.filter(apt => 
        apt.extendedProps?.status === 'cancelled' || apt.title?.startsWith('❌')
      ).length
      console.log('📡 CALENDAR PAGE: Cancelled appointments:', cancelledCount)
      
      setEvents(realtimeAppointments)
      setRealtimeConnected(realtimeHookConnected)
      
      const newIds = new Set(realtimeAppointments.map(apt => apt.id))
      setAppointmentIds(newIds)
    } else if (!realtimeLoading && (!realtimeAppointments || realtimeAppointments.length === 0)) {
      console.log('📅 CALENDAR PAGE: WebSocket has no data, fetching from API as fallback')
      fetchRealAppointments()
    }
  }, [realtimeAppointments, realtimeHookConnected, lastUpdate]) // Removed .length to prevent infinite loops
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (events.length === 0 && !realtimeLoading) {
        console.log('📅 Real-time timeout - using manual fetch as fallback')
        fetchRealAppointments()
      }
    }, 5000) // Increased to 5 seconds to give real-time more time
    
    return () => clearTimeout(timer)
  }, [events.length, realtimeLoading, realtimeConnected])
  
  useEffect(() => {
    if (resources.length > 0) {
      console.log('📅 Calendar resources loaded:', resources.length)
    }
  }, [resources])

  const fetchRealAppointments = async () => {
    console.log('🚨 CRITICAL: fetchRealAppointments called at', new Date().toISOString())
    console.log('🚨 CRITICAL: Current events count before fetch:', events.length)
    
    try {
      const params = new URLSearchParams()
      const now = new Date()
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      params.append('start_date', now.toISOString())
      params.append('end_date', oneWeekFromNow.toISOString())
      // 🚨 CRITICAL FIX: Add shop_id parameter to prevent getting entire database
      if (!barbershopId) {
        console.error('No barbershop ID available for calendar')
        return
      }
      params.append('shop_id', barbershopId)

      const apiUrl = `/api/calendar/appointments?${params.toString()}`
      console.log('🚨 CRITICAL: Making API request with shop filter:', apiUrl)
      
      const response = await fetch(apiUrl)
      console.log('🚨 CRITICAL: Response status:', response.status, response.ok)
      
      const result = await response.json()
      console.log('🚨 CRITICAL: Raw API result:', {
        hasAppointments: !!result.appointments,
        appointmentCount: result.appointments?.length || 0,
        appointmentsArray: Array.isArray(result.appointments),
        firstAppointment: result.appointments?.[0] || 'none',
        cancelledCount: result.appointments?.filter(apt => apt.extendedProps?.status === 'cancelled').length || 0,
        fullResult: result
      })
      
      if (response.ok && result.appointments?.length) {
        const combined = [...events, ...result.appointments]
        const uniqueAppointments = deduplicateAppointments(combined)
        
        console.log('🚨 CRITICAL FIX: Processing appointments:', {
          previousCount: events.length,
          newDataCount: result.appointments.length,
          combinedCount: combined.length,
          finalCount: uniqueAppointments.length,
          cancelledCount: uniqueAppointments.filter(apt => apt.extendedProps?.status === 'cancelled').length,
          optimisticCount: uniqueAppointments.filter(apt => apt.extendedProps?.isOptimistic).length
        })
        
        setEvents(uniqueAppointments)
        
        console.log('✅ CRITICAL FIX: setEvents called with', uniqueAppointments.length, 'appointments')
        
        const newIds = new Set(uniqueAppointments.map(apt => apt.id))
        setAppointmentIds(newIds)
      } else {
        setEvents([])
      }
    } catch (error) {
      console.error('❌ DEBUG: Error fetching appointments:', error)
      setEvents([])
    }
  }

  const handleAutoRefresh = async () => {
    console.log('🔄 Auto-refresh triggered (WebSocket fallback mode)')
    await fetchRealAppointments()
  }

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

  const fetchRealBarbers = async () => {
    try {
      const response = await fetch('/api/calendar/barbers')
      const result = await response.json()
      
      console.log('📅 Fetched barbers:', result)
      
      if (response.ok && result.barbers?.length) {
        const transformedResources = result.barbers.map(barber => ({
          id: barber.id,
          title: barber.title || barber.name,
          eventColor: barber.eventColor || barber.color || '#546355',
          ...barber
        }))
        setResources(transformedResources)
        generateQuickLinks(transformedResources)
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

  const generateQuickLinks = (barberResources) => {
    const baseUrl = typeof window !== 'undefined' && window.location ? window.location.origin : 'https://6fb-ai.com'
    const QuickLinks = [
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
    
    setQuickLinks(QuickLinks)
  }


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shareDropdownOpen && !event.target.closest('.share-dropdown')) {
        setShareDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [shareDropdownOpen])

  const organizedLinks = useMemo(() => {
    const locations = quickLinks.filter(link => link.type === 'location')
    const barbers = quickLinks.filter(link => link.type === 'barber')
    return { locations, barbers }
  }, [quickLinks])
  
  
  const filteredEvents = useMemo(() => {
    // 🚨 CRITICAL FIX: Merge both events and appointments arrays
    const safeEvents = Array.isArray(events) ? events : []
    const safeRealtimeAppointments = Array.isArray(realtimeAppointments) ? realtimeAppointments : []
    const combinedEvents = [...safeEvents, ...safeRealtimeAppointments]
    const uniqueEvents = deduplicateAppointments(combinedEvents)
    
    console.log('Events debug:', {
      eventsCount: events.length,
      realtimeAppointmentsCount: realtimeAppointments.length,
      combinedCount: combinedEvents.length,
      uniqueCount: uniqueEvents.length
    })
    
    let currentEvents = [...uniqueEvents]
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      currentEvents = currentEvents.filter(event => 
        event.title?.toLowerCase().includes(searchLower) ||
        event.extendedProps?.customer?.toLowerCase().includes(searchLower) ||
        event.extendedProps?.service?.toLowerCase().includes(searchLower) ||
        event.extendedProps?.notes?.toLowerCase().includes(searchLower)
      )
    }
    
    if (filterLocation !== 'all') {
      currentEvents = currentEvents.filter(event => {
        const barber = resources.find(r => r.id === event.resourceId)
        const barberLocation = barber?.extendedProps?.location || 'Unknown'
        return barberLocation === filterLocation
      })
    }
    
    if (filterBarber !== 'all') {
      currentEvents = currentEvents.filter(event => event.resourceId === filterBarber)
    }
    
    if (filterService !== 'all') {
      currentEvents = currentEvents.filter(event => {
        const eventService = event.extendedProps?.service || 
                           (event.title && event.title.includes(' - ') ? event.title.split(' - ')[1] : '') || ''
        return eventService.toLowerCase().trim() === filterService.toLowerCase().trim()
      })
    }
    
    if (filterStatus !== 'all') {
      currentEvents = currentEvents.filter(event => {
        const eventStatus = event.extendedProps?.status || 'confirmed'
        return eventStatus === filterStatus
      })
    }
    
    const filteredResult = currentEvents
    
    return filteredResult
  }, [events, realtimeAppointments, searchTerm, filterBarber, filterService, filterStatus, filterLocation, resources])
  
  const filteredResources = useMemo(() => {
    let filtered = resources
    
    if (filterLocation !== 'all') {
      filtered = filtered.filter(resource => {
        const resourceLocation = resource.extendedProps?.location
        return resourceLocation === filterLocation
      })
    }
    
    if (filterBarber !== 'all') {
      filtered = filtered.filter(resource => resource.id === filterBarber)
    }
    
    return filtered
  }, [resources, filterLocation, filterBarber])
  
  useEffect(() => {
    if (filterLocation !== 'all' && filterBarber !== 'all') {
      const isBarberInLocation = filteredResources.some(resource => resource.id === filterBarber)
      if (!isBarberInLocation) {
        setFilterBarber('all')
      }
    }
  }, [filterLocation, filterBarber, filteredResources])
  
  const uniqueServices = useMemo(() => {
    const services = new Set()
    const safeEvents = Array.isArray(events) ? events : []
    safeEvents.forEach(event => {
      const service = event.extendedProps?.service || 
                     (event.title && event.title.includes(' - ') ? event.title.split(' - ')[1] : '') || ''
      if (service && service.trim()) services.add(service.trim())
    })
    return Array.from(services).sort()
  }, [events])

  const handleEventClick = useCallback((clickInfo) => {
    const event = clickInfo.event
    
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
    console.log('📅 Calendar slot selected:', {
      type: selectInfo.selectionType || 'unknown',
      start: selectInfo.start,
      end: selectInfo.end,
      duration: selectInfo.duration,
      barber: selectInfo.barberName || selectInfo.resourceTitle
    })
    
    const slotData = {
      start: selectInfo.start,
      end: selectInfo.end,
      barberId: selectInfo.barberId || selectInfo.resourceId || selectInfo.resource?.id,
      barberName: selectInfo.barberName || selectInfo.resource?.title || resources.find(r => r.id === (selectInfo.resourceId || selectInfo.barberId))?.title,
      viewType: selectInfo.viewType,
      allDay: selectInfo.allDay,
      duration: selectInfo.duration || 60,
      selectionType: selectInfo.selectionType
    }
    
    if (selectInfo.isMonthView) {
      slotData.needsTimePicker = true
      slotData.suggestedTime = selectInfo.suggestedTime || '09:00'
      slotData.selectedDate = selectInfo.selectedDate
      info(`Selected date: ${selectInfo.selectedDate}. Please choose a time.`)
    } else if (selectInfo.isListView) {
      slotData.nearbyEvents = selectInfo.nearbyEvents
      info('Smart booking mode - checking availability...')
    } else if (selectInfo.isTimeGrid && !selectInfo.resourceId) {
      if (selectInfo.suggestedBarber?.available) {
        slotData.barberId = selectInfo.suggestedBarber.id
        slotData.barberName = selectInfo.suggestedBarber.name
        info(`Auto-selected ${selectInfo.suggestedBarber.name} for this time slot`)
      } else {
        showError('No barbers available for this time slot')
        return
      }
    }
    
    if (selectInfo.exactTime) {
      slotData.displayTime = selectInfo.exactTime
    }
    
    setSelectedSlot(slotData)
    setShowAppointmentModal(true)
  }, [resources, info, showError])

  const handleRescheduleConfirm = async (rescheduleData) => {
    try {
      const response = await fetch('/api/calendar/appointments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: rescheduleData.appointmentId,
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
    if (appointmentData?.isDeleted) {
      console.log('Appointment deleted, waiting for real-time update...')
      
      success('Appointment deleted successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)
      
      
      return
    }

    if (appointmentData?.isCancelled) {
      console.log('Appointment cancelled, waiting for real-time update...')
      
      success('Appointment cancelled successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)
      
      return
    }

    if (appointmentData?.isUncancelled) {
      console.log('Appointment uncancelled, waiting for real-time update...')
      
      success('Appointment uncancelled successfully!', {
        title: 'Success',
        duration: 3000
      })
      setShowAppointmentModal(false)
      
      return
    }
    
    if (appointmentData?.id && appointmentData?.is_recurring) {
      console.log('Appointment converted to recurring, refreshing calendar...')
      
      setConfirmedAppointment(appointmentData)
      
      setShowAppointmentModal(false)
      setShowBookingConfirmation(true)
      
      return
    }
    
    let optimisticAppointment = null
    
    console.log('📅 Creating optimistic appointment with data:', {
      scheduled_at: appointmentData.scheduled_at,
      duration_minutes: appointmentData.duration_minutes,
      client_name: appointmentData.client_name,
      fullData: appointmentData
    })
    
    const scheduledDate = appointmentData.scheduled_at || appointmentData.start_time || appointmentData.start || appointmentData.dateTime
    if (!scheduledDate) {
      console.error('No valid date field found in appointment data:', appointmentData)
      showError('Invalid appointment date', {
        title: 'Booking Failed',
        duration: 3000
      })
      return
    }
    
    const startDate = new Date(scheduledDate)
    const durationMinutes = appointmentData.duration_minutes || 60
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000)
    
    console.log('📅 Creating appointment with service-based duration:', {
      service: appointmentData.service_name,
      duration: durationMinutes,
      startTime: startDate.toLocaleTimeString(),
      endTime: endDate.toLocaleTimeString()
    })
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error('Invalid date for optimistic appointment:', {
        scheduled_at: scheduledDate,
        startDate: startDate.toString(),
        endDate: endDate.toString(),
        rawData: appointmentData
      })
    } else {
      const barberColor = resources.find(r => r.id === appointmentData.barber_id)?.eventColor || '#546355'
      
      optimisticAppointment = {
        id: `temp-${Date.now()}`, // Temporary ID
        title: `${appointmentData.client_name} - ${appointmentData.service_name || 'Unknown Service'}`,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        resourceId: appointmentData.barber_id,
        backgroundColor: `${barberColor}88`, // Add transparency (88 = ~53% opacity)
        borderColor: barberColor,
        classNames: ['optimistic-appointment'], // Add CSS class for additional styling
        extendedProps: {
          customer_name: appointmentData.client_name,
          customer_phone: appointmentData.client_phone,
          service_name: appointmentData.service_name || 'Unknown Service',
          status: 'booking', // Special status for optimistic update
          isOptimistic: true // Flag to identify optimistic appointments
        }
      }
      
      setEvents(prev => {
        const exists = prev.some(apt => apt.id === optimisticAppointment.id)
        if (exists) {
          console.log('📅 Appointment already exists, skipping optimistic update')
          return prev
        }
        console.log('📅 Adding optimistic appointment to calendar:', optimisticAppointment.id)
        return [...prev, optimisticAppointment]
      })
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
        setConfirmedAppointment(result.appointment || result)
        
        setShowAppointmentModal(false)
        setShowBookingConfirmation(true)
        
        if (optimisticAppointment && result.appointment) {
          setEvents(prev => {
            const withoutOptimistic = prev.filter(event => event.id !== optimisticAppointment.id)
            
            const realAppointment = {
              id: result.appointment.id,
              title: `${result.appointment.customer_name} - ${result.appointment.service_name}`,
              start: result.appointment.start_time,
              end: result.appointment.end_time,
              resourceId: result.appointment.barber_id,
              backgroundColor: resources.find(r => r.id === result.appointment.barber_id)?.eventColor || '#546355',
              borderColor: resources.find(r => r.id === result.appointment.barber_id)?.eventColor || '#546355',
              extendedProps: {
                customer_name: result.appointment.customer_name,
                customer_phone: result.appointment.customer_phone,
                service_name: result.appointment.service_name,
                status: result.appointment.status,
                isOptimistic: false // Real appointment
              }
            }
            
            console.log('📅 OPTIMISTIC REPLACEMENT: Replaced optimistic with real appointment:', {
              oldId: optimisticAppointment.id,
              newId: realAppointment.id,
              title: realAppointment.title
            })
            
            const combined = [...withoutOptimistic, realAppointment]
            return deduplicateAppointments(combined)
          })
        } else {
          console.log('📅 No optimistic appointment to replace or no API response data')
        }
      } else {
        if (optimisticAppointment) {
          setEvents(prev => prev.filter(event => event.id !== optimisticAppointment.id))
          console.log('📅 Removed optimistic appointment due to failure:', optimisticAppointment.id)
        }
        
        showError(result.error || 'Failed to book appointment', {
          title: 'Booking Failed',
          duration: 5000
        })
      }
    } catch (error) {
      if (optimisticAppointment) {
        setEvents(prev => prev.filter(event => event.id !== optimisticAppointment.id))
        console.log('📅 Removed optimistic appointment due to error:', optimisticAppointment.id)
      }
      
      showError('Failed to book appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    }
  }

  const handleExportCSV = () => {
    try {
      const csv = exportToCSV(filteredEvents, resources)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      success('Calendar exported to CSV successfully')
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export calendar')
    }
  }
  
  const handleExportICS = () => {
    try {
      let icsContent = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//BookedBarber//Calendar Export//EN\n'
      
      filteredEvents.forEach(event => {
        const start = new Date(event.start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        const end = new Date(event.end || event.start).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        const created = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
        
        icsContent += 'BEGIN:VEVENT\n'
        icsContent += `UID:${event.id}@bookedbarber.com\n`
        icsContent += `DTSTART:${start}\n`
        icsContent += `DTEND:${end}\n`
        icsContent += `SUMMARY:${event.title}\n`
        icsContent += `DESCRIPTION:${event.extendedProps?.notes || ''}\n`
        icsContent += `LOCATION:${event.extendedProps?.location || 'Barbershop'}\n`
        icsContent += `STATUS:${event.extendedProps?.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}\n`
        icsContent += `CREATED:${created}\n`
        icsContent += 'END:VEVENT\n'
      })
      
      icsContent += 'END:VCALENDAR'
      
      const blob = new Blob([icsContent], { type: 'text/calendar' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.ics`
      a.click()
      window.URL.revokeObjectURL(url)
      success('Calendar exported to iCal format successfully')
    } catch (error) {
      console.error('Export error:', error)
      showError('Failed to export calendar')
    }
  }

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return
    
    setCancelling(true)
    
    try {
      const response = await fetch(`/api/calendar/appointments?id=${appointmentToCancel.id}&soft_delete=true&reason=Customer%20Request`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const result = await response.json()
      
      if (response.ok) {
        success('Appointment cancelled successfully', {
          title: 'Cancelled',
          duration: 3000
        })
        
        setShowCancelModal(false)
        setAppointmentToCancel(null)
        
      } else {
        showError(result.error || 'Failed to cancel appointment', {
          title: 'Error',
          duration: 5000
        })
      }
    } catch (error) {
      console.error('Cancel error:', error)
      showError('Failed to cancel appointment: ' + error.message, {
        title: 'Error',
        duration: 5000
      })
    } finally {
      setCancelling(false)
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-olive-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* WebSocket Debug Panel - Temporarily disabled due to logs error */}
      {/* <WebSocketDebugPanel /> */}
      
      
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="h-8 w-8 text-olive-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Booking Calendar</h1>
                <p className="text-sm text-gray-600">Stable FullCalendar Implementation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Realtime Status Indicator */}
              <RealtimeStatusIndicator 
                isConnected={realtimeHookConnected}
                lastUpdate={lastUpdate}
                connectionAttempts={1}
                appointmentCount={events.length}
                eventCounts={realtimeStats ? {
                  INSERT: realtimeStats.inserts,
                  UPDATE: realtimeStats.updates,
                  DELETE: realtimeStats.deletes
                } : null}
                error={realtimeErrorMsg}
              />
              
              <button 
                onClick={() => {
                  setSelectedSlot(null)
                  setSelectedEvent(null)
                  setShowAppointmentModal(true)
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-olive-600 text-white rounded-lg hover:bg-olive-700"
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
                                <div className="h-8 w-8 bg-olive-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-olive-600" />
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
                                <div className="h-8 w-8 bg-gold-100 rounded-lg flex items-center justify-center">
                                  <IconComponent className="h-4 w-4 text-gold-600" />
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-olive-500 focus:border-transparent text-base"
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
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-olive-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">All Locations</option>
              <option value="Downtown">Downtown</option>
              <option value="Uptown">Uptown</option>
            </select>
            
            {/* Barber Filter */}
            <select
              value={filterBarber}
              onChange={(e) => setFilterBarber(e.target.value)}
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-olive-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">All Barbers</option>
              {filteredResources.map(barber => (
                <option key={barber.id} value={barber.id}>
                  {barber.title}
                </option>
              ))}
            </select>
            
            {/* Service Filter */}
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-olive-500 focus:border-transparent min-h-[44px]"
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
              className="flex-shrink-0 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-olive-500 focus:border-transparent min-h-[44px]"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="recurring">Recurring</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            
            
            {/* Clear Filters Button */}
            {(searchTerm || filterLocation !== 'all' || filterBarber !== 'all' || filterService !== 'all' || filterStatus !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('')
                  setFilterLocation('all')
                  setFilterBarber('all')
                  setFilterService('all')
                  setFilterStatus('all')
                }}
                className="flex-shrink-0 px-2 sm:px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm flex items-center space-x-1 min-h-[44px]"
              >
                <XMarkIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            
            {/* Export Buttons */}
            <div className="flex-shrink-0 flex space-x-2">
              <button
                onClick={handleExportCSV}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center space-x-1 min-h-[44px]"
                title="Export to CSV"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="hidden sm:inline">CSV</span>
              </button>
              
              <button
                onClick={handleExportICS}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-1 min-h-[44px]"
                title="Export to iCal"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="hidden sm:inline">iCal</span>
              </button>
            </div>
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
            resources={filteredResources} // Use filtered resources
            events={filteredEvents} // Use filtered events
            currentView={currentCalendarView}
            onViewChange={handleViewChange}
            onEventClick={handleEventClick}
            onSlotClick={handleDateSelect}
            onEventDrop={(dropInfo) => {
              console.log('Event dropped:', dropInfo)
              
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
              
              dropInfo.revert()
              
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
                        className="px-3 py-2 bg-olive-600 text-white rounded-r-lg hover:bg-olive-700 flex items-center"
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
                      className="flex-1 px-4 py-2 bg-moss-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => window.open(selectedResource.url, '_blank')}
                      className="flex-1 px-4 py-2 bg-gold-700 text-white rounded-lg hover:bg-gold-700 flex items-center justify-center space-x-2"
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
                        <div className={`h-8 w-8 bg-gradient-to-r ${link.color === 'blue' ? 'from-olive-500 to-olive-600' : link.color === 'green' ? 'from-green-500 to-green-600' : 'from-gold-500 to-gold-600'} rounded flex items-center justify-center`}>
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

      {/* Cancel Confirmation Modal */}
      <CancelConfirmationModal
        isOpen={showCancelModal}
        onClose={() => {
          setShowCancelModal(false)
          setAppointmentToCancel(null)
        }}
        onConfirm={handleCancelAppointment}
        appointment={appointmentToCancel}
        loading={cancelling}
      />

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
            )?.name || confirmedAppointment.service_name || 'Unknown Service'
          }
        />
      )}
      
      {/* Developer Diagnostics Panel */}
      <div className={`fixed bottom-0 left-0 right-0 bg-gray-900 text-white transition-transform duration-300 ${showDiagnostics ? 'transform translate-y-0' : 'transform translate-y-full'} z-40`}>
        <div className="px-6 py-3 border-b border-gray-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Real-time Diagnostics</h3>
          <button
            onClick={() => setShowDiagnostics(false)}
            className="text-gray-400 hover:text-white"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="px-6 py-4 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Connection Status */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-olive-400 mb-2">Connection Status</div>
              <div className={`text-${realtimeHookConnected ? 'green' : 'red'}-400 font-mono`}>
                {diagnostics.subscriptionStatus || 'unknown'}
              </div>
              <div className="text-gray-400 mt-1">
                Attempts: {connectionAttempts}
              </div>
              <div className="text-gray-400">
                Channel: {diagnostics.channelStatus || 'unknown'}
              </div>
            </div>

            {/* Event Counts */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-green-400 mb-2">Event Counts</div>
              <div className="space-y-1 font-mono">
                <div>INSERT: {diagnostics.eventCounts?.INSERT || 0}</div>
                <div>UPDATE: {diagnostics.eventCounts?.UPDATE || 0}</div>
                <div>DELETE: {diagnostics.eventCounts?.DELETE || 0}</div>
              </div>
            </div>

            {/* Timing Info */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-yellow-400 mb-2">Timing</div>
              <div className="text-gray-300 text-xs">
                <div>Last Update:</div>
                <div className="font-mono">
                  {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : 'None'}
                </div>
                <div className="mt-1">Connection Time:</div>
                <div className="font-mono">
                  {diagnostics.connectionTime ? `${diagnostics.connectionTime}ms` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Data Status */}
            <div className="bg-gray-800 rounded p-3">
              <div className="font-semibold text-gold-400 mb-2">Data Status</div>
              <div className="space-y-1">
                <div>Appointments: {realtimeAppointments?.length || 0}</div>
                <div>Filtered: {filteredEvents?.length || 0}</div>
                <div>Loading: {realtimeLoading ? 'Yes' : 'No'}</div>
                <div className={`text-${realtimeErrorMsg ? 'red' : 'green'}-400`}>
                  Status: {realtimeErrorMsg ? 'Error' : 'OK'}
                </div>
              </div>
            </div>

            {/* Error History */}
            {diagnostics.errorHistory?.length > 0 && (
              <div className="bg-gray-800 rounded p-3 md:col-span-2">
                <div className="font-semibold text-red-400 mb-2">Recent Errors</div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {diagnostics.errorHistory.slice(-3).map((error, i) => (
                    <div key={i} className="text-xs">
                      <span className="text-red-400">[{error.type}]</span> {error.message}
                      <div className="text-gray-500">{new Date(error.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subscription History */}
            {diagnostics.subscriptionStatusHistory?.length > 0 && (
              <div className="bg-gray-800 rounded p-3 md:col-span-2">
                <div className="font-semibold text-olive-400 mb-2">Status History</div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {diagnostics.subscriptionStatusHistory.slice(-3).map((status, i) => (
                    <div key={i} className="text-xs font-mono">
                      <span className="text-olive-300">{status.status}</span>
                      <div className="text-gray-500">{new Date(status.timestamp).toLocaleTimeString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-gray-700">
            <button
              onClick={() => console.log('Full diagnostics:', diagnostics)}
              className="px-3 py-1 bg-olive-600 hover:bg-olive-700 rounded text-xs"
            >
              Log Full Diagnostics
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
            >
              Force Reload
            </button>
          </div>
        </div>
      </div>

      {/* Auto-refresh component - Only when WebSocket V2 is not connected */}
      {!realtimeHookConnected && (
        <AutoRefreshComponent 
          onRefresh={handleAutoRefresh}
          intervalMs={10000} // Check every 10 seconds as fallback
        />
      )}
      
      {/* Diagnostics Toggle Button */}
      <button
        onClick={() => setShowDiagnostics(true)}
        className={`fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 z-30 ${showDiagnostics ? 'hidden' : 'block'}`}
        title="Show Real-time Diagnostics"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
      
    </div>
  )
}